// =============================================================================
// exb-editor-shims.d.ts  (Mode B, self-contained)
// -----------------------------------------------------------------------------
// Type-only shims so Visual Studio type-checks THIS widget on an EB 1.21 (pnpm)
// install without reading client\node_modules. It is inert to the build
// (tsconfig noEmit); webpack ignores it and uses the real installed packages.
//
// Mode B rules (see WIDGETHANDOFF Section 12, item 3):
//   - tsconfig has no baseUrl/paths and "types": [], classic jsx: "react".
//   - Everything the widget imports is declared ambiently here.
//   - This file must stay a SCRIPT: no top-level import/export. The import/export
//     statements below all live INSIDE `declare module` blocks, which is allowed
//     and keeps the file ambient.
//   - __esri.X is not used by this widget, so there is no src/runtime/esri.d.ts.
//   - esri/* runtime modules are imported with `// @ts-ignore` in widget.tsx
//     (JSAPI 5.x declarations that VS misclassifies), so they are intentionally
//     NOT declared here; leaving them unresolved keeps their bindings as `any`
//     in both value and type position.
// =============================================================================

// ---------------------------------------------------------------------------
// react  (Component / PureComponent / events / hooks, typed closely enough)
// ---------------------------------------------------------------------------
declare module 'react' {
  export type ReactNode = any
  export type ReactElement = any
  export type Key = string | number
  export type CSSProperties = { [key: string]: any }
  export type Ref<T> = any
  export interface RefObject<T> { readonly current: T | null }
  export interface MutableRefObject<T> { current: T }

  export interface SyntheticEvent<T = Element> {
    target: EventTarget & T & { value: any, checked?: boolean, name?: string }
    currentTarget: EventTarget & T
    preventDefault(): void
    stopPropagation(): void
    [key: string]: any
  }
  export interface ChangeEvent<T = Element> extends SyntheticEvent<T> {}
  export interface FormEvent<T = Element> extends SyntheticEvent<T> {}
  export interface MouseEvent<T = Element> extends SyntheticEvent<T> {}
  export interface KeyboardEvent<T = Element> extends SyntheticEvent<T> { key: string }
  export interface FocusEvent<T = Element> extends SyntheticEvent<T> {}

  export type FC<P = {}> = (props: P & { children?: ReactNode }) => ReactElement | null
  export type FunctionComponent<P = {}> = FC<P>
  export type ComponentType<P = any> = any
  export type ComponentClass<P = any, S = any> = any
  export const Fragment: any
  export const StrictMode: any

  export class Component<P = {}, S = {}> {
    constructor(props: P, context?: any)
    readonly props: Readonly<P> & { children?: ReactNode }
    state: Readonly<S>
    context: any
    refs: any
    setState (
      state: Partial<S> | ((prev: Readonly<S>, props: Readonly<P>) => Partial<S> | S | null),
      callback?: () => void
    ): void
    forceUpdate (callback?: () => void): void
    render (): ReactNode
  }
  export class PureComponent<P = {}, S = {}> extends Component<P, S> {}

  export function createElement (type: any, props?: any, ...children: any[]): ReactElement
  export function cloneElement (element: any, props?: any, ...children: any[]): ReactElement
  export function createRef<T = any> (): RefObject<T>
  export function createContext (defaultValue?: any): any
  export function forwardRef (render: any): any
  export function memo (component: any, propsAreEqual?: any): any

  export function useState<S = any> (initial: S | (() => S)): [S, (value: S | ((prev: S) => S)) => void]
  export function useEffect (effect: () => (void | (() => void)), deps?: ReadonlyArray<any>): void
  export function useLayoutEffect (effect: () => (void | (() => void)), deps?: ReadonlyArray<any>): void
  export function useRef<T> (initial: T): MutableRefObject<T>
  export function useRef<T = undefined> (): MutableRefObject<T | undefined>
  export function useMemo<T = any> (factory: () => T, deps?: ReadonlyArray<any>): T
  export function useCallback<T = any> (callback: T, deps?: ReadonlyArray<any>): T
  export function useContext (context: any): any
  export function useReducer (...args: any[]): [any, (action: any) => void]

  const React: any
  export default React
}

// react/jsx-runtime and the emotion re-export (present in the import graph even
// though classic JSX never resolves them; declared so nothing dangles).
declare module 'react/jsx-runtime' {
  export const jsx: any
  export const jsxs: any
  export const Fragment: any
}
declare module '@emotion/react/jsx-runtime' {
  export const jsx: any
  export const jsxs: any
  export const Fragment: any
}
declare module 'react-dom' {
  const ReactDOM: any
  export default ReactDOM
  export const render: any
  export const createPortal: any
}

// ---------------------------------------------------------------------------
// jimu-core  (React re-export is the one that must be real; rest are `any`)
// ---------------------------------------------------------------------------
declare module 'jimu-core' {
  import * as React from 'react'
  export { React }

  export type AllWidgetProps<C = any> = {
    id: string
    config: C
    label?: string
    useMapWidgetIds?: string[]
    useDataSources?: any
    dispatch?: any
    stateProps?: any
    intl?: any
    theme?: any
    portalUrl?: string
    locale?: string
    [key: string]: any
  }
  export type IMConfig<C = any> = C
  export type IMState = any
  export type ImmutableObject<T = any> = T & { [key: string]: any }
  export type ImmutableArray<T = any> = T[] & { [key: string]: any }
  export type SerializedStyles = any
  export type UseDataSource = any
  export type DataSource = any
  export type FeatureLayerDataSource = any

