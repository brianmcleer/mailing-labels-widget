import { ImmutableObject } from 'jimu-core'

/**
 * Widget configuration interface
 * Simplified configuration for the Mailing Labels widget
 */
export interface Config {
    /** Array of map widget IDs that this widget can connect to */
    useMapWidgetIds?: string[]

    /** Selected layer ID for physical address data */
    selectedLayerId?: string

    /** Selected layer ID for owner address data (optional - can be same as selectedLayerId) */
    ownerLayerId?: string

    /** Physical address field mappings */
    selectedFields?: FieldMappings

    /** Owner address field mappings (simplified - same structure as physical) */
    ownerFields?: FieldMappings

    /** Whether geometry selection is enabled */
    enableGeometrySelection?: boolean

    /** Selection method for features */
    selectionMethod?: 'click' | 'draw' | 'both'

    /** Whether buffer is enabled for selections */
    bufferEnabled?: boolean

    /** Buffer distance for selections */
    bufferDistance?: number

    /** Buffer unit for selections */
    bufferUnit?: string

    /** Address type configuration */
    enabledAddressTypes?: {
        physical?: boolean
        owner?: boolean
    }

    /** Default address type */
    defaultAddressType?: 'physical' | 'owner'

    /** Whether to show field validation messages */
    showValidation?: boolean

    /** Maximum number of records to process */
    maxRecords?: number

    /** Whether to remove empty/blank address records from output */
    removeEmptyRecords?: boolean

    /** Whether to remove duplicate mailing labels from output */
    removeDuplicates?: boolean

    /** Whether to accept geometry from the Draw widget via custom event bridge */
    enableDrawWidgetIntegration?: boolean

    /**
     * URL of an ArcGIS GeocodeServer to power the in-widget address search.
     * Example: https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer
     * If empty, the address search panel is hidden.
     */
    geocodeUrl?: string
}

/**
 * Supported label formats
 */
export type LabelFormat = 'avery5160' | 'avery5161' | 'avery5162' | 'avery5163' | 'avery5164' | 'avery5165' | 'avery5167' | 'avery5168'

/**
 * Field mapping interface for address components
 */
export interface FieldMappings {
    /** Field for recipient name */
    name?: string

    /** Custom text for name (when no field is available) */
    nameCustomText?: string

    /** Use custom text instead of field for name */
    useCustomName?: boolean

    /** Field for first address line */
    address1?: string

    /** Field for second address line (apt, suite, etc.) */
    address2?: string

    /** Field for city */
    city?: string

    /** Field for state/province */
    state?: string

    /** Field for postal/ZIP code */
    zip?: string

    /** Field for country (optional) */
    country?: string

    /** Field for company/organization name (optional) */
    company?: string
}

/**
 * Label format specifications
 */
export interface LabelFormatSpec {
    /** Label width in points */
    width: number

    /** Label height in points */
    height: number

    /** Number of labels per row */
    labelsPerRow: number

    /** Number of rows per page */
    rowsPerPage: number

    /** Left margin in points */
    leftMargin: number

    /** Top margin in points */
    topMargin: number

    /** Horizontal spacing between labels */
    horizontalSpacing: number

    /** Vertical spacing between labels */
    verticalSpacing: number

    /** Description of the format */
    description: string
}

/**
 * Predefined label format specifications
 * Updated with accurate Avery specifications
 */
export const LABEL_FORMATS: Record<LabelFormat, LabelFormatSpec> = {
    avery5160: {
        width: 189, // 2.625 inches
        height: 72, // 1 inch
        labelsPerRow: 3,
        rowsPerPage: 10,
        leftMargin: 13.5,
        topMargin: 36,
        horizontalSpacing: 9,
        verticalSpacing: 0,
        description: 'Avery 5160 - 30 labels (2⅝" × 1")'
    },
    avery5161: {
        width: 288, // 4 inches
        height: 72, // 1 inch
        labelsPerRow: 2,
        rowsPerPage: 10,
        leftMargin: 14.25,
        topMargin: 36,
        horizontalSpacing: 13.5,
        verticalSpacing: 0,
        description: 'Avery 5161 - 20 labels (4" × 1")'
    },
    avery5162: {
        width: 288, // 4 inches
        height: 96, // 1.33 inches
        labelsPerRow: 2,
        rowsPerPage: 7,
        leftMargin: 14.25,
        topMargin: 50.4,
        horizontalSpacing: 13.5,
        verticalSpacing: 0,
        description: 'Avery 5162 - 14 labels (4" × 1⅓")'
    },
    avery5163: {
        width: 288, // 4 inches
        height: 144, // 2 inches
        labelsPerRow: 2,
        rowsPerPage: 5,
        leftMargin: 14.25,
        topMargin: 36,
        horizontalSpacing: 11.5,
        verticalSpacing: 0,
        description: 'Avery 5163 - 10 labels (4" × 2")'
    },
    avery5164: {
        width: 240, // 3.33 inches
        height: 288, // 4 inches
        labelsPerRow: 2,
        rowsPerPage: 3,
        leftMargin: 14.25,
        topMargin: 36,
        horizontalSpacing: 13.5,
        verticalSpacing: 0,
        description: 'Avery 5164 - 6 labels (3⅓" × 4")'
    },
    avery5165: {
        width: 576, // 8 inches usable
        height: 720, // 10 inches usable
        labelsPerRow: 1,
        rowsPerPage: 1,
        leftMargin: 18,
        topMargin: 36,
        horizontalSpacing: 0,
        verticalSpacing: 0,
        description: 'Avery 5165 - 1 full-sheet label (8" × 10")'
    },
    avery5167: {
        width: 126, // 1.75 inches
        height: 36, // 0.5 inches
        labelsPerRow: 4,
        rowsPerPage: 20,
        leftMargin: 21,
        topMargin: 36,
        horizontalSpacing: 22,
        verticalSpacing: 0,
        description: 'Avery 5167 - 80 return-address labels (1¾" × ½")'
    },
    avery5168: {
        width: 252, // 3.5 inches
        height: 360, // 5 inches
        labelsPerRow: 2,
        rowsPerPage: 2,
        leftMargin: 54,
        topMargin: 36,
        horizontalSpacing: 0,
        verticalSpacing: 0,
        description: 'Avery 5168 - 4 shipping labels (3½" × 5")'
    }
}

