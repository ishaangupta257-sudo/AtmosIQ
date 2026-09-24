// Backend configuration — reads .env-style vars from the process environment
// with safe demo defaults. No secrets required to run.
export const PORT = process.env.PORT || 5000;
export const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://127.0.0.1:8000';
export const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
export const MONGO_DB = process.env.MONGO_DB || 'atmosiq';
export const CACHE_TTL = Number(process.env.CACHE_TTL || 300);
export const PIPELINE_MODE = process.env.PIPELINE_MODE || 'ondemand';
export const RUN_INTERVAL_MIN = Number(process.env.RUN_INTERVAL_MIN || 30);
