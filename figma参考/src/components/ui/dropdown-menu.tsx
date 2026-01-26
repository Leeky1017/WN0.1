import * as React from "react"

interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  align?: 'start' | 'end' | 'center'
}

export function DropdownMenu({ trigger, children, open, onOpenChange, align = 'start' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const controlled = open !== undefined
  const openState = controlled ? open : isOpen
  const setOpenState = controlled ? onOpenChange! : setIsOpen

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenState(false)
      }
    }

    if (openState) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openState, setOpenState])

  const alignmentClasses = {
    start: 'left-0',
    end: 'right-0',
    center: 'left-1/2 -translate-x-1/2'
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div onClick={() => setOpenState(!openState)}>
        {trigger}
      </div>
      {openState && (
        <div className={`absolute bottom-full mb-1 ${alignmentClasses[align]} z-50 min-w-[180px] overflow-hidden rounded-lg border border-[#2d2d30] bg-[#252526] shadow-2xl py-1`}>
          {children}
        </div>
      )}
    </div>
  )
}

export function DropdownMenuItem({ 
  children, 
  onClick,
  className = ''
}: { 
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <div
      className={`relative flex cursor-pointer select-none items-center px-3 py-1.5 text-[13px] outline-none transition-colors hover:bg-[#2a2d2e] text-[#cccccc] ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function DropdownMenuSeparator() {
  return <div className="h-px bg-[#2d2d30] my-1" />
}
