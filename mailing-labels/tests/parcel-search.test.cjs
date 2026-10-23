// Run with Node 22.18+ from the widget folder. EXB_CLIENT can override the local SDK path.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const client = process.env.EXB_CLIENT || 'C:/arcgis-experience-builder-1.21/client'
const sdkRequire = createRequire(path.join(client, 'package.json'))
const ts = sdkRequire('typescript')
const root = path.resolve(__dirname, '..')
function load(file, imports = {}) {
    const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
    }).outputText
    const exports = {}
    const fallback = new Proxy(function () {}, { get: (_target, key) => key === '__esModule' ? false : fallback })
    vm.runInNewContext(code, { exports, require: name => imports[name] || fallback, console,
        window: {}, document: { addEventListener() {}, removeEventListener() {} }, localStorage: { getItem: () => null },
        CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail } },
        setTimeout: () => 0, clearTimeout() {}, URL, Blob })
    return exports
}
const { parcelWhere } = load('src/runtime/parcel-query.ts')
const parcelSelection = load('src/runtime/parcel-selection.ts')
const layer = { fields: [{ name: 'PARCEL', type: 'string' }, { name: 'ID', type: 'big-integer' }, { name: 'VALUE', type: 'double' }] }
test('exact text query preserves leading zeros, escapes apostrophes and treats wildcards literally', () => {
    assert.equal(parcelWhere(layer, 'PARCEL', ' 00123 '), "PARCEL = '00123'")
    assert.equal(parcelWhere(layer, 'PARCEL', "O'Brien"), "PARCEL = 'O''Brien'")
    assert.equal(parcelWhere(layer, 'PARCEL', '%_'), "PARCEL = '%_'")
})
test('numeric identifiers retain precision and reject SQL, non-finite values, blanks and invalid fields', () => {
    assert.equal(parcelWhere(layer, 'ID', '9223372036854775807'), 'ID = 9223372036854775807')
    assert.equal(parcelWhere(layer, 'VALUE', '12.5'), 'VALUE = 12.5')
    for (const value of ['1 OR 1=1', 'NaN', 'Infinity', '', '1.5']) assert.throws(() => parcelWhere(layer, 'ID', value))
    assert.throws(() => parcelWhere(layer, 'MISSING', '1'))
})
const messages = load('src/runtime/translations/default.ts').default
const help = load('src/runtime/helpSections.ts')
test('parcel help is gated and every message resolves', () => {
    const flags = { mapConnected: true, geometrySelection: false, addressSearch: false, ownerAddresses: false }
    const t = id => { assert.equal(typeof messages[id], 'string', id); return messages[id] }
    assert.ok(!help.buildHelpSections(t, flags).some(s => s.key === 'parcel-search'))
    assert.ok(help.buildHelpSections(t, { ...flags, parcelSearch: true }).some(s => s.key === 'parcel-search'))
})
function fixture(queryFeatures) {
    const buffered = { type: 'polygon', rings: [[[10, 10]]] }
    const buffers = []
    class Component { constructor(props) { this.props = props } }
    class Graphic { constructor(options) { Object.assign(this, options) } }
    const Widget = load('src/runtime/widget.tsx', {
        'jimu-core': { React: { PureComponent: Component }, jsx: (type, props) => ({ type, key: props?.key, props }) },
        'esri/Graphic': Graphic,
        'esri/geometry/geometryEngine': { geodesicBuffer: (g, d, u) => { buffers.push([g, d, u]); return buffered } },
        './translations/default': messages,
        './i18n-t': { __setIntl() {}, __t: id => messages[id] || id, __tc: value => value },
        './parcel-selection': parcelSelection,
        './layout': load('src/runtime/layout.ts'),
        '../config': { LABEL_FORMATS: { avery5160: { width: 189, height: 72, labelsPerRow: 3, rowsPerPage: 10 } } }
    }).default
    const instance = new Widget({ id: 'test', config: {} })
    instance.setState = update => { Object.assign(instance.state, typeof update === 'function' ? update(instance.state) : update) }
    const layer = { objectIdField: 'OID', createQuery: () => ({}), queryFeatures }
    instance.state.mapView = { view: { spatialReference: { isWebMercator: true } } }
    instance.state.bufferDistance = 100
    instance.state.bufferUnit = 'feet'
    instance.state.widgetOpen = true
    instance.getCurrentActiveLayer = () => layer
    instance.clearAllHighlights = () => {}
    instance.highlightSelectedFeatures = async (_features, target) => { assert.equal(target, layer) }
    instance.showMessage = () => {}
    return { instance, buffers, buffered }
}
test('full multipart parcel polygon drives the buffer and selected owner/physical target', async () => {
    let query
    const f = fixture(async q => { query = q; return { features: [{ attributes: { OID: 7 } }] } })
    const polygon = { type: 'polygon', rings: [[[1, 1]], [[3, 3]]] }
    await f.instance.applyParcelGeometry(polygon, () => true)
    assert.equal(f.buffers[0][0], polygon)
    assert.equal(f.buffers[0][1], 100)
    assert.equal(query.geometry, f.buffered)
    assert.equal(query.num, 2000)
    assert.equal(f.instance.state.selections[0].featureObjectIds[0], 7)
})
test('zero buffer uses the parcel polygon directly', async () => {
    let query
    const f = fixture(async q => { query = q; return { features: [] } })
    f.instance.state.bufferDistance = 0
    const polygon = { type: 'polygon', rings: [] }
    await f.instance.applyParcelGeometry(polygon, () => true)
    assert.equal(query.geometry, polygon)
    assert.equal(f.buffers.length, 0)
    assert.equal(f.instance.state.selectedFeatureCount, 0)
})
test('invalidating an in-flight selection prevents it restoring records', async () => {
    let finish
    const f = fixture(() => new Promise(resolve => { finish = resolve }))
    const pending = f.instance.applyParcelGeometry({ type: 'polygon' }, () => true)
    f.instance.parcelSearchRevision++
    finish({ features: [{ attributes: { OID: 9 } }] })
    await pending
    assert.equal(f.instance.state.selectedFeatureCount, 0)
})

