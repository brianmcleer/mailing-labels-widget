import { React } from 'jimu-core'
import { Button, TextInput } from 'jimu-ui'
import { useTokens } from '../theme'

/** One selected record as the Review list shows it. Built by widget.tsx from the active field mapping. */
export interface ReviewRow {
    /** Object ID on the active layer; the exclusion key. */
    key: string
    /** Value of the optional ID field (for example the parcel PID); '' when none is set. */
    idValue: string
    /** Name and address lines, as they will print. */
    lines: string[]
    /** Removed by the user: left out of PDF, Print and CSV. */
    isOut: boolean
}

interface Props {
    /** Already in export (Sort) order. */
    rows: ReviewRow[]
    filter: string
    onFilterChange: (value: string) => void
    onToggle: (key: string) => void
    onRestoreAll: () => void
    /** An export is running: hold the list still. */
    busy: boolean
    t: (id: string, values?: any) => string
}

/** Rows rendered at once; the filter finds the rest. Keeps very large selections responsive. */
export const REVIEW_ROW_CAP = 300
/** A filter box appears above this many records. */
export const REVIEW_FILTER_AT = 8

/**
 * Review list: every selected record with its ID, name and address, and a Remove/Restore
 * button per row so users can leave records out before export. Presentation only: the
 * widget owns the exclusions and applies them to PDF, Print, CSV and the preview.
 * Function component so it can read theme tokens (WIDGETHANDOFF 11.2) and use jimu-ui
 * controls (11.1).
 */
export default function ReviewList (props: Props) {
    const { rows, filter, busy, t } = props
    const tokens = useTokens()

    const excludedCount = rows.filter(row => row.isOut).length
    const needle = filter.trim().toLowerCase()
    const visible = needle
        ? rows.filter(row => [row.idValue, ...row.lines].join(' ').toLowerCase().includes(needle))
        : rows
    const shown = visible.slice(0, REVIEW_ROW_CAP)

    return <section aria-label={t('reviewListTitle')} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: tokens.text }}>

        {/* Two rows, never one (11.3): the count, then its action. */}
        <div>{t('reviewIncludedCount', { included: rows.length - excludedCount, total: rows.length })}</div>
        {excludedCount > 0 && <div>
            <Button size="sm" type="tertiary" disabled={busy} onClick={props.onRestoreAll}>{t('reviewRestoreAll')}</Button>
        </div>}

        {rows.length > REVIEW_FILTER_AT && <TextInput size="sm" type="text" allowClear value={filter}
            placeholder={t('reviewFilterPlaceholder')} aria-label={t('reviewFilterPlaceholder')}
            onChange={(event: any) => props.onFilterChange(event.target.value)} />}

        {shown.length === 0
            ? <p style={{ margin: 0, color: tokens.textSecondary }}>{t('reviewNoMatches')}</p>
            : <ul aria-label={t('reviewListTitle')} style={{ listStyle: 'none', margin: 0, padding: '0 8px', maxHeight: 220, overflowY: 'auto', border: `1px solid ${tokens.divider}`, borderRadius: tokens.radius, background: tokens.surface }}>
                {shown.map((row, index) => {
                    const heading = [row.idValue, row.lines[0]].filter(Boolean).join(' · ') || t('reviewNoMailingData')
                    const rest = row.lines.slice(1).join(', ')
                    const name = row.idValue || row.lines[0] || row.key
                    return <li key={row.key || `row-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: index === 0 ? 'none' : `1px solid ${tokens.divider}` }}>
                        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.35, color: row.isOut ? tokens.textSecondary : tokens.text, textDecoration: row.isOut ? 'line-through' : 'none' }}>
                            <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{heading}</div>
                            {rest && <div style={{ color: tokens.textSecondary, overflowWrap: 'anywhere' }}>{rest}</div>}
                        </div>
                        <Button size="sm" type={row.isOut ? 'default' : 'tertiary'} disabled={busy || !row.key}
                            aria-pressed={row.isOut}
                            aria-label={row.isOut ? t('reviewRestoreNamed', { label: name }) : t('reviewRemoveNamed', { label: name })}
                            onClick={() => props.onToggle(row.key)}>
                            {row.isOut ? t('reviewRestore') : t('reviewRemove')}
                        </Button>
                    </li>
                })}
            </ul>}

        {visible.length > REVIEW_ROW_CAP && <p style={{ margin: 0, fontSize: 11, color: tokens.textSecondary }}>
            {t('reviewRowCap', { shown: REVIEW_ROW_CAP, total: visible.length })}
        </p>}
    </section>
}
