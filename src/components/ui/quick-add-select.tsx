import { Check, Plus, X } from 'lucide-react'
import { useState, useRef } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface QuickAddSelectProps {
  // Select props
  value: string
  onValueChange: (value: string) => void
  options?: { label: string; value: string }[]
  placeholder?: string
  disabled?: boolean
  isLoading?: boolean
  emptyMessage?: string

  // Quick Add props
  quickAddLabel?: string
  quickAddPlaceholder?: string
  onQuickAdd?: (name: string) => Promise<any>
  onQuickAddClick?: () => void
}

export function QuickAddSelect({
  value,
  onValueChange,
  options = [],
  placeholder = 'Selecione',
  disabled,
  isLoading,
  emptyMessage = 'Nenhum item cadastrado',

  quickAddLabel = 'Adicionar Novo',
  quickAddPlaceholder = 'Nome do item',
  onQuickAdd,
  onQuickAddClick,
}: QuickAddSelectProps) {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  async function handleQuickAdd() {
    if (!newItemName.trim() || !onQuickAdd) return

    setIsAdding(true)
    try {
      const result = await onQuickAdd(newItemName)

      // Attempt to auto-select the newly created item
      // The parent component is responsible for invalidating queries so options update
      // But we can try to select immediately if an ID is returned
      if (result) {
        if (typeof result === 'string') {
          onValueChange(result)
        } else if (result.id) {
          onValueChange(result.id)
        } else if (result.account?.id) {
          onValueChange(result.account.id)
        } else if (result.sector?.id) {
          onValueChange(result.sector.id)
        }
      }

      setNewItemName('')
      setIsQuickAddOpen(false)
      toast.success('Item adicionado com sucesso!')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao adicionar item')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value}
        onValueChange={(val) => {
          onValueChange(val)
          setTimeout(() => {
            if (triggerRef.current) {
              const form = triggerRef.current.closest('form')
              if (form) {
                const inputs = Array.from(
                  form.querySelectorAll(
                    'input:not([type="hidden"]):not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), button[role="combobox"]:not([disabled]):not([tabindex="-1"]), button[aria-haspopup="dialog"]:not([disabled]):not([tabindex="-1"]), button[role="switch"]:not([disabled]):not([tabindex="-1"]), button[type="submit"]:not([disabled]):not([tabindex="-1"])',
                  ),
                ) as HTMLElement[]
                const index = inputs.indexOf(triggerRef.current)
                if (index > -1 && index < inputs.length - 1) {
                  const nextElement = inputs[index + 1]
                  if (nextElement) nextElement.focus()
                }
              }
            }
          }, 50)
        }}
        disabled={disabled || isLoading}
      >
        <SelectTrigger ref={triggerRef} className="h-10 flex-1">
          <SelectValue
            placeholder={isLoading ? 'Carregando...' : placeholder}
          />
        </SelectTrigger>
        <SelectContent withPortal={false}>
          {options && options.length > 0 ? (
            options.map((option) => (
              <SelectItem value={option.value} key={option.value}>
                {option.label}
              </SelectItem>
            ))
          ) : (
            <div className="p-2 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          )}
        </SelectContent>
      </Select>

      {value && onValueChange && (
        <Button
          variant="ghost"
          size="icon"
          type="button"
          title="Limpar seleção"
          disabled={disabled || isLoading}
          onClick={() => onValueChange('')}
          tabIndex={-1}
          className="h-10 w-10 shrink-0 border border-transparent px-0 text-slate-400 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-500"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Limpar</span>
        </Button>
      )}

      {(onQuickAdd || onQuickAddClick) &&
        (onQuickAddClick ? (
          <Button
            variant="outline"
            size="icon"
            disabled={disabled || isLoading}
            title={quickAddLabel}
            type="button"
            tabIndex={-1}
            className="h-10 w-10 shrink-0"
            onClick={onQuickAddClick}
          >
            <Plus className="h-4 w-4" />
          </Button>
        ) : (
          <Popover
            modal={true}
            open={isQuickAddOpen}
            onOpenChange={setIsQuickAddOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={disabled || isLoading}
                title={quickAddLabel}
                type="button"
                tabIndex={-1}
                className="h-10 w-10 shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="z-[9999] w-72 p-3" align="end">
              <div className="flex flex-col gap-2">
                <h4 className="mb-1 text-sm font-medium leading-none text-muted-foreground">
                  {quickAddLabel}
                </h4>
                <div className="flex gap-2">
                  <Input
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder={quickAddPlaceholder}
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleQuickAdd()
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    type="button"
                    onClick={handleQuickAdd}
                    disabled={isAdding || !newItemName.trim()}
                    className="h-8 w-8 shrink-0 p-0"
                  >
                    {isAdding ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ))}
    </div>
  )
}
