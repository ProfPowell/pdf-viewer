import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        customElements: 'readonly',
        HTMLElement: 'readonly',
        CustomEvent: 'readonly',
        MutationObserver: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Event: 'readonly',
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
        ClipboardEvent: 'readonly',
        DragEvent: 'readonly',
        TouchEvent: 'readonly',
        DOMParser: 'readonly',
        Node: 'readonly',
        NodeList: 'readonly',
        Element: 'readonly',
        DocumentFragment: 'readonly',
        CSSStyleSheet: 'readonly',
        ShadowRoot: 'readonly',
        getComputedStyle: 'readonly',
        matchMedia: 'readonly',
        AbortController: 'readonly',
        DataTransfer: 'readonly',
        Uint8Array: 'readonly',
        ArrayBuffer: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'off'
    }
  },
  {
    ignores: ['dist/', 'node_modules/', 'docs/', 'test/']
  }
]