test('parcel layer inherits original configuration, including owner-only apps', () => {
    assert.equal(parcelSelection.inheritedParcelLayerId({ selectedLayerId: 'primary', parcelSearchLayerId: 'obsolete' }), 'primary')
    assert.equal(parcelSelection.inheritedParcelLayerId({ ownerLayerId: 'owners' }), 'owners')
    assert.equal(parcelSelection.inheritedParcelLayerId({ selectedLayerId: 'primary', ownerLayerId: 'owners', enabledAddressTypes: { physical: false } }), 'owners')
})

function panelFixture(options = {}) {
    const slots = [], effects = [], overlays = [], zooms = [], queries = [], clicks = new Set()
    let cursor = 0, output, invalidations = 0, applied, picking = false
    const React = {
        useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next }] },
        useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial } },
        useEffect(fn, deps) {
            const i = cursor++, old = slots[i]
            if (!old || deps.some((dep, n) => old.deps[n] !== dep)) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() } })
        }
    }
    const jsx = (type, props) => ({ type, props })
    const geometries = [1, 2, 3].map(id => ({ type: 'polygon', id, extent: { expand: () => ({ extentOf: id }) } }))
    const union = { type: 'polygon', union: true, extent: { expand: () => ({ all: true }) } }
    const Search = load('src/runtime/components/ParcelSearch.tsx', {
        'jimu-core': { React }, 'jimu-ui': { Button: 'button', TextInput: 'input', Select: 'select', Option: 'option' },
        'react/jsx-runtime': { jsx, jsxs: jsx }, '../theme': { useTokens: () => ({ primary: '#123456' }) },
        '../parcel-query': { parcelWhere }, '../parcel-selection': parcelSelection,
        'esri/geometry/geometryEngine': { union: items => { union.parts = items; return union } },
        'esri/Graphic': class { constructor(properties) { Object.assign(this, properties) } },
        'esri/layers/GraphicsLayer': class {
            graphics = []
            add(graphic) { this.graphics.push(graphic) }
            removeAll() { this.graphics = [] }
            destroy() { this.destroyed = true }
        }
    }).default
    const source = {
        type: 'feature', geometryType: 'polygon', fields: layer.fields, objectIdField: 'OID', load: async () => {},
        createQuery: () => ({ where: 'ACTIVE = 1' }),
        queryFeatures: async query => {
            queries.push(query)
            if (options.query) return options.query(query, geometries)
            const ids = query.geometry ? [query.geometry.id] : query.objectIds || (options.single ? [1] : [1, 2])
            return { features: ids.map(id => ({ attributes: { PARCEL: '00' + id, OID: id }, geometry: geometries[id - 1] })) }
        }
    }
    const props = {
        view: { map: { findLayerById: () => source, add: layer => overlays.push(layer), remove: layer => overlays.splice(overlays.indexOf(layer), 1) },
            on: (_event, fn) => { clicks.add(fn); return { remove: () => clicks.delete(fn) } },
            goTo: async target => { zooms.push(target); if (options.interruptedZoom) throw new Error('AbortError') },
            container: { style: { cursor: 'default' } }, popupEnabled: true, spatialReference: { wkid: 3857 } },
        layerId: 'primary', fieldName: options.mapOnly ? '' : 'PARCEL', bufferDistance: 20, bufferUnit: 'feet',
        t: (id, values) => values?.count !== undefined ? `${id}:${values.count}` : id,
        onBufferChange() {}, onPickingChange: active => { picking = active }, onSelectionChange: () => { invalidations++ },
        onApply: async (geometry, valid) => { applied = { geometry, valid } }
    }
    function flatten(node, result = []) {
        if (Array.isArray(node)) node.forEach(child => flatten(child, result))
        else if (node && typeof node === 'object') { result.push(node); flatten(node.props?.children, result) }
        return result
    }
    function render() { cursor = 0; output = Search(props); effects.splice(0).forEach(fn => fn()); return flatten(output) }
    const button = key => render().find(node => node.type === 'button' && node.props.children === key).props
    const nodes = () => render()
    const input = () => render().find(node => node.type === 'input' && node.props.type !== 'number').props
    const choose = id => render().find(node => node.type === 'select' && node.props['aria-label'] === 'parcelSearchMatch').props.onChange({ target: { value: String(id) } })
    const click = id => { [...clicks].forEach(fn => fn({ mapPoint: { id }, stopPropagation() {} })) }
    const flush = async () => { await new Promise(resolve => setImmediate(resolve)); render() }
    const cleanup = () => slots.forEach(slot => slot?.cleanup?.())
    render()
    return { props, nodes, button, input, choose, click, flush, cleanup, overlays, zooms, queries, geometries,
        get invalidations() { return invalidations }, get applied() { return applied }, get picking() { return picking } }
}

