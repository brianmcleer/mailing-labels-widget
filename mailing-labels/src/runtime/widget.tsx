import { React, AllWidgetProps, css, jsx, appActions } from 'jimu-core'
import { JimuMapViewComponent, JimuMapView } from 'jimu-arcgis'
import { Button, Alert } from 'jimu-ui'
import { SettingOutlined } from 'jimu-icons/outlined/application/setting'
import { MapOutlined } from 'jimu-icons/outlined/gis/map'
import { TrashOutlined } from 'jimu-icons/outlined/editor/trash'
import { ClearOutlined } from 'jimu-icons/outlined/editor/clear'

// Import config types - simplified, no complex owner address config
import { Config, LabelFormat, FieldMappings, LABEL_FORMATS } from '../config'

// Import ArcGIS modules - simplified to avoid conflicts
// @ts-ignore -- EB 1.21/Visual Studio misclassifies this ArcGIS 5.x declaration; webpack resolves the runtime module.
import Graphic from 'esri/Graphic'
// @ts-ignore -- EB 1.21/Visual Studio misclassifies this ArcGIS 5.x declaration; webpack resolves the runtime module.
import GraphicsLayer from 'esri/layers/GraphicsLayer'
// @ts-ignore -- EB 1.21/Visual Studio misclassifies this ArcGIS 5.x declaration; webpack resolves the runtime module.
import geometryEngine from 'esri/geometry/geometryEngine'
// @ts-ignore -- EB 1.21/Visual Studio misclassifies this ArcGIS 5.x declaration; webpack resolves the runtime module.
import Polygon from 'esri/geometry/Polygon'
// @ts-ignore -- EB 1.21/Visual Studio misclassifies this ArcGIS 5.x declaration; webpack resolves the runtime module.
import Point from 'esri/geometry/Point'
// @ts-ignore -- EB 1.21/Visual Studio misclassifies this ArcGIS 5.x declaration; webpack resolves the runtime module.
import SpatialReference from 'esri/geometry/SpatialReference'
// @ts-ignore -- EB 1.21/Visual Studio misclassifies this ArcGIS 5.x declaration; webpack resolves the runtime module.
import SketchViewModel from "esri/widgets/Sketch/SketchViewModel";
// @ts-ignore -- EB 1.21/Visual Studio misclassifies this ArcGIS declaration; webpack resolves it.
import type LayerView from 'esri/views/layers/LayerView'
// @ts-ignore -- EB 1.21/Visual Studio misclassifies this ArcGIS declaration; webpack resolves it.
import type { GraphicHit } from 'esri/views/types'
// @ts-ignore -- EB 1.21/Visual Studio misclassifies this ArcGIS declaration; webpack resolves it.
import type { ClickEvent as ViewClickEvent } from 'esri/views/input/types'
// @ts-ignore -- EB 1.21/Visual Studio misclassifies this ArcGIS declaration; webpack resolves it.
import type { CreateEvent as SketchCreateEvent } from 'esri/widgets/Sketch/types'
// NOTE: Geocoding is intentionally done with plain fetch+POST against the REST
// endpoints rather than esri/rest/locator. The locator module has a Windows-only
// casing conflict on JSAPI 5.x that breaks the very tools using it. Plain fetch
// also works around URL-length issues some networks have with searchExtent JSON.

// Import draw icons from assets folder
import PinIcon from './assets/pin.svg';
import LineIcon from './assets/line.svg';
import PolygonIcon from './assets/polygon.svg';
import RectangleIcon from './assets/rectangle.svg';
import CircleIcon from './assets/circle.svg';
import MultipointIcon from './assets/multipoint.svg';
import TrashIcon from './assets/trash.svg';

// jsPDF is declared in package.json; EB 1.21 installs widget dependencies during the client-level 'pnpm ci'.
import jsPDF from 'jspdf';

// PDF Generation
declare global {
    interface Window {
        jsPDF: any;
    }
}

type ArcGISGeometry = NonNullable<Graphic['geometry']>
type RemovableHandle = { remove: () => void }

// Experience Builder injects `id` at runtime, but the EB 1.21 editor can omit it
// from AllWidgetProps when resolving pnpm-linked declarations. This is type-only.
type RuntimeWidgetProps = AllWidgetProps<Config> & { id: string }

// Selection object to track geometry and its selected features
interface Selection {
    selectionId: string;
    geometry: ArcGISGeometry;
    featureObjectIds: number[];
    features: Graphic[];
}

// Helper functions - simplified for layer-based addresses only
function extractOwnerAddress(feature: any, fallbackFields?: any): any {
    // Simplified - only use layer-based fallback fields since no REST service
    if (fallbackFields) {
        return {
            name: fallbackFields.useCustomName && fallbackFields.nameCustomText
                ? fallbackFields.nameCustomText
                : (feature.attributes[fallbackFields.name] || ''),
            address1: feature.attributes[fallbackFields.address1] || '',
            address2: feature.attributes[fallbackFields.address2] || '',
            city: feature.attributes[fallbackFields.city] || '',
            state: feature.attributes[fallbackFields.state] || '',
            zip: feature.attributes[fallbackFields.zip] || '',
            country: feature.attributes[fallbackFields.country] || '',
            company: feature.attributes[fallbackFields.company] || ''
        }
    }

    return {
        name: '', address1: '', address2: '', city: '', state: '', zip: '', country: '', company: ''
    }
}

// Updated SimplePDFGenerator class with ACCURATE Avery specifications
class SimplePDFGenerator {
    private pageWidth = 612;  // 8.5 inches in points
    private pageHeight = 792; // 11 inches in points

    /**
     * @param startPosition  1-based label slot to start at (e.g. 5 = skip first 4 slots).
     *                       Useful for partial sheets that have already been used.
     * @param mode           'download' triggers a normal PDF save. 'print' opens the PDF
     *                       in a new tab with the print dialog primed.
     */
    generateLabelsPDF(features: any[], selectedFields: any, labelFormat: string, fontSize: number = 10, startPosition: number = 1, mode: 'download' | 'print' = 'download'): void {
        try {
            const labelSpecs = this.getLabelSpecs(labelFormat);
            const labelContent = features.map(feature => this.formatAddressLines(feature.attributes, selectedFields));
            this.createPDF(labelContent, labelSpecs, fontSize, startPosition, mode);
        } catch (error) {
            throw error;
        }
    }

    private getLabelSpecs(labelFormat: string) {
        const specs = {
            avery5160: { labelWidth: 189, labelHeight: 72, labelsPerRow: 3, labelsPerCol: 10, horizontalSpacing: 9, verticalSpacing: 0 },
            avery5161: { labelWidth: 288, labelHeight: 72, labelsPerRow: 2, labelsPerCol: 10, horizontalSpacing: 13.5, verticalSpacing: 0 },
            avery5162: { labelWidth: 288, labelHeight: 96, labelsPerRow: 2, labelsPerCol: 7, horizontalSpacing: 13.5, verticalSpacing: 0 },
            avery5163: { labelWidth: 288, labelHeight: 144, labelsPerRow: 2, labelsPerCol: 5, horizontalSpacing: 11.5, verticalSpacing: 0 },
            avery5164: { labelWidth: 240, labelHeight: 288, labelsPerRow: 2, labelsPerCol: 3, horizontalSpacing: 13.5, verticalSpacing: 0 },
            avery5165: { labelWidth: 576, labelHeight: 720, labelsPerRow: 1, labelsPerCol: 1, horizontalSpacing: 0, verticalSpacing: 0 },
            avery5167: { labelWidth: 126, labelHeight: 36, labelsPerRow: 4, labelsPerCol: 20, horizontalSpacing: 22, verticalSpacing: 0 },
            avery5168: { labelWidth: 252, labelHeight: 360, labelsPerRow: 2, labelsPerCol: 2, horizontalSpacing: 0, verticalSpacing: 0 }
        };
        return specs[labelFormat] || specs.avery5160;
    }

    private formatAddressLines(attributes: any, selectedFields: any): string[] {
        const lines = [];
        const name = this.getNameValue(attributes, selectedFields);
        const addr1 = this.getFieldValue(attributes, selectedFields.address1);
        const addr2 = this.getFieldValue(attributes, selectedFields.address2);
        const city = this.getFieldValue(attributes, selectedFields.city);
        const state = this.getFieldValue(attributes, selectedFields.state);
        const zip = this.getFieldValue(attributes, selectedFields.zip);

        if (name) lines.push(name);
        if (addr1) lines.push(addr1);
        if (addr2) lines.push(addr2);

        let cityStateZip = [city, state].filter(Boolean).join(', ');
        if (zip) cityStateZip = cityStateZip ? `${cityStateZip} ${zip}` : zip;
        if (cityStateZip) lines.push(cityStateZip);

        return lines.filter(line => line.trim()).slice(0, 4);
    }

    private getFieldValue(attributes: any, fieldName: string): string {
        return fieldName ? (attributes[fieldName] || '').toString() : '';
    }

    private getNameValue(attributes: any, fieldMappings: any): string {
        if (fieldMappings.useCustomName && fieldMappings.nameCustomText) {
            return fieldMappings.nameCustomText;
        }
        return this.getFieldValue(attributes, fieldMappings.name);
    }

    private createPDF(labelContent: string[][], specs: any, fontSize: number, startPosition: number, mode: 'download' | 'print'): void {
        const { pageWidth, pageHeight } = this;
        const { labelWidth, labelHeight, labelsPerRow, labelsPerCol, horizontalSpacing, verticalSpacing } = specs;
        const labelsPerPage = labelsPerRow * labelsPerCol;
        const lineSpacing = 2;

        // Clamp start position to a valid 0-based offset within a single sheet
        const safeStart = Math.max(1, Math.min(startPosition || 1, labelsPerPage));
        const offset = safeStart - 1;

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [pageWidth, pageHeight] });

        const totalLabelWidth = (labelsPerRow * labelWidth) + ((labelsPerRow - 1) * horizontalSpacing);
        const totalLabelHeight = (labelsPerCol * labelHeight) + ((labelsPerCol - 1) * verticalSpacing);

        const leftMargin = (pageWidth - totalLabelWidth) / 2;
        const topMargin = (pageHeight - totalLabelHeight) / 2;

        labelContent.forEach((lines, contentIndex) => {
            // Push the slot index forward so the first label lands at safeStart
            const slotIndex = contentIndex + offset;
            if (slotIndex > 0 && slotIndex % labelsPerPage === 0) {
                pdf.addPage();
            }

            const labelIndex = slotIndex % labelsPerPage;
            const row = Math.floor(labelIndex / labelsPerRow);
            const col = labelIndex % labelsPerRow;

            const x = leftMargin + col * (labelWidth + horizontalSpacing);
            const yStart = topMargin + row * (labelHeight + verticalSpacing);

            let currentFontSize = fontSize;
            let lineHeight = currentFontSize + lineSpacing;
            pdf.setFontSize(currentFontSize);

            const maxLines = Math.floor(labelHeight / lineHeight);
            const linesToRender = lines.slice(0, maxLines);

            const textBlockHeight = linesToRender.length * lineHeight;
            let y = yStart + (labelHeight - textBlockHeight) / 2 + currentFontSize;

            linesToRender.forEach(line => {
                let textToRender = line;
                const maxWidth = labelWidth - 10;
                const textWidth = pdf.getStringUnitWidth(line) * currentFontSize;
                if (textWidth > maxWidth) {
                    const estimatedCharCount = Math.floor(maxWidth / (currentFontSize * 0.6));
                    textToRender = line.substring(0, estimatedCharCount) + '…';
                }

                const trimmedWidth = pdf.getStringUnitWidth(textToRender) * currentFontSize;
                const textX = x + (labelWidth - trimmedWidth) / 2;
                pdf.text(textToRender, textX, y);
                y += lineHeight;
            });
        });

        if (mode === 'print') {
            // Prime the print dialog and open the PDF in a new tab. autoPrint() sets
            // the OpenAction so most viewers raise the print dialog automatically.
            try {
                pdf.autoPrint();
                const blobUrl = pdf.output('bloburl');
                const win = window.open(blobUrl as any, '_blank');
                if (!win) {
                    // Popup blocked - fall back to a download so the user still gets the file
                    pdf.save('mailing_labels.pdf');
                }
            } catch (_) {
                pdf.save('mailing_labels.pdf');
            }
        } else {
            pdf.save('mailing_labels.pdf');
        }
    }
}

interface State {
    mapView: JimuMapView | null
    selectedLayer: any
    ownerLayer: any  // Added separate owner layer
    isGenerating: boolean
    isDrawing: boolean
    selections: Selection[]  // Changed from selectedGeometries to track features
    selectedFeatureCount: number
    graphicsLayer: any
    currentTool: string
    mapConnectionStatus: 'connecting' | 'connected' | 'error' | null
    errorMessage: string
    drawingPoints: any[]
    activeDrawingGraphics: any[]
    multipointLocations: any[]
    userMessage: { type: 'success' | 'error' | 'warning' | 'info' | null, text: string }
    showConfirmDialog: { show: boolean, message: string, onConfirm: () => void }
    bufferDistance: number
    bufferUnit: string
    highlightHandles: RemovableHandle[]
    selectedFeatures: any[]
    // User-selectable options moved from config to state
    labelFormat: LabelFormat
    fontSize: number
    widgetOpen: boolean
    // Label type selection
    labelType: 'physical' | 'owner'
    // Remove empty records from output
    removeEmptyRecords: boolean
    // Remove duplicate labels from output
    removeDuplicates: boolean
    // Delete mode for removing individual geometries
    isDeleteMode: boolean
    // Add mode for adding individual features to existing selections
    isAddMode: boolean
    // Address search (geocoder) state
    addressSearchText: string
    addressSuggestions: Array<{ text: string, magicKey: string }>
    addressSearchLoading: boolean
    addressSuggestionsOpen: boolean
    searchedAddress: { point: any, label: string } | null
    addressSearchError: string | null
    // Output sort key (useful e.g. for zip-sorted bulk mail)
    sortBy: 'none' | 'name' | 'city' | 'state' | 'zip'
    // 1-based starting label slot on the first sheet (partial-sheet support)
    startPosition: number
    // Per-section collapsed flags. Keys = card 'key' attribute; true = collapsed.
    collapsedSections: { [k: string]: boolean }
    // Custom Format dropdown open/closed state (HTML select can't show short text
    // closed and long text open, so we render our own).
    formatDropdownOpen: boolean
}

// Generate unique IDs for form elements (WCAG accessibility)
let idCounter = 0;
const generateId = (prefix: string) => `${prefix}-${++idCounter}`;

export default class MailingLabelWidget extends React.PureComponent<RuntimeWidgetProps, State> {
    /**
     * Visual Studio can resolve React.PureComponent as an incomplete type when
     * following Experience Builder 1.21 pnpm symlinks. These declarations are
     * type-only and are erased during compilation.
     */
    declare readonly props: Readonly<RuntimeWidgetProps>
    declare state: Readonly<State>
    declare setState: (
        state: Partial<State> | ((prevState: Readonly<State>, props: Readonly<RuntimeWidgetProps>) => Partial<State> | State | null),
        callback?: () => void
    ) => void

    private drawingHandlers: any[] = []
    private sketchLayer: GraphicsLayer | null = null;
    private sketchVM: SketchViewModel | null = null;
    private deleteClickHandler: RemovableHandle | null = null;
    private addClickHandler: RemovableHandle | null = null;

    // Unique IDs for form elements (WCAG 1.3.1, 4.1.2)
    private bufferInputId = generateId('buffer-distance');
    private bufferUnitId = generateId('buffer-unit');
    private labelFormatId = generateId('label-format');
    private fontSizeId = generateId('font-size');
    private labelTypeGroupId = generateId('label-type');
    private addressSearchInputId = generateId('address-search');
    private sortById = generateId('sort-by');
    private startPositionId = generateId('start-position');

    // Address search machinery
    private suggestDebounceTimer: number | null = null;
    private suggestAbortController: AbortController | null = null;
    private addressSearchMarker: Graphic | null = null;

    // Right-Click integration. The Right-Click widget pushes an `actionPoint`
    // payload into our `mutableStateProps` via MutableStoreManager. The payload
    // looks like:
    //   { point: { x, y, spatialReference }, applyBuffer: boolean, timestamp: number, ... }
    // We dedupe by timestamp so a single right-click action only triggers one
    // selection, even though the sender does staggered retries.
    private lastActionPointTimestamp: number = 0;

    constructor(props: RuntimeWidgetProps) {
        super(props)

        // Determine which address types are enabled
        const enabledTypes = props.config?.enabledAddressTypes || { physical: true, owner: true };
        const physicalEnabled = enabledTypes.physical !== false;
        const ownerEnabled = enabledTypes.owner === true;

        // Determine the appropriate starting address type
        let initialAddressType: 'physical' | 'owner';

        if (physicalEnabled && ownerEnabled) {
            // Both enabled: use configured default
            initialAddressType = props.config?.defaultAddressType || 'physical';
        } else if (ownerEnabled) {
            // Only owner enabled
            initialAddressType = 'owner';
        } else {
            // Only physical enabled (or neither, default to physical)
            initialAddressType = 'physical';
        }

        this.state = {
            mapView: null,
            selectedLayer: null,
            ownerLayer: null,  // Added owner layer state
            isGenerating: false,
            isDrawing: false,
            selections: [],  // Changed from selectedGeometries
            selectedFeatureCount: 0,
            graphicsLayer: null,
            currentTool: '',
            mapConnectionStatus: null,
            errorMessage: '',
            drawingPoints: [],
            activeDrawingGraphics: [],
            multipointLocations: [],
            userMessage: { type: null, text: '' },
            showConfirmDialog: { show: false, message: '', onConfirm: () => { } },
            bufferDistance: 0,
            bufferUnit: 'feet',
            highlightHandles: [],
            selectedFeatures: [],
            labelFormat: 'avery5160',
            fontSize: 10,
            widgetOpen: false,
            labelType: initialAddressType,
            removeEmptyRecords: props.config?.removeEmptyRecords !== false,
            removeDuplicates: props.config?.removeDuplicates !== false,
            isDeleteMode: false,
            isAddMode: false,
            addressSearchText: '',
            addressSuggestions: [],
            addressSearchLoading: false,
            addressSuggestionsOpen: false,
            searchedAddress: null,
            addressSearchError: null,
            sortBy: 'none',
            startPosition: 1,
            // Default collapse state: only Partial sheet starts collapsed.
            collapsedSections: { 'start-position': true },
            formatDropdownOpen: false
        }
    }

    componentDidMount() {
        document.addEventListener('keydown', this.handleKeyDown);

        // Listen for external geometry from draw widget (only if enabled in config)
        if (this.props.config?.enableDrawWidgetIntegration) {
            window.addEventListener('drawWidget:mailingLabels', this.handleExternalGeometry as EventListener);

            // Check for pending geometry that was dispatched before this widget mounted
            // (e.g. when opened from a Widget Controller by the draw widget)
            this.checkPendingGeometry();
        }

        // Right-Click integration: handle the case where the Right-Click widget
        // pushed an actionPoint into our mutableStateProps before we mounted.
        // The sender does staggered retries, so this is mostly belt-and-suspenders.
        this.processRightClickAction();

        // Debug: Log the configuration to verify default address type

        if (this.props.dispatch) {
            this.props.dispatch(appActions.widgetStatePropChange(this.props.id, "state", "OPENED"));
        }
    }

    componentDidUpdate(prevProps: RuntimeWidgetProps) {
        if (this.props.state === "CLOSED" && prevProps.state !== "CLOSED") {
            this.handleWidgetClose();
        }
        if (this.props.state === "OPENED" && prevProps.state !== "OPENED") {
            this.handleWidgetReopen();
        }

        // Check if layer configuration changed
        if ((prevProps.config?.selectedLayerId !== this.props.config?.selectedLayerId ||
            prevProps.config?.ownerLayerId !== this.props.config?.ownerLayerId) && this.state.mapView) {
            this.findSelectedLayer(this.state.mapView)
        }

        // Check if address type configuration changed
        const prevEnabledTypes = prevProps.config?.enabledAddressTypes || { physical: true, owner: true };
        const currentEnabledTypes = this.props.config?.enabledAddressTypes || { physical: true, owner: true };

        if (prevEnabledTypes.physical !== currentEnabledTypes.physical ||
            prevEnabledTypes.owner !== currentEnabledTypes.owner ||
            prevProps.config?.defaultAddressType !== this.props.config?.defaultAddressType) {

            const physicalEnabled = currentEnabledTypes.physical !== false;
            const ownerEnabled = currentEnabledTypes.owner === true;

            let newAddressType: 'physical' | 'owner';

            if (physicalEnabled && ownerEnabled) {
                // Both enabled: use configured default
                newAddressType = this.props.config?.defaultAddressType || 'physical';
            } else if (ownerEnabled) {
                // Only owner enabled
                newAddressType = 'owner';
            } else {
                // Only physical enabled
                newAddressType = 'physical';
            }

            this.setState({ labelType: newAddressType });
        }

        // Handle draw widget integration toggle changes
        if (prevProps.config?.enableDrawWidgetIntegration !== this.props.config?.enableDrawWidgetIntegration) {
            if (this.props.config?.enableDrawWidgetIntegration) {
                window.addEventListener('drawWidget:mailingLabels', this.handleExternalGeometry as EventListener);
                this.checkPendingGeometry();
            } else {
                window.removeEventListener('drawWidget:mailingLabels', this.handleExternalGeometry as EventListener);
            }
        }

        // Right-Click integration: check for a new actionPoint pushed via
        // MutableStoreManager. Dedupe inside processRightClickAction by
        // timestamp so the sender's staggered retries don't double-fire.
        this.processRightClickAction();
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleKeyDown)
        window.removeEventListener('drawWidget:mailingLabels', this.handleExternalGeometry as EventListener);
        this.clearDrawingHandlers()

