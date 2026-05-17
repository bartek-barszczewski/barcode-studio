import type { ReactNode } from 'react'
import clsx from 'clsx'
import styles from './Field.module.css'

type FieldProps = {
  label: string
  htmlFor: string
  description?: string
  children: ReactNode
  className?: string
}

export function Field({ label, htmlFor, description, children, className }: FieldProps) {
  return (
    <div className={clsx(styles.field, className)}>
      <div className={styles.copy}>
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
        </label>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {children}
    </div>
  )
}
