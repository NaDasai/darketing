import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    server: 'src/server.ts',
    'workers/pipeline.worker': 'src/workers/pipeline.worker.ts',
    'scripts/seed': 'scripts/seed.ts',
  },
  outDir: 'dist',
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  sourcemap: true,
  clean: true,
  splitting: false,
  bundle: true,
  noExternal: ['@eagle-eyes/shared'],
  tsconfig: 'tsconfig.json',
});
