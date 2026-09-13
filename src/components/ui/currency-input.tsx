import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  cleanCurrencyDigits,
  formatCurrency,
} from '@/lib/currency-utils'

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange'> {
  value?: string | number | null
  defaultValue?: string | number | null
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onValueChange?: (numericValue: number, formattedValue: string) => void
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      className,
      value,
      defaultValue,
      onChange,
      onValueChange,
      onFocus,
      placeholder = '0,00',
      ...props
    },
    ref,
  ) => {
    const getFormatted = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined || val === '') return ''
      if (typeof val === 'number') {
        if (val === 0) return ''
        return val.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      }
      const str = val.toString().trim()
      if (!str || str === '0' || str === '0.00' || str === '0,00') return ''
      return formatCurrency(str)
    }

    const [internalValue, setInternalValue] = React.useState<string>(() => {
      const initial = value !== undefined ? value : defaultValue
      return getFormatted(initial)
    })

    React.useEffect(() => {
      if (value !== undefined) {
        const nextFormatted = getFormatted(value)
        setInternalValue(nextFormatted)
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawInput = e.target.value
      const digits = cleanCurrencyDigits(rawInput)

      let formatted = ''
      let numeric = 0

      if (digits && digits !== '0') {
        numeric = Number(digits) / 100
        formatted = numeric.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      } else if (digits === '0') {
        formatted = '0,00'
        numeric = 0
      } else {
        formatted = ''
        numeric = 0
      }

      setInternalValue(formatted)

      // Clona o evento para atualizar target.value
      e.target.value = formatted

      if (onChange) {
        onChange(e)
      }

      if (onValueChange) {
        onValueChange(numeric, formatted)
      }
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select()
      if (onFocus) {
        onFocus(e)
      }
    }

    return (
      <input
        type="text"
        inputMode="numeric"
        ref={ref}
        value={internalValue}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    )
  },
)

CurrencyInput.displayName = 'CurrencyInput'
