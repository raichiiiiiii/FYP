import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}) {
  return (
    <button
      className={['button', `button--${variant}`, className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}
