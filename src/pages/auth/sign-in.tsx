import { useMutation } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { signIn } from '@/api/sign-in'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const signInForm = z.object({
  email: z.string().email(),
  password: z.string(),
})

type SignInForm = z.infer<typeof signInForm>

export function SignIn() {
  const [searchParams] = useSearchParams()
  const { mutateAsync: authenticate } = useMutation({
    mutationFn: signIn,
  })
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignInForm>({
    defaultValues: {
      email: searchParams.get('email'),
    },
  })

  async function handleSignIn(data: SignInForm) {
    try {
      const response = await authenticate({
        email: data.email,
        password: data.password,
      })
      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('refreshToken', response.data.refreeshToken)
      }

      toast.success('Parabéns, você será redirecionado')
      await new Promise((resolve) => setTimeout(resolve, 1500))
      window.location.href = '/dashboard' // Replace with desired route
    } catch (err) {
      toast.error('Credenciais inválidas', {
        closeButton: true,
      })
    }
  }

  return (
    <>
      <Helmet title="Login" />
      <div className="p-8">
        <Button
          variant="outline"
          asChild
          className="border-minsk-400 hover:bg-minsk-400 absolute right-8 top-8 hover:text-white"
        >
          <Link to="/sign-up">Novo Usuário</Link>
        </Button>
        <div className="w[358px] flex flex-col justify-center gap-6">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Acessar Metrics
            </h1>
            <p className="text-sm text-muted-foreground">
              Entre para fazer parte da Gestão descomplicada
            </p>
          </div>

          <form onSubmit={handleSubmit(handleSignIn)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Seu e-mail:</Label>
              <Input id="email" type="email" {...register('email')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha:</Label>
              <Input id="password" type="password" {...register('password')} />
            </div>
            <Button
              disabled={isSubmitting}
              className="bg-minsk-400 hover:bg-minsk-500 w-full text-white"
            >
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </>
  )
}
