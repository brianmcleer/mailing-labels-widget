export default {
    // Widget title and main headings
    _widgetLabel: 'Mailing Labels',
    _widgetDescription: 'Generate printable mailing labels from map layer data',

    // Main widget interface
    widgetTitle: 'Mailing Label Generator',

    // Layer selection section
    selectLayerSection: 'Select Data Layer',
    selectLayerLabel: 'Choose a layer:',
    selectLayerPlaceholder: 'Select a layer...',
    noLayersAvailable: 'No feature layers available in the selected map',
    layerLoadingError: 'Error loading layers from map',

    // Layer information
    layerInfo: 'Layer Information',
    recordCount: 'Records: {count}',
    layerType: 'Type: {type}',
    layerVisible: 'Visible: {visible}',

    // Field mapping section
    fieldMappingSection: 'Map Address Fields',
    fieldMappingDescription: 'Map your data fields to address components:',
    selectFieldPlaceholder: 'Select field for {fieldType}...',
    noFieldSelected: '-- Select Field --',

    // Address field labels
    nameField: 'Recipient Name',
    nameFieldDescription: 'Full name or business name',
    address1Field: 'Address Line 1',
    address1FieldDescription: 'Street address or P.O. Box',
    address2Field: 'Address Line 2',
    address2FieldDescription: 'Apartment, suite, unit, etc. (optional)',
    cityField: 'City',
    cityFieldDescription: 'City or town name',
    stateField: 'State/Province',
    stateFieldDescription: 'State, province, or region',
    zipField: 'ZIP/Postal Code',
    zipFieldDescription: 'ZIP code or postal code',
    countryField: 'Country',
    countryFieldDescription: 'Country name (optional)',
    companyField: 'Company/Organization',
    companyFieldDescription: 'Business or organization name (optional)',

    // Field status indicators
    fieldRequired: '(Required)',
    fieldOptional: '(Optional)',
    fieldMapped: 'Mapped',
    fieldEmpty: 'Not mapped',

    // Validation messages
    validationError: 'Validation Error',
    validationWarning: 'Warning',
    validationSuccess: 'Valid',
    noFieldsSelected: 'Please select at least one address field',
    nameOrAddress1Required: 'Either Name or Address Line 1 is required',
    invalidFieldMapping: 'Invalid field mapping detected',

    // Record count and preview
    recordCountSection: 'Records to Process',
    recordsFound: 'Found {count} records in selected layer',
    recordsFiltered: '{count} records match current criteria',
    maxRecordsWarning: 'Only the first {max} records will be processed',
    noRecordsFound: 'No records found in selected layer',

    // Generate section
    generateSection: 'Generate Labels',
    generateButton: 'Generate Mailing Labels',
    generateButtonProcessing: 'Generating Labels...',
    generateButtonDisabled: 'Select fields to enable',

    // Progress indicators
    queryingData: 'Querying layer data...',
    processingRecords: 'Processing {current} of {total} records...',
    generatingPdf: 'Creating PDF document...',
    downloadReady: 'Download ready!',

    // Success messages
    generationComplete: 'Mailing labels generated successfully!',
    pdfDownloaded: 'PDF file has been downloaded',
    labelsCreated: 'Created {count} mailing labels',

    // Error messages
    generationError: 'Error generating mailing labels',
    noDataError: 'No data found in selected layer',
    queryError: 'Error querying layer data: {error}',
    pdfError: 'Error creating PDF: {error}',
    downloadError: 'Error downloading file: {error}',
    layerAccessError: 'Unable to access layer data',
    fieldAccessError: 'Unable to access field: {fieldName}',

    // Empty states
    noMapSelected: 'No Map Connected',
    noMapDescription: 'Please configure a map widget in the settings panel',
    noLayersFound: 'No Layers Available',
    noLayersDescription: 'The selected map does not contain any feature layers with data',
    selectLayerPrompt: 'Select a Layer',
    selectLayerPromptDescription: 'Choose a feature layer from your map to begin creating mailing labels',

    // Configuration hints
    configurationHint: 'Configuration Required',
    mapWidgetRequired: 'Please select a map widget in the settings panel',
    layerSelectionRequired: 'Select a data layer to continue',
    fieldMappingRequired: 'Map at least one address field to generate labels',

    // Label format information
    labelFormatInfo: 'Label Format: {format}',
    labelDimensions: 'Dimensions: {width}" × {height}"',
    labelsPerPage: '{count} labels per page',

    // Accessibility labels
    layerSelectAriaLabel: 'Select data layer for mailing labels',
    fieldMappingAriaLabel: 'Map {fieldType} field',
    generateButtonAriaLabel: 'Generate mailing labels PDF',

    // Tooltips and help text
    layerSelectTooltip: 'Choose a feature layer that contains address information',
    fieldMappingTooltip: 'Select which field contains {fieldType} data',
    generateTooltip: 'Create a PDF file with printable mailing labels',
    requiredFieldTooltip: 'This field is required for generating labels',
    optionalFieldTooltip: 'This field is optional but recommended',

    // File and download related
    defaultFileName: 'mailing-labels.pdf',
    fileGenerating: 'Generating file...',
    fileReady: 'File ready for download',

    // Confirmation messages
    confirmGenerate: 'Generate {count} mailing labels?',
    confirmLargeDataset: 'This will process {count} records. Continue?',

    // Loading states
    loadingLayers: 'Loading map layers...',
    loadingFields: 'Loading layer fields...',
    loadingData: 'Loading data...',

    // Status messages
    ready: 'Ready',
    processing: 'Processing...',
    complete: 'Complete',
    error: 'Error',
    cancelled: 'Cancelled',

    // Navigation and actions
    back: 'Back',
    next: 'Next',
    cancel: 'Cancel',
    retry: 'Retry',
    close: 'Close',
    refresh: 'Refresh',

    // Time and date formatting
    generatedOn: 'Generated on {date}',
    lastUpdated: 'Last updated: {time}',

    // Units and measurements
    inches: 'inches',
    points: 'points',
    pages: 'pages',
    records: 'records',
    labels: 'labels',

    // Common UI elements
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    save: 'Save',
    reset: 'Reset',
    clear: 'Clear',
    selectAll: 'Select All',
    selectNone: 'Select None',

    // Advanced options
    advancedOptions: 'Advanced Options',
    showAdvanced: 'Show Advanced Options',
    hideAdvanced: 'Hide Advanced Options',

    // Export options
    exportOptions: 'Export Options',
    exportFormat: 'Format: PDF',
    exportQuality: 'Quality: High',

    // Help and documentation
    help: 'Help',
    documentation: 'Documentation',
    supportedFormats: 'Supported label formats',
    troubleshooting: 'Troubleshooting',

    // Feature descriptions
    featureDescription: 'This widget allows you to create printable mailing labels from feature layer data in your map.',
    usageInstructions: 'Select a layer, map your address fields, and generate a PDF file with formatted mailing labels.',

    // Performance messages
    performanceWarning: 'Processing large datasets may take several minutes',
    optimizationTip: 'For better performance, consider filtering your data first',

    // Browser compatibility
    browserWarning: 'Some features may not work in older browsers',
    modernBrowserRecommended: 'For the best experience, use a modern web browser',
}