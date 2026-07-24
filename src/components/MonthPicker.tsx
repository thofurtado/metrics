import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'

interface MonthPickerProps {
  date: Date
  setDate: (date: Date) => void
}

export function MonthPicker({ date, setDate }: MonthPickerProps) {
  const nextMonth = () =>
    setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))
  const prevMonth = () =>
    setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))

  return (
    <div className="flex items-center gap-2 rounded-md border bg-background/50 p-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={prevMonth}
        className="h-8 w-8"
        type="button"
      >
        {'<'}
      </Button>
      <div className="w-32 text-center text-sm font-medium capitalize">
        {format(date, 'MMMM yyyy', { locale: ptBR })}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={nextMonth}
        className="h-8 w-8"
        type="button"
      >
        {'>'}
      </Button>
    </div>
  )
}
