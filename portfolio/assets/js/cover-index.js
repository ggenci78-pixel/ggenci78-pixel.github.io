export const coverStart = (keys, selected) => {
  const found = keys.indexOf(selected);
  return found >= 0 ? found : Math.floor((keys.length - 1) / 2);
};

export function coverAppearance(distance, reduced = false) {
  const proximity = Math.max(0, 1 - Math.abs(distance));
  const weight = proximity * proximity * (3 - 2 * proximity);
  return {
    scale: reduced ? 1 : .88 + .12 * weight,
    lift: reduced ? 0 : -22 * weight,
    brightness: .46 + .54 * weight
  };
}

export function wheelDistance(event, pageSize) {
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? pageSize : 1;
  return Math.max(-pageSize * .7, Math.min(pageSize * .7, delta * unit));
}

export function moveCoverBy(api, distance, reduced) {
  // Pinned Embla 8.6 handles interpolation and drag physics; wheel input only moves its target.
  const engine = api.internalEngine();
  const target = engine.target.get();
  const next = engine.limit.constrain(target - distance);
  engine.scrollBody.useBaseFriction().useDuration(reduced ? 0 : 24);
  engine.scrollTo.distance(next - target, false);
}

export function mountCoverIndex(root, state, reduced, onStage) {
  if (!root) return () => {};
  const viewport = root.querySelector('.cover-viewport');
  const items = [...root.querySelectorAll('.cover-item')];
  const ticks = [...root.querySelectorAll('[data-cover-tick]')];
  const signal = new AbortController();
  let index = coverStart(items.map(item => item.dataset.key), state.selected);
  let stage = state.stage === 'focus' ? 'focus' : 'index';
  let api, animations = [], animationVersion = 0;
  let viewportWidth = viewport.getBoundingClientRect().width;
  const prev = root.querySelector('[data-cover-prev]');
  const next = root.querySelector('[data-cover-next]');
  root.dataset.stage = stage;
  function renderFlow() {
    if (!api) return;
    const engine = api.internalEngine();
    const spacing = Math.abs(engine.scrollSnaps[1] - engine.scrollSnaps[0]) || viewportWidth;
    const offsets = engine.scrollSnaps.map(snap => (engine.offsetLocation.get() - snap) / spacing);
    items.forEach((item, i) => {
      const appearance = coverAppearance(offsets[i], reduced);
      item.style.setProperty('--cover-scale', appearance.scale.toFixed(4));
      item.style.setProperty('--cover-lift', `${appearance.lift.toFixed(2)}px`);
      item.style.setProperty('--cover-light', appearance.brightness.toFixed(4));
      item.style.setProperty('--cover-drift', `${(Math.max(-1, Math.min(1, -offsets[i])) * 10).toFixed(2)}px`);
    });
  }
  const update = () => {
    index = api ? api.selectedScrollSnap() : index;
    state.selected = items[index].dataset.key;
    items.forEach((item, i) => {
      const active = index === i;
      item.classList.toggle('is-selected', active);
      const button = item.querySelector('[data-cover-open]');
      button.setAttribute('aria-expanded', String(active && stage === 'focus'));
      button.setAttribute('aria-label', `${active && stage === 'focus' ? '查看项目' : '展开封面'}：${button.dataset.title}`);
      const title = item.querySelector('.cover-title');
      title.setAttribute('aria-hidden', String(!active || stage !== 'focus'));
    });
    ticks.forEach((tick, i) => tick.setAttribute('aria-pressed', String(i === index)));
    root.querySelectorAll('[data-cover-info]').forEach(info => { info.hidden = info.dataset.coverInfo !== state.selected; });
    root.querySelector('[data-cover-status]').textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    prev.disabled = index === 0;
    next.disabled = index === items.length - 1;
  };
  if (window.EmblaCarousel) {
    api = window.EmblaCarousel(viewport, {
      align: 'center', containScroll: false, startIndex: index,
      dragFree: !reduced && stage === 'index', skipSnaps: true,
      duration: reduced ? 0 : 32
    });
    api.on('select', update);
    api.on('scroll', renderFlow).on('reInit', () => {
      viewportWidth = viewport.getBoundingClientRect().width;
      renderFlow();
    });
  } else root.classList.add('native-cover-index');

  function select(value) {
    index = Math.max(0, Math.min(items.length - 1, value));
    if (api) api.scrollTo(index, reduced);
    else { items[index].scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'nearest', inline: 'center' }); update(); }
  }
  function changeStage(value, selected = index) {
    const version = ++animationVersion;
    const before = items.map(item => item.querySelector('.cover-frame').getBoundingClientRect());
    animations.forEach(animation => animation.cancel());
    stage = value;
    state.stage = stage;
    root.dataset.stage = stage;
    onStage(stage);
    index = selected;
    if (api) api.reInit({ startIndex: selected, dragFree: !reduced && stage === 'index' });
    update();
    renderFlow();
    if (!reduced) {
      root.dataset.animating = 'true';
      animations = items.map((item, i) => {
        const frame = item.querySelector('.cover-frame');
        const after = frame.getBoundingClientRect(), old = before[i];
        const base = frame.ownerDocument?.defaultView?.getComputedStyle(frame).transform || 'none';
        const scaleX = old.width / after.width, scaleY = old.height / after.height;
        const x = old.left + old.width / 2 - after.left - after.width / 2;
        const y = old.top + old.height / 2 - after.top - after.height / 2;
        return frame.animate([
          { transform: `translate(${x}px,${y}px) scale(${scaleX},${scaleY}) ${base === 'none' ? '' : base}` },
          { transform: base }
        ], { duration: 760, easing: 'cubic-bezier(.22,1,.36,1)' });
      });
      Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
        if (version === animationVersion) delete root.dataset.animating;
      });
    }
  }
  root.addEventListener('click', e => {
    const open = e.target.closest('[data-cover-open]');
    const tick = e.target.closest('[data-cover-tick]');
    if (open) {
      if (e.defaultPrevented) return;
      const value = items.indexOf(open.closest('.cover-item'));
      if (stage === 'index') changeStage('focus', value);
      else if (value === index) root.querySelector(`.cover-focus-info [data-cover-info="${state.selected}"] .cover-explore`)?.click();
      else select(value);
    }
    if (tick) select(Number(tick.dataset.coverTick));
    if (e.target.closest('[data-cover-prev]')) select(index - 1);
    if (e.target.closest('[data-cover-next]')) select(index + 1);
  }, { signal: signal.signal });
  viewport.addEventListener('wheel', e => {
    if (e.ctrlKey) return;
    const delta = wheelDistance(e, viewportWidth);
    if (!delta) return;
    e.preventDefault();
    if (stage === 'focus') changeStage('index');
    if (api) moveCoverBy(api, delta, reduced);
    else viewport.scrollBy({ left: delta, behavior: 'instant' });
  }, { signal: signal.signal, passive: false });
  root.addEventListener('keydown', e => {
    if (e.key === 'Escape' && stage === 'focus') { e.preventDefault(); changeStage('index'); }
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
    if (e.target.matches('select')) return;
    e.preventDefault();
    select(e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : index + (e.key === 'ArrowRight' ? 1 : -1));
  }, { signal: signal.signal });
  const back = document.querySelector('#page-back');
  back.addEventListener('click', e => {
    if (stage !== 'focus') return;
    e.preventDefault();
    e.stopPropagation();
    changeStage('index');
    viewport.focus({ preventScroll: true });
  }, { signal: signal.signal });
  onStage(stage);
  update();
  renderFlow();
  return () => { animationVersion++; signal.abort(); animations.forEach(animation => animation.cancel()); api?.destroy(); };
}

export function mountMediaIndex(root, reduced) {
  if (!root) return () => {};
  const buttons = [...root.querySelectorAll('.media-index [data-media-target]')];
  const targets = buttons.map(button => root.querySelector(`#${button.dataset.mediaTarget}`));
  const signal = new AbortController();
  root.addEventListener('click', e => {
    const button = e.target.closest('[data-media-target]');
    if (button) root.querySelector(`#${button.dataset.mediaTarget}`)?.scrollIntoView({
      behavior: reduced ? 'instant' : 'smooth', block: 'start'
    });
  }, { signal: signal.signal });
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0];
    if (visible) buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mediaTarget === visible.target.id)));
  }, { rootMargin: '-12% 0px -25% 0px', threshold: [0, .25, .5, .75] });
  targets.filter(Boolean).forEach(target => observer.observe(target));
  return () => { signal.abort(); observer.disconnect(); };
}
