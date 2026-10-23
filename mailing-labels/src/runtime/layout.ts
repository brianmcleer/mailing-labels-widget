/** Cards in the Find features group, in display order. */
export const SELECTION_ORDER = ['address-search-section', 'draw-section', 'parcel-search-section']

/** Parcel search only applies to owner mailing addresses, and needs a layer, a map view and an open widget. */
export function showParcelSelection(config: any, addressType: string, layerId: string, ready: boolean): boolean {
    return config?.enableParcelSearch === true && addressType === 'owner' && !!layerId && ready
}
