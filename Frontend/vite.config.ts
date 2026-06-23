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
import { defineConfig } from 'vite'
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

export default defineConfig({
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

    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
        },
    },
})
