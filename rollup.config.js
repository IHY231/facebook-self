import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";

export default {
    input: 'src/main.ts',
    output: [
        {
            file: 'dist/bundle.common.js',
            format: 'cjs',
            sourcemap: true
        },
        {
            file: 'dist/bundle.es.js',
            format: 'es',
            sourcemap: true
        }
    ],
    plugins: [
        nodeResolve({
            browser: false
        }),

        commonjs({
            sourceMap: true
        }),

        typescript({
            sourceMap: true
        })
    ]
}
