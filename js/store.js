/* =====================================================================
   store.js — state aplikasi di memori + persistensi IndexedDB
   Setiap perubahan lokal: tampilan diperbarui SEKETIKA (optimistis),
   disimpan ke HP, lalu masuk antrian (outbox) untuk dikirim ke server.
   ===================================================================== */
'use strict';

const DEFAULT_TEMPLATE_WA = [
  '*Sambung {tingkat}*', '*{judul}*', 'Kelompok {nama_kelompok}', '📅 {hari_tanggal}', '🕐 {jam}', '📍 {tempat}', '',
  'Hadir: {jumlah_hadir} dari {jumlah_peserta} ({persentase})', '',
  '*Laki-laki ({jumlah_hadir_l})*', '{daftar_hadir_l}', '', '*Perempuan ({jumlah_hadir_p})*', '{daftar_hadir_p}'
].join('\n');

const DEFAULT_TEMPLATE_MUSY = [
  '*Musyawaroh {tingkat}*', '*{judul}*', 'Kelompok {nama_kelompok}', '📅 {hari_tanggal}', '🕐 {jam}', '📍 {tempat}', '',
  'Hadir: {jumlah_hadir} dari {jumlah_anggota} ({persentase})', '{daftar_hadir}', '',
  '*Hasil Musyawaroh*', '{notulen}'
].join('\n');

const DEFAULT_CFG = {
  nama_kelompok: '', template_wa: DEFAULT_TEMPLATE_WA, template_musy: DEFAULT_TEMPLATE_MUSY, pdf_tampilkan_tidak_hadir: false,
  ambang_sering_tidak_hadir: 50, jumlah_kegiatan_evaluasi: 8, tema_warna: ''
};
const MUSY = 'MUSYAWAROH';

const S = {
  me: null, token: '', exp: 0,
  cfg: Object.assign({}, DEFAULT_CFG), pnr: {}, since: 0, window: '', lastSyncAt: 0,
  peserta: new Map(), kegiatan: new Map(), presensi: new Map(), outbox: new Map(),
  dk: new Map(), ag: new Map(),          // dapukan musyawaroh & anggotanya (id_peserta → dapukan)
  ver: 0, obVer: 0, seq: 0, loaded: false
};

const _memo = {};
function memo(key, fn, verKey) {
  const v = verKey === 'ob' ? S.obVer + ':' + S.ver : S.ver;
  const m = _memo[key];
  if (m && m.v === v) return m.r;
  const r = fn();
  _memo[key] = { v, r };
  return r;
}
function prMap(kid) {
  let m = S.presensi.get(kid);
  if (!m) { m = new Map(); S.presensi.set(kid, m); }
  return m;
}
function pnrMap(list) {
  const o = {};
  (list || []).forEach((p) => { o[p.id] = p; });
  return o;
}
function prRec(kid, pid, r) { const o = { k: kid + '|' + pid, kid, pid, h: r.h, t: r.t, by: r.by }; if (r.dk) o.dk = r.dk; return o; }
function prVal(r) { const o = { h: r.h, t: r.t, by: r.by }; if (r.dk) o.dk = r.dk; return o; }
const isMusy = (k) => !!k && k.jenis === MUSY;

