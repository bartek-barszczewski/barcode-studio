import { useId, type CSSProperties, type InputHTMLAttributes } from 'react'
import styles from './Slider.module.css'

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  suffix?: string
}

const toFiniteNumber = (
  value: number | string | readonly string[] | undefined,
  fallback: number,
) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value === 'string') {
    const parsedValue = Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : fallback
  }
  return fallback
}

const formatSliderValue = (value: SliderProps['value']) => {
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? String(value)
      : value.toFixed(2).replace(/\.?0+$/, '')
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value)

    if (!Number.isFinite(parsedValue)) {
      return value
    }

    return Number.isInteger(parsedValue)
      ? String(parsedValue)
      : parsedValue.toFixed(2).replace(/\.?0+$/, '')
  }

  return ''
}

export function Slider({
  id,
  label,
  max = 100,
  min = 0,
  style,
  suffix,
  value,
  ...props
}: SliderProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const minValue = toFiniteNumber(min, 0)
  const maxValue = toFiniteNumber(max, 100)
  const currentValue = toFiniteNumber(value, minValue)
  const range = maxValue - minValue
  const progress = range <= 0
    ? 0
    : Math.min(100, Math.max(0, ((currentValue - minValue) / range) * 100))
  const sliderStyle = {
    ...style,
    '--slider-percent': `${progress}%`,
  } as CSSProperties

  return (
    <div className={styles.sliderContainer}>
      <div className={styles.header}>
        {label && (
          <label className={styles.label} htmlFor={inputId}>
            {label}
          </label>
        )}
        <span className={styles.valueDisplay}>
          {formatSliderValue(value)}
          {suffix}
        </span>
      </div>
      <input
        {...props}
        className={styles.slider}
        id={inputId}
        max={max}
        min={min}
        style={sliderStyle}
        type="range"
        value={value}
      />
    </div>
  )
}
