/**
 * PDF Viewer Web Component
 * A standalone web component that wraps PDF.js to provide a full-featured PDF viewing experience.
 *
 * @element pdf-viewer
 *
 * @attr {string} src - URL of the PDF document to display
 * @attr {number} page - Current page number (1-based, default 1)
 * @attr {string} zoom - Zoom level: a number (e.g. "1.5") or mode ("fit-width", "fit-page", "auto")
 * @attr {'light'|'dark'} mode - Color scheme. Omit for auto-detection from page/system preference
 * @attr {'single'|'continuous'} view - View mode (default "single")
 * @attr {boolean} show-toolbar - Whether to show the toolbar (default true, present by default)
 * @attr {boolean} show-thumbnails - Show thumbnail sidebar
 * @attr {boolean} show-search - Show search bar
 * @attr {boolean} no-download - Hide download button
 * @attr {boolean} no-print - Hide print button
 * @attr {string} title - Title to display in the toolbar
 * @attr {boolean} lazy - Defer loading until the component scrolls into view
 *
 * @csspart toolbar - The toolbar area
 * @csspart content - The PDF viewport/content area
 * @csspart sidebar - The thumbnail sidebar
 * @csspart search - The search bar
 *
 * @cssprop [--pdf-viewer-bg] - Component background
 * @cssprop [--pdf-viewer-toolbar-bg] - Toolbar background
 * @cssprop [--pdf-viewer-border-color] - Border color
 * @cssprop [--pdf-viewer-text-color] - Primary text color
 * @cssprop [--pdf-viewer-text-muted] - Muted/secondary text color
 * @cssprop [--pdf-viewer-accent-color] - Accent/interactive color
 * @cssprop [--pdf-viewer-hover-bg] - Hover background
 * @cssprop [--pdf-viewer-content-bg] - Viewport background
 * @cssprop [--pdf-viewer-sidebar-bg] - Sidebar background
 * @cssprop [--pdf-viewer-sidebar-width] - Sidebar width
 * @cssprop [--pdf-viewer-toolbar-height] - Toolbar height
 * @cssprop [--pdf-viewer-font-family] - Font family
 * @cssprop [--pdf-viewer-shadow] - Page shadow
 *
 * @fires pdf-loaded - PDF document loaded successfully
 * @fires pdf-load-error - PDF document failed to load
 * @fires page-change - Page navigation occurred
 * @fires zoom-change - Zoom level changed
 * @fires view-change - View mode changed
 * @fires file-opened - File opened via drag-drop or picker
 *
 * @example
 * <pdf-viewer src="document.pdf"></pdf-viewer>
 *
 * @example
 * <pdf-viewer src="report.pdf" page="3" zoom="fit-width" show-thumbnails></pdf-viewer>
 */

import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import { observePageTheme } from './lib/theme-observer.js'

/* ------------------------------------------------------------------ */
/*  PDF.js worker setup                                                */
/* ------------------------------------------------------------------ */

