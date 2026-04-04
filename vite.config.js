import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/pdf-viewer.js',
      formats: ['es'],
      fileName: () => 'pdf-viewer.js'
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    }
  },
  server: {
    open: '/docs/index.html'
  }
})