/**
 * Default widget configuration
 */
export const DEFAULT_CONFIG: Config = {
    useMapWidgetIds: [],
    selectedLayerId: '',
    ownerLayerId: '',
    selectedFields: {
        name: '',
        nameCustomText: '',
        useCustomName: false,
        address1: '',
        address2: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        company: ''
    },
    ownerFields: {
        name: '',
        nameCustomText: '',
        useCustomName: false,
        address1: '',
        address2: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        company: ''
    },
    enabledAddressTypes: {
        physical: true,
        owner: true
    },
    defaultAddressType: 'physical',
    enableGeometrySelection: true,
    selectionMethod: 'both',
    bufferEnabled: false,
    bufferDistance: 0,
    bufferUnit: 'feet',
    showValidation: true,
    maxRecords: 2000,
    removeEmptyRecords: true,
    removeDuplicates: false,
    geocodeUrl: ''
}

/**
 * Widget state interface for runtime component
 */
export interface WidgetState {
    /** Current map view */
    mapView?: any

    /** Selected layer from the map */
    selectedLayer?: any

    /** Owner layer from the map (can be same as selectedLayer) */
    ownerLayer?: any

    /** Available layers in the map */
    availableLayers: LayerInfo[]

    /** Current field mappings for physical addresses */
    selectedFields: FieldMappings

    /** Current field mappings for owner addresses */
    ownerFields: FieldMappings

    /** Available fields in the selected layer */
    availableFields: FieldInfo[]

    /** Available fields in the owner layer */
    ownerAvailableFields: FieldInfo[]

    /** Whether labels are being generated */
    isGenerating: boolean

    /** Whether drawing mode is active */
    isDrawing: boolean

    /** Selected geometries for spatial filtering */
    selectedGeometries: any[]

    /** Number of features selected */
    selectedFeatureCount: number

    /** Graphics layer for visualizations */
    graphicsLayer?: any

    /** Current drawing tool */
    currentTool: string

    /** Map connection status */
    mapConnectionStatus: 'connecting' | 'connected' | 'error' | null

    /** Error message if any */
    errorMessage?: string

    /** Drawing points for polygon creation */
    drawingPoints: any[]

    /** Active drawing graphics */
    activeDrawingGraphics: any[]

    /** User message display */
    userMessage: { type: 'success' | 'error' | 'warning' | 'info' | null, text: string }

    /** Confirmation dialog state */
    showConfirmDialog: { show: boolean, message: string, onConfirm: () => void }

    /** Buffer distance for selections */
    bufferDistance: number

    /** Buffer unit for selections */
    bufferUnit: string

    /** Highlight handles for feature highlighting */
    highlightHandles: any[]

    /** Selected features */
    selectedFeatures: any[]

    /** Current label format */
    labelFormat: LabelFormat

    /** Current font size */
    fontSize: number

    /** Whether widget is open */
    widgetOpen: boolean

    /** Current label type selection */
    labelType: 'physical' | 'owner'

    /** Validation errors */
    validationErrors: string[]

    /** Whether to remove empty/blank address records from output */
    removeEmptyRecords: boolean

    /** Whether to remove duplicate mailing labels from output */
    removeDuplicates: boolean

    /** Number of records that will be processed */
    recordCount?: number
}

/**
 * Layer information interface
 */
export interface LayerInfo {
    /** Layer ID */
    id: string

    /** Layer title/name */
    title: string

    /** Reference to the actual layer object */
    layer: any

    /** Layer type */
    type: string

    /** Whether the layer is visible */
    visible: boolean

    /** Number of features in the layer */
    featureCount?: number
}

/**
 * Field information interface
 */
export interface FieldInfo {
    /** Field name */
    name: string

    /** Field alias (display name) */
    alias: string

    /** Field data type */
    type: string

    /** Field length */
    length?: number

    /** Whether the field is nullable */
    nullable?: boolean

    /** Whether the field is editable */
    editable?: boolean
}

/**
 * PDF generation options
 */
export interface PDFOptions {
    /** Label format specification */
    format: LabelFormatSpec

    /** Font size */
    fontSize: number

    /** Include header */
    includeHeader: boolean

    /** Header text */
    headerText?: string

    /** Maximum records to process */
    maxRecords: number

    /** Field mappings to use */
    fieldMappings: FieldMappings

    /** Label type being generated */
    labelType: 'physical' | 'owner'
}

/**
 * Validation result interface
 */
export interface ValidationResult {
    /** Whether validation passed */
    isValid: boolean

    /** Array of error messages */
    errors: string[]

    /** Array of warning messages */
    warnings: string[]
}

/**
 * Immutable config type for use with jimu-core
 */
export type IMConfig = ImmutableObject<Config>