import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SimpleCalendarProps {
    selected: Date | undefined
    onSelect: (date: Date) => void
    disabledDays?: (date: Date) => boolean
}

export function SimpleCalendar({
    selected,
    onSelect,
    disabledDays
}: SimpleCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [isOpen, setIsOpen] = useState(false)

    const today = new Date()
    today.setHours(0, 0, 0, 0);

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    }
    const getFirstDayOfMonth = (date: Date) => {
        // Retorna o dia da semana: 0=Domingo, 1=Segunda, etc.
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    }

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev)
            if (direction === 'prev') {
                newDate.setMonth(prev.getMonth() - 1)
            } else {
                newDate.setMonth(prev.getMonth() + 1)
            }
            return newDate
        })
    }

    const handleDateSelect = (day: number) => {
        const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        selectedDate.setHours(0, 0, 0, 0)
        onSelect(selectedDate)
        setIsOpen(false)
    }

    const isToday = (day: number) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        date.setHours(0, 0, 0, 0)
        return date.toDateString() === today.toDateString()
    }

    const isSelected = (day: number) => {
        if (!selected) return false
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        date.setHours(0, 0, 0, 0)
        return date.toDateString() === selected.toDateString()
    }

    const isDayDisabled = (day: number) => {
        if (!disabledDays) return false
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        date.setHours(0, 0, 0, 0)
        return disabledDays(date)
    }

    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate) 

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

    return (
        <div className="relative w-full"> 
            {/* Botão para abrir o calendário */}
            <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'w-full justify-start text-left font-normal py-6 text-base border-2',
                    !selected && 'text-muted-foreground'
                )}
            >
                {selected ? format(selected, 'dd/MM/yyyy') : 'Selecione a Data'}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>

            {/* Calendário Dropdown */}
            {isOpen && (
                <div 
                    className="absolute z-50 mt-2 w-64 rounded-lg border bg-white p-4 shadow-xl dark:bg-gray-800 dark:border-gray-700"
                    style={{ right: 0 }}
                >
                    <div className="space-y-4">
                        {/* Header do Calendário */}
                        <div className="flex items-center justify-between">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => navigateMonth('prev')}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <div className="text-sm font-medium">
                                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                            </div>

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => navigateMonth('next')}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Dias da semana */}
                        <div className="grid grid-cols-7 gap-1 text-center text-xs">
                            {weekDays.map(day => (
                                <div key={day} className="font-medium text-gray-500 dark:text-gray-400">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Dias do mês */}
                        <div className="grid grid-cols-7 gap-1">
                            {/* Espaços vazios antes do primeiro dia */}
                            {Array.from({ length: firstDay }).map((_, index) => (
                                <div key={`empty-${index}`} className="h-8" />
                            ))}

                            {/* Dias do mês */}
                            {Array.from({ length: daysInMonth }).map((_, index) => {
                                const day = index + 1
                                const isTodayDate = isToday(day)
                                const isSelectedDate = isSelected(day)
                                const isDisabled = isDayDisabled(day)

                                return (
                                    <Button
                                        type="button"
                                        key={day}
                                        variant={isSelectedDate ? "default" : "ghost"}
                                        size="sm"
                                        disabled={isDisabled}
                                        className={cn(
                                            "h-8 w-8 p-0 text-xs font-normal",
                                            isTodayDate && !isSelectedDate && "border-2 border-primary/50",
                                            isSelectedDate && "bg-primary text-white hover:bg-primary/90",
                                            isDisabled && "text-gray-300 opacity-50 cursor-not-allowed",
                                        )}
                                        onClick={() => handleDateSelect(day)}
                                    >
                                        {day}
                                    </Button>
                                )
                            })}
                        </div>

                        {/* Botões de ação */}
                        <div className="flex justify-between border-t pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    onSelect(today)
                                    setIsOpen(false)
                                }}
                                className="text-xs"
                            >
                                Hoje
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsOpen(false)}
                                className="text-xs"
                            >
                                Fechar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}