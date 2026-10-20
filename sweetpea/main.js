(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  // How far the viewport has travelled through a tall sticky section (0 → 1).
  const sectionProgress = node => {
    const r = node.getBoundingClientRect();
    const travel = r.height - window.innerHeight;
    return travel > 0 ? clamp(-r.top / travel) : (r.top <= 0 ? 1 : 0);
  };

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Mountain drawing ---------- */
  // Small seeded random so the ridges look the same on every visit.
  const rng = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  // A ridgeline by midpoint displacement, starting from a few hand-placed control heights.
  const ridgeline = (controls, rough, seed, iterations = 6) => {
    const rand = rng(seed);
    let pts = controls.map((y, i) => [-60 + (i / (controls.length - 1)) * 1720, y]);
    let spread = 1720 / (controls.length - 1) * rough;
    for (let it = 0; it < iterations; it++) {
      const next = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
        next.push(pts[i], [(x1 + x2) / 2, (y1 + y2) / 2 + (rand() - .5) * spread]);
      }
      next.push(pts[pts.length - 1]);
      pts = next;
      spread *= .5;
    }
    return pts;
  };

  // Pine silhouettes standing on a ridgeline.
  const pines = (pts, seed, minH, maxH, density) => {
    const rand = rng(seed);
    const yAt = x => {
      for (let i = 0; i < pts.length - 1; i++) {
        if (x <= pts[i + 1][0]) {
          const t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
          return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
        }
      }
      return pts[pts.length - 1][1];
    };
    let d = '';
    for (let x = -40; x < 1660; x += density * (.5 + rand())) {
      const h = minH + rand() * (maxH - minH), w = h * (.32 + rand() * .08), y = yAt(x) + 6;
      // three stacked tiers, widening towards the ground
      for (let k = 0; k < 3; k++) {
        const top = y - h + k * h * .22, bottom = y - h * .18 * (2 - k), half = w * (.55 + k * .25) / 2;
        d += `M${(x - half).toFixed(1)} ${bottom.toFixed(1)}L${x.toFixed(1)} ${top.toFixed(1)}L${(x + half).toFixed(1)} ${bottom.toFixed(1)}Z`;
      }
    }
    return d;
  };

  const fillBelow = (pts, bottom) =>
    `M-60 ${bottom} L${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} L1660 ${bottom} Z`;

  /* ---------- 1. Peaks hero ---------- */
  const peaks = document.querySelector('.peaks');
  const layersBox = peaks.querySelector('.peaks__layers');
  const sun = peaks.querySelector('.peaks__sun');
  const intro = peaks.querySelector('.peaks__intro');
  const reveal = peaks.querySelector('.peaks__reveal');

  // Back to front. `rise` is how far each layer climbs, as a share of the screen height:
  // nearer ridges move more, and the forest climbs right over the top to become the next section.
  const LAYERS = [
    { color: '#9DB4C0', controls: [650, 580, 420, 350, 470, 390, 520, 600], rough: .55, seed: 11, rise: .1 },
    { color: '#A3B19B', controls: [650, 560, 610, 500, 590, 520, 620], rough: .35, seed: 23, rise: .26 },
    { color: '#6E8A73', controls: [730, 680, 710, 650, 700, 690], rough: .22, seed: 37, rise: .55, trees: [5, 22, 46, 26] },
    { color: '#2F4A3A', controls: [805, 790, 815, 785, 800], rough: .1, seed: 41, rise: 1.08, trees: [7, 44, 96, 20] }
  ];
  const layers = LAYERS.map(L => {
    // Each layer is three screens tall so the risen forest still reaches the bottom of the screen.
    const svg = el('svg', { class: 'peaks__layer', viewBox: '0 0 1600 2700', preserveAspectRatio: 'xMidYMin slice' }, layersBox);
    const pts = ridgeline(L.controls, L.rough, L.seed);
    el('path', { d: fillBelow(pts, 2700) + (L.trees ? pines(pts, ...L.trees) : ''), fill: L.color }, svg);
    return { ...L, svg };
  });

  const drawPeaks = p => {
    const H = window.innerHeight;
    const climb = easeInOut(clamp(p / .78));
    layers.forEach(L => { L.svg.style.transform = `translateY(${(-climb * L.rise * H).toFixed(1)}px)`; });
    sun.style.transform = `translateY(${(-climb * .3 * H).toFixed(1)}px)`;

    const io = clamp(p / .3);
    intro.style.opacity = 1 - io;
    intro.style.transform = `translateY(${(-io * 80).toFixed(1)}px)`;

    const rv = easeOut(clamp((p - .62) / .22));
    reveal.style.opacity = rv;
    reveal.style.transform = `translateY(${((1 - rv) * 40).toFixed(1)}px)`;
    reveal.classList.toggle('is-live', rv > .5);
  };

  /* ---------- 2. Statement words ---------- */
  const statement = document.querySelector('.statement');
  const statementText = statement.querySelector('.statement__text');
  statementText.innerHTML = statementText.textContent.trim().split(/\s+/)
    .map(w => `<span class="w">${w}</span>`).join(' ');
  const words = [...statementText.querySelectorAll('.w')];
  const drawStatement = () => {
    const lit = Math.round(clamp(sectionProgress(statement) * 1.2) * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < lit));
  };

  /* ---------- 4. Marquee ---------- */
  const track = document.querySelector('.marquee__track');
  const PEAK_ICON = '<svg viewBox="0 0 60 24" aria-hidden="true"><path d="M2 22 C8 18 12 12 18 9 L23 13 L32 3 C37 10 44 18 58 22" fill="none" stroke="#B5583A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ITEMS = ['Social Media', 'Brand Overhauls', 'Marketing Strategy', 'Content Shoots', 'Reels'];
  track.innerHTML = Array(3).fill(ITEMS.map(t => `<span>${t}</span>${PEAK_ICON}`).join('')).join('');
  const drawMarquee = () => {
    const third = track.scrollWidth / 3;
    track.style.transform = `translateX(${-((window.scrollY * .35) % third)}px)`;
  };

  /* ---------- 5. Process trail ---------- */
  // A faint dotted trail, with a solid line hiking down it as you scroll; each marker lights up when reached.
  const steps = document.querySelector('.process__steps');
  const trailBase = steps.querySelector('path');
  trailBase.setAttribute('stroke-dasharray', '2 9');
  trailBase.setAttribute('opacity', '.35');
  const trail = trailBase.cloneNode();
  trail.removeAttribute('opacity');
  trail.setAttribute('d', 'M20 0 C 4 100, 36 200, 20 300 S 4 500, 20 600');
  trail.setAttribute('pathLength', '1');
  trail.setAttribute('stroke-dasharray', '1');
  trailBase.parentNode.appendChild(trail);
  const stepEls = [...steps.querySelectorAll('.step')];
  const drawProcess = () => {
    const r = steps.getBoundingClientRect();
    const p = clamp((window.innerHeight * .7 - r.top) / r.height);
    trail.style.strokeDashoffset = 1 - p;
    stepEls.forEach(s => s.classList.toggle('is-open', p >= Math.min(.85, (s.offsetTop + 10) / steps.offsetHeight)));
  };

  /* ---------- 8. Check-in ridge ---------- */
  const contactRidge = document.querySelector('.contact__ridge');
  const backRidge = ridgeline([210, 120, 170, 60, 150, 110, 190], .4, 5);
  const frontRidge = ridgeline([260, 235, 250, 220, 245, 240], .15, 9);
  el('path', { d: fillBelow(backRidge, 300), fill: '#9C4930' }, contactRidge);
  el('path', { d: fillBelow(frontRidge, 300) + pines(frontRidge, 3, 20, 46, 18), fill: '#2F4A3A' }, contactRidge);

  /* ---------- About mark ---------- */
  document.querySelector('.about__mark path')?.setAttribute('pathLength', '1');

  /* ---------- Nav ---------- */
  // Over the forest-green hero end and statement, the nav switches to light text.
  const nav = document.querySelector('.nav');
  const drawNav = () => {
    const pr = peaks.getBoundingClientRect(), sr = statement.getBoundingClientRect();
    const overForest = (sectionProgress(peaks) > .6 && pr.bottom > 60) || (sr.top < 60 && sr.bottom > 60);
    nav.classList.toggle('is-dark', overForest);
    nav.classList.toggle('is-solid', window.scrollY > 40 && !overForest);
  };

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(n => n.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    revealEls.forEach(n => io.observe(n));
  }

  /* ---------- Loop ---------- */
  let queued = false;
  const frame = () => {
    queued = false;
    drawNav();
    if (reduceMotion) {
      trail.style.strokeDashoffset = 0;
      stepEls.forEach(s => s.classList.add('is-open'));
      return;
    }
    drawPeaks(sectionProgress(peaks));
    drawStatement();
    drawMarquee();
    drawProcess();
  };
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };

  if (reduceMotion) drawPeaks(1);
  frame();
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
})();
