import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
    manifest: {
        name: 'Orderly — Order Management',
        short_name: 'Orderly',
        description: 'A clearer way to manage your orders.',
        theme_color: '#3a50a5',
        background_color: '#5f7bec',
        display: 'standalone',
        start_url: '/'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}']
      }
    })
  ]
});
