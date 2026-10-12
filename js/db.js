/* =====================================================================
   db.js — penyimpanan permanen di HP (IndexedDB)
   Store: kv, peserta, kegiatan, presensi, outbox (antrian), files (foto/PDF)
   ===================================================================== */
'use strict';

const DB = (() => {
  const NAME = 'presensi-sambung', VER = 1;
  const STORES = { kv: null, peserta: 'id', kegiatan: 'id', presensi: 'k', outbox: 'key', files: 'key' };
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const r = indexedDB.open(NAME, VER);
      r.onupgradeneeded = () => {
        const db = r.result;
        Object.keys(STORES).forEach((s) => {
          if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, STORES[s] ? { keyPath: STORES[s] } : undefined);
        });
      };
      r.onsuccess = () => {
        const db = r.result;
        db.onversionchange = () => { db.close(); location.reload(); };
        resolve(db);
      };
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(new Error('Database terkunci oleh tab lain. Tutup tab lain lalu muat ulang.'));
    });
    return dbp;
  }

  const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  /** Satu transaksi untuk banyak operasi: fn(tx) dengan tx.put(store, val) / tx.del(store, key) / tx.clear(store) */
  async function batch(stores, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(stores, 'readwrite');
      const api = {
        put: (s, v, k) => (k === undefined ? t.objectStore(s).put(v) : t.objectStore(s).put(v, k)),
        del: (s, k) => t.objectStore(s).delete(k),
        clear: (s) => t.objectStore(s).clear()
      };
      try { fn(api); } catch (e) { reject(e); try { t.abort(); } catch (e2) {} return; }
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('Transaksi dibatalkan'));
    });
  }

  return {
    open, batch,
    async getAll(s) { const db = await open(); return req(db.transaction(s).objectStore(s).getAll()); },
    async get(s, k) { const db = await open(); return req(db.transaction(s).objectStore(s).get(k)); },
    async kvAll() {
      const db = await open(), t = db.transaction('kv'), st = t.objectStore('kv');
      const [keys, vals] = await Promise.all([req(st.getAllKeys()), req(st.getAll())]);
      const o = {}; keys.forEach((k, i) => (o[k] = vals[i])); return o;
    },
    put(s, v) { return batch([s], (t) => (Array.isArray(v) ? v.forEach((x) => t.put(s, x)) : t.put(s, v))); },
    del(s, k) { return batch([s], (t) => (Array.isArray(k) ? k.forEach((x) => t.del(s, x)) : t.del(s, k))); },
    kvSet(k, v) { return batch(['kv'], (t) => t.put('kv', v, k)); },
    async wipe() { return batch(Object.keys(STORES), (t) => Object.keys(STORES).forEach((s) => t.clear(s))); }
  };
})();
