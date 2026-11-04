import type { ButtonHTMLAttributes } from 'react'

export function Chip({ on, className = '', ...rest }: { on?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`chip ${on ? 'on' : ''} ${className}`.trim()} aria-pressed={on === undefined ? undefined : on} {...rest} />
}
