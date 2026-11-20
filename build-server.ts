import * as esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'dist/server.cjs',
  external: ['express', 'axios', 'vite', 'fast-xml-parser', '@google/genai', 'dotenv'],
}).catch(() => process.exit(1));
