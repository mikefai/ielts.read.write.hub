const SVG = 'http://www.w3.org/2000/svg';
const COLORS = ['#d9441e', '#14213d', '#c78a00'];
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

export function renderChart(c) {
  const head = `<p class="ct">${esc(c.title)}${c.unit ? ` <span class="muted">(${esc(c.unit)})</span>` : ''}</p>`;
  if (c.kind === 'process') return head + '<div class="flowc">' + c.stages.map((s, i) => `${i ? '<span aria-hidden="true">\u2193</span>' : ''}<div><b>${i + 1}</b>${esc(s)}</div>`).join('') + '</div>';
  const W = 640, H = 300, L = 46, R = 12, T = 12, B = 34, all = c.series.flatMap(s => s.values);
  const step = Math.pow(10, Math.floor(Math.log10(Math.max(...all)))) / 2 || 1;
  const max = Math.ceil(Math.max(...all) / step) * step, y = v => T + (H - T - B) * (1 - v / max);
  let g = '';
  for (let v = 0; v <= max + 1e-9; v += max / 5) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#d9cfbb"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${+v.toFixed(1)}</text>`;
  const band = (W - L - R) / c.labels.length;
  c.labels.forEach((l, i) => g += `<text x="${L + band * (i + .5)}" y="${H - 12}" text-anchor="middle">${esc(l)}</text>`);
  if (c.kind === 'bar') {
    const bw = band * .7 / c.series.length;
    c.series.forEach((s, k) => s.values.forEach((v, i) => g += `<rect x="${L + band * i + band * .15 + bw * k}" y="${y(v)}" width="${bw - 2}" height="${H - B - y(v)}" fill="${COLORS[k % 3]}"/>`));
  } else c.series.forEach((s, k) => {
    const pts = s.values.map((v, i) => `${L + band * (i + .5)},${y(v)}`);
    g += `<polyline points="${pts.join(' ')}" fill="none" stroke="${COLORS[k % 3]}" stroke-width="3"/>` + pts.map(p => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="4" fill="${COLORS[k % 3]}"/>`).join('');
  });
  const legend = c.series.map((s, k) => `<span><i style="background:${COLORS[k % 3]}"></i>${esc(s.name)}</span>`).join('');
  return `${head}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.title)}">${g}</svg><div class="legend">${legend}</div>`;
}
