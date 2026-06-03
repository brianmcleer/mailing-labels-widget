import { AllWidgetSettingProps } from 'jimu-for-builder'
import { MapWidgetSelector, SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
import { TextInput, Label, Switch, Select, Option, NumericInput, Button } from 'jimu-ui'
import { React, Immutable, DataSourceManager, getAppStore } from 'jimu-core'
import { MapViewManager } from 'jimu-arcgis'

interface Config {
    useMapWidgetIds?: string[] | any // Allow both regular array and ImmutableArray
    selectedLayerId?: string
    ownerLayerId?: string // Separate layer for owner addresses
    selectionLayerId?: string
    selectedFields?: {
        name: string
        nameCustomText: string
        useCustomName: boolean
        address1: string
        address2: string
        city: string
        state: string
        zip: string
    }
    // Owner address fields (same structure as physical)
    ownerFields?: {
        name: string
        nameCustomText: string
        useCustomName: boolean
        address1: string
        address2: string
        city: string
        state: string
        zip: string
    }
    // Address type configuration
    enabledAddressTypes?: {
        physical?: boolean
        owner?: boolean
    }
    defaultAddressType?: 'physical' | 'owner'
    enableGeometrySelection?: boolean
    selectionMethod?: 'click' | 'draw' | 'both'
    enableDrawWidgetIntegration?: boolean
    geocodeUrl?: string
}

interface State {
    config: Config
    availableLayers: any[]
    availableFields: any[]
    ownerAvailableFields: any[] // Fields for owner layer
    selectedLayer: any
    ownerSelectedLayer: any // Selected owner layer
    isLoadingLayers: boolean
    layerLoadError: string | null
    geocodeTestStatus: 'idle' | 'testing' | 'ok' | 'error'
    geocodeTestMessage: string
}

export default class Setting extends React.PureComponent<AllWidgetSettingProps<Config>, State> {
    private mapViewManager: any

    constructor(props: AllWidgetSettingProps<Config>) {
        super(props)
        this.state = {
            config: props.config || {
                selectedFields: {
                    name: '',
                    nameCustomText: '',
                    useCustomName: false,
                    address1: '',
                    address2: '',
                    city: '',
                    state: '',
                    zip: ''
                },
                // Initialize owner address fields
                ownerFields: {
                    name: '',
                    nameCustomText: '',
                    useCustomName: false,
                    address1: '',
                    address2: '',
                    city: '',
                    state: '',
                    zip: ''
                },
                enabledAddressTypes: {
                    physical: true,
                    owner: true
                },
                defaultAddressType: 'physical',
                enableGeometrySelection: false,
                selectionMethod: 'click'
            },
            availableLayers: [],
            availableFields: [],
            ownerAvailableFields: [],
            selectedLayer: null,
            ownerSelectedLayer: null,
            isLoadingLayers: false,
            layerLoadError: null,
            geocodeTestStatus: 'idle',
            geocodeTestMessage: ''
        }
    }

    componentDidMount() {
        // Give maps more time to initialize when there are multiple maps
        setTimeout(() => {
            this.loadLayersFromMap()
        }, 2000) // First try after 2s

        setTimeout(() => {
            this.loadLayersFromMap()
        }, 5000) // Second try after 5s

        setTimeout(() => {
            this.loadLayersFromMap()
        }, 10000) // Third try after 10s
    }

    componentDidUpdate(prevProps: AllWidgetSettingProps<Config>) {
        if (prevProps.config?.useMapWidgetIds !== this.props.config?.useMapWidgetIds) {
            setTimeout(() => {
                this.loadLayersFromMap()
            }, 1000)
        }
    }

    waitForMapView = (mapWidgetId: string, timeout: number): Promise<any> => {
        return new Promise((resolve) => {
            const startTime = Date.now()
            let attempts = 0

            const checkMapView = () => {
                attempts++
                console.log(`Attempt ${attempts}: Checking for map view...`)

                // Check if we've exceeded timeout
                if (Date.now() - startTime > timeout) {
                    console.error('Timeout waiting for map view')
                    resolve(null)
                    return
                }

                // Try multiple approaches to get map view
                let jimuMapView = null

                // Approach 1: Direct from MapViewManager with exact ID
                try {
                    jimuMapView = MapViewManager.getInstance().getJimuMapViewById(mapWidgetId)
                    if (jimuMapView?.view?.ready) {
                        console.log('Found via MapViewManager with exact ID!')
                        resolve(jimuMapView)
                        return
                    }
                } catch (error) {
                    console.log('MapViewManager direct lookup error:', error)
                }

                // Approach 2: Check all available map views
                try {
                    const allMapViews = MapViewManager.getInstance().getAllJimuMapViews()
                    const availableMapViewIds = Object.keys(allMapViews)
                    console.log('All available map views:', availableMapViewIds)

                    // Try exact match first
                    if (allMapViews[mapWidgetId]) {
                        jimuMapView = allMapViews[mapWidgetId]
                        if (jimuMapView?.view?.ready) {
                            console.log('Found exact match in all map views!')
                            resolve(jimuMapView)
                            return
                        }
                    }

                    // Try to find a map view that's actually ready
                    for (const viewId of availableMapViewIds) {
                        const mapView = allMapViews[viewId]
                        if (mapView?.view?.ready) {
                            console.log(`Found ready map view: ${viewId}`)
                            jimuMapView = mapView

                            // If this matches our target ID, great!
                            if (viewId === mapWidgetId) {
                                console.log('This is our target map!')
                                resolve(jimuMapView)
                                return
                            }
                        }
                    }

                    // If we found a ready map view but it's not our target, 
                    // and we're past 10 seconds, use it anyway
                    if (jimuMapView && Date.now() - startTime > 10000) {
                        console.log('Using available ready map view after 10s wait')
                        resolve(jimuMapView)
                        return
                    }

                } catch (error) {
                    console.log('getAllJimuMapViews error:', error)
                }

                // Approach 3: From app store widgets state
                try {
                    const appState = getAppStore().getState()
                    const mapWidgetState = appState?.widgetsState?.[mapWidgetId]
                    if (mapWidgetState?.jimuMapView?.view?.ready) {
                        jimuMapView = mapWidgetState.jimuMapView
                        console.log('Found via app store!')
                        resolve(jimuMapView)
                        return
                    }
                } catch (error) {
                    console.log('App store error:', error)
                }

                // If we have a map view but it's not ready yet, keep waiting
                if (jimuMapView && !jimuMapView.view?.ready) {
                    console.log('Map view exists but not ready yet...')
                } else {
                    console.log('Still waiting for map view...')
                }

                // Check again after delay
                setTimeout(checkMapView, 2000) // Check every 2 seconds
            }

            checkMapView()
        })
    }

    waitForMapLoad = (jimuMapView: any, timeout: number): Promise<void> => {
        return new Promise((resolve) => {
            const startTime = Date.now()

            const checkMapLoad = () => {
                // Check timeout
                if (Date.now() - startTime > timeout) {
                    console.error('Timeout waiting for map to load')
                    resolve()
                    return
                }

                // Check if map and view are ready
                if (jimuMapView?.view?.map && jimuMapView.view.ready) {
                    console.log('Map is ready!')
                    resolve()
                } else {
                    console.log('Waiting for map to load...')
                    setTimeout(checkMapLoad, 500)
                }
            }

            checkMapLoad()
        })
    }

    loadLayersFromMap = async () => {
        const { useMapWidgetIds } = this.props.config || {}
        console.log('Loading layers from map...', useMapWidgetIds)

        // Handle both regular array and ImmutableArray
        const mapWidgetIdsArray = Array.isArray(useMapWidgetIds) ? useMapWidgetIds :
            useMapWidgetIds?.asMutable ? useMapWidgetIds.asMutable() : []

        if (!mapWidgetIdsArray || mapWidgetIdsArray.length === 0) {
            console.log('No map widget IDs configured')
            return
        }

        this.setState({
            isLoadingLayers: true,
            layerLoadError: null
        })

        try {
            const mapWidgetId = mapWidgetIdsArray[0]
            console.log('Map widget ID:', mapWidgetId)

            // Use Promise-based approach to wait for map view
            const jimuMapView = await this.waitForMapView(mapWidgetId, 30000) // 30 second timeout

            if (!jimuMapView) {
                console.error('Failed to get map view after 30 seconds')
                this.setState({
                    isLoadingLayers: false,
                    layerLoadError: 'Could not connect to the selected map. The map may still be loading. Please wait and try again.',
                    availableLayers: []
                })
                return
            }

            console.log('Found jimuMapView:', jimuMapView)

            // Wait for map to be fully loaded
            await this.waitForMapLoad(jimuMapView, 15000) // 15 second timeout

            console.log('Map available, loading layers...')

            // Get all layers from the map
            const allLayers = jimuMapView.view.map.allLayers || jimuMapView.view.map.layers
            console.log('All layers:', allLayers)

            if (!allLayers) {
                console.log('No layers found in map')
                this.setState({
                    isLoadingLayers: false,
                    layerLoadError: 'No layers found in the selected map.',
                    availableLayers: []
                })
                return
            }

            // Convert to array and filter for feature layers
            const layerArray = allLayers.toArray ? allLayers.toArray() : Array.from(allLayers)
            console.log(`Processing ${layerArray.length} layers...`)

            const featureLayers = layerArray
                .filter((layer: any, index: number) => {
                    if (index % 50 === 0) console.log(`Processing layer ${index + 1}/${layerArray.length}`)
                    return layer.type === 'feature' || layer.declaredClass?.includes('FeatureLayer')
                })
                .map((layer: any) => ({
                    id: layer.id,
                    title: layer.title || layer.name || `Layer ${layer.id}`,
                    layer: layer
                }))

            console.log(`Found ${featureLayers.length} feature layers out of ${layerArray.length} total layers`)

            this.setState({
                availableLayers: featureLayers,
                isLoadingLayers: false,
                layerLoadError: null
            })

            // If we have a selected layer, load its fields
            if (this.props.config?.selectedLayerId) {
                const selectedLayer = featureLayers.find(l => l.id === this.props.config.selectedLayerId)
                if (selectedLayer) {
                    this.loadFieldsForLayer(selectedLayer, 'physical')
                }
            }

            // If we have a selected owner layer, load its fields
            if (this.props.config?.ownerLayerId) {
                const ownerLayer = featureLayers.find(l => l.id === this.props.config.ownerLayerId)
                if (ownerLayer) {
                    this.loadFieldsForLayer(ownerLayer, 'owner')
                }
            }

        } catch (error) {
            console.error('Error loading layers from map:', error)
            this.setState({
                isLoadingLayers: false,
                layerLoadError: `Error: ${error.message || 'Unknown error occurred while loading layers'}`,
                availableLayers: []
            })
        }
    }

    loadFieldsForLayer = async (layer: any, layerType: 'physical' | 'owner' = 'physical') => {
        console.log(`Loading fields for ${layerType} layer:`, layer)

        try {
            let fields = []

            // Try multiple approaches to get fields
            if (layer.layer.fields) {
                fields = layer.layer.fields
            } else if (layer.layer.getSchema) {
                const schema = await layer.layer.getSchema()
                fields = schema?.fields || []
            } else if (layer.layer.loaded) {
                fields = layer.layer.fields || []
            } else {
                // Load the layer first
                await layer.layer.load()
                fields = layer.layer.fields || []
            }

            console.log(`${layerType} fields found:`, fields)

            if (layerType === 'physical') {
                this.setState({
                    availableFields: fields,
                    selectedLayer: layer
                })
            } else {
                this.setState({
                    ownerAvailableFields: fields,
                    ownerSelectedLayer: layer
                })
            }

        } catch (error) {
            console.error(`Error loading fields for ${layerType} layer:`, error)
            if (layerType === 'physical') {
                this.setState({ availableFields: [] })
            } else {
                this.setState({ ownerAvailableFields: [] })
            }
        }
    }

    onMapWidgetSelected = (useMapWidgetIds: string[]) => {
        console.log('Map widget selected:', useMapWidgetIds)
        // Convert to ImmutableArray for Jimu compatibility
        const immutableIds = Immutable(useMapWidgetIds)
        this.updateConfig({ useMapWidgetIds: immutableIds })

        // Clear previous selections
        this.setState({
            availableLayers: [],
            availableFields: [],
            ownerAvailableFields: [],
            selectedLayer: null,
            ownerSelectedLayer: null,
            isLoadingLayers: false,
            layerLoadError: null
        })

        // Load layers after a brief delay
        setTimeout(() => {
            this.loadLayersFromMap()
        }, 1000)
    }

    onLayerChange = async (evt: React.ChangeEvent<HTMLSelectElement>) => {
        const layerId = evt.target.value
        console.log('Physical layer changed to:', layerId)

        this.updateConfig({ selectedLayerId: layerId })

        if (layerId) {
            const layer = this.state.availableLayers.find(l => l.id === layerId)
            if (layer) {
                await this.loadFieldsForLayer(layer, 'physical')
            }
        } else {
            this.setState({ availableFields: [], selectedLayer: null })
        }
    }

    onOwnerLayerChange = async (evt: React.ChangeEvent<HTMLSelectElement>) => {
        const layerId = evt.target.value
        console.log('Owner layer changed to:', layerId)

        this.updateConfig({ ownerLayerId: layerId })

        if (layerId) {
            const layer = this.state.availableLayers.find(l => l.id === layerId)
            if (layer) {
                await this.loadFieldsForLayer(layer, 'owner')
            }
        } else {
            this.setState({ ownerAvailableFields: [], ownerSelectedLayer: null })
        }
    }

    onSelectionLayerChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        const layerId = evt.target.value
        this.updateConfig({ selectionLayerId: layerId })
    }

    // Physical address field mapping
    onPhysicalFieldMapping = (labelField: string, dataField: string | boolean) => {
        const currentFields = this.state.config.selectedFields || {
            name: '', nameCustomText: '', useCustomName: false, address1: '', address2: '', city: '', state: '', zip: ''
        }

        this.updateConfig({
            selectedFields: {
                ...currentFields,
                [labelField]: dataField
            }
        })
    }

    // Owner address field mapping
    onOwnerFieldMapping = (labelField: string, dataField: string | boolean) => {
        const currentFields = this.state.config.ownerFields || {
            name: '', nameCustomText: '', useCustomName: false, address1: '', address2: '', city: '', state: '', zip: ''
        }

        this.updateConfig({
            ownerFields: {
                ...currentFields,
                [labelField]: dataField
            }
        })
    }

    onGeometrySelectionToggle = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        this.updateConfig({ enableGeometrySelection: checked })
    }

    onSelectionMethodChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        this.updateConfig({ selectionMethod: evt.target.value as any })
    }

    onAddressTypeToggle = (addressType: 'physical' | 'owner', enabled: boolean) => {
        const currentTypes = this.state.config.enabledAddressTypes || { physical: true, owner: true }
        this.updateConfig({
            enabledAddressTypes: {
                ...currentTypes,
                [addressType]: enabled
            }
        })
    }

    onDefaultAddressTypeChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        this.updateConfig({ defaultAddressType: evt.target.value as 'physical' | 'owner' })
    }

    onGeocodeUrlChange = (value: string) => {
        // Reset any previous test state when the URL is edited
        this.setState({ geocodeTestStatus: 'idle', geocodeTestMessage: '' })
        this.updateConfig({ geocodeUrl: (value || '').trim() })
    }

    testGeocodeUrl = async () => {
        const url = (this.state.config.geocodeUrl || '').trim()
        if (!url) {
            this.setState({ geocodeTestStatus: 'error', geocodeTestMessage: 'Enter a URL first.' })
            return
        }

        // Strip trailing slash to keep things tidy
        const baseUrl = url.replace(/\/+$/, '')
        this.setState({ geocodeTestStatus: 'testing', geocodeTestMessage: 'Contacting service...' })

        try {
            // The service root in JSON form returns capabilities/serviceDescription/etc.
            const resp = await fetch(`${baseUrl}?f=json`, { method: 'GET' })
            if (!resp.ok) {
                this.setState({ geocodeTestStatus: 'error', geocodeTestMessage: `HTTP ${resp.status}` })
                return
            }
            const data = await resp.json()
            // ArcGIS error responses come back as 200s with an `error` payload, so check explicitly
            if (data?.error) {
                const detail = data.error.message || 'Service returned an error.'
                this.setState({ geocodeTestStatus: 'error', geocodeTestMessage: detail })
                return
            }
            // A geocode service should advertise either addressFields or singleLineAddressField
            const looksLikeGeocoder = !!(data?.addressFields || data?.singleLineAddressField || data?.capabilities)
            if (!looksLikeGeocoder) {
                this.setState({ geocodeTestStatus: 'error', geocodeTestMessage: 'URL responded but does not look like a GeocodeServer.' })
                return
            }
            this.setState({ geocodeTestStatus: 'ok', geocodeTestMessage: 'Geocoder reachable.' })
        } catch (err: any) {
            this.setState({ geocodeTestStatus: 'error', geocodeTestMessage: err?.message || 'Request failed.' })
        }
    }

    updateConfig = (updates: Partial<Config>) => {
        const newConfig = {
            ...this.state.config,
            ...updates
        }
        this.setState({ config: newConfig })
        this.props.onSettingChange({
            id: this.props.id,
            config: newConfig
        })
    }

    // Helper function to render physical address field mapping section
    renderPhysicalFieldMappingSection = () => {
        const { selectedFields = { name: '', nameCustomText: '', useCustomName: false, address1: '', address2: '', city: '', state: '', zip: '' } } = this.state.config

        return (
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #007ac3', borderRadius: '5px' }}>
                <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#007ac3', fontSize: '14px' }}>
                    📮 Physical Mailing Address Fields
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '15px' }}>
                    Configure how physical mailing addresses are extracted from your data layer.
                </div>
                <div className="field-mapping">
                    {/* Special handling for name field with custom text option */}
                    <SettingRow>
                        <Label>Name:</Label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedFields.useCustomName || false}
                                    onChange={(e) => this.onPhysicalFieldMapping('useCustomName', e.target.checked)}
                                    id="physical-useCustomName"
                                />
                                <label htmlFor="physical-useCustomName" style={{ fontSize: '12px' }}>
                                    Use custom text instead of field
                                </label>
                            </div>

                            {selectedFields.useCustomName ? (
                                <TextInput
                                    placeholder="Enter custom text (e.g., Current Resident)"
                                    value={selectedFields.nameCustomText || ''}
                                    onChange={(evt) => this.onPhysicalFieldMapping('nameCustomText', evt.target.value)}
                                    style={{ maxWidth: '100%', boxSizing: 'border-box' }}
                                />
                            ) : (
                                <Select
                                    placeholder="Select field for name"
                                    value={selectedFields.name || ''}
                                    onChange={(evt) => this.onPhysicalFieldMapping('name', evt.target.value)}
                                >
                                    <Option value="">-- Select Field --</Option>
                                    {this.state.availableFields.map((field: any) => (
                                        <Option key={field.name} value={field.name}>
                                            {field.alias || field.name}
                                        </Option>
                                    ))}
                                </Select>
                            )}
                        </div>
                    </SettingRow>

                    {/* Regular field mappings for other fields */}
                    {Object.keys(selectedFields).filter(key => key !== 'name' && key !== 'nameCustomText' && key !== 'useCustomName').map(labelField => (
                        <SettingRow key={`physical-${labelField}`}>
                            <Label>
                                {labelField.charAt(0).toUpperCase() + labelField.slice(1)}:
                            </Label>
                            <Select
                                placeholder={`Select field for ${labelField}`}
                                value={selectedFields[labelField]}
                                onChange={(evt) => this.onPhysicalFieldMapping(labelField, evt.target.value)}
                            >
                                <Option value="">-- Select Field --</Option>
                                {this.state.availableFields.map((field: any) => (
                                    <Option key={field.name} value={field.name}>
                                        {field.alias || field.name}
                                    </Option>
                                ))}
                            </Select>
                        </SettingRow>
                    ))}
                </div>
            </div>
        )
    }

    // Helper function to render owner address field mapping section
    renderOwnerFieldMappingSection = () => {
        const { ownerFields = { name: '', nameCustomText: '', useCustomName: false, address1: '', address2: '', city: '', state: '', zip: '' } } = this.state.config

        return (
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #28a745', borderRadius: '5px' }}>
                <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#28a745', fontSize: '14px' }}>
                    🏠 Owner Address Fields
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '15px' }}>
                    Configure how property owner addresses are extracted from your data layer.
                </div>
                <div className="field-mapping">
                    {/* Special handling for name field with custom text option */}
                    <SettingRow>
                        <Label>Name:</Label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={ownerFields.useCustomName || false}
                                    onChange={(e) => this.onOwnerFieldMapping('useCustomName', e.target.checked)}
                                    id="owner-useCustomName"
                                />
                                <label htmlFor="owner-useCustomName" style={{ fontSize: '12px' }}>
                                    Use custom text instead of field
                                </label>
                            </div>

                            {ownerFields.useCustomName ? (
                                <TextInput
                                    placeholder="Enter custom text (e.g., Property Owner)"
                                    value={ownerFields.nameCustomText || ''}
                                    onChange={(evt) => this.onOwnerFieldMapping('nameCustomText', evt.target.value)}
                                    style={{ maxWidth: '100%', boxSizing: 'border-box' }}
                                />
                            ) : (
                                <Select
                                    placeholder="Select field for owner name"
                                    value={ownerFields.name || ''}
                                    onChange={(evt) => this.onOwnerFieldMapping('name', evt.target.value)}
                                >
                                    <Option value="">-- Select Field --</Option>
                                    {this.state.ownerAvailableFields.map((field: any) => (
                                        <Option key={field.name} value={field.name}>
                                            {field.alias || field.name}
                                        </Option>
                                    ))}
                                </Select>
                            )}
                        </div>
                    </SettingRow>

                    {/* Regular field mappings for other owner fields */}
                    {Object.keys(ownerFields).filter(key => key !== 'name' && key !== 'nameCustomText' && key !== 'useCustomName').map(labelField => (
                        <SettingRow key={`owner-${labelField}`}>
                            <Label>
                                {labelField.charAt(0).toUpperCase() + labelField.slice(1)}:
                            </Label>
                            <Select
                                placeholder={`Select field for ${labelField}`}
                                value={ownerFields[labelField] || ''}
                                onChange={(evt) => this.onOwnerFieldMapping(labelField, evt.target.value)}
                            >
                                <Option value="">-- Select Field --</Option>
                                {this.state.ownerAvailableFields.map((field: any) => (
                                    <Option key={field.name} value={field.name}>
                                        {field.alias || field.name}
                                    </Option>
                                ))}
                            </Select>
                        </SettingRow>
                    ))}
                </div>
            </div>
        )
    }

    render() {
        const { config, availableLayers, availableFields, ownerAvailableFields, isLoadingLayers, layerLoadError } = this.state
        const {
            useMapWidgetIds = [],
            selectedLayerId = '',
            ownerLayerId = '',
            selectionLayerId = '',
            enabledAddressTypes = { physical: true, owner: true },
            defaultAddressType = 'physical',
            enableGeometrySelection = false,
            selectionMethod = 'click'
        } = config

        // Handle both regular array and ImmutableArray for useMapWidgetIds
        const mapWidgetIdsArray = Array.isArray(useMapWidgetIds) ? useMapWidgetIds :
            useMapWidgetIds?.asMutable ? useMapWidgetIds.asMutable() : []

        return (
            <div className="widget-setting-mailing-labels">
                <SettingSection title="Map Configuration">
                    <SettingRow>
                        <Label>Select Map Widget:</Label>
                        <MapWidgetSelector
                            onSelect={this.onMapWidgetSelected}
                            useMapWidgetIds={mapWidgetIdsArray}
                        />
                    </SettingRow>

                    {/* Show loading status */}
                    {mapWidgetIdsArray.length > 0 && isLoadingLayers && (
                        <SettingRow>
                            <div style={{
                                padding: '10px',
                                background: '#e7f3ff',
                                borderRadius: '4px',
                                color: '#0066cc',
                                fontSize: '12px'
                            }}>
                                ⏳ Connecting to map widget... This may take up to 30 seconds for maps with many layers.
                            </div>
                        </SettingRow>
                    )}

                    {/* Show error status */}
                    {layerLoadError && (
                        <SettingRow>
                            <div style={{
                                padding: '10px',
                                background: '#ffe7e7',
                                borderRadius: '4px',
                                color: '#cc0000',
                                fontSize: '12px',
                                marginBottom: '8px'
                            }}>
                                ⚠️ {layerLoadError}
                            </div>
                            <Button
                                onClick={() => {
                                    this.setState({ layerLoadError: null })
                                    this.loadLayersFromMap()
                                }}
                                size="sm"
                                type="primary"
                            >
                                Retry Connection
                            </Button>
                        </SettingRow>
                    )}
                </SettingSection>

                {mapWidgetIdsArray.length > 0 && !isLoadingLayers && (
                    <>
                        {/* 1. Address Type Configuration */}
                        <SettingSection title="Address Type Configuration">
                            <div style={{ marginBottom: '15px', padding: '15px', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                                <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#495057' }}>
                                    ⚙️ Choose which address types to make available to end users:
                                </p>
                                <p style={{ margin: '0', fontSize: '12px', color: '#6c757d' }}>
                                    Configure which address types users can select when generating mailing labels.
                                </p>
                            </div>

                            <SettingRow>
                                <Label>Available Address Types:</Label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Switch
                                            checked={config.enabledAddressTypes?.physical !== false}
                                            onChange={(evt, checked) => this.onAddressTypeToggle('physical', checked)}
                                        />
                                        <Label style={{ margin: 0 }}>📮 Physical Mailing Address</Label>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Switch
                                            checked={config.enabledAddressTypes?.owner === true}
                                            onChange={(evt, checked) => this.onAddressTypeToggle('owner', checked)}
                                        />
                                        <Label style={{ margin: 0 }}>🏠 Owner Address</Label>
                                    </div>
                                </div>
                            </SettingRow>

                            {(config.enabledAddressTypes?.physical !== false && config.enabledAddressTypes?.owner === true) && (
                                <SettingRow>
                                    <Label>Default Address Type:</Label>
                                    <Select
                                        value={config.defaultAddressType || 'physical'}
                                        onChange={this.onDefaultAddressTypeChange}
                                    >
                                        <Option value="physical">📮 Physical Mailing Address</Option>
                                        <Option value="owner">🏠 Owner Address</Option>
                                    </Select>
                                </SettingRow>
                            )}
                        </SettingSection>

                        {/* 2. Physical Address Data Layer */}
                        {config.enabledAddressTypes?.physical !== false && (
                            <SettingSection title="Physical Address Data Layer">
                                <div style={{ marginBottom: '15px', padding: '10px', borderRadius: '5px', border: '1px solid #007ac3' }}>
                                    <p style={{ margin: '0', fontSize: '12px', color: '#495057' }}>
                                        📮 Select the layer containing <strong>physical mailing address</strong> data (where mail should be delivered).
                                    </p>
                                </div>
                                <SettingRow>
                                    <Label>Physical Address Layer:</Label>
                                    <Select
                                        placeholder="Select a layer..."
                                        value={selectedLayerId}
                                        onChange={this.onLayerChange}
                                    >
                                        <Option value="">-- Select Layer --</Option>
                                        {availableLayers.map(layer => (
                                            <Option key={layer.id} value={layer.id}>
                                                {layer.title}
                                            </Option>
                                        ))}
                                    </Select>
                                </SettingRow>

                                {availableLayers.length === 0 && mapWidgetIdsArray.length > 0 && !isLoadingLayers && !layerLoadError && (
                                    <SettingRow>
                                        <div style={{ color: '#888', fontStyle: 'italic', marginBottom: '10px' }}>
                                            No layers loaded yet. Click below to load layers.
                                        </div>
                                        <Button
                                            onClick={() => this.loadLayersFromMap()}
                                            size="sm"
                                            type="primary"
                                        >
                                            Load Layers
                                        </Button>
                                    </SettingRow>
                                )}
                            </SettingSection>
                        )}

                        {/* 3. Physical Address Field Mapping */}
                        {selectedLayerId && availableFields.length > 0 && config.enabledAddressTypes?.physical !== false && (
                            <SettingSection title="Physical Address Field Mapping">
                                {this.renderPhysicalFieldMappingSection()}
                            </SettingSection>
                        )}

                        {/* 4. Owner Address Data Layer */}
                        {config.enabledAddressTypes?.owner === true && (
                            <SettingSection title="Owner Address Data Layer">
                                <div style={{ marginBottom: '15px', padding: '10px', borderRadius: '5px', border: '1px solid #28a745' }}>
                                    <p style={{ margin: '0', fontSize: '12px', color: '#495057' }}>
                                        🏠 Select the layer containing <strong>property owner address</strong> data (who owns the property).
                                    </p>
                                </div>
                                <SettingRow>
                                    <Label>Owner Address Layer:</Label>
                                    <Select
                                        placeholder="Select layer for owner addresses..."
                                        value={ownerLayerId}
                                        onChange={this.onOwnerLayerChange}
                                    >
                                        <Option value="">-- Select Layer --</Option>
                                        {availableLayers.map(layer => (
                                            <Option key={layer.id} value={layer.id}>
                                                {layer.title}
                                            </Option>
                                        ))}
                                    </Select>
                                </SettingRow>
                            </SettingSection>
                        )}

                        {/* 5. Owner Address Field Mapping */}
                        {ownerLayerId && ownerAvailableFields.length > 0 && config.enabledAddressTypes?.owner === true && (
                            <SettingSection title="Owner Address Field Mapping">
                                {this.renderOwnerFieldMappingSection()}
                            </SettingSection>
                        )}

                        {/* 6. Geometry Selection */}
                        {(selectedLayerId || ownerLayerId) && (
                            <SettingSection title="Geometry Selection">
                                <div style={{ marginBottom: '15px', padding: '10px', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                                    <p style={{ margin: '0', fontSize: '12px', color: '#495057' }}>
                                        🎯 Allow users to draw areas on the map to filter which features get included in mailing labels.
                                    </p>
                                </div>
                                <SettingRow>
                                    <Label>Enable Geometry Selection:</Label>
                                    <Switch
                                        checked={enableGeometrySelection}
                                        onChange={this.onGeometrySelectionToggle}
                                    />
                                </SettingRow>

                                {enableGeometrySelection && (
                                    <>
                                        <SettingRow>
                                            <Label>Selection Layer (for filtering):</Label>
                                            <Select
                                                placeholder="Select layer for area selection..."
                                                value={selectionLayerId}
                                                onChange={this.onSelectionLayerChange}
                                            >
                                                <Option value="">-- Select Layer --</Option>
                                                {availableLayers.map(layer => (
                                                    <Option key={layer.id} value={layer.id}>
                                                        {layer.title}
                                                    </Option>
                                                ))}
                                            </Select>
                                        </SettingRow>

                                        <SettingRow>
                                            <Label>Selection Method:</Label>
                                            <Select value={selectionMethod} onChange={this.onSelectionMethodChange}>
                                                <Option value="click">Click to Select</Option>
                                                <Option value="draw">Draw Selection Area</Option>
                                                <Option value="both">Both Click and Draw</Option>
                                            </Select>
                                        </SettingRow>
                                    </>
                                )}
                            </SettingSection>
                        )}

                        {/* Configuration Summary */}
                        {(selectedLayerId || ownerLayerId) && (
                            <SettingSection title="Configuration Summary">
                                <div style={{ padding: '15px', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#495057' }}>
                                        📋 Current Configuration
                                    </div>

                                    {config.enabledAddressTypes?.physical !== false && selectedLayerId && (
                                        <div style={{ marginBottom: '8px' }}>
                                            <strong>📮 Physical Address:</strong> {availableLayers.find(l => l.id === selectedLayerId)?.title || 'Layer not found'}
                                        </div>
                                    )}

                                    {config.enabledAddressTypes?.owner === true && ownerLayerId && (
                                        <div style={{ marginBottom: '8px' }}>
                                            <strong>🏠 Owner Address:</strong> {availableLayers.find(l => l.id === ownerLayerId)?.title || 'Layer not found'}
                                        </div>
                                    )}

                                    {config.enabledAddressTypes?.physical !== false && config.enabledAddressTypes?.owner === true && (
                                        <div style={{ marginBottom: '8px' }}>
                                            <strong>🎯 Default Type:</strong> {config.defaultAddressType === 'owner' ? '🏠 Owner Address' : '📮 Physical Address'}
                                        </div>
                                    )}

                                    {enableGeometrySelection && (
                                        <div style={{ marginBottom: '8px' }}>
                                            <strong>🎨 Geometry Selection:</strong> Enabled ({selectionMethod})
                                        </div>
                                    )}
                                </div>
                            </SettingSection>
                        )}

                        {/* Geocoding (Address Search) */}
                        <SettingSection title="Geocoding (Address Search)">
                            <SettingRow>
                                <Label style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 600 }}>
                                    Geocode service URL
                                </Label>
                            </SettingRow>
                            <SettingRow>
                                <TextInput
                                    style={{ width: '100%' }}
                                    placeholder="https://.../GeocodeServer"
                                    value={this.props.config.geocodeUrl || ''}
                                    onChange={(evt: any) => this.onGeocodeUrlChange(evt.target.value)}
                                    aria-label="Geocode service URL"
                                />
                            </SettingRow>
                            <SettingRow>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                    <Button
                                        type="default"
                                        size="sm"
                                        disabled={!this.props.config.geocodeUrl || this.state.geocodeTestStatus === 'testing'}
                                        onClick={this.testGeocodeUrl}
                                    >
                                        {this.state.geocodeTestStatus === 'testing' ? 'Testing...' : 'Test'}
                                    </Button>
                                    {this.state.geocodeTestStatus !== 'idle' && (
                                        <span style={{
                                            fontSize: '12px',
                                            color: this.state.geocodeTestStatus === 'ok' ? '#155724'
                                                : this.state.geocodeTestStatus === 'error' ? '#721c24'
                                                    : '#0c5460'
                                        }}>
                                            {this.state.geocodeTestMessage}
                                        </span>
                                    )}
                                </div>
                            </SettingRow>
                            <SettingRow>
                                <p style={{ margin: 0, fontSize: '12px', color: '#6c757d' }}>
                                    Provide an ArcGIS GeocodeServer URL to enable address search inside the widget. Leave blank to hide the search panel. Example: <code style={{ fontSize: '11px' }}>https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer</code>
                                </p>
                            </SettingRow>
                        </SettingSection>

                        {/* Draw Widget Integration */}
                        <SettingSection title="Draw Widget Integration">
                            <SettingRow>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <Label style={{ margin: 0 }}>
                                        Accept geometry from Draw widget
                                    </Label>
                                    <Switch
                                        checked={this.props.config.enableDrawWidgetIntegration === true}
                                        onChange={() => {
                                            this.props.onSettingChange({
                                                id: this.props.id,
                                                config: this.props.config.set('enableDrawWidgetIntegration', !this.props.config.enableDrawWidgetIntegration)
                                            })
                                        }}
                                        aria-label="Enable Draw Widget integration"
                                    />
                                </div>
                            </SettingRow>
                            <SettingRow>
                                <p style={{ margin: 0, fontSize: '12px', color: '#6c757d' }}>
                                    {this.props.config.enableDrawWidgetIntegration
                                        ? 'This widget will accept drawing geometries sent from the Draw widget for parcel selection. The Draw widget must also have its Mailing Labels integration enabled.'
                                        : 'Drawing geometry from the Draw widget will be ignored. Enable this to allow users to select parcels using shapes drawn in the Draw widget.'}
                                </p>
                            </SettingRow>
                        </SettingSection>
                    </>
                )}
            </div>
        )
    }
} 