/**
 * Platform seed — creates the MAO Systems superadmin account.
 *
 * Run ONCE with: pnpm seed:platform
 * This file is intentionally separate from seed.ts / reset-demo.ts
 * so that the platform admin is NEVER wiped by demo resets.
 *
 * Uses upsert (no-op if already exists) so it is safe to run again.
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔐 Seeding platform admin...')

  const passwordHash = await bcrypt.hash('SuperAdmin2026!', 10)

  const admin = await prisma.platformAdmin.upsert({
    where: { email: 'superadmin@maosystems.io' },
    update: {},
    create: {
      email: 'superadmin@maosystems.io',
      password_hash: passwordHash,
      full_name: 'Renzo — MAO Systems',
    },
  })

  console.log('\n✅ Platform admin seeded!')
  console.log(`   Email:     ${admin.email}`)
  console.log(`   Full name: ${admin.full_name}`)
  console.log(`   Password:  SuperAdmin2026!`)
  console.log()
  console.log('Panel URL: http://localhost:5173/platform/login')
  console.log()
  console.log('⚠️  This account is platform-level only — it cannot log in via /login')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
