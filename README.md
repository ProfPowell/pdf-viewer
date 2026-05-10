# @profpowell/pdf-viewer

A standalone `<pdf-viewer>` web component wrapping [PDF.js](https://mozilla.github.io/pdf.js/) with navigation, zoom, search, thumbnails, dark mode, and full design-token theming.

Status: **alpha** — API may shift before 1.0.

- Live demo: https://profpowell.github.io/pdf-viewer/
- Repo: https://github.com/ProfPowell/pdf-viewer

## Install

```bash
npm install @profpowell/pdf-viewer
```

Or import directly from a CDN (ESM):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@profpowell/pdf-viewer/dist/pdf-viewer.js"></script>
```

## Quick start

```html
<script type="module">
  import '@profpowell/pdf-viewer'
</script>

<pdf-viewer src="document.pdf"></pdf-viewer>
```

```html
<pdf-viewer
  src="report.pdf"
  page="3"
  zoom="fit-width"
  show-thumbnails
  show-search
></pdf-viewer>
```

## Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `src` | string | — | URL of the PDF document |
| `page` | number | `1` | Current page (1-based) |
| `zoom` | string | `auto` | Number (`"1.5"`) or mode (`"fit-width"`, `"fit-page"`, `"auto"`) |
| `mode` | `light` \| `dark` | auto | Color scheme; omit to follow page/system preference |
| `view` | `single` \| `continuous` | `single` | Page layout mode |
| `show-toolbar` | boolean | `true` | Show the toolbar |
| `show-thumbnails` | boolean | `false` | Show thumbnail sidebar |
| `show-search` | boolean | `false` | Show search bar |
| `no-download` | boolean | `false` | Hide the download button |
| `no-print` | boolean | `false` | Hide the print button |
| `title` | string | — | Title displayed in the toolbar |
| `lazy` | boolean | `false` | Defer loading until the component scrolls into view |

## Methods

`nextPage()`, `prevPage()`, `goToPage(n)`, `getPageCount()`, `getCurrentPage()`, `zoomIn()`, `zoomOut()`, `setZoom(level)`, `setData(arrayBufferOrFile)`, `openFile()`, `download()`, `print()`, `search(query)`, `clearSearch()`, `toggleFullscreen()`, `toggleThumbnails()`, `toggleSearch()`.

See [`pdf-viewer.d.ts`](./pdf-viewer.d.ts) for full type signatures.

## Events

| Event | Detail |
|---|---|
| `pdf-loaded` | `{ url, pageCount, title }` |
| `pdf-load-error` | `{ url, error }` |
| `page-change` | `{ page, previousPage, pageCount }` |
| `zoom-change` | `{ zoom, previousZoom }` |
| `view-change` | `{ view }` |
| `file-opened` | `{ name, size }` |

## Theming

Two layers of CSS custom properties, both optional:

**1. Per-instance overrides** — `--pdf-viewer-*` properties take highest priority.

```css
pdf-viewer {
  --pdf-viewer-accent-color: #ff6b00;
  --pdf-viewer-toolbar-bg: #fafafa;
  --pdf-viewer-sidebar-width: 240px;
  --pdf-viewer-highlight: rgba(255, 200, 0, 0.5);
}
```

Available: `--pdf-viewer-bg`, `--pdf-viewer-toolbar-bg`, `--pdf-viewer-border-color`, `--pdf-viewer-text-color`, `--pdf-viewer-text-muted`, `--pdf-viewer-accent-color`, `--pdf-viewer-hover-bg`, `--pdf-viewer-content-bg`, `--pdf-viewer-sidebar-bg`, `--pdf-viewer-sidebar-width`, `--pdf-viewer-toolbar-height`, `--pdf-viewer-font-family`, `--pdf-viewer-font-size`, `--pdf-viewer-shadow`, `--pdf-viewer-highlight`, `--pdf-viewer-highlight-active`.

**2. Design-token consumption** — when surrounding CSS defines tokens like `--color-surface`, `--size-xs`, `--font-size-base`, `--radius-s`, `--shadow-m`, `--border-width-thin`, the component picks them up automatically. Each token has a sensible pixel/color fallback so consumers without a token system see no visual change.

### Vanilla Breeze compatibility

This component is designed to drop into a [Vanilla Breeze](https://github.com/vanilla-breeze) page with **zero extra wiring**. It consumes the standard VB token namespaces:

| Surface | VB tokens consumed |
|---|---|
| Colors | `--color-surface`, `--color-surface-raised`, `--color-surface-sunken`, `--color-surface-hover`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-interactive`, `--color-error` |
| Typography | `--font-sans`, `--font-size-2xs`, `--font-size-xs`, `--font-size-sm`, `--font-size-base`, `--font-size-l` |
| Spacing | `--size-3xs`, `--size-2xs`, `--size-xs`, `--size-s`, `--size-m` |
| Borders & radii | `--border-width-thin`, `--radius-xs`, `--radius-s`, `--radius-m` |
| Shadows | `--shadow-s`, `--shadow-m`, `--shadow-l` (heavier in dark mode for contrast) |

Theme-pack switching (default ↔ rough ↔ extreme-swiss ↔ extreme-neumorphism) re-skins toolbar, sidebar, search bar, overlays, and chrome borders. The PDF page paper itself stays white in both light and dark mode by PDF/print convention — this is intentional, not a bug.

The `--pdf-viewer-*` overrides above always win over VB tokens, so per-instance customization remains available inside a themed page.

## Dark mode

Dark mode is auto-detected from `prefers-color-scheme`. Force it explicitly with the `mode` attribute:

```html
<pdf-viewer src="doc.pdf" mode="dark"></pdf-viewer>
```

The component also observes the host page's `data-theme` / `class="dark"` (via `theme-observer`) so it stays in sync with site-wide theme toggles.

## Browser support

Modern evergreen browsers with ES modules and Custom Elements v1 (Chrome, Firefox, Safari, Edge — recent versions).

## License

MIT © [Prof Thomas Powell](https://github.com/ProfPowell)
