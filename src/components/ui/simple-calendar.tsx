import { format } from 'date-fns'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SimpleCalendarProps {
  selected: Date | undefined
  onSelect: (date: Date) => void
  disabledDays?: (date: Date) => boolean
  className?: string
  placeholder?: string
}

export function SimpleCalendar({
  selected,
  onSelect,
  disabledDays,
  className,
  placeholder = 'DD/MM/AAAA',
}: SimpleCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(selected || new Date())
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(selected ? format(selected, 'dd/MM/yyyy') : '')

  useEffect(() => {
    if (selected) {
      setInputValue(format(selected, 'dd/MM/yyyy'))
      setCurrentDate(selected)
    } else {
      setInputValue('')
    }
  }, [selected])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }
  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
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
    const selectedDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    )
    selectedDate.setHours(0, 0, 0, 0)
    onSelect(selectedDate)
    setInputValue(format(selectedDate, 'dd/MM/yyyy'))
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length > 8) val = val.slice(0, 8)

    let formatted = val
    if (val.length >= 5) {
      formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`
    } else if (val.length >= 3) {
      formatted = `${val.slice(0, 2)}/${val.slice(2)}`
    }
    setInputValue(formatted)

    if (val.length === 8) {
      const day = parseInt(val.slice(0, 2), 10)
      const month = parseInt(val.slice(2, 4), 10) - 1
      const year = parseInt(val.slice(4, 8), 10)

      if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        const newDate = new Date(year, month, day)
        newDate.setHours(0, 0, 0, 0)
        if (!isNaN(newDate.getTime()) && newDate.getDate() === day) {
          onSelect(newDate)
          setCurrentDate(newDate)
        }
      }
    }
  }

  const handleBlur = () => {
    const digits = inputValue.replace(/\D/g, '')
    if (digits.length !== 8) {
      setInputValue(selected ? format(selected, 'dd/MM/yyyy') : '')
    }
  }

  const isToday = (day: number) => {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    )
    date.setHours(0, 0, 0, 0)
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (day: number) => {
    if (!selected) return false
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    )
    date.setHours(0, 0, 0, 0)
    return date.toDateString() === selected.toDateString()
  }

  const isDayDisabled = (day: number) => {
    if (!disabledDays) return false
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    )
    date.setHours(0, 0, 0, 0)
    return disabledDays(date)
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="relative w-full">
      {/* Campo de Entrada Digitavel com Icone para Abrir o Calendario */}
      <div className="relative flex items-center w-full">
        <input
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={cn(
            'w-full rounded-md border-2 border-input bg-background px-3 py-2 text-base font-normal ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-14 md:h-12 pr-11 tracking-wider',
            className,
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-1.5 h-9 w-9 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Abrir calendário visual"
        >
          <CalendarIcon className="h-5 w-5 opacity-70" />
        </Button>
      </div>

      {/* Calendario Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 mt-2 w-64 rounded-lg border bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800"
          style={{ right: 0 }}
        >
          <div className="space-y-4">
            {/* Header do Calendario */}
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
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="font-medium text-gray-500 dark:text-gray-400"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Dias do mes */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, index) => (
                <div key={`empty-${index}`} className="h-8" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1
                const isTodayDate = isToday(day)
                const isSelectedDate = isSelected(day)
                const isDisabled = isDayDisabled(day)

                return (
                  <Button
                    type="button"
                    key={day}
                    variant={isSelectedDate ? 'default' : 'ghost'}
                    size="sm"
                    disabled={isDisabled}
                    className={cn(
                      'h-8 w-8 p-0 text-xs font-normal',
                      isTodayDate &&
                        !isSelectedDate &&
                        'border-2 border-primary/50',
                      isSelectedDate &&
                        'bg-primary text-white hover:bg-primary/90',
                      isDisabled &&
                        'cursor-not-allowed text-gray-300 opacity-50',
                    )}
                    onClick={() => handleDateSelect(day)}
                  >
                    {day}
                  </Button>
                )
              })}
            </div>

            {/* Botoes de acao */}
            <div className="flex justify-between border-t pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onSelect(today)
                  setInputValue(format(today, 'dd/MM/yyyy'))
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