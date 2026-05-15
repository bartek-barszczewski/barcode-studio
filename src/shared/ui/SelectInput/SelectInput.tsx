import type { SelectHTMLAttributes } from 'react'
import clsx from 'clsx'
import styles from './SelectInput.module.css'

type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement>

export function SelectInput({ className, children, ...props }: SelectInputProps) {
  return (
    <select className={clsx(styles.select, className)} {...props}>
      {children}
    </select>
  )
}
