# Changelog

All notable changes to the Mailing Labels widget are recorded here, newest first.

## 1.1.0 - 2026-09-10

### Added
- In-widget Help guide. A Help button in the widget header opens a short, searchable, plain-language guide whose sections adapt to the features the app has turned on (map selection, address search, and physical or owner address).
- First-run hint on the main view that points new users to the guide. It is dismissed per browser and namespaced by widget id.

### Fixed
- Visual Studio Error List flooded with errors from jimu-core files on the Experience Builder 1.21 pnpm layout ("Cannot find namespace '__esri'", "Cannot find module '@esri/...'", "is not a module"). The widget tsconfig used path mappings that pulled Esri's own source into the widget's type check. Converted the widget to the self-contained editor type check (no path mappings, classic JSX, ambient module shims in src/exb-editor-shims.d.ts), so Visual Studio reports zero errors for the widget's files. This is an editor-only change. The webpack build is unaffected.

### Changed
- Consolidated the editor type shims into src/exb-editor-shims.d.ts.

## 1.0.0

### Added
- Initial public release on GitHub and Esri Community. Mailing labels from feature layer data, with address search, drawing and click selection, optional buffer, eight Avery formats, partial-sheet support, sort and filter options, live preview, and PDF, print, and CSV output.
