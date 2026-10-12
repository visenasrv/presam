/* =====================================================================
   Beranda — dashboard: ringkasan, grafik, peserta yang sering tidak hadir
   Semua dihitung dari data di HP → tetap tampil saat offline.
   ===================================================================== */
'use strict';

const ymOf = (d) => d.getFullYear() + '-' + p2(d.getMonth() + 1);
function ymAdd(ym, n) { const q = ym.split('-').map(Number); return ymOf(new Date(q[0], q[1] - 1 + n, 1)); }
function ymLabel(ym, withYear) { const q = ym.split('-').map(Number); return BULAN3[q[1] - 1] + (withYear ? ' ' + q[0] : ''); }
function ymRange(from, n) { const a = []; for (let i = 0; i < n; i++) a.push(ymAdd(from, i)); return a; }

/** Periode dashboard → daftar bulan (yyyy-mm), pembanding, label, dan bulan untuk grafik tren. */
function periodSel(f) {
  const cur = ymOf(new Date()), y = cur.slice(0, 4);
  if (f.period === 'tahun') {
    const mIdx = +cur.slice(5);                                  // Jan..bulan ini (minimal 2 titik)
    return { months: ymRange(y + '-01', 12), prev: ymRange((+y - 1) + '-01', 12), label: 'Tahun ini', vs: 'thn lalu',
             trend: mIdx >= 2 ? ymRange(y + '-01', mIdx) : ymRange(ymAdd(cur, -5), 6) };
  }
  if (f.period === 'pilih' && f.months && f.months.length) {
    const m = f.months.slice().sort(), n = m.length;
    const label = n === 1 ? ymLabel(m[0], true) : n <= 3 ? m.map((x) => ymLabel(x)).join(', ') : n + ' bulan';
    return { months: m, prev: ymRange(ymAdd(m[0], -n), n), label, vs: n === 1 ? 'bln sblm' : n + ' bln sblm',
             trend: n >= 2 ? m : ymRange(ymAdd(m[0], -5), 6) };
  }
  return { months: [cur], prev: [ymAdd(cur, -1)], label: 'Bulan ini', vs: 'bln lalu', trend: ymRange(ymAdd(cur, -5), 6) };
}
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

