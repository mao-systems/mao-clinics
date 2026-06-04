import fs from 'fs'
import path from 'path'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { env } from '@/config/env'
import { AppError } from '@/lib/errors'

interface IStorageProvider {
  upload(file: Express.Multer.File, key: string): Promise<string>
  delete(key: string): Promise<void>
}

class LocalStorageProvider implements IStorageProvider {
  async upload(file: Express.Multer.File, key: string): Promise<string> {
    const dest = path.join(process.cwd(), 'uploads', key)
    const dir = path.dirname(dest)

    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(dest, file.buffer)

    // Files are served by the Express backend at /uploads — NOT the frontend
    return `${env.BACKEND_URL}/uploads/${key}`
  }

  async delete(key: string): Promise<void> {
    const dest = path.join(process.cwd(), 'uploads', key)
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest)
    }
  }
}

class S3StorageProvider implements IStorageProvider {
  private client: S3Client

  constructor() {
    // Guard: fail fast at construction time rather than on first upload
    if (!env.AWS_ACCESS_KEY_ID) throw new AppError('S3_NOT_CONFIGURED', 500, 'AWS credentials missing')
    if (!env.AWS_SECRET_ACCESS_KEY) throw new AppError('S3_NOT_CONFIGURED', 500, 'AWS credentials missing')
    if (!env.AWS_REGION) throw new AppError('S3_NOT_CONFIGURED', 500, 'AWS_REGION missing')
    if (!env.AWS_S3_BUCKET) throw new AppError('S3_NOT_CONFIGURED', 500, 'AWS_S3_BUCKET missing')

    this.client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    })
  }

  async upload(file: Express.Multer.File, key: string): Promise<string> {
    // Use multipart upload so large files (attachments, PDFs) are handled safely
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: env.AWS_S3_BUCKET!,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // ACL is intentionally omitted — the bucket uses BucketOwnerEnforced
        // (ACLs disabled). Public read is granted via bucket policy, not object ACL.
      },
    })

    await upload.done()

    return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: env.AWS_S3_BUCKET!,
        Key: key,
      }),
    )
  }
}

export function getStorageProvider(): IStorageProvider {
  if (env.STORAGE_PROVIDER === 's3') return new S3StorageProvider()
  return new LocalStorageProvider()
}
