/* =====================================================================
   util.js — format tanggal/angka Indonesia, helper DOM, toast, bottom sheet
   ===================================================================== */
'use strict';

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ESC_MAP[c]);

const HARI = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI3 = ['Ahad', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const p2 = (n) => String(n).padStart(2, '0');

const Fmt = {
  ymd(d) { d = d || new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); },
  hm(d) { d = d || new Date(); return p2(d.getHours()) + ':' + p2(d.getMinutes()); },
  parse(ymd) { const p = String(ymd || '').split('-').map(Number); return new Date(p[0] || 1970, (p[1] || 1) - 1, p[2] || 1); },
  addDays(ymd, n) { const d = Fmt.parse(ymd); d.setDate(d.getDate() + n); return Fmt.ymd(d); },
  long(ymd) { if (!ymd) return ''; const d = Fmt.parse(ymd); return HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear(); },
  short(ymd) { if (!ymd) return ''; const d = Fmt.parse(ymd); return HARI3[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN3[d.getMonth()]; },
  shortY(ymd) { if (!ymd) return ''; const d = Fmt.parse(ymd); return HARI3[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN3[d.getMonth()] + ' ' + d.getFullYear(); },
  dMon(ymd) { if (!ymd) return '—'; const d = Fmt.parse(ymd); return d.getDate() + ' ' + BULAN3[d.getMonth()] + ' ' + d.getFullYear(); },
  dm(ymd) { const d = Fmt.parse(ymd); return p2(d.getDate()) + '/' + p2(d.getMonth() + 1); },
  dmy(ymd) { if (!ymd) return '—'; const d = Fmt.parse(ymd); return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear(); },
  tag(ymd) { const d = Fmt.parse(ymd); return d.getDate() + ' ' + BULAN3[d.getMonth()].toUpperCase(); },
  monthYear(ymd) { const d = Fmt.parse(ymd); return BULAN[d.getMonth()] + ' ' + d.getFullYear(); },
  mon(ym) { const p = ym.split('-').map(Number); return BULAN3[p[1] - 1]; },
  time(ms) { return ms ? Fmt.hm(new Date(ms)) : ''; },
  pctNum(a, b) { return b ? (a / b) * 100 : 0; },
  pct(a, b) { return Fmt.pctVal(Fmt.pctNum(a, b)); },
  pctVal(v) { const r = Math.round(v * 10) / 10; return String(r).replace('.', ',') + '%'; },
  kb(bytes) { return Math.round(bytes / 1024) + ' KB'; },
  ago(ms) {
    if (!ms) return 'belum pernah';
    const s = Math.round((Date.now() - ms) / 1000);
    if (s < 45) return 'baru saja';
    if (s < 3600) return Math.round(s / 60) + ' menit lalu';
    if (s < 86400) return Fmt.time(ms);
    return Fmt.dMon(Fmt.ymd(new Date(ms))) + ' ' + Fmt.time(ms);
  },
  initials(n) {
    const w = String(n || '').trim().split(/\s+/).filter(Boolean);
    return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : (w[0] || '')[1] || '')).toUpperCase();
  },
  pctClass(v) { return v >= 75 ? 'pct-good' : v >= 50 ? 'pct-mid' : 'pct-low'; }
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function debounce(fn, ms) { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms); }; }
function haptic(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {} }
function norm(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
const collator = new Intl.Collator('id', { sensitivity: 'base', numeric: true });
const byNama = (a, b) => collator.compare(a.nama, b.nama);

/** localStorage per kelompok (awalan TENANT_NS) + getG/setG untuk setelan perangkat (tema terang/gelap). */
const LS = {
  p() { return 'ps:' + (window.TENANT_NS || ''); },
  get(k, d) { try { const v = localStorage.getItem(this.p() + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(this.p() + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(this.p() + k); } catch (e) {} },
  getG(k, d) { try { const v = localStorage.getItem('ps:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  setG(k, v) { try { localStorage.setItem('ps:' + k, JSON.stringify(v)); } catch (e) {} }
};

/** Bus peristiwa sederhana: 'data', 'sync', 'route' */
const Bus = {
  m: {},
  on(e, f) { (this.m[e] = this.m[e] || []).push(f); },
  emit(e, x) { (this.m[e] || []).forEach((f) => { try { f(x); } catch (err) { console.error(err); } }); }
};

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e2) {}
    ta.remove(); return ok;
  }
}
function b64ToBlob(b64, mime) {
  const bin = atob(b64), n = bin.length, u = new Uint8Array(n);
  for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], { type: mime || 'application/octet-stream' });
}
function blobToDataURL(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
}
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector('script[data-src="' + src + '"]')) return res();
    const s = document.createElement('script'); s.src = src; s.dataset.src = src; s.onload = res; s.onerror = () => rej(new Error('Gagal memuat ' + src));
    document.head.appendChild(s);
  });
}

