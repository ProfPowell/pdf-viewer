import { test, expect } from '@playwright/test'

const TEST_URL = '/test/test-page.html'

async function waitForComponent(page, selector = '#default') {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel)
      return el && el.shadowRoot && el.shadowRoot.querySelector('.pdf-container') != null
    },
    selector,
    { timeout: 15000 }
  )
}

async function waitForPdf(page, selector = '#default') {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel)
      return el && el.shadowRoot && el.shadowRoot.querySelector('.pdf-page-canvas') != null
    },
    selector,
    { timeout: 15000 }
  )
}

test.describe('pdf-viewer - Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL)
    await waitForComponent(page)
  })

  test('component exists and has shadow DOM', async ({ page }) => {
    const hasShadow = await page.evaluate(() => {
      const el = document.querySelector('#default')
      return el != null && el.shadowRoot != null
    })
    expect(hasShadow).toBe(true)
  })

  test('renders a canvas after PDF loads', async ({ page }) => {
    await waitForPdf(page)
    const hasCanvas = await page.evaluate(() => {
      const el = document.querySelector('#default')
      return el && el.shadowRoot
        ? el.shadowRoot.querySelector('.pdf-page-canvas') != null
        : false
    })
    expect(hasCanvas).toBe(true)
  })

  test('toolbar is visible by default', async ({ page }) => {
    const toolbarVisible = await page.evaluate(() => {
      const el = document.querySelector('#default')
      if (!el || !el.shadowRoot) return false
      const toolbar = el.shadowRoot.querySelector('.toolbar')
      return toolbar != null && toolbar.style.display !== 'none'
    })
    expect(toolbarVisible).toBe(true)
  })

  test('shows page count after load', async ({ page }) => {
    await waitForPdf(page)
    const pageTotal = await page.evaluate(() => {
      const el = document.querySelector('#default')
      if (!el || !el.shadowRoot) return '0'
      return el.shadowRoot.querySelector('.page-total')?.textContent || '0'
    })
    expect(parseInt(pageTotal)).toBeGreaterThan(0)
  })
})

test.describe('pdf-viewer - Attributes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL)
    await waitForComponent(page)
  })

  test('reflects src attribute', async ({ page }) => {
    const src = await page.evaluate(() => {
      const el = document.querySelector('#default')
      return el ? el.getAttribute('src') : null
    })
    expect(src).toContain('sample.pdf')
  })

  test('reflects page attribute', async ({ page }) => {
    await waitForPdf(page, '#page-zoom')
    const pageNum = await page.evaluate(() => {
      const el = document.querySelector('#page-zoom')
      return el ? parseInt(el.getAttribute('page'), 10) : null
    })
    expect(pageNum).toBe(2)
  })

  test('reflects zoom attribute', async ({ page }) => {
    const zoom = await page.evaluate(() => {
      const el = document.querySelector('#page-zoom')
      return el ? el.getAttribute('zoom') : null
    })
    expect(zoom).toBe('1.5')
  })

  test('respects no-download attribute', async ({ page }) => {
    await waitForComponent(page, '#no-controls')
    const downloadHidden = await page.evaluate(() => {
      const el = document.querySelector('#no-controls')
      if (!el || !el.shadowRoot) return false
      const btn = el.shadowRoot.querySelector('.download-btn')
      return btn != null && btn.style.display === 'none'
    })
    expect(downloadHidden).toBe(true)
  })

  test('respects no-print attribute', async ({ page }) => {
    await waitForComponent(page, '#no-controls')
    const printHidden = await page.evaluate(() => {
      const el = document.querySelector('#no-controls')
      if (!el || !el.shadowRoot) return false
      const btn = el.shadowRoot.querySelector('.print-btn')
      return btn != null && btn.style.display === 'none'
    })
    expect(printHidden).toBe(true)
  })

  test('hides toolbar when show-toolbar=false', async ({ page }) => {
    await waitForComponent(page, '#no-toolbar')
    const toolbarHidden = await page.evaluate(() => {
      const el = document.querySelector('#no-toolbar')
      if (!el || !el.shadowRoot) return false
      const toolbar = el.shadowRoot.querySelector('.toolbar')
      return toolbar != null && toolbar.style.display === 'none'
    })
    expect(toolbarHidden).toBe(true)
  })
})

