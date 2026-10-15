// Exam-style figures for Writing Task 1. renderChart(spec) returns an HTML string (inline SVG or table); no DOM needed.
const PAL = ['#2f5d8a', '#e08a2e', '#5f8f6b', '#9a4f6b', '#8c8c8c', '#c9b037'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = v => +Number(v).toFixed(1);
let uid = 0;

// "nice" axis: five or so ticks ending on a round number at or above max
function axis(max) {
  const raw = max / 5, mag = 10 ** Math.floor(Math.log10(raw)), f = raw / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  return { step, top: Math.ceil(max / step) * step };
}
const head = c => c.title ? `<p class="ct">${esc(c.title)}${c.unit && c.unit !== '%' ? ` <span class="muted">(${esc(c.unit)})</span>` : ''}</p>` : '';
const foot = c => c.source ? `<p class="src">Source: ${esc(c.source)}</p>` : '';
const legend = names => `<div class="legend">${names.map((n, i) => `<span class="lg"><i style="background:${PAL[i % PAL.length]}"></i>${esc(n)}</span>`).join('')}</div>`;

function bar(c) {
  const h = c.orientation === 'horizontal', stacked = !!c.stacked, n = c.labels.length, K = stacked ? 1 : c.series.length;
  const W = 640, H = h ? 60 + n * (stacked ? 44 : 30 * c.series.length) : 320;
  const P = h ? { L: 118, R: 28, T: 12, B: 40 } : { L: 58, R: 14, T: 14, B: 46 };
  const iw = W - P.L - P.R, ih = H - P.T - P.B;
  const totals = c.labels.map((_, i) => c.series.reduce((s, x) => s + x.values[i], 0));
  const { top, step } = axis(stacked ? Math.max(...totals) : Math.max(...c.series.flatMap(s => s.values)));
  const vpos = v => h ? P.L + iw * v / top : P.T + ih * (1 - v / top);
  const band = (h ? ih : iw) / n;
  let g = '';
  for (let t = 0; t <= top + 1e-9; t += step)
    g += h ? `<line x1="${vpos(t)}" x2="${vpos(t)}" y1="${P.T}" y2="${H - P.B}" stroke="#dcdcdc"/><text class="tick" x="${vpos(t)}" y="${H - P.B + 16}" text-anchor="middle">${fmt(t)}</text>`
           : `<line x1="${P.L}" x2="${W - P.R}" y1="${vpos(t)}" y2="${vpos(t)}" stroke="#dcdcdc"/><text class="tick" x="${P.L - 6}" y="${vpos(t) + 4}" text-anchor="end">${fmt(t)}</text>`;
  c.labels.forEach((l, i) => g += h ? `<text x="${P.L - 8}" y="${P.T + band * (i + .5) + 4}" text-anchor="end">${esc(l)}</text>`
                                    : `<text x="${P.L + band * (i + .5)}" y="${H - P.B + 18}" text-anchor="middle">${esc(l)}</text>`);
  const unit = c.yLabel ?? (c.unit && c.unit !== '%' ? c.unit : c.unit === '%' ? 'Percentage' : '');
  g += h ? `<text x="${P.L + iw / 2}" y="${H - 4}" text-anchor="middle" font-weight="700">${esc(unit)}</text>`
         : `<text transform="translate(14 ${P.T + ih / 2}) rotate(-90)" text-anchor="middle" font-weight="700">${esc(unit)}</text>`;
  c.series.forEach((s, k) => s.values.forEach((v, i) => {
    const v0 = stacked ? c.series.slice(0, k).reduce((a, x) => a + x.values[i], 0) : 0, v1 = v0 + v;
    const bw = band * (stacked ? .52 : .74) / K, off = band * (stacked ? .24 : .13) + (stacked ? 0 : bw * k);
    const r = h ? { x: vpos(v0), y: P.T + band * i + off, w: vpos(v1) - vpos(v0), h: bw - 2 } : { x: P.L + band * i + off, y: vpos(v1), w: bw - 2, h: vpos(v0) - vpos(v1) };
    g += `<rect class="bar" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${PAL[k % PAL.length]}"/>`;
    const lab = fmt(v) + (c.unit === '%' ? '%' : '');
    if (stacked) { if ((h ? r.w : r.h) > 22) g += `<text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + 4}" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">${lab}</text>`; }
    else g += h ? `<text x="${r.x + r.w + 4}" y="${r.y + r.h / 2 + 4}" font-size="11" fill="#222">${lab}</text>` : `<text x="${r.x + r.w / 2}" y="${r.y - 4}" text-anchor="middle" font-size="11" fill="#222">${lab}</text>`;
  }));
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.title ?? 'Bar chart')}">${g}</svg>${legend(c.series.map(s => s.name))}`;
}

