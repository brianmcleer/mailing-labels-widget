import { React } from 'jimu-core'
import { Button, TextInput, Select, Option } from 'jimu-ui'
import { useTokens } from '../theme'
import { parcelWhere } from '../parcel-query'
import { queryParcelGeometry, combinedParcelGeometry, SelectedParcel } from '../parcel-selection'
// @ts-ignore -- Experience Builder resolves the Maps SDK runtime module.
import Graphic from 'esri/Graphic'
// @ts-ignore -- Experience Builder resolves the Maps SDK runtime module.
import GraphicsLayer from 'esri/layers/GraphicsLayer'
// @ts-ignore -- Experience Builder resolves the Maps SDK runtime module.
import geometryEngine from 'esri/geometry/geometryEngine'

interface Props {
    active?: boolean
    addressType?: string
    view: any
    layerId: string
    fieldName: string
    /** Developer-set label for the search box; empty falls back to "{field} value". */
    fieldLabel?: string
    bufferDistance: number
    bufferUnit: string
    onBufferChange: (distance: number, unit: string) => void
    onPickingChange: (active: boolean) => void
    onSelectionChange: () => void
    onApply: (geometry: any, isCurrent: () => boolean) => Promise<void>
    t: (id: string, values?: any) => string
}

/** Map picks and attribute matches share one source-parcel collection. */
export default function ParcelSearch(props: Props) {
    const { view, layerId, fieldName, t } = props
    const searchLabel = (props.fieldLabel || '').trim() || t('parcelSearchValue', { field: fieldName })
    const tokens = useTokens()
    const [value, setValue] = React.useState('')
    const [matches, setMatches] = React.useState<any[]>([])
    const [chosen, setChosen] = React.useState('')
    const [busy, setBusy] = React.useState(false)
    const [applying, setApplying] = React.useState(false)
    const [picking, setPicking] = React.useState(false)
    const [pendingPicks, setPendingPicks] = React.useState(0)
    const [parcels, setParcels] = React.useState<SelectedParcel[]>([])
    const [message, setMessage] = React.useState('')
    const selected = React.useRef<SelectedParcel[]>([])
    const request = React.useRef(0)
    const pickEpoch = React.useRef(0)
    const selectionVersion = React.useRef(0)
    const previewLayer = React.useRef<any>(null)
    const lastBuffer = React.useRef([props.bufferDistance, props.bufferUnit])
    const lastAddressType = React.useRef(props.addressType)
    const combined = () => combinedParcelGeometry(selected.current, geometries => geometryEngine.union(geometries))
    const stopPicking = () => { pickEpoch.current++; setPicking(false) }

    React.useEffect(() => {
        if (props.active === false) stopPicking()
    }, [props.active])
    React.useEffect(() => {
        const overlay = new GraphicsLayer({ listMode: 'hide' })
        view.map.add(overlay)
        previewLayer.current = overlay
        return () => {
            request.current++; selectionVersion.current++
            previewLayer.current = null
            view.map.remove(overlay); overlay.destroy()
        }
    }, [view])
    React.useEffect(() => {
        if (lastAddressType.current !== props.addressType) {
            lastAddressType.current = props.addressType
            selectionVersion.current++
            stopPicking()
            props.onSelectionChange()
        }
    }, [props.addressType])
    React.useEffect(() => {
        if (lastBuffer.current[0] !== props.bufferDistance || lastBuffer.current[1] !== props.bufferUnit) {
            lastBuffer.current = [props.bufferDistance, props.bufferUnit]
            selectionVersion.current++
            props.onSelectionChange()
        }
    }, [props.bufferDistance, props.bufferUnit])

    const updateParcels = (next: SelectedParcel[]) => {
        selected.current = next; selectionVersion.current++; setParcels(next)
        previewLayer.current?.removeAll()
        next.forEach(parcel => previewLayer.current?.add(new Graphic({
            geometry: parcel.geometry,
            symbol: { type: 'simple-fill', style: 'none', outline: { color: tokens.primary, width: 3 } }
        })))
        // Labels must never remain exportable for an earlier parcel set or buffer.
        props.onSelectionChange()
    }
    const addParcel = (parcel: SelectedParcel) => {
        if (selected.current.some(item => item.id === parcel.id)) { setMessage('parcelAlreadySelected'); return }
        if (selected.current.length >= 100) { setMessage('parcelSelectionLimit'); return }
        updateParcels([...selected.current, parcel]); setMessage('parcelAdded')
    }
    const zoomToParcels = async () => {
        if (!selected.current.length) return
        try {
            const geometry = combined()
            await view.goTo(geometry.extent?.expand(1.3) || geometry, { duration: 600 })
        } catch { /* Interrupted navigation must not prevent selection or buffering. */ }
    }
    React.useEffect(() => {
        if (!picking || props.active === false) return
        let current = true
        const epoch = pickEpoch.current
        const isCurrent = () => current && epoch === pickEpoch.current
        let queue = Promise.resolve()
        const oldCursor = view.container?.style.cursor
        const oldPopups = view.popupEnabled
        props.onPickingChange(true)
        if (view.container) view.container.style.cursor = 'crosshair'
        view.popupEnabled = false
        const handle = view.on('click', (event: any) => {
            event.stopPropagation()
            if (!event.mapPoint || !isCurrent()) return
            const point = event.mapPoint.clone ? event.mapPoint.clone() : event.mapPoint
            setPendingPicks(count => count + 1)
            // Serialize clicks so a slow service cannot drop the user's earlier picks.
            queue = queue.then(async () => {
                if (!isCurrent()) return
                try {
                    const layer = view.map.findLayerById(layerId)
                    await layer.load()
                    if (!isCurrent()) return
                    if (layer.geometryType !== 'polygon') throw new Error('parcelSearchConfiguration')
                    const query = layer.createQuery()
                    query.geometry = point; query.spatialRelationship = 'intersects'
                    query.returnGeometry = true; query.outSpatialReference = view.spatialReference
                    query.outFields = fieldName ? [layer.objectIdField, fieldName] : [layer.objectIdField]; query.num = 1
                    const result = await layer.queryFeatures(query)
                    if (!isCurrent()) return
                    const feature = result.features[0]
                    if (!feature) { setMessage('parcelPickNoMatch'); return }
                    if (feature.geometry?.type !== 'polygon') throw new Error('parcelSearchNoGeometry')
                    addParcel({ id: String(feature.attributes[layer.objectIdField]), objectId: feature.attributes[layer.objectIdField],
                        label: String(feature.attributes[fieldName] ?? feature.attributes[layer.objectIdField]), geometry: feature.geometry })
                    // Do not move the map while picking: keep the next parcel under the pointer.
                } catch { if (isCurrent()) setMessage('parcelSearchFailed') }
                finally { if (isCurrent()) setPendingPicks(count => count - 1) }
            })
        })
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') stopPicking() }
        document.addEventListener('keydown', escape)
        return () => {
            current = false; handle.remove(); document.removeEventListener('keydown', escape)
            if (view.container) view.container.style.cursor = oldCursor || ''
            view.popupEnabled = oldPopups
            setPendingPicks(0); props.onPickingChange(false)
        }
    }, [picking, props.active, view, layerId, fieldName])

    const choose = async (id: string, rows = matches) => {
        const generation = ++request.current
        setChosen(id); setMessage('')
        const match = rows.find(item => item.id === id)
        if (!match) return
        setBusy(true)
        try {
            const geometry = await queryParcelGeometry(view.map.findLayerById(layerId), match.objectId, view.spatialReference)
            if (generation !== request.current) return
            addParcel({ ...match, geometry }); await zoomToParcels()
        } catch (error) {
            if (generation === request.current) setMessage(error.message === 'parcelSearchNoGeometry' ? error.message : 'parcelSearchFailed')
        } finally { if (generation === request.current) setBusy(false) }
    }
    const lookup = async () => {
        const id = ++request.current
        setBusy(true); setMessage(''); setMatches([]); setChosen('')
        try {
            const layer = view?.map.findLayerById(layerId)
            if (!layer || layer.type !== 'feature') throw new Error('parcelSearchConfiguration')
            await layer.load()
            if (layer.geometryType !== 'polygon') throw new Error('parcelSearchConfiguration')
            const query = layer.createQuery()
            const where = parcelWhere(layer, fieldName, value)
            query.where = query.where ? `(${query.where}) AND (${where})` : where
            query.outFields = [layer.objectIdField, fieldName]; query.returnGeometry = false; query.num = 51
            const result = await layer.queryFeatures(query)
            if (id !== request.current) return
            const rows = result.features.slice(0, 50).map((feature: any) => ({
                id: String(feature.attributes[layer.objectIdField]), objectId: feature.attributes[layer.objectIdField], label: String(feature.attributes[fieldName])
            }))
            setMatches(rows)
            setMessage(!rows.length ? 'parcelSearchNoMatches' : result.exceededTransferLimit || result.features.length > 50 ? 'parcelSearchMoreMatches' : 'parcelSearchChoose')
            if (rows.length === 1) await choose(rows[0].id, rows)
        } catch (error) {
            if (id === request.current) setMessage(['parcelSearchConfiguration', 'parcelSearchValueRequired', 'parcelSearchNumericValue'].includes(error.message) ? error.message : 'parcelSearchFailed')
        } finally { if (id === request.current) setBusy(false) }
    }
    const apply = async () => {
        if (!selected.current.length || busy || applying || pendingPicks) return
        stopPicking()
        const version = selectionVersion.current
        setApplying(true); setMessage('')
        try { await props.onApply(combined(), () => version === selectionVersion.current) }
        catch { setMessage('parcelSearchFailed') }
        finally { setApplying(false) }
    }
    const clear = () => {
        request.current++; stopPicking(); setBusy(false); setMatches([]); setChosen(''); setMessage('')
        updateParcels([])
    }
    const validBuffer = Number.isFinite(props.bufferDistance) && props.bufferDistance >= 0
    const blocked = busy || applying || pendingPicks > 0
    // Visual language matches the widget's cards: 12px body, small uppercase group labels,
    // one idea per block, the primary action last. Every color is a theme token.
    const groupLabel: any = { margin: 0, fontSize: 10.5, fontWeight: 600, color: tokens.textSecondary, letterSpacing: '0.04em', textTransform: 'uppercase' }
    const group: any = { display: 'flex', flexDirection: 'column', gap: 6 }
    const countBadge: any = {
        display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999,
        fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
        background: parcels.length ? tokens.infoBg : tokens.background,
        color: parcels.length ? tokens.primary : tokens.textSecondary,
        border: `1px solid ${tokens.divider}`
    }
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12, color: tokens.text }} aria-busy={blocked}>

        {/* 1. Pick on the map */}
        <div style={group}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button size="sm" type={picking ? 'primary' : 'default'} aria-pressed={picking} disabled={busy || applying}
                    onClick={() => picking ? stopPicking() : setPicking(true)}>{t(picking ? 'parcelStopPicking' : 'parcelPickOnMap')}</Button>
                <span style={countBadge}>{t('parcelSelectedCount', { count: parcels.length })}</span>
            </div>
            {picking && <p style={{ margin: 0, fontSize: 11, lineHeight: 1.4, color: tokens.textSecondary }}>{t('parcelPickingHint')}</p>}
        </div>

        {/* 2. Find by attribute */}
        {!!fieldName && <div style={group}>
            <p style={groupLabel}>{searchLabel}</p>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <TextInput size="sm" value={value} disabled={applying || picking} aria-label={searchLabel}
                        onChange={(event: any) => { request.current++; setBusy(false); setMatches([]); setChosen(''); setMessage(''); setValue(event.target.value) }}
                        onKeyDown={(event: any) => { if (event.key === 'Enter' && value.trim() && !blocked && !picking) { event.preventDefault(); void lookup() } }} />
                </div>
                <Button size="sm" disabled={blocked || picking || !value.trim()} onClick={lookup}>{t('parcelSearchFind')}</Button>
            </div>
            {!!matches.length && <Select size="sm" value={chosen} disabled={blocked || picking} aria-label={t('parcelSearchMatch')}
                onChange={(event: any) => choose(event.target.value)}>
                <Option value="">{t('parcelSearchChoose')}</Option>
                {matches.map(match => <Option key={match.id} value={match.id}>{match.label}</Option>)}
            </Select>}
        </div>}

        {/* 3. What is selected */}
        {!!parcels.length && <div style={group}>
            <p style={groupLabel}>{t('parcelSelectedList')}</p>
            <ul aria-label={t('parcelSelectedList')} style={{ listStyle: 'none', margin: 0, padding: '2px 8px', maxHeight: 108, overflowY: 'auto', border: `1px solid ${tokens.divider}`, borderRadius: tokens.radius, background: tokens.surface }}>
                {parcels.map((parcel, index) => <li key={parcel.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', borderTop: index === 0 ? 'none' : `1px solid ${tokens.divider}` }}>
                    <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                        {parcel.label}
                    </span>
                    <Button size="sm" type="tertiary" disabled={blocked} aria-label={t('parcelRemoveNamed', { label: parcel.label })}
                        onClick={() => { updateParcels(selected.current.filter(item => item.id !== parcel.id)); setChosen('') }}>{t('parcelRemove')}</Button>
                </li>)}
            </ul>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Button size="sm" disabled={!parcels.length || blocked} onClick={zoomToParcels}>{t('parcelZoomSelected')}</Button>
                <Button size="sm" disabled={applying || (!parcels.length && !picking && !busy)} onClick={clear}>{t('parcelClearSelected')}</Button>
            </div>
        </div>}

        {/* 4. Buffer */}
        <div style={group}>
            <p style={groupLabel}>{t('bufferDistance')}</p>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ flex: '1 1 50%', minWidth: 0 }}>
                    <TextInput type="number" size="sm" min={0} value={String(props.bufferDistance)} disabled={blocked}
                        aria-label={t('bufferDistance')} onChange={(event: any) => props.onBufferChange(Number(event.target.value), props.bufferUnit)} />
                </div>
                <Select size="sm" style={{ flex: '1 1 50%', minWidth: 0 }} value={props.bufferUnit} disabled={blocked} aria-label={t('bufferDistanceUnit')}
                    onChange={(event: any) => props.onBufferChange(props.bufferDistance, event.target.value)}>
                    {['feet', 'meters', 'kilometers', 'miles'].map(unit => <Option key={unit} value={unit}>{t(`parcelUnit_${unit}`)}</Option>)}
                </Select>
            </div>
        </div>

        {/* 5. Apply, then status */}
        <Button size="sm" type="primary" style={{ width: '100%' }} title={t('parcelApplyHint')} disabled={blocked || !parcels.length || !validBuffer} onClick={apply}>{t('parcelApplySelected')}</Button>
        <div role="status" aria-live="polite" aria-atomic="true" style={{ fontSize: 11, lineHeight: 1.4, minHeight: 15, color: tokens.textSecondary }}>{blocked ? t('searching') : message ? t(message) : ''}</div>
    </div>
}
