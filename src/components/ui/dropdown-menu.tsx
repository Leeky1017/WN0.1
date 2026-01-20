import * as React from "react"

interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  align?: 'start' | 'end' | 'center'
  side?: 'top' | 'bottom'
}

export function DropdownMenu({ trigger, children, open, onOpenChange, align = 'start', side = 'top' }: DropdownMenuProps) {
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

  const sideClasses = side === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div onClick={() => setOpenState(!openState)}>
        {trigger}
      </div>
      {openState && (
        <div className={`absolute ${sideClasses} ${alignmentClasses[align]} z-50 min-w-[180px] overflow-hidden rounded-lg border border-[#2d2d30] bg-[#252526] shadow-2xl py-1`}>
          {children}
        </div>
      )}
    </div>
  )
}

export function DropdownMenuItem({ 
  children, 
  onClick,
  className = '',
  disabled = false,
}: { 
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`relative flex w-full select-none items-center px-3 py-1.5 text-[13px] outline-none transition-colors text-left ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2a2d2e] cursor-pointer'
      } text-[#cccccc] ${className}`}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </button>
  )
}

export function DropdownMenuSeparator() {
  return <div className="h-px bg-[#2d2d30] my-1" />
}
