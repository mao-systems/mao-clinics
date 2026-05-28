import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

interface UploadLogoResponse {
  logo_url: string
  message: string
}

interface DeleteLogoResponse {
  message: string
}

export function useLogoUpload() {
  const queryClient = useQueryClient()
  const toast = useToast()

  const uploadLogo = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('logo', file)
      return api.postForm<UploadLogoResponse>('/admin/logo', formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      toast.success('Logo actualizado correctamente')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Error al subir el logo')
    },
  })

  const deleteLogo = useMutation({
    mutationFn: () => api.delete<DeleteLogoResponse>('/admin/logo'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      toast.success('Logo eliminado')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Error al eliminar el logo')
    },
  })

  return {
    uploadLogo,
    deleteLogo,
    isUploading: uploadLogo.isPending,
  }
}
