import { useMutation } from '@tanstack/react-query'
import { AxiosError, isAxiosError } from 'axios'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { signUp } from '@/api/sign-up'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const signUpForm = z.object({
  email: z.string().email(),
  password: z.string(),
  passwordConfirmation: z.string(),
  name: z.string(),
})

type SignUpForm = z.infer<typeof signUpForm>

export function SignUp() {
  const navigate = useNavigate()
  const { mutateAsync: registerUser } = useMutation({
    mutationFn: signUp,
  })
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignUpForm>()

  async function handleSignUp(data: SignUpForm) {
    try {
      if (data.password !== data.passwordConfirmation) {
        toast.error('Senhas não coincidem!')
        throw new AxiosError()
      }

      await registerUser({
        email: data.email,
        password: data.password,
        name: data.name,
      })

      toast.success('Usuário criado com sucesso você será redirecionado')
      await new Promise((resolve) => setTimeout(resolve, 1500))
      navigate(`/sign-in?email=${data.email}`)
    } catch (err) {
      let axiosError
      if (isAxiosError(err)) {
        axiosError = err as AxiosError
      }
      switch (axiosError?.request.status) {
        case 409:
          toast.warning('Este e-mail já está sendo utilizado', {
            action: {
              label: 'Entrar',
              onClick: () => navigate(`/sign-in?email=${data.email}`),
            },
          })
          break
        case 500:
          toast.error(
            'Erro ao conectar ao banco de dados, contate seu Administrador de Sistema',
          )
          throw new Error()
        case 0:
          toast.error(
            'Sem resposta do Servidor, contate seu Administrador de Sistema',
          )
          break
        default:
          toast.error('Erro desconhecido')
      }
    }
  }

  return (
    <>
      <Helmet title="Cadastro" />
      <div className="p-8">
        <Button variant="ghost" asChild className="absolute right-8 top-8">
          <Link to="/sign-in">Fazer Login </Link>
        </Button>
        <div className="w[358px] flex flex-col justify-center gap-6">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Cadastro de Usuário
            </h1>
          </div>

          <form onSubmit={handleSubmit(handleSignUp)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome:</Label>
              <Input id="name" type="text" {...register('name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail:</Label>
              <Input id="email" type="email" {...register('email')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha:</Label>
              <Input id="password" type="password" {...register('password')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordConfirmation">
                Confirmação de Senha:
              </Label>
              <Input
                id="passwordConfirmation"
                type="password"
                {...register('passwordConfirmation')}
              />
            </div>
            <Button disabled={isSubmitting} className="w-full">
              Cadastrar
            </Button>
          </form>
        </div>
      </div>
    </>
  )
}