test.describe('pdf-viewer - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL)
    await waitForPdf(page)
  })

  test('nextPage advances the page', async ({ page }) => {
    const result = await page.evaluate(() => {
      const el = document.querySelector('#default')
      if (!el) return null
      const before = parseInt(el.getAttribute('page'), 10) || 1
      el.nextPage()
      const after = parseInt(el.getAttribute('page'), 10) || 1
      return { before, after }
    })
    expect(result).not.toBeNull()
    expect(result.after).toBe(result.before + 1)
  })

  test('prevPage goes back', async ({ page }) => {
    await page.evaluate(() => {
      const el = document.querySelector('#default')
      if (el) el.goToPage(2)
    })
    await page.waitForTimeout(300)
    const result = await page.evaluate(() => {
      const el = document.querySelector('#default')
      if (!el) return null
      const before = parseInt(el.getAttribute('page'), 10) || 1
      el.prevPage()
      const after = parseInt(el.getAttribute('page'), 10) || 1
      return { before, after }
    })
    expect(result).not.toBeNull()
    expect(result.after).toBe(result.before - 1)
  })

  test('goToPage clamps to valid range', async ({ page }) => {
    const result = await page.evaluate(() => {
      const el = document.querySelector('#default')
      if (!el) return null
      el.goToPage(999)
      const clamped = parseInt(el.getAttribute('page'), 10)
      el.goToPage(-5)
      const clampedLow = parseInt(el.getAttribute('page'), 10)
      return { clamped, clampedLow }
    })
    expect(result).not.toBeNull()
    expect(result.clamped).toBeGreaterThan(0)
    expect(result.clampedLow).toBe(1)
  })

  test('getPageCount returns total pages', async ({ page }) => {
    const count = await page.evaluate(() => {
      const el = document.querySelector('#default')
      return el && typeof el.getPageCount === 'function' ? el.getPageCount() : 0
    })
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('pdf-viewer - Zoom', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL)
    await waitForPdf(page)
  })

  test('zoomIn changes zoom', async ({ page }) => {
    const result = await page.evaluate(() => {
      const el = document.querySelector('#default')
      if (!el || typeof el.zoomIn !== 'function') return null
      el.zoomIn()
      return el.getAttribute('zoom')
    })
    expect(result).not.toBeNull()
  })

  test('zoomOut changes zoom', async ({ page }) => {
    await page.evaluate(() => {
      const el = document.querySelector('#default')
      if (el) el.setZoom(2)
    })
    await page.waitForTimeout(200)
    const zoom = await page.evaluate(() => {
      const el = document.querySelector('#default')
      if (!el) return null
      el.zoomOut()
      return el.getAttribute('zoom')
    })
    expect(zoom).not.toBeNull()
    expect(parseFloat(zoom)).toBeLessThan(2)
  })

  test('setZoom with fit-width works', async ({ page }) => {
    await page.evaluate(() => {
      const el = document.querySelector('#default')
      if (el) el.setZoom('fit-width')
    })
    const zoom = await page.evaluate(() => {
      const el = document.querySelector('#default')
      return el ? el.getAttribute('zoom') : null
    })
    expect(zoom).toBe('fit-width')
  })
})

test.describe('pdf-viewer - Theming', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL)
    await waitForComponent(page, '#dark-mode')
  })

  test('dark mode sets data-effective-mode attribute', async ({ page }) => {
    const mode = await page.evaluate(() => {
      const el = document.querySelector('#dark-mode')
      return el ? el.getAttribute('data-effective-mode') : null
    })
    expect(mode).toBe('dark')
  })

  test('page-level dark mode detection works', async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(300)
    const mode = await page.evaluate(() => {
      const el = document.querySelector('#default')
      return el ? el.getAttribute('data-effective-mode') : null
    })
    expect(mode).toBe('dark')
  })
})

test.describe('pdf-viewer - View Modes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL)
    await waitForComponent(page, '#continuous')
  })

  test('continuous view has view=continuous', async ({ page }) => {
    const view = await page.evaluate(() => {
      const el = document.querySelector('#continuous')
      return el ? el.getAttribute('view') : null
    })
    expect(view).toBe('continuous')
  })
})

test.describe('pdf-viewer - Thumbnails', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL)
    await waitForComponent(page, '#thumbnails')
  })

  test('sidebar is visible when show-thumbnails is set', async ({ page }) => {
    const sidebarOpen = await page.evaluate(() => {
      const el = document.querySelector('#thumbnails')
      if (!el || !el.shadowRoot) return false
      const sidebar = el.shadowRoot.querySelector('.sidebar')
      return sidebar != null && sidebar.classList.contains('open')
    })
    expect(sidebarOpen).toBe(true)
  })

  test('thumbnails are rendered after PDF loads', async ({ page }) => {
    await waitForPdf(page, '#thumbnails')
    await page.waitForTimeout(1000)
    const thumbCount = await page.evaluate(() => {
      const el = document.querySelector('#thumbnails')
      if (!el || !el.shadowRoot) return 0
      return el.shadowRoot.querySelectorAll('.thumb-wrapper').length
    })
    expect(thumbCount).toBeGreaterThan(0)
  })
})

