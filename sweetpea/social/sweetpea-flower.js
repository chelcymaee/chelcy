// Sweet pea illustration for social graphics. Same drawing as the website hero (main.js),
// packaged so any SVG can host a sprig: SweetPea.sprig(svg, { flowers: [...], stem: 'M…' }).
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  const smoothClosed = pts => {
    const n = pts.length, f = v => v.toFixed(2);
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d + 'Z';
  };

  const petal = (bx, by, rx, ry, rot, seed, notch = 0) => {
    const pts = [], N = 56, a = rot * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    for (let k = 0; k < N; k++) {
      const t = (k / N) * Math.PI * 2;
      let x = rx * Math.cos(t), y = ry * Math.sin(t);
      const s = y / ry;
      x *= 1 - .72 * Math.pow(Math.max(0, s), 1.4);
      const rim = Math.max(0, -s);
      const w = 1 + rim * (.07 * Math.sin(5 * t + seed) + .045 * Math.sin(9 * t + 2 * seed) + .02 * Math.sin(17 * t + 3 * seed));
      x *= w; y *= w;
      if (notch) y += notch * ry * Math.exp(-Math.pow((t + Math.PI / 2) / .16, 2));
      y -= ry;
      pts.push([bx + x * ca - y * sa, by + x * sa + y * ca]);
    }
    return smoothClosed(pts);
  };

  const SCHEMES = {
    peach: ['#E46A74', '#F2A39A', '#FDEAE5'],
    blush: ['#EC97A3', '#F7CEC9', '#FFF5F2'],
    berry: ['#C94566', '#E57A8C', '#F9D2D6'],
    cream: ['#EBC9B4', '#FAEDE4', '#FFFDFB']
  };

  let uid = 0;
  const ensureDefs = svg => {
    if (svg._spDefs) return svg._spDefs;
    const p = `spx${uid++}`;
    const defs = el('defs', {}, svg);
    const sheen = el('linearGradient', { id: `${p}-sheen`, x1: 0, y1: -140, x2: 0, y2: -40, gradientUnits: 'userSpaceOnUse' }, defs);
    el('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': .55 }, sheen);
    el('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }, sheen);
    for (const [name, [core, mid, rim]] of Object.entries(SCHEMES)) {
      for (const [part, cy, r] of [['banner', -10, 125], ['wing', -6, 72]]) {
        const g = el('radialGradient', { id: `${p}-${name}-${part}`, cx: 0, cy, r, gradientUnits: 'userSpaceOnUse' }, defs);
        el('stop', { offset: 0, 'stop-color': core }, g);
        el('stop', { offset: .5, 'stop-color': mid }, g);
        el('stop', { offset: 1, 'stop-color': rim }, g);
      }
    }
    svg._spDefs = { defs, p };
    return svg._spDefs;
  };

  // One open flower with its base at (0, 0), drawn into `parent`. `open` 0 (bud) … 1 (open).
  const flower = (svg, parent, scheme = 'peach', seed = 1, open = 1) => {
    const { defs, p } = ensureDefs(svg);
    const [core, mid] = SCHEMES[scheme];
    const g = el('g', { transform: `scale(${.42 + .58 * open})` }, parent);
    const part = (d, fill, veins, transform) => {
      const id = `${p}-c${uid++}`;
      const grp = el('g', { transform }, g);
      el('path', { d }, el('clipPath', { id }, defs));
      el('path', { d, fill, stroke: core, 'stroke-opacity': .18, 'stroke-width': .8 }, grp);
      const vg = el('g', { 'clip-path': `url(#${id})`, stroke: core, 'stroke-opacity': .2, 'stroke-width': .7, fill: 'none' }, grp);
      veins.forEach(v => el('path', { d: v }, vg));
      el('path', { d, fill: `url(#${p}-sheen)`, opacity: .7 }, grp);
    };
    const lerp = (a, b) => a + (b - a) * open;
    const bannerVeins = [];
    for (let k = 0; k < 11; k++) {
      const a = (-150 + k * 12) * Math.PI / 180;
      bannerVeins.push(`M0 -10 Q${Math.cos(a) * 50} ${-10 + Math.sin(a) * 60} ${Math.cos(a) * 125} ${-10 + Math.sin(a) * 125}`);
    }
    const wingVeins = side => [0, 1, 2, 3].map(k => {
      const a = (-90 + side * (-62 + (k - 1.5) * 16)) * Math.PI / 180;
      return `M0 -6 L${Math.cos(a) * 80} ${-6 + Math.sin(a) * 80}`;
    });
    part(petal(0, -10, 70, 56, 0, seed, .14), `url(#${p}-${scheme}-banner)`, bannerVeins,
      `translate(0 -10) rotate(${lerp(-10, 0)}) scale(${lerp(.2, 1)} ${lerp(.62, 1)}) translate(0 10)`);
    part(petal(0, -6, 28, 40, -64, seed + 2), `url(#${p}-${scheme}-wing)`, wingVeins(1),
      `translate(0 -6) rotate(${lerp(52, 0)}) scale(${lerp(.22, 1)} ${lerp(.7, 1)}) translate(0 6)`);
    part(petal(0, -6, 28, 40, 64, seed + 3), `url(#${p}-${scheme}-wing)`, wingVeins(-1),
      `translate(0 -6) rotate(${lerp(-52, 0)}) scale(${lerp(.22, 1)} ${lerp(.7, 1)}) translate(0 6)`);
    if (open > .3) el('path', { d: petal(0, -2, 6, 14, 6, seed), fill: mid, stroke: core, 'stroke-opacity': .3, 'stroke-width': .8 }, g);
    el('path', { d: 'M0 -6 L-11 10 L-3 2 L0 14 L3 2 L11 10 Z', fill: '#7E9B57' }, g);
    el('ellipse', { cx: 0, cy: 2, rx: 5, ry: 7, fill: '#86A35F' }, g);
    return g;
  };

  // A stem with flowers along it. flowers: [{ at: 0..1, side: ±1, size, scheme, tilt, seed, open }]
  const sprig = (svg, { stem, flowers = [], tendrils = [], leaves = [], width = 5 }) => {
    const g = el('g', {}, svg);
    const path = el('path', { d: stem, fill: 'none', stroke: '#7E9B57', 'stroke-width': width, 'stroke-linecap': 'round' }, g);
    const len = path.getTotalLength();
    const at = f => path.getPointAtLength(len * f);
    leaves.forEach(([f, side], i) => {
      const s = at(f);
      el('path', { d: petal(0, 0, 16, 46, side * 58, 1 + i), fill: '#86A35F', transform: `translate(${s.x} ${s.y})` }, g);
    });
    tendrils.forEach(([f, side]) => {
      const s = at(f);
      el('path', {
        d: 'M0 0 c14 -8 30 -24 34 -46 c3 -16 -6 -26 -16 -22 c-10 4 -8 18 2 18 c6 0 8 -6 5 -10',
        transform: `translate(${s.x} ${s.y}) scale(${side} 1)`, fill: 'none', stroke: '#86A35F', 'stroke-width': 1.8, 'stroke-linecap': 'round'
      }, g);
    });
    flowers.forEach(f => {
      const s = at(f.at), size = f.size ?? 1, side = f.side ?? 1;
      const bx = s.x + side * 46 * size, by = s.y - 34 * size;
      el('path', { d: `M${s.x} ${s.y} Q${s.x + side * 30 * size} ${s.y - 6} ${bx} ${by}`, fill: 'none', stroke: '#86A35F', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
      const holder = el('g', { transform: `translate(${bx} ${by}) rotate(${f.tilt ?? 0}) scale(${-side * size} ${size})` }, g);
      flower(svg, holder, f.scheme, f.seed ?? 1, f.open ?? 1);
    });
    return g;
  };

  window.SweetPea = { flower, sprig };
})();
