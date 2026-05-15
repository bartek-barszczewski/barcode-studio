import type { ReactNode } from 'react'
import styles from './Field.module.css'

type FieldProps = {
  label: string
  htmlFor: string
  description?: string
  children: ReactNode
}

export function Field({ label, htmlFor, description, children }: FieldProps) {
  return (
    <div className={styles.field}>
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
