import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/errors'
import { env } from '@/config/env'
import { getStorageProvider } from '@/lib/storage'
import type { ThemeConfig, CreateDoctorInput, UpdateDoctorInput,
              CreateUserInput, UpdateUserInput,
              CreateServiceInput, UpdateServiceInput,
              CreateSpecialtyInput, UpdateSpecialtyInput,
              ChangePasswordInput } from './admin.schema'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Fields selected for every user response — never expose password or reset tokens
const USER_SELECT = {
  id:                  true,
  first_name:          true,
  last_name:           true,
  email:               true,
  role:                true,
  active:              true,
  last_login_at:       true,
  must_change_password: true,
} as const

function generateTempPassword(): string {
  // e.g. Mao7823! — satisfies min 8 chars, uppercase, digit, special char
  return `Mao${Date.now().toString().slice(-4)}!`
}

// Send a welcome email with temporary credentials.
// Email is best-effort — failures are logged but never propagated to the caller.
async function sendWelcomeEmail(params: {
  to:           string
  firstName:    string
  clinicName:   string
  tempPassword: string
}): Promise<void> {
  if (!env.SMTP_HOST) {
    console.log(`[Email] SMTP not configured — skipping welcome email to ${params.to}`)
    return
  }

  try {
    const transport = nodemailer.createTransport({
      host:   env.SMTP_HOST,
      port:   parseInt(env.SMTP_PORT, 10),
      secure: env.SMTP_SECURE === 'true',
      auth:   { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })

    await transport.sendMail({
      from:    env.SMTP_FROM ?? env.SMTP_USER,
      to:      params.to,
      subject: `Bienvenido a ${params.clinicName} — Tus credenciales de acceso`,
      text: [
        `Hola ${params.firstName},`,
        '',
        `Se ha creado tu cuenta en el sistema de ${params.clinicName}.`,
        `Email: ${params.to}`,
        `Contraseña temporal: ${params.tempPassword}`,
        '',
        'Por favor cambia tu contraseña al ingresar por primera vez.',
        `Ingresa en: ${env.FRONTEND_URL}/login`,
      ].join('\n'),
    })

    console.log(`[Email] Welcome email sent to ${params.to}`)
  } catch (err) {
    // Never let email failure block doctor/user creation
    console.error(`[Email] Failed to send welcome email to ${params.to}:`, err)
  }
}

// ── TenantConfig shape ────────────────────────────────────────────────────────

interface TenantConfig {
  id:           string
  name:         string
  subdomain:    string
  ruc:          string
  plan:         string
  theme_config: unknown
}

// ── AdminService ──────────────────────────────────────────────────────────────

export class AdminService {

  // ── Tenant config ───────────────────────────────────────────────────────────

  async updateTheme(tenantId: string, theme: ThemeConfig): Promise<TenantConfig> {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data:  { theme_config: theme },
    })
    return this.formatTenant(tenant)
  }

  async uploadLogo(tenantId: string, file: Express.Multer.File): Promise<string> {
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!ALLOWED.includes(file.mimetype)) {
      throw new AppError('INVALID_FILE_TYPE', 400, 'Solo se permiten imágenes (JPEG, PNG, WebP, SVG)')
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new AppError('FILE_TOO_LARGE', 400, 'El archivo no puede superar los 2 MB')
    }

    const key = `logos/${tenantId}/${Date.now()}-${file.originalname}`
    const url  = await getStorageProvider().upload(file, key)

    const existing     = await prisma.tenant.findUnique({ where: { id: tenantId } })
    const currentTheme = existing?.theme_config && typeof existing.theme_config === 'object'
      ? (existing.theme_config as Record<string, unknown>)
      : {}

    await prisma.tenant.update({
      where: { id: tenantId },
      data:  { theme_config: { ...currentTheme, logo_url: url } },
    })

    return url
  }

  async removeLogo(tenantId: string): Promise<void> {
    const existing     = await prisma.tenant.findUnique({ where: { id: tenantId } })
    const currentTheme = existing?.theme_config && typeof existing.theme_config === 'object'
      ? (existing.theme_config as Record<string, unknown>)
      : {}

    await prisma.tenant.update({
      where: { id: tenantId },
      data:  { theme_config: { ...currentTheme, logo_url: null } },
    })
  }

  async getTenantConfig(tenantId: string): Promise<TenantConfig> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) throw new AppError('TENANT_NOT_FOUND', 404, 'Clínica no encontrada')
    return this.formatTenant(tenant)
  }

  // ── Doctors ─────────────────────────────────────────────────────────────────

  async createDoctor(tenantId: string, data: CreateDoctorInput) {
    // Resolve tenant name for the welcome email — outside the transaction is fine
    const tenant = await prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { name: true },
    })
    if (!tenant) throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant no encontrado')

    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 10)

    const doctor = await prisma.$transaction(async (tx) => {
      // 1. Email uniqueness check within the tenant
      const existing = await tx.user.findFirst({
        where: { tenant_id: tenantId, email: data.email },
      })
      if (existing) {
        throw new AppError('EMAIL_ALREADY_EXISTS', 409, 'Este correo ya está registrado')
      }

      // 2. Create User with doctor role
      const user = await tx.user.create({
        data: {
          tenant_id:            tenantId,
          email:                data.email,
          password_hash:        passwordHash,
          first_name:           data.first_name,
          last_name:            data.last_name,
          role:                 'doctor',
          must_change_password: true,
        },
      })

      // 3. Create Doctor record
      const newDoctor = await tx.doctor.create({
        data: {
          tenant_id:             tenantId,
          user_id:               user.id,
          specialty:             data.specialty,
          cmp:                   data.cmp ?? null,
          bio:                   data.bio ?? null,
          consultation_duration: data.consultation_duration,
        },
      })

      // 4. Create schedule entries if provided
      if (data.schedule.length > 0) {
        await tx.doctorSchedule.createMany({
          data: data.schedule.map((s) => ({
            tenant_id:   tenantId,
            doctor_id:   newDoctor.id,
            day_of_week: s.day_of_week,
            start_time:  s.start_time,
            end_time:    s.end_time,
            active:      s.active,
          })),
        })
      }

      return tx.doctor.findUniqueOrThrow({
        where:   { id: newDoctor.id },
        include: {
          user:      { select: USER_SELECT },
          schedules: { orderBy: { day_of_week: 'asc' } },
        },
      })
    })

    // 5. Best-effort welcome email — outside transaction, never fails creation
    void sendWelcomeEmail({
      to:           data.email,
      firstName:    data.first_name,
      clinicName:   tenant.name,
      tempPassword,
    })

    return doctor
  }

  async getDoctors(tenantId: string) {
    return prisma.doctor.findMany({
      where:   { tenant_id: tenantId },
      include: {
        user:      { select: USER_SELECT },
        schedules: { orderBy: { day_of_week: 'asc' } },
      },
      orderBy: { user: { last_name: 'asc' } },
    })
  }

  async getDoctorById(tenantId: string, doctorId: string) {
    const doctor = await prisma.doctor.findFirst({
      where: { id: doctorId, tenant_id: tenantId },
      include: {
        user:      { select: USER_SELECT },
        schedules: { orderBy: { day_of_week: 'asc' } },
        _count:    { select: { appointments: true } },
      },
    })

    if (!doctor) throw new AppError('DOCTOR_NOT_FOUND', 404, 'Médico no encontrado')
    return doctor
  }

  async updateDoctor(tenantId: string, doctorId: string, data: UpdateDoctorInput) {
    // Verify ownership
    const existing = await prisma.doctor.findFirst({
      where: { id: doctorId, tenant_id: tenantId },
    })
    if (!existing) throw new AppError('DOCTOR_NOT_FOUND', 404, 'Médico no encontrado')

    return prisma.$transaction(async (tx) => {
      // Update doctor fields
      await tx.doctor.update({
        where: { id: doctorId },
        data: {
          ...(data.specialty             !== undefined && { specialty:             data.specialty }),
          ...(data.cmp                   !== undefined && { cmp:                   data.cmp }),
          ...(data.bio                   !== undefined && { bio:                   data.bio }),
          ...(data.consultation_duration !== undefined && { consultation_duration: data.consultation_duration }),
        },
      })

      // Update user name fields if provided
      if (data.first_name !== undefined || data.last_name !== undefined) {
        await tx.user.update({
          where: { id: existing.user_id },
          data: {
            ...(data.first_name !== undefined && { first_name: data.first_name }),
            ...(data.last_name  !== undefined && { last_name:  data.last_name  }),
          },
        })
      }

      // Atomically replace schedule if provided
      if (data.schedule !== undefined) {
        await tx.doctorSchedule.deleteMany({ where: { doctor_id: doctorId } })

        if (data.schedule.length > 0) {
          await tx.doctorSchedule.createMany({
            data: data.schedule.map((s) => ({
              tenant_id:   tenantId,
              doctor_id:   doctorId,
              day_of_week: s.day_of_week,
              start_time:  s.start_time,
              end_time:    s.end_time,
              active:      s.active,
            })),
          })
        }
      }

      return tx.doctor.findUniqueOrThrow({
        where:   { id: doctorId },
        include: {
          user:      { select: USER_SELECT },
          schedules: { orderBy: { day_of_week: 'asc' } },
        },
      })
    })
  }

  async toggleDoctorActive(tenantId: string, doctorId: string, active: boolean) {
    const doctor = await prisma.doctor.findFirst({
      where: { id: doctorId, tenant_id: tenantId },
    })
    if (!doctor) throw new AppError('DOCTOR_NOT_FOUND', 404, 'Médico no encontrado')

    // Block deactivation when the doctor has upcoming confirmed/pending appointments
    if (!active) {
      const upcoming = await prisma.appointment.count({
        where: {
          tenant_id:    tenantId,
          doctor_id:    doctorId,
          status:       { in: ['pending', 'confirmed'] },
          scheduled_at: { gt: new Date() },
          deleted_at:   null,
        },
      })
      if (upcoming > 0) {
        throw new AppError(
          'DOCTOR_HAS_APPOINTMENTS',
          400,
          'El médico tiene citas próximas. Cancélalas antes de desactivarlo.',
        )
      }
    }

    // Update both doctor.active and the associated user.active atomically
    const [updated] = await prisma.$transaction([
      prisma.doctor.update({
        where:   { id: doctorId },
        data:    { active },
        include: { user: { select: USER_SELECT }, schedules: { orderBy: { day_of_week: 'asc' } } },
      }),
      prisma.user.update({
        where: { id: doctor.user_id },
        data:  { active },
      }),
    ])

    return updated
  }

  // ── Non-doctor users ────────────────────────────────────────────────────────

  async getUsers(tenantId: string) {
    return prisma.user.findMany({
      where:   { tenant_id: tenantId, role: { not: 'doctor' } },
      select:  USER_SELECT,
      orderBy: { last_name: 'asc' },
    })
  }

  async createUser(tenantId: string, data: CreateUserInput) {
    const tenant = await prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { name: true },
    })
    if (!tenant) throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant no encontrado')

    const existing = await prisma.user.findFirst({
      where: { tenant_id: tenantId, email: data.email },
    })
    if (existing) {
      throw new AppError('EMAIL_ALREADY_EXISTS', 409, 'Este correo ya está registrado')
    }

    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 10)

    const user = await prisma.user.create({
      data: {
        tenant_id:            tenantId,
        email:                data.email,
        password_hash:        passwordHash,
        first_name:           data.first_name,
        last_name:            data.last_name,
        role:                 data.role,
        must_change_password: true,
      },
      select: USER_SELECT,
    })

    void sendWelcomeEmail({
      to:           data.email,
      firstName:    data.first_name,
      clinicName:   tenant.name,
      tempPassword,
    })

    return user
  }

  async updateUser(
    tenantId:    string,
    requesterId: string,
    userId:      string,
    data:        UpdateUserInput,
  ) {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenant_id: tenantId },
    })
    if (!user) throw new AppError('USER_NOT_FOUND', 404, 'Usuario no encontrado')

    // Cannot deactivate yourself
    if (data.active === false && userId === requesterId) {
      throw new AppError('CANNOT_DEACTIVATE_SELF', 400, 'No puedes desactivar tu propia cuenta')
    }

    // Cannot change a doctor account via this method
    if (user.role === 'doctor') {
      throw new AppError(
        'INVALID_OPERATION',
        400,
        'Las cuentas de médico se gestionan desde el módulo de médicos',
      )
    }

    return prisma.user.update({
      where:  { id: userId },
      data: {
        ...(data.first_name !== undefined && { first_name: data.first_name }),
        ...(data.last_name  !== undefined && { last_name:  data.last_name  }),
        ...(data.role       !== undefined && { role:       data.role       }),
        ...(data.active     !== undefined && { active:     data.active     }),
      },
      select: USER_SELECT,
    })
  }

  async resetUserPassword(tenantId: string, requesterId: string, targetUserId: string) {
    if (requesterId === targetUserId) {
      throw new AppError(
        'INVALID_OPERATION',
        400,
        'Usa "Cambiar contraseña" para actualizar tu propia contraseña',
      )
    }

    const [tenant, targetUser] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      prisma.user.findFirst({ where: { id: targetUserId, tenant_id: tenantId } }),
    ])

    if (!targetUser) throw new AppError('USER_NOT_FOUND', 404, 'Usuario no encontrado')

    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 10)

    await prisma.user.update({
      where: { id: targetUserId },
      data:  { password_hash: passwordHash, must_change_password: true },
    })

    void sendWelcomeEmail({
      to:           targetUser.email,
      firstName:    targetUser.first_name,
      clinicName:   tenant?.name ?? 'Clinova',
      tempPassword,
    })

    return { message: 'Contraseña restablecida. El usuario recibirá un email.' }
  }

  // ── Password management ─────────────────────────────────────────────────────

  async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new AppError('USER_NOT_FOUND', 404, 'Usuario no encontrado')

    const matches = await bcrypt.compare(data.current_password, user.password_hash)
    if (!matches) {
      throw new AppError('WRONG_PASSWORD', 401, 'Contraseña actual incorrecta')
    }

    const newHash = await bcrypt.hash(data.new_password, 10)

    await prisma.user.update({
      where: { id: userId },
      data:  { password_hash: newHash, must_change_password: false },
    })

    return { message: 'Contraseña actualizada correctamente' }
  }

  // ── Service catalog ─────────────────────────────────────────────────────────

  async getServices(tenantId: string) {
    return prisma.serviceCatalog.findMany({
      where:   { tenant_id: tenantId },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    })
  }

  async createService(tenantId: string, data: CreateServiceInput) {
    return prisma.serviceCatalog.create({
      data: {
        tenant_id:   tenantId,
        name:        data.name,
        description: data.description ?? null,
        price:       data.price,
        category:    data.category ?? null,
        active:      data.active,
        sort_order:  data.sort_order,
      },
    })
  }

  async updateService(tenantId: string, serviceId: string, data: UpdateServiceInput) {
    const existing = await prisma.serviceCatalog.findFirst({
      where: { id: serviceId, tenant_id: tenantId },
    })
    if (!existing) throw new AppError('SERVICE_NOT_FOUND', 404, 'Servicio no encontrado')

    return prisma.serviceCatalog.update({
      where: { id: serviceId },
      data: {
        ...(data.name        !== undefined && { name:        data.name        }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price       !== undefined && { price:       data.price       }),
        ...(data.category    !== undefined && { category:    data.category    }),
        ...(data.active      !== undefined && { active:      data.active      }),
        ...(data.sort_order  !== undefined && { sort_order:  data.sort_order  }),
      },
    })
  }

  async deleteService(tenantId: string, serviceId: string) {
    const existing = await prisma.serviceCatalog.findFirst({
      where: { id: serviceId, tenant_id: tenantId },
    })
    if (!existing) throw new AppError('SERVICE_NOT_FOUND', 404, 'Servicio no encontrado')

    // Service catalog entries have no FK references from invoice items (items store free-text
    // descriptions), so hard delete is always safe.
    await prisma.serviceCatalog.delete({ where: { id: serviceId } })
  }

  // ── Specialty catalog ───────────────────────────────────────────────────────

  async getSpecialties(tenantId: string) {
    return prisma.specialty.findMany({
      where:   { tenant_id: tenantId },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    })
  }

  async createSpecialty(tenantId: string, data: CreateSpecialtyInput) {
    const existing = await prisma.specialty.findFirst({
      where: { tenant_id: tenantId, name: data.name },
    })
    if (existing) throw new AppError('SPECIALTY_ALREADY_EXISTS', 409, 'Ya existe una especialidad con ese nombre')

    return prisma.specialty.create({
      data: {
        tenant_id:  tenantId,
        name:       data.name,
        active:     data.active,
        sort_order: data.sort_order,
      },
    })
  }

  async updateSpecialty(tenantId: string, specialtyId: string, data: UpdateSpecialtyInput) {
    const existing = await prisma.specialty.findFirst({
      where: { id: specialtyId, tenant_id: tenantId },
    })
    if (!existing) throw new AppError('SPECIALTY_NOT_FOUND', 404, 'Especialidad no encontrada')

    return prisma.specialty.update({
      where: { id: specialtyId },
      data: {
        ...(data.name       !== undefined && { name:       data.name       }),
        ...(data.active     !== undefined && { active:     data.active     }),
        ...(data.sort_order !== undefined && { sort_order: data.sort_order }),
      },
    })
  }

  async deleteSpecialty(tenantId: string, specialtyId: string) {
    const existing = await prisma.specialty.findFirst({
      where: { id: specialtyId, tenant_id: tenantId },
    })
    if (!existing) throw new AppError('SPECIALTY_NOT_FOUND', 404, 'Especialidad no encontrada')

    await prisma.specialty.delete({ where: { id: specialtyId } })
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private formatTenant(tenant: {
    id: string; name: string; subdomain: string; ruc: string; plan: string; theme_config: unknown
  }): TenantConfig {
    return {
      id:           tenant.id,
      name:         tenant.name,
      subdomain:    tenant.subdomain,
      ruc:          tenant.ruc,
      plan:         tenant.plan,
      theme_config: tenant.theme_config,
    }
  }
}

export const adminService = new AdminService()
