import { React } from 'jimu-core'
import { Select, Option, Switch, TextInput } from 'jimu-ui'
import { SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
import { isParcelSearchField } from '../runtime/parcel-query'
import { inheritedParcelLayerId } from '../runtime/parcel-selection'

export default function ParcelSearchSettings({ config, layers, onChange, t }: any) {
    const [fields, setFields] = React.useState<any[]>([])
    const [error, setError] = React.useState(false)
    const layerId = inheritedParcelLayerId(config)
    React.useEffect(() => {
        let current = true
        setFields([]); setError(false)
        const layer = layers.find((item: any) => item.id === layerId)?.layer
        if (layer) {
            layer.load().then(() => {
                if (!current) return
                if (layer.geometryType !== 'polygon') { setError(true); return }
                setFields(layer.fields.filter(isParcelSearchField))
            }).catch(() => { if (current) setError(true) })
        } else if (layerId) setError(true)
        return () => { current = false }
    }, [layers, layerId])
    return <SettingSection title={t('parcelSelectionSettingsTitle')}>
        <SettingRow tag="label" label={t('parcelSelectionEnable')}>
            <Switch checked={config.enableParcelSearch === true} aria-label={t('parcelSelectionEnable')}
                onChange={(_event: any, checked: boolean) => onChange({ enableParcelSearch: checked })} />
        </SettingRow>
        {config.enableParcelSearch === true && <>
            <SettingRow><p className="ml-desc">{t('parcelOwnerOnlySettingsHelp')}</p></SettingRow>
            <SettingRow flow="wrap" label={t('parcelSearchLayerSource')}>
                <Select size="sm" className="ml-control" value={config.parcelSearchLayer === 'physical' ? 'physical' : 'owner'} aria-label={t('parcelSearchLayerSource')}
                    onChange={(event: any) => onChange({ parcelSearchLayer: event.target.value, parcelSearchField: '' })}>
                    <Option value="owner">{t('parcelLayerOwner')}</Option>
                    <Option value="physical">{t('parcelLayerPhysical')}</Option>
                </Select>
            </SettingRow>
            <SettingRow><p className="ml-desc">{t('parcelInheritedLayer', { layer: layers.find((item: any) => item.id === layerId)?.title || t('uiNone') })}</p></SettingRow>
            <SettingRow flow="wrap" label={t('parcelSearchField')}>
                <Select size="sm" className="ml-control" value={config.parcelSearchField || ''} aria-label={t('parcelSearchField')}
                    onChange={(event: any) => onChange({ parcelSearchField: event.target.value })}>
                    <Option value="">{t('uiNone')}</Option>
                    {fields.map(field => <Option key={field.name} value={field.name}>{field.alias || field.name}</Option>)}
                </Select>
            </SettingRow>
            {!!config.parcelSearchField && <SettingRow flow="wrap" label={t('parcelSearchFieldAlias')}>
                <TextInput size="sm" className="ml-control" value={config.parcelSearchFieldAlias || ''} aria-label={t('parcelSearchFieldAlias')}
                    placeholder={fields.find(field => field.name === config.parcelSearchField)?.alias || config.parcelSearchField}
                    onChange={(event: any) => onChange({ parcelSearchFieldAlias: event.target.value })} />
            </SettingRow>}
            {!!config.parcelSearchField && <SettingRow><p className="ml-desc">{t('parcelSearchFieldAliasHelp')}</p></SettingRow>}
            <SettingRow><p className="ml-desc">{t('parcelInheritedSettingsHelp')}</p></SettingRow>
            {(error || !layerId) && <SettingRow><p role="alert">{t('parcelInheritedLayerError')}</p></SettingRow>}
        </>}
    </SettingSection>
}
