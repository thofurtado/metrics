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
      <div className="flex flex-col justify-center gap-6"> {/* Removido w[358px] */}
        {/*
            Botão Novo Usuário movido para baixo.
            Este link simples agora fica no topo do formulário
        */}
        <div className="text-right">
            <Link 
                to="/sign-up"
                className="text-minsk-500 hover:text-minsk-700 text-sm font-medium transition-colors"
            >
                Criar uma conta
            </Link>
        </div>

        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-minsk-800">
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
            // Botão com cores da marca
            className="bg-minsk-600 hover:bg-minsk-700 w-full text-white transition-colors"
          >
            Entrar
          </Button>
        </form>
      </div>
    </>
  )
}
