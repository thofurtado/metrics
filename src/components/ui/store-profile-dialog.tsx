import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { getProfile, GetUserProfileResponse } from '@/api/get-profile'
import { updateProfile } from '@/api/update-profile'

import { Button } from './button'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'
import { Input } from './input'
import { Label } from './label'
import { Textarea } from './textarea'

const storeProfileSchema = z.object({
  name: z.string(),
  introduction: z.string().nullish(),
})
type StoreProfileSchema = z.infer<typeof storeProfileSchema>
export function StoreProfileDialog() {
  const queryClient = useQueryClient()
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    staleTime: Infinity,
  })
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<StoreProfileSchema>({
    resolver: zodResolver(storeProfileSchema),
    values: {
      name: profile?.name ?? '',
      introduction: profile?.introduction ?? '',
    },
  })

  function updateProfileCache(data: StoreProfileSchema) {
    const cached = queryClient.getQueryData<GetUserProfileResponse>(['profile'])
    if (cached) {
      queryClient.setQueryData<GetUserProfileResponse>(['profile'], {
        ...cached,
        name: data.name,
        introduction: data.introduction ? data.introduction : null,
      })
    }
    return { cached }
  }

  const { mutateAsync: updateProfileFn } = useMutation({
    mutationFn: updateProfile,
    onMutate({ name, introduction }) {
      const { cached } = updateProfileCache({ name, introduction })
      return { previousProfile: cached }
    },
    onError(_, __, context) {
      if (context?.previousProfile) {
        updateProfileCache(context.previousProfile)
      }
    },
  })

  async function handleUpdateProfile(data: StoreProfileSchema) {
    try {
      await updateProfileFn({
        name: data.name,
        introduction: data.introduction ? data.introduction : null,
      })
      toast.success('Perfil atualizado com sucesso!')
    } catch (err) {
      toast.error('Falha ao atualizar o perfil')
    }
  }
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Perfil do usuário</DialogTitle>
        <DialogDescription>
          Atualize as informações do usuário
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(handleUpdateProfile)}>
        <div className="space-y-4">
          <div className="grid grid-cols-4 items-center gap-4 pb-2">
            <Label className="text-right" htmlFor="name">
              Nome
            </Label>

            <Input className="col-span-3" id="name" {...register('name')} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4 pb-6">
            <Label className="text-right" htmlFor="name">
              Apresentação
            </Label>
            <Textarea
              className="col-span-3"
              id="introduction"
              {...register('introduction')}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant={'ghost'} type="button">
              Fechar
            </Button>
          </DialogClose>
          <Button type="submit" variant="success" disabled={isSubmitting}>
            Salvar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
