import { format } from 'date-fns'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function validateAndCreateDate(year: number, month: number, day: number): Date | null {
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  if (month < 0 || month > 11) return null
  if (day < 1 || day > 31) return null
  if (year < 1900 || year > 2100) return null

  const d = new Date(year, month, day, 12, 0, 0, 0)
  if (!isNaN(d.getTime()) && d.getDate() === day && d.getMonth() === month) {
    d.setHours(0, 0, 0, 0)
    return d
  }
  return null
}

function parseFlexibleDate(input: string, referenceDate: Date = new Date()): Date | null {
  if (!input || !input.trim()) return null
  const trimmed = input.trim()

  // 1. Formato com separadores (/, - ou .)
  if (trimmed.includes('/') || trimmed.includes('-') || trimmed.includes('.')) {
    const separator = trimmed.includes('/') ? '/' : trimmed.includes('-') ? '-' : '.'
    const parts = trimmed.split(separator).map((p) => p.trim())

    // Se for ISO YYYY-MM-DD
    if (parts.length === 3 && parts[0].length === 4) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      return validateAndCreateDate(year, month, day)
    }

    // Se for DD/MM/YYYY ou DD/MM/YY ou DD/MM
    if (parts.length >= 2) {
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      let year = referenceDate.getFullYear()

      if (parts.length >= 3 && parts[2]) {
        const y = parseInt(parts[2], 10)
        year = y < 100 ? (y < 70 ? 2000 + y : 1900 + y) : y
      }

      return validateAndCreateDate(year, month, day)
    }
  }

  // 2. Extrair apenas os dígitos
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null

  let day = 0
  let month = referenceDate.getMonth()
  let year = referenceDate.getFullYear()

  if (digits.length === 8) {
    // DDMMAAAA
    day = parseInt(digits.slice(0, 2), 10)
    month = parseInt(digits.slice(2, 4), 10) - 1
    year = parseInt(digits.slice(4, 8), 10)
  } else if (digits.length === 6) {
    // DDMMAA
    day = parseInt(digits.slice(0, 2), 10)
    month = parseInt(digits.slice(2, 4), 10) - 1
    const y = parseInt(digits.slice(4, 6), 10)
    year = y < 70 ? 2000 + y : 1900 + y
  } else if (digits.length === 4) {
    // DDMM
    day = parseInt(digits.slice(0, 2), 10)
    month = parseInt(digits.slice(2, 4), 10) - 1
    year = referenceDate.getFullYear()
  } else if (digits.length === 1 || digits.length === 2) {
    // DD
    day = parseInt(digits, 10)
    month = referenceDate.getMonth()
    year = referenceDate.getFullYear()
  } else {
    return null
  }

  return validateAndCreateDate(year, month, day)
}

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

    // Se completou 8 dígitos (DDMMAAAA), comita imediatamente
    if (val.length === 8) {
      const parsed = parseFlexibleDate(formatted, selected || currentDate)
      if (parsed) {
        onSelect(parsed)
        setCurrentDate(parsed)
      }
    }
  }

  const commitDate = () => {
    const parsed = parseFlexibleDate(inputValue, selected || currentDate)
    if (parsed) {
      onSelect(parsed)
      setCurrentDate(parsed)
      setInputValue(format(parsed, 'dd/MM/yyyy'))
    } else if (selected) {
      setInputValue(format(selected, 'dd/MM/yyyy'))
    } else {
      setInputValue('')
    }
  }

  const handleBlur = () => {
    commitDate()
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
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitDate()
            }
          }}
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