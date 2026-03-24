import { useMutation, useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { RefreshCcw } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'

import { signIn } from '@/api/sign-in'
import { getPublicUsers } from '@/api/get-users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const signInForm = z.object({
  userId: z.string().min(1, 'Selecione um usuário existente na lista.'),
  password: z.string().min(1, 'A senha é obrigatória.'),
})

type SignInForm = z.infer<typeof signInForm>

export function SignIn() {
  const navigate = useNavigate()
  
  // Resgatar o último usuário logado para Persistência de UX
  const lastUserId = localStorage.getItem('metrics.lastUserId') || ''

  const { data: users, isError, isLoading, refetch } = useQuery({
    queryKey: ['public-users'],
    queryFn: getPublicUsers,
    staleTime: 1000 * 60 * 5 // Cache de 5 minutos
  })

  const userList = users || []

  const { mutateAsync: authenticate } = useMutation({
    mutationFn: signIn,
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInForm),
    defaultValues: { userId: lastUserId },
  })

  // Estado local para o input do Autocomplete
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const currentUserId = watch('userId')

  // Auto-foco: Preencher o input inicial caso o usuário estivesse salvo
  useEffect(() => {
    if (lastUserId && userList.length > 0) {
      const user = userList.find(u => u.id === lastUserId)
      if (user) {
        setInputValue(user.name)
      }
    }
  }, [lastUserId, userList])

  // Clique fora para fechar o dropdown (Autocomplete)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredUsers = userList.filter(user => 
    user.name.toLowerCase().includes(inputValue.toLowerCase())
  )

  // Auto-Highlight: toda vez que a lista filtra, volta o highlight para o índice 0
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredUsers.length])

  // Navegação pelo Teclado
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < filteredUsers.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault() // Evita o submit da form direto
      
      if (filteredUsers.length > 0) {
        // Seleciona o highlight
        const selected = filteredUsers[highlightedIndex]
        setInputValue(selected.name)
        setValue('userId', selected.id)
        setIsOpen(false)
        
        // Foco direto no campo de password
        document.getElementById('password')?.focus()
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // Comportamento no Blur (Exato-Match)
  function handleBlur() {
    // Deixa o tempo para um eventual OnClick descer no evento
    setTimeout(() => {
      const exactMatch = userList.find(u => u.name.toLowerCase() === inputValue.toLowerCase())
      if (exactMatch) {
         setInputValue(exactMatch.name)
         setValue('userId', exactMatch.id)
      }
    }, 200)
  }

  async function handleSignIn(data: SignInForm) {
    if (!data.userId) {
        toast.error('Por favor, selecione seu nome na lista.')
        return
    }

    try {
      const response = await authenticate({
        userId: data.userId,
        password: data.password,
      })
      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('refreshToken', response.data.refreshToken)
        
        // Persistência de UX
        localStorage.setItem('metrics.lastUserId', data.userId)
      }

      toast.success('Parabéns, você será redirecionado')
      await new Promise((resolve) => setTimeout(resolve, 1500))
      navigate('/dashboard')
    } catch (err) {
      toast.error('Credenciais inválidas', { closeButton: true })
    }
  }

  return (
    <>
      <Helmet title="Login" />
      <div className="flex flex-col justify-center gap-6">
        <div className="text-right">
            <Link to="/sign-up" className="text-minsk-500 hover:text-minsk-700 text-sm font-medium transition-colors">
                Criar uma conta
            </Link>
        </div>

        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-minsk-800">
            Acessar Metrics
          </h1>
          <p className="text-sm text-muted-foreground">
            Selecione seu perfil e informe sua senha para entrar
          </p>
        </div>

        <form onSubmit={handleSubmit(handleSignIn)} className="space-y-4">
          {/* Wrapper relativo para prender o dropdown em absolute */}
          <div className="space-y-2 flex flex-col pt-2 w-full relative" ref={wrapperRef}>
            <Label>Seu Perfil:</Label>
            
            {isError ? (
                <div className="flex items-center justify-between border border-red-200 bg-red-50 p-2 rounded-md">
                    <span className="text-sm text-red-600">Falha ao carregar perfis.</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => refetch()} className="text-red-600 hover:bg-red-100 h-6 px-2">
                        <RefreshCcw className="w-4 h-4 mr-1" /> Tentar
                    </Button>
                </div>
            ) : (
               <div className="relative w-full">
                  <Input 
                    type="text" 
                    placeholder={isLoading ? "Carregando usuários..." : "Digite para buscar seu nome..."}
                    value={inputValue}
                    disabled={isLoading}
                    onFocus={() => setIsOpen(true)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => {
                       setInputValue(e.target.value)
                       setIsOpen(true)
                       if (currentUserId) setValue('userId', '') // Reseta a validade se digitar
                    }}
                    autoComplete="off"
                    className={`${errors.userId ? 'border-red-500 focus-visible:ring-red-500' : ''} ${currentUserId && inputValue ? 'font-medium text-minsk-700' : ''}`}
                  />
                  
                  {isOpen && !isLoading && (
                    <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
                      <div className="p-1 max-h-[200px] overflow-x-hidden overflow-y-auto w-full">
                        {filteredUsers.length === 0 ? (
                            <div className="py-4 text-center text-sm text-muted-foreground w-full">Nenhum usuário encontrado.</div>
                        ) : (
                            filteredUsers.map((user, index) => (
                                <div 
                                    key={user.id}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                    className={`relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors ${index === highlightedIndex ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-accent hover:text-accent-foreground'}`}
                                    onClick={() => {
                                        setInputValue(user.name)       // Preenche o input
                                        setValue('userId', user.id)    // Salva o ID silenciosamente
                                        setIsOpen(false)               // Fecha o modal
                                        document.getElementById('password')?.focus() 
                                    }}
                                >
                                    {user.name}
                                </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
            )}
            
            <input type="hidden" {...register('userId')} />
            {errors.userId && (
              <span className="text-xs text-red-500 font-medium">{errors.userId.message}</span>
            )}
          </div>
          
          <div className="space-y-2 pt-2">
            <Label htmlFor="password">Senha:</Label>
            <Input id="password" type="password" {...register('password')} className={errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''} />
            <div className="flex flex-col items-end gap-1">
                <Link to="/forgot-password" className="text-sm font-medium text-minsk-500 hover:text-minsk-700 transition-colors">
                    Esqueci a senha
                </Link>
                {errors.password && (
                  <span className="text-xs text-red-500 font-medium self-start">{errors.password.message}</span>
                )}
            </div>
          </div>
          <Button
            disabled={isSubmitting || isLoading || isError}
            className="bg-minsk-600 hover:bg-minsk-700 w-full text-white transition-colors"
          >
            Entrar
          </Button>
        </form>
      </div>
    </>
  )
}
