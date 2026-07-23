// Editor-only module declarations for Visual Studio with EB 1.21 pnpm layouts.
// Webpack uses the real SVG loader and installed jsPDF package at runtime.
declare module '*.svg' {
  const url: string
  export default url
}

declare module 'jspdf' {
  const jsPDF: any
  export default jsPDF
}
