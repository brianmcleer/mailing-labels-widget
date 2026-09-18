# Mailing Labels Widget

An ArcGIS Experience Builder custom widget that generates print-ready mailing labels from web map layer data. Find features by address search, drawing, or click, then export to PDF or CSV in a standard Avery layout.

The widget is published and discussed on Esri Community:
https://community.esri.com/t5/experience-builder-custom-widgets/mailing-labels-custom-widget/ta-p/1618376

## Features

### Find features

- Address search with type-ahead suggestions, map zoom, and a pin marker at the geocoded location
- Drawing tools: point, multipoint, line, polygon, rectangle, and circle
- Click-to-select against individual features
- Optional buffer around drawn or clicked geometry in feet, meters, kilometers, or miles
- Add and delete modes for refining a selection without starting over
- Original drawn graphic and the buffered area are shown in different colors so it is clear what is driving the selection
- Accepts a selection from the Right Click widget via the mailing label action
- Accepts a selection from the Custom Draw widget (can be enabled or disabled in settings)

### Configure output

- Choice of address type when the layer has both an owner mailing address and a physical address
- Optional separate data layer for owner addresses (typical for parcel data with a separate owner table published as a feature layer)
- Eight Avery formats: 5160, 5161, 5162, 5163, 5164, 5165 (full sheet), 5167 (return address, 80 per sheet), and 5168 (shipping, 4 per sheet)
- Font sizes from 5pt to 16pt, with the smaller sizes useful for the tiny 5167 return-address label
- Sort labels by name, city, state, or ZIP. ZIP sort produces the order USPS bulk mail expects
- The default sort is configurable in the widget settings (Output defaults), so an app can open with Name (A to Z) preselected while users can still change it
- Filter out empty records (confidential parcels) and duplicate labels, both on by default

### Partial sheet support

- Pick a starting label slot on the first sheet so you can finish a partly used Avery sheet without waste
- Click-to-pick visual grid that matches the chosen format
- Collapsed by default since most users do not need it

### Preview and export

- Live label preview that shows what one label will look like at the current format, font, and field mappings, using the first real selected feature
- Optional Wrap long lines setting (off by default). When on, lines wider than the label, such as lengthy owner names, continue on the next line, and the font steps down (to a 5pt floor) if needed so no line is dropped. When off, each line stays on one line and is trimmed with an ellipsis at the label edge
- Print labels button that opens the PDF directly in a new tab with the print dialog primed
- PDF download button
- CSV export button for mail merge or downstream processing
- Clear button to drop all selections

### Help

- In-widget Help guide behind a Help button in the header: a short, searchable, plain-language guide that adapts to the features the app has turned on
- First-run hint that points new users to the guide, dismissed per browser

### Polish

- Collapsible sections so the widget fits a normal sidebar without scrolling
- Theme-aware typography and WCAG-compliant labeling
- Selection count badge in the widget header
- Distinguishes empty selection from "selected, but no mailing data" (confidential records)

## Requirements

- ArcGIS Experience Builder Developer Edition 1.20 or 1.21. The included editor configuration is tailored to the 1.21 pnpm layout.
- The data source must be a **Feature Layer**. Map services and related tables are not supported. If your mailing data lives in a related table, publish that table as a feature layer to your Portal as a workaround.
- Selection is capped at 2,000 records to keep export times reasonable.
- jsPDF is declared in the widget's `package.json` and is installed by Experience Builder's client-level `pnpm ci`. Do not run `npm install` inside the widget folder.
- A geocoding service URL is only required if you want to use address search. Any ArcGIS GeocodeServer works, including a portal locator or the Esri World Geocoder.

## Configuration

Open the widget settings in the Builder and configure:

1. **Map widget selection** - choose which map the widget should listen to.
2. **Layer and field mapping** - pick the feature layer that holds the address data and map its fields to Name, Address Line 1, Address Line 2, City, State, ZIP, and Country. Optionally configure a second owner layer if your data has separate property-owner records.
3. **Geometry selection** - enable click selection, draw selection, or both. Optionally allow the widget to accept geometry from the Custom Draw widget.
4. **Label format and font** - defaults for the dropdowns. Users can change these at runtime.
5. **Geocode service URL** - paste your GeocodeServer URL to enable address search. A Test button verifies the service responds before saving.

## Install

1. Download the widget release from the [GitHub releases page](https://github.com/brianmcleer/mailing-labels-widget/releases) or from the [Esri Community attachment](https://community.esri.com/t5/experience-builder-custom-widgets/mailing-labels-custom-widget/ta-p/1618376).
2. Extract the archive and place the `mailing-labels` folder inside your Experience Builder Developer Edition install:
   ```
   <ExB Install>/client/your-extensions/widgets/mailing-labels/
   ```
3. From the `client` folder, run:
   ```
   pnpm ci
   ```
   Experience Builder's bootstrap installs the widget dependency declared in `package.json`; no per-widget install is needed.
4. Restart Experience Builder. If Visual Studio was already open, close it and remove the widget's `.vs` cache before reopening the folder.

### The release zip and the editor shims

The zip is the widget only. The Visual Studio type shims in the repo (`mailing-labels/src/exb-editor-shims.d.ts`) are left out on purpose: their ambient `declare module` blocks are not file-scoped and would rewrite the react, jimu and esri types for every other widget in your `your-extensions` folder.

If you clone the repository instead of using the zip, delete `mailing-labels/src/exb-editor-shims.d.ts` before building; nothing else depends on it.

## Usage telemetry

This widget records anonymous usage counts and errors so the GIS Division can see which widgets and versions are in use and which errors users hit. It records the app id and title, widget name and version, the action name, a truncated error message, the site host name and browser family. It never records usernames, coordinates, addresses, attribute values or URLs with query strings. Where the data goes: on page load the widget asks the app's portal for a public item tagged `exb-beacon-sink` and posts to that table. If your portal has no such item, nothing is sent anywhere. To turn it off for an app, set `"telemetry": false` in the widget's config, or users can enable Do Not Track in their browser. The shared module is `src/shared/beacon.ts`.

## Troubleshooting: `mailing-labels is duplicated`

If `npm start` (or `pnpm start`) stops with `mailing-labels is duplicated`, Experience Builder found two copies of the
widget registered under the same name. A single, correctly placed copy cannot duplicate itself,
so a second copy is present somewhere. Check, in this order:

1. A nested folder: `widgets\mailing-labels\mailing-labels\`. The `manifest.json` must sit directly
   inside `widgets\mailing-labels\`, not a level deeper. This is the usual cause when a zip is
   extracted into a folder that already has the widget's name.
2. A leftover folder from an earlier build or version, including any `-copy` folder or a folder
   under a previous name if the widget was renamed.
3. A stale compiled build in `client\dist\widgets\mailing-labels`. Stop the client server, delete
   that folder (or run a clean build), then start again.

Tell for the nesting case: if removing one copy makes the widget vanish from the build entirely,
the copy that remains is nested too deep. Move it so `manifest.json` is directly inside the
widget folder.

## Feedback

Bug reports and feature requests are welcome on the GitHub repo:
https://github.com/brianmcleer/mailing-labels-widget/issues

For broader discussion and screenshots from other users, see the Esri Community thread:
https://community.esri.com/t5/experience-builder-custom-widgets/mailing-labels-custom-widget/ta-p/1618376

## License

Apache-2.0. Copyright 2026 City of Grand Junction, CO.
