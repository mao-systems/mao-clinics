import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

export interface ChangePasswordData {
  current_password: string
  new_password:     string
  confirm_password: string
}

export function useChangePassword() {
  const toast = useToast()

  return useMutation({
    mutationFn: (data: ChangePasswordData) =>
      api.post<{ message: string }>('/admin/change-password', data),
    onSuccess: () => {
      toast.success('Contraseña actualizada correctamente')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