const Store = {
  /* ---------- Sesi ---------- */
  loadSession() {
    const s = LS.get('session', null);
    if (s && s.token && s.exp > Date.now()) { S.token = s.token; S.exp = s.exp; S.me = s.me; return true; }
    return false;
  },
  setSession(d) {
    S.token = d.token; S.exp = d.exp; S.me = d.me;
    LS.set('session', { token: d.token, exp: d.exp, me: d.me });
  },
  clearSession() { S.token = ''; S.me = null; LS.del('session'); },
  isUtama() { return !!S.me && S.me.peran === 'UTAMA'; },
  nameOf(id) {
    if (S.pnr[id]) return S.pnr[id].nama;
    if (S.me && S.me.id === id) return S.me.nama;
    return 'Penerobos';
  },

  /* ---------- Muat dari HP ---------- */
  async load() {
    const [kv, ps, kg, pr, ob] = await Promise.all([DB.kvAll(), DB.getAll('peserta'), DB.getAll('kegiatan'), DB.getAll('presensi'), DB.getAll('outbox')]);
    S.cfg = Object.assign({}, DEFAULT_CFG, kv.cfg || {});
    S.pnr = kv.pnr || {}; S.since = kv.since || 0; S.window = kv.window || ''; S.lastSyncAt = kv.lastSyncAt || 0; S.seq = kv.seq || 0;
    S.dk = new Map((kv.dk || []).map((d) => [d.id, d]));
    S.ag = new Map((kv.ag || []).map((a) => [a.pid, a]));
    S.peserta = new Map(ps.map((p) => [p.id, p]));
    S.kegiatan = new Map(kg.map((k) => [k.id, k]));
    S.presensi = new Map();
    pr.forEach((r) => prMap(r.kid).set(r.pid, prVal(r)));
    S.outbox = new Map(ob.map((o) => [o.key, o]));
    S.loaded = true; S.ver++; S.obVer++;
  },
  hasData() { return S.since > 0; },

  /* ---------- Unduhan awal dari server (ganti seluruh data) ---------- */
  async applyBoot(b) {
    S.peserta = new Map((b.ps || []).map((p) => [p.id, p]));
    S.kegiatan = new Map((b.kg || []).filter((k) => !k.del).map((k) => [k.id, k]));
    S.presensi = new Map();
    (b.pr || []).forEach((x) => prMap(x[0]).set(x[1], prVal({ h: x[2], t: x[3], by: x[4], dk: x[5] })));
    S.dk = new Map((b.dk || []).filter((d) => !d.del).map((d) => [d.id, d]));
    S.ag = new Map((b.ag || []).filter((a) => a.dk).map((a) => [a.pid, a]));
    S.cfg = Object.assign({}, DEFAULT_CFG, b.cfg || {});
    S.pnr = pnrMap(b.pnr);
    S.since = b.now; S.window = b.window || '';
    this.refreshMe();
    // Perubahan lokal yang belum terkirim tetap berlaku di atas data server
    [...S.outbox.values()].sort((a, c) => a.seq - c.seq).forEach((op) => applyOpLocal(op));
    S.ver++;
    await DB.batch(['kv', 'peserta', 'kegiatan', 'presensi'], (tx) => {
      ['peserta', 'kegiatan', 'presensi'].forEach((s) => tx.clear(s));
      S.peserta.forEach((p) => tx.put('peserta', p));
      S.kegiatan.forEach((k) => tx.put('kegiatan', k));
      S.presensi.forEach((m, kid) => m.forEach((r, pid) => tx.put('presensi', prRec(kid, pid, r))));
      tx.put('kv', S.cfg, 'cfg'); tx.put('kv', S.pnr, 'pnr'); tx.put('kv', S.since, 'since'); tx.put('kv', S.window, 'window');
      tx.put('kv', [...S.dk.values()], 'dk'); tx.put('kv', [...S.ag.values()], 'ag');
    });
    Bus.emit('data', { remote: true, full: true });
  },

  refreshMe() {
    if (!S.me) return;
    const p = S.pnr[S.me.id];
    if (p && (p.nama !== S.me.nama || p.peran !== S.me.peran)) {
      S.me = { id: S.me.id, nama: p.nama, peran: p.peran };
      LS.set('session', { token: S.token, exp: S.exp, me: S.me });
    }
  },

  /* ---------- Gabungkan perubahan dari server ---------- */
  async applyChanges(ch) {
    if (!ch) return false;
    const put = { ps: [], kg: [], kgDel: [], pr: [] };
    let cfgCh = false, pnrCh = false, dkCh = false, agCh = false;
    (ch.ps || []).forEach((p) => {
      const cur = S.peserta.get(p.id);
      if (cur && S.outbox.has('ps:' + p.id) && (cur.t || 0) > (p.t || 0)) return;
      if (cur && cur.s === p.s && cur.t === p.t) return;
      S.peserta.set(p.id, p); put.ps.push(p);
    });
    (ch.kg || []).forEach((k) => {
      const cur = S.kegiatan.get(k.id);
      if (k.del) { if (cur) { S.kegiatan.delete(k.id); put.kgDel.push(k.id); } return; }
      const m = mergeKg(cur, k);
      if (cur && JSON.stringify(cur) === JSON.stringify(m)) return;
      S.kegiatan.set(k.id, m); put.kg.push(m);
    });
    (ch.pr || []).forEach((x) => {
      const kid = x[0], pid = x[1], h = x[2], t = x[3], by = x[4], dk = x[5] || '';
      const mp = prMap(kid), cur = mp.get(pid);
      if (cur && (cur.t > t || (cur.t === t && cur.h === h && (cur.dk || '') === dk))) return;
      const r = prVal({ h, t, by, dk }); mp.set(pid, r); put.pr.push(prRec(kid, pid, r));
    });
    (ch.dk || []).forEach((d) => {
      const cur = S.dk.get(d.id);
      if (S.outbox.has('dk:' + d.id) || S.outbox.has('dkd:' + d.id)) return;
      if (d.del) { if (cur) { S.dk.delete(d.id); dkCh = true; } return; }
      if (cur && cur.nama === d.nama && cur.urut === d.urut && cur.t === d.t) return;
      S.dk.set(d.id, d); dkCh = true;
    });
    (ch.ag || []).forEach((a) => {
      const cur = S.ag.get(a.pid);
      if (S.outbox.has('ag:' + a.pid) && cur && (cur.t || 0) > (a.t || 0)) return;
      if (!a.dk) { if (cur) { S.ag.delete(a.pid); agCh = true; } return; }
      if (cur && cur.dk === a.dk && cur.t === a.t) return;
      S.ag.set(a.pid, a); agCh = true;
    });
    if (ch.cfg) Object.keys(ch.cfg).forEach((k) => {
      if (S.outbox.has('cfg:' + k)) return;
      if (S.cfg[k] !== ch.cfg[k]) { S.cfg[k] = ch.cfg[k]; cfgCh = true; }
    });
    if (ch.pnr) {
      const nm = pnrMap(ch.pnr);
      if (JSON.stringify(nm) !== JSON.stringify(S.pnr)) { S.pnr = nm; pnrCh = true; this.refreshMe(); }
    }
    if (!put.ps.length && !put.kg.length && !put.kgDel.length && !put.pr.length && !cfgCh && !pnrCh && !dkCh && !agCh) return false;
    S.ver++;
    await DB.batch(['kv', 'peserta', 'kegiatan', 'presensi'], (tx) => {
      put.ps.forEach((p) => tx.put('peserta', p));
      put.kg.forEach((k) => tx.put('kegiatan', k));
      put.kgDel.forEach((id) => tx.del('kegiatan', id));
      put.pr.forEach((r) => tx.put('presensi', r));
      if (cfgCh) tx.put('kv', S.cfg, 'cfg');
      if (pnrCh) tx.put('kv', S.pnr, 'pnr');
      if (dkCh) tx.put('kv', [...S.dk.values()], 'dk');
      if (agCh) tx.put('kv', [...S.ag.values()], 'ag');
    });
    Bus.emit('data', { remote: true, pr: put.pr.length, kg: put.kg.length, cfg: cfgCh });
    return true;
  },

  /* ---------- Perubahan lokal (optimistis + antrian) ---------- */
  nextSeq() { S.seq = Math.max(S.seq + 1, Date.now()); return S.seq; },
  makeOp(type, key, d) { return { key, id: uid(), type, d, t: Date.now(), by: S.me ? S.me.id : '', seq: this.nextSeq() }; },

  async mutate(type, key, d, opt) {
    return this.mutateMany([[type, key, d]], opt);
  },
  async mutateMany(list, opt) {
    opt = opt || {};
    const ops = list.map((x) => this.makeOp(x[0], x[1], x[2]));
    ops.forEach((op) => { applyOpLocal(op); S.outbox.set(op.key, op); });
    S.ver++; S.obVer++;
    Bus.emit('data', { local: true });
    Bus.emit('outbox');
    await DB.batch(['outbox', 'presensi', 'peserta', 'kegiatan', 'kv'], (tx) => {
      ops.forEach((op) => { tx.put('outbox', op); persistEntity(tx, op); });
      tx.put('kv', S.seq, 'seq');
    });
    Sync.schedule(opt.delay === undefined ? 900 : opt.delay);
    return ops;
  },

  setPresensi(kid, pid, h) { return this.mutate('presensi.set', 'pr:' + kid + ':' + pid, { kid, pid, h: h ? 1 : 0, t: Date.now() }, { delay: 1500 }); },

  savePeserta(p) {
    const now = Date.now(), cur = p.id ? S.peserta.get(p.id) : null;
    const id = p.id || uid();
    return this.mutate('peserta.upsert', 'ps:' + id, { id, nama: p.nama.trim(), jk: p.jk, lahir: p.lahir || '', dibuat: cur ? cur.dibuat : Fmt.ymd(), t: now })
      .then(() => id);
  },
  importPeserta(list) {
    const now = Date.now(), today = Fmt.ymd();
    return this.mutateMany(list.map((p, i) => {
      const id = uid() + i.toString(36);
      return ['peserta.upsert', 'ps:' + id, { id, nama: p.nama, jk: p.jk, lahir: p.lahir || '', dibuat: today, t: now }];
    }));
  },
  deletePeserta(id) { return this.mutate('peserta.delete', 'ps:' + id, { id, t: Date.now() }); },

  saveKegiatan(k) {
    const id = k.id || uid();
    const cur = k.id ? S.kegiatan.get(k.id) : null;
    const jenis = cur ? (cur.jenis || 'SAMBUNG') : (k.jenis === MUSY ? MUSY : 'SAMBUNG');
    return this.mutate('kegiatan.upsert', 'kg:' + id, { id, jenis, tingkat: k.tingkat, judul: k.judul.trim(), tanggal: k.tanggal, jam: k.jam, tempat: k.tempat.trim(), t: Date.now() })
      .then(() => id);
  },
  setNotulen(id, text) { return this.mutate('kegiatan.notulen', 'kgn:' + id, { id, text, t: Date.now() }, { delay: 2500 }); },

  /* ---------- Dapukan & anggota musyawaroh (Penerobos Utama) ---------- */
  saveDapukan(d) {
    const id = d.id || uid();
    const urut = d.urut !== undefined ? d.urut : (Math.max(0, ...[...S.dk.values()].map((x) => x.urut || 0)) + 1);
    return this.mutate('dapukan.upsert', 'dk:' + id, { id, nama: d.nama.trim(), urut, t: Date.now() }).then(() => id);
  },
  reorderDapukan(ids) {
    const now = Date.now();
    return this.mutateMany(ids.map((id, i) => { const d = S.dk.get(id); return ['dapukan.upsert', 'dk:' + id, { id, nama: d.nama, urut: i + 1, t: now }]; }));
  },
  deleteDapukan(id) { return this.mutate('dapukan.delete', 'dkd:' + id, { id, t: Date.now() }); },
  setAnggota(list) {          // list: [[pid, dkId|'']]
    const now = Date.now();
    return this.mutateMany(list.map((x) => ['anggota.set', 'ag:' + x[0], { pid: x[0], dk: x[1] || '', t: now }]));
  },
  dapukanList() { return memo('dkList', () => [...S.dk.values()].sort((a, b) => (a.urut || 0) - (b.urut || 0) || collator.compare(a.nama, b.nama))); },
  dapukanOf(pid) { const a = S.ag.get(pid); const d = a && S.dk.get(a.dk); return d || null; },
  anggotaAll() {
    return memo('agAll', () => {
      const order = new Map(this.dapukanList().map((d, i) => [d.id, i]));
      return [...S.ag.values()].map((a) => ({ p: S.peserta.get(a.pid), d: S.dk.get(a.dk) }))
        .filter((x) => x.p && x.d && x.p.status !== 'DIHAPUS')
        .sort((a, b) => order.get(a.d.id) - order.get(b.d.id) || byNama(a.p, b.p));
    });
  },
  finishKegiatan(id) {
    const kg = S.kegiatan.get(id);
    if (!kg) return Promise.resolve();
    const jml = this.absenList(kg).length;
    return this.mutate('kegiatan.finish', 'kgf:' + id, { id, jml });
  },
  deleteKegiatan(id) { return this.mutate('kegiatan.delete', 'kgd:' + id, { id }); },
  setSetting(key, value) { return this.mutate('settings.set', 'cfg:' + key, { key, value }); },

  /* ---------- Antrian ---------- */
  pendingCount() { return S.outbox.size; },
  pendingKegiatan() {
    return memo('pendKg', () => {
      const s = new Set();
      S.outbox.forEach((op) => {
        if (op.type === 'presensi.set') s.add(op.d.kid);
        else if (op.type.indexOf('kegiatan.') === 0) s.add(op.d.id);
      });
      return s;
    }, 'ob');
  },
  /** Penanda kegiatan musyawaroh perlu tahu dapukan/anggota yang belum terkirim (agar snapshot benar). */
  pendingMusyMeta() { return [...S.outbox.values()].some((op) => /^(dapukan|anggota)\./.test(op.type)); },
  async removeOps(entries) {
    // entries: [[key, opId]] — hapus hanya bila op di antrian masih sama (tidak diganti op lebih baru)
    const del = [];
    entries.forEach(([key, id]) => { const cur = S.outbox.get(key); if (cur && cur.id === id) { S.outbox.delete(key); del.push(key); } });
    if (del.length) { S.obVer++; await DB.del('outbox', del); Bus.emit('outbox'); }
  },

  /* ---------- Data turunan ---------- */
  kegiatanAll() {
    return memo('kgAll', () => [...S.kegiatan.values()].filter((k) => !k.del)
      .sort((a, b) => (b.tanggal + (b.jam || '')).localeCompare(a.tanggal + (a.jam || ''))));
  },
  kegiatanSambung() { return memo('kgSb', () => this.kegiatanAll().filter((k) => !isMusy(k))); },
  kegiatanMusy() { return memo('kgMs', () => this.kegiatanAll().filter(isMusy)); },
  pesertaAll() { return memo('psAll', () => [...S.peserta.values()].sort(byNama)); },
  pesertaAktif() { return memo('psAktif', () => this.pesertaAll().filter((p) => p.status !== 'DIHAPUS')); },
  prLoaded(kg) { return !S.window || kg.tanggal >= S.window || kg.status === 'DRAFT' || S.presensi.has(kg.id); },

  /** Peserta yang tampil di daftar absen sebuah kegiatan.
   *  Musyawaroh: hanya anggota (yang punya dapukan) + siapa pun yang sudah tercatat hadir. */
  absenList(kg) {
    return memo('absen:' + kg.id, () => {
      const mp = S.presensi.get(kg.id);
      const hadir = (p) => mp && mp.has(p.id) && mp.get(p.id).h;
      if (isMusy(kg)) {
        const order = new Map(this.dapukanList().map((d, i) => [d.nama, i]));
        return this.pesertaAll().filter((p) => (S.ag.has(p.id) && this.dapukanOf(p.id) && p.status !== 'DIHAPUS') || hadir(p))
          .map((p) => Object.assign({}, p, { dkNama: this.dkLabel(kg.id, p.id) }))
          .sort((a, b) => {
            const oa = order.has(a.dkNama) ? order.get(a.dkNama) : 999, ob = order.has(b.dkNama) ? order.get(b.dkNama) : 999;
            return oa - ob || collator.compare(a.dkNama, b.dkNama) || byNama(a, b);
          });
      }
      return this.pesertaAll().filter((p) => p.status !== 'DIHAPUS' || (p.hapus && p.hapus > kg.tanggal) || hadir(p));
    });
  },
  /** Label dapukan seseorang di sebuah musyawaroh: catatan saat hadir → dapukan sekarang → "Lainnya". */
  dkLabel(kid, pid) {
    const r = S.presensi.get(kid) && S.presensi.get(kid).get(pid);
    if (r && r.h && r.dk) return r.dk;
    const d = this.dapukanOf(pid);
    return d ? d.nama : (r && r.dk) || 'Lainnya';
  },
  /** Musyawaroh: [{nama: dapukan, list: [nama]}] hadir / tidak hadir, urut dapukan. */
  musyGroups(kid, wantHadir) {
    const kg = S.kegiatan.get(kid), mp = S.presensi.get(kid), out = [];
    if (!kg) return out;
    let cur = null;
    this.absenList(kg).forEach((p) => {
      const on = !!(mp && mp.get(p.id) && mp.get(p.id).h);
      if (on !== wantHadir) return;
      if (!cur || cur.nama !== p.dkNama) { cur = { nama: p.dkNama, list: [] }; out.push(cur); }
      cur.list.push(p.nama);
    });
    return out;
  },

  stats(kid) {
    return memo('st:' + kid, () => {
      const kg = S.kegiatan.get(kid);
      if (!kg) return null;
      if (!this.prLoaded(kg)) {
        const tot = (kg.hl || 0) + (kg.hp || 0);
        return { L: kg.hl || 0, P: kg.hp || 0, total: tot, jml: kg.jml || tot, regL: null, regP: null, pct: Fmt.pctNum(tot, kg.jml || tot), partial: true };
      }
      const mp = S.presensi.get(kid);
      let L = 0, P = 0;
      if (mp) mp.forEach((r, pid) => { if (!r.h) return; const p = S.peserta.get(pid); if (p && p.jk === 'P') P++; else L++; });
      const list = this.absenList(kg);
      let regL = 0, regP = 0;
      list.forEach((p) => { if (p.jk === 'P') regP++; else regL++; });
      const jml = kg.status === 'SELESAI' && kg.jml > 0 ? kg.jml : list.length;
      return { L, P, total: L + P, jml, regL, regP, pct: Fmt.pctNum(L + P, jml) };
    });
  },

  hadirNames(kid) {
    const mp = S.presensi.get(kid), out = { L: [], P: [] };
    if (mp) mp.forEach((r, pid) => { if (!r.h) return; const p = S.peserta.get(pid); if (p) out[p.jk === 'P' ? 'P' : 'L'].push(p.nama); });
    out.L.sort(collator.compare); out.P.sort(collator.compare);
    return out;
  },
  absenNames(kid) {
    const kg = S.kegiatan.get(kid), mp = S.presensi.get(kid), out = { L: [], P: [] };
    if (!kg) return out;
    this.absenList(kg).forEach((p) => { const r = mp && mp.get(p.id); if (!r || !r.h) out[p.jk === 'P' ? 'P' : 'L'].push(p.nama); });
    return out;
  },

  /** Rekap kehadiran per peserta (untuk halaman Peserta & daftar "Sering Tidak Hadir"). */
  attendance(tingkat) {
    return memo('att:' + (tingkat || ''), () => {
      const today = Fmt.ymd();
      const N = Math.max(1, S.cfg.jumlah_kegiatan_evaluasi || 8);
      const kegs = this.kegiatanSambung().filter((k) => this.prLoaded(k) && (k.status === 'SELESAI' || k.tanggal < today) && (!tingkat || k.tingkat === tingkat));
      const res = new Map();
      this.pesertaAktif().forEach((p) => {
        let h = 0, n = 0, lh = 0, ln = 0;
        for (const k of kegs) {
          const r = S.presensi.get(k.id);
          const hadir = !!(r && r.get(p.id) && r.get(p.id).h);
          if (!hadir && k.tanggal < (p.dibuat || '')) continue;
          n++; if (hadir) h++;
          if (ln < N) { ln++; if (hadir) lh++; }
        }
        res.set(p.id, { h, n, pct: n ? (h / n) * 100 : null, lh, ln, lpct: ln ? (lh / ln) * 100 : null });
      });
      return res;
    });
  },

  async saveMeta() {
    await DB.batch(['kv'], (tx) => { tx.put('kv', S.since, 'since'); tx.put('kv', S.lastSyncAt, 'lastSyncAt'); });
  }
};

