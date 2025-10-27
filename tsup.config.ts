import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/**/*.ts'],
    clean: true,
    format: 'esm',
    outDir: 'dist',
    external: ['lightningcss'],
    noExternal: ['csv-stringify'],
})