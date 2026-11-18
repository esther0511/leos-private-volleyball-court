/* 排球場｜第三階段：漂流瓶尋找、拾取、信紙及空瓶收藏
 * 載入位置：world-items.js → boat-cabin.js → drift-bottles.js。
 * 不含正式故事正文；正式故事內容日後寫入 STORY_BOTTLES。
 * 所有收藏使用原本的 vb-boat-cabin-v1 存檔，不另開 localStorage key。
 */
(() => {
  'use strict';

  const access = window.VBBoatAccess;
  const cabin = window.VBBoatCabin;
  if (!access?.getObject?.() || !cabin?.addBottle ||
      !cabin?.markCollectedBottle || typeof T3 === 'undefined' ||
      typeof sc === 'undefined' || typeof hitList === 'undefined') {
    console.warn('[drift-bottles] 載入順序或船艙收藏接口尚未準備好。');
    return;
  }

  const boat = access.getObject();
  const TAKE_DISTANCE = 4.6;
  const items = [];
  const date = new Date();
  const localDay = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
  const daysSinceEpoch = Math.floor(new Date(
    date.getFullYear(), date.getMonth(), date.getDate()
  ).getTime() / 86400000);

  // 正式故事信件請等定稿後再加入。不要在遊戲裡顯示劇情編號、章節或收集進度。
  // 格式範例：{ id:'letter-01', x:-74, z:18, sender:'', text:'完整信件文字' }
  const STORY_BOTTLES = [];

  const source = STORY_BOTTLES.filter(b => b && b.id && b.text?.trim()).map(b => ({...b, kind:'letter'}));

  // 開發者模式專用測試信，正式版完全不出現，也不代表正式劇情。
  if (typeof VB_IS_DEV !== 'undefined' && VB_IS_DEV) {
    source.push({
      id: 'dev-test-letter', kind:'letter', x:-48, z:15,
      sender:'測試紙條', text:'這只是一封用來測試拾取與信件收藏功能的紙條。正式故事尚未加入。'
    });
  }

  // 空瓶偶爾漂來。使用日期作為 ID，撿過就不會因重新整理而重刷。
  // 開發版每天至少有一個，以便測試。
  if ((typeof VB_IS_DEV !== 'undefined' && VB_IS_DEV) ||
      localDay === '2026-12-24' || daysSinceEpoch % 2 === 0) {
    source.push({ id:`empty-${localDay}-a`, kind:'empty', x:-53, z:20 });
  }
  if (daysSinceEpoch % 5 === 0) {
    source.push({ id:`empty-${localDay}-b`, kind:'empty', x:-84, z:-12 });
  }

  const css = document.createElement('style');
  css.textContent = `
    #vbDriftPickup {
      position:fixed;z-index:18;
      right:calc(18px + env(safe-area-inset-right,0px));
      bottom:calc(24px + env(safe-area-inset-bottom,0px));
      max-width:min(240px,calc(100vw - 36px));padding:10px 15px;
      border:1px solid rgba(255,255,255,.6);border-radius:999px;
      background:rgba(29,42,80,.45);color:white;
      -webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px);
      font:600 13px/1.5 system-ui,'PingFang TC',sans-serif;
      box-shadow:0 7px 20px rgba(10,20,45,.17);cursor:pointer;
    }
    #vbDriftPickup[hidden] {display:none!important}
    #vbDriftPickup:hover {background:rgba(29,42,80,.67)}
    #vbDriftPickup:focus-visible {outline:2px solid #fff;outline-offset:3px}
    @media(max-width:560px) {
      #vbDriftPickup {bottom:calc(18px + env(safe-area-inset-bottom,0px));font-size:12px}
    }
  `;
  document.head.append(css);
  const pickupButton = document.createElement('button');
  pickupButton.id = 'vbDriftPickup';
  pickupButton.type = 'button';
  pickupButton.textContent = '拾起漂流瓶';
  pickupButton.setAttribute('aria-label', '拾起附近的漂流瓶');
  pickupButton.hidden = true;
  document.body.append(pickupButton);

  function notify(message) {
    if (typeof popText === 'function') popText(message);
  }
  function distance(o) { return Math.hypot(boat.x - o.x, boat.z - o.z); }

  function glassMaterial() {
    return new T3.MeshPhongMaterial({
      color:0xc9eef2,transparent:true,opacity:.48,
      shininess:95,depthWrite:false,side:T3.DoubleSide
    });
  }
  function makeBottle(d, i) {
    const root = new T3.Group();
    root.position.set(d.x, .22, d.z);
    root.visible = false;
    root.userData.act = () => take(d.id);
    const bottleArt = new T3.Group();
    bottleArt.rotation.z = Math.PI / 2;
    root.add(bottleArt);

    const glass = glassMaterial();
    const body = new T3.Mesh(new T3.CylinderGeometry(.20,.22,.79,16,1,true), glass);
    bottleArt.add(body);
    const bottom = new T3.Mesh(new T3.CylinderGeometry(.22,.22,.035,16),
      new T3.MeshLambertMaterial({color:0xa4e3e8,transparent:true,opacity:.62,depthWrite:false}));
    bottom.position.y = -.39;
    bottleArt.add(bottom);
    const neck = new T3.Mesh(new T3.CylinderGeometry(.105,.145,.27,14),glass);
    neck.position.y = .51;
    bottleArt.add(neck);
    const cork = new T3.Mesh(new T3.CylinderGeometry(.122,.11,.17,12),
      new T3.MeshLambertMaterial({color:0xcba47b}));
    cork.position.y = .72;
    bottleArt.add(cork);

    if (d.kind === 'letter') {
      const paper = new T3.Mesh(new T3.CylinderGeometry(.078,.078,.54,10),
        new T3.MeshLambertMaterial({color:0xffefcf}));
      paper.position.y = -.04;
      bottleArt.add(paper);
    }

    const hit = new T3.Mesh(new T3.BoxGeometry(1.35,.75,1.25),
      new T3.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    hit.userData.act = () => take(d.id);
    root.add(hit);
    sc.add(root);
    hitList.push(root);
    const o = { ...d, root, i, taken:false };
    return o;
  }

  function stateNow() { return cabin.getState(); }
  function had(id) {
    const state = stateNow();
    return state.collectedBottleIds?.includes(id) ||
      state.bottles?.some(b => b.id === id) ||
      state.letters?.some(l => l.id === `note-${id}`);
  }
  source.forEach((d,i)=>{
    if (!had(d.id)) items.push(makeBottle(d,i));
  });

  function remove(o) {
    o.taken = true;
    const i = hitList.indexOf(o.root);
    if (i >= 0) hitList.splice(i,1);
    sc.remove(o.root);
    o.root.traverse(mesh => {
      mesh.geometry?.dispose?.();
      if (mesh.material) {
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
          .forEach(m => m.dispose?.());
      }
    });
  }

  function take(id) {
    const o = items.find(x => x.id === id && !x.taken);
    if (!o || !access.isSailing() || distance(o) > TAKE_DISTANCE ||
        boat.arrival || boat.pending) return false;

    const current = stateNow();
    if (!current.bag) {
      notify('先到船上拿起背包，才能收好漂流瓶。');
      return false;
    }

    // 先收原信（若有），再收空瓶；兩者都歸入同一個背包。
    if (o.kind === 'letter' &&
        !current.letters.some(l => l.id === `note-${id}`)) {
      if (!cabin.addLetter(`note-${id}`, o.text, o.sender || '')) {
        notify('信件暫時無法儲存，請稍後再試。');
        return false;
      }
    }
    if (!stateNow().bottles.some(b => b.id === id)) {
      if (!cabin.addBottle(id)) {
        notify('空瓶暫時無法儲存，請稍後再試。');
        return false;
      }
    }
    if (!cabin.markCollectedBottle(id)) {
      notify('收藏紀錄暫時無法儲存，請稍後再試。');
      return false;
    }
    remove(o);
    pickupButton.hidden = true;
    if (o.kind === 'letter') {
      notify('找到一封紙條。原信與空瓶都已收進背包。');
      cabin.openBackpack?.();
    } else {
      notify('撿到一個空瓶子，已收進背包。');
    }
    return true;
  }

  let nearest = null;
  pickupButton.addEventListener('click',()=>{
    if (nearest) take(nearest.id);
  });
  window.addEventListener('keydown', e => {
    if (e.code !== 'KeyE' || e.repeat || !nearest ||
        ['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (take(nearest.id)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  // 由 index.html 原有的動畫循環呼叫，不另開一套 requestAnimationFrame。
  window.vbDriftStep = dt => {
    const sailing = access.isSailing() && !cabin.isOpen?.();
    const visible = boat.unlocked && !boat.pending && !boat.arrival;
    nearest = null;
    let best = TAKE_DISTANCE;
    for (const o of items) {
      if (o.taken) continue;
      o.root.visible = visible;
      if (!visible) continue;
      o.root.position.y = .22 + Math.sin(performance.now() * .0015 + o.i * 2.1) * .038;
      o.root.rotation.y += dt * .10;
      o.root.rotation.z = Math.sin(performance.now() * .0012 + o.i) * .045;
      if (!sailing) continue;
      const d = distance(o);
      if (d < best) { nearest = o; best = d; }
    }
    pickupButton.hidden = !nearest;
  };

  window.VBDriftBottles = {
    visibleBottleCount:()=>items.filter(x=>!x.taken).length,
    activeBottleCount:()=>items.filter(x=>!x.taken && x.root.visible).length,
    takeNearest:()=>nearest ? take(nearest.id) : false
  };
})();