/* ---------- Terapkan operasi ke memori (dipakai untuk aksi baru & replay) ---------- */
function applyOpLocal(op) {
  const d = op.d || {};
  switch (op.type) {
    case 'presensi.set': {
      const kg = S.kegiatan.get(d.kid), cur = prMap(d.kid).get(d.pid);
      const r = { h: d.h, t: d.t, by: op.by };
      if (isMusy(kg)) { const dk = Store.dapukanOf(d.pid); if (dk) r.dk = dk.nama; else if (cur && cur.dk) r.dk = cur.dk; }
      prMap(d.kid).set(d.pid, r);
      break;
    }
    case 'kegiatan.notulen': {
      const cur = S.kegiatan.get(d.id);
      if (cur) S.kegiatan.set(d.id, Object.assign({}, cur, { notulen: d.text, nt: d.t, nby: op.by }));
      break;
    }
    case 'dapukan.upsert':
      S.dk.set(d.id, Object.assign({ del: false, s: 0 }, S.dk.get(d.id) || {}, { id: d.id, nama: d.nama, urut: d.urut, t: d.t }));
      break;
    case 'dapukan.delete':
      S.dk.delete(d.id);
      S.ag.forEach((a, pid) => { if (a.dk === d.id) S.ag.delete(pid); });
      break;
    case 'anggota.set':
      if (d.dk && S.dk.has(d.dk)) S.ag.set(d.pid, { pid: d.pid, dk: d.dk, t: d.t, s: 0 });
      else S.ag.delete(d.pid);
      break;
    case 'peserta.upsert': {
      const cur = S.peserta.get(d.id);
      S.peserta.set(d.id, Object.assign({ status: 'AKTIF', dibuat: d.dibuat || Fmt.ymd(), hapus: '', s: 0 }, cur || {},
        { id: d.id, nama: d.nama, jk: d.jk, lahir: d.lahir || '', t: d.t }));
      break;
    }
    case 'peserta.delete': {
      const cur = S.peserta.get(d.id);
      if (cur) S.peserta.set(d.id, Object.assign({}, cur, { status: 'DIHAPUS', hapus: Fmt.ymd(), t: d.t }));
      break;
    }
    case 'kegiatan.upsert': {
      const cur = S.kegiatan.get(d.id);
      S.kegiatan.set(d.id, Object.assign({ status: 'DRAFT', jml: 0, hl: 0, hp: 0, f1: '', f2: '', pdf: '', pdfStale: false, pdfAt: '', by: op.by, del: false, s: 0,
        jenis: d.jenis === MUSY ? MUSY : 'SAMBUNG', notulen: '', nt: 0, nby: '' },
        cur || {}, { id: d.id, tingkat: d.tingkat, judul: d.judul, tanggal: d.tanggal, jam: d.jam, tempat: d.tempat, t: d.t }));
      break;
    }
    case 'kegiatan.finish': {
      const cur = S.kegiatan.get(d.id);
      if (cur) S.kegiatan.set(d.id, Object.assign({}, cur, { status: 'SELESAI', jml: d.jml }));
      break;
    }
    case 'kegiatan.delete':
      S.kegiatan.delete(d.id);
      break;
    case 'settings.set':
      S.cfg[d.key] = d.value;
      break;
  }
}

