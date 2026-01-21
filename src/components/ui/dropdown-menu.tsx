import * as React from "react"

interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  align?: 'start' | 'end' | 'center'
  side?: 'top' | 'bottom'
}

type DropdownMenuContextValue = {
  requestClose: () => void
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null)

export function DropdownMenu({ trigger, children, open, onOpenChange, align = 'start', side = 'top' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const controlled = open !== undefined
  const openState = controlled ? open : isOpen
  const setOpenState = controlled ? onOpenChange! : setIsOpen
  const requestClose = React.useCallback(() => setOpenState(false), [setOpenState])

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
    <DropdownMenuContext.Provider value={{ requestClose }}>
      <div className="relative inline-block" ref={dropdownRef}>
        <div onClick={() => setOpenState(!openState)}>
          {trigger}
        </div>
        {openState && (
          <div
            className={`absolute ${sideClasses} ${alignmentClasses[align]} z-50 min-w-[180px] overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-2xl py-1`}
          >
            {children}
          </div>
        )}
      </div>
    </DropdownMenuContext.Provider>
  )
}

export interface DropdownMenuItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick' | 'disabled'> {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}

export function DropdownMenuItem({
  children,
  onClick,
  className = '',
  disabled = false,
  ...props
}: DropdownMenuItemProps) {
  const ctx = React.useContext(DropdownMenuContext)

  return (
    <button
      type="button"
      disabled={disabled}
      {...props}
      className={`relative flex w-full select-none items-center px-3 py-1.5 text-[13px] outline-none transition-colors text-left ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--bg-hover)] cursor-pointer'
      } text-[var(--text-secondary)] ${className}`}
      onClick={
        disabled
          ? undefined
          : () => {
              onClick?.()
              ctx?.requestClose()
            }
      }
    >
      {children}
    </button>
  )
}

export function DropdownMenuSeparator() {
  return <div className="h-px bg-[var(--border-subtle)] my-1" />
}