for (const single of [false, true]) test(single ? 'single search match highlights and zooms automatically' : 'duplicate choices add full geometry without replacing earlier parcels', async () => {
    const f = panelFixture({ single, interruptedZoom: true })
    f.input().onChange({ target: { value: '001' } })
    await f.button('parcelSearchFind').onClick()
    assert.equal(f.queries[0].where, "(ACTIVE = 1) AND (PARCEL = '001')")
    if (!single) { await f.choose(1); await f.choose(2) }
    assert.equal(f.overlays[0].graphics.length, single ? 1 : 2)
    assert.ok(f.zooms.length > 0)
    await f.button('parcelApplySelected').onClick()
    assert.equal(f.applied.geometry.type, 'polygon')
    if (!single) assert.equal(f.applied.geometry.parts.length, 2)
    f.input().onChange({ target: { value: 'another parcel' } })
    assert.equal(f.overlays[0].graphics.length, single ? 1 : 2)
    f.cleanup(); assert.equal(f.overlays.length, 0)
})

test('rapid map clicks accumulate, deduplicate and buffer all parcels without moving the map', async () => {
    const f = panelFixture({ mapOnly: true })
    assert.ok(!f.nodes().some(n => n.type === 'input' && n.props.type !== 'number'))
    f.button('parcelPickOnMap').onClick(); f.nodes()
    assert.equal(f.picking, true)
    f.click(1); f.click(2); f.click(1)
    await f.flush()
    assert.equal(f.overlays[0].graphics.length, 2)
    assert.equal(f.zooms.length, 0)
    assert.equal(f.queries[0].spatialRelationship, 'intersects')
    assert.equal(f.queries[0].where, 'ACTIVE = 1')
    assert.equal(f.button('parcelApplySelected').disabled, false)
    await f.button('parcelApplySelected').onClick(); f.nodes()
    assert.equal(f.picking, false)
    assert.equal(f.applied.geometry.parts.length, 2)
    assert.equal(f.props.view.container.style.cursor, 'default')
    assert.equal(f.props.view.popupEnabled, true)
    const oldInvalidations = f.invalidations
    f.nodes().find(n => n.type === 'button' && n.props.children === 'parcelRemove').props.onClick()
    assert.equal(f.overlays[0].graphics.length, 1)
    assert.ok(f.invalidations > oldInvalidations)
    assert.equal(f.applied.valid(), false)
    f.button('parcelClearSelected').onClick(); f.nodes()
    assert.equal(f.overlays[0].graphics.length, 0)
    f.cleanup()
})

test('stopping map picks discards late service responses and restores map controls', async () => {
    let finish
    const f = panelFixture({ query: () => new Promise(resolve => { finish = resolve }) })
    f.button('parcelPickOnMap').onClick(); f.nodes(); f.click(1)
    await f.flush()
    f.button('parcelStopPicking').onClick(); f.nodes()
    finish({ features: [{ attributes: { OID: 1, PARCEL: '001' }, geometry: f.geometries[0] }] })
    await f.flush()
    assert.equal(f.overlays[0].graphics.length, 0)
    assert.equal(f.picking, false)
    f.cleanup()
})

test('changing buffer invalidates earlier mailing selection without losing source parcels', async () => {
    const f = panelFixture({ single: true })
    f.input().onChange({ target: { value: '001' } }); await f.button('parcelSearchFind').onClick()
    await f.button('parcelApplySelected').onClick()
    const before = f.invalidations
    f.props.bufferDistance = 200; f.nodes()
    assert.ok(f.invalidations > before)
    assert.equal(f.applied.valid(), false)
    assert.equal(f.overlays[0].graphics.length, 1)
    f.cleanup()
})

