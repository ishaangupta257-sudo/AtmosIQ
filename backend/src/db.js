// MongoDB access with a transparent in-memory fallback + a small TTL cache.
//
// Backend responsibilities that touch storage:
//   * cache ML-engine responses (TTL) so the frontend isn't blocked on slow
//     external APIs / model runs;
//   * persist health profiles and construction sites.
// If MongoDB isn't reachable (no mongod on the demo laptop) every operation
// falls back to an in-process Map, so the API runs with zero infrastructure.
import { MongoClient } from 'mongodb';
import { MONGO_URI, MONGO_DB, CACHE_TTL } from './config.js';

let db = null;
let mode = 'memory';
const mem = new Map(); // collection -> Map(key -> doc)

function memCol(name) {
  if (!mem.has(name)) mem.set(name, new Map());
  return mem.get(name);
}

export async function initDb() {
  try {
    const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 800 });
    await client.connect();
    await client.db(MONGO_DB).command({ ping: 1 });
    db = client.db(MONGO_DB);
    mode = 'mongo';
    console.log(`[db] connected to MongoDB (${MONGO_DB})`);
  } catch {
    mode = 'memory';
    console.log('[db] MongoDB unavailable -> in-memory store');
  }
  return mode;
}

export const dbMode = () => mode;

export async function put(collection, key, doc) {
  const record = { _key: key, ...doc };
  if (mode === 'mongo') {
    await db.collection(collection).replaceOne({ _key: key }, record, { upsert: true });
  } else {
    memCol(collection).set(key, record);
  }
}

export async function get(collection, key) {
  if (mode === 'mongo') return db.collection(collection).findOne({ _key: key }, { projection: { _id: 0 } });
  return memCol(collection).get(key) || null;
}

export async function list(collection) {
  if (mode === 'mongo') return db.collection(collection).find({}, { projection: { _id: 0 } }).toArray();
  return [...memCol(collection).values()];
}

export async function remove(collection, key) {
  if (mode === 'mongo') await db.collection(collection).deleteOne({ _key: key });
  else memCol(collection).delete(key);
}

// ---- TTL cache (backed by the same store) ----
export async function cached(key, ttl, producer) {
  const now = Date.now();
  const hit = await get('cache', key);
  if (hit && hit.expires > now) return hit.value;
  const value = await producer();
  await put('cache', key, { value, expires: now + (ttl ?? CACHE_TTL) * 1000 });
  return value;
}
