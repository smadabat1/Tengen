import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

export function Tooltip({ children, content, side = 'top', sideOffset = 6 }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={sideOffset}
            className={cn(
              'z-50 px-2.5 py-1 rounded-lg text-[11px] font-medium',
              'bg-popover border border-border/60 text-popover-foreground shadow-lg',
              'animate-in fade-in-0 zoom-in-95 duration-100',
              'data-[side=top]:slide-in-from-bottom-1',
              'data-[side=bottom]:slide-in-from-top-1',
              'data-[side=left]:slide-in-from-right-1',
              'data-[side=right]:slide-in-from-left-1',
            )}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