test('collapsing the parcel section stops picking but retains its collection and outline', async () => {
    const f = panelFixture()
    f.button('parcelPickOnMap').onClick(); f.nodes(); f.click(1); await f.flush()
    f.props.active = false; f.nodes(); f.nodes()
    assert.equal(f.picking, false)
    assert.equal(f.overlays[0].graphics.length, 1)
    f.props.active = true; f.nodes()
    assert.equal(f.button('parcelApplySelected').disabled, false)
    f.cleanup()
})

test('Escape in parcel picking does not trigger the legacy full reset', () => {
    const f = fixture(async () => ({ features: [] }))
    f.instance.state.isPickingParcels = true
    f.instance.resetWidgetState = () => assert.fail('Escape erased the parcel set')
    f.instance.handleKeyDown({ key: 'Escape' })
})

test('switching mailing address type preserves parcels while invalidating mailing results', async () => {
    const f = panelFixture({ single: true })
    f.input().onChange({ target: { value: '001' } }); await f.button('parcelSearchFind').onClick()
    await f.button('parcelApplySelected').onClick()
    f.props.addressType = 'owner'; f.nodes()
    assert.equal(f.overlays[0].graphics.length, 1)
    assert.equal(f.applied.valid(), false)
    f.cleanup()
})

test('all parcel controls and help strings exist in all shipped locale catalogs', () => {
    const runtimeKeys = [...fs.readFileSync(path.join(root, 'src/runtime/components/ParcelSearch.tsx'), 'utf8').matchAll(/'((?:parcel|helpParcel)\w+)'/g)].map(match => match[1])
    const settings = load('src/setting/translations/default.ts').default
    const settingsKeys = [...fs.readFileSync(path.join(root, 'src/setting/ParcelSearchSettings.tsx'), 'utf8').matchAll(/'((?:parcel)\w+)'/g)].map(match => match[1])
    for (const [part, keys, defaults] of [['runtime', runtimeKeys, messages], ['setting', settingsKeys, settings]]) {
        for (const key of keys) assert.equal(typeof defaults[key], 'string', key)
        for (const name of fs.readdirSync(path.join(root, `src/${part}/translations`)).filter(name => name.endsWith('.js'))) {
            let catalog
            vm.runInNewContext(fs.readFileSync(path.join(root, `src/${part}/translations/${name}`), 'utf8'), {
                System: { register: (_deps, fn) => fn(value => { catalog = value }).execute() }
            })
            for (const key of keys) assert.equal(typeof catalog[key], 'string', `${part}/${name}: ${key}`)
        }
    }
})

test('parcel visibility is owner-only and compact accordion opens one detail panel', () => {
    const layout = load('src/runtime/layout.ts')
    const config = { enableParcelSearch: true }
    assert.equal(layout.showParcelSelection(config, 'owner', 'parcels', true), true)
    assert.equal(layout.showParcelSelection(config, 'physical', 'parcels', true), false)
    assert.equal(layout.showParcelSelection(config, 'owner', 'parcels', false), false)
    assert.equal(layout.SELECTION_ORDER.join(','), 'address-search-section,draw-section,parcel-search-section')
    const collapsed = layout.compactSections('output-settings')
    assert.equal(collapsed['output-settings'], false)
    assert.equal(Object.values(collapsed).filter(value => !value).length, 1)
})

test('render places owner parcels after drawing, before output, with persistent export footer', () => {
    const { instance } = fixture(async () => ({ features: [] }))
    instance.props.config = { enableParcelSearch: true, selectedLayerId: 'parcels', enableGeometrySelection: true,
        enabledAddressTypes: { physical: true, owner: true }, selectedFields: {}, ownerFields: {}, useMapWidgetIds: ['map'] }
    instance.state.selectedLayer = { id: 'parcels' }
    instance.state.labelType = 'owner'
    instance.state.collapsedSections = load('src/runtime/layout.ts').compactSections('parcel-search-section')
    const root = instance.render()
    const workflow = root.props.children[0]
    const keys = workflow.props.children.map(item => item.key)
    assert.ok(keys.indexOf('row-type') < keys.indexOf('draw-section'))
    assert.ok(keys.indexOf('draw-section') < keys.indexOf('parcel-search-section'))
    assert.ok(keys.indexOf('parcel-search-section') < keys.indexOf('output-settings'))
    assert.equal(root.props.children[1].props.children[0].key, 'action-buttons')
    instance.state.labelType = 'physical'
    const physical = instance.render().props.children[0].props.children.map(item => item.key)
    assert.equal(physical.includes('parcel-search-section'), false)
})