function line(c) {
  const W = 640, H = 320, L = 58, R = 18, T = 14, B = 46, iw = W - L - R, ih = H - T - B;
  const { top, step } = axis(Math.max(...c.series.flatMap(s => s.values)));
  const y = v => T + ih * (1 - v / top), x = i => L + iw * (i + .5) / c.labels.length;
  let g = '';
  for (let t = 0; t <= top + 1e-9; t += step) g += `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="#dcdcdc"/><text class="tick" x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${fmt(t)}</text>`;
  c.labels.forEach((l, i) => g += `<text x="${x(i)}" y="${H - B + 18}" text-anchor="middle">${esc(l)}</text>`);
  g += `<text transform="translate(14 ${T + ih / 2}) rotate(-90)" text-anchor="middle" font-weight="700">${esc(c.yLabel ?? (c.unit === '%' ? 'Percentage' : c.unit ?? ''))}</text>`;
  if (c.xLabel) g += `<text x="${L + iw / 2}" y="${H - 4}" text-anchor="middle" font-weight="700">${esc(c.xLabel)}</text>`;
  c.series.forEach((s, k) => {
    const col = PAL[k % PAL.length];
    g += `<polyline points="${s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="2.6" ${k > 1 ? 'stroke-dasharray="7 4"' : ''}/>`;
    s.values.forEach((v, i) => g += `<circle cx="${x(i)}" cy="${y(v)}" r="3.6" fill="${col}"/>` + (c.dataLabels ? `<text x="${x(i)}" y="${y(v) - 8}" text-anchor="middle" font-size="10.5" fill="#222">${fmt(v)}</text>` : ''));
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.title ?? 'Line graph')}">${g}</svg>${legend(c.series.map(s => s.name))}`;
}

function pie(c) {
  const names = [...new Set(c.pies.flatMap(p => p.slices.map(s => s.name)))], col = n => PAL[names.indexOf(n) % PAL.length];
  const suffix = c.unit === '%' ? '%' : '';
  const svgs = c.pies.map(p => {
    const R = 88, C = 115, total = p.slices.reduce((s, x) => s + x.value, 0);
    let a = -Math.PI / 2, g = '';
    const pt = (ang, rad) => [C + rad * Math.cos(ang), C + rad * Math.sin(ang)];
    for (const s of p.slices) {
      const sweep = 2 * Math.PI * s.value / total, a1 = a + sweep, [x0, y0] = pt(a, R), [x1, y1] = pt(a1, R);
      g += sweep >= 2 * Math.PI - 1e-6
        ? `<circle class="slice" cx="${C}" cy="${C}" r="${R}" fill="${col(s.name)}" stroke="#fff" stroke-width="2"/>`
        : `<path class="slice" d="M${C} ${C}L${x0} ${y0}A${R} ${R} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x1} ${y1}Z" fill="${col(s.name)}" stroke="#fff" stroke-width="2"/>`;
      const inside = s.value / total >= .07, [tx, ty] = pt(a + sweep / 2, inside ? R * .62 : R * 1.14);
      g += `<text x="${tx}" y="${ty + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="${inside ? '#fff' : '#222'}">${fmt(s.value)}${suffix}</text>`;
      a = a1;
    }
    return `<div class="pie"><svg viewBox="0 0 230 230" role="img" aria-label="${esc(p.label)}">${g}</svg><p>${esc(p.label)}</p></div>`;
  }).join('');
  return `<div class="pies">${svgs}</div>${legend(names)}`;
}

