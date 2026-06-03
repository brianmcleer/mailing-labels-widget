# Mailing Labels Widget

An ArcGIS Experience Builder custom widget that generates print-ready mailing labels from web map layer data. Find features by address search, drawing, or click, then export to PDF or CSV in a standard Avery layout.

Built and tested on Experience Builder Developer Edition 1.19 and 1.20 (React 19). The 1.18 line is no longer maintained.

## Where to find this widget

- **Esri Community thread** (overview, screenshots, discussion): https://community.esri.com/t5/experience-builder-custom-widgets/mailing-labels-custom-widget/ta-p/1618376
- **GitHub releases** (download the latest zip): https://github.com/brianmcleer/mailing-labels-widget/releases
- **Issues** (bug reports and feature requests): https://github.com/brianmcleer/mailing-labels-widget/issues

## What's new

Recent additions (May 2026):

- Address search with type-ahead suggestions, map zoom, and a pin at the geocoded address
- Print labels button that opens the PDF and triggers the print dialog directly
- Sort options: name, city, state, or ZIP (ZIP for USPS bulk mail)
- Partial sheet support so you can finish a half-used Avery sheet
- Live label preview that uses the first real selected feature
- Three more Avery formats: 5165 (full sheet), 5167 (return address), 5168 (shipping)
- Font sizes 5pt and 6pt for the tiny 5167 labels
- Geocode service URL setting with a Test button
- Accept selection from the Right Click widget via a mailing label action

See the Esri Community thread for the full changelog going back to the original 1.18 release in May 2025.

## Features at a glance

- Eight Avery formats: 5160, 5161, 5162, 5163, 5164, 5165, 5167, 5168
- Address search, drawing tools (point, multipoint, line, polygon, rectangle, circle), and click-to-select
- Optional buffer in feet, meters, kilometers, or miles
- Add and delete modes for refining a selection
- Owner mailing address and physical address support on the same or separate layers
- CSV export, PDF download, and direct print
- Filter empty records and duplicates
- Sort labels for USPS bulk mail
- Collapsible sections, theme-aware typography, WCAG-compliant labeling

## Requirements

- ArcGIS Experience Builder Developer Edition 1.19 or 1.20.
- A Feature Layer input. Map services and related tables are not supported.
- Selection cap of 2,000 records.
- jsPDF (auto-installed via the widget's `package.json` during `npm install` in the EB `client` folder).
- A geocoding service URL if you want address search.

## Install

1. Go to the [Releases page](https://github.com/brianmcleer/mailing-labels-widget/releases) and download the latest `mailing-labels.zip`.
2. Extract the archive and drop the `mailing-labels` folder into:
   ```
   <ExB Install>/client/your-extensions/widgets/mailing-labels/
   ```
3. From the `client` folder, run `npm install`. Experience Builder picks up the widget's dependencies automatically.
4. Restart Experience Builder.

## Configure

Open the widget settings in the Builder:

- Pick the layer with your address data and map its fields.
- Optionally pick a second layer if your data has separate property-owner records.
- Paste your ArcGIS GeocodeServer URL if you want address search, and click Test to verify.
- Choose which selection methods are enabled.

## Related widgets

- [Right Click Widget](https://community.esri.com/t5/experience-builder-custom-widgets/right-click-widget/ta-p/) - can pass a clicked feature to Mailing Labels as a selection.
- [Custom Draw Widget](https://community.esri.com/t5/experience-builder-custom-widgets/) - can hand its drawn geometry to Mailing Labels (toggle in settings).

## License

Apache-2.0. Copyright 2026 City of Grand Junction, CO. See [LICENSE](./LICENSE).
