// AtmosIQ backend entrypoint — Express REST API in front of the Python ML engine.
//
//   Frontend  ->  this Express API  ->  ML engine (FastAPI)  ->  external APIs
//
// Runs with zero infrastructure: MongoDB and the ML engine are both optional
// (in-memory store + synthetic fallbacks), so `npm start` works out of the box
// and progressively lights up as you start MongoDB / the ML engine.
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';

import { PORT, PIPELINE_MODE, RUN_INTERVAL_MIN } from './src/config.js';
import { initDb } from './src/db.js';
import * as ml from './src/mlClient.js';
import api from './src/routes/api.js';

const app = express();
// CORS: the Netlify frontend calls this API cross-origin. By default we reflect
// the request origin (allow all — fine for a prototype). Set CORS_ORIGIN to a
// comma-separated list of exact origins (e.g. your Netlify URL) to lock it down.
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : true;
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use('/api', api);
app.get('/', (_req, res) => res.json({ service: 'AtmosIQ backend', docs: '/api/health' }));

async function bootstrap() {
  await initDb();

  // Ensure the model is trained so forecast endpoints work on first load.
  const h = await ml.mlHealth();
  if (h.ok && !h.data.model_ready) {
    console.log('[boot] ML engine reachable but no model — triggering pipeline run...');
    ml.pipelineRun().then((s) => console.log('[boot] pipeline:', s.status || 'done'));
  } else if (!h.ok) {
    console.log('[boot] ML engine not reachable — API serves synthetic fallbacks until it starts');
  } else {
    console.log('[boot] ML engine ready with trained models');
  }

  // Scheduled pipeline runs (config: PIPELINE_MODE=cron). Default is on-demand.
  if (PIPELINE_MODE === 'cron') {
    const expr = `*/${Math.max(1, RUN_INTERVAL_MIN)} * * * *`;
    cron.schedule(expr, () => {
      console.log('[cron] scheduled pipeline run');
      ml.pipelineRun().catch((e) => console.error('[cron] failed', e));
    });
    console.log(`[boot] scheduled pipeline every ${RUN_INTERVAL_MIN} min`);
  }

  app.listen(PORT, () => console.log(`[boot] AtmosIQ backend on http://localhost:${PORT}`));
}

bootstrap();