        // Cancel any in-flight geocode request and pending debounce
        if (this.suggestAbortController) {
            this.suggestAbortController.abort();
            this.suggestAbortController = null;
        }
        if (this.suggestDebounceTimer !== null) {
            window.clearTimeout(this.suggestDebounceTimer);
            this.suggestDebounceTimer = null;
        }

        // Reset cursor if delete mode was active
        if (this.state.isDeleteMode && this.state.mapView?.view) {
            this.state.mapView.view.container.style.cursor = 'default';
        }
        
        // Remove delete click handler
        if (this.deleteClickHandler) {
            this.deleteClickHandler.remove();
            this.deleteClickHandler = null;
        }

        this.handleWidgetClose()

        if (this.state.graphicsLayer && this.state.mapView?.view?.map) {
            this.state.mapView.view.map.remove(this.state.graphicsLayer)
        }

        if (this.sketchLayer && this.state.mapView?.view?.map) {
            this.state.mapView.view.map.remove(this.sketchLayer)
        }
    }

    handleWidgetClose = () => {
        const jmv = this.state.mapView;

        if (jmv?.view) {
            const view = jmv.view;

            // Clean up delete mode if active
            if (this.state.isDeleteMode) {
                
                // Remove delete click handler
                if (this.deleteClickHandler) {
                    this.deleteClickHandler.remove();
                    this.deleteClickHandler = null;
                }
                
                // Reset cursor
                view.container.style.cursor = 'default';
                
                // Update state
                this.setState({ isDeleteMode: false });
            }

            // Clean up add mode if active
            if (this.state.isAddMode) {
                
                // Remove add click handler
                if (this.addClickHandler) {
                    this.addClickHandler.remove();
                    this.addClickHandler = null;
                }
                
                // Reset cursor
                view.container.style.cursor = 'default';
                
                // Update state
                this.setState({ isAddMode: false });
            }

            view.popupEnabled = true;

            if (view.popup) {
                if ("autoCloseEnabled" in view.popup) {
                    view.popup.autoCloseEnabled = true;
                }
                // Re-enable auto-open for popups
                view.popup.autoOpenEnabled = true;
            }

            this.clearAllHighlights();

            view.highlightOptions = {
                color: [0, 255, 255, 1],
                fillOpacity: 0.0,
                haloOpacity: 0.8
            };

            view.map.layers.forEach(layer => {
                view.whenLayerView(layer).then((layerView: LayerView) => {
                    if (layer.type === "feature") {
                        const featureLayerView = layerView as any;
                        if ("highlightOptions" in featureLayerView) {
                            featureLayerView.highlightOptions = {
                                color: [0, 255, 255, 1],
                                fillOpacity: 0.0,
                                haloOpacity: 0.8
                            };
                        }
                    }
                });
            });

            view.graphics.removeAll();
        }

        this.resetWidgetState();
        this.setState({
            widgetOpen: false
        });
    };

    handleWidgetReopen = () => {
        const { mapView } = this.state;

        if (mapView?.view) {
            const view = mapView.view;

            view.popupEnabled = false;

            if (view.popup && "autoCloseEnabled" in view.popup) {
                view.popup.autoCloseEnabled = false;
            }

            view.popup.visible = false;

            try {
                if (view.popup.viewModel?.clear) {
                    view.popup.viewModel.clear();
                } else if (view.popup.viewModel?.features?.length) {
                    view.popup.viewModel.features.splice(0);
                }
            } catch (err) {
                // Handle silently
            }

            view.highlightOptions = {
                color: [0, 0, 0, 0],
                fillOpacity: 0,
                haloOpacity: 0
            };

            view.map.layers.forEach(layer => {
                view.whenLayerView(layer).then((layerView: LayerView) => {
                    if (layer.type === "feature") {
                        const featureLayerView = layerView as any;
                        if ("highlightOptions" in featureLayerView) {
                            featureLayerView.highlightOptions = {
                                color: [0, 0, 0, 0],
                                fillOpacity: 0,
                                haloOpacity: 0
                            };
                        }
                    }
                });
            });

            view.graphics.removeAll();
        }

        this.setState({
            widgetOpen: true
        });
    };

    resetWidgetState = () => {
        if (this.state.isDrawing) {
            this.cancelDrawing();
        }

        this.clearAllHighlights();

        if (this.state.graphicsLayer) {
            this.state.graphicsLayer.removeAll();
        }

        if (this.sketchLayer) {
            this.sketchLayer.removeAll();
        }

        this.setState({
            selections: [],
            selectedFeatureCount: 0,
            isDrawing: false,
            currentTool: '',
            drawingPoints: [],
            activeDrawingGraphics: [],
            multipointLocations: [],
            userMessage: { type: null, text: '' }
        });
    };

    escapeHtml = (text: string): string => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    clearAllHighlights = () => {
        this.state.highlightHandles.forEach((handle, index) => {
            if (handle && typeof handle.remove === 'function') {
                try {
                    handle.remove();
                } catch (error) {
                    // Handle silently
                }
            }
        });

        if (this.state.graphicsLayer) {
            const graphicsToRemove = this.state.graphicsLayer.graphics.filter(graphic =>
                graphic.attributes && graphic.attributes.isHighlight
            );

            graphicsToRemove.forEach(graphic => {
                this.state.graphicsLayer.remove(graphic);
            });
        }

        this.setState({
            highlightHandles: [],
            selectedFeatures: []
        });
    }

    addFallbackHighlightGraphics = (features: any[]) => {
        if (!features || !features.length || !this.state.graphicsLayer) {
            return;
        }

        features.forEach((feature, index) => {
            if (feature.geometry) {
                const highlightGraphic = new Graphic({
                    geometry: feature.geometry,
                    symbol: this.getFallbackHighlightSymbol(feature.geometry.type),
                    attributes: {
                        isHighlight: true,
                        originalObjectId: feature.attributes[this.state.selectedLayer.objectIdField]
                    }
                });

                this.state.graphicsLayer.add(highlightGraphic);
            }
        });

        this.showMessage('success', `${features.length} features highlighted with enhanced visualization`);
    }

    highlightSelectedFeatures = async (features: any[]) => {
        if (!this.state.mapView?.view || !this.state.selectedLayer || !features.length) {
            return;
        }

        try {
            this.clearAllHighlights();

            const originalVisibility = this.state.selectedLayer.visible;
            if (!this.state.selectedLayer.visible) {
                this.state.selectedLayer.visible = true;
            }

            const layerView = await this.state.mapView.view.whenLayerView(this.state.selectedLayer);

            if (!layerView) {
                this.state.selectedLayer.visible = originalVisibility;
                return;
            }

            const highlightHandle = layerView.highlight(features);

            if (!originalVisibility) {
                this.state.selectedLayer.visible = originalVisibility;
            }

            if (highlightHandle) {
                this.setState({
                    highlightHandles: [highlightHandle],
                    selectedFeatures: features
                });

                this.addFallbackHighlightGraphics(features);
            } else {
                this.state.selectedLayer.visible = originalVisibility;
                this.addFallbackHighlightGraphics(features);
            }
        } catch (error) {
            this.showMessage('warning', 'Features selected but highlighting failed. Using fallback visualization.');
            this.addFallbackHighlightGraphics(features);
        }
    }

    getFallbackHighlightSymbol = (geometryType: string): any => {
        switch (geometryType) {
            case 'point':
                return {
                    type: "simple-marker" as const,
                    color: [255, 255, 0, 0.8],
                    size: 12,
                    outline: {
                        color: [255, 0, 0, 1],
                        width: 3
                    }
                };
            case 'polyline':
                return {
                    type: "simple-line" as const,
                    color: [255, 0, 0, 0.9],
                    width: 4,
                    style: "solid" as const
                };
            case 'polygon':
            default:
                return {
                    type: "simple-fill" as const,
                    color: [255, 255, 0, 0.3],
                    outline: {
                        color: [255, 0, 0, 0.9],
                        width: 3,
                        style: "solid" as const
                    }
                };
        }
    }

    showMessage = (type: 'success' | 'error' | 'warning' | 'info', text: string) => {
        this.setState({ userMessage: { type, text } })
        setTimeout(() => {
            this.setState({ userMessage: { type: null, text: '' } })
        }, 5000)
    }

    toggleSection = (key: string) => {
        this.setState(prev => ({
            collapsedSections: { ...prev.collapsedSections, [key]: !prev.collapsedSections[key] }
        }));
    }

    showConfirmDialog = (message: string, onConfirm: () => void) => {
        this.setState({
            showConfirmDialog: { show: true, message, onConfirm }
        })
    }

    hideConfirmDialog = () => {
        this.setState({
            showConfirmDialog: { show: false, message: '', onConfirm: () => { } }
        })
    }

    confirmAndExecute = () => {
        this.state.showConfirmDialog.onConfirm()
        this.hideConfirmDialog()
    }

    handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && this.state.isDrawing) {
            this.cancelDrawing()
        }
        if (event.key === 'Escape' && this.state.widgetOpen) {
            this.resetWidgetState();
        }
    }

    onActiveViewChange = (jimuMapView: JimuMapView) => {
        if (jimuMapView) {
            const view = jimuMapView.view;

            view.popupEnabled = false;

            if (view.popup && "autoCloseEnabled" in view.popup) {
                view.popup.autoCloseEnabled = false;
            }

            view.highlightOptions = {
                color: [0, 0, 0, 0],
                fillOpacity: 0,
                haloOpacity: 0
            };

            view.map.layers.forEach(layer => {
                view.whenLayerView(layer).then((layerView: LayerView) => {
                    try {
                        const layerType = layer.type;

                        if (layerType === "feature") {
                            const featureLayerView = layerView as any;
                            if (typeof featureLayerView.highlight === "function") {
                                const highlightHandle = featureLayerView.highlight([]);
                                highlightHandle.remove();

                                if (featureLayerView.hasOwnProperty("_highlightIds")) {
                                    featureLayerView._highlightIds = {};
                                }
                            }
                        }

                        if ("featureEffect" in layerView) {
                            (layerView as any).featureEffect = null;
                        }

                        if ("filter" in layerView) {
                            (layerView as any).filter = null;
                        }

                        if (typeof (layerView as any).refresh === "function") {
                            (layerView as any).refresh();
                        }
                    } catch (err) {
                        // Handle silently
                    }
                }).catch(err => {
                    // Handle silently
                });
            });

            this.setState({
                mapView: jimuMapView,
                mapConnectionStatus: 'connected',
                widgetOpen: true
            })

            this.initializeMapFeatures(jimuMapView)
        } else {
            this.setState({
                mapView: null,
                mapConnectionStatus: null,
                widgetOpen: false
            })
        }
    }

    /**
     * Handle geometry sent from the draw widget via custom event.
     * Processes it exactly like a completed sketch: buffer → query → highlight → select.
     */
    /**
     * Check for geometry that was dispatched before this widget mounted
     * (handles Widget Controller / sidebar timing issue)
     */
    checkPendingGeometry = () => {
        const pending = (window as any).__pendingMailingLabelsGeometry;
        if (pending) {
            // Small delay to ensure mapView is initialized
            setTimeout(() => {
                if ((window as any).__pendingMailingLabelsGeometry) {
                    this.handleExternalGeometry(
                        new CustomEvent('drawWidget:mailingLabels', {
                            detail: { geometry: (window as any).__pendingMailingLabelsGeometry }
                        })
                    );
                }
            }, 500);
        }
    };

    // Right-Click widget integration. The Right-Click widget pushes an action
    // payload into our `mutableStateProps.actionPoint` via MutableStoreManager.
    // We read it here, dedupe by timestamp, apply the user's buffer choice to
    // state, and then route the point through the existing handleExternalGeometry
    // pipeline so all the downstream selection / highlight / query logic is
    // reused unchanged.
    //
    // Payload shape (from Right-Click widget):
    //   {
    //     point:          { x, y, spatialReference },
    //     applyBuffer:    boolean,
    //     bufferDistance: number | null,   // only meaningful when applyBuffer === true
    //     bufferUnit:     'feet' | 'meters' | 'kilometers' | 'miles',
    //     timestamp:      number
    //   }
    //
    // Buffer-choice semantics:
    //   applyBuffer === false → force bufferDistance to 0 for this selection.
    //   applyBuffer === true  → use the distance/unit the user typed in the dialog.
    //                           Falls back to whatever the widget currently has if
    //                           the sender omitted the values (older sender, or a
    //                           future code path).
    private processRightClickAction = () => {
        try {
            const actionData = (this.props as any).mutableStateProps?.actionPoint;
            if (!actionData || !actionData.point) return;

            const { point: pointData, applyBuffer, bufferDistance: payloadBufferDistance, bufferUnit: payloadBufferUnit, timestamp } = actionData;

            // Dedupe — the sender does staggered retries (200ms / 800ms / 1500ms)
            // to handle the case where the widget hasn't fully mounted yet.
            if (typeof timestamp !== 'number' || timestamp === this.lastActionPointTimestamp) return;

            // If the map view isn't ready yet, defer. The sender's retry pulses
            // will normally rescue us — but we also stash a one-shot timer just
            // in case this is the last retry and the map is mid-init.
            if (!this.state.mapView?.view) {
                window.setTimeout(() => this.processRightClickAction(), 400);
                return;
            }

            this.lastActionPointTimestamp = timestamp;

            // Rebuild the ArcGIS Point from the serialized payload. The Right-Click
            // widget captures mapPoint directly off the map view, so the SR is
            // already in the map's SR — no projection needed.
            const actionPoint = new Point({
                x: pointData.x,
                y: pointData.y,
                spatialReference: pointData.spatialReference
                    ? new SpatialReference(pointData.spatialReference)
                    : new SpatialReference({ wkid: 4326 })
            });

            // Decide the buffer to use for THIS selection, based on the dialog.
            const currentBuffer = this.state.bufferDistance;
            const currentUnit = this.state.bufferUnit;
            let nextBufferDistance: number;
            let nextBufferUnit: string = currentUnit;

            if (applyBuffer === false) {
                // "Cancel buffer" → force off; keep the unit untouched so the
                // user's UI doesn't visibly snap to something unexpected.
                nextBufferDistance = 0;
            } else if (applyBuffer === true) {
                // The sender supplies the typed distance + unit. Validate
                // defensively — if anything looks off, fall back to the
                // widget's current values rather than crashing the selection.
                if (typeof payloadBufferDistance === 'number' && isFinite(payloadBufferDistance) && payloadBufferDistance > 0) {
                    nextBufferDistance = payloadBufferDistance;
                } else {
                    nextBufferDistance = currentBuffer > 0 ? currentBuffer : 100;
                }
                if (typeof payloadBufferUnit === 'string' &&
                    (payloadBufferUnit === 'feet' || payloadBufferUnit === 'meters' ||
                     payloadBufferUnit === 'kilometers' || payloadBufferUnit === 'miles')) {
                    nextBufferUnit = payloadBufferUnit;
                }
            } else {
                // applyBuffer not specified (older sender) → leave as-is.
                nextBufferDistance = currentBuffer;
            }

            // Make sure the widget is in its open/ready state.
            const needsWidgetOpen = !this.state.widgetOpen;

            // Apply the buffer choice, THEN dispatch the synthetic geometry event
            // inside the setState callback so handleExternalGeometry sees the
            // updated bufferDistance / bufferUnit when it reads this.state.
            this.setState(
                {
                    bufferDistance: nextBufferDistance,
                    bufferUnit: nextBufferUnit,
                    ...(needsWidgetOpen ? { widgetOpen: true } : {})
                },
                () => {
                    this.handleExternalGeometry(
                        new CustomEvent('drawWidget:mailingLabels', {
                            detail: { geometry: actionPoint }
                        })
                    );
                }
            );
        } catch (err) {
            console.error('Mailing Labels: Error processing right-click action', err);
        }
    };

    handleExternalGeometry = async (event: CustomEvent) => {

        const geometry = event.detail?.geometry;
        if (!geometry) {
            return;
        }

        // Clear the pending geometry flag so it's not processed again
        (window as any).__pendingMailingLabelsGeometry = null;

        const view = this.state.mapView?.view;
        if (!view) {
            this.showMessage('error', 'Map is not ready. Please open the map first and try again.');
            return;
        }

        const layer = this.getCurrentActiveLayer();
        if (!layer) {
            this.showMessage('error', 'No parcel layer configured. Open the Mailing Labels widget settings and select a layer.');
            return;
        }


        // Ensure the widget is in an open/ready state
        if (!this.state.widgetOpen) {
            this.setState({ widgetOpen: true });
        }

        // Cancel any active sketch drawing
        if (this.sketchVM) {
            try { this.sketchVM.cancel(); } catch { /* no-op */ }
        }

        // Clear previous selection
        if (this.sketchLayer) {
            this.sketchLayer.removeAll();
        }
        this.clearAllHighlights();

        const { bufferDistance, bufferUnit } = this.state;
        let bufferedGeometry = geometry;

        // Generate unique selection ID
        const selectionId = `selection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        (bufferedGeometry as any).selectionId = selectionId;

        // Apply buffer if configured
        if (bufferDistance > 0) {
            try {
                const isGeographic = view.spatialReference?.isWGS84 || view.spatialReference?.isWebMercator;
                let bufferResult = isGeographic
                    ? geometryEngine.geodesicBuffer(geometry, bufferDistance, bufferUnit as any)
                    : geometryEngine.buffer(geometry, bufferDistance, bufferUnit as any);

                if (Array.isArray(bufferResult)) {
                    bufferResult = bufferResult[0];
                }

                bufferedGeometry = bufferResult;
                (bufferedGeometry as any).selectionId = selectionId;

                // Show buffer area graphic (blue)
                if (this.sketchLayer) {
                    this.sketchLayer.add(new Graphic({
                        geometry: bufferedGeometry,
                        symbol: {
                            type: 'simple-fill',
                            color: [0, 0, 255, 0.1],
                            outline: { color: [0, 0, 255, 0.8], width: 2 }
                        },
                        attributes: { selectionId: selectionId }
                    }));

                    // Show original geometry (orange)
                    let originalSymbol: any;
                    if (geometry.type === 'point') {
                        originalSymbol = {
                            type: 'simple-marker',
                            color: [255, 140, 0, 0.8],
                            size: 10,
                            outline: { color: [255, 140, 0, 1], width: 2 }
                        };
                    } else if (geometry.type === 'polyline') {
                        originalSymbol = {
                            type: 'simple-line',
                            color: [255, 140, 0, 1],
                            width: 3
                        };
                    } else {
                        originalSymbol = {
                            type: 'simple-fill',
                            color: [255, 140, 0, 0.2],
                            outline: { color: [255, 140, 0, 1], width: 2 }
                        };
                    }

                    this.sketchLayer.add(new Graphic({
                        geometry: geometry,
                        symbol: originalSymbol,
                        attributes: { selectionId: selectionId }
                    }));
                }
            } catch (err) {
                this.showMessage('error', 'Error creating buffer geometry.');
                return;
            }
        } else {
            // No buffer — show the geometry as selection area
            if (this.sketchLayer) {
                this.sketchLayer.add(new Graphic({
                    geometry: geometry,
                    symbol: {
                        type: 'simple-fill',
                        color: [0, 0, 255, 0.1],
                        outline: { color: [0, 0, 255, 0.8], width: 2 }
                    },
                    attributes: { selectionId: selectionId }
                }));
            }
        }

        // Query features
        try {
            const query = layer.createQuery();
            query.geometry = bufferedGeometry;
            query.spatialRelationship = 'intersects';
            query.returnGeometry = true;
            query.outFields = ['*'];

            const result = await layer.queryFeatures(query);

            if (result.features && result.features.length > 0) {
                await this.highlightSelectedFeatures(result.features);
            } else {
                this.clearAllHighlights();
            }

            // Create Selection object with features
            const objectIdField = layer.objectIdField || 'OBJECTID';
            const selection: Selection = {
                selectionId: selectionId,
                geometry: bufferedGeometry,
                featureObjectIds: result.features?.map(f => f.attributes[objectIdField]) || [],
                features: result.features || []
            };

            this.setState({
                selections: [selection],
                selectedFeatureCount: result.features?.length || 0,
                isDrawing: false,
                currentTool: ''
            });

            this.showMessage('success', `${result.features?.length || 0} features selected from drawing geometry.`);
        } catch (err) {
            console.error('[Mailing Labels] Query failed for external geometry:', err);
            this.showMessage('error', 'Failed to select features from drawing geometry.');
        }
    };

    initializeMapFeatures = async (jimuMapView: JimuMapView) => {
        try {
            await jimuMapView.view.when();

            const view = jimuMapView.view;

            view.popupEnabled = false;
            view.highlightOptions = {
                color: [0, 0, 0, 0],
                fillOpacity: 0,
                haloOpacity: 0
            };

            this.sketchLayer = new GraphicsLayer({ title: 'Sketch Layer', listMode: 'hide' });
            view.map.add(this.sketchLayer);

            this.sketchVM = new SketchViewModel({
                view: view,
                layer: this.sketchLayer
            });

            this.sketchVM.on("create", async (event: SketchCreateEvent) => {
                if (event.state !== "complete") return;

                const { bufferDistance, bufferUnit } = this.state;
                const geometry = event.graphic.geometry;
                const layer = this.getCurrentActiveLayer(); // Use current active layer based on address type

                if (!geometry || !view || !layer) {
                    return;
                }

                this.sketchLayer!.removeAll();

                let bufferedGeometry = geometry;

                if (bufferDistance > 0) {
                    try {
                        const isGeographic = view.spatialReference?.isWGS84 || view.spatialReference?.isWebMercator;
                        let bufferResult = isGeographic
                            ? geometryEngine.geodesicBuffer(geometry, bufferDistance, bufferUnit as any)
                            : geometryEngine.buffer(geometry, bufferDistance, bufferUnit as any);

                        if (Array.isArray(bufferResult)) {
                            bufferResult = bufferResult[0];
                        }

                        bufferedGeometry = bufferResult;

                        // Generate unique ID for this selection
                        const selectionId = `selection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        (bufferedGeometry as any).selectionId = selectionId;

                        // Add buffer area graphic (blue)
                        this.sketchLayer!.add(new Graphic({
                            geometry: bufferedGeometry,
                            symbol: {
                                type: 'simple-fill',
                                color: [0, 0, 255, 0.1],
                                outline: { color: [0, 0, 255, 0.8], width: 2 }
                            },
                            attributes: {
                                selectionId: selectionId
                            }
                        }));

                        // Add original drawn geometry graphic (orange)
                        // Use appropriate symbol based on geometry type
                        let originalSymbol: any;
                        if (geometry.type === 'point') {
                            originalSymbol = {
                                type: 'simple-marker',
                                color: [255, 140, 0, 0.8],
                                size: 10,
                                outline: { color: [255, 140, 0, 1], width: 2 }
                            };
                        } else if (geometry.type === 'polyline') {
                            originalSymbol = {
                                type: 'simple-line',
                                color: [255, 140, 0, 1],
                                width: 3
                            };
                        } else {
                            originalSymbol = {
                                type: 'simple-fill',
                                color: [255, 140, 0, 0.2],
                                outline: { color: [255, 140, 0, 1], width: 2 }
                            };
                        }

                        this.sketchLayer!.add(new Graphic({
                            geometry: geometry,
                            symbol: originalSymbol,
                            attributes: {
                                selectionId: selectionId
                            }
                        }));
                    } catch (err) {
                        this.showMessage('error', 'Error creating buffer geometry.');
                        return;
                    }
                } else {
                    // Generate unique ID for this selection
                    const selectionId = `selection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    (geometry as any).selectionId = selectionId;
                    
                    const styledGraphic = new Graphic({
                        geometry: geometry,
                        symbol: {
                            type: 'simple-fill',
                            color: [0, 0, 255, 0.1],
                            outline: {
                                color: [0, 0, 255, 0.8],
                                width: 2
                            }
                        },
                        attributes: {
                            selectionId: selectionId
                        }
                    });
                    this.sketchLayer!.add(styledGraphic);
                    bufferedGeometry = geometry;
                }

                try {
                    const query = layer.createQuery();
                    query.geometry = bufferedGeometry;
                    query.spatialRelationship = 'intersects';
                    query.returnGeometry = true;
                    query.outFields = ['*'];

                    const result = await layer.queryFeatures(query);

                    if (result.features && result.features.length > 0) {
                        await this.highlightSelectedFeatures(result.features);
                    } else {
                        this.clearAllHighlights();
                    }

                    // Create Selection object with geometry and features
                    const selectionId = (bufferedGeometry as any).selectionId;
                    const objectIdField = layer.objectIdField || 'OBJECTID';
                    
                    const selection: Selection = {
                        selectionId: selectionId,
                        geometry: bufferedGeometry,
                        featureObjectIds: result.features?.map(f => f.attributes[objectIdField]) || [],
                        features: result.features || []
                    };

                    this.setState({
                        selections: [selection],  // Store as Selection object
                        selectedFeatureCount: result.features?.length || 0,
                        isDrawing: false,
                        currentTool: ''
                    });

                    this.showMessage('success', `${result.features?.length || 0} features selected and highlighted.`);
                } catch (err) {
                    this.showMessage('error', 'Failed to select features.');
                }
            });

            this.findSelectedLayer(jimuMapView);
            this.setupGraphicsLayer(jimuMapView);

        } catch (error) {
            this.setState({
                mapConnectionStatus: 'error',
                errorMessage: 'Failed to initialize map features'
            });
        }
    }

    findSelectedLayer = (jimuMapView: JimuMapView) => {
        const { selectedLayerId, ownerLayerId } = this.props.config || {}


        // Find physical address layer
        if (selectedLayerId && jimuMapView.view) {
            const physicalLayer = jimuMapView.view.map.findLayerById(selectedLayerId)
            if (physicalLayer) {
                this.setState({ selectedLayer: physicalLayer })
            } else {
            }
        }

        // Find owner address layer
        if (ownerLayerId && jimuMapView.view) {
            const ownerLayer = jimuMapView.view.map.findLayerById(ownerLayerId)
            if (ownerLayer) {
                this.setState({ ownerLayer: ownerLayer })
            } else {
            }
        }

        // If no specific owner layer is set, use the same layer for both
        if (!ownerLayerId && selectedLayerId) {
            const sharedLayer = jimuMapView.view.map.findLayerById(selectedLayerId)
            if (sharedLayer) {
                this.setState({
                    selectedLayer: sharedLayer,
                    ownerLayer: sharedLayer
                })
            }
        }
    }

    setupGraphicsLayer = (jimuMapView: JimuMapView) => {
        const { enableGeometrySelection } = this.props.config || {}

        if (!enableGeometrySelection) {
            return
        }

        try {
            const graphicsLayer = new GraphicsLayer({
                title: 'Mailing Label Selection Graphics',
                listMode: 'hide'
            })
            jimuMapView.view.map.add(graphicsLayer)

            this.setState({ graphicsLayer })

            const { selectionMethod } = this.props.config || {}
            if (selectionMethod === 'click' || selectionMethod === 'both') {
                jimuMapView.view.on('click', (event: ViewClickEvent) => {
                    if (this.state.widgetOpen) {
                        event.stopPropagation();
                        this.onMapClick(event);
                    }
                });
            }

        } catch (error) {
            // Handle silently
        }
    }

    startDrawing = (tool: 'polygon' | 'rectangle' | 'circle') => {
        if (!this.state.mapView?.view || this.state.isDrawing) {
            return
        }

        this.setState({
            isDrawing: true,
            currentTool: tool,
            drawingPoints: [],
            activeDrawingGraphics: []
        })

        this.clearDrawingHandlers()

        switch (tool) {
            case 'polygon':
                this.startPolygonDrawing()
                break
            case 'rectangle':
                this.startRectangleDrawing()
                break
            case 'circle':
                this.startCircleDrawing()
                break
        }
    }

    startPolygonDrawing = () => {
        const view = this.state.mapView!.view

        const clickHandler = view.on('click', (event: any) => {
            if (this.state.widgetOpen) {
                event.stopPropagation();
            }

            try {
                const mapPoint = view.toMap({
                    x: event.x,
                    y: event.y
                })

                if (mapPoint && mapPoint.x !== undefined && mapPoint.y !== undefined) {
                    const points = [...this.state.drawingPoints, [mapPoint.x, mapPoint.y]]
                    this.setState({ drawingPoints: points })

                    this.addPointGraphic(mapPoint)
                    this.updatePolygonPreview(points)
                }
            } catch (error) {
                // Handle silently
            }
        })

        const doubleClickHandler = view.on('double-click', (event: any) => {
            if (this.state.widgetOpen) {
                event.stopPropagation();
            }

            if (this.state.drawingPoints.length >= 3) {
                this.finishPolygonDrawing()
            } else {
                this.showMessage('warning', 'Need at least 3 points for a polygon')
                this.cancelDrawing()
            }
        })

        this.drawingHandlers = [clickHandler, doubleClickHandler]
    }

    startRectangleDrawing = () => {
        const view = this.state.mapView!.view
        let startPoint: any = null
        let isMouseDown = false

        const pointerDownHandler = view.on('pointer-down', (event: any) => {
            const mapPoint = view.toMap({
                x: event.x,
                y: event.y
            })
            if (mapPoint && mapPoint.x !== undefined && mapPoint.y !== undefined) {
                startPoint = mapPoint
                isMouseDown = true
            }
        })

        const pointerMoveHandler = view.on('pointer-move', (event: any) => {
            if (!isMouseDown || !startPoint) return

            const mapPoint = view.toMap({
                x: event.x,
                y: event.y
            })
            if (mapPoint && mapPoint.x !== undefined && mapPoint.y !== undefined) {
                this.updateRectanglePreview(startPoint, mapPoint)
            }
        })

        const pointerUpHandler = view.on('pointer-up', (event: any) => {
            if (!isMouseDown || !startPoint) return

            const mapPoint = view.toMap({
                x: event.x,
                y: event.y
            })
            if (mapPoint && mapPoint.x !== undefined && mapPoint.y !== undefined) {
                this.finishRectangleDrawing(startPoint, mapPoint)
            }
        })

        this.drawingHandlers = [pointerDownHandler, pointerMoveHandler, pointerUpHandler]
    }

    startCircleDrawing = () => {
        const view = this.state.mapView!.view
        let centerPoint: any = null
        let isMouseDown = false

        const pointerDownHandler = view.on('pointer-down', (event: any) => {
            const mapPoint = view.toMap({
                x: event.x,
                y: event.y
            })
            if (mapPoint && mapPoint.x !== undefined && mapPoint.y !== undefined) {
                centerPoint = mapPoint
                isMouseDown = true
            }
        })

        const pointerMoveHandler = view.on('pointer-move', (event: any) => {
            if (!isMouseDown || !centerPoint) return

            const mapPoint = view.toMap({
                x: event.x,
                y: event.y
            })
            if (mapPoint && mapPoint.x !== undefined && mapPoint.y !== undefined) {
                this.updateCirclePreview(centerPoint, mapPoint)
            }
        })

        const pointerUpHandler = view.on('pointer-up', (event: any) => {
            if (!isMouseDown || !centerPoint) return

            const mapPoint = view.toMap({
                x: event.x,
                y: event.y
            })
            if (mapPoint && mapPoint.x !== undefined && mapPoint.y !== undefined) {
                this.finishCircleDrawing(centerPoint, mapPoint)
            }
        })

        this.drawingHandlers = [pointerDownHandler, pointerMoveHandler, pointerUpHandler]
    }

    addPointGraphic = (point: any) => {
        if (!this.state.graphicsLayer) return

        const graphic = new Graphic({
            geometry: point,
            symbol: {
                type: 'simple-marker',
                color: [255, 255, 0, 0.8],
                size: 8,
                outline: {
                    color: [255, 255, 255],
                    width: 2
                }
            }
        })

        this.state.graphicsLayer.add(graphic)
        this.setState({
            activeDrawingGraphics: [...this.state.activeDrawingGraphics, graphic]
        })
    }

    updatePolygonPreview = (points: number[][]) => {
        if (!this.state.graphicsLayer || points.length < 2) return

        this.clearPreviewGraphics()

        const previewGraphic = new Graphic({
            geometry: {
                type: 'polyline',
                paths: [points],
                spatialReference: this.state.mapView!.view.spatialReference
            },
            symbol: {
                type: 'simple-line',
                color: [255, 255, 0, 0.8],
                width: 2,
                style: 'dash'
            }
        })

        this.state.graphicsLayer.add(previewGraphic)
        this.setState({
            activeDrawingGraphics: [...this.state.activeDrawingGraphics, previewGraphic]
        })
    }

    updateRectanglePreview = (startPoint: any, endPoint: any) => {
        if (!this.state.graphicsLayer) return

        this.clearPreviewGraphics()

        const rectangle = new Polygon({
            rings: [[
                [startPoint.x, startPoint.y],
                [endPoint.x, startPoint.y],
                [endPoint.x, endPoint.y],
                [startPoint.x, endPoint.y],
                [startPoint.x, startPoint.y]
            ]],
            spatialReference: this.state.mapView!.view.spatialReference
        })

        const previewGraphic = new Graphic({
            geometry: rectangle,
            symbol: {
                type: 'simple-fill',
                color: [255, 255, 0, 0.3],
                outline: {
                    color: [255, 255, 0, 0.8],
                    width: 2,
                    style: 'dash'
                }
            }
        })

        this.state.graphicsLayer.add(previewGraphic)
        this.setState({
            activeDrawingGraphics: [...this.state.activeDrawingGraphics, previewGraphic]
        })
    }

    updateCirclePreview = (center: any, radiusPoint: any) => {
        if (!this.state.graphicsLayer) return

        this.clearPreviewGraphics()

        const radius = Math.sqrt(
            Math.pow(radiusPoint.x - center.x, 2) +
            Math.pow(radiusPoint.y - center.y, 2)
        )

        const points = []
        const numPoints = 32
        for (let i = 0; i <= numPoints; i++) {
            const angle = (i / numPoints) * 2 * Math.PI
            const x = center.x + radius * Math.cos(angle)
            const y = center.y + radius * Math.sin(angle)
            points.push([x, y])
        }

        const circle = new Polygon({
            rings: [points],
            spatialReference: this.state.mapView!.view.spatialReference
        })

        const previewGraphic = new Graphic({
            geometry: circle,
            symbol: {
                type: 'simple-fill',
                color: [255, 255, 0, 0.3],
                outline: {
                    color: [255, 255, 0, 0.8],
                    width: 2,
                    style: 'dash'
                }
            }
        })

        this.state.graphicsLayer.add(previewGraphic)
        this.setState({
            activeDrawingGraphics: [...this.state.activeDrawingGraphics, previewGraphic]
        })
    }

    finishPolygonDrawing = () => {
        const points = this.state.drawingPoints
        if (points.length >= 3) {
            const closedPoints = [...points, points[0]]

            const polygon = new Polygon({
                rings: [closedPoints],
                spatialReference: this.state.mapView!.view.spatialReference
            })

            this.addSelectedGeometry(polygon)
        }

        this.clearDrawing()
    }

    finishRectangleDrawing = (startPoint: any, endPoint: any) => {
        const rectangle = new Polygon({
            rings: [[
                [startPoint.x, startPoint.y],
                [endPoint.x, startPoint.y],
                [endPoint.x, endPoint.y],
                [startPoint.x, endPoint.y],
                [startPoint.x, startPoint.y]
            ]],
            spatialReference: this.state.mapView!.view.spatialReference
        })

        this.addSelectedGeometry(rectangle)
        this.clearDrawing()
    }

    finishCircleDrawing = (center: any, radiusPoint: any) => {
        const radius = Math.sqrt(
            Math.pow(radiusPoint.x - center.x, 2) +
            Math.pow(radiusPoint.y - center.y, 2)
        )

        const points = []
        const numPoints = 32
        for (let i = 0; i <= numPoints; i++) {
            const angle = (i / numPoints) * 2 * Math.PI
            const x = center.x + radius * Math.cos(angle)
            const y = center.y + radius * Math.sin(angle)
            points.push([x, y])
        }

        const circle = new Polygon({
            rings: [points],
            spatialReference: this.state.mapView!.view.spatialReference
        })

        this.addSelectedGeometry(circle)
        this.clearDrawing()
    }

    clearPreviewGraphics = () => {
        if (this.state.activeDrawingGraphics.length > 0) {
            const lastGraphic = this.state.activeDrawingGraphics[this.state.activeDrawingGraphics.length - 1]
            if (this.state.graphicsLayer && lastGraphic) {
                this.state.graphicsLayer.remove(lastGraphic)
                this.setState({
                    activeDrawingGraphics: this.state.activeDrawingGraphics.slice(0, -1)
                })
            }
        }
    }

    clearDrawing = () => {
        this.clearDrawingHandlers()

        this.state.activeDrawingGraphics.forEach(graphic => {
            if (this.state.graphicsLayer) {
                this.state.graphicsLayer.remove(graphic)
            }
        })

        // Also remove any multipoint-tagged graphics
        if (this.state.graphicsLayer) {
            const multipointGraphics = this.state.graphicsLayer.graphics.filter(
                (g: any) => g.attributes && g.attributes.isMultipoint
            );
            multipointGraphics.forEach((g: any) => this.state.graphicsLayer.remove(g));
        }

        this.setState({
            isDrawing: false,
            currentTool: '',
            drawingPoints: [],
            activeDrawingGraphics: [],
            multipointLocations: []
        })
    }

    cancelDrawing = () => {
        this.clearDrawing()
    }

    clearDrawingHandlers = () => {
        this.drawingHandlers.forEach(handler => {
            if (handler && handler.remove) {
                handler.remove()
            }
        })
        this.drawingHandlers = []
    }

    onMapClick = async (event: any) => {
        // Handle delete mode clicks first
        if (this.state.isDeleteMode) {
            // Stop event propagation to prevent popups and other handlers
            event.stopPropagation();
            await this.handleGraphicClick(event);
            return;
        }

        const { selectionMethod } = this.props.config || {}

        if (!this.state.selectedLayer || this.state.isDrawing || !this.state.widgetOpen) {
            return
        }

        if (selectionMethod === 'click' || selectionMethod === 'both') {
            try {
                const response = await this.state.mapView!.view.hitTest(event)

                if (response.results.length > 0) {
                    const graphicHits = response.results.filter(result => result.type === 'graphic')

                    for (const hit of graphicHits) {
                        const graphicHit = hit as GraphicHit

                        if (graphicHit.graphic && graphicHit.graphic.layer === this.state.selectedLayer) {
                            const objectId = graphicHit.graphic.attributes[this.state.selectedLayer.objectIdField];

                            if (objectId) {
                                const query = this.state.selectedLayer.createQuery();
                                query.where = `${this.state.selectedLayer.objectIdField} = ${objectId}`;
                                query.outFields = ['*'];
                                query.returnGeometry = true;

                                const result = await this.state.selectedLayer.queryFeatures(query);
                                if (result.features && result.features.length > 0) {
                                    await this.highlightSelectedFeatures(result.features);
                                    this.addSelectedGeometry(graphicHit.graphic.geometry);
                                }
                            }
                            break
                        }
                    }
                }
            } catch (error) {
                // Handle silently
            }
        }
    }

    addSelectedGeometry = async (geometry: any) => {
        if (!geometry) {
            return
        }

        // This is a legacy method - for compatibility, query features and create a Selection
        const layer = this.getCurrentActiveLayer();
        if (!layer) {
            return;
        }

        try {
            // Query features for this geometry
            const query = layer.createQuery();
            query.geometry = geometry;
            query.spatialRelationship = 'intersects';
            query.returnGeometry = true;
            query.outFields = ['*'];

            const result = await layer.queryFeatures(query);
            
            // Generate selection ID
            const selectionId = `selection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            (geometry as any).selectionId = selectionId;
            
            const objectIdField = layer.objectIdField || 'OBJECTID';
            const selection: Selection = {
                selectionId: selectionId,
                geometry: geometry,
                featureObjectIds: result.features?.map(f => f.attributes[objectIdField]) || [],
                features: result.features || []
            };

            // Add to selections array
            const newSelections = [...this.state.selections, selection];
            const totalCount = newSelections.reduce((sum, s) => sum + s.featureObjectIds.length, 0);

            this.addSelectionGraphic(geometry);
            
            if (result.features && result.features.length > 0) {
                await this.highlightSelectedFeatures(result.features);
            }

            this.setState({
                selections: newSelections,
                selectedFeatureCount: totalCount
            });
        } catch (err) {
            console.error('Error in addSelectedGeometry:', err);
        }
    }

    addSelectionGraphic = (geometry: any) => {
        if (!this.state.graphicsLayer) return

        // Use existing selectionId from geometry if it exists, otherwise generate new one
        let selectionId = (geometry as any).selectionId;
        if (!selectionId) {
            selectionId = `selection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            (geometry as any).selectionId = selectionId;
        }


        const graphic = new Graphic({
            geometry: geometry,
            symbol: {
                type: 'simple-fill',
                color: [0, 255, 255, 0.3],
                outline: {
                    color: [0, 255, 255, 0.8],
                    width: 2
                }
            },
            attributes: {
                selectionId: selectionId  // Add the ID to track this selection
            }
        })


        this.state.graphicsLayer.add(graphic)
    }

    updateFeatureCount = async (geometries: any[]) => {
        if (!this.state.selectedLayer || geometries.length === 0) {
            this.setState({ selectedFeatureCount: 0 })
            return
        }

        try {
            let totalCount = 0

            for (const geometry of geometries) {
                if (this.isGeometryTooSmall(geometry)) {
                    continue
                }

                let geometryCount = 0

                try {
                    let queryGeometry = geometry
                    if (!geometry.spatialReference && this.state.mapView?.view?.spatialReference) {
                        queryGeometry = {
                            ...geometry,
                            spatialReference: this.state.mapView.view.spatialReference
                        }
                    }

                    const query = this.state.selectedLayer.createQuery()
                    query.geometry = queryGeometry
                    query.spatialRelationship = 'intersects'
                    query.returnGeometry = false
                    query.num = 2000

                    const result = await this.state.selectedLayer.queryFeatureCount(query)
                    geometryCount = result || 0
                } catch (queryError) {
                    try {
                        const simpleQuery = this.state.selectedLayer.createQuery()
                        simpleQuery.returnGeometry = false
                        simpleQuery.num = 100

                        const allFeatures = await this.state.selectedLayer.queryFeatures(simpleQuery)

                        let intersectCount = 0
                        if (allFeatures.features && allFeatures.features.length > 0) {
                            intersectCount = Math.min(allFeatures.features.length, 10)
                        }

                        geometryCount = intersectCount
                    } catch (fallbackError) {
                        geometryCount = 1
                    }
                }

                totalCount += geometryCount
            }

            this.setState({ selectedFeatureCount: totalCount })
        } catch (error) {
            this.setState({ selectedFeatureCount: 1 })
        }
    }

    isGeometryTooSmall = (geometry: any): boolean => {
        try {
            if (geometry.type === 'polygon' && geometry.rings && geometry.rings[0]) {
                const ring = geometry.rings[0]
                if (ring.length < 3) return true

                const firstPoint = ring[0]
                const allSame = ring.every((point: number[]) =>
                    Math.abs(point[0] - firstPoint[0]) < 0.1 &&
                    Math.abs(point[1] - firstPoint[1]) < 0.1
                )

                return allSame
            }
            return false
        } catch (error) {
            return false
        }
    }

    clearSelection = () => {
        if (this.state.isDrawing) {
            this.cancelDrawing()
        }

        // Turn off delete mode and re-enable popups
        if (this.state.isDeleteMode) {
            if (this.state.mapView?.view) {
                this.state.mapView.view.container.style.cursor = 'default';
                
                // Re-enable popups
                if (this.state.mapView.view.popup) {
                    this.state.mapView.view.popup.autoOpenEnabled = true;
                }
            }
            
            // Remove delete click handler
            if (this.deleteClickHandler) {
                this.deleteClickHandler.remove();
                this.deleteClickHandler = null;
            }
        }

        // Turn off add mode and re-enable popups
        if (this.state.isAddMode) {
            if (this.state.mapView?.view) {
                this.state.mapView.view.container.style.cursor = 'default';
                
                // Re-enable popups
                if (this.state.mapView.view.popup) {
                    this.state.mapView.view.popup.autoOpenEnabled = true;
                }
            }
            
            // Remove add click handler
            if (this.addClickHandler) {
                this.addClickHandler.remove();
                this.addClickHandler = null;
            }
        }

        if (this.state.graphicsLayer) {
            const graphicsToRemove = this.state.graphicsLayer.graphics.filter(graphic =>
                !graphic.attributes || !graphic.attributes.isHighlight
            );
            graphicsToRemove.forEach(graphic => {
                this.state.graphicsLayer.remove(graphic);
            });
        }

        if (this.sketchLayer) {
            this.sketchLayer.removeAll()
        }
        // sketchLayer.removeAll() above already wiped any address-search marker
        this.addressSearchMarker = null;

        this.clearAllHighlights()

        this.setState({
            selections: [],  // Changed from selectedGeometries
            selectedFeatureCount: 0,
            isDeleteMode: false,
            isAddMode: false,
            // Drop any geocoded address; the marker is already gone from the map
            searchedAddress: null,
            addressSearchText: '',
            addressSuggestions: [],
            addressSuggestionsOpen: false,
            addressSearchLoading: false
        })
    }

    toggleDeleteMode = () => {
        const newDeleteMode = !this.state.isDeleteMode;
        
        
        // Turn off add mode if delete mode is being turned on
        if (newDeleteMode && this.state.isAddMode) {
            this.setState({ isAddMode: false });
            if (this.addClickHandler) {
                this.addClickHandler.remove();
                this.addClickHandler = null;
            }
        }
        
        // Cancel any active drawing when entering delete mode
        if (newDeleteMode && this.state.isDrawing) {
            this.cancelDrawing();
        }
        
        if (!this.state.mapView?.view) {
            console.error('No map view available');
            return;
        }
        
        const view = this.state.mapView.view;
        
        if (newDeleteMode) {
            // ENTERING DELETE MODE
            
            // Update cursor
            view.container.style.cursor = 'pointer';
            
            // Disable popups
            if (view.popup) {
                view.popup.autoOpenEnabled = false;
                if (view.popup.visible) {
                    view.popup.close();
                }
            }
            
            // Remove any existing delete click handler
            if (this.deleteClickHandler) {
                this.deleteClickHandler.remove();
            }
            
            // Add dedicated click handler for delete mode with HIGH priority
            this.deleteClickHandler = view.on('click', (event: any) => {
                
                // Stop propagation immediately
                event.stopPropagation();
                
                // Call our handler
                this.handleGraphicClick(event);
            }, { priority: 100 }); // High priority to run before other handlers
            
            
        } else {
            // EXITING DELETE MODE
            
            // Reset cursor
            view.container.style.cursor = 'default';
            
            // Re-enable popups
            if (view.popup) {
                view.popup.autoOpenEnabled = true;
            }
            
            // Remove the delete click handler
            if (this.deleteClickHandler) {
                this.deleteClickHandler.remove();
                this.deleteClickHandler = null;
            }
        }
        
        this.setState({ 
            isDeleteMode: newDeleteMode,
            currentTool: newDeleteMode ? 'delete' : ''
        });
        
        this.showMessage('info', newDeleteMode 
            ? 'Delete mode active - Click on any drawn area to remove it'
            : 'Delete mode disabled');
    }

    toggleAddMode = () => {
        const newAddMode = !this.state.isAddMode;
        
        
        // Turn off delete mode if add mode is being turned on
        if (newAddMode && this.state.isDeleteMode) {
            this.setState({ isDeleteMode: false });
            if (this.deleteClickHandler) {
                this.deleteClickHandler.remove();
                this.deleteClickHandler = null;
            }
        }
        
        // Cancel any active drawing when entering add mode
        if (newAddMode && this.state.isDrawing) {
            this.cancelDrawing();
        }
        
        if (!this.state.mapView?.view) {
            console.error('No map view available');
            return;
        }
        
        const view = this.state.mapView.view;
        
        if (newAddMode) {
            // ENTERING ADD MODE
            
            // Update cursor
            view.container.style.cursor = 'crosshair';
            
            // Disable popups
            if (view.popup) {
                view.popup.autoOpenEnabled = false;
                if (view.popup.visible) {
                    view.popup.close();
                }
            }
            
            // Remove any existing add click handler
            if (this.addClickHandler) {
                this.addClickHandler.remove();
            }
            
            // Add dedicated click handler for add mode with HIGH priority
            this.addClickHandler = view.on('click', (event: any) => {
                
                // Stop propagation immediately
                event.stopPropagation();
                
                // Call our handler
                this.handleAddFeatureClick(event);
            }, { priority: 100 }); // High priority to run before other handlers
            
            
        } else {
            // EXITING ADD MODE
            
            // Reset cursor
            view.container.style.cursor = 'default';
            
            // Re-enable popups
            if (view.popup) {
                view.popup.autoOpenEnabled = true;
            }
            
            // Remove the add click handler
            if (this.addClickHandler) {
                this.addClickHandler.remove();
                this.addClickHandler = null;
            }
        }
        
        this.setState({ 
            isAddMode: newAddMode,
            currentTool: newAddMode ? 'add' : ''
        });
        
        this.showMessage('info', newAddMode 
            ? 'Add mode active - Click on features to add them to your selection'
            : 'Add mode disabled');
    }

    handleAddFeatureClick = async (event: any) => {
        if (!this.state.isAddMode || !this.state.mapView?.view) {
            return;
        }
        
        
        if (this.state.selections.length === 0) {
            this.showMessage('warning', 'Please draw a selection area first before adding features');
            return;
        }
        
        try {
            const layer = this.getCurrentActiveLayer();
            if (!layer) {
                this.showMessage('error', 'No layer available');
                return;
            }
            
            // Get the map point from the click
            const mapPoint = this.state.mapView.view.toMap({ x: event.x, y: event.y });
            if (!mapPoint) {
                return;
            }
            
            
            // Create a small buffer around the click point for tolerance
            const clickTolerance = this.state.mapView.view.resolution * 10; // 10 pixels
            let queryGeometry;
            
            try {
                queryGeometry = geometryEngine.buffer(mapPoint, clickTolerance, 'meters');
            } catch (err) {
                queryGeometry = mapPoint;
            }
            
            // Query the layer at this location
            const query = layer.createQuery();
            query.geometry = queryGeometry;
            query.spatialRelationship = 'intersects';
            query.returnGeometry = true;
            query.outFields = ['*'];
            query.num = 1; // Only need the first feature
            
            const result = await layer.queryFeatures(query);
            
            if (!result.features || result.features.length === 0) {
                this.showMessage('info', 'No feature found at this location. Try clicking directly on a parcel.');
                return;
            }
            
            const clickedFeature = result.features[0];
            const objectIdField = layer.objectIdField || 'OBJECTID';
            const clickedObjectId = clickedFeature.attributes[objectIdField];
            
            
            // Check if this feature is already in any selection
            let alreadySelected = false;
            for (const selection of this.state.selections) {
                if (selection.featureObjectIds.includes(clickedObjectId)) {
                    alreadySelected = true;
                    break;
                }
            }
            
            if (alreadySelected) {
                this.showMessage('info', 'Feature is already in your selection');
                return;
            }
            
            // Add to the most recent selection (last one in array)
            const targetSelection = this.state.selections[this.state.selections.length - 1];
            
            
            // Update the selection with the new feature
            const updatedSelection: Selection = {
                ...targetSelection,
                featureObjectIds: [...targetSelection.featureObjectIds, clickedObjectId],
                features: [...targetSelection.features, clickedFeature]
            };
            
            // Update selections array
            const updatedSelections = [...this.state.selections];
            updatedSelections[updatedSelections.length - 1] = updatedSelection;
            
            // Clear and re-highlight all features
            this.clearAllHighlights();
            for (const selection of updatedSelections) {
                await this.highlightSelectedFeatures(selection.features);
            }
            
            // Calculate total feature count
            const totalCount = updatedSelections.reduce((sum, s) => sum + s.featureObjectIds.length, 0);
            
            // Update state
            this.setState({ 
                selections: updatedSelections,
                selectedFeatureCount: totalCount
            });
            
            this.showMessage('success', `Feature added! Total: ${totalCount} features`);
        } catch (error) {
            console.error('Error in handleAddFeatureClick:', error);
            this.showMessage('error', 'Error adding feature. Please try again.');
        }
    }

    removeGraphic = (graphic: Graphic) => {
        if (!this.state.graphicsLayer) return;

        // Remove the graphic from the graphics layer
        this.state.graphicsLayer.remove(graphic);

        // Remove from selections array (legacy - not currently used)
        const updatedSelections = this.state.selections.filter(s => s.geometry !== graphic);

        // Calculate total feature count
        const totalCount = updatedSelections.reduce((sum, s) => sum + s.featureObjectIds.length, 0);

        this.setState({ 
            selections: updatedSelections,
            selectedFeatureCount: totalCount
        });

        this.showMessage('success', 'Selection area removed');
    }

    handleGraphicClick = async (event: any) => {
        if (!this.state.isDeleteMode || !this.state.mapView?.view) {
            return;
        }
        
        
        try {
            // Use hitTest to find what was clicked
            const hitTestResponse = await this.state.mapView.view.hitTest(event);
            
            if (hitTestResponse.results.length === 0) {
                return;
            }
            
            // Look for a highlighted feature
            for (const result of hitTestResponse.results) {
                if (result.type === 'graphic') {
                    const graphic = (result as GraphicHit).graphic;
                    
                    // Check if this is a highlighted feature
                    if (graphic.attributes?.isHighlight && graphic.attributes?.originalObjectId) {
                        const clickedObjectId = graphic.attributes.originalObjectId;
                        
                        // Find which selection contains this feature
                        const objectIdField = this.state.selectedLayer?.objectIdField || 'OBJECTID';
                        
                        for (let i = 0; i < this.state.selections.length; i++) {
                            const selection = this.state.selections[i];
                            
                            if (selection.featureObjectIds.includes(clickedObjectId)) {
                                
                                // Remove this feature from the selection
                                const updatedFeatureIds = selection.featureObjectIds.filter(id => id !== clickedObjectId);
                                const updatedFeatures = selection.features.filter(f => 
                                    f.attributes[objectIdField] !== clickedObjectId
                                );
                                
                                
                                // If no features left, remove the entire selection
                                if (updatedFeatureIds.length === 0) {
                                    await this.removeSelectionById(selection.selectionId);
                                    return;
                                }
                                
                                // Update the selection
                                const updatedSelection: Selection = {
                                    ...selection,
                                    featureObjectIds: updatedFeatureIds,
                                    features: updatedFeatures
                                };
                                
                                // Update selections array
                                const updatedSelections = [...this.state.selections];
                                updatedSelections[i] = updatedSelection;
                                
                                // Clear and re-highlight
                                this.clearAllHighlights();
                                await this.highlightSelectedFeatures(updatedFeatures);
                                
                                // Calculate total feature count
                                const totalCount = updatedSelections.reduce((sum, s) => sum + s.featureObjectIds.length, 0);
                                
                                // Update state
                                this.setState({ 
                                    selections: updatedSelections,
                                    selectedFeatureCount: totalCount
                                });
                                
                                this.showMessage('success', 'Feature removed from selection');
                                return;
                            }
                        }
                        
                        return;
                    }
                }
            }
            
        } catch (error) {
            console.error('Error in handleGraphicClick:', error);
        }
    }
    
    removeSelectionById = async (selectionId: string) => {
        
        // Remove ONLY graphics with this specific selectionId
        if (this.state.graphicsLayer) {
            const graphicsToRemove = this.state.graphicsLayer.graphics.filter((g: Graphic) => 
                g.attributes?.selectionId === selectionId
            );
            graphicsToRemove.forEach((g: Graphic) => {
                this.state.graphicsLayer.remove(g);
            });
        }
        
        if (this.sketchLayer) {
            const graphicsToRemove = this.sketchLayer.graphics.filter((g: Graphic) => 
                g.attributes?.selectionId === selectionId
            );
            graphicsToRemove.forEach((g: Graphic) => {
                this.sketchLayer.remove(g);
            });
        }
        
        // Remove the selection from selections array
        const updatedSelections = this.state.selections.filter(s => s.selectionId !== selectionId);
        
        
        // Clear ALL highlights
        this.clearAllHighlights();
        
        // Update state
        this.setState({ selections: updatedSelections });
        
        // Re-highlight features for remaining selections
        if (updatedSelections.length > 0) {
            try {
                for (const selection of updatedSelections) {
                    await this.highlightSelectedFeatures(selection.features);
                }
            } catch (error) {
                console.error('Error re-highlighting:', error);
            }
        }
        
        // Calculate total feature count
        const totalCount = updatedSelections.reduce((sum, s) => sum + s.featureObjectIds.length, 0);
        this.setState({ selectedFeatureCount: totalCount });
        
        this.showMessage('success', 'Selection area removed');
    }

    // Helper to compare if two geometries are the same
    areGeometriesEqual = (geom1: any, geom2: any): boolean => {
        if (!geom1 || !geom2) return false;
        if (geom1.type !== geom2.type) return false;
        
        // Same reference = definitely equal
        if (geom1 === geom2) return true;
        
        try {
            // First try using geometryEngine.equals
            return geometryEngine.equals(geom1, geom2);
        } catch (e) {
            // If that fails, try JSON comparison
            try {
                const json1 = JSON.stringify(geom1.toJSON());
                const json2 = JSON.stringify(geom2.toJSON());
                return json1 === json2;
            } catch (e2) {
                // Last resort: compare basic properties
                try {
                    if (geom1.type === 'point' && geom2.type === 'point') {
                        return Math.abs(geom1.x - geom2.x) < 0.0001 && Math.abs(geom1.y - geom2.y) < 0.0001;
                    } else if (geom1.type === 'polygon' && geom2.type === 'polygon') {
                        // Compare ring count and first few coordinates
                        const rings1 = geom1.rings;
                        const rings2 = geom2.rings;
                        if (rings1?.length !== rings2?.length) return false;
                        if (rings1?.length > 0 && rings2?.length > 0) {
                            const firstRing1 = rings1[0];
                            const firstRing2 = rings2[0];
                            if (firstRing1?.length !== firstRing2?.length) return false;
                            // Compare first point
                            if (firstRing1?.length > 0 && firstRing2?.length > 0) {
                                return Math.abs(firstRing1[0][0] - firstRing2[0][0]) < 0.0001 &&
                                    Math.abs(firstRing1[0][1] - firstRing2[0][1]) < 0.0001;
                            }
                        }
                    } else if (geom1.type === 'polyline' && geom2.type === 'polyline') {
                        const paths1 = geom1.paths;
                        const paths2 = geom2.paths;
                        if (paths1?.length !== paths2?.length) return false;
                        if (paths1?.length > 0 && paths2?.length > 0) {
                            const firstPath1 = paths1[0];
                            const firstPath2 = paths2[0];
                            if (firstPath1?.length !== firstPath2?.length) return false;
                            if (firstPath1?.length > 0 && firstPath2?.length > 0) {
                                return Math.abs(firstPath1[0][0] - firstPath2[0][0]) < 0.0001 &&
                                    Math.abs(firstPath1[0][1] - firstPath2[0][1]) < 0.0001;
                            }
                        }
                    }
                } catch (e3) {
                    console.error('Error in geometry comparison fallback:', e3);
                }
            }
        }
        
        return false;
    }

    doesGraphicContainPoint = (graphic: Graphic, point: Point): boolean => {
        if (!graphic.geometry || !point) return false;
        
        try {
            const geomType = graphic.geometry.type;
            
            if (geomType === 'point') {
                // For point geometries, check if click is within a reasonable distance
                const distance = geometryEngine.distance(point, graphic.geometry as Point, 'meters');
                // Use a more generous tolerance - about 20-30 pixels worth at typical scales
                const pixelTolerance = 25;
                const tolerance = this.state.mapView?.view?.resolution 
                    ? this.state.mapView.view.resolution * pixelTolerance 
                    : 50; // fallback tolerance in meters
                return distance < tolerance;
            } 
            else if (geomType === 'polyline') {
                // For polylines, check if click is near the line
                const distance = geometryEngine.distance(point, graphic.geometry, 'meters');
                const pixelTolerance = 25;
                const tolerance = this.state.mapView?.view?.resolution 
                    ? this.state.mapView.view.resolution * pixelTolerance 
                    : 50;
                return distance < tolerance;
            } 
            else if (geomType === 'polygon') {
                // For polygons, check if point is contained within or very close to the polygon
                const contained = geometryEngine.contains(graphic.geometry as Polygon, point);
                if (contained) return true;
                
                // Also check if near the boundary
                const distance = geometryEngine.distance(point, graphic.geometry, 'meters');
                const pixelTolerance = 25;
                const tolerance = this.state.mapView?.view?.resolution 
                    ? this.state.mapView.view.resolution * pixelTolerance 
                    : 50;
                return distance < tolerance;
            }
        } catch (error) {
            console.error('Error checking graphic contains point:', error);
        }
        return false;
    }

    toggleLayerVisibility = () => {
        if (this.state.selectedLayer) {
            const newVisibility = !this.state.selectedLayer.visible;
            this.state.selectedLayer.visible = newVisibility;
            this.showMessage('info', `Layer visibility: ${newVisibility ? 'ON' : 'OFF'}`);
        }
    }

    onLabelTypeChange = (newLabelType: 'physical' | 'owner') => {

        // Clear any existing selection when switching address types
        if (this.state.selections.length > 0 || this.state.isDrawing) {
            this.clearSelection();
        }

        // Update the label type
        this.setState({ labelType: newLabelType });

        // Show a brief message to indicate the switch and clearing
        this.showMessage('info', `Switched to ${newLabelType === 'owner' ? 'Owner Address' : 'Physical Mailing Address'}. Previous selection cleared.`);
    }

    getCurrentActiveLayer = () => {
        // Use the CORRECT layer based on address type (no more swapping)
        if (this.state.labelType === 'owner') {
            return this.state.ownerLayer || this.state.selectedLayer;
        } else {
            return this.state.selectedLayer;
        }
    }

    // ----- Address search (geocoder) -----

    private getGeocodeBaseUrl = (): string | null => {
        const raw = (this.props.config as any)?.geocodeUrl;
        if (!raw || typeof raw !== 'string') return null;
        const trimmed = raw.trim();
        if (!trimmed) return null;
        return trimmed.replace(/\/+$/, '');
    }

    handleAddressSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        this.setState({ addressSearchText: value, addressSuggestionsOpen: true, addressSearchError: null });

        // Clear any previously pending request/debounce
        if (this.suggestDebounceTimer !== null) {
            window.clearTimeout(this.suggestDebounceTimer);
            this.suggestDebounceTimer = null;
        }

        const trimmed = value.trim();
        if (trimmed.length < 2) {
            this.setState({ addressSuggestions: [], addressSearchLoading: false });
            return;
        }

        // Debounce so we don't fire on every keystroke
        this.suggestDebounceTimer = window.setTimeout(() => {
            this.fetchAddressSuggestions(trimmed);
        }, 250);
    }

    fetchAddressSuggestions = async (text: string) => {
        const baseUrl = this.getGeocodeBaseUrl();
        if (!baseUrl) return;

        // Cancel any prior in-flight request
        if (this.suggestAbortController) {
            this.suggestAbortController.abort();
        }
        const controller = new AbortController();
        this.suggestAbortController = controller;

        this.setState({ addressSearchLoading: true, addressSearchError: null });

        // POST to /suggest with form-encoded body. Use the map view center as the
        // proximity-bias `location` (a single point — simpler/more reliable than a
        // searchExtent envelope, and the same shape the official Search widget uses).
        const params = new URLSearchParams({ f: 'json', text, maxSuggestions: '6' });
        const center = this.state.mapView?.view?.center;
        if (center && typeof center.x === 'number' && typeof center.y === 'number') {
            const wkid = center.spatialReference?.wkid;
            params.set('location', JSON.stringify(wkid
                ? { x: center.x, y: center.y, spatialReference: { wkid } }
                : { x: center.x, y: center.y }
            ));
        }

        try {
            const resp = await fetch(`${baseUrl}/suggest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString(),
                signal: controller.signal
            });

            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            if (data?.error) {
                throw new Error(data.error.message || `Geocoder error ${data.error.code || ''}`);
            }

            // Bail if a newer request has superseded us
            if (this.suggestAbortController !== controller) return;

            const list = Array.isArray(data?.suggestions)
                ? data.suggestions
                    .filter((s: any) => s && typeof s.text === 'string')
                    .map((s: any) => ({ text: s.text, magicKey: s.magicKey || '' }))
                : [];

            this.setState({ addressSuggestions: list, addressSearchLoading: false });
        } catch (err: any) {
            if (err?.name === 'AbortError') return;
            if (this.suggestAbortController !== controller) return;
            // eslint-disable-next-line no-console
            console.error('[mailing-labels] /suggest failed:', err);
            this.setState({
                addressSuggestions: [],
                addressSearchLoading: false,
                addressSearchError: err?.message || 'Address lookup failed.'
            });
        }
    }

    pickAddressSuggestion = async (suggestion: { text: string, magicKey: string }) => {
        const baseUrl = this.getGeocodeBaseUrl();
        const view = this.state.mapView?.view;
        if (!baseUrl || !view) return;

        this.setState({
            addressSearchText: suggestion.text,
            addressSuggestions: [],
            addressSuggestionsOpen: false,
            addressSearchLoading: true,
            addressSearchError: null
        });

        // POST to /findAddressCandidates. Prefer magicKey when the suggest call
        // returned one (better accuracy / more tightly bound to the suggestion);
        // fall back to SingleLine otherwise.
        const params = new URLSearchParams({ f: 'json', maxLocations: '1', outFields: 'Match_addr' });
        if (suggestion.magicKey) {
            params.set('magicKey', suggestion.magicKey);
            // Some locators require both magicKey and SingleLine; passing both is harmless.
            params.set('SingleLine', suggestion.text);
        } else {
            params.set('SingleLine', suggestion.text);
        }

        try {
            const resp = await fetch(`${baseUrl}/findAddressCandidates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            if (data?.error) {
                throw new Error(data.error.message || `Geocoder error ${data.error.code || ''}`);
            }

            const candidate = Array.isArray(data?.candidates) ? data.candidates[0] : null;
            if (!candidate?.location) {
                this.setState({ addressSearchLoading: false });
                this.showMessage('warning', 'No location returned for that address.');
                return;
            }

            const sr = data?.spatialReference?.wkid || 4326;
            const point = new Point({
                x: candidate.location.x,
                y: candidate.location.y,
                spatialReference: { wkid: sr }
            });

            this.removeAddressSearchMarker();
            const marker = new Graphic({
                geometry: point,
                symbol: {
                    type: 'simple-marker',
                    style: 'circle',
                    color: [220, 53, 69, 0.85],
                    size: 12,
                    outline: { color: [255, 255, 255, 1], width: 2 }
                } as any,
                attributes: { isAddressSearchMarker: true }
            });
            if (this.sketchLayer) {
                this.sketchLayer.add(marker);
            }
            this.addressSearchMarker = marker;

            try {
                await view.goTo({ target: point, zoom: Math.max(view.zoom ?? 0, 17) }, { duration: 600 });
            } catch (_) {
                // Pan during the animation can reject — harmless
            }

            this.setState({
                searchedAddress: { point, label: candidate.address || suggestion.text },
                addressSearchLoading: false
            });
        } catch (err: any) {
            // eslint-disable-next-line no-console
            console.error('[mailing-labels] /findAddressCandidates failed:', err);
            this.setState({
                addressSearchLoading: false,
                addressSearchError: err?.message || 'Could not resolve that address.'
            });
        }
    }

    selectFeaturesAtSearchedAddress = async () => {
        const searched = this.state.searchedAddress;
        const layer = this.getCurrentActiveLayer();
        const view = this.state.mapView?.view;

        if (!searched || !layer || !view) {
            this.showMessage('warning', 'Search for an address first.');
            return;
        }

        const { bufferDistance, bufferUnit } = this.state;

        // Only buffer when the user has explicitly set a distance. A "be safe"
        // fallback (e.g. 25 ft) is too large on tight urban parcels — it spills
        // across boundaries and pulls in neighbors. The raw point will land
        // inside exactly one parcel for normal address-on-parcel data.
        let queryGeometry: any = searched.point;
        if (bufferDistance > 0) {
            try {
                const isGeographic = view.spatialReference?.isWGS84 || view.spatialReference?.isWebMercator;
                let bufferResult = isGeographic
                    ? geometryEngine.geodesicBuffer(searched.point, bufferDistance, bufferUnit as any)
                    : geometryEngine.buffer(searched.point, bufferDistance, bufferUnit as any);
                if (Array.isArray(bufferResult)) bufferResult = bufferResult[0];
                if (bufferResult) queryGeometry = bufferResult;
            } catch (_) {
                // Buffer failed; fall through with the raw point geometry
            }
        }

        try {
            const query = layer.createQuery();
            query.geometry = queryGeometry;
            // 'intersects' is the safe, broadly-supported relationship and is
            // what the multipoint click flow uses. With a raw point it returns
            // the one parcel containing the point; with a user buffer it
            // returns parcels touching the buffered area.
            query.spatialRelationship = 'intersects';
            query.returnGeometry = true;
            query.outFields = ['*'];

            const result = await layer.queryFeatures(query);
            const features = result?.features || [];

            if (!features.length) {
                this.showMessage('warning', bufferDistance > 0
                    ? 'No features at that address. Try increasing the buffer distance.'
                    : 'No features at that address.');
                return;
            }

            await this.highlightSelectedFeatures(features);

            const objectIdField = layer.objectIdField || 'OBJECTID';
            const selection: Selection = {
                selectionId: `selection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                geometry: queryGeometry,
                featureObjectIds: features.map((f: any) => f.attributes[objectIdField]),
                features
            };

            // Replace existing selections to keep semantics consistent with other tools
            this.setState({
                selections: [selection],
                selectedFeatureCount: features.length
            });

            // Peek at the features against the active field mappings so we can warn
            // up-front if a parcel was found but its mailing fields are blank
            // (typical for confidential / unmapped owner records). Otherwise the
            // user only finds out at export time, which feels misleading.
            const { selectedFields, ownerFields } = this.props.config || {};
            const activeFields = this.state.labelType === 'owner' ? ownerFields : selectedFields;
            let withMailing = features.length;
            if (activeFields) {
                withMailing = this.filterEmptyRecords(features, activeFields).length;
            }
            const missing = features.length - withMailing;

            if (missing === features.length) {
                // Found a parcel but it has no mailing data
                this.showMessage('warning', features.length === 1
                    ? `Selected ${searched.label}, but no mailing data is on file (likely a confidential record).`
                    : `Selected ${features.length} feature(s) at ${searched.label}, but none have mailing data on file (likely confidential records).`
                );
            } else if (missing > 0) {
                // Some mixed
                this.showMessage('info',
                    `${withMailing} of ${features.length} selected feature(s) have mailing data; ${missing} appear confidential and will be skipped on export.`
                );
            } else {
                this.showMessage('success', `${features.length} feature(s) selected at ${searched.label}.`);
            }
        } catch (err: any) {
            this.showMessage('error', 'Failed to query features at that address.');
        }
    }

    private removeAddressSearchMarker = () => {
        if (this.addressSearchMarker && this.sketchLayer) {
            try { this.sketchLayer.remove(this.addressSearchMarker); } catch (_) { /* noop */ }
        }
        this.addressSearchMarker = null;
    }

    clearAddressSearch = () => {
        this.removeAddressSearchMarker();
        if (this.suggestAbortController) {
            this.suggestAbortController.abort();
            this.suggestAbortController = null;
        }
        if (this.suggestDebounceTimer !== null) {
            window.clearTimeout(this.suggestDebounceTimer);
            this.suggestDebounceTimer = null;
        }
        this.setState({
            addressSearchText: '',
            addressSuggestions: [],
            addressSuggestionsOpen: false,
            addressSearchLoading: false,
            addressSearchError: null,
            searchedAddress: null
        });
    }

    generateLabels = async () => {
        const currentLayer = this.getCurrentActiveLayer();

        if (!currentLayer) {
            this.showMessage('error', 'No layer selected for current address type')
            return
        }

        if (this.state.selections.length === 0) {  // Changed from selectedGeometries
            this.showConfirmDialog(
                'No selection made. Generate labels for ALL features in the layer?',
                () => this.executeGenerateLabels()
            )
            return
        }

        this.executeGenerateLabels()
    }

    executeGenerateLabels = async () => {
        this.setState({ isGenerating: true })

        try {
            const { selectedFields, ownerFields } = this.props.config || {}
            const currentLayer = this.getCurrentActiveLayer();

            if (!currentLayer) {
                this.showMessage('error', 'No layer available for current address type')
                return
            }

            // Use the CORRECT field mappings (remove the temporary swap)
            const fieldsToUse = this.state.labelType === 'owner' ? ownerFields : selectedFields;

            if (!fieldsToUse) {
                this.showMessage('error', `No ${this.state.labelType === 'owner' ? 'owner' : 'physical address'} fields configured`)
                return
            }

            // ... rest of the method remains the same
            let features = []

            if (this.state.selections.length > 0) {
                // Get all features from all selections (already stored!)
                features = this.state.selections.flatMap(selection => selection.features);
                
                // Deduplicate by OBJECTID
                if (features.length > 0) {
                    const uniqueFeatures = features.filter((feature, index, self) =>
                        index === self.findIndex(f =>
                            f.attributes[currentLayer.objectIdField] ===
                            feature.attributes[currentLayer.objectIdField]
                        )
                    )
                    features = uniqueFeatures
                }
            } else {
                try {
                    features = await this.queryAllFeaturesWithPagination(undefined, currentLayer)
                } catch (allFeaturesError) {
                    this.showMessage('error', 'Unable to retrieve features from the layer')
                    return
                }
            }

            if (features.length === 0) {
                this.showMessage('warning', 'No features found in selection. The spatial query may have failed. Try selecting a larger area or use "Generate Labels" without a selection to get all features.')
                return
            }

            // Filter empty records if enabled
            let outputFeatures = features
            if (this.state.removeEmptyRecords) {
                outputFeatures = this.filterEmptyRecords(features, fieldsToUse)
                const removed = features.length - outputFeatures.length
                if (removed > 0) {
                    this.showMessage('info', `Removed ${removed} empty record(s) from ${features.length} total`)
                }
                if (outputFeatures.length === 0) {
                    // Distinguish "nothing was selected" from "selected, but no mailing data"
                    this.showMessage('warning',
                        features.length === 1
                            ? 'The selected feature has no mailing data — likely a confidential record. Nothing to export.'
                            : `${features.length} feature(s) selected, but none have mailing data — likely confidential records. Nothing to export.`
                    )
                    return
                }
            }

            // Remove duplicate labels if enabled
            if (this.state.removeDuplicates) {
                const beforeDedup = outputFeatures.length
                outputFeatures = this.filterDuplicateRecords(outputFeatures, fieldsToUse)
                const dupsRemoved = beforeDedup - outputFeatures.length
                if (dupsRemoved > 0) {
                    this.showMessage('info', `Removed ${dupsRemoved} duplicate label(s) from ${beforeDedup} records`)
                }
            }

            // Apply sort if selected (e.g. zip-sort for USPS bulk mail)
            outputFeatures = this.sortFeatures(outputFeatures, fieldsToUse, this.state.sortBy)

            // Generate CSV with appropriate field handling
            this.generateCSV(outputFeatures, fieldsToUse)

        } catch (error) {
            this.showMessage('error', 'Error generating mailing labels. This may be due to server connectivity issues. Please try again or contact support.')
        } finally {
            this.setState({ isGenerating: false })
        }
    }

    executeGeneratePDFLabels = async (mode: 'download' | 'print' = 'download') => {
        this.setState({ isGenerating: true });

        try {
            const { selectedFields, ownerFields } = this.props.config || {}

            // Use the CORRECT field mappings (remove the temporary swap)
            const fieldsToUse = this.state.labelType === 'owner' ? ownerFields : selectedFields;

            if (!fieldsToUse) {
                this.showMessage('error', `No ${this.state.labelType === 'owner' ? 'owner' : 'physical address'} fields configured`)
                return
            }

            let features = [];

            if (this.state.selections.length > 0) {
                // Get all features from all selections (already stored!)
                features = this.state.selections.flatMap(selection => selection.features);
                
                if (features.length > 0) {
                    const uniqueFeatures = features.filter((feature, index, self) =>
                        index === self.findIndex(f =>
                            f.attributes[this.state.selectedLayer.objectIdField] ===
                            feature.attributes[this.state.selectedLayer.objectIdField]
                        )
                    );
                    features = uniqueFeatures;
                }
            } else {
                try {
                    features = await this.queryAllFeaturesWithPagination()
                } catch (allFeaturesError) {
                    this.showMessage('error', 'Unable to retrieve features from the layer');
                    return;
                }
            }

            if (features.length === 0) {
                this.showMessage('warning', 'No features found in selection.');
                return;
            }

            // Filter empty records if enabled
            if (this.state.removeEmptyRecords) {
                const beforeCount = features.length
                features = this.filterEmptyRecords(features, fieldsToUse)
                const removed = beforeCount - features.length
                if (removed > 0) {
                    this.showMessage('info', `Removed ${removed} empty record(s) from ${beforeCount} total`)
                }
                if (features.length === 0) {
                    // Distinguish "nothing was selected" from "selected, but no mailing data"
                    this.showMessage('warning',
                        beforeCount === 1
                            ? 'The selected feature has no mailing data — likely a confidential record. Nothing to print.'
                            : `${beforeCount} feature(s) selected, but none have mailing data — likely confidential records. Nothing to print.`
                    )
                    return
                }
            }

            // Remove duplicate labels if enabled
            if (this.state.removeDuplicates) {
                const beforeDedup = features.length
                features = this.filterDuplicateRecords(features, fieldsToUse)
                const dupsRemoved = beforeDedup - features.length
                if (dupsRemoved > 0) {
                    this.showMessage('info', `Removed ${dupsRemoved} duplicate label(s) from ${beforeDedup} records`)
                }
            }

            // Apply sort if selected (e.g. zip-sort for USPS bulk mail)
            features = this.sortFeatures(features, fieldsToUse, this.state.sortBy)

            // Generate PDF with appropriate field handling
            await this.generatePDF(features, fieldsToUse, mode);

        } catch (error) {
            this.showMessage('error', 'PDF generation failed. Please try CSV export instead.');
        } finally {
            this.setState({ isGenerating: false });
        }
    };

    /** Convenience wrapper bound to the print button */
    executePrintPDFLabels = () => this.executeGeneratePDFLabels('print');

    queryAllFeaturesWithPagination = async (geometry?: any, layer?: any): Promise<any[]> => {
        const targetLayer = layer || this.getCurrentActiveLayer();

        if (!targetLayer) {
            throw new Error('No layer available for query');
        }

        const maxFeatures = 2000;
        const pageSize = 500;
        let allFeatures = [];
        let start = 0;
        let hasMoreFeatures = true;
        let queryCount = 0;

        this.showMessage('info', `Starting paginated query. Target: ${maxFeatures} records`);

        while (hasMoreFeatures && allFeatures.length < maxFeatures && queryCount < 10) {
            queryCount++;
            try {
                const query = targetLayer.createQuery();
                query.outFields = ['*'];
                query.returnGeometry = false;
                query.start = start;
                query.num = Math.min(pageSize, maxFeatures - allFeatures.length);

                if (geometry) {
                    query.geometry = geometry;
                    query.spatialRelationship = 'intersects';
                }

                this.showMessage('info', `Query ${queryCount}: Requesting ${query.num} records starting at ${start}`);

                const result = await targetLayer.queryFeatures(query);

                this.showMessage('info', `Query ${queryCount}: Received ${result.features?.length || 0} records. ExceededTransferLimit: ${result.exceededTransferLimit}`);

                if (result.features && result.features.length > 0) {
                    allFeatures.push(...result.features);
                    start += result.features.length;

                    if (result.features.length < pageSize || !result.exceededTransferLimit) {
                        hasMoreFeatures = false;
                        this.showMessage('info', `Query complete. No more features available.`);
                    }
                } else {
                    hasMoreFeatures = false;
                    this.showMessage('info', `Query returned no features. Stopping pagination.`);
                }

                if (start > maxFeatures * 2) {
                    this.showMessage('warning', `Safety limit reached. Stopping pagination.`);
                    break;
                }
            } catch (error: any) {
                this.showMessage('error', `Query ${queryCount} failed: ${error.message}`);

                if (start === 0) {
                    try {
                        this.showMessage('info', 'Trying fallback query without pagination...');
                        const simpleQuery = targetLayer.createQuery();
                        simpleQuery.outFields = ['*'];
                        simpleQuery.returnGeometry = false;
                        simpleQuery.num = maxFeatures;

                        if (geometry) {
                            simpleQuery.geometry = geometry;
                            simpleQuery.spatialRelationship = 'intersects';
                        }

                        const fallbackResult = await targetLayer.queryFeatures(simpleQuery);
                        this.showMessage('info', `Fallback query returned ${fallbackResult.features?.length || 0} records`);
                        return fallbackResult.features || [];
                    } catch (fallbackError: any) {
                        this.showMessage('error', `Fallback query also failed: ${fallbackError.message}`);
                        throw fallbackError;
                    }
                } else {
                    break;
                }
            }
        }

        const finalCount = allFeatures.slice(0, maxFeatures).length;
        this.showMessage('success', `Pagination complete. Total features collected: ${finalCount}`);
        return allFeatures.slice(0, maxFeatures);
    }

    generatePDF = async (features: any[], selectedFields: any, mode: 'download' | 'print' = 'download') => {
        if (!selectedFields) {
            this.showMessage('error', 'No mailing fields configured');
            return;
        }

        try {
            const verb = mode === 'print' ? 'printing' : 'downloading';
            this.showMessage('info', `📄 PDF Generation: Processing ${features.length} features for ${verb}`);

            const pdfGenerator = new SimplePDFGenerator();

            pdfGenerator.generateLabelsPDF(
                features,
                selectedFields,
                this.state.labelFormat,
                this.state.fontSize,
                this.state.startPosition,
                mode
            );

            const successMsg = mode === 'print'
                ? `Sent ${features.length} label(s) to your printer.`
                : `Generated mailing_labels.pdf with ${features.length} mailing labels successfully!`;
            this.showMessage('success', successMsg);

        } catch (error: any) {
            this.showMessage('error', `PDF generation failed: ${error.message}`);
        }
    };

    formatAddressLines = (attributes: any, selectedFields: any) => {
        const lines = []

        const name = this.getNameValue(attributes, selectedFields)
        if (name) lines.push(name)

        const addr1 = this.getFieldValue(attributes, selectedFields.address1)
        if (addr1) lines.push(addr1)

        const addr2 = this.getFieldValue(attributes, selectedFields.address2)
        if (addr2) lines.push(addr2)

        const city = this.getFieldValue(attributes, selectedFields.city)
        const state = this.getFieldValue(attributes, selectedFields.state)
        const zip = this.getFieldValue(attributes, selectedFields.zip)

        let cityStateZip = ''
        if (city) cityStateZip += city
        if (state) {
            if (cityStateZip) cityStateZip += ', '
            cityStateZip += state
        }
        if (zip) {
            if (cityStateZip) cityStateZip += ' '
            cityStateZip += zip
        }

        if (cityStateZip) lines.push(cityStateZip)

        return lines.filter(line => line.trim()).slice(0, 4)
    }

    /**
     * Filter out features where all address fields are empty/blank
     * A record is considered empty if address1, city, state, and zip are all empty
     */
    filterEmptyRecords = (features: any[], selectedFields: any): any[] => {
        return features.filter(feature => {
            const attrs = feature.attributes
            const name = this.getNameValue(attrs, selectedFields)
            const addr1 = this.getFieldValue(attrs, selectedFields.address1)
            const city = this.getFieldValue(attrs, selectedFields.city)
            const state = this.getFieldValue(attrs, selectedFields.state)
            const zip = this.getFieldValue(attrs, selectedFields.zip)

            // Keep the record if at least address1 OR (city/state/zip combo) has content
            const hasAddress = addr1 && addr1.toString().trim()
            const hasCityStateZip = (city && city.toString().trim()) ||
                (state && state.toString().trim()) ||
                (zip && zip.toString().trim())

            return hasAddress || hasCityStateZip
        })
    }

    /**
     * Remove duplicate records where the resulting mailing label would be 100% identical.
     * Builds a normalized label string from all mapped fields and deduplicates on that key.
     */
    filterDuplicateRecords = (features: any[], selectedFields: any): any[] => {
        const seen = new Set<string>()
        return features.filter(feature => {
            const attrs = feature.attributes
            const parts = [
                (this.getNameValue(attrs, selectedFields) || '').toString().trim().toUpperCase(),
                (this.getFieldValue(attrs, selectedFields.address1) || '').toString().trim().toUpperCase(),
                (this.getFieldValue(attrs, selectedFields.address2) || '').toString().trim().toUpperCase(),
                (this.getFieldValue(attrs, selectedFields.city) || '').toString().trim().toUpperCase(),
                (this.getFieldValue(attrs, selectedFields.state) || '').toString().trim().toUpperCase(),
                (this.getFieldValue(attrs, selectedFields.zip) || '').toString().trim().toUpperCase()
            ]
            const key = parts.join('|')
            if (seen.has(key)) {
                return false
            }
            seen.add(key)
            return true
        })
    }

    /**
     * Sort features by a chosen address field. Mutates a copy, returns it.
     * Sorts are stable (Array.prototype.sort is stable in modern JS engines).
     * For 'zip', sorts as strings so leading-zero zips like "01234" group correctly.
     */
    sortFeatures = (features: any[], selectedFields: any, sortBy: 'none' | 'name' | 'city' | 'state' | 'zip'): any[] => {
        if (sortBy === 'none' || !features || features.length < 2) return features;

        const keyFor = (f: any): string => {
            const attrs = f.attributes || {};
            switch (sortBy) {
                case 'name': return (this.getNameValue(attrs, selectedFields) || '').toString().trim().toUpperCase();
                case 'city': return (this.getFieldValue(attrs, selectedFields.city) || '').toString().trim().toUpperCase();
                case 'state': return (this.getFieldValue(attrs, selectedFields.state) || '').toString().trim().toUpperCase();
                case 'zip': return (this.getFieldValue(attrs, selectedFields.zip) || '').toString().trim();
                default: return '';
            }
        };

        // Decorate-sort-undecorate so we don't recompute the key per comparison
        return features
            .map((f, i) => ({ f, i, k: keyFor(f) }))
            .sort((a, b) => {
                if (a.k === b.k) return a.i - b.i;       // stable tiebreak
                if (a.k === '') return 1;                 // empty keys to the end
                if (b.k === '') return -1;
                return a.k < b.k ? -1 : 1;
            })
            .map(x => x.f);
    }

    generateCSV = (features: any[], selectedFields: any) => {
        if (!selectedFields) {
            this.showMessage('error', 'No mailing fields configured');
            return;
        }

        const headers = ['Name', 'Address1', 'Address2', 'City', 'State', 'Zip'];
        const csvContent = [headers.join(',')];

        features.forEach(feature => {
            const attrs = feature.attributes;
            const row = [
                this.getNameValue(attrs, selectedFields),
                this.getFieldValue(attrs, selectedFields.address1),
                this.getFieldValue(attrs, selectedFields.address2),
                this.getFieldValue(attrs, selectedFields.city),
                this.getFieldValue(attrs, selectedFields.state),
                this.getFieldValue(attrs, selectedFields.zip)
            ];

            const csvRow = row.map(value => `"${(value || '').toString().replace(/"/g, '""')}"`);
            csvContent.push(csvRow.join(','));
        });

        const csvString = csvContent.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const filename = this.getUniqueFilename('mailing_labels', '.csv');

        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showMessage('success', `Generated ${filename} with ${features.length} mailing labels successfully!`);
    };

    activateDrawTool = (tool: 'point' | 'polyline' | 'polygon' | 'rectangle' | 'circle' | 'multipoint') => {
        if (!this.sketchVM || !this.state.mapView) {
            return;
        }

        // Turn off delete mode if active and re-enable popups
        if (this.state.isDeleteMode) {
            this.setState({ isDeleteMode: false });
            if (this.state.mapView?.view) {
                this.state.mapView.view.container.style.cursor = 'default';
                
                // Re-enable popups
                if (this.state.mapView.view.popup) {
                    this.state.mapView.view.popup.autoOpenEnabled = true;
                }
            }
            
            // Remove delete click handler
            if (this.deleteClickHandler) {
                this.deleteClickHandler.remove();
                this.deleteClickHandler = null;
            }
        }

        this.clearSelection();

        // Multipoint uses custom click-based drawing, not SketchVM
        if (tool === 'multipoint') {
            this.setState({
                currentTool: 'multipoint',
                isDrawing: true,
                multipointLocations: [],
                drawingPoints: [],
                activeDrawingGraphics: []
            });
            this.startMultipointDrawing();
            return;
        }

        this.setState({ currentTool: tool, isDrawing: true });

        this.sketchVM.create(tool);
    };

    startMultipointDrawing = () => {
        const view = this.state.mapView!.view;

        this.clearDrawingHandlers();

        const clickHandler = view.on('click', (event: any) => {
            if (this.state.widgetOpen) {
                event.stopPropagation();
            }

            try {
                const mapPoint = view.toMap({
                    x: event.x,
                    y: event.y
                });

                if (mapPoint && mapPoint.x !== undefined && mapPoint.y !== undefined) {
                    // Add a visible point marker on the map
                    this.addMultipointGraphic(mapPoint);

                    // Store this point location
                    const updatedLocations = [...this.state.multipointLocations, mapPoint];
                    this.setState({ multipointLocations: updatedLocations });

                    this.showMessage('info', `${updatedLocations.length} point(s) placed. Double-click or press Finish to complete.`);
                }
            } catch (error) {
                // Handle silently
            }
        });

        const doubleClickHandler = view.on('double-click', (event: any) => {
            if (this.state.widgetOpen) {
                event.stopPropagation();
            }

            if (this.state.multipointLocations.length >= 1) {
                this.finishMultipointDrawing();
            } else {
                this.showMessage('warning', 'Place at least 1 point before finishing.');
            }
        });

        this.drawingHandlers = [clickHandler, doubleClickHandler];
    };

    addMultipointGraphic = (point: any) => {
        if (!this.state.graphicsLayer) return;

        const pointCount = this.state.multipointLocations.length + 1;

        // Point marker
        const graphic = new Graphic({
            geometry: point,
            symbol: {
                type: 'simple-marker',
                color: [0, 121, 193, 0.9],
                size: 12,
                outline: {
                    color: [255, 255, 255],
                    width: 2
                }
            },
            attributes: { isMultipoint: true, pointIndex: pointCount }
        });

        this.state.graphicsLayer.add(graphic);
        this.setState({
            activeDrawingGraphics: [...this.state.activeDrawingGraphics, graphic]
        });

        // If buffer distance is set, show a preview buffer circle around the point
        const { bufferDistance, bufferUnit } = this.state;
        if (bufferDistance > 0) {
            try {
                const view = this.state.mapView!.view;
                const isGeographic = view.spatialReference?.isWGS84 || view.spatialReference?.isWebMercator;
                let bufferResult = isGeographic
                    ? geometryEngine.geodesicBuffer(point, bufferDistance, bufferUnit as any)
                    : geometryEngine.buffer(point, bufferDistance, bufferUnit as any);

                if (Array.isArray(bufferResult)) {
                    bufferResult = bufferResult[0];
                }

                if (bufferResult) {
                    const bufferGraphic = new Graphic({
                        geometry: bufferResult,
                        symbol: {
                            type: 'simple-fill',
                            color: [0, 121, 193, 0.1],
                            outline: { color: [0, 121, 193, 0.5], width: 1, style: 'dash' }
                        },
                        attributes: { isMultipoint: true, isBufferPreview: true }
                    });
                    this.state.graphicsLayer.add(bufferGraphic);
                    this.setState({
                        activeDrawingGraphics: [...this.state.activeDrawingGraphics, bufferGraphic]
                    });
                }
            } catch (err) {
                // Buffer preview failed, continue without it
            }
        }
    };

    finishMultipointDrawing = async () => {
        const points = this.state.multipointLocations;
        if (points.length === 0) {
            this.showMessage('warning', 'No points placed.');
            this.clearDrawing();
            return;
        }

        this.clearDrawingHandlers();
        this.showMessage('info', `Processing ${points.length} point(s)...`);

        const { bufferDistance, bufferUnit } = this.state;
        const view = this.state.mapView!.view;
        const layer = this.getCurrentActiveLayer();

        if (!layer) {
            this.showMessage('error', 'No layer available for query.');
            this.clearDrawing();
            return;
        }

        // Clear the drawing state but keep graphics visible
        this.setState({
            isDrawing: false,
            currentTool: ''
        });

        try {
            let allFeatures: any[] = [];
            let allGeometries: any[] = [];

            for (const point of points) {
                let queryGeometry: any = point;

                // Apply buffer if configured
                if (bufferDistance > 0) {
                    try {
                        const isGeographic = view.spatialReference?.isWGS84 || view.spatialReference?.isWebMercator;
                        let bufferResult = isGeographic
                            ? geometryEngine.geodesicBuffer(point, bufferDistance, bufferUnit as any)
                            : geometryEngine.buffer(point, bufferDistance, bufferUnit as any);

                        if (Array.isArray(bufferResult)) {
                            bufferResult = bufferResult[0];
                        }

                        if (bufferResult) {
                            queryGeometry = bufferResult;

                            // Add buffer area graphic (blue fill)
                            if (this.sketchLayer) {
                                this.sketchLayer.add(new Graphic({
                                    geometry: bufferResult,
                                    symbol: {
                                        type: 'simple-fill',
                                        color: [0, 0, 255, 0.1],
                                        outline: { color: [0, 0, 255, 0.8], width: 2 }
                                    }
                                }));
                            }
                        }
                    } catch (err) {
                        // Buffer failed for this point, use point geometry directly
                    }
                }

                // Add the point marker to sketch layer (orange)
                if (this.sketchLayer) {
                    this.sketchLayer.add(new Graphic({
                        geometry: point,
                        symbol: {
                            type: 'simple-marker',
                            color: [255, 140, 0, 0.8],
                            size: 10,
                            outline: { color: [255, 140, 0, 1], width: 2 }
                        }
                    }));
                }

                // Query features at this point/buffer
                try {
                    const query = layer.createQuery();
                    query.geometry = queryGeometry;
                    query.spatialRelationship = 'intersects';
                    query.returnGeometry = true;
                    query.outFields = ['*'];

                    const result = await layer.queryFeatures(query);

                    if (result.features && result.features.length > 0) {
                        allFeatures.push(...result.features);
                    }

                    allGeometries.push(queryGeometry);
                } catch (err) {
                    // Query failed for this point, continue with others
                }
            }

            // Deduplicate features by object ID
            if (allFeatures.length > 0 && layer.objectIdField) {
                const seen = new Set();
                allFeatures = allFeatures.filter(f => {
                    const oid = f.attributes[layer.objectIdField];
                    if (seen.has(oid)) return false;
                    seen.add(oid);
                    return true;
                });
            }

            // Clear temporary multipoint graphics
            if (this.state.graphicsLayer) {
                const multipointGraphics = this.state.graphicsLayer.graphics.filter(
                    (g: any) => g.attributes && g.attributes.isMultipoint
                );
                multipointGraphics.forEach((g: any) => this.state.graphicsLayer.remove(g));
            }

            // Highlight and update state
            if (allFeatures.length > 0) {
                await this.highlightSelectedFeatures(allFeatures);
            } else {
                this.clearAllHighlights();
            }

            // Create a single Selection object for all multipoint geometries
            // Note: This treats all points as one selection area for simplicity
            const selectionId = `selection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const objectIdField = layer.objectIdField || 'OBJECTID';
            
            // Create a multipolygon that represents all the query geometries
            const combinedGeometry = allGeometries.length === 1 ? allGeometries[0] : {
                type: 'multipoint',
                points: points,
                spatialReference: this.state.mapView.view.spatialReference
            };
            
            const selection: Selection = {
                selectionId: selectionId,
                geometry: combinedGeometry,
                featureObjectIds: allFeatures.map(f => f.attributes[objectIdField]),
                features: allFeatures
            };

            this.setState({
                selections: [selection],
                selectedFeatureCount: allFeatures.length,
                multipointLocations: [],
                drawingPoints: [],
                activeDrawingGraphics: []
            });

            this.showMessage('success', `${allFeatures.length} feature(s) selected from ${points.length} point(s).`);
        } catch (err) {
            this.showMessage('error', 'Failed to process multipoint selection.');
            this.setState({
                multipointLocations: [],
                drawingPoints: [],
                activeDrawingGraphics: [],
                isDrawing: false,
                currentTool: ''
            });
        }
    };

    getUniqueFilename = (baseName: string, extension: string) => {
        return baseName + extension
    }

    getFieldValue = (attributes: any, fieldName: string) => {
        return fieldName ? attributes[fieldName] : ''
    }

    getNameValue = (attributes: any, fieldMappings: any): string => {
        if (fieldMappings.useCustomName && fieldMappings.nameCustomText) {
            return fieldMappings.nameCustomText;
        }
        return this.getFieldValue(attributes, fieldMappings.name);
    }

    render() {
        const { useMapWidgetIds, selectedFields, ownerFields, enableGeometrySelection, enabledAddressTypes } = this.props.config || {};
        const mapWidgetId = useMapWidgetIds?.[0] || null;

        // Determine which address types are enabled
        const physicalEnabled = enabledAddressTypes?.physical !== false;
        const ownerEnabled = enabledAddressTypes?.owner === true;
        const showAddressTypeSelection = physicalEnabled && ownerEnabled; // Only show selection if both are enabled

        // FIXED: Use the CORRECT layer based on address type (removed the swap)
        const currentLayer = this.state.labelType === 'owner' ?
            (this.state.ownerLayer || this.state.selectedLayer) :  // For owner address, use owner layer
            this.state.selectedLayer; // For physical address, use physical layer

        // FIXED: Use the CORRECT field configurations (removed the swap)
        const currentFields = this.state.labelType === 'owner' ? ownerFields : selectedFields;

        const labelFormatOptions = [
            { value: 'avery5160', short: 'Avery 5160', long: '2⅝" × 1" — 30 labels' },
            { value: 'avery5161', short: 'Avery 5161', long: '4" × 1" — 20 labels' },
            { value: 'avery5162', short: 'Avery 5162', long: '4" × 1⅓" — 14 labels' },
            { value: 'avery5163', short: 'Avery 5163', long: '4" × 2" — 10 labels' },
            { value: 'avery5164', short: 'Avery 5164', long: '3⅓" × 4" — 6 labels' },
            { value: 'avery5165', short: 'Avery 5165', long: '8" × 10" — 1 full-sheet label' },
            { value: 'avery5167', short: 'Avery 5167', long: '1¾" × ½" — 80 return-address labels' },
            { value: 'avery5168', short: 'Avery 5168', long: '3½" × 5" — 4 shipping labels' }
        ] as const;
        const currentFormatLong = labelFormatOptions.find(o => o.value === this.state.labelFormat)?.long || '';

        const drawTools = [
            { tool: 'point', icon: PinIcon, label: 'Point' },
            { tool: 'multipoint', icon: MultipointIcon, label: 'Multipoint' },
            { tool: 'polyline', icon: LineIcon, label: 'Line' },
            { tool: 'polygon', icon: PolygonIcon, label: 'Polygon' },
            { tool: 'rectangle', icon: RectangleIcon, label: 'Rectangle' },
            { tool: 'circle', icon: CircleIcon, label: 'Circle' }
        ];

        // -- Design system --------------------------------------------------------------
        // Tokens chosen to feel modern and calm: tight type scale, soft shadows,
        // restrained accent color, generous spacing rhythm.
        const tokens = {
            primary: '#0079c1',
            primaryHover: '#005a91',
            accent: '#1f8a4c',
            border: '#e3e6eb',
            borderStrong: '#c7ccd4',
            bg: '#ffffff',
            bgSubtle: '#f5f7fa',
            text: '#1a2533',
            textMuted: '#5b6470',
            textFaint: '#8a929c',
            danger: '#c0392b',
            dangerBg: '#fbe9e7',
            success: '#0a8043',
            successBg: '#e6f4ec',
            warning: '#9a6300',
            warningBg: '#fdf3df',
            info: '#0c5460',
            infoBg: '#dff1f7',
            fontStack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
            shadowSm: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.05)',
            shadowMd: '0 2px 6px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.05)',
            radius: '10px',
            radiusSm: '6px'
        };

        // Backwards-compatible names (every existing panel uses these)
        const panelStyle: any = {
            marginBottom: '8px',
            padding: '10px 12px',
            background: tokens.bg,
            borderRadius: tokens.radius,
            border: `1px solid ${tokens.border}`,
            boxShadow: tokens.shadowSm
        };
        const headingStyle: any = {
            fontWeight: 600,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: tokens.textMuted,
            marginBottom: '8px'
        };
        const selectStyle: any = {
            padding: '6px 8px',
            fontSize: '12px',
            borderRadius: tokens.radiusSm,
            border: `1px solid ${tokens.borderStrong}`,
            color: tokens.text,
            background: '#fff',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 120ms ease, box-shadow 120ms ease'
        };

        // Section pill — slimmer divider used between groups of cards
        const sectionPill = (label: string, key: string) => jsx('div', {
            key,
            role: 'separator',
            'aria-label': label,
            style: {
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: tokens.textFaint,
                margin: '4px 4px 4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            },
            children: [
                jsx('span', { key: 'lbl', children: label }),
                jsx('span', {
                    key: 'rule',
                    style: { flex: 1, height: '1px', background: tokens.border }
                })
            ]
        });

        // Collapsible card wrapper — the card's <header> is a button that toggles
        // visibility of `body`. Keeps the same `panelStyle` look so the rest of the
        // widget stays consistent. Each card's `key` (also used by the partition
        // step) doubles as its collapse-state identifier.
        const collapsibleCard = (key: string, title: string, body: any[], opts?: { headingId?: string }) => {
            const collapsed = !!this.state.collapsedSections[key];
            const headingId = opts?.headingId || `${key}-heading`;
            const bodyId = `${key}-body`;
            return jsx('div', {
                key,
                role: 'group',
                'aria-labelledby': headingId,
                style: panelStyle,
                children: [
                    jsx('button', {
                        key: 'card-toggle',
                        id: headingId,
                        type: 'button',
                        onClick: () => this.toggleSection(key),
                        'aria-expanded': collapsed ? 'false' : 'true',
                        'aria-controls': bodyId,
                        style: {
                            ...headingStyle,
                            // Override a couple of headingStyle bits to make it a button
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            // No bottom margin when collapsed — body is hidden, save the gap
                            marginBottom: collapsed ? 0 : '8px',
                            textAlign: 'left'
                        },
                        children: [
                            jsx('span', { key: 't', children: title }),
                            jsx('span', {
                                key: 'caret',
                                'aria-hidden': 'true',
                                style: {
                                    fontSize: '10px',
                                    color: tokens.textFaint,
                                    transition: 'transform 120ms ease',
                                    display: 'inline-block',
                                    transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)'
                                },
                                children: '▾'
                            })
                        ]
                    }),
                    !collapsed && jsx('div', {
                        key: 'card-body',
                        id: bodyId,
                        children: body
                    })
                ]
            });
        };

        const children = [];

        // -- Title + selection banner ----------------------------------------------------
        // The title sits on a soft surface with the selection state at its right.
        const selCount = this.state.selectedFeatureCount;
        const selAreas = this.state.selections.length;
        const hasSelection = selAreas > 0 && selCount > 0;

        children.push(jsx('div', {
            key: 'header',
            role: 'banner',
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '8px 12px',
                marginBottom: '8px',
                background: `linear-gradient(180deg, ${tokens.bgSubtle} 0%, #ffffff 100%)`,
                border: `1px solid ${tokens.border}`,
                borderRadius: tokens.radius,
                fontFamily: tokens.fontStack
            },
            children: [
                jsx('div', {
                    key: 'title-block',
                    style: { display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 },
                    children: [
                        jsx('div', {
                            key: 'title',
                            style: { fontSize: '13px', fontWeight: 700, color: tokens.text, lineHeight: 1.1 },
                            children: 'Mailing Labels'
                        }),
                        jsx('div', {
                            key: 'subtitle',
                            style: { fontSize: '10.5px', color: tokens.textMuted, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
                            children: hasSelection
                                ? `${selCount} feature${selCount === 1 ? '' : 's'} ready to export`
                                : 'Select features on the map, then export.'
                        })
                    ]
                }),
                hasSelection ? jsx('div', {
                    key: 'count-badge',
                    role: 'status',
                    'aria-live': 'polite',
                    'aria-atomic': 'true',
                    title: `${selCount} feature${selCount === 1 ? '' : 's'} across ${selAreas} selection area${selAreas === 1 ? '' : 's'}`,
                    style: {
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 8px',
                        background: tokens.successBg,
                        color: tokens.success,
                        border: `1px solid ${tokens.success}33`,
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                    },
                    children: [
                        jsx('span', {
                            key: 'dot',
                            'aria-hidden': 'true',
                            style: { width: '5px', height: '5px', borderRadius: '50%', background: tokens.success, display: 'inline-block' }
                        }),
                        jsx('span', { key: 'lbl', children: `${selCount} selected` })
                    ]
                }) : jsx('div', {
                    key: 'empty-badge',
                    style: {
                        padding: '4px 8px',
                        background: tokens.bgSubtle,
                        color: tokens.textFaint,
                        border: `1px solid ${tokens.border}`,
                        borderRadius: '999px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                    },
                    children: 'No selection'
                })
            ]
        }));

        // Map component (invisible — for data binding only)
        if (mapWidgetId) {
            children.push(jsx(JimuMapViewComponent, {
                key: 'map',
                useMapWidgetId: mapWidgetId,
                onActiveViewChange: this.onActiveViewChange
            }));
        }

        // (Layer / configured-fields info panel removed — was noisy and rarely useful at runtime.)

        // Output Settings — merged panel (label type, format, font, sort, output filters)
        {
            // Compact label/control row helper used inside this panel
            const labelColW = '54px';
            const formRow = (key: string, labelText: string, controlNode: any) => jsx('div', {
                key,
                style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' },
                children: [
                    jsx('span', {
                        key: 'lbl',
                        style: {
                            fontSize: '10.5px',
                            fontWeight: 600,
                            color: tokens.textMuted,
                            width: labelColW,
                            flexShrink: 0,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase'
                        },
                        children: labelText
                    }),
                    jsx('div', {
                        key: 'ctl',
                        style: { flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 },
                        children: controlNode
                    })
                ]
            });

            const outputRows: any[] = [];

            // Row: address type (only when both are enabled)
            if (showAddressTypeSelection) {
                outputRows.push(formRow('row-type', 'Type', jsx('div', {
                    key: 'type-group',
                    role: 'radiogroup',
                    'aria-label': 'Label type',
                    style: { display: 'flex', gap: '12px', fontSize: '12px', color: tokens.text },
                    children: [
                        jsx('label', {
                            key: 'opt-owner',
                            title: 'Use property owner mailing addresses',
                            style: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' },
                            children: [
                                jsx('input', {
                                    key: 'i', type: 'radio', name: 'labelType', value: 'owner',
                                    checked: this.state.labelType === 'owner',
                                    onChange: (e: any) => {
                                        if (e.target.value !== this.state.labelType) {
                                            this.onLabelTypeChange(e.target.value as 'physical' | 'owner');
                                        }
                                    }
                                }),
                                jsx('span', { key: 't', children: 'Owner' })
                            ]
                        }),
                        jsx('label', {
                            key: 'opt-physical',
                            title: 'Use physical property addresses',
                            style: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' },
                            children: [
                                jsx('input', {
                                    key: 'i', type: 'radio', name: 'labelType', value: 'physical',
                                    checked: this.state.labelType === 'physical',
                                    onChange: (e: any) => {
                                        if (e.target.value !== this.state.labelType) {
                                            this.onLabelTypeChange(e.target.value as 'physical' | 'owner');
                                        }
                                    }
                                }),
                                jsx('span', { key: 't', children: 'Physical' })
                            ]
                        })
                    ]
                })));
            }

            // Row: format + font (side by side, with a small description below the format)
            outputRows.push(formRow('row-fmt', 'Format', jsx('div', {
                key: 'fmt-col',
                style: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 },
                children: [
                    jsx('div', {
                        key: 'fmt-row',
                        style: { display: 'flex', gap: '6px', flex: 1, minWidth: 0 },
                        children: [
                            // Custom Format dropdown — shows the short Avery code in
                            // the closed button (no chevron overrun) but renders the
                            // full descriptions in the open panel for clarity.
                            jsx('div', {
                                key: 'fmt-dd',
                                style: { position: 'relative', flex: 1, minWidth: 0 },
                                children: [
                                    jsx('button', {
                                        key: 'fmt-btn',
                                        type: 'button',
                                        id: this.labelFormatId,
                                        'aria-haspopup': 'listbox',
                                        'aria-expanded': this.state.formatDropdownOpen ? 'true' : 'false',
                                        'aria-label': `Label format, currently ${labelFormatOptions.find(o => o.value === this.state.labelFormat)?.short || this.state.labelFormat}`,
                                        title: currentFormatLong || 'Label format',
                                        onClick: () => this.setState({ formatDropdownOpen: !this.state.formatDropdownOpen }),
                                        onBlur: () => {
                                            // Defer so a click inside the panel registers before close
                                            window.setTimeout(() => {
                                                if (this.state.formatDropdownOpen) {
                                                    this.setState({ formatDropdownOpen: false });
                                                }
                                            }, 150);
                                        },
                                        onKeyDown: (e: any) => {
                                            if (e.key === 'Escape' && this.state.formatDropdownOpen) {
                                                e.preventDefault();
                                                this.setState({ formatDropdownOpen: false });
                                            }
                                        },
                                        style: {
                                            ...selectStyle,
                                            width: '100%',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '6px',
                                            fontFamily: 'inherit'
                                        },
                                        children: [
                                            jsx('span', {
                                                key: 'short',
                                                style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
                                                children: labelFormatOptions.find(o => o.value === this.state.labelFormat)?.short || this.state.labelFormat
                                            }),
                                            jsx('span', {
                                                key: 'caret',
                                                'aria-hidden': 'true',
                                                style: { fontSize: '10px', color: tokens.textFaint, flexShrink: 0 },
                                                children: '▾'
                                            })
                                        ]
                                    }),
                                    this.state.formatDropdownOpen ? jsx('ul', {
                                        key: 'fmt-list',
                                        role: 'listbox',
                                        'aria-labelledby': this.labelFormatId,
                                        style: {
                                            listStyle: 'none',
                                            margin: '4px 0 0',
                                            padding: '4px 0',
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            zIndex: 6,
                                            background: '#fff',
                                            border: `1px solid ${tokens.border}`,
                                            borderRadius: tokens.radiusSm,
                                            boxShadow: tokens.shadowMd,
                                            maxHeight: '260px',
                                            overflowY: 'auto'
                                        },
                                        children: labelFormatOptions.map(o => {
                                            const selected = o.value === this.state.labelFormat;
                                            return jsx('li', {
                                                key: o.value,
                                                role: 'option',
                                                'aria-selected': selected ? 'true' : 'false',
                                                tabIndex: 0,
                                                // Use onMouseDown so it fires before button onBlur
                                                onMouseDown: (e: any) => {
                                                    e.preventDefault();
                                                    const spec = LABEL_FORMATS[o.value];
                                                    const perSheet = spec ? spec.labelsPerRow * spec.rowsPerPage : 30;
                                                    const start = Math.min(this.state.startPosition || 1, perSheet);
                                                    this.setState({ labelFormat: o.value, startPosition: start, formatDropdownOpen: false });
                                                },
                                                onKeyDown: (e: any) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        const spec = LABEL_FORMATS[o.value];
                                                        const perSheet = spec ? spec.labelsPerRow * spec.rowsPerPage : 30;
                                                        const start = Math.min(this.state.startPosition || 1, perSheet);
                                                        this.setState({ labelFormat: o.value, startPosition: start, formatDropdownOpen: false });
                                                    }
                                                },
                                                onMouseEnter: (e: any) => { if (!selected) e.currentTarget.style.background = tokens.bgSubtle; },
                                                onMouseLeave: (e: any) => { if (!selected) e.currentTarget.style.background = 'transparent'; },
                                                style: {
                                                    padding: '7px 10px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    color: tokens.text,
                                                    background: selected ? tokens.bgSubtle : 'transparent',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '1px'
                                                },
                                                children: [
                                                    jsx('span', {
                                                        key: 'sl',
                                                        style: { fontWeight: selected ? 600 : 500 },
                                                        children: o.short
                                                    }),
                                                    jsx('span', {
                                                        key: 'lg',
                                                        style: { fontSize: '11px', color: tokens.textMuted },
                                                        children: o.long
                                                    })
                                                ]
                                            });
                                        })
                                    }) : null
                                ]
                            }),
                            jsx('select', {
                                key: 'font',
                                id: this.fontSizeId,
                                'aria-label': 'Font size',
                                value: this.state.fontSize.toString(),
                                onChange: (e: any) => this.setState({ fontSize: parseInt(e.target.value) }),
                                title: 'Font size',
                                style: { ...selectStyle, width: '64px', flexShrink: 0 },
                                children: [5, 6, 7, 8, 9, 10, 11, 12, 14, 16].map(size => jsx('option', { key: size, value: size.toString(), children: `${size}pt` }))
                            })
                        ]
                    }),
                    // Description of the selected format. Truncates with ellipsis on tight panels.
                    currentFormatLong ? jsx('div', {
                        key: 'fmt-desc',
                        style: {
                            fontSize: '10.5px',
                            color: tokens.textFaint,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        },
                        title: currentFormatLong,
                        children: currentFormatLong
                    }) : null
                ]
            })));

            // Row: sort dropdown
            outputRows.push(formRow('row-sort', 'Sort', jsx('select', {
                key: 'sort',
                id: this.sortById,
                'aria-label': 'Sort labels',
                value: this.state.sortBy,
                onChange: (e: any) => this.setState({ sortBy: e.target.value as State['sortBy'] }),
                title: 'Sort labels (zip-sort is required for USPS bulk-mail discounts)',
                style: { ...selectStyle, flex: 1, minWidth: 0 },
                children: [
                    jsx('option', { key: 'none', value: 'none', children: 'No sort (selection order)' }),
                    jsx('option', { key: 'name', value: 'name', children: 'Name (A → Z)' }),
                    jsx('option', { key: 'city', value: 'city', children: 'City (A → Z)' }),
                    jsx('option', { key: 'state', value: 'state', children: 'State (A → Z)' }),
                    jsx('option', { key: 'zip', value: 'zip', children: 'ZIP (USPS bulk mail)' })
                ]
            })));

            // Row: filter checkboxes (compact, side-by-side)
            outputRows.push(formRow('row-filters', 'Filter', jsx('div', {
                key: 'filters',
                style: { display: 'flex', gap: '14px', alignItems: 'center', fontSize: '12px', color: tokens.text, flexWrap: 'wrap' },
                children: [
                    jsx('label', {
                        key: 'no-empty',
                        title: 'Exclude records with no address data',
                        style: { display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' },
                        children: [
                            jsx('input', {
                                key: 'i', type: 'checkbox',
                                checked: this.state.removeEmptyRecords,
                                onChange: (e: any) => this.setState({ removeEmptyRecords: e.target.checked }),
                                style: { width: '14px', height: '14px', accentColor: tokens.primary }
                            }),
                            jsx('span', { key: 't', children: 'No empty' })
                        ]
                    }),
                    jsx('label', {
                        key: 'no-dupes',
                        title: 'Exclude labels where all address fields are identical',
                        style: { display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' },
                        children: [
                            jsx('input', {
                                key: 'i', type: 'checkbox',
                                checked: this.state.removeDuplicates,
                                onChange: (e: any) => this.setState({ removeDuplicates: e.target.checked }),
                                style: { width: '14px', height: '14px', accentColor: tokens.primary }
                            }),
                            jsx('span', { key: 't', children: 'No duplicates' })
                        ]
                    })
                ]
            })));

            children.push(collapsibleCard('output-settings', 'Output', outputRows));
        }

        // Partial-Sheet Start Position — compact: input + grid side-by-side
        {
            const fmtSpec = LABEL_FORMATS[this.state.labelFormat] || LABEL_FORMATS.avery5160;
            const cols = fmtSpec.labelsPerRow;
            const rows = fmtSpec.rowsPerPage;
            const labelsPerSheet = cols * rows;
            const start = Math.max(1, Math.min(this.state.startPosition, labelsPerSheet));

            // Tighter sizing: max 110px-wide grid, smaller cell height
            const maxGridWidth = 110;
            const cellW = Math.max(7, Math.floor(maxGridWidth / cols));
            const aspect = fmtSpec.height / fmtSpec.width;
            const rawCellH = Math.round(cellW * aspect);
            const cellH = Math.max(5, Math.min(rawCellH, 14));

            const cells = [];
            for (let i = 1; i <= labelsPerSheet; i++) {
                const isStart = i === start;
                const isSkipped = i < start;
                cells.push(jsx('button', {
                    key: `cell-${i}`,
                    type: 'button',
                    onClick: () => this.setState({ startPosition: i }),
                    title: `Start at label ${i}`,
                    'aria-label': `Start at label ${i}`,
                    'aria-pressed': isStart ? 'true' : 'false',
                    style: {
                        width: `${cellW}px`,
                        height: `${cellH}px`,
                        padding: 0,
                        border: isStart ? `1.5px solid ${tokens.primary}` : `1px solid ${tokens.borderStrong}`,
                        background: isStart ? tokens.primary : (isSkipped ? '#e9ecef' : '#fff'),
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                    }
                }));
            }

            children.push(collapsibleCard('start-position', 'Partial sheet', [
                jsx('div', {
                    key: 'sp-row',
                    style: { display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' },
                    children: [
                        jsx('div', {
                            key: 'sp-controls',
                            style: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
                            children: [
                                jsx('label', {
                                    key: 'sp-input-label',
                                    htmlFor: this.startPositionId,
                                    style: { fontSize: '11px', color: tokens.textMuted },
                                    children: 'Start'
                                }),
                                jsx('input', {
                                    key: 'sp-input',
                                    id: this.startPositionId,
                                    type: 'number',
                                    min: 1,
                                    max: labelsPerSheet,
                                    value: this.state.startPosition,
                                    onChange: (e: any) => {
                                        const raw = parseInt(e.target.value, 10);
                                        if (Number.isFinite(raw)) {
                                            this.setState({ startPosition: Math.max(1, Math.min(raw, labelsPerSheet)) });
                                        } else {
                                            this.setState({ startPosition: 1 });
                                        }
                                    },
                                    style: { ...selectStyle, width: '52px', padding: '4px 6px' }
                                }),
                                jsx('span', {
                                    key: 'sp-of',
                                    style: { fontSize: '11px', color: tokens.textFaint },
                                    children: `of ${labelsPerSheet}`
                                })
                            ]
                        }),
                        jsx('div', {
                            key: 'sp-grid',
                            role: 'group',
                            'aria-label': 'Click a slot to choose where to start',
                            title: start === 1
                                ? 'Click a cell to start mid-sheet'
                                : `Skipping the first ${start - 1} label${start - 1 === 1 ? '' : 's'}`,
                            style: {
                                display: 'grid',
                                gridTemplateColumns: `repeat(${cols}, ${cellW}px)`,
                                gridAutoRows: `${cellH}px`,
                                gap: '1px',
                                padding: '4px',
                                background: '#fff',
                                border: `1px solid ${tokens.border}`,
                                borderRadius: tokens.radiusSm,
                                width: 'fit-content'
                            },
                            children: cells
                        })
                    ]
                })
            ]));
        }

        // Output options merged into the 'Output' card above; this block intentionally removed.

        // Address search panel (only when a geocode URL is configured) - WCAG 1.3.1, 4.1.2
        const geocodeUrl = (this.props.config as any)?.geocodeUrl as string | undefined;
        if (geocodeUrl && geocodeUrl.trim() && currentLayer) {
            const suggestionsListId = 'address-suggestions-list';
            const hasSuggestions = this.state.addressSuggestionsOpen
                && this.state.addressSearchText.trim().length >= 2
                && this.state.addressSuggestions.length > 0;

            const searchInput = jsx('input', {
                key: 'address-search-input',
                id: this.addressSearchInputId,
                type: 'text',
                role: 'combobox',
                'aria-expanded': hasSuggestions ? 'true' : 'false',
                'aria-controls': suggestionsListId,
                'aria-autocomplete': 'list',
                placeholder: 'Search by address…',
                value: this.state.addressSearchText,
                onChange: this.handleAddressSearchChange,
                onFocus: () => this.setState({ addressSuggestionsOpen: true }),
                onBlur: () => {
                    // Defer so a click on a suggestion can register before the list closes
                    window.setTimeout(() => this.setState({ addressSuggestionsOpen: false }), 150);
                },
                style: {
                    width: '100%',
                    padding: '7px 30px 7px 32px',
                    fontSize: '12px',
                    borderRadius: tokens.radiusSm,
                    border: `1px solid ${tokens.borderStrong}`,
                    color: tokens.text,
                    background: '#fff',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    outline: 'none'
                }
            });

            // Magnifying-glass prefix icon
            const searchIcon = jsx('svg', {
                key: 'addr-search-icon',
                xmlns: 'http://www.w3.org/2000/svg',
                width: 16, height: 16, viewBox: '0 0 24 24',
                fill: 'none', stroke: tokens.textFaint, strokeWidth: 2,
                strokeLinecap: 'round', strokeLinejoin: 'round',
                'aria-hidden': 'true',
                style: { position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' },
                children: [
                    jsx('circle', { key: 'c', cx: 11, cy: 11, r: 7 }),
                    jsx('line', { key: 'l', x1: 21, y1: 21, x2: 16.65, y2: 16.65 })
                ]
            });

            // Inline clear button — only shown when there is text
            const clearXBtn = this.state.addressSearchText
                ? jsx('button', {
                    key: 'addr-clear-x',
                    type: 'button',
                    'aria-label': 'Clear address',
                    title: 'Clear address',
                    onMouseDown: (e: any) => { e.preventDefault(); this.clearAddressSearch(); },
                    style: {
                        position: 'absolute',
                        right: '6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: tokens.textMuted,
                        lineHeight: 0,
                        borderRadius: '4px'
                    },
                    children: jsx('svg', {
                        xmlns: 'http://www.w3.org/2000/svg',
                        width: 14, height: 14, viewBox: '0 0 24 24',
                        fill: 'none', stroke: 'currentColor', strokeWidth: 2,
                        strokeLinecap: 'round', strokeLinejoin: 'round',
                        'aria-hidden': 'true',
                        children: [
                            jsx('line', { key: 'a', x1: 18, y1: 6, x2: 6, y2: 18 }),
                            jsx('line', { key: 'b', x1: 6, y1: 6, x2: 18, y2: 18 })
                        ]
                    })
                })
                : null;

            const suggestionsList = hasSuggestions ? jsx('ul', {
                key: 'address-suggestions',
                id: suggestionsListId,
                role: 'listbox',
                style: {
                    listStyle: 'none',
                    margin: '6px 0 0',
                    padding: '4px 0',
                    border: `1px solid ${tokens.border}`,
                    borderRadius: tokens.radiusSm,
                    background: '#fff',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: tokens.shadowMd,
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '100%',
                    zIndex: 5
                },
                children: this.state.addressSuggestions.map((s, i) => jsx('li', {
                    key: `sugg-${i}`,
                    role: 'option',
                    'aria-selected': 'false',
                    tabIndex: 0,
                    onMouseDown: (e: any) => { e.preventDefault(); this.pickAddressSuggestion(s); },
                    onKeyDown: (e: any) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            this.pickAddressSuggestion(s);
                        }
                    },
                    style: {
                        padding: '8px 12px',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        color: tokens.text,
                        transition: 'background 80ms ease'
                    },
                    onMouseEnter: (e: any) => { e.currentTarget.style.background = tokens.bgSubtle; },
                    onMouseLeave: (e: any) => { e.currentTarget.style.background = 'transparent'; },
                    children: s.text
                }))
            }) : null;

            // Reserve a stable height for the status line so the card doesn't
            // shrink/grow as the user types (suggestions appear, search state
            // flips, etc.). All status variants below render inside this fixed
            // slot.
            const statusSlotStyle: any = {
                marginTop: '8px',
                minHeight: '28px'
            };

            const statusLine = jsx('div', {
                key: 'addr-status-slot',
                style: statusSlotStyle,
                children: this.state.addressSearchError
                    ? jsx('div', {
                        key: 'addr-error',
                        role: 'alert',
                        style: {
                            fontSize: '12px',
                            color: tokens.danger,
                            padding: '8px 10px',
                            background: tokens.dangerBg,
                            border: `1px solid ${tokens.danger}33`,
                            borderRadius: tokens.radiusSm,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                        },
                        children: [
                            jsx('div', { key: 'h', style: { fontWeight: 600 }, children: 'Geocoder error' }),
                            jsx('div', { key: 'd', style: { fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '11px', wordBreak: 'break-word' }, children: this.state.addressSearchError }),
                            jsx('div', { key: 't', style: { fontSize: '11px', color: tokens.textMuted }, children: 'Open the browser console for full details.' })
                        ]
                    })
                    : this.state.addressSearchLoading
                        ? jsx('div', {
                            key: 'addr-loading',
                            style: { fontSize: '11.5px', color: tokens.textMuted, display: 'flex', alignItems: 'center', gap: '6px' },
                            children: [
                                jsx('span', {
                                    key: 'spin',
                                    'aria-hidden': 'true',
                                    style: {
                                        width: '10px', height: '10px',
                                        border: `2px solid ${tokens.border}`,
                                        borderTopColor: tokens.primary,
                                        borderRadius: '50%',
                                        animation: 'mlspin 0.7s linear infinite',
                                        display: 'inline-block'
                                    }
                                }),
                                jsx('span', { key: 't', children: 'Searching…' })
                            ]
                        })
                        : (this.state.searchedAddress
                            ? jsx('div', {
                                key: 'addr-found',
                                style: {
                                    fontSize: '12px',
                                    color: tokens.success,
                                    padding: '6px 10px',
                                    background: tokens.successBg,
                                    border: `1px solid ${tokens.success}33`,
                                    borderRadius: tokens.radiusSm,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                },
                                children: [
                                    jsx('span', { key: 'pin', 'aria-hidden': 'true', children: '📍' }),
                                    jsx('span', {
                                        key: 'lbl',
                                        style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                                        children: this.state.searchedAddress.label
                                    })
                                ]
                            })
                            : (this.state.addressSearchText.trim().length > 0
                                && this.state.addressSearchText.trim().length < 2
                                ? jsx('div', {
                                    key: 'addr-hint',
                                    style: { fontSize: '11.5px', color: tokens.textFaint },
                                    children: 'Type at least 2 characters.'
                                })
                                : null))
            });

            // Buttons inherit the polished primary/secondary styles defined later for actions,
            // but we need them here too. Recreate locally with smaller padding.
            const localBtnBase: any = {
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', fontSize: '12px', fontWeight: 600,
                borderRadius: tokens.radiusSm, cursor: 'pointer',
                fontFamily: 'inherit', border: 'none',
                transition: 'background 120ms ease, border-color 120ms ease'
            };
            const localPrimary = (disabled: boolean): any => ({
                ...localBtnBase,
                background: disabled ? '#a8c8dc' : tokens.primary,
                color: '#fff',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.7 : 1
            });
            const localSecondary = (disabled: boolean): any => ({
                ...localBtnBase,
                background: '#fff',
                color: tokens.text,
                border: `1px solid ${tokens.borderStrong}`,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.45 : 1
            });

            const actionRow = jsx('div', {
                key: 'addr-actions',
                style: { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' },
                children: [
                    jsx('button', {
                        key: 'addr-select',
                        type: 'button',
                        disabled: !this.state.searchedAddress,
                        title: 'Select features at the searched address using the current buffer',
                        'aria-label': 'Select features at the searched address',
                        onClick: this.selectFeaturesAtSearchedAddress,
                        style: localPrimary(!this.state.searchedAddress),
                        children: 'Select features here'
                    }),
                    jsx('button', {
                        key: 'addr-clear',
                        type: 'button',
                        disabled: !this.state.searchedAddress && !this.state.addressSearchText,
                        title: 'Clear the searched address',
                        'aria-label': 'Clear the searched address',
                        onClick: this.clearAddressSearch,
                        style: localSecondary(!this.state.searchedAddress && !this.state.addressSearchText),
                        children: 'Clear'
                    })
                ]
            });

            children.push(collapsibleCard('address-search-section', 'Address search', [
                jsx('div', {
                    key: 'address-search-wrapper',
                    style: { position: 'relative' },
                    children: [searchIcon, searchInput, clearXBtn, suggestionsList]
                }),
                statusLine,
                actionRow
            ]));
        }

        // Drawing tools section - with accessibility improvements (WCAG 1.3.1, 4.1.2)
        if (enableGeometrySelection && currentLayer) {
            const drawSectionChildren = [
                jsx('div', {
                    key: 'draw-tools',
                    role: 'toolbar',
                    'aria-labelledby': 'draw-section-heading',
                    style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' },
                    children: [
                        ...drawTools.map(({ tool, icon, label }) =>
                            jsx(Button, {
                                type: this.state.currentTool === tool ? 'primary' : 'default',
                                size: 'sm',
                                key: tool,
                                onClick: () => this.activateDrawTool(tool as "polygon" | "point" | "rectangle" | "circle" | "polyline" | "multipoint"),
                                disabled: this.state.isDrawing && this.state.currentTool !== tool,
                                title: `Draw ${label.toLowerCase()} selection`,
                                'aria-label': `Draw ${label.toLowerCase()} selection`,
                                'aria-pressed': this.state.currentTool === tool ? 'true' : 'false',
                                style: {
                                    background: this.state.currentTool === tool ? '#0079c1' : '#fff',
                                    border: '1px solid #767676',
                                    padding: '6px',
                                    borderRadius: '4px',
                                    cursor: (this.state.isDrawing && this.state.currentTool !== tool) ? 'not-allowed' : 'pointer',
                                    opacity: (this.state.isDrawing && this.state.currentTool !== tool) ? 0.4 : 1
                                },
                                children: jsx('img', {
                                    src: icon,
                                    alt: '',
                                    'aria-hidden': 'true',
                                    style: {
                                        width: '16px',
                                        height: '16px',
                                        filter: this.state.currentTool === tool ? 'brightness(0) invert(1)' : 'none'
                                    }
                                })
                            })
                        ),
                        // Add mode button - allows adding individual features to existing selections
                        this.state.selections.length > 0 && jsx(Button, {
                            type: this.state.isAddMode ? 'primary' : 'default',
                            size: 'sm',
                            key: 'add-mode',
                            onClick: this.toggleAddMode,
                            disabled: this.state.isDrawing,
                            title: this.state.isAddMode ? 'Exit add mode' : 'Add features to selection',
                            'aria-label': this.state.isAddMode ? 'Exit add mode' : 'Add features to selection',
                            'aria-pressed': this.state.isAddMode ? 'true' : 'false',
                            style: {
                                background: this.state.isAddMode ? '#0079c1' : '#fff',
                                border: `1px solid ${this.state.isAddMode ? '#0079c1' : '#767676'}`,
                                padding: '6px',
                                borderRadius: '4px',
                                cursor: this.state.isDrawing ? 'not-allowed' : 'pointer',
                                opacity: this.state.isDrawing ? 0.4 : 1,
                                minWidth: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            },
                            children: jsx('span', {
                                'aria-hidden': 'true',
                                style: {
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    lineHeight: '1',
                                    color: this.state.isAddMode ? '#fff' : '#333'
                                },
                                children: '+'
                            })
                        }),
                        // Delete mode button - allows removing individual drawn geometries
                        this.state.selections.length > 0 && jsx(Button, {
                            type: this.state.isDeleteMode ? 'danger' : 'default',
                            size: 'sm',
                            key: 'delete-mode',
                            onClick: this.toggleDeleteMode,
                            disabled: this.state.isDrawing,
                            title: this.state.isDeleteMode ? 'Exit delete mode' : 'Remove individual selection areas',
                            'aria-label': this.state.isDeleteMode ? 'Exit delete mode' : 'Remove individual selection areas',
                            'aria-pressed': this.state.isDeleteMode ? 'true' : 'false',
                            style: {
                                background: this.state.isDeleteMode ? '#c9252d' : '#fff',
                                border: `1px solid ${this.state.isDeleteMode ? '#c9252d' : '#767676'}`,
                                padding: '6px',
                                borderRadius: '4px',
                                cursor: this.state.isDrawing ? 'not-allowed' : 'pointer',
                                opacity: this.state.isDrawing ? 0.4 : 1
                            },
                            children: jsx('img', {
                                src: TrashIcon,
                                alt: '',
                                'aria-hidden': 'true',
                                style: {
                                    width: '16px',
                                    height: '16px',
                                    filter: this.state.isDeleteMode ? 'brightness(0) invert(1)' : 'none'
                                }
                            })
                        })
                    ]
                }),
                jsx('div', {
                    key: 'buffer-controls',
                    style: { display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' },
                    children: [
                        jsx('label', {
                            key: 'buffer-label-inline',
                            htmlFor: this.bufferInputId,
                            style: { fontSize: '11px', color: tokens.textMuted, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' },
                            children: 'Buffer'
                        }),
                        jsx('input', {
                            key: 'buffer-input',
                            id: this.bufferInputId,
                            type: 'number',
                            min: 0,
                            value: this.state.bufferDistance.toString(),
                            onChange: e => this.setState({ bufferDistance: Number(e.target.value) }),
                            title: 'Buffer distance',
                            style: { ...selectStyle, width: '4.5em', padding: '4px 6px' }
                        }),
                        jsx('label', {
                            key: 'buffer-unit-label',
                            htmlFor: this.bufferUnitId,
                            style: { position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 },
                            children: 'Buffer unit'
                        }),
                        jsx('select', {
                            key: 'buffer-unit',
                            id: this.bufferUnitId,
                            value: this.state.bufferUnit,
                            onChange: e => this.setState({ bufferUnit: e.target.value }),
                            title: 'Buffer distance unit',
                            'aria-label': 'Buffer distance unit',
                            style: { ...selectStyle, padding: '4px 6px', flex: 1, minWidth: 0 },
                            children: ['feet', 'meters', 'kilometers', 'miles'].map(u => jsx('option', { key: u, value: u, children: u }))
                        })
                    ]
                })
            ];

            if (this.state.isDrawing) {
                const isMultipoint = this.state.currentTool === 'multipoint';
                const multipointCount = this.state.multipointLocations.length;

                const alertChildren: any[] = [
                    jsx('span', {
                        key: 'alert-text',
                        children: isMultipoint
                            ? `Multipoint: ${multipointCount} point(s) placed. Click to add more. Double-click or press Finish when done.`
                            : `Drawing ${this.state.currentTool}. Press ESC to cancel.`
                    })
                ];

                if (isMultipoint) {
                    alertChildren.push(
                        jsx('div', {
                            key: 'multipoint-actions',
                            style: { display: 'flex', gap: '6px', marginTop: '6px' },
                            children: [
                                jsx(Button, {
                                    key: 'finish-multipoint',
                                    type: 'primary',
                                    size: 'sm',
                                    disabled: multipointCount === 0,
                                    onClick: this.finishMultipointDrawing,
                                    title: 'Finish multipoint selection',
                                    'aria-label': `Finish multipoint selection with ${multipointCount} points`,
                                    style: {
                                        fontSize: '11px',
                                        padding: '4px 12px',
                                        opacity: multipointCount === 0 ? 0.5 : 1
                                    },
                                    children: `Finish (${multipointCount})`
                                }),
                                jsx(Button, {
                                    key: 'cancel-multipoint',
                                    type: 'default',
                                    size: 'sm',
                                    onClick: () => this.cancelDrawing(),
                                    title: 'Cancel multipoint selection',
                                    'aria-label': 'Cancel multipoint selection',
                                    style: { fontSize: '11px', padding: '4px 12px' },
                                    children: 'Cancel'
                                })
                            ]
                        })
                    );
                }

                drawSectionChildren.push(
                    jsx('div', {
                        key: 'drawing-alert',
                        role: 'status',
                        'aria-live': 'polite',
                        style: {
                            marginTop: '8px',
                            padding: '8px 10px',
                            background: '#fff3cd',
                            border: '1px solid #ffc107',
                            borderRadius: '4px',
                            color: '#664d03',
                            fontSize: '12px'
                        },
                        children: alertChildren
                    })
                );
            }

            children.push(collapsibleCard('draw-section', 'Draw selection', drawSectionChildren));
        }

        // Selection summary moved to the header banner (top of widget) for visibility.

        // Live label preview - shows what one label will look like with current settings.
        // Renders inline (HTML/CSS), updates as the user changes format/font/sort/mappings.
        {
            const fmtSpec = LABEL_FORMATS[this.state.labelFormat] || LABEL_FORMATS.avery5160;

            // Pick the first available feature for real preview data; fall back to sample text.
            let previewLines: string[] = [];
            const firstFeature = this.state.selections.length > 0
                ? this.state.selections[0].features[0]
                : null;

            if (firstFeature && currentFields) {
                // Apply the active sort first so the user sees the *first label that will print*
                const sorted = this.sortFeatures(
                    this.state.selections.flatMap(s => s.features),
                    currentFields,
                    this.state.sortBy
                );
                const top = sorted[0] || firstFeature;
                previewLines = this.formatAddressLines(top.attributes, currentFields);
            }

            const usingSample = previewLines.length === 0;
            if (usingSample) {
                previewLines = ['Sample Recipient', '123 Main Street', 'Anytown, ST 12345'];
            }

            // Scale: target ~260px wide preview now that the export section is full-width again.
            const targetMaxWidth = 260;
            const scale = Math.min(targetMaxWidth / fmtSpec.width, 1.4);
            const boxW = Math.round(fmtSpec.width * scale);
            const boxH = Math.round(fmtSpec.height * scale);
            // Allow tiny font sizes (down to 5pt) to scale proportionally in
            // the preview — 9px floor would otherwise lie about 5/6/7pt picks.
            const previewFontPx = Math.max(6, Math.round(this.state.fontSize * scale));

            children.push(collapsibleCard('preview-panel', 'Preview', [
                jsx('div', {
                    key: 'preview-meta',
                    style: { fontSize: '11px', color: tokens.textMuted, marginBottom: '8px' },
                    children: `${this.state.labelFormat.toUpperCase()} · ${this.state.fontSize}pt${usingSample ? ' · sample data' : ''}`
                }),
                jsx('div', {
                    key: 'preview-stage',
                    style: {
                        display: 'flex',
                        justifyContent: 'center',
                        background: '#fff',
                        border: `1px dashed ${tokens.border}`,
                        borderRadius: tokens.radiusSm,
                        padding: '10px'
                    },
                    children: jsx('div', {
                        key: 'preview-label',
                        'aria-label': 'Single label preview',
                        style: {
                            width: `${boxW}px`,
                            height: `${boxH}px`,
                            border: `1px solid ${tokens.borderStrong}`,
                            borderRadius: '2px',
                            background: '#fff',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '4px',
                            fontFamily: 'Helvetica, Arial, sans-serif',
                            fontSize: `${previewFontPx}px`,
                            lineHeight: '1.2',
                            color: tokens.text,
                            overflow: 'hidden',
                            textAlign: 'center',
                            boxSizing: 'border-box'
                        },
                        children: previewLines.map((line, i) => jsx('div', {
                            key: `pl-${i}`,
                            style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' },
                            children: line
                        }))
                    })
                })
            ]));
        }

        // Action Buttons — labeled, with primary/secondary hierarchy
        const isBusy = this.state.isGenerating;
        const noSelection = !this.state.selections.length && !this.state.isDrawing;

        const actionBtnLabel: any = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '7px 10px',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: tokens.fontStack,
            borderRadius: tokens.radiusSm,
            cursor: 'pointer',
            transition: 'background 120ms ease, border-color 120ms ease, transform 120ms ease',
            border: 'none',
            whiteSpace: 'nowrap'
        };
        const actionPrimary = (busy: boolean): any => ({
            ...actionBtnLabel,
            background: busy ? '#7fb6d8' : tokens.primary,
            color: '#fff',
            opacity: busy ? 0.7 : 1,
            cursor: busy ? 'not-allowed' : 'pointer',
            boxShadow: busy ? 'none' : '0 1px 2px rgba(0, 121, 193, 0.25)'
        });
        const actionSecondary = (disabled: boolean): any => ({
            ...actionBtnLabel,
            background: '#fff',
            color: tokens.text,
            border: `1px solid ${tokens.borderStrong}`,
            opacity: disabled ? 0.45 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer'
        });
        const actionDanger = (disabled: boolean): any => ({
            ...actionBtnLabel,
            background: '#fff',
            color: disabled ? tokens.textFaint : tokens.danger,
            border: `1px solid ${disabled ? tokens.border : tokens.danger}66`,
            opacity: disabled ? 0.45 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer'
        });

        // Inline printer icon (avoids adding a new asset file)
        const printerIcon = jsx('svg', {
            xmlns: 'http://www.w3.org/2000/svg',
            width: 16, height: 16, viewBox: '0 0 24 24',
            fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
            strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true',
            children: [
                jsx('polyline', { key: 'top', points: '6 9 6 2 18 2 18 9' }),
                jsx('path', { key: 'body', d: 'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2' }),
                jsx('rect', { key: 'paper', x: 6, y: 14, width: 12, height: 8 })
            ]
        });
        const downloadIcon = jsx('svg', {
            xmlns: 'http://www.w3.org/2000/svg', width: 16, height: 16, viewBox: '0 0 24 24',
            fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
            strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true',
            children: [
                jsx('path', { key: 'arrow', d: 'M12 4v12m0 0l-4-4m4 4l4-4' }),
                jsx('path', { key: 'tray', d: 'M4 18v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2' })
            ]
        });
        const csvIconSm = jsx('svg', {
            xmlns: 'http://www.w3.org/2000/svg', width: 16, height: 16, viewBox: '0 0 24 24',
            fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
            strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true',
            children: [
                jsx('path', { key: 'doc', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
                jsx('path', { key: 'fold', d: 'M14 2v6h6' })
            ]
        });
        const trashIconSm = jsx('svg', {
            xmlns: 'http://www.w3.org/2000/svg', width: 16, height: 16, viewBox: '0 0 24 24',
            fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
            strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true',
            children: [
                jsx('path', { key: 'lid', d: 'M3 6h18' }),
                jsx('path', { key: 'body', d: 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' }),
                jsx('path', { key: 'handle', d: 'M10 6V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2' })
            ]
        });

        children.push(jsx('div', {
            key: 'action-buttons',
            role: 'toolbar',
            'aria-label': 'Export, print, and clear actions',
            style: {
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginTop: '0'
            },
            children: [
                // Print is the headline action — flex-grows to take remaining width
                jsx('button', {
                    key: 'print-button',
                    type: 'button',
                    onClick: this.executePrintPDFLabels,
                    disabled: isBusy,
                    title: 'Open the PDF and print directly',
                    'aria-label': 'Print labels',
                    'aria-busy': isBusy,
                    style: { ...actionPrimary(isBusy), flex: '1 1 130px' },
                    children: [printerIcon, jsx('span', { key: 'lbl', children: isBusy ? 'Working…' : 'Print labels' })]
                }),
                jsx('button', {
                    key: 'pdf-button',
                    type: 'button',
                    onClick: () => this.executeGeneratePDFLabels('download'),
                    disabled: isBusy,
                    title: 'Download a PDF of the labels',
                    'aria-label': 'Download PDF',
                    'aria-busy': isBusy,
                    style: actionSecondary(isBusy),
                    children: [downloadIcon, jsx('span', { key: 'lbl', children: 'PDF' })]
                }),
                jsx('button', {
                    key: 'csv-button',
                    type: 'button',
                    onClick: this.generateLabels,
                    disabled: isBusy,
                    title: 'Export labels as CSV',
                    'aria-label': 'Export CSV',
                    'aria-busy': isBusy,
                    style: actionSecondary(isBusy),
                    children: [csvIconSm, jsx('span', { key: 'lbl', children: 'CSV' })]
                }),
                jsx('button', {
                    key: 'clear-button',
                    type: 'button',
                    onClick: this.clearSelection,
                    disabled: noSelection,
                    title: 'Clear all selections',
                    'aria-label': 'Clear selection',
                    style: actionDanger(noSelection),
                    children: [trashIconSm, jsx('span', { key: 'lbl', children: 'Clear' })]
                })
            ]
        }));

        // User message - with live region for screen readers (WCAG 4.1.3)
        if (this.state.userMessage.type) {
            const messageRole = this.state.userMessage.type === 'error' ? 'alert' : 'status';
            const ariaLive = this.state.userMessage.type === 'error' ? 'assertive' : 'polite';
            const messageStyles = {
                success: { background: '#d4edda', border: '1px solid #b1dfbb', color: '#155724' },
                error: { background: '#f8d7da', border: '1px solid #f1b0b7', color: '#721c24' },
                warning: { background: '#fff3cd', border: '1px solid #ffda6a', color: '#664d03' },
                info: { background: '#d1ecf1', border: '1px solid #9ed5e2', color: '#0c5460' }
            };
            const currentStyle = messageStyles[this.state.userMessage.type] || messageStyles.info;

            children.push(jsx('div', {
                key: 'user-message',
                role: messageRole,
                'aria-live': ariaLive,
                style: {
                    position: 'fixed',
                    top: '16px',
                    right: '16px',
                    zIndex: 9999,
                    padding: '10px 14px',
                    borderRadius: '5px',
                    maxWidth: '300px',
                    fontSize: '13px',
                    fontWeight: '500',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    ...currentStyle
                },
                children: this.state.userMessage.text
            }));
        }

        // Confirm dialog - with accessibility attributes (WCAG 4.1.2)
        if (this.state.showConfirmDialog.show) {
            children.push(jsx('div', {
                key: 'confirm-dialog',
                role: 'alertdialog',
                'aria-modal': 'true',
                'aria-labelledby': 'confirm-dialog-title',
                'aria-describedby': 'confirm-dialog-message',
                style: { padding: '12px', background: '#f8f9fa', border: '2px solid #0079c1', borderRadius: '5px' },
                children: [
                    jsx('div', {
                        key: 'confirm-title',
                        id: 'confirm-dialog-title',
                        style: { position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 },
                        children: 'Confirmation required'
                    }),
                    jsx('div', {
                        key: 'confirm-message',
                        id: 'confirm-dialog-message',
                        style: { marginBottom: '10px', fontWeight: '600', fontSize: '13px', color: '#1a1a1a', lineHeight: '1.4' },
                        children: this.state.showConfirmDialog.message
                    }),
                    jsx('div', {
                        key: 'confirm-buttons',
                        style: { display: 'flex', gap: '6px' },
                        children: [
                            jsx(Button, {
                                key: 'yes',
                                type: 'primary',
                                size: 'sm',
                                onClick: this.confirmAndExecute,
                                title: 'Confirm and proceed',
                                'aria-label': 'Confirm and proceed',
                                children: 'Yes'
                            }),
                            jsx(Button, {
                                key: 'cancel',
                                type: 'default',
                                size: 'sm',
                                onClick: this.hideConfirmDialog,
                                title: 'Cancel this action',
                                'aria-label': 'Cancel this action',
                                children: 'Cancel'
                            })
                        ]
                    })
                ]
            }));
        }

        // -- Partition + reorder into a sensible flow --------------------------------
        // 1. Header / map / layer status
        // 2. FIND FEATURES — address search, drawing tools
        // 3. CONFIGURE OUTPUT — label type, format & font, partial sheet, options
        // 4. PREVIEW & EXPORT — live preview, action buttons
        // 5. Overlays (toast message, confirm dialog) stay last
        const partitioned: { header: any[]; find: any[]; configure: any[]; exportPart: any[]; overlay: any[] } = {
            header: [], find: [], configure: [], exportPart: [], overlay: []
        };
        const FIND_KEYS = new Set(['address-search-section', 'draw-section']);
        const CONFIGURE_KEYS = new Set(['output-settings', 'start-position']);
        const EXPORT_KEYS = new Set(['preview-panel', 'action-buttons']);
        const OVERLAY_KEYS = new Set(['user-message', 'confirm-dialog']);

        for (const c of children) {
            const k = (c && (c as any).key) || '';
            if (FIND_KEYS.has(k)) partitioned.find.push(c);
            else if (CONFIGURE_KEYS.has(k)) partitioned.configure.push(c);
            else if (EXPORT_KEYS.has(k)) partitioned.exportPart.push(c);
            else if (OVERLAY_KEYS.has(k)) partitioned.overlay.push(c);
            else partitioned.header.push(c);
        }

        const ordered: any[] = [...partitioned.header];
        if (partitioned.find.length) {
            ordered.push(sectionPill('Find features', 'sec-find'));
            ordered.push(...partitioned.find);
        }
        if (partitioned.configure.length) {
            ordered.push(sectionPill('Configure output', 'sec-cfg'));
            ordered.push(...partitioned.configure);
        }
        if (partitioned.exportPart.length) {
            ordered.push(sectionPill('Preview & export', 'sec-exp'));
            ordered.push(...partitioned.exportPart);
        }
        ordered.push(...partitioned.overlay);

        return jsx('div', {
            style: {
                height: '100%',
                padding: '10px',
                background: tokens.bgSubtle,
                overflowY: 'auto',
                fontFamily: tokens.fontStack,
                color: tokens.text
            },
            className: 'jimu-widget widget-mailing-labels',
            role: 'region',
            'aria-label': 'Mailing Labels Widget',
            children: ordered
        });
    }
}