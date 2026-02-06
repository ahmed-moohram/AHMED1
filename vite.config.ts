import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      assetsInclude: ['**/*.apk'],
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'emit-stable-apk',
          apply: 'build',
          generateBundle() {
            const apkPath = path.resolve(__dirname, 'components', 'Nursing-Pulse.apk');
            if (!fs.existsSync(apkPath)) return;
            const source = fs.readFileSync(apkPath);
            this.emitFile({
              type: 'asset',
              fileName: 'Nursing-Pulse.apk',
              source,
            });
          },
        },
        {
          name: 'serve-stable-apk',
          apply: 'serve',
          configureServer(server) {
            server.middlewares.use((req, res, next) => {
              const url = (req.url || '').split('?')[0];
              if (url !== '/Nursing-Pulse.apk') return next();

              const apkPath = path.resolve(__dirname, 'components', 'Nursing-Pulse.apk');
              if (!fs.existsSync(apkPath)) {
                res.statusCode = 404;
                res.end('Not Found');
                return;
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/vnd.android.package-archive');
              res.setHeader('Content-Disposition', 'attachment; filename="Nursing-Pulse.apk"');
              fs.createReadStream(apkPath).pipe(res);
            });
          },
        },
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