/* ---------- Toast ---------- */
const Toast = {
  box: null,
  show(msg, type, opt) {
    opt = opt || {};
    if (!this.box) { this.box = document.createElement('div'); this.box.className = 'toasts'; this.box.setAttribute('aria-live', 'polite'); document.body.appendChild(this.box); }
    this.box.classList.toggle('high', !!document.querySelector('.action-bar:not([hidden])'));
    const icons = { ok: 'circle-check', err: 'circle-alert', warn: 'triangle-alert', info: 'info' };
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'ok');
    el.innerHTML = ic(icons[type || 'ok'] || 'circle-check', 20) + '<span>' + esc(msg) + '</span>' + (opt.action ? '<button class="t-btn">' + esc(opt.action) + '</button>' : '');
    if (opt.action) el.querySelector('.t-btn').onclick = () => { opt.onAction && opt.onAction(); close(); };
    while (this.box.children.length > 2) this.box.firstChild.remove();
    this.box.appendChild(el);
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 170); };
    setTimeout(close, opt.ms || 3000);
  }
};

/* ---------- Bottom sheet & dialog ---------- */
const Sheet = {
  stack: [],
  open(opt) {
    const back = document.createElement('div'); back.className = 'sheet-backdrop';
    const el = document.createElement('div'); el.className = 'sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="grab"></div>' + (opt.title ? '<h3>' + esc(opt.title) + '</h3>' : '') + (opt.message ? '<p class="sheet-msg">' + esc(opt.message) + '</p>' : '') + (opt.html || '');
    document.body.append(back, el);
    const api = {
      el, closed: false,
      close(v) {
        if (api.closed) return; api.closed = true;
        el.classList.add('closing'); back.classList.add('closing');
        setTimeout(() => { el.remove(); back.remove(); }, 180);
        Sheet.stack = Sheet.stack.filter((s) => s !== api);
        opt.onClose && opt.onClose(v);
      }
    };
    back.onclick = () => api.close();
    this.stack.push(api);
    opt.onMount && opt.onMount(el, api);
    const f = el.querySelector('[autofocus]'); if (f) setTimeout(() => f.focus(), 250);
    return api;
  },
  closeAll() { this.stack.slice().forEach((s) => s.close()); },
  confirm(o) {
    return new Promise((resolve) => {
      let val = false;
      Sheet.open({
        title: o.title, message: o.message,
        html: '<div class="btn-row"><button class="btn btn-ghost" data-x>' + esc(o.cancel || 'Batal') + '</button>' +
              '<button class="btn ' + (o.danger ? 'btn-danger solid' : 'btn-primary') + '" data-ok>' + esc(o.ok || 'Ya') + '</button></div>',
        onMount(el, api) { el.querySelector('[data-x]').onclick = () => api.close(); el.querySelector('[data-ok]').onclick = () => { val = true; api.close(); }; },
        onClose() { resolve(val); }
      });
    });
  },
  menu(o) {
    Sheet.open({
      title: o.title,
      html: o.items.map((it, i) => '<button class="sheet-option ' + (it.danger ? 'danger' : '') + '" data-i="' + i + '"><span class="s-ic">' + ic(it.icon, 20) + '</span><span>' + esc(it.label) + '</span></button>').join(''),
      onMount(el, api) { $$('[data-i]', el).forEach((b) => (b.onclick = () => { api.close(); o.items[+b.dataset.i].onClick(); })); }
    });
  }
};

/* Ilustrasi garis sederhana untuk empty state */
const ART = {
  clipboard: '<svg width="96" height="96" viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="22" y="16" width="52" height="66" rx="8" fill="var(--primary-tint)"/><rect x="36" y="10" width="24" height="12" rx="4" fill="var(--surface)"/><path d="M34 44l8 8 16-16"/><path d="M34 66h28" opacity=".5"/></svg>',
  people: '<svg width="96" height="96" viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="48" cy="48" r="38" fill="var(--primary-tint)" stroke="none"/><circle cx="38" cy="38" r="9"/><path d="M22 66c2-9 9-14 16-14s14 5 16 14"/><circle cx="62" cy="42" r="7"/><path d="M58 54c7 0 13 4 15 12"/></svg>',
  history: '<svg width="96" height="96" viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="48" cy="48" r="38" fill="var(--primary-tint)" stroke="none"/><circle cx="48" cy="48" r="22"/><path d="M48 36v13l8 5"/></svg>',
  search: '<svg width="80" height="80" viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="48" cy="48" r="38" fill="var(--primary-tint)" stroke="none"/><circle cx="44" cy="44" r="14"/><path d="M54 54l12 12"/></svg>'
};
function emptyState(art, title, text, btn) {
  return '<div class="empty"><div class="art">' + (ART[art] || '') + '</div><h3>' + esc(title) + '</h3>' + (text ? '<p>' + esc(text) + '</p>' : '') + (btn || '') + '</div>';
}
