import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { UploadCloud } from 'lucide-react'
import styles from './Dropzone.module.css'

type DropzoneProps = {
  title?: string
  description?: string
  fileIcon?: ReactNode
  children?: ReactNode
  onFilesSelected?: (files: File[]) => void
  accept?: string
  disabled?: boolean
}

export function Dropzone({
  title,
  description,
  fileIcon,
  children,
  onFilesSelected,
  accept,
  disabled = false,
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
    <label className={`${styles.dropzone} ${disabled ? styles.disabled : ''}`}>
      <input
        type="file"
        className={styles.hiddenInput}
        onChange={handleFileChange}
        accept={accept}
        disabled={disabled}
      />
      <div className={styles.iconCluster} aria-hidden="true">
        {fileIcon && <span className={styles.typeIcon}>{fileIcon}</span>}
        <span className={styles.uploadIcon}>
          <UploadCloud />
        </span>
      </div>
      <div className={styles.copy}>
        <p className={styles.title}>{title ?? t('dropzone.defaultTitle')}</p>
        <p className={styles.description}>
          {description ?? t('dropzone.defaultDescription')}
        </p>
      </div>
      {children}
    </label>
  )
}