function persistEntity(tx, op) {
  const d = op.d || {};
  if (op.type === 'presensi.set') tx.put('presensi', prRec(d.kid, d.pid, prMap(d.kid).get(d.pid)));
  else if (op.type.indexOf('peserta.') === 0) { const p = S.peserta.get(d.id); if (p) tx.put('peserta', p); }
  else if (op.type === 'kegiatan.delete') tx.del('kegiatan', d.id);
  else if (op.type.indexOf('kegiatan.') === 0) { const k = S.kegiatan.get(d.id); if (k) tx.put('kegiatan', k); }
  else if (op.type === 'settings.set') tx.put('kv', S.cfg, 'cfg');
  else if (/^(dapukan|anggota)\./.test(op.type)) { tx.put('kv', [...S.dk.values()], 'dk'); tx.put('kv', [...S.ag.values()], 'ag'); }
}

function mergeKg(cur, k) {
  const m = Object.assign({}, k);
  if (cur) {
    if (S.outbox.has('kg:' + k.id) && (cur.t || 0) > (k.t || 0)) ['tingkat', 'judul', 'tanggal', 'jam', 'tempat', 't'].forEach((f) => (m[f] = cur[f]));
    if (S.outbox.has('kgf:' + k.id) || cur.status === 'SELESAI') { m.status = 'SELESAI'; if (S.outbox.has('kgf:' + k.id)) m.jml = cur.jml; }
    if ((cur.nt || 0) > (k.nt || 0)) { m.notulen = cur.notulen; m.nt = cur.nt; m.nby = cur.nby; }
    if (!k.jenis && cur.jenis) m.jenis = cur.jenis;
  }
  return m;
}
