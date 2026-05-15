import type { TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'
import styles from './Textarea.module.css'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={clsx(styles.textarea, className)} {...props} />
}
