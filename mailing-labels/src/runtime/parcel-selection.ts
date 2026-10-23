export interface SelectedParcel {
    id: string
    objectId: number | string
    label: string
    geometry: any
}

/** The configured address layer that holds the parcel polygons (parcelSearchLayer, default owner),
 *  falling back to the other address layer when the chosen one is not set. */
export function inheritedParcelLayerId(config: any): string {
    return config?.parcelSearchLayer === 'physical'
        ? config?.selectedLayerId || config?.ownerLayerId || ''
        : config?.ownerLayerId || config?.selectedLayerId || ''
}

/** Fetch full boundaries in the map's spatial reference, never display-generalized geometry. */
export async function queryParcelGeometry(layer: any, objectId: number | string, spatialReference: any): Promise<any> {
    const query = layer.createQuery()
    query.objectIds = [objectId]
    query.returnGeometry = true
    query.outFields = [layer.objectIdField]
    query.outSpatialReference = spatialReference
    const result = await layer.queryFeatures(query)
    const geometry = result.features[0]?.geometry
    if (geometry?.type !== 'polygon') throw new Error('parcelSearchNoGeometry')
    return geometry
}

export function combinedParcelGeometry(parcels: SelectedParcel[], union: (geometries: any[]) => any): any {
    if (!parcels.length) throw new Error('parcelSearchNoGeometry')
    const geometry = parcels.length === 1 ? parcels[0].geometry : union(parcels.map(parcel => parcel.geometry))
    if (geometry?.type !== 'polygon') throw new Error('parcelSearchNoGeometry')
    return geometry
}
