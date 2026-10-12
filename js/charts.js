/* =====================================================================
   charts.js — grafik SVG ringan (tanpa pustaka): batang bertumpuk & garis
   ===================================================================== */
'use strict';

const Charts = {
  W: 320,

  /** items: [{label, a (L), b (P), title}] */
  bars(el, items) {
    if (!items.length) { el.innerHTML = '<div class="chart-empty">Belum ada data kegiatan</div>'; return; }
    const W = this.W, H = 168, padL = 26, padB = 22, padT = 14;
    const max = Math.max(1, ...items.map((x) => x.a + x.b));
    const nice = niceMax(max);
    const cw = (W - padL - 4) / items.length, bw = Math.min(22, cw * 0.56);
    const y = (v) => padT + (H - padT - padB) * (1 - v / nice);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Grafik hadir per kegiatan">';
    [0, 0.5, 1].forEach((f) => {
      const v = Math.round(nice * f), yy = y(v);
      s += '<line class="grid" x1="' + padL + '" x2="' + W + '" y1="' + yy + '" y2="' + yy + '" ' + (f ? 'stroke-dasharray="3 4"' : '') + '/>';
      s += '<text x="' + (padL - 6) + '" y="' + (yy + 3) + '" text-anchor="end">' + v + '</text>';
    });
    items.forEach((it, i) => {
      const cx = padL + cw * i + cw / 2, x = cx - bw / 2;
      const ya = y(it.a), yb = y(it.a + it.b), y0 = y(0);
      const r = Math.min(5, bw / 2);
      if (it.a > 0) s += '<rect x="' + x + '" y="' + ya + '" width="' + bw + '" height="' + Math.max(0, y0 - ya) + '" style="fill:var(--chart-male)"/>';
      if (it.b > 0) s += '<path d="' + roundTop(x, yb, bw, ya - yb, r) + '" style="fill:var(--chart-female)"/>';
      else if (it.a > 0) s += '<path d="' + roundTop(x, ya, bw, Math.min(r, y0 - ya), r) + '" style="fill:var(--chart-male)"/>';
      const last = i === items.length - 1;
      if (last && it.a + it.b > 0) s += '<circle cx="' + cx + '" cy="' + (yb - 7) + '" r="3" style="fill:var(--chart-male)"/>';
      s += '<text x="' + cx + '" y="' + (H - 6) + '" text-anchor="middle"' + (last ? ' style="font-weight:700;fill:var(--text)"' : '') + '>' + esc(it.label) + '</text>';
      s += '<rect class="bar-hit" data-i="' + i + '" x="' + (padL + cw * i) + '" y="0" width="' + cw + '" height="' + H + '"/>';
    });
    s += '</svg><div class="chart-tip" hidden></div>';
    el.innerHTML = s;
    this.tips(el, (i) => {
      const it = items[i];
      return { html: esc(it.title) + ' · ' + (it.a + it.b) + ' hadir (L ' + it.a + ' · P ' + it.b + ')', x: (padL + cw * i + cw / 2) / W, y: y(it.a + it.b) / H };
    });
  },

  /** points: [{label, v (0–100) | null}] */
  line(el, points) {
    const pts = points.filter((p) => p.v !== null);
    if (!pts.length) { el.innerHTML = '<div class="chart-empty">Belum ada data kehadiran</div>'; return; }
    const W = this.W, H = 150, padL = 30, padB = 22, padT = 18, padR = 14;
    const cw = (W - padL - padR) / Math.max(1, points.length - 1);
    const x = (i) => padL + (points.length === 1 ? (W - padL - padR) / 2 : cw * i);
    const y = (v) => padT + (H - padT - padB) * (1 - v / 100);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Grafik tren kehadiran per bulan">';
    s += '<defs><linearGradient id="lgArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:var(--chart-line);stop-opacity:.22"/><stop offset="1" style="stop-color:var(--chart-line);stop-opacity:0"/></linearGradient></defs>';
    [0, 50, 100].forEach((v) => {
      s += '<line class="grid" x1="' + padL + '" x2="' + (W - padR + 4) + '" y1="' + y(v) + '" y2="' + y(v) + '" ' + (v ? 'stroke-dasharray="3 4"' : '') + '/>';
      s += '<text x="' + (padL - 6) + '" y="' + (y(v) + 3) + '" text-anchor="end">' + v + '%</text>';
    });
    const xy = [];
    points.forEach((p, i) => { if (p.v !== null) xy.push([x(i), y(p.v), i]); });
    const d = smoothPath(xy);
    if (xy.length > 1) s += '<path d="' + d + ' L' + xy[xy.length - 1][0] + ' ' + y(0) + ' L' + xy[0][0] + ' ' + y(0) + ' Z" fill="url(#lgArea)"/>';
    s += '<path d="' + d + '" fill="none" style="stroke:var(--chart-line)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    xy.forEach((q, k) => {
      const last = k === xy.length - 1;
      s += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + (last ? 5 : 3.5) + '" style="fill:var(--surface);stroke:var(--chart-line)" stroke-width="2.5"/>';
      if (last) s += '<text x="' + Math.min(q[0], W - 18) + '" y="' + (q[1] - 11) + '" text-anchor="middle" style="font-weight:800;font-size:11px;fill:var(--text)">' + Fmt.pctVal(points[q[2]].v).replace(/,\d%$/, '%') + '</text>';
    });
    points.forEach((p, i) => {
      s += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle"' + (i === points.length - 1 ? ' style="font-weight:700;fill:var(--text)"' : '') + '>' + esc(p.label) + '</text>';
      s += '<rect class="bar-hit" data-i="' + i + '" x="' + (x(i) - cw / 2) + '" y="0" width="' + cw + '" height="' + H + '"/>';
    });
    s += '</svg><div class="chart-tip" hidden></div>';
    el.innerHTML = s;
    this.tips(el, (i) => {
      const p = points[i];
      return { html: esc(p.title || p.label) + ' · ' + (p.v === null ? 'tidak ada kegiatan' : Fmt.pctVal(p.v) + ' (' + p.n + ' kegiatan)'), x: x(i) / W, y: (p.v === null ? y(0) : y(p.v)) / H };
    });
  },

  tips(el, get) {
    const tip = el.querySelector('.chart-tip');
    let hideT;
    el.onclick = (e) => {
      const hit = e.target.closest('.bar-hit');
      if (!hit) { tip.hidden = true; return; }
      const t = get(+hit.dataset.i), svg = el.querySelector('svg').getBoundingClientRect();
      tip.innerHTML = t.html; tip.hidden = false;
      tip.style.left = Math.max(70, Math.min(svg.width - 70, t.x * svg.width)) + 'px';
      tip.style.top = (t.y * svg.height) + 'px';
      clearTimeout(hideT); hideT = setTimeout(() => (tip.hidden = true), 2600);
    };
  }
};

function niceMax(v) {
  if (v <= 5) return 5;
  const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
function roundTop(x, y, w, h, r) {
  h = Math.max(0, h); r = Math.min(r, h, w / 2);
  return 'M' + x + ' ' + (y + h) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + h) + 'Z';
}
function smoothPath(p) {
  if (!p.length) return '';
  if (p.length === 1) return 'M' + p[0][0] + ' ' + p[0][1];
  let d = 'M' + p[0][0] + ' ' + p[0][1];
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + p2[0] + ' ' + p2[1];
  }
  return d;
}
