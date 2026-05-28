export interface Patient {
  id: string
  tenant_id: string
  dni: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  sex: 'M' | 'F' | 'Other' | null
  phone: string | null
  email: string | null
  address: string | null
  district: string | null
  allergies: string | null
  medical_history: string | null
  blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-' | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}
