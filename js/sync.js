/* =====================================================================
   sync.js — antrian kirim & tarik data (offline-first)
   • 1 panggilan "sync" = kirim semua perubahan + ambil perubahan dari HP lain
   • Otomatis: saat online kembali, saat app dibuka, tiap 20–30 detik
   • Gagal? Data tetap di antrian HP, dicoba ulang dengan jeda bertahap
   ===================================================================== */
'use strict';

const Sync = {
  busy: false, again: false, timer: 0, state: 'idle', err: '', fails: 0, lastRun: 0, justSent: 0,

  schedule(ms) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.run(), ms === undefined ? 900 : ms);
  },

  setState(s, err) {
    if (this.state === s && this.err === (err || '')) return;
    this.state = s; this.err = err || '';
    Bus.emit('sync');
  },

  async run() {
    if (!S.token || !S.loaded) return;
    if (this.busy) { this.again = true; return; }
    if (navigator.onLine === false) { this.setState('offline'); return; }
    clearTimeout(this.timer);
    this.busy = true; this.lastRun = Date.now();
    const ops = [...S.outbox.values()].sort((a, b) => a.seq - b.seq).slice(0, 400);
    if (ops.length) this.setState('sending');
    try {
      const res = await api('sync', { ops: ops.map((o) => ({ id: o.id, type: o.type, d: o.d, t: o.t, by: o.by, seq: o.seq })), since: S.since }, { timeout: 40000 });
      if (res.ok) {
        const done = new Set(res.data.applied || []);
        const rejected = res.data.rejected || [];
        rejected.forEach((r) => done.add(r.id));
        await Store.removeOps(ops.filter((o) => done.has(o.id)).map((o) => [o.key, o.id]));
        if (res.data.changes) await Store.applyChanges(res.data.changes);
        S.since = res.data.now; S.lastSyncAt = Date.now();
        Store.saveMeta();
        this.fails = 0;
        if (ops.length) this.justSent = Date.now();
        this.setState('ok');
        if (rejected.length) {
          Toast.show(rejected.length + ' perubahan ditolak server: ' + rejected[0].error, 'warn', { ms: 5000 });
          App.refreshAll(true);
        }
        if (S.outbox.size && ops.length) this.again = true;
      } else if (res.code === 'AUTH') {
        this.setState('error', res.error);
      } else {
        this.fails++;
        this.setState(res.offline ? 'offline' : 'error', res.error);
        this.schedule(Math.min(60000, 2000 * Math.pow(2, this.fails)));
      }
    } catch (e) {
      console.error(e);
      this.fails++;
      this.setState('error', e.message);
      this.schedule(Math.min(60000, 2000 * Math.pow(2, this.fails)));
    } finally {
      this.busy = false;
      if (this.again) { this.again = false; this.schedule(250); }
    }
    Uploads.run();
  },

  /** Teks & kelas untuk pill status di header. */
  pill() {
    const n = S.outbox.size + Uploads.pending;
    const off = navigator.onLine === false || this.state === 'offline';
    if (off) return { cls: 'warn', icon: 'dot', text: 'Offline' + (n ? ' · ' + n + ' belum terkirim' : '') };
    if (this.state === 'sending') return { cls: 'ok', icon: 'spin', text: 'Mengirim…' };
    if (this.state === 'error' && n) return { cls: 'err', icon: 'dot', text: 'Gagal kirim · ' + n };
    if (n) return { cls: 'warn', icon: 'dot', text: n + ' belum terkirim' };
    return { cls: 'ok', icon: 'dot', text: 'Online' };
  }
};

/* ---------- Antrian unggah foto ---------- */
const Uploads = {
  busy: false, pending: 0,
  async count() {
    const files = await DB.getAll('files');
    this.pending = files.filter((f) => f.kind === 'foto' && f.pending).length;
    return files;
  },
  async run() {
    if (this.busy || navigator.onLine === false || !S.token) return;
    this.busy = true;
    try {
      const files = await this.count();
      for (const f of files) {
        if (f.kind !== 'foto' || !f.pending) continue;
        if (S.outbox.has('kg:' + f.kid)) continue;                     // tunggu kegiatan terkirim dulu
        const res = await api('foto.upload', { kid: f.kid, slot: f.slot, data: f.data.split(',')[1] }, { reqId: f.reqId });
        if (res.ok) {
          f.pending = false; f.fileId = res.data.fileId;
          await DB.put('files', f);
          await Store.applyChanges({ kg: [res.data.kg] });
          Bus.emit('foto', f.kid);
        } else if (res.code !== 'RETRY' && !res.network) {
          f.pending = false; f.error = res.error;
          await DB.put('files', f);
          Toast.show('Foto gagal diunggah: ' + res.error, 'err');
        }
      }
      await this.count();
      Bus.emit('sync');
    } finally { this.busy = false; }
  }
};

/* ---------- Pemicu otomatis ---------- */
addEventListener('online', () => { Sync.setState('idle'); Sync.run(); });
addEventListener('offline', () => Sync.setState('offline'));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - Sync.lastRun > 10000) Sync.run();
});
setInterval(() => {
  if (document.visibilityState !== 'visible' || !S.token || navigator.onLine === false) return;
  const every = App.route && App.route.name === 'absen' ? 20000 : 30000;
  if (Date.now() - Sync.lastRun >= every) Sync.run();
}, 5000);
