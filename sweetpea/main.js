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

  /* ---------- 1. Bloom hero ---------- */
  const bloom = document.querySelector('.bloom');
  const stage = bloom.querySelector('.bloom__stage');
  const svg = bloom.querySelector('.bloom__flower');
  const disc = bloom.querySelector('.bloom__disc');
  const petalGroup = bloom.querySelector('.bloom__petals');
  const intro = bloom.querySelector('.bloom__intro');
  const reveal = bloom.querySelector('.bloom__reveal');

  // The brandmark sunburst: 12 kite-shaped petals. Ratios taken from the submark SVG
  // (outer tip ≈ 0.89 of the disc radius, inner notch ≈ 0.45).
  const PETALS = 12, OUTER = .89, INNER = .45, HALF = Math.PI / PETALS;
  const ix = (INNER * Math.cos(HALF)).toFixed(4), iy = (INNER * Math.sin(HALF)).toFixed(4);
  const petals = [];
  for (let i = 0; i < PETALS; i++) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', `M0 0 L${ix} -${iy} L${OUTER} 0 L${ix} ${iy} Z`);
    petalGroup.appendChild(p);
    petals.push(p);
  }

  let W = 0, H = 0;
  const sizeStage = () => {
    W = stage.clientWidth; H = stage.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  };

  const drawBloom = p => {
    const full = Math.hypot(W, H) / 2 * 1.04;     // radius that covers the screen
    const r0 = Math.max(26, Math.min(W, H) * .05); // closed bud
    const budY = H - Math.max(70, H * .16);

    // Phase A (0 → .42): bud rises to centre and swells to fill the screen.
    const a = easeInOut(clamp(p / .42));
    const cx = W / 2, cy = lerp(budY, H / 2, a);
    const R = lerp(r0, full, a);
    const spin = p * 220;

    disc.setAttribute('cx', cx);
    disc.setAttribute('cy', cy);
    disc.setAttribute('r', R);

    // Phase B (.42 → .9): petals unfurl and fly out across the screen, staggered.
    petals.forEach((el, i) => {
      const t = easeOut(clamp((p - .42 - i * .014) / .32));
      const angle = (360 / PETALS) * i + spin;
      const dist = t * full * 1.25;
      const twist = t * 55;
      el.setAttribute('transform',
        `translate(${cx} ${cy}) rotate(${angle}) translate(${dist} 0) scale(${R * (1 + t * .35)}) rotate(${twist} .55 0)`);
    });

    // Intro fades away as the bud opens.
    const io = clamp(p / .16);
    intro.style.opacity = 1 - io;
    intro.style.transform = `translateY(${-io * 60}px) scale(${1 - io * .06})`;

    // Headline arrives once the petals have cleared.
    const rv = easeOut(clamp((p - .6) / .2));
    reveal.style.opacity = rv;
    reveal.style.transform = `translateY(${(1 - rv) * 48}px)`;
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
    const overPeach = (sectionProgress(bloom) > .3 && bloom.getBoundingClientRect().bottom > 60)
      || (statement.getBoundingClientRect().top < 60 && statement.getBoundingClientRect().bottom > 60);
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

  sizeStage();
  if (reduceMotion) drawBloom(1);
  frame();
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', () => { sizeStage(); if (reduceMotion) drawBloom(1); request(); });
})();
