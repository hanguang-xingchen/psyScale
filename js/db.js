// db.js — IndexedDB 答题存档（不支持时降级到 sessionStorage）

const DB_NAME = 'psyScale';
const DB_VERSION = 1;
const STORE = 'draft';
const FALLBACK_PREFIX = 'psyScale_draft_';
const RESULT_PREFIX = 'result:';
const FALLBACK_RESULT_PREFIX = 'psyScale_result_';

let dbPromise = null;

function hasIndexedDB() {
  return typeof indexedDB !== 'undefined';
}

function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

export async function saveDraft(draft) {
  if (hasIndexedDB()) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(draft, draft.scaleId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } else {
    sessionStorage.setItem(FALLBACK_PREFIX + draft.scaleId, JSON.stringify(draft));
  }
}

export async function loadDraft(scaleId) {
  if (hasIndexedDB()) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(scaleId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } else {
    const raw = sessionStorage.getItem(FALLBACK_PREFIX + scaleId);
    return raw ? JSON.parse(raw) : null;
  }
}

export async function clearDraft(scaleId) {
  if (hasIndexedDB()) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(scaleId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } else {
    sessionStorage.removeItem(FALLBACK_PREFIX + scaleId);
  }
}

export async function peekDraft() {
  if (hasIndexedDB()) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) { resolve(null); return; }
        if (cursor.key.startsWith(RESULT_PREFIX)) { cursor.continue(); return; }
        resolve(cursor.value);
      };
      req.onerror = () => reject(req.error);
    });
  } else {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key.startsWith(FALLBACK_PREFIX) && !key.startsWith(FALLBACK_RESULT_PREFIX)) {
        return JSON.parse(sessionStorage.getItem(key));
      }
    }
    return null;
  }
}

export async function saveResult(scaleId, data) {
  if (hasIndexedDB()) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(data, RESULT_PREFIX + scaleId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } else {
    sessionStorage.setItem(FALLBACK_RESULT_PREFIX + scaleId, JSON.stringify(data));
  }
}

export async function loadResult(scaleId) {
  if (hasIndexedDB()) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(RESULT_PREFIX + scaleId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } else {
    const raw = sessionStorage.getItem(FALLBACK_RESULT_PREFIX + scaleId);
    return raw ? JSON.parse(raw) : null;
  }
}
