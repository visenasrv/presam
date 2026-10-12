/* =====================================================================
   Beranda — dashboard: ringkasan, grafik, peserta yang sering tidak hadir
   Semua dihitung dari data di HP → tetap tampil saat offline.
   ===================================================================== */
'use strict';

function periodRange(p) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const ymd = (yy, mm, dd) => Fmt.ymd(new Date(yy, mm, dd));
  if (p === 'tahun') return { from: ymd(y, 0, 1), to: ymd(y, 11, 31), pFrom: ymd(y - 1, 0, 1), pTo: ymd(y - 1, 11, 31), label: 'Tahun ini', vs: 'thn lalu' };
  if (p === '3bulan') return { from: ymd(y, m - 2, 1), to: ymd(y, m + 1, 0), pFrom: ymd(y, m - 5, 1), pTo: ymd(y, m - 2, 0), label: '3 bulan', vs: '3 bln sblm' };
  return { from: ymd(y, m, 1), to: ymd(y, m + 1, 0), pFrom: ymd(y, m - 1, 1), pTo: ymd(y, m, 0), label: 'Bulan ini', vs: 'bln lalu' };
}
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

Pages.beranda = {
  nav: 'beranda',
  f: null,

  mount(el) {
    el.addEventListener('click', (e) => {
      const c = e.target.closest('[data-period]');
      if (c) { this.f.period = c.dataset.period; LS.set('dashPeriod', this.f.period); this.render(el); return; }
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
    if (!this.f) this.f = { period: LS.get('dashPeriod', 'bulan'), tingkat: '' };
    const f = this.f, today = Fmt.ymd();
    const all = Store.kegiatanAll();
    const kegs = all.filter((k) => !f.tingkat || k.tingkat === f.tingkat);
    const ps = Store.pesertaAktif();
    const nL = ps.filter((p) => p.jk === 'L').length, nP = ps.length - nL;
    const R = periodRange(f.period);
    const inP = kegs.filter((k) => k.tanggal >= R.from && k.tanggal <= R.to);
    const prevP = kegs.filter((k) => k.tanggal >= R.pFrom && k.tanggal <= R.pTo);
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
    // Grafik garis: 6 bulan terakhir
    const months = [];
    const d0 = new Date(); d0.setDate(1);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(d0.getFullYear(), d0.getMonth() - i, 1);
      const ym = d.getFullYear() + '-' + p2(d.getMonth() + 1);
      const ks = counted(kegs.filter((k) => k.tanggal.slice(0, 7) === ym));
      months.push({ label: BULAN3[d.getMonth()], title: BULAN[d.getMonth()] + ' ' + d.getFullYear(), v: mean(ks.map((k) => Store.stats(k.id).pct)), n: ks.length });
    }

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
        [['bulan', 'Bulan ini'], ['3bulan', '3 Bulan'], ['tahun', 'Tahun ini']].map((x) => '<button class="chip ' + (f.period === x[0] ? 'on' : '') + '" data-period="' + x[0] + '">' + x[1] + '</button>').join('') +
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
      '<div class="card chart-card"><div class="card-head"><div><h3>Tren Kehadiran per Bulan</h3><div class="sub">Rata-rata persentase · 6 bulan terakhir</div></div></div><div class="chart" id="chLine"></div></div>' +
      '<div class="card"><div class="card-head"><div><h3>Sering Tidak Hadir</h3><div class="sub">Kehadiran &lt; ' + amb + '% dari ' + N + ' kegiatan terakhir</div></div>' +
        (absent.length ? '<span class="pill err">' + absent.length + '</span>' : '') + '</div>' +
        (absent.length ? absent.slice(0, 5).map((x) => this.absRow(x)).join('') + (absent.length > 5 ? '<button class="more-btn" data-allabsent>Lihat semua (' + absent.length + ') →</button>' : '')
          : '<div class="empty" style="padding:22px 6px 8px">' + ic('badge-check', 34, 'pct-good') + '<p>' + (all.length ? 'Tidak ada peserta di bawah ambang kehadiran.' : 'Akan tampil setelah ada kegiatan.') + '</p></div>') +
      '</div>' +
      (all.length ? '' : '<div class="card" style="margin-top:12px">' + emptyState('clipboard', 'Belum ada kegiatan', 'Mulai presensi pertama Anda. Data bisa dicatat walau tanpa internet.', '<a class="btn btn-primary" href="#/kegiatan/baru">' + ic('plus', 20) + 'Buat Kegiatan</a>') + '</div>');

    Charts.bars($('#chBars', el), bars);
    Charts.line($('#chLine', el), months);
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
