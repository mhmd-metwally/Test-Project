// Tiny dependency-free SVG line chart with a shaded reference band.
// renderLineChart(container, { points, refLow, refHigh, unit, dir })
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    const node = document.createElementNS(NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function renderLineChart(container, opts) {
    container.innerHTML = '';
    const points = opts.points || [];
    const W = container.clientWidth || 640;
    const H = opts.height || 300;
    const pad = { top: 20, right: 20, bottom: 40, left: 48 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H, class: 'chart' });

    if (points.length === 0) {
      container.appendChild(svg);
      return;
    }

    const values = points.map((p) => p.value);
    const refs = [];
    if (opts.refLow != null) refs.push(opts.refLow);
    if (opts.refHigh != null) refs.push(opts.refHigh);
    let min = Math.min(...values, ...refs);
    let max = Math.max(...values, ...refs);
    if (min === max) { min -= 1; max += 1; }
    const range = max - min;
    min -= range * 0.12;
    max += range * 0.12;

    const n = points.length;
    const x = (i) => pad.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const y = (v) => pad.top + plotH - ((v - min) / (max - min)) * plotH;

    // reference band
    if (opts.refLow != null && opts.refHigh != null) {
      const yHigh = y(opts.refHigh);
      const yLow = y(opts.refLow);
      svg.appendChild(el('rect', {
        x: pad.left, y: yHigh, width: plotW, height: Math.max(0, yLow - yHigh),
        fill: 'var(--band)', rx: 4,
      }));
      svg.appendChild(el('line', {
        x1: pad.left, y1: yHigh, x2: pad.left + plotW, y2: yHigh,
        stroke: 'var(--band-line)', 'stroke-dasharray': '4 4', 'stroke-width': 1,
      }));
      svg.appendChild(el('line', {
        x1: pad.left, y1: yLow, x2: pad.left + plotW, y2: yLow,
        stroke: 'var(--band-line)', 'stroke-dasharray': '4 4', 'stroke-width': 1,
      }));
    }

    // y axis ticks
    const ticks = 4;
    for (let t = 0; t <= ticks; t++) {
      const v = min + (t / ticks) * (max - min);
      const yy = y(v);
      svg.appendChild(el('line', {
        x1: pad.left, y1: yy, x2: pad.left + plotW, y2: yy,
        stroke: 'var(--grid)', 'stroke-width': 1,
      }));
      const label = el('text', {
        x: pad.left - 8, y: yy + 4, 'text-anchor': 'end', class: 'chart-axis',
      });
      label.textContent = fmt(v);
      svg.appendChild(label);
    }

    // line path
    let d = '';
    points.forEach((p, i) => { d += (i === 0 ? 'M' : 'L') + x(i) + ' ' + y(p.value); });
    svg.appendChild(el('path', { d, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));

    // points + x labels
    points.forEach((p, i) => {
      const color =
        p.status === 'high' ? 'var(--high)' :
        p.status === 'low' ? 'var(--low)' :
        p.status === 'normal' ? 'var(--ok)' : 'var(--accent)';
      const c = el('circle', { cx: x(i), cy: y(p.value), r: 5, fill: color, stroke: 'var(--card)', 'stroke-width': 2 });
      const title = el('title', {});
      title.textContent = `${p.date}: ${p.value} ${opts.unit || ''}`;
      c.appendChild(title);
      svg.appendChild(c);

      if (n <= 12 || i % Math.ceil(n / 8) === 0) {
        const xl = el('text', { x: x(i), y: H - 14, 'text-anchor': 'middle', class: 'chart-axis' });
        xl.textContent = shortDate(p.date);
        svg.appendChild(xl);
      }
    });

    container.appendChild(svg);
  }

  function fmt(v) {
    if (Math.abs(v) >= 1000) return Math.round(v).toString();
    return (Math.round(v * 100) / 100).toString();
  }
  function shortDate(iso) {
    const parts = (iso || '').split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
    return iso;
  }

  window.renderLineChart = renderLineChart;
})();
