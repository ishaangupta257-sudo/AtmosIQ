"""
MongoDB access with a transparent local fallback.

If a MongoDB server is reachable at MONGO_URI it is used (collections:
raw_readings, processed_readings, alerts, pipeline_status). If not — as on a
fresh laptop with no mongod running — we fall back to newline-delimited JSON
files under data/cache/<collection>.jsonl so the whole pipeline still runs and
is demoable. The public API (insert_many / replace_all / find / set_doc /
get_doc) is identical in both modes, so switching to a real cluster is a
config change, not a code change.
"""
from __future__ import annotations
import json
from pathlib import Path
from datetime import datetime

from config import MONGO_URI, MONGO_DB, CACHE_DIR
from common import log

_client = None
_mode = None   # "mongo" | "file"


def _default(o):
    if isinstance(o, datetime):
        return o.isoformat()
    raise TypeError(f"not serializable: {type(o)}")


def _connect():
    global _client, _mode
    if _mode is not None:
        return
    try:
        import pymongo
        c = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=800)
        c.admin.command("ping")
        _client = c[MONGO_DB]
        _mode = "mongo"
        log("db", f"connected to MongoDB at {MONGO_URI}")
    except Exception:
        _mode = "file"
        log("db", f"MongoDB unavailable -> JSON fallback at {CACHE_DIR}")


def mode() -> str:
    _connect()
    return _mode


def _path(collection) -> Path:
    return CACHE_DIR / f"{collection}.jsonl"


def replace_all(collection, docs):
    """Wipe a collection and insert docs (used for regenerated stage outputs)."""
    _connect()
    docs = list(docs)
    if _mode == "mongo":
        _client[collection].delete_many({})
        if docs:
            _client[collection].insert_many(docs)
    else:
        with open(_path(collection), "w") as f:
            for d in docs:
                f.write(json.dumps(d, default=_default) + "\n")
    log("db", f"{collection}: wrote {len(docs)} docs [{_mode}]")


def insert_many(collection, docs):
    _connect()
    docs = list(docs)
    if not docs:
        return
    if _mode == "mongo":
        _client[collection].insert_many(docs)
    else:
        with open(_path(collection), "a") as f:
            for d in docs:
                f.write(json.dumps(d, default=_default) + "\n")


def find(collection, query=None):
    """Minimal find: query supports flat equality match on top-level keys."""
    _connect()
    query = query or {}
    if _mode == "mongo":
        return list(_client[collection].find(query, {"_id": 0}))
    p = _path(collection)
    if not p.exists():
        return []
    out = []
    with open(p) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            d = json.loads(line)
            if all(d.get(k) == v for k, v in query.items()):
                out.append(d)
    return out


def set_doc(collection, doc_id, doc):
    """Upsert a single keyed document (used for pipeline_status/singletons)."""
    _connect()
    doc = {**doc, "_key": doc_id}
    if _mode == "mongo":
        _client[collection].replace_one({"_key": doc_id}, doc, upsert=True)
    else:
        existing = [d for d in find(collection) if d.get("_key") != doc_id]
        existing.append(doc)
        with open(_path(collection), "w") as f:
            for d in existing:
                f.write(json.dumps(d, default=_default) + "\n")


def get_doc(collection, doc_id):
    _connect()
    if _mode == "mongo":
        return _client[collection].find_one({"_key": doc_id}, {"_id": 0})
    for d in find(collection):
        if d.get("_key") == doc_id:
            return d
    return None
