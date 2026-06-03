export default {
    // Widget metadata
    _widgetLabel: 'Mailing Labels',
    _widgetDescription: 'Generate printable mailing labels from map layer data with support for both physical and owner addresses',

    // Main settings sections
    mapConfigurationSection: 'Map Configuration',
    layerSelectionSection: 'Layer Selection',
    fieldMappingSection: 'Field Mapping',
    labelFormatSection: 'Label Format Settings',
    textOptionsSection: 'Text Options',
    geometrySelectionSection: 'Geometry Selection',
    advancedOptionsSection: 'Advanced Options',
    instructionsSection: 'Instructions',

    // Map configuration
    selectMapWidget: 'Select Map Widget',
    selectMapWidgetDescription: 'Choose the map widget that contains your data layers',
    noMapWidgetsAvailable: 'No map widgets available',
    mapWidgetRequired: 'A map widget is required for this widget to function',
    mapWidgetSelected: 'Map widget selected: {name}',

    // Layer selection
    selectDataLayer: 'Address Data Layer',
    selectDataLayerDescription: 'Choose the layer containing address information',
    noLayersAvailable: 'No feature layers available in the selected map',
    layerLoadingMessage: 'Loading layers... This may take up to 30 seconds for maps with many layers.',
    refreshLayers: 'Refresh Layers',
    layerNotFound: 'Selected layer not found in map',
    retryLayerLoad: 'Try Again',

    // Address type selection
    addressTypeSection: 'Address Type Configuration',
    physicalAddressFields: 'Physical Mailing Address Fields',
    ownerAddressFields: 'Owner Address Fields',
    addressTypeDescription: 'Configure field mappings for both physical addresses and owner addresses. Users can choose which type to use when generating labels.',
    physicalAddressDescription: 'Map fields for the physical/mailing address where mail should be delivered.',
    ownerAddressDescription: 'Map fields for the property owner\'s address information.',

    // Field mapping
    fieldMappingTitle: 'Field Mapping',
    fieldMappingDescription: 'Map your layer fields to address components',
    selectFieldPrompt: '-- Select Field --',

    // Address component fields
    nameField: 'Name',
    nameFieldDescription: 'Recipient or owner name',
    useCustomName: 'Use custom text instead of field',
    customNameText: 'Custom text (e.g., Current Resident, Current Tenant)',
    customNamePlaceholder: 'Enter custom text (e.g., Current Resident)',
    address1Field: 'Address 1',
    address1FieldDescription: 'Primary street address or P.O. Box',
    address2Field: 'Address 2',
    address2FieldDescription: 'Apartment, suite, unit, etc. (optional)',
    cityField: 'City',
    cityFieldDescription: 'City or town name',
    stateField: 'State',
    stateFieldDescription: 'State, province, or region',
    zipField: 'ZIP Code',
    zipFieldDescription: 'ZIP code or postal code',
    countryField: 'Country',
    countryFieldDescription: 'Country name (optional)',
    companyField: 'Company',
    companyFieldDescription: 'Business or organization name (optional)',

    // Runtime interface
    selectedLayer: 'Selected Layer',
    noLayerSelected: 'No layer selected',
    notConfigured: 'Not configured',

    // Address type selection in widget
    labelTypeSelection: 'Label Type',
    physicalMailingAddress: 'Physical Mailing Address',
    ownerAddress: 'Owner Address',
    labelTypeDescription: 'Choose which address type to use for labels',

    // Label format settings
    labelTemplate: 'Label Template',
    labelTemplateDescription: 'Choose a pre-defined label format',
    labelFormatAndFont: 'Label Format & Font',

    // Label format options
    avery5160: 'Avery 5160 (2⅝" × 1", 30 labels)',
    avery5160Description: 'Standard address labels, 3 across × 10 down',
    avery5161: 'Avery 5161 (4" × 1", 20 labels)',
    avery5161Description: 'Wide address labels, 2 across × 10 down',
    avery5162: 'Avery 5162 (4" × 1⅓", 14 labels)',
    avery5162Description: 'Large address labels, 2 across × 7 down',
    avery5163: 'Avery 5163 (4" × 2", 10 labels)',
    avery5163Description: 'Extra large labels, 2 across × 5 down',
    avery5164: 'Avery 5164 (3⅓" × 4", 6 labels)',
    avery5164Description: 'Shipping labels, 2 across × 3 down',
    customFormat: 'Custom Size',
    customFormatDescription: 'Define your own label dimensions',

    // Custom dimensions
    customDimensionsTitle: 'Custom Label Dimensions',
    labelWidth: 'Label Width',
    labelWidthDescription: 'Width of each label in points (72 points = 1 inch)',
    labelHeight: 'Label Height',
    labelHeightDescription: 'Height of each label in points (72 points = 1 inch)',
    labelsPerRow: 'Labels Per Row',
    labelsPerRowDescription: 'Number of labels across the page',
    leftMargin: 'Left Margin',
    leftMarginDescription: 'Left page margin in points',
    topMargin: 'Top Margin',
    topMarginDescription: 'Top page margin in points',
    horizontalSpacing: 'Horizontal Spacing',
    horizontalSpacingDescription: 'Space between labels horizontally',
    verticalSpacing: 'Vertical Spacing',
    verticalSpacingDescription: 'Space between labels vertically',

    // Units
    points: 'points',
    inches: 'inches',
    pointsAbbrev: 'pt',
    inchesAbbrev: 'in',
    conversionNote: '72 points = 1 inch',

    // Text options
    fontSize: 'Font Size',
    fontSizeDescription: 'Size of text on labels (6-20 points)',
    fontFamily: 'Font Family',
    fontFamilyDescription: 'Font style for label text',

    // Font options
    helvetica: 'Helvetica (Sans-serif)',
    times: 'Times (Serif)',
    courier: 'Courier (Monospace)',

    // Geometry selection
    enableGeometrySelection: 'Enable Geometry Selection',
    enableGeometrySelectionDescription: 'Allow users to select features by drawing or clicking on the map',
    selectionLayer: 'Selection Layer (for filtering)',
    selectionLayerDescription: 'Layer used for spatial selection',
    selectionMethod: 'Selection Method',
    selectionMethodDescription: 'How users can select features',
    clickToSelect: 'Click to Select',
    drawSelectionArea: 'Draw Selection Area',
    bothClickAndDraw: 'Both Click and Draw',

    // Drawing tools
    drawSelectionAreas: 'Draw Selection Areas',
    pointTool: 'Point',
    lineTool: 'Line',
    polygonTool: 'Polygon',
    rectangleTool: 'Rectangle',
    circleTool: 'Circle',
    bufferDistance: 'Buffer Distance (Optional)',
    bufferUnit: 'Buffer Unit',
    feet: 'feet',
    meters: 'meters',
    kilometers: 'kilometers',
    miles: 'miles',

    // Selection status
    selectionStatus: 'Selection Status',
    noSelection: 'No selection made',
    featuresSelected: '{count} features selected',
    selectionAreas: '{areas} selection area(s), {features} features',

    // Action buttons
    generateCSV: 'Generate CSV',
    generatePDF: 'Generate PDF',
    clearSelection: 'Clear Selection',

    // Messages and notifications
    drawingMode: '🎨 Drawing {tool}. Press ESC to cancel.',
    escapeToCancel: 'Press ESC to cancel drawing',
    escapeToReset: 'Press ESC to reset selection',

    // Generation messages
    startingGeneration: 'Starting label generation...',
    queryingFeatures: 'Querying features...',
    processingRecords: 'Processing {count} records...',
    generatingPDF: 'Generating PDF...',
    generatingCSV: 'Generating CSV...',
    generationComplete: 'Generation complete!',

    // Success messages
    csvGenerated: 'Generated {filename} with {count} mailing labels successfully!',
    pdfGenerated: 'Generated mailing_labels.pdf with {count} mailing labels successfully!',
    featuresHighlighted: '{count} features selected and highlighted.',
    selectionCleared: 'Selection cleared',
    layerVisibilityChanged: 'Layer visibility: {status}',

    // Error messages
    errorNoLayerSelected: 'No layer selected',
    errorNoFieldsConfigured: 'No {type} fields configured',
    errorPhysicalAddressFieldsNotConfigured: 'No physical address fields configured',
    errorOwnerAddressFieldsNotConfigured: 'No owner address fields configured',
    errorGenerationFailed: 'Label generation failed',
    errorPdfGenerationFailed: 'PDF generation failed. Please try CSV export instead.',
    errorCsvGenerationFailed: 'CSV generation failed',
    errorSelectionFailed: 'Failed to select features',
    errorBufferCreationFailed: 'Error creating buffer geometry',
    errorLayerQueryFailed: 'Unable to retrieve features from the layer',
    errorSpatialQueryFailed: 'The spatial query may have failed. Try selecting a larger area or use "Generate Labels" without a selection to get all features.',

    // Warning messages
    warningNoFeaturesFound: 'No features found in selection',
    warningPerformanceImpact: 'Processing large datasets may impact performance',
    warningHighlightingFailed: 'Features selected but highlighting failed. Using fallback visualization.',
    warningFallbackHighlighting: '{count} features highlighted with enhanced visualization',

    // Info messages
    paginatedQuery: 'Starting paginated query. Target: {max} records',
    queryProgress: 'Query {current}: Requesting {count} records starting at {start}',
    queryResults: 'Query {current}: Received {count} records. ExceededTransferLimit: {exceeded}',
    queryComplete: 'Query complete. No more features available.',
    fallbackQuery: 'Trying fallback query without pagination...',
    paginationComplete: 'Pagination complete. Total features collected: {count}',
    preparingLabels: 'Preparing labels for printing...',
    pdfProcessing: '📄 PDF Generation: Processing {count} features',

    // Confirmation dialogs
    generateAllFeatures: 'No selection made. Generate labels for ALL features in the layer?',
    confirmGeneration: 'Generate labels for {count} features?',
    yes: 'Yes',
    cancel: 'Cancel',

    // Header options
    includeHeader: 'Include Page Header',
    includeHeaderDescription: 'Add a header at the top of each page',
    headerText: 'Header Text',
    headerTextDescription: 'Text to display in the page header',
    headerTextPlaceholder: 'Enter header text...',

    // Advanced options
    maxRecords: 'Maximum Records',
    maxRecordsDescription: 'Limit the number of records to process',
    showValidation: 'Show Field Validation',
    showValidationDescription: 'Display validation messages for field mappings',
    showPreview: 'Show Preview',
    showPreviewDescription: 'Preview labels before generating PDF',

    // Default field mappings
    defaultFieldMappings: 'Default Field Mappings',
    defaultFieldMappingsDescription: 'Pre-select common field names when available',
    defaultNameField: 'Default Name Field',
    defaultAddress1Field: 'Default Address 1 Field',
    defaultCityField: 'Default City Field',
    defaultStateField: 'Default State Field',
    defaultZipField: 'Default ZIP Field',

    // Common field names for defaults
    commonNameFields: 'name, full_name, recipient, customer_name, contact_name, owner_name',
    commonAddressFields: 'address, street, address1, street_address, addr1, mail_address, mailing_address',
    commonCityFields: 'city, municipality, town, mail_city, mailing_city',
    commonStateFields: 'state, province, region, st, mail_state, mailing_state',
    commonZipFields: 'zip, postal_code, zipcode, postcode, mail_zip, mailing_zip',

    // Label format preview
    formatPreview: 'Format Preview',
    dimensions: 'Dimensions',
    labelsPerPage: 'Labels Per Page',
    pageSize: 'Page Size',
    margins: 'Margins',
    spacing: 'Spacing',

    // Format specifications
    width: 'Width: {value}"',
    height: 'Height: {value}"',
    totalLabels: '{count} labels per page',
    pageLayout: '{cols} columns × {rows} rows',
    leftMarginSpec: 'Left: {value} pt',
    topMarginSpec: 'Top: {value} pt',
    horizontalSpacingSpec: 'Horizontal: {value} pt',
    verticalSpacingSpec: 'Vertical: {value} pt',

    // Instructions
    instructionsTitle: 'How to Use This Widget',
    instructionsIntro: 'Follow these steps to configure the mailing labels widget:',

    step1: 'Select a map widget that contains your data layers',
    step2: 'Choose the layer containing address information',
    step3: 'Configure field mappings for both physical and owner addresses',
    step4: 'Set up geometry selection options if needed',
    step5: 'Choose your preferred label format and text options',
    step6: 'In the widget, select address type and generate labels',

    // Widget usage steps
    widgetUsageTitle: 'Using the Widget',
    widgetStep1: 'Choose between Physical Mailing Address or Owner Address',
    widgetStep2: 'Select label format and font size',
    widgetStep3: 'Optionally draw selection areas or click features to filter',
    widgetStep4: 'Click Generate CSV or Generate PDF to create labels',

    // Supported features
    supportedFeaturesTitle: 'Supported Features',
    featureMapLayers: 'Works with any feature layer in your map',
    featureFieldMapping: 'Flexible field mapping for address components',
    featureDualAddressTypes: 'Support for both physical and owner addresses',
    featureGeometrySelection: 'Interactive feature selection by drawing or clicking',
    featureMultipleFormats: 'Multiple standard label formats supported',
    featureCustomDimensions: 'Custom label sizes and layouts',
    featurePdfOutput: 'High-quality PDF output ready for printing',
    featureCsvOutput: 'CSV export for external processing',
    featureValidation: 'Field validation and error checking',
    featureResponsive: 'Mobile-friendly interface',
    featureBuffering: 'Buffer zones for spatial selection',
    featureHighlighting: 'Visual feedback for selected features',

    // Field mapping help
    fieldMappingTitle: 'Field Mapping Guide',
    fieldMappingIntro: 'Configure how your layer fields map to address components:',

    nameFieldHelp: 'Name - Recipient name or business name',
    address1FieldHelp: 'Address 1 - Primary street address or P.O. Box',
    address2FieldHelp: 'Address 2 - Apartment, suite, unit, etc. (optional)',
    cityFieldHelp: 'City - City or town name',
    stateFieldHelp: 'State - State, province, or region',
    zipFieldHelp: 'ZIP - ZIP code or postal code',
    countryFieldHelp: 'Country - Country name (optional)',
    companyFieldHelp: 'Company - Business or organization name (optional)',

    // Address type differences
    addressTypeDifferences: 'Address Type Differences',
    physicalAddressUse: 'Physical Address - Use for mailing labels where mail should be delivered',
    ownerAddressUse: 'Owner Address - Use for property owner contact information',
    fieldMappingNote: 'Both address types use the same field structure but can map to different layer fields',

    // Requirements section
    systemRequirements: 'System Requirements',
    systemRequirementMapWidget: 'A map widget must be configured',
    systemRequirementFeatureLayer: 'Map must contain at least one feature layer',
    systemRequirementAddressData: 'Layer should contain address or contact information',
    systemRequirementBrowser: 'Modern web browser with PDF support',
    systemRequirementFieldMapping: 'At least name and address1 fields should be mapped',

    // Tips and best practices
    tipsTitle: 'Tips and Best Practices',
    tipDataFilter: 'Use geometry selection to filter data and reduce processing time',
    tipFieldNames: 'Use consistent field naming conventions for easier mapping',
    tipTestPrint: 'Print a test page on plain paper before using label sheets',
    tipLabelAlignment: 'Check label alignment with your specific printer and label sheets',
    tipDataQuality: 'Ensure address data is clean and properly formatted',
    tipAddressTypes: 'Configure both address types even if you only plan to use one initially',
    tipSelection: 'Use drawing tools to select specific geographic areas for targeted mailings',
    tipBuffering: 'Add buffer distances around selection areas to include nearby features',

    // Troubleshooting
    troubleshootingTitle: 'Troubleshooting',
    troubleNoLayers: 'No layers appear: Ensure your map widget contains feature layers',
    troubleNoFields: 'No fields appear: Check that the selected layer has attribute data',
    troubleEmptyLabels: 'Empty labels: Verify field mappings and data quality',
    troubleAlignment: 'Alignment issues: Test print on plain paper first',
    troublePerformance: 'Slow performance: Use geometry selection to limit records',
    troubleSelection: 'Selection not working: Check that geometry selection is enabled',
    troubleHighlighting: 'Features not highlighting: Layer may not be visible',
    troubleLargeDatasets: 'Large datasets: Widget automatically limits to 2000 records',

    // Validation messages section
    validationMessagesTitle: 'Configuration Validation',
    validationValidMapWidget: 'Map widget configured correctly',
    validationInvalidMapWidget: 'Please select a map widget',
    validationValidLayer: 'Data layer selected',
    validationInvalidLayer: 'Please select a data layer',
    validationValidPhysicalFields: 'Physical address fields configured',
    validationInvalidPhysicalFields: 'Physical address fields need configuration',
    validationValidOwnerFields: 'Owner address fields configured',
    validationInvalidOwnerFields: 'Owner address fields need configuration',
    validationValidLabelFormat: 'Label format settings are valid',
    validationInvalidCustomDimensions: 'Custom dimensions must be greater than 0',
    validationValidTextSettings: 'Text settings are valid',
    validationInvalidFontSize: 'Font size must be between 6 and 20 points',
    validationValidGeometrySettings: 'Geometry selection configured correctly',

    // Performance information
    performanceInfoTitle: 'Performance Information',
    performanceRecordLimits: 'Record processing limits',
    performanceMaxRecordsNote: 'Maximum 2000 records per generation for optimal performance',
    performancePaginationInfo: 'Large datasets are automatically paginated',
    performanceSpatialQueryInfo: 'Spatial queries may be slower with complex geometries',
    performanceOptimizationTips: 'Tips for better performance',
    performanceFilterDataTip: 'Filter data using geometry selection',
    performanceLimitFieldsTip: 'Map only necessary fields',
    performanceSimplifyGeometryTip: 'Use simple selection shapes when possible',

    // Save and reset
    saveSettings: 'Save Settings',
    resetToDefaults: 'Reset to Defaults',
    settingsSaved: 'Settings saved successfully',
    settingsReset: 'Settings reset to defaults',

    // Confirmation dialogs
    confirmReset: 'Reset all settings to default values?',
    confirmResetDescription: 'This will overwrite your current configuration.',

    // Error handling section
    errorHandlingSavingSettings: 'Error saving settings: {error}',
    errorHandlingLoadingSettings: 'Error loading settings: {error}',
    errorHandlingInvalidConfiguration: 'Invalid configuration detected',
    errorHandlingConnectingToMap: 'Error: Could not connect to map. Try refreshing the page.',
    errorHandlingLoadingLayers: 'Error loading layers. Check console for details.',

    // Success messages section
    successConfigurationValid: 'Configuration is valid and ready to use',
    successSettingsApplied: 'Settings have been applied to the widget',
    successConnectionEstablished: 'Map connection established successfully',

    // Export/import settings
    exportSettings: 'Export Settings',
    importSettings: 'Import Settings',
    exportDescription: 'Save current settings to a file',
    importDescription: 'Load settings from a file',

    // Version information
    widgetVersion: 'Widget Version',
    compatibilityNote: 'Compatible with Experience Builder {version} and later',

    // Support information section
    supportInfoTitle: 'Support and Documentation',
    supportInfoDocumentationLink: 'View documentation',
    supportInfoContact: 'Contact support',
    supportInfoReportIssue: 'Report an issue',

    // Accessibility section
    accessibilityFeaturesTitle: 'Accessibility Features',
    accessibilityFeaturesKeyboard: 'Full keyboard navigation support',
    accessibilityFeaturesScreenReader: 'Screen reader compatibility',
    accessibilityFeaturesHighContrast: 'High contrast mode support',
    accessibilityFeaturesLabels: 'Descriptive labels for all controls',

    // Preview and testing section
    previewTestingSettings: 'Preview Settings',
    previewTestingDescription: 'See how your label format will appear',
    previewTestingConfiguration: 'Test Configuration',
    previewTestingConfigDescription: 'Verify your settings work with sample data',

    // Advanced configuration section
    advancedConfigTitle: 'Advanced Configuration',
    advancedConfigWarning: 'These settings are for advanced users only',
    advancedCustomCss: 'Custom CSS',
    advancedCustomCssDescription: 'Additional styling for labels (optional)',

    // Integration section
    integrationOptionsTitle: 'Integration Options',
    integrationWebhookSupport: 'Webhook notifications (coming soon)',
    integrationApiAccess: 'API access for automation (coming soon)',
    integrationBulkProcessing: 'Bulk processing options (coming soon)',

    // Common actions
    apply: 'Apply',
    cancel: 'Cancel',
    save: 'Save',
    reset: 'Reset',
    test: 'Test',
    preview: 'Preview',
    help: 'Help',
    close: 'Close',
    refresh: 'Refresh',
    configure: 'Configure',
    generate: 'Generate',
    clear: 'Clear',
    select: 'Select',

    // Status indicators
    on: 'ON',
    off: 'OFF',
    enabled: 'Enabled',
    disabled: 'Disabled',
    configured: 'Configured',
    notConfigured: 'Not Configured',
    connected: 'Connected',
    disconnected: 'Disconnected',
    loading: 'Loading...',
    ready: 'Ready',
    processing: 'Processing...',
    complete: 'Complete',
    failed: 'Failed',

    // File operations
    filename: 'Filename',
    filesize: 'File Size',
    download: 'Download',
    export: 'Export',
    import: 'Import',
    uploadFile: 'Upload File',
    selectFile: 'Select File',

    // Data types
    string: 'Text',
    number: 'Number',
    date: 'Date',
    boolean: 'Yes/No',
    geometry: 'Geometry',

    // Spatial operations
    intersects: 'Intersects',
    contains: 'Contains',
    within: 'Within',
    overlaps: 'Overlaps',
    buffer: 'Buffer',
    spatialRelationship: 'Spatial Relationship',

    // Coordinate systems
    webMercator: 'Web Mercator',
    wgs84: 'WGS 84',
    coordinateSystem: 'Coordinate System',
    projection: 'Projection'
}