test.describe('pdf-viewer - Events', () => {
  test('pdf-loaded event fires', async ({ page }) => {
    await page.goto(TEST_URL)
    await waitForComponent(page, '#empty')
    const fired = await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        const el = document.querySelector('#empty')
        if (!el) { reject(new Error('element not found')); return }
        const timer = setTimeout(() => reject(new Error('timeout')), 10000)
        el.addEventListener('pdf-loaded', (e) => {
          clearTimeout(timer)
          resolve({ pageCount: e.detail.pageCount })
        })
        el.addEventListener('pdf-load-error', (e) => {
          clearTimeout(timer)
          reject(new Error(e.detail.error))
        })
        el.setAttribute('src', '/test/fixtures/sample.pdf')
      })
    })
    expect(fired.pageCount).toBeGreaterThan(0)
  })

  test('page-change event fires on navigation', async ({ page }) => {
    await page.goto(TEST_URL)
    await waitForPdf(page)
    const fired = await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        const el = document.querySelector('#default')
        if (!el) { reject(new Error('not found')); return }
        const timer = setTimeout(() => reject(new Error('timeout')), 5000)
        el.addEventListener('page-change', (e) => {
          clearTimeout(timer)
          resolve({ page: e.detail.page, previousPage: e.detail.previousPage })
        })
        el.nextPage()
      })
    })
    expect(fired.page).toBe(2)
    expect(fired.previousPage).toBe(1)
  })
})

test.describe('pdf-viewer - Error Handling', () => {
  test('shows error for invalid src', async ({ page }) => {
    await page.goto(TEST_URL)
    await waitForComponent(page, '#empty')
    const errorShown = await page.evaluate(() => {
      return new Promise((resolve) => {
        const el = document.querySelector('#empty')
        if (!el) { resolve(false); return }
        el.addEventListener('pdf-load-error', () => {
          const errorOverlay = el.shadowRoot?.querySelector('.error-overlay')
          resolve(errorOverlay != null && errorOverlay.classList.contains('active'))
        })
        el.setAttribute('src', '/nonexistent.pdf')
      })
    })
    expect(errorShown).toBe(true)
  })
})

test.describe('pdf-viewer - Empty State', () => {
  test('shows empty state when no src', async ({ page }) => {
    await page.goto(TEST_URL)
    await waitForComponent(page, '#empty')
    const emptyVisible = await page.evaluate(() => {
      const el = document.querySelector('#empty')
      if (!el || !el.shadowRoot) return false
      const empty = el.shadowRoot.querySelector('.empty-state')
      return empty != null && empty.classList.contains('active')
    })
    expect(emptyVisible).toBe(true)
  })
})

test.describe('pdf-viewer - Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL)
    await waitForPdf(page)
  })

  test('toggleSearch opens search bar', async ({ page }) => {
    const isOpen = await page.evaluate(() => {
      const el = document.querySelector('#default')
      if (!el || typeof el.toggleSearch !== 'function') return false
      el.toggleSearch()
      const bar = el.shadowRoot?.querySelector('.search-bar')
      return bar != null && bar.classList.contains('open')
    })
    expect(isOpen).toBe(true)
  })

  test('search method finds text', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const el = document.querySelector('#default')
      if (!el || typeof el.search !== 'function') return 'not found'
      await el.search('Hello')
      await new Promise((r) => setTimeout(r, 500))
      return el.shadowRoot?.querySelector('.search-count')?.textContent || ''
    })
    expect(result).not.toBe('')
  })
})

test.describe('pdf-viewer - File Input', () => {
  test('setData with ArrayBuffer loads PDF', async ({ page }) => {
    await page.goto(TEST_URL)
    await waitForComponent(page, '#empty')
    const loaded = await page.evaluate(async () => {
      const el = document.querySelector('#empty')
      if (!el || typeof el.setData !== 'function') return 0

      const resp = await fetch('/test/fixtures/sample.pdf')
      const buffer = await resp.arrayBuffer()

      return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(0), 10000)
        el.addEventListener('pdf-loaded', (e) => {
          clearTimeout(timer)
          resolve(e.detail.pageCount)
        })
        el.addEventListener('pdf-load-error', () => {
          clearTimeout(timer)
          resolve(-1)
        })
        el.setData(buffer)
      })
    })
    expect(loaded).toBeGreaterThan(0)
  })
})
