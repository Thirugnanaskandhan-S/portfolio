
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/docs/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/docs"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 439, hash: 'fc535bf84a1cd3ab4598dbcdfe5f36a9a011941df838d501968cd0002137c180', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 952, hash: '96c6eab60a147e1a8f60ad088fc3924af83a4f6ca661d056f18db92abd3ed55c', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'index.html': {size: 587, hash: '44923fa49d8ea0782510c7ac90321be87dbd8c6d4274fe4e8102f045b65de8d9', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'styles-5INURTSO.css': {size: 0, hash: 'menYUTfbRu8', text: () => import('./assets-chunks/styles-5INURTSO_css.mjs').then(m => m.default)}
  },
};
