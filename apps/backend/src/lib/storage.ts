import fs from 'fs'
import path from 'path'
import { env } from '@/config/env'

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

    return `${env.FRONTEND_URL}/uploads/${key}`
  }

  async delete(key: string): Promise<void> {
    const dest = path.join(process.cwd(), 'uploads', key)
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest)
    }
  }
}

class S3StorageProvider implements IStorageProvider {
  // TODO: implement when AWS_ACCESS_KEY_ID is available
  async upload(_file: Express.Multer.File, _key: string): Promise<string> {
    throw new Error('S3 not configured yet')
  }

  async delete(_key: string): Promise<void> {
    throw new Error('S3 not configured yet')
  }
}

export function getStorageProvider(): IStorageProvider {
  if (env.STORAGE_PROVIDER === 's3') return new S3StorageProvider()
  return new LocalStorageProvider()
}
