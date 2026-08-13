import { AllWidgetSettingProps } from 'jimu-for-builder'
import { MapWidgetSelector, SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components'
import { TextInput, Label, Switch, Select, Option, Button, Checkbox, Alert } from 'jimu-ui'
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
    suppressMapPopups?: boolean
    geocodeUrl?: string
}

type SettingProps = AllWidgetSettingProps<Config> & {
    id: string
    useMapWidgetIds?: string[] | any
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
    importExportStatus: string | null
}

export default class Setting extends React.PureComponent<SettingProps, State> {
    /**
     * Visual Studio can resolve `React.PureComponent` as an incomplete type when
     * following Experience Builder 1.21's pnpm symlinks. These declarations are
     * erased by TypeScript and only restore the inherited React instance members
     * for editor analysis; they do not emit fields or change runtime behavior.
     */
    declare readonly props: Readonly<SettingProps>
    declare state: Readonly<State>
    declare setState: (
        state: Partial<State> | ((prevState: Readonly<State>, props: Readonly<SettingProps>) => Partial<State> | State | null),
        callback?: () => void
    ) => void

    private mapViewManager: any

    constructor(props: SettingProps) {
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
            geocodeTestMessage: '',
            importExportStatus: null
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

    componentDidUpdate(prevProps: SettingProps) {
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

    // ---------------------------------------------------------------
    // Configuration import / export (XML)
    // ---------------------------------------------------------------

    private xmlEscape = (v: any): string => {
        return String(v)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
    }

    /** Serialize a plain config object to XML elements (skips arrays and null/undefined). */
    private objectToXml = (obj: any, indent: string): string => {
        let out = ''
        Object.keys(obj || {}).forEach(key => {
            const val = obj[key]
            if (val === undefined || val === null) return
            if (Array.isArray(val)) return
            if (typeof val === 'object') {
                const inner = this.objectToXml(val, indent + '  ')
                out += `${indent}<${key}>\n${inner}${indent}</${key}>\n`
            } else {
                out += `${indent}<${key} type="${typeof val}">${this.xmlEscape(val)}</${key}>\n`
            }
        })
        return out
    }

    /** Parse XML elements back into a plain config object using the type attribute. */
    private xmlToObject = (node: Element): any => {
        const obj: any = {}
        Array.from(node.children).forEach(child => {
            if (child.children.length > 0) {
                obj[child.nodeName] = this.xmlToObject(child)
            } else {
                const t = child.getAttribute('type')
                const raw = child.textContent ?? ''
                obj[child.nodeName] = t === 'boolean' ? raw === 'true' : t === 'number' ? Number(raw) : raw
            }
        })
        return obj
    }

    /** Export the current widget configuration as a downloadable XML file. */
    exportConfigXml = () => {
        try {
            const cfg: any = this.props.config as any
            const plain: any = cfg?.asMutable ? cfg.asMutable({ deep: true }) : { ...cfg }
            // Map bindings are app-specific and are intentionally not exported
            delete plain.useMapWidgetIds
            const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
                + '<mailingLabelsConfig version="1">\n'
                + this.objectToXml(plain, '  ')
                + '</mailingLabelsConfig>\n'
            const blob = new Blob([xml], { type: 'application/xml' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'mailing-labels-settings.xml'
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
            this.setState({ importExportStatus: 'Settings exported to mailing-labels-settings.xml.' })
        } catch (err: any) {
            this.setState({ importExportStatus: 'Export failed: ' + (err?.message || 'unknown error') })
        }
    }

    private importFileInput: HTMLInputElement | null = null

    /** Open the file picker for importing a settings XML file. */
    triggerImportConfigXml = () => {
        this.importFileInput?.click()
    }

    /** Read, validate, and apply an imported settings XML file. */
    onImportFileSelected = (evt: React.ChangeEvent<HTMLInputElement>) => {
        const file = evt.target.files?.[0]
        evt.target.value = ''
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            try {
                const doc = new DOMParser().parseFromString(String(reader.result), 'application/xml')
                if (doc.getElementsByTagName('parsererror').length > 0) {
                    throw new Error('File is not valid XML.')
                }
                const root = doc.documentElement
                if (root.nodeName !== 'mailingLabelsConfig') {
                    throw new Error('Not a Mailing Labels settings file.')
                }
                const imported = this.xmlToObject(root)
                // Never let an import overwrite the map binding for this app
                delete imported.useMapWidgetIds
                const merged = {
                    ...this.state.config,
                    ...imported,
                    useMapWidgetIds: this.state.config.useMapWidgetIds
                }
                this.setState({ config: merged, importExportStatus: 'Settings imported successfully.' })
                this.props.onSettingChange({
                    id: this.props.id,
                    config: merged
                })
            } catch (err: any) {
                this.setState({ importExportStatus: 'Import failed: ' + (err?.message || 'unknown error') })
            }
        }
        reader.onerror = () => {
            this.setState({ importExportStatus: 'Import failed: could not read the file.' })
        }
        reader.readAsText(file)
    }

    // ---------------------------------------------------------------
    // Render helpers (standard jimu-ui setting layout)
    // ---------------------------------------------------------------

    /** Display labels for address field mapping keys */
    private static readonly FIELD_LABELS: Record<string, string> = {
        address1: 'Address 1',
        address2: 'Address 2 (unit, suite)',
        city: 'City',
        state: 'State',
        zip: 'ZIP Code',
        country: 'Country',
        company: 'Company'
    }

    /** A label stacked above a full-width control. Keeps every input aligned in the narrow panel. */
    private stackedRow = (labelText: string, control: React.ReactNode, key?: string) => (
        <SettingRow flush key={key}>
            <div className="ml-stack">
                <Label className="ml-field-label">{labelText}</Label>
                {control}
            </div>
        </SettingRow>
    )

    /** A description line under a section title or control. */
    private descRow = (text: React.ReactNode, key?: string) => (
        <SettingRow flush key={key}>
            <p className="ml-desc">{text}</p>
        </SettingRow>
    )

    /** A full-width field Select bound to a mapping handler. */
    private fieldSelect = (
        value: string,
        fields: any[],
        onChange: (val: string) => void,
        ariaLabel: string
    ) => (
        <Select
            className="ml-control"
            size="sm"
            value={value || ''}
            onChange={(evt: any) => onChange(evt.target.value)}
            aria-label={ariaLabel}
        >
            <Option value="">None</Option>
            {fields.map((field: any) => (
                <Option key={field.name} value={field.name}>
                    {field.alias || field.name}
                </Option>
            ))}
        </Select>
    )

    /** Shared renderer for physical and owner field mapping sections. */
    private renderFieldMapping = (
        kind: 'physical' | 'owner',
        mappings: any,
        fields: any[],
        onMap: (key: string, val: any) => void
    ) => {
        const useCustom = mappings.useCustomName || false
        return (
            <>
                {this.descRow(kind === 'physical'
                    ? 'Map each label line to a field in the physical address layer.'
                    : 'Map each label line to a field in the owner address layer.')}

                <SettingRow tag="label" label="Use custom text for name">
                    <Checkbox
                        checked={useCustom}
                        onChange={(evt: any, checked?: boolean) => onMap('useCustomName', checked ?? evt?.target?.checked)}
                        aria-label="Use custom text for name"
                    />
                </SettingRow>

                {useCustom
                    ? this.stackedRow('Name (custom text)',
                        <TextInput
                            className="ml-control"
                            size="sm"
                            placeholder={kind === 'physical' ? 'e.g., Current Resident' : 'e.g., Property Owner'}
                            value={mappings.nameCustomText || ''}
                            onChange={(evt: any) => onMap('nameCustomText', evt.target.value)}
                            aria-label="Custom name text"
                        />)
                    : this.stackedRow('Name',
                        this.fieldSelect(mappings.name, fields, (v) => onMap('name', v), 'Name field'))}

                {Object.keys(mappings)
                    .filter(key => key !== 'name' && key !== 'nameCustomText' && key !== 'useCustomName')
                    .map(key => this.stackedRow(
                        Setting.FIELD_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1),
                        this.fieldSelect(mappings[key], fields, (v) => onMap(key, v), `${key} field`),
                        `${kind}-${key}`
                    ))}
            </>
        )
    }

    render() {
        const { config, availableLayers, availableFields, ownerAvailableFields, isLoadingLayers, layerLoadError } = this.state
        const {
            useMapWidgetIds = [],
            selectedLayerId = '',
            ownerLayerId = '',
            selectionLayerId = '',
            enableGeometrySelection = false,
            selectionMethod = 'click'
        } = config

        const physicalEnabled = config.enabledAddressTypes?.physical !== false
        const ownerEnabled = config.enabledAddressTypes?.owner === true

        // Handle both regular array and ImmutableArray for useMapWidgetIds
        const mapWidgetIdsArray = Array.isArray(useMapWidgetIds) ? useMapWidgetIds :
            useMapWidgetIds?.asMutable ? useMapWidgetIds.asMutable() : []

        const selectedFields = config.selectedFields || { name: '', nameCustomText: '', useCustomName: false, address1: '', address2: '', city: '', state: '', zip: '' }
        const ownerFields = config.ownerFields || { name: '', nameCustomText: '', useCustomName: false, address1: '', address2: '', city: '', state: '', zip: '' }

        return (
            <div className="widget-setting-mailing-labels">
                {/* Map source */}
                <SettingSection title="Source">
                    {this.stackedRow('Map widget',
                        <MapWidgetSelector
                            onSelect={this.onMapWidgetSelected}
                            useMapWidgetIds={mapWidgetIdsArray}
                            aria-label="Select map widget"
                        />)}

                    {mapWidgetIdsArray.length > 0 && isLoadingLayers && (
                        <SettingRow flush>
                            <Alert
                                className="ml-alert"
                                type="info"
                                withIcon
                                text="Connecting to map widget. Maps with many layers can take up to 30 seconds."
                            />
                        </SettingRow>
                    )}

                    {layerLoadError && (
                        <>
                            <SettingRow flush>
                                <Alert
                                    className="ml-alert"
                                    type="warning"
                                    withIcon
                                    text={layerLoadError}
                                />
                            </SettingRow>
                            <SettingRow flush>
                                <Button
                                    className="ml-control"
                                    size="sm"
                                    type="primary"
                                    onClick={() => {
                                        this.setState({ layerLoadError: null })
                                        this.loadLayersFromMap()
                                    }}
                                >
                                    Retry connection
                                </Button>
                            </SettingRow>
                        </>
                    )}
                </SettingSection>

                {mapWidgetIdsArray.length > 0 && !isLoadingLayers && (
                    <>
                        {/* Address types */}
                        <SettingSection title="Address types">
                            {this.descRow('Choose which address types end users can generate labels for.')}

                            <SettingRow tag="label" label="Physical mailing address">
                                <Switch
                                    checked={physicalEnabled}
                                    onChange={(evt: any, checked: boolean) => this.onAddressTypeToggle('physical', checked)}
                                    aria-label="Enable physical mailing address"
                                />
                            </SettingRow>

                            <SettingRow tag="label" label="Owner address">
                                <Switch
                                    checked={ownerEnabled}
                                    onChange={(evt: any, checked: boolean) => this.onAddressTypeToggle('owner', checked)}
                                    aria-label="Enable owner address"
                                />
                            </SettingRow>

                            {physicalEnabled && ownerEnabled && this.stackedRow('Default address type',
                                <Select
                                    className="ml-control"
                                    size="sm"
                                    value={config.defaultAddressType || 'physical'}
                                    onChange={this.onDefaultAddressTypeChange}
                                    aria-label="Default address type"
                                >
                                    <Option value="physical">Physical mailing address</Option>
                                    <Option value="owner">Owner address</Option>
                                </Select>)}
                        </SettingSection>

                        {/* Physical address layer */}
                        {physicalEnabled && (
                            <SettingSection title="Physical address">
                                {this.descRow('Layer containing physical mailing address data (where mail is delivered).')}

                                {this.stackedRow('Layer',
                                    <Select
                                        className="ml-control"
                                        size="sm"
                                        value={selectedLayerId}
                                        onChange={this.onLayerChange}
                                        aria-label="Physical address layer"
                                    >
                                        <Option value="">Select a layer</Option>
                                        {availableLayers.map(layer => (
                                            <Option key={layer.id} value={layer.id}>{layer.title}</Option>
                                        ))}
                                    </Select>)}

                                {availableLayers.length === 0 && !layerLoadError && (
                                    <>
                                        {this.descRow('No layers loaded yet.')}
                                        <SettingRow flush>
                                            <Button className="ml-control" size="sm" type="primary" onClick={() => this.loadLayersFromMap()}>
                                                Load layers
                                            </Button>
                                        </SettingRow>
                                    </>
                                )}

                                {selectedLayerId && availableFields.length > 0 &&
                                    this.renderFieldMapping('physical', selectedFields, availableFields, this.onPhysicalFieldMapping)}
                            </SettingSection>
                        )}

                        {/* Owner address layer */}
                        {ownerEnabled && (
                            <SettingSection title="Owner address">
                                {this.descRow('Layer containing property owner address data (who owns the property).')}

                                {this.stackedRow('Layer',
                                    <Select
                                        className="ml-control"
                                        size="sm"
                                        value={ownerLayerId}
                                        onChange={this.onOwnerLayerChange}
                                        aria-label="Owner address layer"
                                    >
                                        <Option value="">Select a layer</Option>
                                        {availableLayers.map(layer => (
                                            <Option key={layer.id} value={layer.id}>{layer.title}</Option>
                                        ))}
                                    </Select>)}

                                {ownerLayerId && ownerAvailableFields.length > 0 &&
                                    this.renderFieldMapping('owner', ownerFields, ownerAvailableFields, this.onOwnerFieldMapping)}
                            </SettingSection>
                        )}

                        {/* Selection */}
                        {(selectedLayerId || ownerLayerId) && (
                            <SettingSection title="Selection">
                                <SettingRow tag="label" label="Geometry selection">
                                    <Switch
                                        checked={enableGeometrySelection}
                                        onChange={this.onGeometrySelectionToggle}
                                        aria-label="Enable geometry selection"
                                    />
                                </SettingRow>
                                {this.descRow('Let users draw areas on the map to filter which features are included.')}

                                {enableGeometrySelection && (
                                    <>
                                        {this.stackedRow('Selection layer',
                                            <Select
                                                className="ml-control"
                                                size="sm"
                                                value={selectionLayerId}
                                                onChange={this.onSelectionLayerChange}
                                                aria-label="Selection layer"
                                            >
                                                <Option value="">Select a layer</Option>
                                                {availableLayers.map(layer => (
                                                    <Option key={layer.id} value={layer.id}>{layer.title}</Option>
                                                ))}
                                            </Select>)}

                                        {this.stackedRow('Selection method',
                                            <Select
                                                className="ml-control"
                                                size="sm"
                                                value={selectionMethod}
                                                onChange={this.onSelectionMethodChange}
                                                aria-label="Selection method"
                                            >
                                                <Option value="click">Click to select</Option>
                                                <Option value="draw">Draw selection area</Option>
                                                <Option value="both">Click and draw</Option>
                                            </Select>)}
                                    </>
                                )}

                                <SettingRow tag="label" label="Accept geometry from Draw widget">
                                    <Switch
                                        checked={this.props.config.enableDrawWidgetIntegration === true}
                                        onChange={() => {
                                            this.props.onSettingChange({
                                                id: this.props.id,
                                                config: (this.props.config as any).set('enableDrawWidgetIntegration', !this.props.config.enableDrawWidgetIntegration)
                                            })
                                        }}
                                        aria-label="Accept geometry from Draw widget"
                                    />
                                </SettingRow>
                                {this.descRow(this.props.config.enableDrawWidgetIntegration
                                    ? 'Shapes drawn in the Draw widget can be used to select parcels. The Draw widget must also have its Mailing Labels integration enabled.'
                                    : 'Geometry from the Draw widget is ignored.')}
                            </SettingSection>
                        )}

                        {/* Map behavior */}
                        <SettingSection title="Map behavior">
                            <SettingRow tag="label" label="Suppress map popups while open">
                                <Switch
                                    checked={this.props.config.suppressMapPopups !== false}
                                    onChange={() => {
                                        this.props.onSettingChange({
                                            id: this.props.id,
                                            config: (this.props.config as any).set('suppressMapPopups', this.props.config.suppressMapPopups === false)
                                        })
                                    }}
                                    aria-label="Suppress map popups while widget is open"
                                />
                            </SettingRow>
                            {this.descRow(this.props.config.suppressMapPopups !== false
                                ? 'Map clicks select features instead of opening popups. Popups are restored when the widget closes.'
                                : 'Map popups stay enabled and may open when users click the map.')}
                        </SettingSection>

                        {/* Address search */}
                        <SettingSection title="Address search">
                            {this.stackedRow('Geocode service URL',
                                <TextInput
                                    className="ml-control"
                                    size="sm"
                                    placeholder="https://.../GeocodeServer"
                                    value={this.props.config.geocodeUrl || ''}
                                    onChange={(evt: any) => this.onGeocodeUrlChange(evt.target.value)}
                                    aria-label="Geocode service URL"
                                />)}

                            <SettingRow flush>
                                <div className="ml-inline">
                                    <Button
                                        size="sm"
                                        disabled={!this.props.config.geocodeUrl || this.state.geocodeTestStatus === 'testing'}
                                        onClick={this.testGeocodeUrl}
                                    >
                                        {this.state.geocodeTestStatus === 'testing' ? 'Testing...' : 'Test'}
                                    </Button>
                                    {this.state.geocodeTestStatus !== 'idle' && (
                                        <span className={
                                            this.state.geocodeTestStatus === 'ok' ? 'ml-status ml-status-ok'
                                                : this.state.geocodeTestStatus === 'error' ? 'ml-status ml-status-error'
                                                    : 'ml-status'
                                        }>
                                            {this.state.geocodeTestMessage}
                                        </span>
                                    )}
                                </div>
                            </SettingRow>
                            {this.descRow('Provide an ArcGIS GeocodeServer URL to enable address search inside the widget. Leave blank to hide the search panel.')}
                        </SettingSection>

                        {/* Settings file */}
                        <SettingSection title="Settings file">
                            <SettingRow flush>
                                <div className="ml-inline">
                                    <Button size="sm" onClick={this.exportConfigXml}>Export XML</Button>
                                    <Button size="sm" onClick={this.triggerImportConfigXml}>Import XML</Button>
                                    <input
                                        ref={(el) => { this.importFileInput = el }}
                                        type="file"
                                        accept=".xml,application/xml,text/xml"
                                        style={{ display: 'none' }}
                                        onChange={this.onImportFileSelected}
                                        aria-hidden="true"
                                        tabIndex={-1}
                                    />
                                </div>
                            </SettingRow>
                            {this.state.importExportStatus && (
                                <SettingRow flush>
                                    <Alert
                                        className="ml-alert"
                                        type={this.state.importExportStatus.indexOf('failed') > -1 ? 'error' : 'success'}
                                        withIcon
                                        text={this.state.importExportStatus}
                                    />
                                </SettingRow>
                            )}
                            {this.descRow('Export saves the current settings to an XML file; import applies a previously exported file. The map widget binding is not transferred, so imported layer and field settings only resolve when the target app uses a map containing the same layers.')}
                        </SettingSection>
                    </>
                )}
            </div>
        )
    }
}
