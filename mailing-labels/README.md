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
- Filter out empty records (confidential parcels) and duplicate labels, both on by default

### Partial sheet support

- Pick a starting label slot on the first sheet so you can finish a partly used Avery sheet without waste
- Click-to-pick visual grid that matches the chosen format
- Collapsed by default since most users do not need it

### Preview and export

- Live label preview that shows what one label will look like at the current format, font, and field mappings, using the first real selected feature
- Print labels button that opens the PDF directly in a new tab with the print dialog primed
- PDF download button
- CSV export button for mail merge or downstream processing
- Clear button to drop all selections

### Polish

- Collapsible sections so the widget fits a normal sidebar without scrolling
- Theme-aware typography and WCAG-compliant labeling
- Selection count badge in the widget header
- Distinguishes empty selection from "selected, but no mailing data" (confidential records)

## Requirements

- ArcGIS Experience Builder Developer Edition 1.19 or 1.20 (React 19). The 1.18 line is no longer maintained.
- The data source must be a **Feature Layer**. Map services and related tables are not supported. If your mailing data lives in a related table, publish that table as a feature layer to your Portal as a workaround.
- Selection is capped at 2,000 records to keep export times reasonable.
- jsPDF is required and installs automatically as part of the widget's `package.json` when you run `npm install` in the EB `client` folder. No separate install step.
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
   npm install
   ```
   This installs the widget's dependencies (jsPDF) automatically because they are declared in the widget's `package.json`.
4. Restart Experience Builder.

## Feedback

Bug reports and feature requests are welcome on the GitHub repo:
https://github.com/brianmcleer/mailing-labels-widget/issues

For broader discussion and screenshots from other users, see the Esri Community thread:
https://community.esri.com/t5/experience-builder-custom-widgets/mailing-labels-custom-widget/ta-p/1618376

## License

Apache-2.0. Copyright 2026 City of Grand Junction, CO.
