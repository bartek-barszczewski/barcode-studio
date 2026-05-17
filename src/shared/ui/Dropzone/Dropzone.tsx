import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { UploadCloud } from 'lucide-react'
import clsx from 'clsx'
import styles from './Dropzone.module.css'

type DropzoneProps = {
  title?: string
  description?: string
  fileIcon?: ReactNode
  children?: ReactNode
  onFilesSelected?: (files: File[]) => void
  accept?: string
  disabled?: boolean
  className?: string
  iconClusterClassName?: string
  titleClassName?: string
  descriptionClassName?: string
}

export function Dropzone({
  title,
  description,
  fileIcon,
  children,
  onFilesSelected,
  accept,
  disabled = false,
  className,
  iconClusterClassName,
  titleClassName,
  descriptionClassName,
}: DropzoneProps) {
  const { t } = useTranslation()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const files = event.target.files
    if (files && files.length > 0) {
      onFilesSelected?.(Array.from(files))
    }
  }

  return (
    <label className={clsx(styles.dropzone, className, disabled && styles.disabled)}>
      <input
        type="file"
        className={styles.hiddenInput}
        onChange={handleFileChange}
        accept={accept}
        disabled={disabled}
      />
      <div className={clsx(styles.iconCluster, iconClusterClassName)} aria-hidden="true">
        {fileIcon && <span className={styles.typeIcon}>{fileIcon}</span>}
        <span className={styles.uploadIcon}>
          <UploadCloud />
        </span>
      </div>
      <div className={styles.copy}>
        <p className={clsx(styles.title, titleClassName)}>{title ?? t('dropzone.defaultTitle')}</p>
        <p className={clsx(styles.description, descriptionClassName)}>
          {description ?? t('dropzone.defaultDescription')}
        </p>
      </div>
      {children}
    </label>
  )
}
