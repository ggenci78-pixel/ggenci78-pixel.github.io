export function introComposition(width, height, compact = false) {
  const footerHeight = compact ? 132 : 100;
  const footerTop = height - 20 - footerHeight;
  const reservedEnterTop = footerTop - (compact ? 74 : 86);
  const signatureTop = compact
    ? Math.min(reservedEnterTop - 82, height * .48)
    : reservedEnterTop - 72;
  const enterTop = compact ? signatureTop + 82 : reservedEnterTop;
  const size = Math.min(width / 3.55, 300, Math.max(40, signatureTop - 92));
  return {
    size, nameY: signatureTop - 20 - size / 2, signatureTop, enterTop,
    footerTop, measure: Math.min(width, Math.max(640, size * 3.25))
  };
}

// The signature layout changes; the original spring and opening physics stay intact.
export function createNameField(canvas, onEnter) {
  const ctx = canvas.getContext('2d');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const still = new URLSearchParams(location.search).has('still');
  let lines = [], width = 0, height = 0, raf = 0, active = false, last = 0;
  let opening = null, origin = { x: 0, y: 0 };
  let nameY = 0;
  const pointer = { x: -10000, y: -10000 };
  const colors = ['#799ad6', '#cb8b75', '#7c9e7d', '#bbab62'];

  function build() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || !ctx) return;
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const off = document.createElement('canvas');
    off.width = Math.ceil(width);
    off.height = Math.ceil(height);
    const o = off.getContext('2d', { willReadFrequently: true });
    const composition = introComposition(width, height, matchMedia('(max-width: 680px)').matches);
    const { size, signatureTop, enterTop, measure } = composition;
    nameY = composition.nameY;
    canvas.parentElement.style.setProperty('--signature-top', `${signatureTop}px`);
    canvas.parentElement.style.setProperty('--enter-top', `${enterTop}px`);
    canvas.parentElement.style.setProperty('--name-measure', `${measure}px`);
    o.font = `600 ${size}px "PingFang SC", "Microsoft Yahei", sans-serif`;
    o.fillStyle = '#000';
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    const glyphs = [...'曾慧婷'], gap = size * .07;
    const advances = glyphs.map(glyph => o.measureText(glyph).width);
    let left = (width - advances.reduce((sum, value) => sum + value, gap * (glyphs.length - 1))) / 2;
    glyphs.forEach((glyph, i) => {
      o.fillText(glyph, left + advances[i] / 2, nameY);
      left += advances[i] + gap;
    });
    const pixels = o.getImageData(0, 0, off.width, off.height).data;
    const step = width < 680 ? 3 : 4;
    lines = [];
    for (let y = 0; y < off.height; y += step) {
      let start = -1;
      for (let x = 0; x <= off.width; x++) {
        const on = x < off.width && pixels[(y * off.width + x) * 4 + 3] > 120;
        if (on && start < 0) start = x;
        if (!on && start >= 0) {
          if (x - start > 2) {
            const nodes = [];
            const count = Math.max(2, Math.ceil((x - start) / 5));
            for (let i = 0; i <= count; i++) {
              const hx = start + (x - start) * i / count;
              nodes.push({ hx, hy: y, x: hx, y, vx: 0, vy: 0 });
            }
            lines.push(nodes);
          }
          start = -1;
        }
      }
    }
    draw(performance.now());
  }

  function frame(time) {
    raf = 0;
    if (!active || document.hidden) return;
    draw(time);
    if (!motion.matches && !still) raf = requestAnimationFrame(frame);
  }

  function draw(time) {
    if (!ctx || !width) return;
    const dt = Math.min(2, Math.max(.3, (time - last) / 16.667 || 1));
    last = time;
    const progress = opening ? Math.min(1, (time - opening.start) / 1050) : 0;
    const eased = 1 - Math.pow(1 - progress, 3);
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineWidth = width < 680 ? 1.1 : 1.45;
    const radius = width < 680 ? 80 : 130;
    lines.forEach((line, index) => {
      const group = index % 4;
      ctx.strokeStyle = progress > .15 ? colors[group] : '#e8e7e2';
      ctx.globalAlpha = 1 - Math.max(0, progress - .65) / .35;
      ctx.beginPath();
      line.forEach((n, i) => {
        const dx = n.hx - pointer.x, dy = n.hy - pointer.y;
        const distance = Math.hypot(dx, dy);
        const force = motion.matches ? 0 : Math.pow(Math.max(0, 1 - distance / radius), 2);
        const targetX = n.hx + dx * force * .28;
        const targetY = n.hy + (dy * .34 + Math.sin(n.hx * .045 - time * .006) * 24) * force;
        n.vx = (n.vx + (targetX - n.x) * .12 * dt) * Math.pow(.72, dt);
        n.vy = (n.vy + (targetY - n.y) * .12 * dt) * Math.pow(.72, dt);
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        let x = n.x, y = n.y;
        if (opening) {
          // Four line families fan out toward the archive's horizontal files.
          const outX = n.hx + (n.hx - origin.x) * .42;
          const outY = height * (.23 + group * .16) + (index % 11) * 1.6;
          x += (outX - x) * eased;
          y += (outY - y) * eased;
          y += Math.sin(progress * Math.PI) * Math.sin(n.hx * .01 + group) * 35;
        }
        if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    if (opening && progress >= 1) {
      const resolve = opening.resolve;
      opening = null;
      resolve();
    }
  }

  function start() {
    active = true;
    canvas.parentElement.classList.remove('is-opening');
    pointer.x = pointer.y = -10000;
    build();
    if (!raf && !motion.matches && !still) raf = requestAnimationFrame(frame);
  }
  function stop() {
    active = false;
    cancelAnimationFrame(raf);
    raf = 0;
    if (opening) { opening.resolve(); opening = null; }
  }
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
  }, { passive: true });
  canvas.addEventListener('pointerleave', () => { pointer.x = pointer.y = -10000; });
  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    onEnter({ x: e.clientX - r.left, y: e.clientY - r.top });
  });
  new ResizeObserver(() => { if (active) build(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (active && !raf && !motion.matches && !still) raf = requestAnimationFrame(frame);
  });
  motion.addEventListener('change', () => {
    if (motion.matches && opening) { opening.resolve(); opening = null; }
    if (active) { cancelAnimationFrame(raf); raf = 0; start(); }
  });
  document.fonts.ready.then(() => { if (active) build(); });
  return {
    start, stop,
    open(point) {
      if (motion.matches || still || !ctx) return Promise.resolve();
      canvas.parentElement.classList.add('is-opening');
      origin = point || { x: width / 2, y: nameY };
      return new Promise(resolve => { opening = { start: performance.now(), resolve }; });
    },
  };
}
