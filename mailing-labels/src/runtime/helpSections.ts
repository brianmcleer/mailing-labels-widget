import type { HelpSection } from './components/HelpPopup'

/**
 * Flags the widget computes from config and live status. One per optional feature
 * that has help text. Compute these from the SAME checks the UI itself uses (in
 * widget.tsx render), so the guide never describes a control the widget is not
 * currently showing. See WIDGETHANDOFF Section 10.6.
 */
export interface HelpFeatures {
  /** A map widget is wired up (config.useMapWidgetIds[0]). */
  mapConnected: boolean
  /** Selecting records on the map is on (enableGeometrySelection !== false and a map is connected). */
  geometrySelection: boolean
  /** The address search box is shown (config.geocodeUrl is set). */
  addressSearch: boolean
  /** Both Physical and Owner address types are offered (the Owner/Physical switch shows). */
  ownerAddresses: boolean
}

type T = (id: string, values?: Record<string, string>) => string

export function buildHelpSections (t: T, f: HelpFeatures): HelpSection[] {
  const when = (on: boolean, ...ids: string[]): string[] => (on ? ids.map((id: string) => t(id)) : [])

  const sections: HelpSection[] = [
    {
      key: 'start',
      icon: 'play',
      title: t('helpStartTitle'),
      ordered: true,
      body: [t('helpStart1'), t('helpStart2'), t('helpStart3')]
    }
  ]

  if (f.geometrySelection) {
    sections.push({
      key: 'select',
      icon: 'cursor-marquee',
      title: t('helpSelectTitle'),
      intro: t('helpSelectIntro'),
      body: [t('helpSelect1'), t('helpSelect2'), t('helpSelect3')]
    })
  }

  if (f.addressSearch) {
    sections.push({
      key: 'search',
      icon: 'search',
      title: t('helpSearchTitle'),
      body: [t('helpSearch1'), t('helpSearch2')]
    })
  }

  if (f.ownerAddresses) {
    sections.push({
      key: 'addresstype',
      icon: 'user',
      title: t('helpAddressTypeTitle'),
      body: [t('helpAddressType1'), t('helpAddressType2')]
    })
  }

  sections.push({
    key: 'format',
    icon: 'grid-unit',
    title: t('helpFormatTitle'),
    intro: t('helpFormatIntro'),
    body: [t('helpFormat1'), t('helpFormat2'), t('helpFormat3'), t('helpFormat4')]
  })

  sections.push({
    key: 'export',
    icon: 'download',
    title: t('helpExportTitle'),
    body: [t('helpExport1'), t('helpExport2'), t('helpExport3')]
  })

  sections.push({
    key: 'trouble',
    icon: 'exclamation-mark-triangle',
    title: t('helpTroubleTitle'),
    body: [
      ...when(f.mapConnected === false, 'helpTroubleNoMap'),
      t('helpTrouble1'),
      t('helpTrouble2'),
      ...when(f.addressSearch, 'helpTroubleSearch'),
      t('helpTroubleContact')
    ]
  })

  sections.push({
    key: 'tips',
    icon: 'lightbulb',
    title: t('helpTipsTitle'),
    body: [t('helpTips1'), t('helpTips2')]
  })

  return sections
}
