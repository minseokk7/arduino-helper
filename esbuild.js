// esbuild 빌드 스크립트 — VS Code 확장을 단일 번들로 패키징
const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'dist/extension.js',
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    sourcemap: true,
    minify: !isWatch,
};

async function build() {
    try {
        if (isWatch) {
            const ctx = await esbuild.context(buildOptions);
            await ctx.watch();
            // eslint-disable-next-line no-console
        } else {
            await esbuild.build(buildOptions);
        }
    } catch (error) {
        process.exit(1);
    }
}

build();
