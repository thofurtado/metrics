import { useMutation } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  UserCheck,
} from 'lucide-react'
import { useState } from 'react'

import { getTimeClockStatus, registerTimeClock } from '@/api/hr/time-clock'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function TimeClockKiosk() {
  const [pin, setPin] = useState('')
  const [step, setStep] = useState<'idle' | 'confirm' | 'success' | 'error'>(
    'idle',
  )
  const [employee, setEmployee] = useState<{ id: string; name: string } | null>(
    null,
  )
  const [nextAction, setNextAction] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { isPending: isLoadingStatus, mutate: checkStatus } = useMutation({
    mutationFn: getTimeClockStatus,
    onSuccess: (data) => {
      setEmployee(data.employee)
      setNextAction(data.nextAction)
      setStep('confirm')
    },
    onError: () => {
      setStep('error')
      setMessage('PIN inválido ou funcionário não encontrado.')
      setTimeout(() => resetState(), 3000)
    },
  })

  const { isPending: isRegistering, mutate: register } = useMutation({
    mutationFn: ({ pin, action }: { pin: string; action: string }) =>
      registerTimeClock(pin, action),
    onSuccess: (data) => {
      setStep('success')
      setMessage(
        `${getActionLabel(data.action)} registrado com sucesso às ${new Date(data.timestamp).toLocaleTimeString()}`,
      )
      setTimeout(() => resetState(), 3000)
    },
    onError: () => {
      setStep('error')
      setMessage('Erro ao registrar ponto. Tente novamente.')
      setTimeout(() => resetState(), 3000)
    },
  })

  const resetState = () => {
    setPin('')
    setStep('idle')
    setEmployee(null)
    setNextAction(null)
    setMessage(null)
  }

  const handlePinSubmit = () => {
    if (pin.length < 4) return
    checkStatus(pin)
  }

  const handleConfirm = () => {
    if (pin && nextAction) {
      register({ pin, action: nextAction })
    }
  }

  const handleKeyPress = (key: string) => {
    if (step !== 'idle') return
    if (key === 'clear') {
      setPin('')
    } else if (key === 'backspace') {
      setPin((prev) => prev.slice(0, -1))
    } else if (key === 'enter') {
      handlePinSubmit()
    } else {
      if (pin.length < 6) {
        setPin((prev) => prev + key)
      }
    }
  }

  // Auto-submit when length reaches 4 (or 6 depending on pin policy, assume 4-6)
  // Let's rely on explicit enter or length check if pins are fixed length.
  // For now, let's use Enter button on UI.

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'clockIn':
        return 'Iniciar Expediente'
      case 'breakStart':
        return 'Pausa para Almoço'
      case 'breakEnd':
        return 'Retorno do Almoço'
      case 'clockOut':
        return 'Fim de Expediente'
      case 'completed':
        return 'Jornada Completa'
      default:
        return action
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-900">
      <Card className="w-full max-w-md border-slate-200 shadow-xl dark:border-slate-800">
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Quiosque de Ponto
          </CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Digite seu PIN para registrar o ponto
          </p>
        </CardHeader>
        <CardContent>
          {step === 'idle' && (
            <div className="space-y-6">
              <div className="mb-6 flex justify-center">
                <Input
                  type="password"
                  readOnly
                  value={pin}
                  className="h-16 w-full max-w-[240px] text-center font-mono text-4xl tracking-[1em]"
                  placeholder="••••"
                />
              </div>

              <div className="mx-auto grid max-w-[280px] grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <Button
                    key={num}
                    variant="outline"
                    className="h-16 rounded-xl border-slate-200 text-2xl font-semibold transition-all hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                    onClick={() => handleKeyPress(num.toString())}
                  >
                    {num}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  className="h-16 text-red-500 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleKeyPress('clear')}
                >
                  C
                </Button>
                <Button
                  variant="outline"
                  className="h-16 rounded-xl border-slate-200 text-2xl font-semibold transition-all hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  onClick={() => handleKeyPress('0')}
                >
                  0
                </Button>
                <Button
                  variant="default"
                  className="h-16 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => handleKeyPress('enter')}
                  disabled={isLoadingStatus || pin.length === 0}
                >
                  {isLoadingStatus ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <ArrowRight className="h-6 w-6" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'confirm' && employee && nextAction && (
            <div className="space-y-6 text-center duration-300 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-center">
                <UserCheck className="h-16 w-16 text-blue-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium">
                  Olá,{' '}
                  <span className="font-bold text-blue-600">
                    {employee.name}
                  </span>
                </h3>
                <p className="text-muted-foreground">Confirmar registro de:</p>
                <div className="py-2 text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {getActionLabel(nextAction)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={resetState}
                  className="h-12"
                >
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  className="h-12 bg-green-600 text-white hover:bg-green-700"
                  onClick={handleConfirm}
                  disabled={isRegistering}
                >
                  {isRegistering ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Confirmar
                </Button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-6 text-center duration-300 animate-in zoom-in">
              <div className="flex justify-center">
                <CheckCircle2 className="h-20 w-20 text-green-500" />
              </div>
              <div>
                <h3 className="mb-2 text-2xl font-bold text-green-600">
                  Registrado!
                </h3>
                <p className="text-lg text-slate-700 dark:text-slate-300">
                  {message}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Retornando em instantes...
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="shake space-y-6 text-center duration-300 animate-in">
              <div className="flex justify-center">
                <AlertCircle className="h-20 w-20 text-red-500" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-bold text-red-600">Erro</h3>
                <p className="text-slate-700 dark:text-slate-300">{message}</p>
              </div>
              <Button variant="outline" onClick={resetState}>
                Tentar Novamente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
