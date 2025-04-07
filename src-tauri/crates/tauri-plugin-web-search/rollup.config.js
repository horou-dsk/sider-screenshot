import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cwd } from 'node:process'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import raw from '@xiaohuohumax/rollup-plugin-raw'

const pkg = JSON.parse(readFileSync(join(cwd(), 'package.json'), 'utf8'))

// 共享的 TypeScript 配置
const tsPlugin = typescript({
  declaration: true,
  declarationDir: `./${pkg.exports.import.split('/')[0]}`,
  emitDeclarationOnly: true,
  declarationMap: false,
  composite: false,
})

export default [{
  input: 'guest-js/dom-ready.ts',
  output: {
    file: 'dist-js/dom-ready.js',
    format: 'iife',
    name: 'domReady',
    sourcemap: false,
  },
  plugins: [
    typescript({
      compilerOptions: {
        declaration: false,
        module: 'ESNext',
        moduleResolution: 'node',
      },
    }),
    nodeResolve({
      extensions: ['.ts', '.js', '.json'],
      browser: true,
    }),
    commonjs(),
    terser(),
  ],
}, {
  input: 'guest-js/index.ts',
  output: [
    {
      file: pkg.exports.import,
      format: 'esm',
    },
    {
      file: pkg.exports.require,
      format: 'cjs',
    },
  ],
  plugins: [
    raw(),
    tsPlugin,
  ],
  external: [
    /^@tauri-apps\/api/,
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
}]
