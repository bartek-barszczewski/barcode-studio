import { useTranslation } from 'react-i18next'
import { X, Trash2, Copy } from 'lucide-react'
import type { BarcodeSetItem } from '../../types/barcodeSet'
import type { BarcodeType, BarcodeRotation } from '../../types/barcode'
import { BARCODE_TYPE_OPTIONS } from '../../constants/barcodeTypes'
import { Field } from '../../../../shared/ui/Field/Field'
import { TextInput } from '../../../../shared/ui/TextInput/TextInput'
import { SelectInput } from '../../../../shared/ui/SelectInput/SelectInput'
import { SearchableSelect } from '../../../../shared/ui/SearchableSelect/SearchableSelect'
import { Button } from '../../../../shared/ui/Button/Button'
import { toNumber } from '../../../../shared/utils/number'
import styles from './BarcodeSet.module.css'

interface BarcodeSetSettingsSidebarProps {
  item: BarcodeSetItem | null
  index: number
  isOpen: boolean
  onClose: () => void
  onUpdate: (id: string, updates: Partial<BarcodeSetItem>) => void
  onOptionsUpdate: (id: string, options: Partial<BarcodeSetItem['options']>) => void
  onRemove: (id: string) => void
}

export function BarcodeSetSettingsSidebar({
  item,
  index,
  isOpen,
  onClose,
  onUpdate,
  onOptionsUpdate,
  onRemove,
}: BarcodeSetSettingsSidebarProps) {
  const { t } = useTranslation()

  if (!item) return null

  const barcodeTypeOptions = BARCODE_TYPE_OPTIONS.map((option) => ({
    ...option,
    label: t(`barcode.types.${option.value}`),
  }))

  const handleRemove = () => {
    onRemove(item.id)
    onClose()
  }

  return (
    <>
      <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitleGroup}>
            <h2>{t('barcodeSet.sidebar.title')}</h2>
            <span className={styles.drawerSubtitle}>
              {t('barcodeSet.sidebar.editing', { index: index + 1 })}
            </span>
          </div>
          <button className={styles.closeDrawer} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.drawerContent}>
          <div className={styles.drawerActions}>
            <Button variant="ghost" onClick={handleRemove} className={styles.drawerDelete}>
              <Trash2 size={18} />
              {t('barcodeSet.actions.remove')}
            </Button>
          </div>

          <div className={styles.drawerSections}>
            <section className={styles.drawerSection}>
              <h3 className={styles.drawerSectionTitle}>{t('barcodeSet.sidebar.sections.data')}</h3>
              <Field label={t('generator.fields.value')} htmlFor="drawer-value">
                <TextInput
                  id="drawer-value"
                  value={item.value}
                  onChange={(e) => onUpdate(item.id, { value: e.target.value })}
                  placeholder={t('generator.placeholders.value')}
                />
              </Field>
            </section>

            <section className={styles.drawerSection}>
              <h3 className={styles.drawerSectionTitle}>{t('barcodeSet.sidebar.sections.barcode')}</h3>
              <Field label={t('generator.fields.type')} htmlFor="drawer-type">
                <SearchableSelect
                  id="drawer-type"
                  options={barcodeTypeOptions}
                  value={item.type}
                  onChange={(value) => onUpdate(item.id, { type: value as BarcodeType })}
                />
              </Field>
            </section>

            <section className={styles.drawerSection}>
              <h3 className={styles.drawerSectionTitle}>{t('barcodeSet.sidebar.sections.appearance')}</h3>
              <div className={styles.drawerFieldGrid}>
                <Field label={t('generator.fields.height')} htmlFor="drawer-height">
                  <div className={styles.unitInput}>
                    <TextInput
                      id="drawer-height"
                      type="number"
                      min={8}
                      value={item.options.height}
                      onChange={(e) => onOptionsUpdate(item.id, {
                        height: toNumber(e.target.value, item.options.height, 8),
                      })}
                    />
                    <span>px</span>
                  </div>
                </Field>
                <Field label={t('generator.fields.barWidth')} htmlFor="drawer-barWidth">
                  <TextInput
                    id="drawer-barWidth"
                    type="number"
                    min={1}
                    value={item.options.barWidth}
                    onChange={(e) => onOptionsUpdate(item.id, {
                      barWidth: toNumber(e.target.value, item.options.barWidth, 1),
                    })}
                  />
                </Field>
              </div>

              <div className={styles.drawerFieldGrid}>
                <Field label={t('generator.fields.scale')} htmlFor="drawer-scale">
                  <TextInput
                    id="drawer-scale"
                    type="number"
                    step={0.1}
                    min={0.5}
                    value={item.options.scale}
                    onChange={(e) => onOptionsUpdate(item.id, {
                      scale: toNumber(e.target.value, item.options.scale, 0.5),
                    })}
                  />
                </Field>
                <Field label={t('generator.fields.margin')} htmlFor="drawer-margin">
                  <div className={styles.unitInput}>
                    <TextInput
                      id="drawer-margin"
                      type="number"
                      min={0}
                      value={item.options.margin}
                      onChange={(e) => onOptionsUpdate(item.id, {
                        margin: toNumber(e.target.value, item.options.margin, 0),
                      })}
                    />
                    <span>px</span>
                  </div>
                </Field>
              </div>

              <Field label={t('generator.fields.rotation')} htmlFor="drawer-rotation">
                <SelectInput
                  id="drawer-rotation"
                  value={item.options.rotation}
                  onChange={(e) => onOptionsUpdate(item.id, {
                    rotation: Number.parseInt(e.target.value, 10) as BarcodeRotation,
                  })}
                >
                  <option value="0">0°</option>
                  <option value="90">90°</option>
                  <option value="180">180°</option>
                  <option value="270">270°</option>
                </SelectInput>
              </Field>

              <div className={styles.drawerFieldGrid}>
                <Field label={t('generator.fields.barColor')} htmlFor="drawer-foreground">
                  <TextInput
                    id="drawer-foreground"
                    type="color"
                    value={item.options.foreground}
                    onChange={(e) => onOptionsUpdate(item.id, { foreground: e.target.value })}
                  />
                </Field>
                <Field label={t('generator.fields.backgroundColor')} htmlFor="drawer-background">
                  <TextInput
                    id="drawer-background"
                    type="color"
                    value={item.options.background}
                    onChange={(e) => onOptionsUpdate(item.id, { background: e.target.value })}
                  />
                </Field>
              </div>
            </section>

            <section className={styles.drawerSection}>
              <h3 className={styles.drawerSectionTitle}>{t('barcodeSet.sidebar.sections.text')}</h3>
              <div className={styles.drawerFieldGrid}>
                <Field label={t('generator.fields.text')} htmlFor="drawer-textMode">
                  <SelectInput
                    id="drawer-textMode"
                    value={item.options.textMode}
                    onChange={(e) => onOptionsUpdate(item.id, {
                      textMode: e.target.value as 'hidden' | 'below',
                    })}
                  >
                    <option value="hidden">{t('generator.textOptions.hide')}</option>
                    <option value="below">{t('generator.textOptions.show')}</option>
                  </SelectInput>
                </Field>
                <Field label={t('generator.fields.fontSize')} htmlFor="drawer-fontSize">
                  <div className={styles.unitInput}>
                    <TextInput
                      id="drawer-fontSize"
                      type="number"
                      min={8}
                      value={item.options.fontSize}
                      onChange={(e) => onOptionsUpdate(item.id, {
                        fontSize: toNumber(e.target.value, item.options.fontSize, 8),
                      })}
                    />
                    <span>px</span>
                  </div>
                </Field>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
