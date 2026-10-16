(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  // How far the viewport has travelled through a tall sticky section (0 → 1).
  const sectionProgress = el => {
    const r = el.getBoundingClientRect();
    const travel = r.height - window.innerHeight;
    return travel > 0 ? clamp(-r.top / travel) : (r.top <= 0 ? 1 : 0);
  };

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- 1. Bloom hero: a sweet pea grows and flowers as you scroll ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const bloom = document.querySelector('.bloom');
  const plant = bloom.querySelector('.bloom__plant');
  const intro = bloom.querySelector('.bloom__intro');
  const reveal = bloom.querySelector('.bloom__reveal');

  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  // Smooth closed outline through points (Catmull-Rom → cubic Bézier).
  const smoothClosed = pts => {
    const n = pts.length, f = v => v.toFixed(2);
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d + 'Z';
  };

  // A ruffled petal: grows from its base at (bx, by) towards angle `rot` (0 = straight up).
  // Narrow at the base, wide and wavy at the rim, with an optional notch at the tip.
  const petal = (bx, by, rx, ry, rot, seed, notch = 0) => {
    const pts = [], N = 56, a = rot * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    for (let k = 0; k < N; k++) {
      const t = (k / N) * Math.PI * 2;
      let x = rx * Math.cos(t), y = ry * Math.sin(t);           // y: -ry tip … +ry base
      const s = y / ry;
      x *= 1 - .72 * Math.pow(Math.max(0, s), 1.4);              // pinch towards the base
      const rim = Math.max(0, -s);                               // ruffles live on the outer rim
      const w = 1 + rim * (.07 * Math.sin(5 * t + seed) + .045 * Math.sin(9 * t + 2 * seed) + .02 * Math.sin(17 * t + 3 * seed));
      x *= w; y *= w;
      if (notch) y += notch * ry * Math.exp(-Math.pow((t + Math.PI / 2) / .16, 2));
      y -= ry;                                                   // base sits at local (0, 0)
      pts.push([bx + x * ca - y * sa, by + x * sa + y * ca]);
    }
    return smoothClosed(pts);
  };

  // Brand-tuned sweet pea colours: core → mid → rim.
  const SCHEMES = {
    peach: ['#E46A74', '#F2A39A', '#FDEAE5'],
    blush: ['#EC97A3', '#F7CEC9', '#FFF5F2'],
    berry: ['#C94566', '#E57A8C', '#F9D2D6'],
    cream: ['#EBC9B4', '#FAEDE4', '#FFFDFB']
  };
  const defs = el('defs', {}, plant);
  const sheen = el('linearGradient', { id: 'sp-sheen', x1: 0, y1: -140, x2: 0, y2: -40, gradientUnits: 'userSpaceOnUse' }, defs);
  el('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': .55 }, sheen);
  el('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }, sheen);
  const stemGrad = el('linearGradient', { id: 'sp-stem', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
  el('stop', { offset: 0, 'stop-color': '#6E8B4E' }, stemGrad);
  el('stop', { offset: 1, 'stop-color': '#9BB673' }, stemGrad);
  for (const [name, [core, mid, rim]] of Object.entries(SCHEMES)) {
    for (const [part, cy, r] of [['banner', -10, 125], ['wing', -6, 72]]) {
      const g = el('radialGradient', { id: `sp-${name}-${part}`, cx: 0, cy, r, gradientUnits: 'userSpaceOnUse' }, defs);
      el('stop', { offset: 0, 'stop-color': core }, g);
      el('stop', { offset: .5, 'stop-color': mid }, g);
      el('stop', { offset: 1, 'stop-color': rim }, g);
    }
  }

  const sway = el('g', { class: 'bloom__sway' }, plant);

  // Main stem, drawn upward as you scroll.
  const STEM_D = 'M262 1000 C252 880 292 790 272 660 S226 430 258 300 S298 150 272 70';
  const plantStem = el('path', { d: STEM_D, fill: 'none', stroke: 'url(#sp-stem)', 'stroke-width': 6, 'stroke-linecap': 'round' }, sway);
  const stemLen = plantStem.getTotalLength();
  const stemAt = f => plantStem.getPointAtLength(stemLen * f);
  plantStem.setAttribute('pathLength', '1');
  plantStem.style.strokeDasharray = '1';

  // Leaves and curling tendrils.
  const extras = [];
  [[.2, 1], [.3, -1]].forEach(([at, side], i) => {
    const p = stemAt(at);
    const g = el('g', { transform: `translate(${p.x} ${p.y})` }, sway);
    const leaf = el('g', {}, g);
    el('path', { d: petal(0, 0, 16, 46, side * 58, 1 + i), fill: '#86A35F' }, leaf);
    el('path', { d: `M0 0 L${side * 70} -${42}`, stroke: '#6E8B4E', 'stroke-width': 1.2, opacity: .5, fill: 'none' }, leaf);
    extras.push({ node: leaf, at, kind: 'leaf' });
  });
  [[.42, 1], [.68, -1], [.84, 1]].forEach(([at, side]) => {
    const p = stemAt(at);
    const t = el('path', {
      d: 'M0 0 c14 -8 30 -24 34 -46 c3 -16 -6 -26 -16 -22 c-10 4 -8 18 2 18 c6 0 8 -6 5 -10',
      transform: `translate(${p.x} ${p.y}) scale(${side} 1)`,
      fill: 'none', stroke: '#86A35F', 'stroke-width': 1.6, 'stroke-linecap': 'round', pathLength: 1
    }, sway);
    t.style.strokeDasharray = '1';
    extras.push({ node: t, at, kind: 'tendril' });
  });

  // Flowers, bottom to top. The top one stays a half-open bud, like the real thing.
  const FLOWERS = [
    { at: .34, side: -1, size: 1.4, scheme: 'peach', tilt: -26, seed: 1 },
    { at: .49, side: 1, size: 1.3, scheme: 'blush', tilt: 22, seed: 4 },
    { at: .63, side: -1, size: 1.2, scheme: 'berry', tilt: -16, seed: 7 },
    { at: .77, side: 1, size: 1.08, scheme: 'cream', tilt: 18, seed: 2 },
    { at: .92, side: -1, size: .85, scheme: 'peach', tilt: -8, seed: 5, maxOpen: .38 }
  ];
  const flowers = FLOWERS.map(f => {
    const s = stemAt(f.at);
    const bx = s.x + f.side * 46 * f.size, by = s.y - 34 * f.size;
    const pedicel = el('path', {
      d: `M${s.x} ${s.y} Q${s.x + f.side * 30 * f.size} ${s.y - 6} ${bx} ${by}`,
      fill: 'none', stroke: '#86A35F', 'stroke-width': 3, 'stroke-linecap': 'round', pathLength: 1
    }, sway);
    pedicel.style.strokeDasharray = '1';
    const outer = el('g', { transform: `translate(${bx} ${by}) rotate(${f.tilt}) scale(${f.side * -f.size} ${f.size})` }, sway);
    const g = el('g', {}, outer);
    const id = `sp-f${f.seed}-${f.scheme}`;
    const part = (d, fillUrl, veins, clipId) => {
      const grp = el('g', {}, g);
      const cp = el('clipPath', { id: clipId }, defs);
      el('path', { d }, cp);
      el('path', { d, fill: fillUrl, stroke: SCHEMES[f.scheme][0], 'stroke-opacity': .18, 'stroke-width': .8 }, grp);
      const vg = el('g', { 'clip-path': `url(#${clipId})`, stroke: SCHEMES[f.scheme][0], 'stroke-opacity': .2, 'stroke-width': .7, fill: 'none' }, grp);
      veins.forEach(v => el('path', { d: v }, vg));
      el('path', { d, fill: 'url(#sp-sheen)', opacity: .7 }, grp);
      return grp;
    };
    const bannerD = petal(0, -10, 70, 56, 0, f.seed, .14);
    const bannerVeins = [];
    for (let k = 0; k < 11; k++) {
      const a = (-150 + k * 12) * Math.PI / 180;
      bannerVeins.push(`M0 -10 Q${Math.cos(a) * 50} ${-10 + Math.sin(a) * 60} ${Math.cos(a) * 125} ${-10 + Math.sin(a) * 125}`);
    }
    const wingVeins = side => [0, 1, 2, 3].map(k => {
      const a = (-90 + side * (-62 + (k - 1.5) * 16)) * Math.PI / 180;
      return `M0 -6 L${Math.cos(a) * 80} ${-6 + Math.sin(a) * 80}`;
    });
    const banner = part(bannerD, `url(#sp-${f.scheme}-banner)`, bannerVeins, `${id}-b`);
    const wingL = part(petal(0, -6, 28, 40, -64, f.seed + 2), `url(#sp-${f.scheme}-wing)`, wingVeins(1), `${id}-wl`);
    const wingR = part(petal(0, -6, 28, 40, 64, f.seed + 3), `url(#sp-${f.scheme}-wing)`, wingVeins(-1), `${id}-wr`);
    const keel = el('path', { d: petal(0, -2, 6, 14, 6, f.seed), fill: SCHEMES[f.scheme][1], stroke: SCHEMES[f.scheme][0], 'stroke-opacity': .3, 'stroke-width': .8 }, g);
    el('path', { d: 'M0 -6 L-11 10 L-3 2 L0 14 L3 2 L11 10 Z', fill: '#7E9B57' }, g);   // calyx
    el('ellipse', { cx: 0, cy: 2, rx: 5, ry: 7, fill: '#86A35F' }, g);
    return { ...f, pedicel, g, banner, wingL, wingR, keel };
  });

  const STEM_START = .02, STEM_DUR = .5;
  const drawBloom = p => {
    const stemP = easeOut(clamp((p - STEM_START) / STEM_DUR));
    plantStem.style.strokeDashoffset = 1 - stemP;

    extras.forEach(x => {
      const t = clamp((stemP - x.at) / .14);
      if (x.kind === 'leaf') x.node.setAttribute('transform', `scale(${easeOut(t)})`);
      else x.node.style.strokeDashoffset = 1 - easeOut(t);
    });

    flowers.forEach(f => {
      const grow = easeOut(clamp((stemP - f.at) / .08));        // bud appears as the stem passes
      const reach = STEM_START + f.at * STEM_DUR;
      const open = easeInOut(clamp((p - reach - .04) / .2)) * (f.maxOpen ?? 1);
      f.pedicel.style.strokeDashoffset = 1 - grow;
      f.g.setAttribute('transform', `scale(${grow * (.42 + .58 * open)})`);
      f.banner.setAttribute('transform', `translate(0 -10) rotate(${lerp(-10, 0, open)}) scale(${lerp(.2, 1, open)} ${lerp(.62, 1, open)}) translate(0 10)`);
      f.wingL.setAttribute('transform', `translate(0 -6) rotate(${lerp(52, 0, open)}) scale(${lerp(.22, 1, open)} ${lerp(.7, 1, open)}) translate(0 6)`);
      f.wingR.setAttribute('transform', `translate(0 -6) rotate(${lerp(-52, 0, open)}) scale(${lerp(.22, 1, open)} ${lerp(.7, 1, open)}) translate(0 6)`);
      f.keel.setAttribute('opacity', clamp(open * 2));
    });

    // Intro fades as the stem starts to climb.
    const io = clamp(p / .14);
    intro.style.opacity = 1 - io;
    intro.style.transform = `translateY(${-io * 60}px)`;

    // Headline arrives as the last flowers open.
    const rv = easeOut(clamp((p - .5) / .2));
    reveal.style.opacity = rv;
    reveal.style.transform = `translateY(${(1 - rv) * 40}px)`;
    reveal.classList.toggle('is-live', rv > .5);
  };

  /* ---------- 2. Statement words ---------- */
  const statement = document.querySelector('.statement');
  const statementText = statement.querySelector('.statement__text');
  statementText.innerHTML = statementText.textContent.trim().split(/\s+/)
    .map(w => `<span class="w">${w}</span>`).join(' ');
  const words = [...statementText.querySelectorAll('.w')];

  const drawStatement = () => {
    const p = sectionProgress(statement);
    const lit = Math.round(clamp(p * 1.2) * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < lit));
  };

  /* ---------- 4. Marquee ---------- */
  const track = document.querySelector('.marquee__track');
  const drawMarquee = () => {
    const third = track.scrollWidth / 3;
    track.style.transform = `translateX(${-((window.scrollY * .35) % third)}px)`;
  };

  /* ---------- 5. Process stem ---------- */
  const steps = document.querySelector('.process__steps');
  const stem = steps.querySelector('path');
  const stepEls = [...steps.querySelectorAll('.step')];
  stem.setAttribute('pathLength', '1');
  stem.style.strokeDasharray = '1';

  const drawProcess = () => {
    const r = steps.getBoundingClientRect();
    const p = clamp((window.innerHeight * .65 - r.top) / r.height);
    stem.style.strokeDashoffset = 1 - p;
    stepEls.forEach(s => {
      const at = (s.offsetTop + 20) / steps.offsetHeight;
      s.classList.toggle('is-open', p >= at);
    });
  };

  /* ---------- Nav ---------- */
  const nav = document.querySelector('.nav');
  // Over the peach hero/statement the bar goes clear and the button turns ink.
  const drawNav = () => {
    const r = statement.getBoundingClientRect();
    const overPeach = r.top < 60 && r.bottom > 60;
    nav.classList.toggle('is-peach', overPeach);
    nav.classList.toggle('is-solid', window.scrollY > 40 && !overPeach);
  };

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    revealEls.forEach(el => io.observe(el));
  }

  /* ---------- Loop ---------- */
  let queued = false;
  const frame = () => {
    queued = false;
    drawNav();
    if (reduceMotion) {
      stem.style.strokeDashoffset = 0;
      stepEls.forEach(s => s.classList.add('is-open'));
      return;
    }
    drawBloom(sectionProgress(bloom));
    drawStatement();
    drawMarquee();
    drawProcess();
  };
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };

  if (reduceMotion) drawBloom(1);
  frame();
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
})();
