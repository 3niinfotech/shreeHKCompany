// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [
//     react({
//       babel: {
//         plugins: [['babel-plugin-react-compiler']],
//       },
//     }),
//   ],
// })



import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_TARGET = 'http://localhost:3500'

/**
 * Browser reload on SPA routes (e.g. /transaction/inward, /report/outstanding)
 * must serve index.html — not proxy to Express (which returns "Cannot GET ...").
 */
function spaHtmlBypass(req) {
  if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
    return '/index.html'
  }
}

function apiProxy(extra = {}) {
  const { bypass: extraBypass, ...rest } = extra
  return {
    target: API_TARGET,
    changeOrigin: true,
    bypass(req, ...args) {
      const spa = spaHtmlBypass(req)
      if (spa) return spa
      if (typeof extraBypass === 'function') return extraBypass(req, ...args)
    },
    ...rest,
  }
}

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    proxy: {
      '/user': apiProxy(),
      '/company': apiProxy(),
      '/product': apiProxy(),
      '/inward': apiProxy(),
      '/outward': apiProxy(),
      '/common': apiProxy(),
      '/notification': apiProxy(),
      '/report': apiProxy(),
      '/lab': apiProxy(),
      '/category': apiProxy(),
      '/origin': apiProxy(),
      '/shipping': apiProxy(),
      '/bulk-update': apiProxy(),
      '/rapnet': apiProxy(),
      '/uploads': apiProxy(),
      '/api': apiProxy(),
      '/ai': apiProxy(),
      '/health': apiProxy(),
      '/session': apiProxy(),
      '/dashboard': apiProxy(),
      '/advance': apiProxy(),
      '/expanse': apiProxy(),
      '/partywisetransaction': apiProxy(),
      '/transaction': apiProxy(),
      '/balance': apiProxy(),
      '/my-balance-book': apiProxy(),
      '/my-balance-delete': apiProxy(),
      '/my-balance-get': apiProxy(),
      '/currency-rate': apiProxy(),
      '/currency-rate-delete': apiProxy(),
      '/getAdminManageUser': apiProxy(),
      '/admin-manage-user': apiProxy(),
      '/manage-user': apiProxy(),
      '/getLoginAllUsers': apiProxy(),
      '/addNewUser': apiProxy(),
      '/deleteUser': apiProxy(),
      '/role-list': apiProxy(),
      '/role-add': apiProxy(),
      '/role-update': apiProxy(),
      '/role-delete': apiProxy(),
      '/permission-registry': apiProxy(),
      '/admin/tenant-company': apiProxy(),
      '/admin/activity-log': apiProxy(),
      '/portal': apiProxy(),
      '/config': apiProxy(),
      '/integration': apiProxy(),
      '/accounting': apiProxy(),
      '/attribute': apiProxy(),
      '/master/company': apiProxy(),
      '/master/category': apiProxy(),
      '/master/lab': apiProxy(),
      '/master/shipping': apiProxy(),
      '/master/origin': apiProxy(),
      '/master/attribute': apiProxy(),
      // Stone History Image/Video: same-origin so thumbs are not hotlink-blocked
      // and Vision360 is not refused by X-Frame-Options: SAMEORIGIN.
      '/media': {
        target: 'https://www.shreehk.com',
        changeOrigin: true,
        secure: true,
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('referer', 'https://www.shreehk.com/')
            proxyReq.setHeader('origin', 'https://www.shreehk.com')
          })
          proxy.on('proxyRes', (proxyRes) => {
            delete proxyRes.headers['x-frame-options']
            delete proxyRes.headers['content-security-policy']
            delete proxyRes.headers['content-security-policy-report-only']
          })
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('antd')) return 'vendor-antd';
            if (id.includes('@ant-design/icons')) return 'vendor-icons';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('@tanstack/react-query')) return 'vendor-query';
            if (id.includes('xlsx-js-style') || id.includes('/xlsx/')) return 'vendor-xlsx';
            return 'vendor';
          }
        },
      },
    },
    // Gzip compression support ke liye chunks chote rakhta hai
    chunkSizeWarningLimit: 600,
  },
})