import { wheelDistance } from './cover-index.js';

export const stackStep = 110;
export const stackIndex = (position, count) => Math.max(0, Math.min(count - 1, Math.round(position)));
export const stackDamp = (value, target, elapsed, duration = 130) => {
  const next = value + (target - value) * (1 - Math.exp(-elapsed / duration));
  return Math.abs(next - target) < .001 ? target : next;
};
export const stackCategoryName = category => ({
  '产品视觉':'产品', '人物传播':'人物营销', '社交内容':'社交媒体',
  '展览艺术':'展览', '体育传播':'体育', '信息设计':'信息设计',
  '公共活动':'公共活动', '影视叙事':'电影', '现场演出':'演出',
  '知识活动':'讲座', '短视频封面':'短视频',
  '摄影数据生产':'摄影', '插画数据生产':'插画'
}[category] || category);
export function stackPose(distance, hovered = false, reduced = false, expansion = 0) {
  const focus = Math.exp(-distance * distance * 3);
  return {
    y: -distance * .92,
    z: reduced ? distance * .01 : distance * .5 + expansion * 1.6,
    scale: 1,
    tilt: reduced ? 0 : .82 * (1 - expansion),
    brightness: reduced || hovered || expansion ? 1 : .82 + .18 * focus
  };
}

export function mountImageStack(root, state, reduced, openEntry) {
  if (!root) return () => {};
  const viewport = root.querySelector('.stack-scroll');
  const items = [...root.querySelectorAll('[data-stack-item]')];
  const current = root.querySelector('[data-stack-current]');
  const status = root.querySelector('[data-stack-status]');
  const gallery = root.dataset.stackKind === 'gallery';
  const signal = new AbortController();
  const saved = items.findIndex(item => item.dataset.stackItem === state.stackCursor);
  let position = saved >= 0 ? Math.max(0,Math.min(items.length-1,state.stackPosition ?? saved)) : Math.min(3, items.length - 1);
  let active = stackIndex(position, items.length), hovered = -1, disposed = false;
  let renderer, scene, camera, raycaster, meshes = [], frame = 0, inView = true;
  let pointerDown, dragged = false, requestDraw = () => {};
  let focused = -1, hoverTimer, visualPosition = position, lastFrame = 0;
  let previousCaption = -1, previousActive = -1, lastScrollAt = 0;
  const expansions = new Float64Array(items.length);
  const textures = new Map(), loading = new Set();
  const cleanup = [];
  function update() {
    active = stackIndex(position, items.length);
    state.stackCursor = items[active].dataset.stackItem;
    state.stackPosition = position;
    const captionIndex = hovered >= 0 ? hovered : active;
    if (captionIndex !== previousCaption) {
      current.querySelector('span').textContent = items[captionIndex].dataset.label;
      current.setAttribute('aria-label', `打开作品：${items[captionIndex].dataset.title}`);
      previousCaption = captionIndex;
    }
    if (active !== previousActive) {
      status.textContent = `${String(active + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
      if (previousActive >= 0) items[previousActive].setAttribute('aria-current', 'false');
      items[active].setAttribute('aria-current', 'true');
      previousActive = active;
    }
  }
  function select(index) {
    const target = stackIndex(index, items.length);
    viewport.scrollTo({top: target * stackStep, behavior: reduced ? 'instant' : 'smooth'});
  }
  function open(index) {
    index = stackIndex(index, items.length);
    const item = items[stackIndex(index, items.length)];
    state.stackCursor = item.dataset.stackItem;
    state.stackPosition = position;
    openEntry(item.dataset.stackItem);
  }
  viewport.addEventListener('scroll', () => {
    position = viewport.scrollTop / stackStep;
    hovered = focused = -1;
    clearTimeout(hoverTimer);
    lastScrollAt = performance.now();
    root.dataset.hovered = 'false';
    update();
    requestDraw();
  }, {signal:signal.signal, passive:true});
  viewport.addEventListener('wheel', event => {
    if (!renderer || reduced || event.ctrlKey) return;
    const delta = wheelDistance(event, viewport.clientHeight) * .55;
    const top = viewport.scrollTop;
    const target = Math.max(0, Math.min((items.length - 1) * stackStep, top + delta));
    if (target === top) return;
    event.preventDefault();
    viewport.scrollTop = target;
  }, {signal:signal.signal, passive:false});
  viewport.addEventListener('keydown', event => {
    if (!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(event.key)) return;
    event.preventDefault();
    select(event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 :
      active + ({ArrowUp:-1, ArrowDown:1, PageUp:-4, PageDown:4}[event.key]));
  }, {signal:signal.signal});
  root.addEventListener('click', event => {
    if (event.target.closest('[data-stack-current]')) open(hovered >= 0 ? hovered : active);
  }, {signal:signal.signal});
  viewport.addEventListener('focusin', event => {
    const item = event.target.closest('[data-stack-item]');
    if (item) select(items.indexOf(item));
  }, {signal:signal.signal});
  function hit(event) {
    if (!renderer) return -1;
    const rect = viewport.getBoundingClientRect();
    raycaster.setFromCamera({x:(event.clientX-rect.left)/rect.width*2-1,y:1-(event.clientY-rect.top)/rect.height*2}, camera);
    return raycaster.intersectObjects(meshes.filter(mesh => mesh.visible))[0]?.object.userData.index ?? -1;
  }
  viewport.addEventListener('pointerdown', event => {
    dragged = false;
    pointerDown = {x:event.clientX,y:event.clientY,scroll:viewport.scrollTop};
    if (event.pointerType === 'mouse') viewport.setPointerCapture(event.pointerId);
  }, {signal:signal.signal});
  viewport.addEventListener('pointermove', event => {
    if (pointerDown) {
      if (Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y)>7) dragged = true;
      if (event.pointerType === 'mouse' && dragged) viewport.scrollTop = pointerDown.scroll + pointerDown.y-event.clientY;
    }
    const index = pointerDown || event.pointerType !== 'mouse' ? -1 : hit(event);
    if (index !== hovered) {
      hovered = index;
      clearTimeout(hoverTimer);
      if (index < 0) focused = -1;
      else hoverTimer = setTimeout(() => {
        if (disposed || hovered !== index || performance.now() - lastScrollAt < 100) return;
        focused = index;
        requestDraw();
      }, 120);
      root.dataset.hovered = String(index >= 0);
      update();
      requestDraw();
    }
  }, {signal:signal.signal});
  const release = () => { pointerDown = null; };
  viewport.addEventListener('pointerup', release, {signal:signal.signal});
  viewport.addEventListener('pointercancel', release, {signal:signal.signal});
  viewport.addEventListener('pointerleave', () => {
    hovered = focused = -1; clearTimeout(hoverTimer);
    root.dataset.hovered = 'false'; update(); requestDraw();
  }, {signal:signal.signal});
  viewport.addEventListener('click', event => {
    if (dragged || event.defaultPrevented) return;
    const item = event.target.closest('[data-stack-item]');
    if (!renderer || event.detail === 0) {
      if (item) open(items.indexOf(item));
    } else {
      const index = hit(event);
      if (index >= 0) open(index);
    }
  }, {signal:signal.signal});
  update();

  // Native touch momentum and normalized wheel input share one continuously eased position.
  import('./three.module.min.js').then(THREE => {
    if (disposed) return;
    try {
      renderer = new THREE.WebGLRenderer({alpha:true,antialias:true});
    } catch {
      root.dataset.renderer = 'native';
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x111111,0);
    renderer.domElement.className = 'stack-canvas';
    renderer.domElement.setAttribute('aria-hidden','true');
    root.querySelector('.stack-stage').prepend(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(36,1,.1,50);
    camera.position.z = 11;
    raycaster = new THREE.Raycaster();
    const geometry = new THREE.PlaneGeometry(6.7,4.15);
    const fit = (ctx, img, x, y, width, height) => {
      const ratio = Math.min(width/img.naturalWidth,height/img.naturalHeight);
      const w=img.naturalWidth*ratio,h=img.naturalHeight*ratio;
      ctx.drawImage(img,x+(width-w)/2,y+(height-h)/2,w,h);
    };
    function load(index) {
      if (loading.has(index) || textures.has(index)) return;
      loading.add(index);
      const item = items[index];
      Promise.all([...item.querySelectorAll('img')].map(source => new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = source.currentSrc || source.src;
      }))).then(images => {
        loading.delete(index);
        if (disposed) return;
        const canvas = document.createElement('canvas');
        canvas.width = 1200; canvas.height = 744;
        if (gallery && images[0]) {
          const img = images[0];
          const ratio = img.naturalWidth / img.naturalHeight;
          canvas.width = Math.round(Math.min(1200, 1200 * ratio));
          canvas.height = Math.round(Math.min(1200, 1200 / ratio));
          meshes[index].userData.bounds = {
            x: Math.min(6.7, 4.15 * ratio) / 6.7,
            y: Math.min(4.15, 6.7 / ratio) / 4.15
          };
        }
        const ctx = canvas.getContext('2d');
        if (gallery && images[0]) ctx.drawImage(images[0],0,0,canvas.width,canvas.height);
        else {
          ctx.fillStyle='#080808'; ctx.fillRect(0,0,1200,744);
          ctx.fillStyle='#f5f5f3'; ctx.fillRect(0,0,1200,44);
          ctx.fillStyle='#151515'; ctx.font='24px sans-serif';
          ctx.fillText(item.dataset.label,22,30);
          const count = images.length, width=(1000-(count-1)*28)/count;
          images.forEach((img,i) => {
            if (img) fit(ctx,img,100+i*(width+28),64,width,660);
          });
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace=THREE.SRGBColorSpace;
        texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
        textures.set(index,texture);
        meshes[index].material.map=texture;
        meshes[index].material.needsUpdate=true;
        requestDraw();
      });
    }
    meshes = items.map((item,index) => {
      const material = new THREE.MeshBasicMaterial({color:0x888888,side:THREE.DoubleSide});
      const mesh = new THREE.Mesh(geometry,material);
      mesh.userData.index=index;
      scene.add(mesh);
      return mesh;
    });
    function draw(now) {
      frame=0;
      if (disposed || !inView) return;
      const elapsed = Math.min(64,now-(lastFrame || now-16));
      lastFrame=now;
      visualPosition = reduced ? position : stackDamp(visualPosition,position,elapsed);
      let moving=visualPosition!==position;
      expansions.forEach((value,index) => {
        const target = index===focused && !reduced ? 1 : 0;
        expansions[index]=stackDamp(value,target,elapsed,110);
        if(expansions[index]!==target) moving=true;
      });
      meshes.forEach((mesh,index) => {
        const expansion=expansions[index];
        const distance=index-visualPosition, pose=stackPose(distance,index===hovered,reduced,expansion);
        mesh.visible=Math.abs(distance)<7;
        if (!mesh.visible) return;
        let clearance=0;
        expansions.forEach((amount,other) => {
          if (other!==index) clearance+=Math.sign(index-other)*amount*1.4;
        });
        mesh.position.set(0,pose.y*(1-expansion)-clearance,pose.z);
        mesh.rotation.x=pose.tilt;
        const bounds=mesh.userData.bounds || {x:1,y:1};
        mesh.scale.set(bounds.x*pose.scale,bounds.y*pose.scale,1);
        mesh.renderOrder=expansion>.05 ? 1 : 0;
        mesh.material.depthTest=expansion<=.05;
        mesh.userData.light=stackDamp(mesh.userData.light ?? pose.brightness,pose.brightness,elapsed,90);
        mesh.material.color.setScalar(mesh.userData.light);
        if (mesh.userData.light!==pose.brightness) moving=true;
        load(index);
      });
      textures.forEach((texture,index) => {
        if(Math.abs(index-position)<10) return;
        texture.dispose();textures.delete(index);
        meshes[index].material.map=null;
        meshes[index].material.needsUpdate=true;
      });
      renderer.render(scene,camera);
      if (moving) requestDraw();
    }
    requestDraw=() => { if (!frame && !disposed) frame=requestAnimationFrame(draw); };
    function resize() {
      const rect=viewport.getBoundingClientRect();
      renderer.setSize(rect.width,rect.height,false);
      camera.aspect=rect.width/rect.height;
      // Keep every plane inside narrow viewports without changing its artwork ratio.
      const halfWidth=rect.width<750 ? 5.4 : 3.85;
      camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.max(3.5,halfWidth/camera.aspect)/11));
      camera.updateProjectionMatrix();
      requestDraw();
    }
    root.dataset.renderer='three';
    root.style.setProperty('--stack-length',String(items.length));
    viewport.scrollTop=position*stackStep;
    const resizeObserver=new ResizeObserver(resize);
    resizeObserver.observe(viewport);
    const visibility=new IntersectionObserver(entries => {
      inView=entries[0].isIntersecting;
      if(inView) requestDraw();
    });
    visibility.observe(root);
    cleanup.push(() => {resizeObserver.disconnect();visibility.disconnect();geometry.dispose();});
    resize();
    requestDraw();
  }).catch(() => { if (!disposed) root.dataset.renderer='native'; });
  return () => {
    disposed=true;signal.abort();cancelAnimationFrame(frame);clearTimeout(hoverTimer);
    cleanup.forEach(fn=>fn());
    textures.forEach(texture=>texture.dispose());
    meshes.forEach(mesh=>mesh.material.dispose());
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
  };
}
