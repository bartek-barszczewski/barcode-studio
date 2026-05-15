import { useTranslation } from 'react-i18next'
import { BARCODE_TYPE_OPTIONS } from '../../constants/barcodeTypes'
import type { BarcodeFormState, BarcodeRotation, BarcodeType } from '../../types/barcode'
import { Field } from '../../../../shared/ui/Field/Field'
import { SearchableSelect } from '../../../../shared/ui/SearchableSelect/SearchableSelect'
import { SelectInput } from '../../../../shared/ui/SelectInput/SelectInput'
import { TextInput } from '../../../../shared/ui/TextInput/TextInput'
import { Textarea } from '../../../../shared/ui/Textarea/Textarea'
import { toNumber } from '../../../../shared/utils/number'
import styles from './BarcodeForm.module.css'

const MAX_BARCODE_SCALE = 2.5

export type BarcodeFormProps = {
  formState: BarcodeFormState
  updateField: <Key extends keyof BarcodeFormState>(
    key: Key,
    value: BarcodeFormState[Key],
  ) => void
}

export function BarcodeForm({ formState, updateField }: BarcodeFormProps) {
  const { t } = useTranslation()

  const barcodeTypeOptions = BARCODE_TYPE_OPTIONS.map((option) => ({
    ...option,
    label: t(`barcode.types.${option.value}`),
  }))

  return (
    <div className={styles.form}>
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
            <option value="0">0°</option>
            <option value="90">90°</option>
            <option value="180">180°</option>
            <option value="270">270°</option>
          </SelectInput>
        </Field>

        <Field label={t('generator.fields.scale')} htmlFor="barcode-scale">
          <TextInput
            id="barcode-scale"
            max={MAX_BARCODE_SCALE}
            min={0.5}
            onChange={(event) =>
              updateField(
                'scale',
                toNumber(
                  event.target.value,
                  formState.scale,
                  0.5,
                  MAX_BARCODE_SCALE,
                ),
              )
            }
            step={0.25}
            type="number"
            value={formState.scale}
          />
        </Field>
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

        <Field
          label={t('generator.fields.backgroundColor')}
          htmlFor="barcode-background"
        >
          <TextInput
            id="barcode-background"
            onChange={(event) =>
              updateField('backgroundColor', event.target.value)
            }
            type="color"
            value={formState.backgroundColor}
          />
        </Field>
      </div>

      <div className={styles.fieldGrid}>
        <Field label={t('generator.fields.height')} htmlFor="barcode-height">
          <div className={styles.unitInput}>
            <TextInput
              id="barcode-height"
              inputMode="numeric"
              min={1}
              onChange={(event) =>
                updateField(
                  'height',
                  toNumber(event.target.value, formState.height, 1),
                )
              }
              type="number"
              value={formState.height}
            />
            <span>px</span>
          </div>
        </Field>

        <Field label={t('generator.fields.margin')} htmlFor="barcode-margin">
          <div className={styles.unitInput}>
            <TextInput
              id="barcode-margin"
              inputMode="numeric"
              min={0}
              onChange={(event) =>
                updateField(
                  'margin',
                  toNumber(event.target.value, formState.margin),
                )
              }
              type="number"
              value={formState.margin}
            />
            <span>px</span>
          </div>
        </Field>
      </div>

      <div className={styles.fieldGrid}>
        <Field label={t('generator.fields.barWidth')} htmlFor="barcode-bar-width">
          <TextInput
            id="barcode-bar-width"
            max={6}
            min={1}
            onChange={(event) =>
              updateField(
                'barWidth',
                toNumber(event.target.value, formState.barWidth, 1, 6),
              )
            }
            step={1}
            type="number"
            value={formState.barWidth}
          />
        </Field>

        <Field label={t('generator.fields.fontSize')} htmlFor="barcode-font-size">
          <div className={styles.unitInput}>
            <TextInput
              id="barcode-font-size"
              max={128}
              min={8}
              onChange={(event) =>
                updateField(
                  'fontSize',
                  toNumber(event.target.value, formState.fontSize, 8, 128),
                )
              }
              step={1}
              type="number"
              value={formState.fontSize}
            />
            <span>px</span>
          </div>
        </Field>
      </div>

      <Field label={t('generator.fields.text')} htmlFor="barcode-text">
        <SelectInput
          id="barcode-text"
          onChange={(event) =>
            updateField('showText', event.target.value === 'show')
          }
          value={formState.showText ? 'show' : 'hide'}
        >
          <option value="show">{t('generator.textOptions.show')}</option>
          <option value="hide">{t('generator.textOptions.hide')}</option>
        </SelectInput>
      </Field>
    </div>
  )
}
