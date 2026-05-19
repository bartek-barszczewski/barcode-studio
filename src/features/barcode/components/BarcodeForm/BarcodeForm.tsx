import clsx from 'clsx'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bold,
  Italic,
  Type,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BARCODE_TYPE_OPTIONS } from '../../constants/barcodeTypes'
import type {
  BarcodeFormState,
  BarcodeRotation,
  BarcodeTextPosition,
  BarcodeType,
} from '../../types/barcode'
import { Field } from '../../../../shared/ui/Field/Field'
import { SearchableSelect } from '../../../../shared/ui/SearchableSelect/SearchableSelect'
import { SelectInput } from '../../../../shared/ui/SelectInput/SelectInput'
import { Slider } from '../../../../shared/ui/Slider/Slider'
import { TextInput } from '../../../../shared/ui/TextInput/TextInput'
import { Textarea } from '../../../../shared/ui/Textarea/Textarea'
import { toNumber } from '../../../../shared/utils/number'
import styles from './BarcodeForm.module.css'

const MAX_BARCODE_SCALE = 2.5
const MAX_BARCODE_HEIGHT = 512
const MAX_BARCODE_MARGIN = 128
const MAX_BARCODE_BAR_WIDTH = 6
const MAX_BARCODE_FONT_SIZE = 128
const MAX_TEXT_ROTATION = 360
const TEXT_ROTATION_STEP = 5

const TEXT_POSITION_OPTIONS: Array<{
  value: BarcodeTextPosition
  icon: typeof ArrowUp
  labelKey: string
}> = [
  { value: 'top', icon: ArrowUp, labelKey: 'generator.textEditor.positions.top' },
  { value: 'left', icon: ArrowLeft, labelKey: 'generator.textEditor.positions.left' },
  { value: 'right', icon: ArrowRight, labelKey: 'generator.textEditor.positions.right' },
  { value: 'bottom', icon: ArrowDown, labelKey: 'generator.textEditor.positions.bottom' },
]

export type BarcodeFormProps = {
  formState: BarcodeFormState
  scrollable?: boolean
  showPreviewFrame?: boolean
  updateField: <Key extends keyof BarcodeFormState>(
    key: Key,
    value: BarcodeFormState[Key],
  ) => void
  updateShowPreviewFrame?: (showPreviewFrame: boolean) => void
}

