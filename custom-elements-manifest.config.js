function stripPrivateMembers() {
  return {
    name: 'strip-private-members',
    analyzePhase({ ts, node, moduleDoc }) {},
    packageLinkPhase({ customElementsManifest }) {
      customElementsManifest.modules.forEach((mod) => {
        mod.declarations?.forEach((dec) => {
          if (dec.members) {
            dec.members = dec.members.filter(
              (m) => !m.name.startsWith('_') && !m.name.startsWith('#')
            )
          }
        })
      })
    }
  }
}

function addCssParts() {
  return {
    name: 'add-css-parts',
    packageLinkPhase({ customElementsManifest }) {
      customElementsManifest.modules.forEach((mod) => {
        mod.declarations?.forEach((dec) => {
          if (dec.tagName === 'pdf-viewer') {
            dec.cssParts = [
              { name: 'toolbar', description: 'The toolbar area' },
              { name: 'content', description: 'The PDF viewport/content area' },
              { name: 'sidebar', description: 'The thumbnail sidebar' },
              { name: 'search', description: 'The search bar' }
            ]
          }
        })
      })
    }
  }
}

export default {
  globs: ['src/**/*.js'],
  exclude: ['src/**/*.test.js'],
  outdir: '.',
  litelement: false,
  plugins: [stripPrivateMembers(), addCssParts()]
}
