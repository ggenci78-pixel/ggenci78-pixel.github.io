/* ==========================================================================
   fx.js — shared atmosphere layer
   1. WebGL ripple field that follows the pointer
   2. Page transitions between documents
   3. A small custom cursor that reacts to interactive elements
   Everything degrades gracefully: no WebGL → static gradient, no JS → plain page.
   ========================================================================== */

(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STILL = new URLSearchParams(location.search).has('still');
  const isTouch = window.matchMedia('(hover: none)').matches;

  /* ======================================================================
     1. RIPPLE FIELD
     A full-screen fragment shader. Pointer movement drops ripple sources
     into an array; each source is an expanding ring with its own decay.
     The rings displace a faint diagonal stripe field, which is the visual
     language carried over from the printed portfolio.
     ====================================================================== */

  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;

    uniform vec2  uRes;
    uniform float uTime;
    uniform vec4  uRipples[10];   // xy = position in uv, z = birth time, w = strength
    uniform int   uCount;
    uniform vec3  uA;             // top colour
    uniform vec3  uB;             // bottom colour
    uniform vec3  uAccent;        // stripe / crest colour
    uniform float uStripe;        // stripe visibility 0..1
    uniform vec2  uPointer;

    const float PI = 3.14159265359;

    float rippleH(vec2 uv, float aspect) {
      float h = 0.0;
      for (int i = 0; i < 10; i++) {
        if (i >= uCount) break;
        vec4 r = uRipples[i];
        float age = uTime - r.z;
        if (age < 0.0 || age > 3.2) continue;

        vec2 d = uv - r.xy;
        d.x *= aspect;
        float dist = length(d);

        float front = age * 0.42;
        float ring  = sin((dist - front) * 26.0) * exp(-abs(dist - front) * 11.0);
        float decay = exp(-age * 1.45) * r.w / (1.0 + dist * 2.6);
        h += ring * decay;
      }
      return h;
    }

    vec3 base(vec2 uv) {
      vec3 c = mix(uB, uA, smoothstep(0.0, 1.0, uv.y));

      // very soft light pool under the pointer
      vec2 p = uv - uPointer;
      p.x *= uRes.x / uRes.y;
      c += uAccent * 0.045 * exp(-dot(p, p) * 5.0);

      // diagonal stripes, thin and quiet
      float s = sin((uv.x * 1.6 + uv.y * 0.9) * 34.0);
      float stripe = smoothstep(0.55, 1.0, s);
      c += mix(vec3(0.0), uAccent, stripe) * 0.05 * uStripe;

      // fine grain
      float g = fract(sin(dot(uv * uRes, vec2(12.9898, 78.233))) * 43758.5453);
      c += (g - 0.5) * 0.022;

      return c;
    }

    void main() {
      float aspect = uRes.x / uRes.y;
      vec2 uv = gl_FragCoord.xy / uRes;

      float e = 1.5 / uRes.y;
      float h  = rippleH(uv, aspect);
      float hx = rippleH(uv + vec2(e, 0.0), aspect);
      float hy = rippleH(uv + vec2(0.0, e), aspect);
      vec2 grad = vec2(hx - h, hy - h) / e;

      vec2 uv2 = uv + grad * 0.006;
      vec3 col = base(uv2);

      // crest highlight: light catching the top of the wave
      col += uAccent * clamp(h * 1.5, 0.0, 1.0) * 0.35;
      // trough follows
      col -= vec3(0.02) * clamp(-h * 1.2, 0.0, 1.0);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function initRipple(canvas, opts) {
    const o = Object.assign(
      { a: '#0b0b10', b: '#050506', accent: '#ff2e7e', stripe: 1, strength: 1 },
      opts || {}
    );

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) {
      // fallback: static css background already covers this
      canvas.style.display = 'none';
      return null;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(prog, 'uRes'),
      time: gl.getUniformLocation(prog, 'uTime'),
      ripples: gl.getUniformLocation(prog, 'uRipples'),
      count: gl.getUniformLocation(prog, 'uCount'),
      a: gl.getUniformLocation(prog, 'uA'),
      b: gl.getUniformLocation(prog, 'uB'),
      accent: gl.getUniformLocation(prog, 'uAccent'),
      stripe: gl.getUniformLocation(prog, 'uStripe'),
      pointer: gl.getUniformLocation(prog, 'uPointer'),
    };

    gl.uniform3fv(u.a, hexToRgb(o.a));
    gl.uniform3fv(u.b, hexToRgb(o.b));
    gl.uniform3fv(u.accent, hexToRgb(o.accent));
    gl.uniform1f(u.stripe, o.stripe);

    const MAX = 10;
    const ripples = [];
    let count = 0;
    const data = new Float32Array(MAX * 4);

    let px = 0.5, py = 0.5, tpx = 0.5, tpy = 0.5;
    let lastX = null, lastY = null, travel = 0, lastDrop = 0;
    let t0 = performance.now();

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const w = canvas.clientWidth || canvas.offsetWidth || window.innerWidth;
      const h = canvas.clientHeight || canvas.offsetHeight || window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.res, canvas.width, canvas.height);
      if (reduce || STILL) {
        gl.uniform1f(u.time, 0);
        gl.uniform1i(u.count, 0);
        gl.uniform2f(u.pointer, -10, -10);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });

    function addRipple(nx, ny, strength) {
      const now = (performance.now() - t0) / 1000;
      ripples.push({ x: nx, y: 1 - ny, t: now, w: strength });
      if (ripples.length > MAX) ripples.shift();
      count = Math.min(ripples.length, MAX);
    }

    function onMove(clientX, clientY) {
      const w = window.innerWidth, h = window.innerHeight;
      tpx = clientX / w;
      tpy = clientY / h;
      if (lastX === null) { lastX = clientX; lastY = clientY; return; }
      const dx = clientX - lastX, dy = clientY - lastY;
      const speed = Math.hypot(dx, dy);
      lastX = clientX; lastY = clientY;
      travel += speed;
      const now = performance.now();
      if (travel > 8 && now - lastDrop > 32) {
        addRipple(tpx, tpy, Math.min(1.0, 0.23 + travel / 220));
        travel = 0;
        lastDrop = now;
      }
    }

    window.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY), { passive: true });
    window.addEventListener('pointerdown', (e) => {
      onMove(e.clientX, e.clientY);
      addRipple(e.clientX / window.innerWidth, e.clientY / window.innerHeight, 1.8);
    }, { passive: true });

    // ambient ripples so the surface is never dead
    if (!reduce && !STILL) {
      setInterval(() => {
        const nx = 0.15 + Math.random() * 0.7;
        const ny = 0.2 + Math.random() * 0.6;
        addRipple(nx, ny, 0.35);
      }, 3800);
    }

    let raf = null;

    function frame() {
      const now = (performance.now() - t0) / 1000;
      px += (tpx - px) * 0.08;
      py += (tpy - py) * 0.08;

      // rebuild the uniform array, dropping expired rings
      let n = 0;
      for (let i = 0; i < ripples.length && n < MAX; i++) {
        const r = ripples[i];
        if (now - r.t > 3.2) continue;
        data[n * 4] = r.x;
        data[n * 4 + 1] = r.y;
        data[n * 4 + 2] = r.t;
        data[n * 4 + 3] = r.w * o.strength;
        n++;
      }
      count = n;

      gl.uniform1f(u.time, now);
      gl.uniform1i(u.count, count);
      gl.uniform4fv(u.ripples, data);
      gl.uniform2f(u.pointer, px, 1 - py);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }

    if (reduce || STILL) {
      gl.uniform1f(u.time, 0);
      gl.uniform1i(u.count, 0);
      gl.uniform2f(u.pointer, -10, -10);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else if (!STILL) {
      raf = requestAnimationFrame(frame);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
        else if (!raf) raf = requestAnimationFrame(frame);
      });
    }

    return {
      pulse(x, y, s) { addRipple(x / window.innerWidth, y / window.innerHeight, s || 1.5); },
    };
  }

  window.__initRipple = initRipple;

  document.querySelectorAll('canvas[data-ripple]').forEach((c) => {
    initRipple(c, {
      a: c.dataset.top || '#0b0b10',
      b: c.dataset.bottom || '#050506',
      accent: c.dataset.accent || '#ff2e7e',
      stripe: c.dataset.stripe ? parseFloat(c.dataset.stripe) : 1,
      strength: c.dataset.strength ? parseFloat(c.dataset.strength) : 1,
    });
  });

  // A transparent surface keeps feedback visible over opaque project images.
  if (!reduce && !STILL) {
    const surface = document.createElement('canvas');
    surface.className = 'ripple-trail';
    surface.setAttribute('aria-hidden', 'true');
    Object.assign(surface.style, { position:'fixed', inset:'0', width:'100%', height:'100%', pointerEvents:'none', zIndex:'500' });
    document.body.appendChild(surface);
    const context = surface.getContext('2d');
    const light = document.body.hasAttribute('data-archive-app') && document.body.dataset.theme !== 'dark';
    const drops = [];
    let frameId = 0, lastPoint = null, lastAt = 0;
    function sizeSurface() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      surface.width = Math.round(innerWidth * dpr);
      surface.height = Math.round(innerHeight * dpr);
      context?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function paint(now) {
      frameId = 0;
      if (!context || document.hidden) return;
      context.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i], age = (now - d.time) / d.duration;
        if (age >= 1) { drops.splice(i, 1); continue; }
        for (let k = 0; k < 2; k++) {
          const radius = 3 + age * d.radius - k * 7;
          if (radius <= 0) continue;
          const alpha = Math.pow(1 - age, 2) * d.alpha * (k ? .4 : 1);
          context.strokeStyle = light ? `rgba(63,105,115,${alpha})` : `rgba(214,224,238,${alpha})`;
          context.lineWidth = k ? .6 : 1;
          context.beginPath();
          context.ellipse(d.x, d.y, radius, radius * .8, -.3, 0, Math.PI * 2);
          context.stroke();
        }
      }
      if (drops.length) frameId = requestAnimationFrame(paint);
    }
    function drop(e, click) {
      if (!context || document.hidden) return;
      const parent = e.target.closest?.('dialog[open]') || document.body;
      if (surface.parentNode !== parent) parent.appendChild(surface);
      const now = performance.now();
      if (!click && lastPoint && (Math.hypot(e.clientX-lastPoint.x, e.clientY-lastPoint.y) < 9 || now-lastAt < 28)) return;
      lastPoint = { x:e.clientX, y:e.clientY };
      lastAt = now;
      drops.push({ x:e.clientX, y:e.clientY, time:now, radius:click ? 170 : 48, alpha:click ? .36 : .15, duration:click ? 1300 : 800 });
      if (drops.length > 45) drops.shift();
      if (!frameId) frameId = requestAnimationFrame(paint);
    }
    sizeSurface();
    window.addEventListener('resize', sizeSurface, { passive:true });
    window.addEventListener('pointermove', e => drop(e, false), { passive:true });
    window.addEventListener('pointerdown', e => drop(e, true), { passive:true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(frameId); frameId = 0; drops.length = 0; context?.clearRect(0,0,innerWidth,innerHeight); }
    });
  }

  // The archive owns same-document routing; legacy documents retain their wipe.
  if (document.body.hasAttribute('data-archive-app')) return;

  /* ======================================================================
     2. PAGE TRANSITION
     A panel wipes up over the page, the next document loads with the panel
     already covering the viewport, then it wipes away.
     ====================================================================== */

  const veil = document.createElement('div');
  veil.className = 'veil';
  veil.setAttribute('aria-hidden', 'true');
  veil.innerHTML = '<span class="veil__label"></span><i class="veil__bar"></i>';
  document.body.appendChild(veil);

  // entering: play the cover away
  requestAnimationFrame(() => {
    requestAnimationFrame(() => veil.classList.add('is-out'));
  });

  let leaving = false;

  function go(href) {
    if (leaving) return;
    leaving = true;
    const label = veil.querySelector('.veil__label');
    if (label) label.textContent = '';
    veil.classList.remove('is-out');
    veil.classList.add('is-in');
    document.body.classList.add('is-leaving');
    const wait = reduce ? 60 : 620;
    setTimeout(() => { window.location.href = href; }, wait);
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http')) return;
    if (a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!href.endsWith('.html') && !href.includes('.html#')) return;
    e.preventDefault();
    go(href);
  });

  window.__navigate = go;

  // bfcache restore
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      leaving = false;
      veil.classList.remove('is-in');
      veil.classList.add('is-out');
      document.body.classList.remove('is-leaving');
    }
  });

  /* ======================================================================
     3. CURSOR
     ====================================================================== */

  if (!isTouch && !reduce) {
    const cur = document.createElement('div');
    cur.className = 'cursor';
    cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<i></i>';
    document.body.appendChild(cur);

    let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    let tx = cx, ty = cy;
    let seen = false;

    window.addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!seen) { seen = true; cx = tx; cy = ty; cur.classList.add('is-on'); }
      const t = e.target.closest('a, button, [data-hover]');
      cur.classList.toggle('is-hover', !!t);
    }, { passive: true });

    window.addEventListener('pointerleave', () => cur.classList.remove('is-on'));

    (function loop() {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    })();
  }
})();
