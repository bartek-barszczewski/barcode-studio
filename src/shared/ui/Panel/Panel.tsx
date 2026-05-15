import type { ReactNode } from 'react'
import clsx from 'clsx'
import styles from './Panel.module.css'

type PanelProps = {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  fullHeight?: boolean
}

export function Panel({
  title,
  description,
  children,
  className,
  fullHeight,
}: PanelProps) {
  return (
    <section
      className={clsx(styles.panel, className, fullHeight && styles.fullHeight)}
    >
      {(title || description) && (
        <header className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {description && <p className={styles.description}>{description}</p>}
        </header>
      )}
      <div className={styles.content}>{children}</div>
    </section>
  )
}
