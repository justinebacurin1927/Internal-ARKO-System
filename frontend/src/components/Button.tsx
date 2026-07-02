import * as React from 'react'

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-accent-600 text-white hover:bg-accent-700 shadow-button',
  destructive: 'bg-neg text-white hover:bg-red-700 shadow-sm',
  outline: 'border border-border-subtle bg-white hover:bg-bg-app shadow-sm',
  secondary: 'bg-accent-100 text-accent-700 hover:bg-accent-200',
  ghost: 'hover:bg-accent-50/60 text-text-secondary',
  link: 'text-accent-500 underline-offset-4 hover:underline',
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-9 px-4 py-2',
  sm: 'h-8 rounded-md px-3 text-xs',
  lg: 'h-10 rounded-lg px-6',
  icon: 'h-9 w-9',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2 active:scale-[0.97] ${variantClasses[variant]} ${sizeClasses[size]} ${className ?? ''}`}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button }
