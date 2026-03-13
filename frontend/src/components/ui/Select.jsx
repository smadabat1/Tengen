import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Select({ value, onValueChange, options = [], placeholder, className }) {
  const selected = options.find((o) => o.value === value)

  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange}>
      <RadixSelect.Trigger
        className={cn(
          'flex items-center justify-between gap-1.5 px-3 py-1.5',
          'text-xs bg-secondary border border-border rounded-lg',
          'hover:bg-secondary/80 focus:outline-none focus:ring-1 focus:ring-ring',
          'transition-colors select-none cursor-pointer',
          className
        )}
      >
        <RadixSelect.Value placeholder={placeholder}>
          {selected?.label ?? placeholder}
        </RadixSelect.Value>
        <RadixSelect.Icon asChild>
          <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'z-50 min-w-[8rem] overflow-hidden rounded-xl border border-border bg-card shadow-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2'
          )}
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  'relative flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer select-none',
                  'text-muted-foreground outline-none transition-colors',
                  'data-[highlighted]:bg-secondary data-[highlighted]:text-foreground',
                  'data-[state=checked]:text-primary'
                )}
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="ml-auto">
                  <Check className="w-3 h-3" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}
