export interface PdfLoadedDetail {
  url: string | null
  pageCount: number
  title: string
}

export interface PdfLoadErrorDetail {
  url: string | null
  error: string
}

export interface PageChangeDetail {
  page: number
  previousPage: number
  pageCount: number
}

export interface ZoomChangeDetail {
  zoom: string
  previousZoom: string
}

export interface ViewChangeDetail {
  view: 'single' | 'continuous'
}

export interface FileOpenedDetail {
  name: string
  size: number
}

export class PdfViewer extends HTMLElement {
  /** URL of the PDF document to display */
  src: string

  /** Current page number (1-based) */
  page: number

  /** Zoom level: a number or mode string ("fit-width", "fit-page", "auto") */
  zoom: string

  /** Color scheme. Omit for auto-detection from page/system preference */
  mode: 'light' | 'dark' | ''

  /** View mode */
  view: 'single' | 'continuous'

  /** Whether the toolbar is shown */
  readonly showToolbar: boolean

  /** Whether the thumbnail sidebar is shown */
  readonly showThumbnails: boolean

  /** Whether the search bar is shown */
  readonly showSearch: boolean

  /** Whether the download button is hidden */
  readonly noDownload: boolean

  /** Whether the print button is hidden */
  readonly noPrint: boolean

  /** Title displayed in the toolbar */
  readonly viewerTitle: string

  /** Whether lazy loading is enabled */
  readonly lazy: boolean

  /** Navigate to the next page */
  nextPage(): void

  /** Navigate to the previous page */
  prevPage(): void

  /** Navigate to a specific page number */
  goToPage(pageNumber: number): void

  /** Get the total number of pages */
  getPageCount(): number

  /** Get the current page number */
  getCurrentPage(): number

  /** Zoom in one step */
  zoomIn(): void

  /** Zoom out one step */
  zoomOut(): void

  /** Set zoom to a specific level or mode */
  setZoom(level: number | 'fit-width' | 'fit-page' | 'auto'): void

  /** Load a PDF from an ArrayBuffer, Uint8Array, or File */
  setData(source: ArrayBuffer | Uint8Array | File): Promise<void>

  /** Open a file picker dialog to select a PDF */
  openFile(): void

  /** Download the current PDF */
  download(): Promise<void>

  /** Print the current PDF */
  print(): Promise<void>

  /** Search for text in the document */
  search(query: string): Promise<void>

  /** Clear the current search */
  clearSearch(): void

  /** Toggle fullscreen mode */
  toggleFullscreen(): void

  /** Toggle the thumbnail sidebar */
  toggleThumbnails(): void

  /** Toggle the search bar */
  toggleSearch(): void
}

declare global {
  interface HTMLElementTagNameMap {
    'pdf-viewer': PdfViewer
  }

  namespace JSX {
    interface IntrinsicElements {
      'pdf-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<PdfViewer> & {
          src?: string
          page?: number | string
          zoom?: string
          mode?: 'light' | 'dark'
          view?: 'single' | 'continuous'
          'show-toolbar'?: boolean | string
          'show-thumbnails'?: boolean | string
          'show-search'?: boolean | string
          'no-download'?: boolean | string
          'no-print'?: boolean | string
          title?: string
          lazy?: boolean | string
        },
        PdfViewer
      >
    }
  }
}