export function BarcodeForm({
  formState,
  scrollable = true,
  showPreviewFrame,
  updateField,
  updateShowPreviewFrame,
}: BarcodeFormProps) {
  const { t, i18n } = useTranslation()
  const textPosition = formState.textPosition ?? 'bottom'
  const textRotation = formState.textRotation ?? 0
  const textBold = Boolean(formState.textBold)
  const textItalic = Boolean(formState.textItalic)
  const transparentBackgroundLabel = t('generator.fields.transparentBackground', {
    defaultValue: i18n.language.startsWith('pl')
      ? 'Przezroczysto\u015b\u0107'
      : 'Transparent',
  })

  const barcodeTypeOptions = BARCODE_TYPE_OPTIONS.map((option) => ({
    ...option,
    label: t(`barcode.types.${option.value}`),
  }))

  return (
    <div className={clsx(styles.form, !scrollable && styles.formInheritScroll)}>
      <Field label={t('generator.fields.type')} htmlFor="barcode-type">
        <SearchableSelect
          id="barcode-type"
          options={barcodeTypeOptions}
          onChange={(value) => updateField('type', value as BarcodeType)}
          placeholder={t('generator.placeholders.type')}
          value={formState.type}
        />
      </Field>

      <Field label={t('generator.fields.value')} htmlFor="barcode-value">
        <Textarea
          id="barcode-value"
          placeholder={t('generator.placeholders.value')}
          onChange={(event) => updateField('value', event.target.value)}
          value={formState.value}
        />
      </Field>

      <Field label={t('generator.fields.displayValue')} htmlFor="barcode-display-value">
        <TextInput
          id="barcode-display-value"
          onChange={(event) => updateField('displayValue', event.target.value)}
          value={formState.displayValue || ''}
        />
      </Field>

      <div className={styles.toggles}>
        {updateShowPreviewFrame && (
          <label className={styles.checkboxToggle}>
            <input
              checked={Boolean(showPreviewFrame)}
              className={styles.checkboxInput}
              onChange={(event) => updateShowPreviewFrame(event.target.checked)}
              type="checkbox"
            />
            <span aria-hidden="true" className={styles.checkboxControl}>
              <span className={styles.checkboxMark} />
            </span>
            <span className={styles.checkboxLabel}>{t('generator.previewFrameToggle')}</span>
          </label>
        )}

        <label className={styles.checkboxToggle}>
          <input
            checked={formState.showText}
            className={styles.checkboxInput}
            onChange={(event) => updateField('showText', event.target.checked)}
            type="checkbox"
          />
          <span aria-hidden="true" className={styles.checkboxControl}>
            <span className={styles.checkboxMark} />
          </span>
          <span className={styles.checkboxLabel}>{t('generator.fields.text')}</span>
        </label>

        <label className={styles.checkboxToggle}>
          <input
            checked={Boolean(formState.transparentBackground)}
            className={styles.checkboxInput}
            onChange={(event) =>
              updateField('transparentBackground', event.target.checked)
            }
            type="checkbox"
          />
          <span aria-hidden="true" className={styles.checkboxControl}>
            <span className={styles.checkboxMark} />
          </span>
          <span className={styles.checkboxLabel}>{transparentBackgroundLabel}</span>
        </label>
      </div>

      <section
        className={clsx(
          styles.textEditorCard,
          !formState.showText && styles.textEditorCardDisabled,
        )}
      >
        <div className={styles.textEditorHeader}>
          <Type aria-hidden="true" className={styles.textEditorBadge} size={16} />
          <div className={styles.textEditorCopy}>
            <h3 className={styles.textEditorTitle}>{t('generator.textEditor.title')}</h3>
            <p className={styles.textEditorDescription}>
              {t('generator.textEditor.description')}
            </p>
          </div>
        </div>

        <div className={styles.textEditorGrid}>
          <div className={styles.editorBlock}>
            <span className={styles.editorLabel}>{t('generator.fields.textStyle')}</span>
            <div className={styles.iconToggleGroup}>
              <button
                aria-label={t('generator.textEditor.bold')}
                aria-pressed={textBold}
                className={clsx(styles.iconToggle, textBold && styles.iconToggleActive)}
                disabled={!formState.showText}
                id="barcode-text-bold"
                onClick={() => updateField('textBold', !textBold)}
                title={t('generator.textEditor.bold')}
                type="button"
              >
                <Bold size={16} />
              </button>

              <button
                aria-label={t('generator.textEditor.italic')}
                aria-pressed={textItalic}
                className={clsx(styles.iconToggle, textItalic && styles.iconToggleActive)}
                disabled={!formState.showText}
                id="barcode-text-italic"
                onClick={() => updateField('textItalic', !textItalic)}
                title={t('generator.textEditor.italic')}
                type="button"
              >
                <Italic size={16} />
              </button>
            </div>
          </div>

          <div className={styles.editorBlock}>
            <span className={styles.editorLabel}>{t('generator.fields.textPosition')}</span>
            <div className={styles.iconToggleGroup}>
              {TEXT_POSITION_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
                <button
                  key={value}
                  aria-label={t(labelKey)}
                  aria-pressed={textPosition === value}
                  className={clsx(
                    styles.iconToggle,
                    textPosition === value && styles.iconToggleActive,
                  )}
                  disabled={!formState.showText}
                  onClick={() => updateField('textPosition', value)}
                  title={t(labelKey)}
                  type="button"
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>

          <div className={styles.rotationBlock}>
            <Slider
              disabled={!formState.showText}
              id="barcode-text-rotation"
              label={t('generator.fields.textRotation')}
              max={MAX_TEXT_ROTATION}
              min={0}
              onChange={(event) =>
                updateField(
                  'textRotation',
                  toNumber(event.target.value, textRotation, 0, MAX_TEXT_ROTATION),
                )
              }
              step={TEXT_ROTATION_STEP}
              suffix={'\u00B0'}
              value={textRotation}
            />
          </div>
        </div>
      </section>

      <div className={styles.fieldGrid}>
        <Field label={t('generator.fields.rotation')} htmlFor="barcode-rotation">
          <SelectInput
            id="barcode-rotation"
            onChange={(event) =>
              updateField(
                'rotation',
                Number.parseInt(event.target.value, 10) as BarcodeRotation,
              )
            }
            value={formState.rotation}
          >
            <option value="0">{`0\u00B0`}</option>
            <option value="90">{`90\u00B0`}</option>
            <option value="180">{`180\u00B0`}</option>
            <option value="270">{`270\u00B0`}</option>
          </SelectInput>
        </Field>

        <Slider
          id="barcode-scale"
          label={t('generator.fields.scale')}
          max={MAX_BARCODE_SCALE}
          min={0.5}
          onChange={(event) =>
            updateField(
              'scale',
              toNumber(event.target.value, formState.scale, 0.5, MAX_BARCODE_SCALE),
            )
          }
          step={0.25}
          suffix="x"
          value={formState.scale}
        />
      </div>

      <div className={styles.fieldGrid}>
        <Field label={t('generator.fields.barColor')} htmlFor="barcode-color">
          <TextInput
            id="barcode-color"
            onChange={(event) => updateField('barColor', event.target.value)}
            type="color"
            value={formState.barColor}
          />
        </Field>

        <Field label={t('generator.fields.backgroundColor')} htmlFor="barcode-background">
          <TextInput
            id="barcode-background"
            onChange={(event) => updateField('backgroundColor', event.target.value)}
            type="color"
            value={formState.backgroundColor}
          />
        </Field>
      </div>

      <div className={styles.fieldGrid}>
        <Slider
          id="barcode-height"
          label={t('generator.fields.height')}
          max={MAX_BARCODE_HEIGHT}
          min={1}
          onChange={(event) =>
            updateField(
              'height',
              toNumber(event.target.value, formState.height, 1, MAX_BARCODE_HEIGHT),
            )
          }
          step={1}
          suffix="px"
          value={formState.height}
        />

        <Slider
          id="barcode-margin"
          label={t('generator.fields.margin')}
          max={MAX_BARCODE_MARGIN}
          min={0}
          onChange={(event) =>
            updateField(
              'margin',
              toNumber(event.target.value, formState.margin, 0, MAX_BARCODE_MARGIN),
            )
          }
          step={1}
          suffix="px"
          value={formState.margin}
        />
      </div>

      <div className={styles.fieldGrid}>
        <Slider
          id="barcode-bar-width"
          label={t('generator.fields.barWidth')}
          max={MAX_BARCODE_BAR_WIDTH}
          min={1}
          onChange={(event) =>
            updateField(
              'barWidth',
              toNumber(event.target.value, formState.barWidth, 1, MAX_BARCODE_BAR_WIDTH),
            )
          }
          step={1}
          value={formState.barWidth}
        />

        <Slider
          id="barcode-font-size"
          label={t('generator.fields.fontSize')}
          max={MAX_BARCODE_FONT_SIZE}
          min={8}
          onChange={(event) =>
            updateField(
              'fontSize',
              toNumber(event.target.value, formState.fontSize, 8, MAX_BARCODE_FONT_SIZE),
            )
          }
          step={1}
          suffix="px"
          value={formState.fontSize}
        />
      </div>
    </div>
  )
}