  export const css: any
  export const jsx: any
  export const keyframes: any
  export const classNames: any
  export const polished: any
  export const appActions: any
  export const Immutable: any
  export const DataSourceManager: any
  export const DataSourceComponent: any
  export const AllDataSourceTypes: any
  export const dataSourceUtils: any
  export const lodash: any
  export const hooks: any
  export function getAppStore (): any
  export function loadArcGISJSAPIModules (modules: string[], options?: any): Promise<any[]>
  export const ReactRedux: any
  export const MutableStoreManager: any

  const _default: any
  export default _default
}

// ---------------------------------------------------------------------------
// jimu-arcgis
// ---------------------------------------------------------------------------
declare module 'jimu-arcgis' {
  export type JimuMapView = any
  export const JimuMapViewComponent: any
  export const MapViewManager: any
  export const JimuMapViewGroup: any
  export function loadArcGISJSAPIModules (modules: string[], options?: any): Promise<any[]>
  const _default: any
  export default _default
}

// ---------------------------------------------------------------------------
// jimu-ui  (list every named export the widget, setting, and help guide use)
// ---------------------------------------------------------------------------
declare module 'jimu-ui' {
  export const Button: any
  export const Alert: any
  export const TextInput: any
  export const TextArea: any
  export const NumericInput: any
  export const Label: any
  export const Switch: any
  export const Select: any
  export const Option: any
  export const MultiSelect: any
  export const Checkbox: any
  export const Radio: any
  export const Loading: any
  export const Tooltip: any
  export const Icon: any
  export const Modal: any
  export const ModalHeader: any
  export const ModalBody: any
  export const ModalFooter: any
  export const Tabs: any
  export const Tab: any
  export const Dropdown: any
  export const DropdownButton: any
  export const DropdownMenu: any
  export const DropdownItem: any
  export const Card: any
  export const Popper: any
  export const Slider: any
  export const Collapse: any
  export const CollapsablePanel: any
  export const ButtonGroup: any
  export const AdvancedButtonGroup: any
  export const defaultMessages: any
  const _default: any
  export default _default
}

declare module 'jimu-ui/advanced/setting-components' {
  export const MapWidgetSelector: any
  export const SettingSection: any
  export const SettingRow: any
  export const SettingCollapse: any
  const _default: any
  export default _default
}

declare module 'jimu-ui/advanced/style-setting-components' {
  const _default: any
  export default _default
  export const ThemeColorPicker: any
}

// ---------------------------------------------------------------------------
// jimu-for-builder  (AllWidgetSettingProps as a proper generic type, not a
// module-shorthand any, so setting.tsx does not hit TS2709)
// ---------------------------------------------------------------------------
declare module 'jimu-for-builder' {
  export type AllWidgetSettingProps<C = any> = {
    id: string
    config: C
    onSettingChange: (settings: any, ...rest: any[]) => void
    useDataSources?: any
    useMapWidgetIds?: any
    onSettingsChange?: any
    intl?: any
    theme?: any
    portalUrl?: string
    [key: string]: any
  }
  const _default: any
  export default _default
}

// ---------------------------------------------------------------------------
// jimu-theme  (backs useTokens in theme.ts)
// ---------------------------------------------------------------------------
declare module 'jimu-theme' {
  export function useTheme (): any
  export function useTheme2 (): any
  export const ThemeSwitchComponent: any
  const _default: any
  export default _default
}

// ---------------------------------------------------------------------------
// jimu-icons  (the four the widget imports, plus a wildcard for any others)
// ---------------------------------------------------------------------------
declare module 'jimu-icons/outlined/application/setting' {
  export const SettingOutlined: any
}
declare module 'jimu-icons/outlined/gis/map' {
  export const MapOutlined: any
}
declare module 'jimu-icons/outlined/editor/trash' {
  export const TrashOutlined: any
}
declare module 'jimu-icons/outlined/editor/clear' {
  export const ClearOutlined: any
}
declare module 'jimu-icons/*' {
  const icon: any
  export default icon
}

// ---------------------------------------------------------------------------
// calcite-components  (help guide icons; EB provides jimu-ui/calcite-components)
// ---------------------------------------------------------------------------
declare module 'calcite-components' {
  export const CalciteIcon: any
  export const CalciteChip: any
  export const CalciteButton: any
  export const CalciteLoader: any
  const _default: any
  export default _default
}

// ---------------------------------------------------------------------------
// jspdf  (constructable default; the widget does `new jsPDF()`)
// ---------------------------------------------------------------------------
declare module 'jspdf' {
  const jsPDF: any
  export default jsPDF
  export { jsPDF }
}

// seamless-immutable and @esri/arcgis-rest-* are only touched by jimu-core's own
// source, which Mode B no longer pulls into this program; declared any in case a
// stray reference appears.
declare module 'seamless-immutable' {
  const _default: any
  export default _default
}
declare module '@esri/*' {
  const _default: any
  export default _default
}

// ---------------------------------------------------------------------------
// SVG imports resolve to their URL string at build time.
// ---------------------------------------------------------------------------
declare module '*.svg' {
  const url: string
  export default url
}

// ---------------------------------------------------------------------------
// Global JSX namespace so classic `jsx: "react"` type-checks elements as `any`
// without resolving any jsx-runtime module. Plain `declare namespace` with no
// import/export keeps this file a script (see header).
// ---------------------------------------------------------------------------
declare namespace JSX {
  type Element = any
  interface IntrinsicElements { [k: string]: any }
  interface ElementClass { render (): any }
  interface ElementAttributesProperty { props: {} }
  interface ElementChildrenAttribute { children: {} }
  interface IntrinsicAttributes { [k: string]: any }
}
