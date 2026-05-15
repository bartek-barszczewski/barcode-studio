import { useId, useState } from 'react'
import { Command } from 'cmdk'
import { useTranslation } from 'react-i18next'
import styles from './SearchableSelect.module.css'

type SearchableSelectOption = {
  value: string
  label: string
  description?: string
}

type SearchableSelectProps = {
  id?: string
  options: SearchableSelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
}: SearchableSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const listId = useId()
  const selectedOption = options.find((option) => option.value === value)

  if (disabled) {
    return (
      <div className={`${styles.root} ${styles.disabled}`}>
        <div className={styles.control}>
           <div className={styles.input}>
             {selectedOption?.label ?? placeholder ?? t('searchableSelect.placeholder')}
           </div>
        </div>
      </div>
    )
  }

  return (
    <Command className={styles.root}>
      <div className={styles.control}>
        <Command.Input
          aria-expanded={open}
          aria-controls={listId}
          className={styles.input}
          id={id}
          onFocus={() => setOpen(true)}
          onValueChange={() => setOpen(true)}
          placeholder={
            selectedOption?.label ?? placeholder ?? t('searchableSelect.placeholder')
          }
        />
      </div>
      {open && (
        <Command.List className={styles.list} id={listId}>
          <Command.Empty className={styles.empty}>
            {t('searchableSelect.empty')}
          </Command.Empty>
          {options.map((option) => (
            <Command.Item
              className={styles.item}
              key={option.value}
              onSelect={() => {
                onChange?.(option.value)
                setOpen(false)
              }}
              value={`${option.label} ${option.description ?? ''}`}
            >
              <span className={styles.label}>{option.label}</span>
              {option.description && (
                <span className={styles.description}>{option.description}</span>
              )}
            </Command.Item>
          ))}
        </Command.List>
      )}
    </Command>
  )
}
