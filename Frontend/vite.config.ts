/*
 * Vite Build Configuration
 *
 * Configures the Vite dev server and build pipeline with:
 * - React plugin for JSX/TSX support
 * - Tailwind CSS v4 plugin for utility class compilation
 * - Custom Figma asset resolver for resolving 'figma:asset/' imports
 * - Path alias (@/ → src/) for cleaner imports
 * - API proxy forwarding /api requests to the backend server
 */
import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


/*
 * Custom Vite plugin that resolves Figma asset import paths.
 * Transforms 'figma:asset/filename' imports into absolute paths
 * pointing to the src/assets directory.
 *
 * @returns Vite plugin object with a resolveId hook
 */
function figmaAssetResolver() {
    return {
        name: 'figma-asset-resolver',
        resolveId(id) {
            if (id.startsWith('figma:asset/')) {
                const filename = id.replace('figma:asset/', '')
                return path.resolve(__dirname, 'src/assets', filename)
            }
        },
    }
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [
        figmaAssetResolver(),
        // The React and Tailwind plugins are both required for Make, even if
        // Tailwind is not being actively used – do not remove them
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            // Alias @ to the src directory
            '@': path.resolve(__dirname, './src'),
        },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],

    define: {
            // Định nghĩa lại một biến toàn cục thay thế chuỗi '/api' khi đóng gói lên Vercel
            // Nếu chạy local (dev) nó giữ nguyên là '/api' để chạy qua proxy server
            // Nếu build lên Vercel, nó sẽ bị thay thế hoàn toàn bằng link Render của bạn
            'process.env.API_BASE_URL': JSON.stringify(mode === 'production' ? `${env.VITE_API_URL}/api` : '/api')
        },

        server: {
            proxy: {
                '/api': {
                    target: env.VITE_API_URL || 'http://localhost:8080',
                    changeOrigin: true,
                },
            },
        },
    }
})
