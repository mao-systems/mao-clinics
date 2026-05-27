export enum UserRole {
  admin = 'admin',
  doctor = 'doctor',
  receptionist = 'receptionist',
}

export interface User {
  id: string
  tenant_id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  is_active: boolean
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}
