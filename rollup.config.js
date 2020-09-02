import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import babel from '@rollup/plugin-babel'
import {uglify} from 'rollup-plugin-uglify'
import pkg from './package.json'

const extensions = [
    '.js', '.jsx', '.ts', '.tsx',
];

export default [
    {
        input: 'src/index.ts',
        output: [
            {
                file: pkg.main,
                format: 'cjs',
            },
            {
                file: pkg.module,
                format: 'es',
            },
        ],
        external: [],
        plugins: [
            // Allows node_modules resolution
            resolve({ extensions }),

            // Allow bundling cjs modules. Rollup doesn't understand cjs
            commonjs(),

            // Compile TypeScript/JavaScript files
            babel({
                extensions,
                include: ['src/**/*'],
                babelHelpers: 'runtime',
            }),
        ],
    },
    {
        input: 'src/index.ts',
        output: [
            {
                file: pkg.browser,
                format: 'iife',
                name: 'Geom2',
                // the global which can be used in a browser
                // https://rollupjs.org/guide/en#output-globals-g-globals
                globals: {}
            }
        ],
        external: [],
        plugins: [
            resolve({ extensions }),
            commonjs(),
            babel({
                extensions,
                include: ['src/**/*'],
                babelHelpers: 'runtime',
            }),
            uglify(),
        ],
    }
]