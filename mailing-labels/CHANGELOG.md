# Changelog

All notable changes to the Mailing Labels widget are recorded here, newest first.

## 1.1.1 (2026-09-17)

- Packaging: the Visual Studio editor shims are no longer in the release zip. `publish.ps1` strips them from a staging copy (`$ReleaseOnlyExclude`) and refuses to zip if any ambient `declare module` of react, jimu or esri survives. The shims stay in the GitHub repo; clone users delete them before building.
- Fixed: Maps SDK 5.x (Experience Builder 1.21) compatibility. The selection highlight is now hidden and restored through view.highlights on 5.x (MapView.highlightOptions was removed), the original highlight style is saved and put back rather than reset to cyan, and reopening the widget no longer throws when view.popup is undefined (closePopup() is used when present).

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