const PDFJS_VERSION = pdfjsLib.version
const WORKER_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`

try {
  const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.href
} catch {
  pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_CDN
}

/* ------------------------------------------------------------------ */
/*  Anti-FOUC                                                          */
/* ------------------------------------------------------------------ */

if (typeof document !== 'undefined') {
  const _antiFlash = document.createElement('style')
  _antiFlash.textContent = 'pdf-viewer:not(:defined){display:block;opacity:0}'
  document.head.appendChild(_antiFlash)
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]
const DEFAULT_ZOOM = 'fit-width'
const THUMBNAIL_WIDTH = 120
const DEVICE_PIXEL_RATIO = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

const ICONS = {
  prevPage:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>',
  nextPage:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>',
  zoomIn:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
  zoomOut:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
  fitWidth:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
  fitPage:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  thumbnails:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  download:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  print:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  fullscreen:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><polyline points="21 15 21 21 15 21"/><polyline points="3 9 3 3 9 3"/></svg>',
  exitFullscreen:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><polyline points="14 20 14 14 20 14"/><polyline points="10 4 10 10 4 10"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  prevMatch:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>',
  nextMatch:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
  file: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export class PdfViewer extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })

    // PDF.js state
    this._pdfDoc = null
    this._pageRendering = false
    this._pageNumPending = null
    this._currentScale = 1
    this._fetchController = null

    // Page cache
    this._pageCanvases = new Map()
    this._pageTextLayers = new Map()
    this._thumbnailCanvases = new Map()

    // Search state
    this._searchQuery = ''
    this._searchMatches = []
    this._currentMatchIndex = -1
    this._searchPageTexts = new Map()

    // Touch state
    this._touchStartDistance = 0
    this._touchStartScale = 1
    this._touchStartX = 0
    this._swipeThreshold = 50

    // UI state
    this._isFullscreen = false
    this._isLoading = false
    this._loadError = null
    this._loadProgress = 0
    this._lazyLoaded = false
    this._shellRendered = false

    // Observers
    this._lazyObserver = null
    this._scrollObserver = null
    this._resizeObserver = null
    this._stopThemeObserver = null

    // Bound handlers
    this._handleKeydown = this._handleKeydown.bind(this)
    this._handleFullscreenChange = this._handleFullscreenChange.bind(this)
    this._handleScroll = this._handleScroll.bind(this)
    this._handleDrop = this._handleDrop.bind(this)
    this._handleDragOver = this._handleDragOver.bind(this)
    this._handleDragLeave = this._handleDragLeave.bind(this)
    this._handleTouchStart = this._handleTouchStart.bind(this)
    this._handleTouchMove = this._handleTouchMove.bind(this)
    this._handleTouchEnd = this._handleTouchEnd.bind(this)
  }

  /* ---- observed attributes ---- */

  static get observedAttributes() {
    return [
      'src',
      'page',
      'zoom',
      'mode',
      'view',
      'show-toolbar',
      'show-thumbnails',
      'show-search',
      'no-download',
      'no-print',
      'title',
      'lazy'
    ]
  }

  /* ---- property accessors ---- */

  get src() {
    return this.getAttribute('src') || ''
  }
  set src(value) {
    if (value) this.setAttribute('src', value)
    else this.removeAttribute('src')
  }

  get page() {
    return parseInt(this.getAttribute('page'), 10) || 1
  }
  set page(value) {
    this.setAttribute('page', String(value))
  }

  get zoom() {
    return this.getAttribute('zoom') || DEFAULT_ZOOM
  }
  set zoom(value) {
    this.setAttribute('zoom', String(value))
  }

  get mode() {
    return this.getAttribute('mode') || ''
  }
  set mode(value) {
    if (value) this.setAttribute('mode', value)
    else this.removeAttribute('mode')
  }

  get view() {
    return this.getAttribute('view') || 'single'
  }
  set view(value) {
    this.setAttribute('view', value)
  }

  get showToolbar() {
    return !this.hasAttribute('show-toolbar') || this.getAttribute('show-toolbar') !== 'false'
  }

  get showThumbnails() {
    return this.hasAttribute('show-thumbnails')
  }

  get showSearch() {
    return this.hasAttribute('show-search')
  }

  get noDownload() {
    return this.hasAttribute('no-download')
  }

  get noPrint() {
    return this.hasAttribute('no-print')
  }

  get viewerTitle() {
    return this.getAttribute('title') || ''
  }

  get lazy() {
    return this.hasAttribute('lazy')
  }

  /* ---- lifecycle ---- */

  connectedCallback() {
    this._renderShell()
    this._bindShellEvents()
    this._updateToolbar()

    if (this.hasAttribute('mode')) {
      this.setAttribute('data-effective-mode', this.getAttribute('mode'))
    }
    this._startThemeObserver()

    if (this.lazy && !this._lazyLoaded) {
      this._setupLazyObserver()
    } else if (this.src) {
      this._loadDocument(this.src)
    }

    this.addEventListener('keydown', this._handleKeydown)
    document.addEventListener('fullscreenchange', this._handleFullscreenChange)

    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0')
    }
  }

  disconnectedCallback() {
    this._fetchController?.abort()
    this._stopThemeObserver?.()
    this._lazyObserver?.disconnect()
    this._scrollObserver?.disconnect()
    this._resizeObserver?.disconnect()
    this.removeEventListener('keydown', this._handleKeydown)
    document.removeEventListener('fullscreenchange', this._handleFullscreenChange)
    this._pdfDoc?.destroy()
    this._pdfDoc = null
    this._pageCanvases.clear()
    this._pageTextLayers.clear()
    this._thumbnailCanvases.clear()
    this._searchPageTexts.clear()
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this._shellRendered || oldValue === newValue) return

    switch (name) {
      case 'src':
        if (newValue) this._loadDocument(newValue)
        break
      case 'page':
        if (!this._suppressPageCallback) {
          this._navigateToPage(parseInt(newValue, 10) || 1, parseInt(oldValue, 10) || 1)
        }
        break
      case 'zoom':
        this._applyZoom(newValue)
        break
      case 'mode':
        this._updateTheme()
        break
      case 'view':
        this._switchView(newValue)
        break
      case 'show-toolbar':
        this._updateToolbarVisibility()
        break
      case 'show-thumbnails':
        this._updateSidebarVisibility()
        break
      case 'show-search':
        this._updateSearchVisibility()
        break
      case 'no-download':
      case 'no-print':
      case 'title':
        this._updateToolbar()
        break
    }
  }

  /* ================================================================ */
  /*  THEME                                                            */
  /* ================================================================ */

  _startThemeObserver() {
    this._stopThemeObserver = observePageTheme((state) => {
      this._onPageThemeChange(state)
    })
  }

  _onPageThemeChange(state) {
    if (!this.hasAttribute('mode')) {
      const effectiveMode =
        state.mode || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      this.setAttribute('data-effective-mode', effectiveMode)
    }
  }

  _updateTheme() {
    const explicit = this.getAttribute('mode')
    if (explicit) {
      this.setAttribute('data-effective-mode', explicit)
    } else {
      this.removeAttribute('data-effective-mode')
      this._stopThemeObserver?.()
      this._startThemeObserver()
    }
  }

  _getEffectiveMode() {
    return (
      this.getAttribute('data-effective-mode') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    )
  }

  /* ================================================================ */
  /*  SHELL RENDERING                                                  */
  /* ================================================================ */

  _renderShell() {
    this.shadowRoot.innerHTML = `
      <style>${this._getStyles()}</style>
      <div class="pdf-container">
        ${this._toolbarHTML()}
        <div class="search-bar" part="search">
          <div class="search-input-wrap">
            ${ICONS.search}
            <input type="text" class="search-input" placeholder="Search in document..." aria-label="Search in document">
          </div>
          <span class="search-count"></span>
          <button class="btn icon-btn search-prev" aria-label="Previous match" title="Previous match">${ICONS.prevMatch}</button>
          <button class="btn icon-btn search-next" aria-label="Next match" title="Next match">${ICONS.nextMatch}</button>
          <button class="btn icon-btn search-close" aria-label="Close search" title="Close search">${ICONS.close}</button>
        </div>
        <div class="main-area">
          <div class="sidebar" part="sidebar">
            <div class="sidebar-content"></div>
          </div>
          <div class="viewport" part="content">
            <div class="page-container"></div>
            <div class="drop-zone">
              <div class="drop-zone-content">
                ${ICONS.file}
                <span>Drop PDF here</span>
              </div>
            </div>
            <div class="loading-overlay">
              <div class="spinner"></div>
              <div class="loading-text">Loading PDF...</div>
              <div class="progress-bar"><div class="progress-fill"></div></div>
            </div>
            <div class="error-overlay">
              <div class="error-message"></div>
              <button class="btn retry-btn">Retry</button>
            </div>
            <div class="empty-state">
              <div class="empty-content">
                ${ICONS.file}
                <p>No PDF loaded</p>
                <p class="empty-hint">Set the <code>src</code> attribute or drag a PDF file here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
    this._shellRendered = true
    this._updateToolbarVisibility()
    this._updateSidebarVisibility()
    this._updateSearchVisibility()
    this._updateEmptyState()
  }

  _toolbarHTML() {
    return `
      <div class="toolbar" part="toolbar">
        <div class="toolbar-group toolbar-nav">
          <button class="btn icon-btn prev-page" aria-label="Previous page" title="Previous page">${ICONS.prevPage}</button>
          <span class="page-info">
            <input type="number" class="page-input" min="1" value="1" aria-label="Page number">
            <span class="page-separator">/</span>
            <span class="page-total">0</span>
          </span>
          <button class="btn icon-btn next-page" aria-label="Next page" title="Next page">${ICONS.nextPage}</button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-group toolbar-zoom">
          <button class="btn icon-btn zoom-out" aria-label="Zoom out" title="Zoom out">${ICONS.zoomOut}</button>
          <span class="zoom-level">100%</span>
          <button class="btn icon-btn zoom-in" aria-label="Zoom in" title="Zoom in">${ICONS.zoomIn}</button>
          <button class="btn icon-btn fit-width" aria-label="Fit width" title="Fit width">${ICONS.fitWidth}</button>
          <button class="btn icon-btn fit-page" aria-label="Fit page" title="Fit page">${ICONS.fitPage}</button>
        </div>

        <div class="toolbar-spacer"></div>

        <span class="toolbar-title"></span>

        <div class="toolbar-group toolbar-actions">
          <button class="btn icon-btn toggle-search" aria-label="Search" title="Search (Ctrl+F)">${ICONS.search}</button>
          <button class="btn icon-btn toggle-thumbnails" aria-label="Thumbnails" title="Toggle thumbnails">${ICONS.thumbnails}</button>
          <button class="btn icon-btn download-btn" aria-label="Download" title="Download">${ICONS.download}</button>
          <button class="btn icon-btn print-btn" aria-label="Print" title="Print">${ICONS.print}</button>
          <button class="btn icon-btn fullscreen-btn" aria-label="Fullscreen" title="Toggle fullscreen">${ICONS.fullscreen}</button>
          <button class="btn icon-btn open-file-btn" aria-label="Open file" title="Open file">${ICONS.file}</button>
        </div>
      </div>
    `
  }

  /* ================================================================ */
  /*  EVENT BINDING                                                    */
  /* ================================================================ */

  _bindShellEvents() {
    const sr = this.shadowRoot

    // Navigation
    sr.querySelector('.prev-page')?.addEventListener('click', () => this.prevPage())
    sr.querySelector('.next-page')?.addEventListener('click', () => this.nextPage())
    sr.querySelector('.page-input')?.addEventListener('change', (e) => {
      this.goToPage(parseInt(e.target.value, 10))
    })
    sr.querySelector('.page-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.target.blur()
        this.goToPage(parseInt(e.target.value, 10))
      }
    })

    // Zoom
    sr.querySelector('.zoom-out')?.addEventListener('click', () => this.zoomOut())
    sr.querySelector('.zoom-in')?.addEventListener('click', () => this.zoomIn())
    sr.querySelector('.fit-width')?.addEventListener('click', () => this.setZoom('fit-width'))
    sr.querySelector('.fit-page')?.addEventListener('click', () => this.setZoom('fit-page'))

    // Actions
    sr.querySelector('.toggle-search')?.addEventListener('click', () => this.toggleSearch())
    sr.querySelector('.toggle-thumbnails')?.addEventListener('click', () => this.toggleThumbnails())
    sr.querySelector('.download-btn')?.addEventListener('click', () => this.download())
    sr.querySelector('.print-btn')?.addEventListener('click', () => this.print())
    sr.querySelector('.fullscreen-btn')?.addEventListener('click', () => this.toggleFullscreen())
    sr.querySelector('.open-file-btn')?.addEventListener('click', () => this.openFile())

    // Search
    sr.querySelector('.search-input')?.addEventListener('input', (e) => {
      this._performSearch(e.target.value)
    })
    sr.querySelector('.search-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (e.shiftKey) this._prevSearchMatch()
        else this._nextSearchMatch()
      }
      if (e.key === 'Escape') this.toggleSearch()
    })
    sr.querySelector('.search-prev')?.addEventListener('click', () => this._prevSearchMatch())
    sr.querySelector('.search-next')?.addEventListener('click', () => this._nextSearchMatch())
    sr.querySelector('.search-close')?.addEventListener('click', () => this.toggleSearch())

    // Retry on error
    sr.querySelector('.retry-btn')?.addEventListener('click', () => {
      if (this.src) this._loadDocument(this.src)
    })

    // Drag and drop
    const viewport = sr.querySelector('.viewport')
    viewport?.addEventListener('drop', this._handleDrop)
    viewport?.addEventListener('dragover', this._handleDragOver)
    viewport?.addEventListener('dragleave', this._handleDragLeave)

    // Touch
    viewport?.addEventListener('touchstart', this._handleTouchStart, { passive: true })
    viewport?.addEventListener('touchmove', this._handleTouchMove, { passive: false })
    viewport?.addEventListener('touchend', this._handleTouchEnd, { passive: true })

    // Viewport scroll (for continuous mode page tracking)
    viewport?.addEventListener('scroll', this._handleScroll, { passive: true })

    // Resize observer for responsive zoom
    this._resizeObserver = new ResizeObserver(() => {
      if (
        this._pdfDoc &&
        (this.zoom === 'fit-width' || this.zoom === 'fit-page' || this.zoom === 'auto')
      ) {
        this._applyZoom(this.zoom)
      }
    })
    this._resizeObserver.observe(viewport)
  }

  /* ================================================================ */
  /*  PDF LOADING                                                      */
  /* ================================================================ */

  async _loadDocument(source) {
    this._fetchController?.abort()
    this._fetchController = new AbortController()
    this._pdfDoc?.destroy()
    this._pdfDoc = null
    this._pageCanvases.clear()
    this._pageTextLayers.clear()
    this._thumbnailCanvases.clear()
    this._searchPageTexts.clear()
    this._searchMatches = []
    this._currentMatchIndex = -1

    this._isLoading = true
    this._loadError = null
    this._loadProgress = 0
    this._updateLoadingState()

    try {
      const loadingParams = {}

      if (typeof source === 'string') {
        loadingParams.url = source
      } else if (source instanceof ArrayBuffer || source instanceof Uint8Array) {
        loadingParams.data = source
      } else if (typeof File !== 'undefined' && source instanceof File) {
        const buffer = await source.arrayBuffer()
        loadingParams.data = new Uint8Array(buffer)
      } else {
        throw new Error('Invalid PDF source')
      }

      loadingParams.cMapUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/cmaps/`
      loadingParams.cMapPacked = true

      const loadingTask = pdfjsLib.getDocument(loadingParams)

      loadingTask.onProgress = (progress) => {
        if (progress.total > 0) {
          this._loadProgress = (progress.loaded / progress.total) * 100
          this._updateProgress()
        }
      }

      this._pdfDoc = await loadingTask.promise

      this._isLoading = false
      this._updateLoadingState()
      this._updateEmptyState()

      const totalPages = this._pdfDoc.numPages
      this._updatePageInfo(this.page, totalPages)

      if (this.showThumbnails) {
        this._renderThumbnails()
      }

      await this._applyZoom(this.zoom)

      this.dispatchEvent(
        new CustomEvent('pdf-loaded', {
          detail: {
            url: typeof source === 'string' ? source : null,
            pageCount: totalPages,
            title: this.viewerTitle
          },
          bubbles: true,
          composed: true
        })
      )
    } catch (error) {
      if (error.name === 'AbortException') return
      this._isLoading = false
      this._loadError = error.message || 'Failed to load PDF'
      this._updateLoadingState()

      this.dispatchEvent(
        new CustomEvent('pdf-load-error', {
          detail: {
            url: typeof source === 'string' ? source : null,
            error: this._loadError
          },
          bubbles: true,
          composed: true
        })
      )
    }
  }

  _setupLazyObserver() {
    this._lazyObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !this._lazyLoaded) {
          this._lazyLoaded = true
          if (this.src) this._loadDocument(this.src)
          this._lazyObserver.disconnect()
        }
      },
      { rootMargin: '100px' }
    )
    this._lazyObserver.observe(this)
  }

  /* ================================================================ */
  /*  PAGE RENDERING                                                   */
  /* ================================================================ */

  async _renderPage(pageNum) {
    if (!this._pdfDoc || pageNum < 1 || pageNum > this._pdfDoc.numPages) return

    const container = this.shadowRoot.querySelector('.page-container')
    if (!container) return

    // Check cache — skip re-render if already rendered at this scale
    const cached = this._pageCanvases.get(pageNum)
    if (cached && cached.scale === this._currentScale) {
      if (this.view === 'single') {
        container.innerHTML = ''
        container.appendChild(cached.wrapper)
      }
      return
    }

    const page = await this._pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale: this._currentScale })

    if (this.view === 'single') {
      container.innerHTML = ''
    }

    let pageWrapper = container.querySelector(`[data-page="${pageNum}"]`)
    if (!pageWrapper) {
      pageWrapper = document.createElement('div')
      pageWrapper.className = 'page-wrapper'
      pageWrapper.setAttribute('data-page', pageNum)

      if (this.view === 'continuous') {
        const existingPages = container.querySelectorAll('.page-wrapper')
        let inserted = false
        for (const existing of existingPages) {
          if (parseInt(existing.getAttribute('data-page'), 10) > pageNum) {
            container.insertBefore(pageWrapper, existing)
            inserted = true
            break
          }
        }
        if (!inserted) container.appendChild(pageWrapper)
      } else {
        container.appendChild(pageWrapper)
      }
    } else {
      pageWrapper.innerHTML = ''
    }

    // Canvas
    const canvas = document.createElement('canvas')
    canvas.className = 'pdf-page-canvas'
    canvas.width = Math.floor(viewport.width * DEVICE_PIXEL_RATIO)
    canvas.height = Math.floor(viewport.height * DEVICE_PIXEL_RATIO)
    canvas.style.width = `${Math.floor(viewport.width)}px`
    canvas.style.height = `${Math.floor(viewport.height)}px`
    pageWrapper.appendChild(canvas)

    const ctx = canvas.getContext('2d')
    ctx.scale(DEVICE_PIXEL_RATIO, DEVICE_PIXEL_RATIO)

    await page.render({ canvasContext: ctx, viewport }).promise
    this._pageCanvases.set(pageNum, { canvas, scale: this._currentScale, wrapper: pageWrapper })

    // Text layer
    const textLayerDiv = document.createElement('div')
    textLayerDiv.className = 'text-layer'
    textLayerDiv.style.width = `${Math.floor(viewport.width)}px`
    textLayerDiv.style.height = `${Math.floor(viewport.height)}px`
    pageWrapper.appendChild(textLayerDiv)

    const textContent = await page.getTextContent()
    this._searchPageTexts.set(pageNum, textContent)

    const textLayer = new pdfjsLib.TextLayer({
      textContentSource: textContent,
      container: textLayerDiv,
      viewport
    })
    await textLayer.render()
    this._pageTextLayers.set(pageNum, textLayerDiv)

    // Annotation layer
    const annotationData = await page.getAnnotations()
    if (annotationData.length > 0) {
      const annotationLayerDiv = document.createElement('div')
      annotationLayerDiv.className = 'annotation-layer'
      annotationLayerDiv.style.width = `${Math.floor(viewport.width)}px`
      annotationLayerDiv.style.height = `${Math.floor(viewport.height)}px`
      pageWrapper.appendChild(annotationLayerDiv)

      const annotationLayer = new pdfjsLib.AnnotationLayer({
        div: annotationLayerDiv,
        viewport: viewport.clone({ dontFlip: true }),
        annotations: annotationData,
        page,
        linkService: { getDestinationHash: () => '#', navigateTo: () => {} },
        renderForms: false
      })
      await annotationLayer.render({ viewport: viewport.clone({ dontFlip: true }) })
    }
  }

  async _renderAllVisiblePages() {
    if (!this._pdfDoc) return

    if (this.view === 'single') {
      await this._renderPage(this.page)
    } else {
      await this._renderContinuousView()
    }
  }

  async _renderContinuousView() {
    if (!this._pdfDoc) return
    const container = this.shadowRoot.querySelector('.page-container')
    if (!container) return

    container.innerHTML = ''

    const totalPages = this._pdfDoc.numPages
    const firstPage = await this._pdfDoc.getPage(1)
    const baseViewport = firstPage.getViewport({ scale: this._currentScale })

    // Create placeholder divs for all pages
    for (let i = 1; i <= totalPages; i++) {
      const pageWrapper = document.createElement('div')
      pageWrapper.className = 'page-wrapper page-placeholder'
      pageWrapper.setAttribute('data-page', String(i))
      pageWrapper.style.width = `${Math.floor(baseViewport.width)}px`
      pageWrapper.style.height = `${Math.floor(baseViewport.height)}px`
      container.appendChild(pageWrapper)
    }

    // Observe visibility of each placeholder
    this._scrollObserver?.disconnect()
    this._scrollObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page'), 10)
            if (entry.target.classList.contains('page-placeholder')) {
              entry.target.classList.remove('page-placeholder')
              this._renderPage(pageNum)
            }
          }
        }
      },
      {
        root: this.shadowRoot.querySelector('.viewport'),
        rootMargin: '200px 0px'
      }
    )

    container.querySelectorAll('.page-wrapper').forEach((el) => {
      this._scrollObserver.observe(el)
    })
  }

  /* ================================================================ */
  /*  THUMBNAILS                                                       */
  /* ================================================================ */

  async _renderThumbnails() {
    if (!this._pdfDoc) return
    const sidebarContent = this.shadowRoot.querySelector('.sidebar-content')
    if (!sidebarContent) return

    sidebarContent.innerHTML = ''
    const totalPages = this._pdfDoc.numPages

    for (let i = 1; i <= totalPages; i++) {
      const thumbWrapper = document.createElement('div')
      thumbWrapper.className = 'thumb-wrapper'
      if (i === this.page) thumbWrapper.classList.add('active')
      thumbWrapper.setAttribute('data-page', String(i))

      const canvas = document.createElement('canvas')
      canvas.className = 'thumb-canvas'
      thumbWrapper.appendChild(canvas)

      const label = document.createElement('span')
      label.className = 'thumb-label'
      label.textContent = String(i)
      thumbWrapper.appendChild(label)

      thumbWrapper.addEventListener('click', () => this.goToPage(i))
      sidebarContent.appendChild(thumbWrapper)
    }

    // Lazy-render thumbnails
    const thumbObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page'), 10)
            this._renderThumbnailPage(pageNum, entry.target.querySelector('canvas'))
            thumbObserver.unobserve(entry.target)
          }
        }
      },
      {
        root: this.shadowRoot.querySelector('.sidebar'),
        rootMargin: '100px 0px'
      }
    )

    sidebarContent.querySelectorAll('.thumb-wrapper').forEach((el) => {
      thumbObserver.observe(el)
    })
  }

  async _renderThumbnailPage(pageNum, canvas) {
    if (!this._pdfDoc) return
    const page = await this._pdfDoc.getPage(pageNum)
    const unscaledViewport = page.getViewport({ scale: 1 })
    const thumbScale = THUMBNAIL_WIDTH / unscaledViewport.width
    const viewport = page.getViewport({ scale: thumbScale })

    canvas.width = Math.floor(viewport.width * DEVICE_PIXEL_RATIO)
    canvas.height = Math.floor(viewport.height * DEVICE_PIXEL_RATIO)
    canvas.style.width = `${Math.floor(viewport.width)}px`
    canvas.style.height = `${Math.floor(viewport.height)}px`

    const ctx = canvas.getContext('2d')
    ctx.scale(DEVICE_PIXEL_RATIO, DEVICE_PIXEL_RATIO)
    await page.render({ canvasContext: ctx, viewport }).promise
    this._thumbnailCanvases.set(pageNum, canvas)
  }

  _updateActiveThumbnail(pageNum) {
    const sidebar = this.shadowRoot.querySelector('.sidebar-content')
    if (!sidebar) return
    sidebar.querySelectorAll('.thumb-wrapper').forEach((el) => {
      el.classList.toggle('active', parseInt(el.getAttribute('data-page'), 10) === pageNum)
    })
    const active = sidebar.querySelector('.thumb-wrapper.active')
    active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  /* ================================================================ */
  /*  NAVIGATION                                                       */
  /* ================================================================ */

  nextPage() {
    if (!this._pdfDoc) return
    const next = Math.min(this.page + 1, this._pdfDoc.numPages)
    if (next !== this.page) this.goToPage(next)
  }

  prevPage() {
    if (!this._pdfDoc) return
    const prev = Math.max(this.page - 1, 1)
    if (prev !== this.page) this.goToPage(prev)
  }

  goToPage(pageNumber) {
    if (!this._pdfDoc) return
    const clamped = Math.max(1, Math.min(pageNumber, this._pdfDoc.numPages))
    if (isNaN(clamped)) return

    const previousPage = this.page
    this._suppressPageCallback = true
    this.setAttribute('page', String(clamped))
    this._suppressPageCallback = false

    if (clamped !== previousPage) {
      this._navigateToPage(clamped, previousPage)
    }
  }

  async _navigateToPage(pageNum, prevPage) {
    if (!this._pdfDoc) return
    const clamped = Math.max(1, Math.min(pageNum, this._pdfDoc.numPages))
    const previousPage = prevPage != null ? prevPage : parseInt(this.getAttribute('page'), 10) || 1

    this._updatePageInfo(clamped, this._pdfDoc.numPages)
    this._updateActiveThumbnail(clamped)

    if (this.view === 'continuous') {
      const pageEl = this.shadowRoot.querySelector(`.page-wrapper[data-page="${clamped}"]`)
      pageEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      await this._renderPage(clamped)
    }

    if (parseInt(this.getAttribute('page'), 10) !== clamped) {
      this.setAttribute('page', String(clamped))
    }

    this.dispatchEvent(
      new CustomEvent('page-change', {
        detail: { page: clamped, previousPage, pageCount: this._pdfDoc.numPages },
        bubbles: true,
        composed: true
      })
    )
  }

  getPageCount() {
    return this._pdfDoc?.numPages || 0
  }

  getCurrentPage() {
    return this.page
  }

  /* ================================================================ */
  /*  ZOOM                                                             */
  /* ================================================================ */

  zoomIn() {
    const currentIdx = this._findClosestZoomIndex(this._currentScale)
    const nextIdx = Math.min(currentIdx + 1, ZOOM_STEPS.length - 1)
    this.setZoom(ZOOM_STEPS[nextIdx])
  }

  zoomOut() {
    const currentIdx = this._findClosestZoomIndex(this._currentScale)
    const prevIdx = Math.max(currentIdx - 1, 0)
    this.setZoom(ZOOM_STEPS[prevIdx])
  }

  setZoom(level) {
    if (typeof level === 'number') {
      this.setAttribute('zoom', String(level))
    } else {
      this.setAttribute('zoom', level)
    }
  }

  async _applyZoom(zoomValue) {
    if (!this._pdfDoc) return

    const previousZoom = String(this._currentScale)

    const page = await this._pdfDoc.getPage(this.page)
    const unscaledViewport = page.getViewport({ scale: 1 })
    const viewportEl = this.shadowRoot.querySelector('.viewport')
    if (!viewportEl) return

    const containerWidth = viewportEl.clientWidth - 40
    const containerHeight = viewportEl.clientHeight - 40

    let scale
    if (zoomValue === 'fit-width') {
      scale = containerWidth / unscaledViewport.width
    } else if (zoomValue === 'fit-page') {
      const scaleW = containerWidth / unscaledViewport.width
      const scaleH = containerHeight / unscaledViewport.height
      scale = Math.min(scaleW, scaleH)
    } else if (zoomValue === 'auto') {
      const scaleW = containerWidth / unscaledViewport.width
      scale = Math.min(scaleW, 1.5)
    } else {
      scale = parseFloat(zoomValue)
      if (isNaN(scale) || scale <= 0) scale = 1
    }

    this._currentScale = scale
    this._updateZoomDisplay()
    await this._renderAllVisiblePages()

    this.dispatchEvent(
      new CustomEvent('zoom-change', {
        detail: { zoom: String(scale), previousZoom },
        bubbles: true,
        composed: true
      })
    )
  }

  _findClosestZoomIndex(scale) {
    let closest = 0
    let minDiff = Math.abs(ZOOM_STEPS[0] - scale)
    for (let i = 1; i < ZOOM_STEPS.length; i++) {
      const diff = Math.abs(ZOOM_STEPS[i] - scale)
      if (diff < minDiff) {
        minDiff = diff
        closest = i
      }
    }
    return closest
  }

  /* ================================================================ */
  /*  SEARCH                                                           */
  /* ================================================================ */

  async search(query) {
    if (!query || !this._pdfDoc) return
    const searchInput = this.shadowRoot.querySelector('.search-input')
    if (searchInput) searchInput.value = query
    if (!this.showSearch) this.toggleSearch()
    await this._performSearch(query)
  }

  clearSearch() {
    this._searchQuery = ''
    this._searchMatches = []
    this._currentMatchIndex = -1
    this._updateSearchCount()
    this._clearSearchHighlights()
    const searchInput = this.shadowRoot.querySelector('.search-input')
    if (searchInput) searchInput.value = ''
  }

  async _performSearch(query) {
    this._searchQuery = query.toLowerCase().trim()
    this._searchMatches = []
    this._currentMatchIndex = -1
    this._clearSearchHighlights()

    if (!this._searchQuery || !this._pdfDoc) {
      this._updateSearchCount()
      return
    }

    for (let i = 1; i <= this._pdfDoc.numPages; i++) {
      let textContent = this._searchPageTexts.get(i)
      if (!textContent) {
        const page = await this._pdfDoc.getPage(i)
        textContent = await page.getTextContent()
        this._searchPageTexts.set(i, textContent)
      }

      const pageText = textContent.items
        .map((item) => item.str)
        .join(' ')
        .toLowerCase()
      let startIndex = 0
      let idx
      while ((idx = pageText.indexOf(this._searchQuery, startIndex)) !== -1) {
        this._searchMatches.push({ page: i, index: idx })
        startIndex = idx + 1
      }
    }

    this._updateSearchCount()

    if (this._searchMatches.length > 0) {
      this._currentMatchIndex = 0
      this._highlightCurrentMatch()
    }
  }

  _nextSearchMatch() {
    if (this._searchMatches.length === 0) return
    this._currentMatchIndex = (this._currentMatchIndex + 1) % this._searchMatches.length
    this._highlightCurrentMatch()
  }

  _prevSearchMatch() {
    if (this._searchMatches.length === 0) return
    this._currentMatchIndex =
      (this._currentMatchIndex - 1 + this._searchMatches.length) % this._searchMatches.length
    this._highlightCurrentMatch()
  }

  _highlightCurrentMatch() {
    if (this._currentMatchIndex < 0 || this._currentMatchIndex >= this._searchMatches.length) return
    const match = this._searchMatches[this._currentMatchIndex]
    this._updateSearchCount()

    if (match.page !== this.page) {
      this.goToPage(match.page)
    }
  }

  _clearSearchHighlights() {
    this.shadowRoot.querySelectorAll('.search-highlight').forEach((el) => el.remove())
  }

  _updateSearchCount() {
    const countEl = this.shadowRoot.querySelector('.search-count')
    if (!countEl) return
    if (this._searchMatches.length === 0) {
      countEl.textContent = this._searchQuery ? 'No matches' : ''
    } else {
      countEl.textContent = `${this._currentMatchIndex + 1} of ${this._searchMatches.length}`
    }
  }

  /* ================================================================ */
  /*  VIEW MODES                                                       */
  /* ================================================================ */

  async _switchView(viewMode) {
    this._pageCanvases.clear()
    this._pageTextLayers.clear()
    await this._renderAllVisiblePages()

    this.dispatchEvent(
      new CustomEvent('view-change', {
        detail: { view: viewMode },
        bubbles: true,
        composed: true
      })
    )
  }

  /* ================================================================ */
  /*  FILE INPUT                                                       */
  /* ================================================================ */

  async setData(source) {
    await this._loadDocument(source)
  }

  openFile() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,application/pdf'
    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      if (!file) return
      this.dispatchEvent(
        new CustomEvent('file-opened', {
          detail: { name: file.name, size: file.size },
          bubbles: true,
          composed: true
        })
      )
      await this._loadDocument(file)
    })
    input.click()
  }

  _handleDrop(e) {
    e.preventDefault()
    this.shadowRoot.querySelector('.drop-zone')?.classList.remove('active')

    const file = e.dataTransfer?.files?.[0]
    if (file && file.type === 'application/pdf') {
      this.dispatchEvent(
        new CustomEvent('file-opened', {
          detail: { name: file.name, size: file.size },
          bubbles: true,
          composed: true
        })
      )
      this._loadDocument(file)
    }
  }

  _handleDragOver(e) {
    e.preventDefault()
    const hasFiles = e.dataTransfer?.types?.includes('Files')
    if (hasFiles) {
      this.shadowRoot.querySelector('.drop-zone')?.classList.add('active')
    }
  }

  _handleDragLeave() {
    this.shadowRoot.querySelector('.drop-zone')?.classList.remove('active')
  }

  /* ================================================================ */
  /*  DOWNLOAD / PRINT / FULLSCREEN                                    */
  /* ================================================================ */

  async download() {
    if (!this.src && !this._pdfDoc) return
    try {
      let blob
      if (this.src) {
        const resp = await fetch(this.src)
        blob = await resp.blob()
      } else if (this._pdfDoc) {
        const data = await this._pdfDoc.getData()
        blob = new Blob([data], { type: 'application/pdf' })
      }
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = this.viewerTitle || 'document.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  async print() {
    if (!this._pdfDoc) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write('<html><head><title>Print PDF</title><style>')
    printWindow.document.write(
      'body{margin:0}canvas{display:block;page-break-after:always;margin:0 auto}'
    )
    printWindow.document.write('@media print{canvas{page-break-after:always}}</style></head><body>')

    for (let i = 1; i <= this._pdfDoc.numPages; i++) {
      const page = await this._pdfDoc.getPage(i)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = printWindow.document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      printWindow.document.body.appendChild(canvas)

      const ctx = canvas.getContext('2d')
      await page.render({ canvasContext: ctx, viewport }).promise
    }

    printWindow.document.write('</body></html>')
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  toggleFullscreen() {
    if (this._isFullscreen) {
      document.exitFullscreen?.()
    } else {
      this.requestFullscreen?.()
    }
  }

  _handleFullscreenChange() {
    this._isFullscreen = document.fullscreenElement === this
    const btn = this.shadowRoot.querySelector('.fullscreen-btn')
    if (btn) {
      btn.innerHTML = this._isFullscreen ? ICONS.exitFullscreen : ICONS.fullscreen
      btn.setAttribute('title', this._isFullscreen ? 'Exit fullscreen' : 'Toggle fullscreen')
    }
    if (this._pdfDoc) {
      this._applyZoom(this.zoom)
    }
  }

  /* ================================================================ */
  /*  KEYBOARD                                                         */
  /* ================================================================ */

  _handleKeydown(e) {
    if (e.target.tagName === 'INPUT') return

    const isMod = e.ctrlKey || e.metaKey

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault()
        this.prevPage()
        break
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
        e.preventDefault()
        this.nextPage()
        break
      case 'Home':
        e.preventDefault()
        this.goToPage(1)
        break
      case 'End':
        e.preventDefault()
        if (this._pdfDoc) this.goToPage(this._pdfDoc.numPages)
        break
      case '+':
      case '=':
        if (!isMod) {
          e.preventDefault()
          this.zoomIn()
        }
        break
      case '-':
        if (!isMod) {
          e.preventDefault()
          this.zoomOut()
        }
        break
      case '0':
        if (!isMod) {
          e.preventDefault()
          this.setZoom('fit-width')
        }
        break
      case 'f':
        if (isMod) {
          e.preventDefault()
          this.toggleSearch()
        }
        break
      case 'Escape':
        if (this.showSearch) this.toggleSearch()
        else if (this._isFullscreen) this.toggleFullscreen()
        break
    }
  }

  /* ================================================================ */
  /*  TOUCH                                                            */
  /* ================================================================ */

  _handleTouchStart(e) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      this._touchStartDistance = Math.sqrt(dx * dx + dy * dy)
      this._touchStartScale = this._currentScale
    } else if (e.touches.length === 1) {
      this._touchStartX = e.touches[0].clientX
    }
  }

  _handleTouchMove(e) {
    if (e.touches.length === 2) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const distance = Math.sqrt(dx * dx + dy * dy)
      const scaleFactor = distance / this._touchStartDistance
      const newScale = Math.max(0.25, Math.min(4, this._touchStartScale * scaleFactor))
      this._currentScale = newScale
      this._updateZoomDisplay()
    }
  }

  async _handleTouchEnd(e) {
    if (this._touchStartDistance > 0 && e.touches.length === 0) {
      this._touchStartDistance = 0
      await this._renderAllVisiblePages()
      this.setZoom(this._currentScale)
    } else if (e.changedTouches.length === 1 && this.view === 'single') {
      const dx = e.changedTouches[0].clientX - this._touchStartX
      if (Math.abs(dx) > this._swipeThreshold) {
        if (dx > 0) this.prevPage()
        else this.nextPage()
      }
    }
  }

  /* ================================================================ */
  /*  SCROLL TRACKING (continuous mode)                                */
  /* ================================================================ */

  _handleScroll() {
    if (this.view !== 'continuous' || !this._pdfDoc) return

    const viewport = this.shadowRoot.querySelector('.viewport')
    if (!viewport) return

    const pages = viewport.querySelectorAll('.page-wrapper')
    let closestPage = 1
    let closestDistance = Infinity

    for (const pageEl of pages) {
      const rect = pageEl.getBoundingClientRect()
      const viewportRect = viewport.getBoundingClientRect()
      const distance = Math.abs(rect.top - viewportRect.top)
      if (distance < closestDistance) {
        closestDistance = distance
        closestPage = parseInt(pageEl.getAttribute('data-page'), 10)
      }
    }

    if (closestPage !== this.page) {
      const previousPage = this.page
      this._suppressPageCallback = true
      this.setAttribute('page', String(closestPage))
      this._suppressPageCallback = false
      this._updatePageInfo(closestPage, this._pdfDoc.numPages)
      this._updateActiveThumbnail(closestPage)

      this.dispatchEvent(
        new CustomEvent('page-change', {
          detail: { page: closestPage, previousPage, pageCount: this._pdfDoc.numPages },
          bubbles: true,
          composed: true
        })
      )
    }
  }

  /* ================================================================ */
  /*  UI UPDATES                                                       */
  /* ================================================================ */

  _updatePageInfo(current, total) {
    const pageInput = this.shadowRoot.querySelector('.page-input')
    const pageTotal = this.shadowRoot.querySelector('.page-total')
    if (pageInput) {
      pageInput.value = current
      pageInput.max = total
    }
    if (pageTotal) pageTotal.textContent = total
  }

  _updateZoomDisplay() {
    const zoomEl = this.shadowRoot.querySelector('.zoom-level')
    if (zoomEl) zoomEl.textContent = `${Math.round(this._currentScale * 100)}%`
  }

  _updateToolbarVisibility() {
    const toolbar = this.shadowRoot.querySelector('.toolbar')
    if (toolbar) toolbar.style.display = this.showToolbar ? '' : 'none'
  }

  _updateSidebarVisibility() {
    const sidebar = this.shadowRoot.querySelector('.sidebar')
    if (sidebar) sidebar.classList.toggle('open', this.showThumbnails)
    if (this.showThumbnails && this._pdfDoc && !this._thumbnailCanvases.size) {
      this._renderThumbnails()
    }
  }

  _updateSearchVisibility() {
    const searchBar = this.shadowRoot.querySelector('.search-bar')
    if (searchBar) searchBar.classList.toggle('open', this.showSearch)
    if (this.showSearch) {
      const input = this.shadowRoot.querySelector('.search-input')
      setTimeout(() => input?.focus(), 50)
    }
  }

  _updateToolbar() {
    const downloadBtn = this.shadowRoot.querySelector('.download-btn')
    const printBtn = this.shadowRoot.querySelector('.print-btn')
    const titleEl = this.shadowRoot.querySelector('.toolbar-title')
    if (downloadBtn) downloadBtn.style.display = this.noDownload ? 'none' : ''
    if (printBtn) printBtn.style.display = this.noPrint ? 'none' : ''
    if (titleEl) titleEl.textContent = this.viewerTitle
  }

  _updateLoadingState() {
    const loadingOverlay = this.shadowRoot.querySelector('.loading-overlay')
    const errorOverlay = this.shadowRoot.querySelector('.error-overlay')

    if (loadingOverlay) loadingOverlay.classList.toggle('active', this._isLoading)
    if (errorOverlay) {
      errorOverlay.classList.toggle('active', !!this._loadError)
      const msgEl = errorOverlay.querySelector('.error-message')
      if (msgEl) msgEl.textContent = this._loadError || ''
    }
  }

  _updateProgress() {
    const fill = this.shadowRoot.querySelector('.progress-fill')
    if (fill) fill.style.width = `${this._loadProgress}%`
  }

  _updateEmptyState() {
    const emptyState = this.shadowRoot.querySelector('.empty-state')
    if (emptyState) {
      emptyState.classList.toggle('active', !this._pdfDoc && !this._isLoading && !this._loadError)
    }
  }

  /* ================================================================ */
  /*  TOGGLE HELPERS                                                   */
  /* ================================================================ */

  toggleThumbnails() {
    if (this.showThumbnails) this.removeAttribute('show-thumbnails')
    else this.setAttribute('show-thumbnails', '')
    this._updateSidebarVisibility()
  }

  toggleSearch() {
    if (this.showSearch) {
      this.removeAttribute('show-search')
      this.clearSearch()
    } else {
      this.setAttribute('show-search', '')
    }
    this._updateSearchVisibility()
  }

  /* ================================================================ */
  /*  CSS                                                              */
  /* ================================================================ */

  _getStyles() {
    return `
      :host {
        display: block;
        position: relative;
        width: 100%;
        height: 600px;
        font-family: var(--pdf-viewer-font-family, var(--font-sans, system-ui, -apple-system, sans-serif));
        font-size: 14px;
        line-height: 1.4;
        contain: layout;

        /* Light mode defaults */
        --_pv-bg: var(--color-surface, #ffffff);
        --_pv-toolbar-bg: var(--color-surface-raised, #f6f8fa);
        --_pv-border: var(--color-border, #d1d5da);
        --_pv-text: var(--color-text, #24292e);
        --_pv-text-muted: var(--color-text-muted, #586069);
        --_pv-accent: var(--color-interactive, #2563eb);
        --_pv-hover-bg: var(--color-surface-hover, #f3f4f6);
        --_pv-content-bg: #e8e8e8;
        --_pv-sidebar-bg: var(--color-surface-sunken, #f0f0f0);
        --_pv-sidebar-width: 200px;
        --_pv-toolbar-height: 40px;
        --_pv-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        --_pv-page-bg: #ffffff;
      }

      :host([data-effective-mode="dark"]) {
        --_pv-bg: var(--color-surface, #1c1c1e);
        --_pv-toolbar-bg: var(--color-surface-raised, #2c2c2e);
        --_pv-border: var(--color-border, #3a3a3c);
        --_pv-text: var(--color-text, #e5e5e7);
        --_pv-text-muted: var(--color-text-muted, #98989d);
        --_pv-accent: var(--color-interactive, #5b9bf5);
        --_pv-hover-bg: var(--color-surface-hover, #3a3a3c);
        --_pv-content-bg: #3a3a3c;
        --_pv-sidebar-bg: var(--color-surface-sunken, #1c1c1e);
        --_pv-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        --_pv-page-bg: #ffffff;
        color-scheme: dark;
      }

      @media (prefers-color-scheme: dark) {
        :host(:not([data-effective-mode="light"])) {
          --_pv-bg: var(--color-surface, #1c1c1e);
          --_pv-toolbar-bg: var(--color-surface-raised, #2c2c2e);
          --_pv-border: var(--color-border, #3a3a3c);
          --_pv-text: var(--color-text, #e5e5e7);
          --_pv-text-muted: var(--color-text-muted, #98989d);
          --_pv-accent: var(--color-interactive, #5b9bf5);
          --_pv-hover-bg: var(--color-surface-hover, #3a3a3c);
          --_pv-content-bg: #3a3a3c;
          --_pv-sidebar-bg: var(--color-surface-sunken, #1c1c1e);
          --_pv-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          --_pv-page-bg: #ffffff;
          color-scheme: dark;
        }
      }

      .pdf-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        background: var(--pdf-viewer-bg, var(--_pv-bg));
        border: 1px solid var(--pdf-viewer-border-color, var(--_pv-border));
        border-radius: 8px;
        overflow: hidden;
        color: var(--pdf-viewer-text-color, var(--_pv-text));
      }

      /* ---- Toolbar ---- */
      .toolbar {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        height: var(--pdf-viewer-toolbar-height, var(--_pv-toolbar-height));
        min-height: var(--pdf-viewer-toolbar-height, var(--_pv-toolbar-height));
        background: var(--pdf-viewer-toolbar-bg, var(--_pv-toolbar-bg));
        border-bottom: 1px solid var(--pdf-viewer-border-color, var(--_pv-border));
        user-select: none;
        flex-shrink: 0;
      }

      .toolbar-group {
        display: flex;
        align-items: center;
        gap: 2px;
      }

      .toolbar-divider {
        width: 1px;
        height: 20px;
        background: var(--pdf-viewer-border-color, var(--_pv-border));
        margin: 0 4px;
      }

      .toolbar-spacer {
        flex: 1;
      }

      .toolbar-title {
        font-size: 13px;
        color: var(--pdf-viewer-text-muted, var(--_pv-text-muted));
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 200px;
        margin-right: 8px;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: transparent;
        color: var(--pdf-viewer-text-color, var(--_pv-text));
        cursor: pointer;
        border-radius: 4px;
        padding: 4px;
        transition: background-color 0.15s;
      }

      .btn:hover {
        background: var(--pdf-viewer-hover-bg, var(--_pv-hover-bg));
      }

      .btn:focus-visible {
        outline: 2px solid var(--pdf-viewer-accent-color, var(--_pv-accent));
        outline-offset: -2px;
      }

      .btn:disabled {
        opacity: 0.4;
        cursor: default;
      }

      .icon-btn {
        width: 28px;
        height: 28px;
      }

      .icon-btn svg {
        flex-shrink: 0;
      }

      .page-info {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
      }

      .page-input {
        width: 40px;
        text-align: center;
        border: 1px solid var(--pdf-viewer-border-color, var(--_pv-border));
        border-radius: 4px;
        background: var(--pdf-viewer-bg, var(--_pv-bg));
        color: var(--pdf-viewer-text-color, var(--_pv-text));
        font-size: 13px;
        padding: 2px 4px;
        -moz-appearance: textfield;
      }

      .page-input::-webkit-inner-spin-button,
      .page-input::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      .page-separator {
        color: var(--pdf-viewer-text-muted, var(--_pv-text-muted));
      }

      .zoom-level {
        font-size: 13px;
        min-width: 42px;
        text-align: center;
        color: var(--pdf-viewer-text-muted, var(--_pv-text-muted));
      }

      /* ---- Search bar ---- */
      .search-bar {
        display: none;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        background: var(--pdf-viewer-toolbar-bg, var(--_pv-toolbar-bg));
        border-bottom: 1px solid var(--pdf-viewer-border-color, var(--_pv-border));
        flex-shrink: 0;
      }

      .search-bar.open {
        display: flex;
      }

      .search-input-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        max-width: 300px;
        border: 1px solid var(--pdf-viewer-border-color, var(--_pv-border));
        border-radius: 4px;
        padding: 4px 8px;
        background: var(--pdf-viewer-bg, var(--_pv-bg));
      }

      .search-input-wrap svg {
        flex-shrink: 0;
        color: var(--pdf-viewer-text-muted, var(--_pv-text-muted));
      }

      .search-input {
        flex: 1;
        border: none;
        background: transparent;
        color: var(--pdf-viewer-text-color, var(--_pv-text));
        font-size: 13px;
        outline: none;
      }

      .search-count {
        font-size: 12px;
        color: var(--pdf-viewer-text-muted, var(--_pv-text-muted));
        white-space: nowrap;
      }

      /* ---- Main area ---- */
      .main-area {
        display: flex;
        flex: 1;
        overflow: hidden;
        min-height: 0;
      }

      /* ---- Sidebar ---- */
      .sidebar {
        display: none;
        width: var(--pdf-viewer-sidebar-width, var(--_pv-sidebar-width));
        min-width: var(--pdf-viewer-sidebar-width, var(--_pv-sidebar-width));
        background: var(--pdf-viewer-sidebar-bg, var(--_pv-sidebar-bg));
        border-right: 1px solid var(--pdf-viewer-border-color, var(--_pv-border));
        overflow-y: auto;
        flex-shrink: 0;
      }

      .sidebar.open {
        display: block;
      }

      .sidebar-content {
        padding: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .thumb-wrapper {
        cursor: pointer;
        border: 2px solid transparent;
        border-radius: 4px;
        padding: 4px;
        transition: border-color 0.15s;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .thumb-wrapper:hover {
        border-color: var(--pdf-viewer-border-color, var(--_pv-border));
      }

      .thumb-wrapper.active {
        border-color: var(--pdf-viewer-accent-color, var(--_pv-accent));
      }

      .thumb-canvas {
        display: block;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        background: var(--_pv-page-bg);
      }

      .thumb-label {
        font-size: 11px;
        color: var(--pdf-viewer-text-muted, var(--_pv-text-muted));
      }

      /* ---- Viewport ---- */
      .viewport {
        flex: 1;
        overflow: auto;
        background: var(--pdf-viewer-content-bg, var(--_pv-content-bg));
        display: flex;
        justify-content: center;
        position: relative;
      }

      .page-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        padding: 20px;
      }

      .page-wrapper {
        position: relative;
        box-shadow: var(--pdf-viewer-shadow, var(--_pv-shadow));
        background: var(--_pv-page-bg);
        line-height: 0;
      }

      .page-placeholder {
        background: var(--_pv-page-bg);
      }

      .pdf-page-canvas {
        display: block;
      }

      /* ---- Text layer ---- */
      .text-layer {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        overflow: hidden;
        opacity: 0.25;
        line-height: 1;
      }

      .text-layer span {
        position: absolute;
        white-space: pre;
        color: transparent;
        pointer-events: all;
      }

      .text-layer ::selection {
        background: var(--pdf-viewer-accent-color, var(--_pv-accent));
        opacity: 0.3;
      }

      /* ---- Annotation layer ---- */
      .annotation-layer {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
      }

      .annotation-layer a {
        pointer-events: all;
      }

      .annotation-layer section {
        position: absolute;
      }

      /* ---- Loading overlay ---- */
      .loading-overlay {
        display: none;
        position: absolute;
        inset: 0;
        background: var(--pdf-viewer-bg, var(--_pv-bg));
        justify-content: center;
        align-items: center;
        flex-direction: column;
        gap: 12px;
        z-index: 10;
      }

      .loading-overlay.active {
        display: flex;
      }

      .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid var(--pdf-viewer-border-color, var(--_pv-border));
        border-top-color: var(--pdf-viewer-accent-color, var(--_pv-accent));
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .loading-text {
        font-size: 13px;
        color: var(--pdf-viewer-text-muted, var(--_pv-text-muted));
      }

      .progress-bar {
        width: 200px;
        height: 4px;
        background: var(--pdf-viewer-border-color, var(--_pv-border));
        border-radius: 2px;
        overflow: hidden;
      }

      .progress-fill {
        width: 0;
        height: 100%;
        background: var(--pdf-viewer-accent-color, var(--_pv-accent));
        transition: width 0.3s;
      }

      /* ---- Error overlay ---- */
      .error-overlay {
        display: none;
        position: absolute;
        inset: 0;
        background: var(--pdf-viewer-bg, var(--_pv-bg));
        justify-content: center;
        align-items: center;
        flex-direction: column;
        gap: 12px;
        z-index: 10;
      }

      .error-overlay.active {
        display: flex;
      }

      .error-message {
        font-size: 14px;
        color: #e53e3e;
        text-align: center;
        max-width: 300px;
      }

      .retry-btn {
        padding: 6px 16px;
        background: var(--pdf-viewer-accent-color, var(--_pv-accent));
        color: #ffffff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
      }

      .retry-btn:hover {
        opacity: 0.9;
      }

      /* ---- Empty state ---- */
      .empty-state {
        display: none;
        position: absolute;
        inset: 0;
        justify-content: center;
        align-items: center;
        z-index: 5;
      }

      .empty-state.active {
        display: flex;
      }

      .empty-content {
        text-align: center;
        color: var(--pdf-viewer-text-muted, var(--_pv-text-muted));
      }

      .empty-content svg {
        width: 48px;
        height: 48px;
        margin-bottom: 12px;
        opacity: 0.4;
      }

      .empty-content p {
        margin: 4px 0;
      }

      .empty-hint {
        font-size: 12px;
      }

      .empty-hint code {
        background: var(--pdf-viewer-hover-bg, var(--_pv-hover-bg));
        padding: 1px 4px;
        border-radius: 3px;
        font-size: 12px;
      }

      /* ---- Drop zone ---- */
      .drop-zone {
        display: none;
        position: absolute;
        inset: 0;
        background: color-mix(in srgb, var(--pdf-viewer-accent-color, var(--_pv-accent)) 10%, transparent);
        border: 2px dashed var(--pdf-viewer-accent-color, var(--_pv-accent));
        border-radius: 8px;
        justify-content: center;
        align-items: center;
        z-index: 20;
      }

      .drop-zone.active {
        display: flex;
      }

      .drop-zone-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        color: var(--pdf-viewer-accent-color, var(--_pv-accent));
        font-size: 16px;
        font-weight: 500;
      }

      .drop-zone-content svg {
        width: 32px;
        height: 32px;
      }

      /* ---- Search highlight ---- */
      .search-highlight {
        background: rgba(255, 213, 0, 0.4);
        position: absolute;
        pointer-events: none;
      }

      .search-highlight.current {
        background: rgba(255, 150, 0, 0.6);
      }
    `
  }
}

/* ------------------------------------------------------------------ */
/*  Registration                                                       */
/* ------------------------------------------------------------------ */

if (!customElements.get('pdf-viewer')) {
  customElements.define('pdf-viewer', PdfViewer)
}
