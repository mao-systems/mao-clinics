export interface Patient {
  id: string
  tenant_id: string
  first_name: string
  last_name: string
  dni: string
  email: string | null
  phone: string | null
  birth_date: Date | null
  gender: 'male' | 'female' | 'other' | null
  address: string | null
  notes: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}
