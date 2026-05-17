import type { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'
import styles from './Button.module.css'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  fullWidth?: boolean
  progress?: number // 0 to 100
}

export function Button({
  className,
  variant = 'primary',
  fullWidth = false,
  type = 'button',
  progress,
  children,
  ...props
}: ButtonProps) {
  const showProgress = typeof progress === 'number' && progress >= 0 && progress <= 100;

  return (
    <button
      className={clsx(
        styles.button,
        styles[variant],
        fullWidth && styles.fullWidth,
        showProgress && styles.hasProgress,
        className,
      )}
      type={type}
      aria-valuenow={showProgress ? progress : undefined}
      aria-valuemin={showProgress ? 0 : undefined}
      aria-valuemax={showProgress ? 100 : undefined}
      {...props}
    >
      {showProgress && (
        <div 
          className={styles.progressBar} 
          style={{ width: `${progress}%` }} 
        />
      )}
      <span className={styles.content}>{children}</span>
    </button>
  )
}