function table(c) {
  const cell = v => typeof v === 'number' ? fmt(v) : esc(v);
  return `<div class="tw"><table class="dtable"><thead><tr><th scope="col">${esc(c.corner ?? '')}</th>${c.columns.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${c.rows.map(r => `<tr><th scope="row">${esc(r.label)}</th>${r.values.map(v => `<td>${cell(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

// 24 x 24 pictograms, drawn with strokes so one colour themes them
const ICONS = {
  drop: '<path d="M12 3C12 3 5 11 5 15a7 7 0 0 0 14 0C19 11 12 3 12 3Z"/>',
  flame: '<path d="M12 2c1 5 6 7 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 2 2 2 0-3 0-5 1-7Z"/>',
  gear: '<circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.8"/>' + [0, 45, 90, 135, 180, 225, 270, 315].map(a => `<rect x="10.5" y="2" width="3" height="4" transform="rotate(${a} 12 12)"/>`).join(''),
  box: '<rect x="4" y="9" width="16" height="11"/><path d="M4 9l4-5h8l4 5M12 9v11"/>',
  truck: '<rect x="2" y="7" width="12" height="9"/><path d="M14 10h5l3 3v3h-8"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  leaf: '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15Z"/><path d="M5 19L14 10"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  cloud: '<path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1A4.5 4.5 0 0 1 17 18Z"/>',
  factory: '<path d="M3 20V10l5 3v-3l5 3V6h4v14Z"/>',
  wave: '<path d="M2 12q3-4 5 0t5 0 5 0 5 0M2 17q3-4 5 0t5 0 5 0 5 0"/>',
  tree: '<circle cx="12" cy="9" r="6"/><path d="M12 15v6"/>',
  egg: '<ellipse cx="12" cy="13" rx="6" ry="8"/>',
  mountain: '<path d="M2 20L9 7l4 7 3-4 6 10Z"/>',
  fish: '<path d="M3 12c4-6 10-6 14 0-4 6-10 6-14 0ZM17 12l4-4v8Z"/>',
};

const wrap = (s, n) => { const out = []; let cur = ''; for (const w of s.split(' ')) { if (cur && (cur + ' ' + w).length > n) { out.push(cur); cur = w; } else cur = (cur ? cur + ' ' : '') + w; } if (cur) out.push(cur); return out.slice(0, 4); };

function process(c) {
  const stages = c.stages.map(s => typeof s === 'string' ? { text: s } : s), n = stages.length, NW = 190, NH = 120, id = `ah${uid++}`;
  const cycle = c.layout === 'cycle', rows = Math.ceil(n / 3);
  const W = cycle ? 700 : 3 * NW + 2 * 50 + 20, H = cycle ? 470 : rows * NH + (rows - 1) * 56 + 20;
  const ctr = stages.map((_, i) => {
    if (cycle) { const a = -Math.PI / 2 + 2 * Math.PI * i / n; return [W / 2 + 250 * Math.cos(a), H / 2 + 165 * Math.sin(a)]; }
    const r = Math.floor(i / 3), col = r % 2 ? 2 - (i % 3) : i % 3;
    return [10 + col * (NW + 50) + NW / 2, 10 + r * (NH + 56) + NH / 2];
  });
  let g = `<defs><marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#14213d"/></marker></defs>`;
  const edge = (dx, dy) => Math.min((NW / 2) / Math.abs(dx || 1e-9), (NH / 2) / Math.abs(dy || 1e-9));
  for (let i = 0; i < (cycle ? n : n - 1); i++) {
    const [x0, y0] = ctr[i], [x1, y1] = ctr[(i + 1) % n], dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), m = 9 / len, t = edge(dx, dy);
    g += `<line class="arrow" x1="${x0 + dx * (t + m)}" y1="${y0 + dy * (t + m)}" x2="${x1 - dx * (t + m)}" y2="${y1 - dy * (t + m)}" stroke="#14213d" stroke-width="2.4" marker-end="url(#${id})"/>`;
  }
  stages.forEach((s, i) => {
    const [cx, cy] = ctr[i], x = cx - NW / 2, y = cy - NH / 2;
    g += `<g class="node"><rect x="${x}" y="${y}" width="${NW}" height="${NH}" rx="12" fill="#fff" stroke="#2f5d8a" stroke-width="2"/>
      <circle cx="${x + 20}" cy="${y + 20}" r="12" fill="#2f5d8a"/><text x="${x + 20}" y="${y + 25}" text-anchor="middle" fill="#fff" font-weight="700" font-size="13">${i + 1}</text>
      ${s.icon && ICONS[s.icon] ? `<g class="icon" transform="translate(${x + NW - 42} ${y + 8}) scale(1.3)" fill="none" stroke="#2f5d8a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[s.icon]}</g>` : ''}
      ${wrap(s.text, 25).map((l, k) => `<text x="${cx}" y="${y + 56 + k * 15}" text-anchor="middle" font-size="13" fill="#14213d">${esc(l)}</text>`).join('')}</g>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.title ?? 'Process diagram')}">${g}</svg>`;
}

// maps use a 100 x 70 unit canvas drawn at 4px per unit
const U = 4;
function feature(f) {
  const x = (f.x ?? 0) * U, y = (f.y ?? 0) * U, w = (f.w ?? 0) * U, h = (f.h ?? 0) * U, pts = (f.points ?? []).map(([a, b]) => `${a * U},${b * U}`).join(' ');
  const text = (t, tx, ty, extra = '') => `<text x="${tx}" y="${ty}" text-anchor="middle" font-size="11" font-weight="700" fill="#3b3226" ${extra}>${esc(t)}</text>`;
  const grid = (sp, size, draw) => { let o = ''; for (let i = 4; i < f.w; i += sp) for (let j = 4; j < f.h; j += sp) o += draw(x + i * U, y + j * U, size * U); return o; };
  switch (f.type) {
    case 'sea': return `<polygon points="${pts}" fill="#bcd8ec"/>`;
    case 'beach': return `<polygon points="${pts}" fill="#efe3b0"/>`;
    case 'river': return `<polyline points="${pts}" fill="none" stroke="#9cc3e0" stroke-width="${3.5 * U}" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'road': return `<polyline points="${pts}" fill="none" stroke="#c4c4c4" stroke-width="${3 * U}" stroke-linejoin="round"/><polyline points="${pts}" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="6 6"/>`;
    case 'railway': return `<polyline points="${pts}" fill="none" stroke="#444" stroke-width="3" stroke-dasharray="9 5"/>`;
    case 'lake': return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="#9cc3e0"/>` + (f.label ? text(f.label, x + w / 2, y + h / 2 + 4) : '');
    case 'field': return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#dfe9c4" stroke="#b9c98f"/>` + (f.label ? text(f.label, x + w / 2, y + h / 2 + 4) : '');
    case 'trees': return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e3edd5"/>` + grid(8, 2.6, (a, b, r) => `<circle cx="${a}" cy="${b}" r="${r}" fill="#6f9f69"/>`) + (f.label ? text(f.label, x + w / 2, y + h + 13) : '');
    case 'houses': return grid(8, 5, (a, b, s) => `<rect x="${a - s / 2}" y="${b - s / 2}" width="${s}" height="${s}" fill="#d9a58b" stroke="#8a5a44"/>`) + (f.label ? text(f.label, x + w / 2, y + h + 13) : '');
    case 'building': return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e8d5b5" stroke="#7a6a4f" stroke-width="1.5"/>` + (f.label ? text(f.label, x + w / 2, y + h / 2 + 4) : '');
    case 'carpark': return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#cfcfcf" stroke="#8a8a8a"/><text x="${x + w / 2}" y="${y + h / 2 + 8}" text-anchor="middle" font-size="22" font-weight="700" fill="#fff">P</text>` + (f.label ? text(f.label, x + w / 2, y + h + 13) : '');
    case 'pier': case 'bridge': return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#8a6d4b"/>` + (f.label ? text(f.label, x + w / 2, y - 5) : '');
    case 'label': return text(f.label, x, y);
    default: return '';
  }
}

function map(c) {
  return `<div class="maps">${c.panels.map(p => `<div class="mapp"><svg viewBox="0 0 ${100 * U} ${70 * U}" role="img" aria-label="${esc(p.label)}">
    <rect width="${100 * U}" height="${70 * U}" fill="#f4f0e4" stroke="#8a8272" stroke-width="2"/>${p.features.map(f => `<g class="feat">${feature(f)}</g>`).join('')}
    <g><text x="${95 * U}" y="${9 * U}" text-anchor="middle" font-size="14" font-weight="700" fill="#222">N</text><path d="M${95 * U} ${10 * U}l-6 14h12Z" fill="#222" transform="translate(0 -2)"/></g></svg><p class="mapl">${esc(p.label)}</p></div>`).join('')}</div>`;
}

export function renderChart(c) {
  if (c.kind === 'mixed') return `<div class="mixed">${c.charts.map(s => `<div class="sub">${renderChart(s)}</div>`).join('')}</div>`;
  const body = { bar, line, pie, table, process, map }[c.kind];
  if (!body) throw new Error(`unknown chart kind "${c.kind}"`);
  return head(c) + body(c) + foot(c);
}
