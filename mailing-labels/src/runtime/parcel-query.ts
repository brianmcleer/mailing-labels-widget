/** Only query fields actually present in the configured parcel layer. */
export const isParcelSearchField = (field: any): boolean =>
    ['string', 'oid', 'small-integer', 'integer', 'big-integer', 'single', 'double', 'guid', 'global-id'].includes(field?.type)

export function parcelWhere(layer: any, fieldName: string, value: string): string {
    const field = layer.fields?.find((item: any) => item.name === fieldName)
    if (!isParcelSearchField(field) || !/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(fieldName)) throw new Error('parcelSearchConfiguration')
    const text = value.trim()
    if (!text) throw new Error('parcelSearchValueRequired')
    if (['string', 'guid', 'global-id'].includes(field.type)) {
        return `${field.name} = '${text.replace(/'/g, "''")}'`
    }
    // Keep integer identifiers as text to avoid rounding 64-bit parcel IDs.
    const integer = ['oid', 'small-integer', 'integer', 'big-integer'].includes(field.type)
    if (!(integer ? /^[+-]?\d+$/ : /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/).test(text) || !Number.isFinite(Number(text))) {
        throw new Error('parcelSearchNumericValue')
    }
    return `${field.name} = ${text}`
}