Pages.beranda = {
  nav: 'beranda',
  f: null,

  mount(el) {
    el.addEventListener('click', (e) => {
      const c = e.target.closest('[data-period]');
      if (c) {
        if (c.dataset.period === 'pilih') { this.monthPicker(); return; }
        this.f.period = c.dataset.period; LS.set('dashPeriod', this.f.period); this.render(el); return;
      }
      if (e.target.closest('[data-allabsent]')) this.allAbsent();
      if (e.target.closest('[data-dismiss]')) { Sync.justSent = 0; this.render(el); }
    });
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-tingkat]')) { this.f.tingkat = e.target.value; this.render(el); }
    });
  },
  show(el) { this.render(el); },
  onData(el) { this.render(el); },

  render(el) {
    if (!this.f) {
      this.f = { period: LS.get('dashPeriod', 'bulan'), months: LS.get('dashMonths', []), tingkat: '' };
      if (this.f.period === '3bulan' || (this.f.period === 'pilih' && !this.f.months.length)) this.f.period = 'bulan';
    }
    this.el = el;
    const f = this.f, today = Fmt.ymd();
    const all = Store.kegiatanAll();
    const kegs = all.filter((k) => !f.tingkat || k.tingkat === f.tingkat);
    const ps = Store.pesertaAktif();
    const nL = ps.filter((p) => p.jk === 'L').length, nP = ps.length - nL;
    const R = periodSel(f), mSet = new Set(R.months), pSet = new Set(R.prev);
    const inP = kegs.filter((k) => mSet.has(k.tanggal.slice(0, 7)));
    const prevP = kegs.filter((k) => pSet.has(k.tanggal.slice(0, 7)));
    const counted = (arr) => arr.filter((k) => k.status === 'SELESAI' || k.tanggal < today || (Store.stats(k.id) || {}).total > 0);
    const avg = mean(counted(inP).map((k) => Store.stats(k.id).pct));
    const prevAvg = mean(counted(prevP).map((k) => Store.stats(k.id).pct));
    const last = kegs.find((k) => k.tanggal <= today) || kegs[0];
    const lastSt = last ? Store.stats(last.id) : null;
    const me = S.me || { nama: '' };

    // Banner sinkron
    let banner = '';
    const pend = S.outbox.size + Uploads.pending;
    if (pend && navigator.onLine === false) banner = '<div class="banner warn" style="margin-bottom:16px">' + ic('cloud-off', 20) + '<div class="grow"><b>' + pend + ' perubahan tersimpan di HP.</b> Dikirim otomatis saat internet tersambung.</div></div>';
    else if (Sync.justSent && Date.now() - Sync.justSent < 8000 && !pend) banner = '<div class="banner ok" style="margin-bottom:16px">' + ic('circle-check', 20) + '<div class="grow">Data tersinkron otomatis ke Google Sheets</div><button class="btn-text" data-dismiss>OK</button></div>';

    const trend = avg !== null && prevAvg !== null ? Math.round(avg - prevAvg) : null;
    const trendHtml = trend === null ? '' : '<span class="stat-tag ' + (trend >= 0 ? 'ok' : 'err') + '">' + (trend >= 0 ? '↑' : '↓') + ' ' + Math.abs(trend) + '%</span>';

    // Grafik batang: 10 kegiatan terakhir dalam periode
    const bars = inP.slice(0, 10).reverse().map((k) => { const s = Store.stats(k.id); return { label: Fmt.dm(k.tanggal), a: s.L, b: s.P, title: k.judul }; });
    // Grafik garis: tren per bulan sesuai periode
    const months = R.trend.map((ym) => {
      const ks = counted(kegs.filter((k) => k.tanggal.slice(0, 7) === ym));
      const q = ym.split('-').map(Number);
      return { label: BULAN3[q[1] - 1], title: BULAN[q[1] - 1] + ' ' + q[0], v: mean(ks.map((k) => Store.stats(k.id).pct)), n: ks.length };
    });

    // Sering tidak hadir
    const amb = S.cfg.ambang_sering_tidak_hadir || 50, N = S.cfg.jumlah_kegiatan_evaluasi || 8;
    const att = Store.attendance(f.tingkat);
    const absent = ps.map((p) => ({ p, a: att.get(p.id) })).filter((x) => x.a && x.a.ln >= 2 && x.a.lpct < amb)
      .sort((a, b) => a.a.lpct - b.a.lpct || collator.compare(a.p.nama, b.p.nama));
    this.absent = absent;

    el.innerHTML =
      banner +
      '<div class="greet"><div><div class="hi">Selamat datang kembali,</div><div class="nm">Halo, ' + esc(me.nama) + '</div>' +
        (Store.isUtama() ? '<span class="badge-utama">' + ic('shield-check', 15) + 'Penerobos Utama</span>' : '<span class="pill outline">Penerobos</span>') + '</div></div>' +
      '<div class="chips" style="margin-bottom:16px">' +
        [['bulan', 'Bulan ini'], ['tahun', 'Tahun ini']].map((x) => '<button class="chip ' + (f.period === x[0] ? 'on' : '') + '" data-period="' + x[0] + '">' + x[1] + '</button>').join('') +
        '<button class="chip ' + (f.period === 'pilih' ? 'on' : '') + '" data-period="pilih">' + ic('calendar-range', 16) + esc(f.period === 'pilih' ? R.label : 'Pilih Bulan') + ic('chevron-down', 16) + '</button>' +
        '<label class="chip select end' + (f.tingkat ? ' on' : '') + '">' + esc(f.tingkat ? 'Sambung ' + f.tingkat : 'Tingkat') + ic('chevron-down', 16) +
          '<select data-tingkat aria-label="Saring tingkat"><option value="">Semua Tingkat</option>' + ['Kelompok', 'Desa', 'Daerah'].map((t) => '<option value="' + t + '"' + (f.tingkat === t ? ' selected' : '') + '>Sambung ' + t + '</option>').join('') + '</select></label>' +
      '</div>' +
      '<div class="stat-grid">' +
        '<div class="card stat"><div class="stat-top"><span class="stat-ic">' + ic('users', 20) + '</span><span class="stat-tag">Total</span></div>' +
          '<div class="stat-label">Peserta Aktif</div><div class="stat-value">' + ps.length + '</div><div class="stat-foot">L ' + nL + ' · P ' + nP + '</div></div>' +
        '<div class="card stat"><div class="stat-top"><span class="stat-ic">' + ic('calendar', 20) + '</span><span class="stat-tag ok">' + esc(R.label) + '</span></div>' +
          '<div class="stat-label">Kegiatan</div><div class="stat-value">' + inP.length + '</div><div class="stat-foot">' + (f.tingkat ? 'Sambung ' + esc(f.tingkat) : 'Semua tingkat') + '</div></div>' +
        '<div class="card stat"><div class="stat-top"><span class="stat-ic">' + ic('percent', 20) + '</span>' + trendHtml + '</div>' +
          '<div class="stat-label">Rata-rata Kehadiran</div><div class="stat-value">' + (avg === null ? '—' : Math.round(avg) + '%') + '</div>' +
          '<div class="stat-foot ' + (trend === null ? '' : trend >= 0 ? 'ok' : 'err') + '">' + (trend === null ? 'Belum ada pembanding' : (trend >= 0 ? '↑ ' : '↓ ') + Math.abs(trend) + '% vs ' + R.vs) + '</div></div>' +
        '<div class="card stat tap"' + (last ? ' data-go="#/detail/' + esc(last.id) + '"' : '') + '><div class="stat-top"><span class="stat-ic">' + ic('check-check', 20) + '</span>' + (last ? '<span class="stat-tag">' + Fmt.tag(last.tanggal) + '</span>' : '') + '</div>' +
          '<div class="stat-label">Kegiatan Terakhir</div>' +
          (lastSt ? '<div class="stat-value">' + lastSt.total + '<small>/' + lastSt.jml + '</small></div><div class="stat-foot ok">' + Fmt.pct(lastSt.total, lastSt.jml) + ' hadir</div>'
                  : '<div class="stat-value">—</div><div class="stat-foot">Belum ada kegiatan</div>') + '</div>' +
      '</div>' +
      '<div class="card chart-card" style="margin-top:12px"><div><h3 class="h2" style="font-size:16.5px">Hadir per Kegiatan</h3><div class="page-sub" style="font-size:13px;margin-top:2px">10 kegiatan terakhir · ' + esc(R.label.toLowerCase()) + '</div>' +
        '<div class="chart-legend"><span><i style="background:var(--chart-male)"></i>Laki-laki</span><span><i style="background:var(--chart-female)"></i>Perempuan</span></div></div>' +
        '<div class="chart" id="chBars"></div></div>' +
      '<div class="card chart-card"><div class="card-head"><div><h3>Tren Kehadiran per Bulan</h3><div class="sub">Rata-rata persentase · ' + (f.period === 'pilih' && R.months.length >= 2 ? 'bulan terpilih' : f.period === 'tahun' ? 'tahun ini' : '6 bulan terakhir') + '</div></div></div><div class="chart" id="chLine"></div></div>' +
      '<div class="card"><div class="card-head"><div><h3>Sering Tidak Hadir</h3><div class="sub">Kehadiran &lt; ' + amb + '% dari ' + N + ' kegiatan terakhir</div></div>' +
        (absent.length ? '<span class="pill err">' + absent.length + '</span>' : '') + '</div>' +
        (absent.length ? absent.slice(0, 5).map((x) => this.absRow(x)).join('') + (absent.length > 5 ? '<button class="more-btn" data-allabsent>Lihat semua (' + absent.length + ') →</button>' : '')
          : '<div class="empty" style="padding:22px 6px 8px">' + ic('badge-check', 34, 'pct-good') + '<p>' + (all.length ? 'Tidak ada peserta di bawah ambang kehadiran.' : 'Akan tampil setelah ada kegiatan.') + '</p></div>') +
      '</div>' +
      (all.length ? '' : '<div class="card" style="margin-top:12px">' + emptyState('clipboard', 'Belum ada kegiatan', 'Mulai presensi pertama Anda. Data bisa dicatat walau tanpa internet.', '<a class="btn btn-primary" href="#/kegiatan/baru">' + ic('plus', 20) + 'Buat Kegiatan</a>') + '</div>');

    Charts.bars($('#chBars', el), bars);
    Charts.line($('#chLine', el), months);
  },

  monthPicker() {
    const sel = new Set(this.f.period === 'pilih' ? this.f.months : []);
    const counts = {};
    Store.kegiatanAll().forEach((k) => { const m = k.tanggal.slice(0, 7); counts[m] = (counts[m] || 0) + 1; });
    let year = sel.size ? +[...sel].sort().pop().slice(0, 4) : new Date().getFullYear();
    const cur = ymOf(new Date());
    Sheet.open({
      title: 'Pilih Bulan',
      message: 'Pilih satu atau beberapa bulan untuk ringkasan dashboard.',
      html: '<div class="mp-head"><button class="icon-btn" data-y="-1" aria-label="Tahun sebelumnya">' + ic('arrow-left', 18) + '</button><b class="js-year"></b>' +
        '<button class="icon-btn" data-y="1" aria-label="Tahun berikutnya">' + ic('arrow-right', 18) + '</button></div><div class="mp-grid js-grid"></div>' +
        '<div class="btn-row" style="margin-top:16px"><button class="btn btn-ghost" data-clear>Kosongkan</button><button class="btn btn-primary grow" data-apply></button></div>',
      onMount: (el, s) => {
        const draw = () => {
          $('.js-year', el).textContent = year;
          let h = '';
          for (let m = 1; m <= 12; m++) {
            const ym = year + '-' + p2(m), n = counts[ym] || 0;
            h += '<button class="mp-m ' + (sel.has(ym) ? 'on' : '') + (ym === cur ? ' now' : '') + '" data-m="' + ym + '"' + (ym > cur ? ' disabled' : '') + '>' +
              '<b>' + BULAN3[m - 1] + '</b><small>' + (n ? n + ' kegiatan' : '—') + '</small></button>';
          }
          $('.js-grid', el).innerHTML = h;
          const b = $('[data-apply]', el);
          b.disabled = !sel.size;
          b.innerHTML = ic('check', 18) + (sel.size ? 'Terapkan (' + sel.size + ' bulan)' : 'Pilih bulan');
        };
        el.addEventListener('click', (e) => {
          const m = e.target.closest('[data-m]'), y = e.target.closest('[data-y]');
          if (m) { sel.has(m.dataset.m) ? sel.delete(m.dataset.m) : sel.add(m.dataset.m); haptic(6); draw(); }
          else if (y) { year += +y.dataset.y; draw(); }
          else if (e.target.closest('[data-clear]')) { sel.clear(); draw(); }
          else if (e.target.closest('[data-apply]')) {
            this.f.period = 'pilih'; this.f.months = [...sel].sort();
            LS.set('dashPeriod', 'pilih'); LS.set('dashMonths', this.f.months);
            s.close(); this.render(this.el);
          }
        });
        draw();
      }
    });
  },

  absRow(x) {
    const a = x.a;
    return '<div class="list-row"><span class="avatar sm ' + x.p.jk + '">' + esc(Fmt.initials(x.p.nama)) + '</span>' +
      '<div class="row-main"><div class="row-title ellipsis">' + esc(x.p.nama) + '</div>' +
      '<div style="margin-top:6px">' + UI.progress(a.lpct) + '</div></div>' +
      '<div class="row-end"><div class="pct-low" style="font-weight:700">' + a.lh + '/' + a.ln + '</div><div class="pct-cap">hadir</div></div></div>';
  },

  allAbsent() {
    Sheet.open({
      title: 'Sering Tidak Hadir',
      message: 'Kehadiran di bawah ' + (S.cfg.ambang_sering_tidak_hadir || 50) + '% dari ' + (S.cfg.jumlah_kegiatan_evaluasi || 8) + ' kegiatan terakhir.',
      html: '<div>' + this.absent.map((x) => this.absRow(x)).join('') + '</div>'
    });
  }
};
