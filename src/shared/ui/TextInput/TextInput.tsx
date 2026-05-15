import type { InputHTMLAttributes } from 'react'
import clsx from 'clsx'
import styles from './TextInput.module.css'

type TextInputProps = InputHTMLAttributes<HTMLInputElement>

export function TextInput({ className, ...props }: TextInputProps) {
  return <input className={clsx(styles.input, className)} {...props} />
}
