/* =====================================================================
   api.js — pemanggil REST API Google Apps Script
   • POST text/plain (tanpa preflight CORS), redirect: follow
   • Timeout (AbortController), retry bertahap, tunggu online
   • reqId untuk aksi tulis → aman diulang tanpa data ganda
   • Perf.table() di console untuk melihat waktu server vs jaringan
   ===================================================================== */
'use strict';

const Perf = {
  rows: [],
  add(action, total, server) {
    this.rows.push({ action, total, server: server === undefined ? null : server, net: server === undefined ? null : total - server, at: new Date().toLocaleTimeString() });
    if (this.rows.length > 200) this.rows.shift();
  },
  table() { console.table(this.rows.slice(-30)); }
};
window.Perf = Perf;

const API = {
  url() { return (window.APP_CONFIG && window.APP_CONFIG.API_URL) || ''; },
  configured() { const u = this.url(); return !!u && u.indexOf('XXXX') < 0 && /^https?:\/\//.test(u); },
  // Aksi baca/idempoten boleh diulang otomatis
  RETRY: /^(ping|bootstrap|sync|kegiatan\.presensi|foto\.get|pdf\.get|penerobos\.list|auth\.login)$/,
  WRITE: /^(auth\.changePin|penerobos\.(add|delete|resetPin|rename)|foto\.(upload|delete)|pdf\.generate)$/,

  async once(action, data, timeout, reqId) {
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), timeout), t0 = performance.now();
    try {
      const res = await fetch(this.url(), {
        method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctrl.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, token: S.token || '', reqId: reqId || '', data: data || {} })
      });
      const text = await res.text();
      try {
        const j = JSON.parse(text);
        Perf.add(action, Math.round(performance.now() - t0), j.ms);
        return j;
      } catch (e) {
        return { ok: false, network: true, retry: res.status >= 500 || res.status === 429 || res.status === 0, error: 'Server membalas tidak sesuai (HTTP ' + res.status + '). Periksa URL API.' };
      }
    } catch (err) {
      return { ok: false, network: true, retry: true, error: err.name === 'AbortError' ? 'Server terlalu lama merespons.' : 'Tidak ada koneksi internet.' };
    } finally { clearTimeout(timer); }
  },

  async call(action, data, opt) {
    opt = opt || {};
    if (!this.configured()) return { ok: false, error: 'Alamat server (API_URL) belum diisi di js/config.js.', code: 'NO_CONFIG' };
    if (navigator.onLine === false && !opt.ignoreOffline) return { ok: false, network: true, offline: true, error: 'Butuh internet.' };
    const retryable = this.RETRY.test(action) || this.WRITE.test(action);
    const reqId = this.WRITE.test(action) ? (opt.reqId || uid() + uid()) : '';
    const tries = opt.tries || (retryable ? 3 : 1);
    let res;
    for (let i = 0; i < tries; i++) {
      if (i) {
        await new Promise((r) => setTimeout(r, 1200 * i));
        if (navigator.onLine === false) await waitOnline(15000);
      }
      res = await this.once(action, data, opt.timeout || (this.WRITE.test(action) ? 90000 : i ? 40000 : 25000), reqId);
      if (res.ok || !res.retry) break;
    }
    if (!res.ok && res.code === 'AUTH' && action !== 'auth.login') Bus.emit('auth-expired');
    return res;
  },

  /** Membangunkan server (mengurangi jeda "masuk pertama"). */
  warmUp() {
    if (!this.configured() || navigator.onLine === false) return;
    try { fetch(this.url() + '?ping=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }).catch(() => {}); } catch (e) {}
  }
};

function waitOnline(ms) {
  return new Promise((r) => {
    if (navigator.onLine !== false) return r();
    const done = () => { clearTimeout(t); removeEventListener('online', done); r(); };
    const t = setTimeout(done, ms);
    addEventListener('online', done);
  });
}
const api = (a, d, o) => API.call(a, d, o);
