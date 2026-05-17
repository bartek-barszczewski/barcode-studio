import type { ReactNode } from 'react'
import clsx from 'clsx'
import styles from './Panel.module.css'

type PanelProps = {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  contentClassName?: string
  fullHeight?: boolean
  compact?: boolean
}

export function Panel({
  title,
  description,
  children,
  className,
  contentClassName,
  fullHeight,
  compact,
}: PanelProps) {
  return (
    <section
      className={clsx(
        styles.panel, 
        className, 
        fullHeight && styles.fullHeight,
        compact && styles.compact
      )}
    >

      {(title || description) && (
        <header className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {description && <p className={styles.description}>{description}</p>}
        </header>
      )}
      <div className={clsx(styles.content, contentClassName)}>{children}</div>
    </section>
  )
}
