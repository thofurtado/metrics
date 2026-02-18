import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { getTimeClockStatus, registerTimeClock } from "@/api/hr/time-clock"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, ArrowRight, UserCheck, CheckCircle2, AlertCircle } from "lucide-react"

export function TimeClockKiosk() {
    const [pin, setPin] = useState("")
    const [step, setStep] = useState<"idle" | "confirm" | "success" | "error">("idle")
    const [employee, setEmployee] = useState<{ id: string, name: string } | null>(null)
    const [nextAction, setNextAction] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    const { isPending: isLoadingStatus, mutate: checkStatus } = useMutation({
        mutationFn: getTimeClockStatus,
        onSuccess: (data) => {
            setEmployee(data.employee)
            setNextAction(data.nextAction)
            setStep("confirm")
        },
        onError: () => {
            setStep("error")
            setMessage("PIN inválido ou funcionário não encontrado.")
            setTimeout(() => resetState(), 3000)
        }
    })

    const { isPending: isRegistering, mutate: register } = useMutation({
        mutationFn: ({ pin, action }: { pin: string, action: string }) => registerTimeClock(pin, action),
        onSuccess: (data) => {
            setStep("success")
            setMessage(`${getActionLabel(data.action)} registrado com sucesso às ${new Date(data.timestamp).toLocaleTimeString()}`)
            setTimeout(() => resetState(), 3000)
        },
        onError: () => {
            setStep("error")
            setMessage("Erro ao registrar ponto. Tente novamente.")
            setTimeout(() => resetState(), 3000)
        }
    })

    const resetState = () => {
        setPin("")
        setStep("idle")
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
        if (step !== "idle") return
        if (key === "clear") {
            setPin("")
        } else if (key === "backspace") {
            setPin(prev => prev.slice(0, -1))
        } else if (key === "enter") {
            handlePinSubmit()
        } else {
            if (pin.length < 6) {
                setPin(prev => prev + key)
            }
        }
    }

    // Auto-submit when length reaches 4 (or 6 depending on pin policy, assume 4-6)
    // Let's rely on explicit enter or length check if pins are fixed length. 
    // For now, let's use Enter button on UI.

    const getActionLabel = (action: string) => {
        switch (action) {
            case "clockIn": return "Iniciar Expediente"
            case "breakStart": return "Pausa para Almoço"
            case "breakEnd": return "Retorno do Almoço"
            case "clockOut": return "Fim de Expediente"
            case "completed": return "Jornada Completa"
            default: return action
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
            <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        Quiosque de Ponto
                    </CardTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Digite seu PIN para registrar o ponto
                    </p>
                </CardHeader>
                <CardContent>
                    {step === "idle" && (
                        <div className="space-y-6">
                            <div className="flex justify-center mb-6">
                                <Input
                                    type="password"
                                    readOnly
                                    value={pin}
                                    className="text-center text-4xl tracking-[1em] h-16 w-full max-w-[240px] font-mono"
                                    placeholder="••••"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <Button
                                        key={num}
                                        variant="outline"
                                        className="h-16 text-2xl font-semibold rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                        onClick={() => handleKeyPress(num.toString())}
                                    >
                                        {num}
                                    </Button>
                                ))}
                                <Button
                                    variant="ghost"
                                    className="h-16 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleKeyPress("clear")}
                                >
                                    C
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-16 text-2xl font-semibold rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                    onClick={() => handleKeyPress("0")}
                                >
                                    0
                                </Button>
                                <Button
                                    variant="default"
                                    className="h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                                    onClick={() => handleKeyPress("enter")}
                                    disabled={isLoadingStatus || pin.length === 0}
                                >
                                    {isLoadingStatus ? <Loader2 className="h-6 w-6 animate-spin" /> : <ArrowRight className="h-6 w-6" />}
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === "confirm" && employee && nextAction && (
                        <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex justify-center">
                                <UserCheck className="h-16 w-16 text-blue-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-medium">Olá, <span className="font-bold text-blue-600">{employee.name}</span></h3>
                                <p className="text-muted-foreground">Confirmar registro de:</p>
                                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 py-2">
                                    {getActionLabel(nextAction)}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <Button variant="outline" size="lg" onClick={resetState} className="h-12">
                                    Cancelar
                                </Button>
                                <Button
                                    variant="default"
                                    size="lg"
                                    className="h-12 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={handleConfirm}
                                    disabled={isRegistering}
                                >
                                    {isRegistering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                    Confirmar
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === "success" && (
                        <div className="text-center space-y-6 animate-in zoom-in duration-300">
                            <div className="flex justify-center">
                                <CheckCircle2 className="h-20 w-20 text-green-500" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-green-600 mb-2">Registrado!</h3>
                                <p className="text-lg text-slate-700 dark:text-slate-300">{message}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">Retornando em instantes...</p>
                        </div>
                    )}

                    {step === "error" && (
                        <div className="text-center space-y-6 animate-in shake duration-300">
                            <div className="flex justify-center">
                                <AlertCircle className="h-20 w-20 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-red-600 mb-2">Erro</h3>
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
