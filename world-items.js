
/* 第四階段：逐日解鎖、場邊物件、球車整理、小帆船 */

(() => {
  'use strict';

  // 修改解鎖日期，只需要改這張表
  const UNLOCK = Object.freeze({
    bottle: 2,
    towel: 2,
    cart: 3,
    chair: 5,
    machine: 7,
    picnic: 10,
    cat: 14,
    basket: 15,
    sailboat: 30
  });

  const NAME = {
    bottle: '水壺',
    towel: '毛巾',
    cart: '排球車',
    chair: '裁判椅',
    machine: '發球機',
    picnic: '野餐墊與酒杯',
    cat: '黑貓',
    basket: '野餐籃',
    sailboat: '小帆船'
  };

  // 每個物件預設落地的位置
  const POS = {
    bottle: [-14.2, 2.5],
    towel: [-15.2, 2.5],
    cart: [14.5, 1.5],
    chair: [1.0, 10.5],
    machine: [-14.5, -4],
    picnic: [16, 13.2],
    cat: [12.4, -15],
    basket: [16, 13.2],
    sailboat: [-38, 14]
  };

  const TREE_POS = [
    [-14, -8], [-17, 6], [14, -12], [16, 7],
    [-6, -17], [5, 16], [-21, -2], [19, -3]
  ];

  const STEP = 1.5;
  const byId = new Map();
  const list = [];

  const material = c =>
    new T3.MeshLambertMaterial({ color: c });

  const dark = 0x263653;

  // ===== 基礎模型工具 =====

  function cub(g, w, h, d, x, y, z, color) {
    const m = new T3.Mesh(
      new T3.BoxGeometry(w, h, d),
      material(color)
    );

    m.position.set(x, y, z);
    g.add(m);
    return m;
  }

  function cyl(g, r1, r2, h, x, y, z, color, sides = 14) {
    const m = new T3.Mesh(
      new T3.CylinderGeometry(r1, r2, h, sides),
      material(color)
    );

    m.position.set(x, y, z);
    g.add(m);
    return m;
  }

  function orb(g, r, x, y, z, color, w = 14, h = 10) {
    const m = new T3.Mesh(
      new T3.SphereGeometry(r, w, h),
      material(color)
    );

    m.position.set(x, y, z);
    g.add(m);
    return m;
  }

  function volley(g, x, y, z, r = 0.25) {
    const m = new T3.Mesh(
      new T3.SphereGeometry(r, 20, 12),
      new T3.MeshLambertMaterial({ map: ballTex })
    );

    m.position.set(x, y, z);
    g.add(m);
    return m;
  }

  const invisible = () =>
    new T3.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false
    });

  function clickZone(o, w, h, d, x, y, z, fn) {
    const m = new T3.Mesh(
      new T3.BoxGeometry(w, h, d),
      invisible()
    );

    m.position.set(x, y, z);
    m.userData.act = fn;

    o.root.add(m);
    return m;
  }

  // ===== 建立物件 =====
  // art 負責外觀
  // root 負責位置、點擊與解鎖

  let organizing = false;
  let cameraMode = 'orbit';

  function create(id, build, interact, opts = {}) {
    const [x, z] = POS[id];

    const root = new T3.Group();
    root.position.set(x, 0, z);

    const art = new T3.Group();
    root.add(art);
    sc.add(root);

    const o = {
      id,
      name: NAME[id],
      day: UNLOCK[id],
      root,
      art,
      x,
      z,
      unlocked: false,
      stored: false,
      arrival: null,
      time: 0,
      action: '',
      fixed: !!opts.fixed,
      noStore: !!opts.noStore,
      rot: 0,
      pending: false,
      bound: opts.bound || null,
      parts: {},
      interact: (...args) => {
        markTouched(id);
        if (typeof interact === 'function') interact(...args);
      }
    };

    root.userData.worldItem = id;

    root.userData.act = () => {
      if (o.arrival || o.stored || !o.unlocked) return;
      if (organizing && id !== 'cart') return;

      if (typeof o.interact === 'function') {
        o.interact(o);
      }
    };

    build(o);
    root.visible = false;

    list.push(o);
    byId.set(id, o);

    return o;
  }

  // ===== 第 2 天：水壺 =====
      create('bottle', o => {
    // 透明運動水瓶：半透明瓶身、裡面有水、有刻度、翻蓋噴嘴
    const clear = new T3.MeshPhongMaterial({
      color: 0xdff3f7, transparent: true, opacity: .34,
      shininess: 90, depthWrite: false, side: T3.DoubleSide
    });

    const shell = new T3.Mesh(new T3.CylinderGeometry(.23, .2, .78, 22, 1, true), clear);
    shell.position.y = .44;
    o.art.add(shell);
    cyl(o.art, .2, .2, .03, 0, .06, 0, 0xcfe6ee, 22);

    // 水體縮進瓶壁內，避免晃動時穿模
o.parts.water = cyl(
  o.art,
  .155, .145, .43,
  0, .30, 0,
  0x6fc3e6, 24
);

o.parts.water.material.transparent = true;
o.parts.water.material.opacity = .62;
o.parts.water.material.depthWrite = false;

// 獨立水面：只做小幅度晃動
o.parts.waterSurface = cyl(
  o.art,
  .155, .155, .012,
  0, .518, 0,
  0xb9eaf5, 24
);

o.parts.waterSurface.material.transparent = true;
o.parts.waterSurface.material.opacity = .73;
o.parts.waterSurface.material.depthWrite = false;

    for (let i = 0; i < 4; i++) cub(o.art, .09, .014, .01, 0, .2 + i * .14, .222, 0xffffff);

    // 整個瓶蓋以側邊為轉軸：倒地後蓋子能掀開。
    const cap = new T3.Group();
    cap.position.set(-.16, .82, 0);
    o.art.add(cap);
    cyl(cap, .17, .2, .08, .16, .03, 0, 0x355c97, 22);
    cyl(cap, .13, .15, .13, .16, .14, 0, 0x355c97, 22);
    cyl(cap, .045, .06, .1, .16, .26, 0, 0xe0a176, 12);
    const loop = new T3.Mesh(new T3.TorusGeometry(.1, .02, 6, 16), material(0xe0a176));
    loop.position.set(.30, .16, 0);
    cap.add(loop);
    o.parts.cap = cap;
    o.parts.spillTime = -1;

    // 水灘與幸運草固定在地面，不跟著瓶身一起傾斜。
    const puddle = new T3.Mesh(
      new T3.CircleGeometry(1, 40),
      new T3.MeshBasicMaterial({color:0x84d2e5,transparent:true,opacity:.46,depthWrite:false,side:T3.DoubleSide})
    );
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(1.01, .067, 0);
    puddle.scale.set(.001, .001, 1);
    o.root.add(puddle);
    o.parts.puddle = puddle;

    const clover = new T3.Group();
    clover.position.set(1.35, .08, .12);
    // 四片橢圓小葉、短柄；用 3D 幾何拼出四葉草，不用美術檔案。
    const green = new T3.MeshLambertMaterial({color:0x55a76d,side:T3.DoubleSide});
    const leafGeo = new T3.SphereGeometry(.095, 12, 8);
    [[-.09,0], [.09,0], [0,-.09], [0,.09]].forEach(([x,z])=>{
      const leaf = new T3.Mesh(leafGeo, green);
      leaf.position.set(x,.018,z);
      leaf.scale.set(.92,.22,1.12);
      clover.add(leaf);
    });
    const stem = new T3.Mesh(new T3.CylinderGeometry(.015,.015,.23,8),green);
    stem.rotation.z = .85;
    stem.position.set(.12,.02,.12);
    clover.add(stem);
    clover.scale.setScalar(.001);
    o.root.add(clover);
    o.parts.clover = clover;

    clickZone(o, 1.65, 1.35, 1.35, .34, .56, 0, () => o.interact(o));
  }, o => {
    // 再次點擊可重播「傾倒 → 流水 → 長出四葉草」。
    o.parts.spillTime = 0;
    o.parts.cap.rotation.z = 0;
    if (o.parts.waterSurface) o.parts.waterSurface.visible = true;
    o.parts.puddle.scale.set(.001, .001, 1);
    o.parts.clover.scale.setScalar(.001);
  });

    
  // ===== 第 2 天：毛巾 =====

    // 毛圈質感貼圖：兩端有條紋
  const towelTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#fff2e0';
    g.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 1400; i++) {
      g.strokeStyle = Math.random() < .5 ? 'rgba(224,161,118,.22)' : 'rgba(255,255,255,.7)';
      g.lineWidth = 1.2;
      g.beginPath();
      g.arc(Math.random() * 256, Math.random() * 128, rnd(1.2, 2.6), 0, Math.PI * 2);
      g.stroke();
    }
    [[8, '#e0a176'], [20, '#355c97'], [220, '#355c97'], [232, '#e0a176']].forEach(([x, col]) => {
      g.fillStyle = col;
      g.fillRect(x, 0, 6, 128);
    });
    return new T3.CanvasTexture(c);
  })();

  create('towel', o => {

  // 只有一條毛巾，不再疊成三層
  const cloth = new T3.Group();

  o.art.add(cloth);
  o.parts.cloth = cloth;

  // 一片完整布面
  const geo = new T3.PlaneGeometry(
    1.50, 1.05,
    24, 12
  );

  geo.rotateX(-Math.PI / 2);

  // 讓毛巾自然產生微小皺褶
  const p = geo.attributes.position;

  for (let i = 0; i < p.count; i++) {

    const u = p.getX(i) / 1.50 + .5;
    const v = p.getZ(i) / 1.05 + .5;

    p.setY(
      i,
      .07 +
      .02 * Math.sin(u * Math.PI * 3) +
      .008 * Math.sin(v * Math.PI * 2)
    );

  }

  p.needsUpdate = true;
  geo.computeVertexNormals();

  // 保留原本的米白色布料與條紋貼圖
  const fabric = new T3.Mesh(
    geo,
    new T3.MeshLambertMaterial({
      map: towelTex,
      side: T3.DoubleSide
    })
  );

  // 稍微偏離水瓶，避免重疊
  fabric.position.x = -.12;
  fabric.rotation.y = -.06;

  cloth.add(fabric);

  // 保留點擊毛巾的互動
  clickZone(
    o,
    1.8, .6, 1.2,
    0, .25, 0,
    () => o.interact(o)
  );

}, o => {

  o.time = 1.2;

});

  // ===== 第 3 天：排球車 =====

  create('cart', o => {
    for (const x of [-.78, .78]) {
      for (const z of [-.52, .52]) {
        const wheel = cyl(
          o.art, .17, .17, .12,
          x, .19, z, 0x42464d, 12
        );

        wheel.rotation.z = Math.PI / 2;
      }
    }

    cub(
      o.art, 1.95, .13, 1.35,
      0, .46, 0, 0x355c97
    );

    for (const x of [-.84, .84]) {
      for (const z of [-.55, .55]) {
        cub(
          o.art, .065, .98, .065,
          x, 1.02, z, dark
        );
      }
    }

    for (const z of [-.55, .55]) {
      cub(
        o.art, 1.8, .075, .08,
        0, 1.51, z, dark
      );
    }

    for (const x of [-.84, .84]) {
      cub(
        o.art, .08, .075, 1.1,
        x, 1.51, 0, dark
      );
    }

    // 車子空著時顯示裝飾排球
volley(o.art, -.4, 1.03, 0, .27);
volley(o.art, .33, 1.03, .2, .27);
volley(o.art, 0, 1.31, -.2, .27);

    clickZone(o, 2.3, 1.7, 1.65, 0, .9, 0, () => o.interact(o));

  }, () => toggleOrganizer(), {
    noStore: true
  });
  
  // ===== 第 5 天：裁判椅 =====

  create('chair', o => {
    for (const x of [-.45, .45]) {
      for (const z of [-.45, .45]) {
        cub(
          o.art, .1, 3.55, .1,
          x, 1.79, z, 0x355c97
        );
      }
    }

    cub(
      o.art, 1.3, .17, 1.07,
      0, 3.59, 0, 0xe0a176
    );

    cub(
      o.art, 1.3, .63, .11,
      0, 3.98, -.55, 0x355c97
    );

    for (let i = 0; i < 6; i++) {
      cub(
        o.art, .83, .06, .09,
        0, .52 + i * .45, .58, 0xf9f5e9
      );
    }

    clickZone(
      o, 1.6, 4.3, 1.5,
      0, 2.15, 0,
      () => o.interact(o)
    );

    }, () => {
    cameraMode =
      cameraMode === 'chair' ? 'orbit' : 'chair';

    if (organizing) toggleOrganizer();

    if (cameraMode === 'chair') {
      popText('裁判視角：雙擊空白處返回');
    }

  }, {
    fixed: true
  });
  
  // ===== 第 7 天：發球機／接球練習 =====
// 與原本球場共用同一顆排球

const machineGame = {
  running: false,
  inFlight: false,

  // idle / waiting / incoming / lifted / outgoing
  stage: 'idle',

  target: 0,
  launched: 0,
  flightAge: 0,
  nextIn: 0,

  open: false,
  pressing: false,
  pressedFrom: '',
  downAt: 0,

  charge: 0,
  chargeReady: false,
  spikeArmed: false
};
// ===== 擊球練習：準心、命中回饋、操作按鈕 =====

const machineHudStyle = document.createElement('style');

machineHudStyle.textContent = `
  #vbMachineAim {
    position: fixed;
    left: 50%;
    top: 50%;
    z-index: 14;
    width: 38px;
    height: 38px;
    transform: translate(-50%, -50%);
    color: rgba(255,255,255,.85);
    pointer-events: none;
  }

  #vbMachineAim[hidden],
  #vbMachineEnd[hidden],
  #vbMachineTouch[hidden],
  #vbMachineCue[hidden] {
    display: none !important;
  }

  #vbMachineAim::before {
    content: '';
    position: absolute;
    inset: 8px;
    border: 1.5px solid currentColor;
    border-radius: 50%;
  }

  #vbMachineAim::after {
    content: '+';
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font: 300 21px/1 system-ui, sans-serif;
  }

  #vbMachineAim.ready {
    color: #b7ffe0;
  }

  #vbMachineAim.charged {
    color: #ffe4a0;
  }

  #vbMachineEnd,
  #vbMachineTouch {
    position: fixed;
    z-index: 19;
    padding: 9px 14px;
    border: 1px solid rgba(255,255,255,.55);
    border-radius: 999px;
    color: white;
    background: rgba(29,42,80,.34);
    -webkit-backdrop-filter: blur(5px);
    backdrop-filter: blur(5px);
    font: 600 13px system-ui, sans-serif;
    cursor: pointer;
    touch-action: none;
  }

  #vbMachineEnd {
    top: calc(80px + env(safe-area-inset-top,0px));
    right: 18px;
  }

  #vbMachineTouch {
    bottom: calc(145px + env(safe-area-inset-bottom,0px));
    right: 20px;
    width: 68px;
    height: 56px;
  }

  #vbMachineCue {
    position: fixed;
    left: 50%;
    top: calc(50% + 43px);
    z-index: 15;
    transform: translateX(-50%);
    pointer-events: none;
    padding: 5px 12px;
    border-radius: 999px;
    background: rgba(29,42,80,.42);
    color: white;
    font: 600 13px system-ui, sans-serif;
    white-space: nowrap;
  }

  @media (hover:hover) and (pointer:fine) {
    #vbMachineTouch {
      display: none !important;
    }
  }
`;

document.head.append(machineHudStyle);


const machineAim = document.createElement('div');
machineAim.id = 'vbMachineAim';
machineAim.hidden = true;

const machineEnd = document.createElement('button');
machineEnd.type = 'button';
machineEnd.id = 'vbMachineEnd';
machineEnd.textContent = '結束練習 ×';
machineEnd.hidden = true;

const machineTouch = document.createElement('button');
machineTouch.type = 'button';
machineTouch.id = 'vbMachineTouch';
machineTouch.textContent = '擊球';
machineTouch.hidden = true;

const machineCueEl = document.createElement('div');
machineCueEl.id = 'vbMachineCue';
machineCueEl.hidden = true;

document.body.append(
  machineAim,
  machineEnd,
  machineTouch,
  machineCueEl
);


// 成功擊球後，排球短暫發光
const machineGlow = new T3.Sprite(
  new T3.SpriteMaterial({
    map: starGlowTexture,
    color: 0xffe4aa,
    transparent: true,
    opacity: 0,
    blending: T3.AdditiveBlending,
    depthWrite: false,
    fog: false
  })
);

sc.add(machineGlow);
machineGlow.visible = false;

let machineCueTime = 0;
let machineGlowTime = 0;

function machineShowCue(message) {
  machineCueEl.textContent = message;
  machineCueTime = 1.05;
  machineGlowTime = .55;
}


// 以準心和排球在螢幕上的位置判斷是否瞄準。
// 不再判斷玩家與排球之間的距離。
function machineAimed() {

  if (
    !machineGame.running ||
    !['incoming', 'lifted'].includes(machineGame.stage)
  ) return false;

  if (
    machineGame.stage === 'incoming' &&
    (
      !machineGame.inFlight ||
      ball.position.y <= BR + .12
    )
  ) return false;

  cam.updateMatrixWorld(true);

  const p = ball.position.clone().project(cam);

  // 排球必須位於攝影機前方
  if (p.z <= -1 || p.z >= 1) return false;

  // 手機的瞄準容錯範圍稍大
  const radius = innerWidth <= 700 ? 58 : 46;

  return Math.hypot(
    p.x * innerWidth / 2,
    p.y * innerHeight / 2
  ) <= radius;

}


// 特殊殺球：必須站在球網附近
function machineNearNet() {
  return (
    Math.abs(tgtP.x) <= 5.5 &&
    Math.abs(tgtP.z) <= 5.2
  );
}


// 每幀更新準心與擊球回饋
function machineHudStep(dt) {

  const playing = machineGame.running;

  machineAim.hidden = !playing;
  machineEnd.hidden = !playing;
  machineTouch.hidden = !playing;

  const aimed = playing && machineAimed();

  machineAim.classList.toggle(
    'ready',
    aimed
  );

  // 長按期間須持續維持網前站位與瞄準
  if (
    playing &&
    machineGame.pressing &&
    machineGame.pressedFrom === 'lifted' &&
    machineGame.stage === 'lifted'
  ) {

    machineGame.charge =
      aimed && machineNearNet()
        ? Math.min(.8, machineGame.charge + dt)
        : 0;

    machineGame.chargeReady =
      machineGame.charge >= .8;
  }

  // 金色準心代表特殊殺球已準備完成
  machineAim.classList.toggle(
    'charged',
    playing &&
    (
      machineGame.chargeReady ||
      machineGame.spikeArmed
    )
  );


  // 簡短的成功提示自然淡出
  machineCueTime = Math.max(
    0,
    machineCueTime - dt
  );

  machineCueEl.hidden = machineCueTime <= 0;

  if (!machineCueEl.hidden) {
    machineCueEl.style.opacity =
      Math.min(1, machineCueTime * 4);
  }


  // 擊球光暈自然消失
  machineGlowTime = Math.max(
    0,
    machineGlowTime - dt
  );

  machineGlow.visible = machineGlowTime > 0;

  if (machineGlow.visible) {

    machineGlow.position.copy(ball.position);

    machineGlow.scale.setScalar(
      2.8 +
      (1 - machineGlowTime / .55) * 1.6
    );

    machineGlow.material.opacity =
      .45 * machineGlowTime / .55;
  }

}


// 練習中只顯示簡潔的結束按鈕
machineEnd.addEventListener(
  'click',
  () => stopMachineGame()
);


// 手機擊球按鈕：支援短按與長按
machineTouch.addEventListener('pointerdown', e => {
  e.preventDefault();
  machineTouch.setPointerCapture(e.pointerId);
  window.worldMachineSpaceDown();
});

machineTouch.addEventListener('pointerup', e => {
  e.preventDefault();
  window.worldMachineSpaceUp();
});

machineTouch.addEventListener(
  'pointercancel',
  () => window.worldMachineSpaceCancel()
);

machineTouch.addEventListener(
  'lostpointercapture',
  () => {
    if (machineGame.pressing) {
      window.worldMachineSpaceCancel();
    }
  }
);
// 建立發球機
create('machine', o => {

  const metal = 0x263653;
  const blue = 0x355c97;
  const cream = 0xfff3d6;
  const gold = 0xe0a176;

  // 四個輪子
  for (const x of [-.70, .70]) {
    for (const z of [-.49, .49]) {

      const wheel = cyl(
        o.art, .18, .18, .12,
        x, .19, z, metal, 12
      );

      wheel.rotation.z = Math.PI / 2;
    }
  }

  // 底盤與機身
  cub(o.art, 1.75, .16, 1.14, 0, .46, 0, blue);
  cub(o.art, 1.05, .83, .79, -.16, 1.03, 0, cream);
  cub(o.art, .86, .12, .72, -.24, 1.50, 0, blue);

  // 支架
  for (const z of [-.32, .32]) {

    const leg = cub(
      o.art, .09, .67, .09,
      -.37, .91, z, metal
    );

    leg.rotation.z = -.13;
  }

  // 雙滾輪
  o.parts.rollers = [];

  for (const z of [-.23, .23]) {

    const roller = cyl(
      o.art, .265, .265, .13,
      .48, 1.53, z, blue, 24
    );

    roller.rotation.x = Math.PI / 2;
    o.parts.rollers.push(roller);

    const hub = cyl(
      o.art, .095, .095, .15,
      .48, 1.53, z, gold, 14
    );

    hub.rotation.x = Math.PI / 2;
  }

  // 出球口
  const muzzle = cyl(
    o.art, .15, .21, .45,
    .81, 1.53, 0, metal, 18
  );

  muzzle.rotation.z = -Math.PI / 2;

  const rim = cyl(
    o.art, .21, .21, .07,
    1.06, 1.53, 0, cream, 20
  );

  rim.rotation.z = -Math.PI / 2;

  // 機器上放兩顆裝飾排球
  // 真正發射仍使用球場原本那顆球
  volley(o.art, -.48, 1.82, -.18, .21);
  volley(o.art, -.09, 1.82, .17, .21);

  cub(o.art, .36, .08, .52, -.29, 1.61, 0, gold);

  // 啟動按鈕
  const switchButton = cub(
    o.art, .16, .08, .2,
    -.18, 1.51, -.42, 0x8bbba9
  );

  switchButton.rotation.z = .1;

  // 點擊機器開啟操作面板
  clickZone(
    o, 2.1, 2.5, 1.6,
    0, 1.30, 0,
    () => o.interact(o)
  );

}, () => openMachinePanel());


// ===== 發球機操作面板 =====

const machinePanel = document.createElement('div');

machinePanel.id = 'vbMachinePanel';
machinePanel.hidden = true;

machinePanel.setAttribute('role', 'region');
machinePanel.setAttribute('aria-label', '擊球練習');
machinePanel.innerHTML = `
  <div class="vb-machine-head">
    <strong>擊球練習</strong>

    <button
      type="button"
      data-machine="close"
      class="vb-machine-close"
      aria-label="關閉"
    >×</button>
  </div>

  <div class="vb-machine-buttons">

    <button type="button" data-machine="one">
      單球練習
    </button>

    <button type="button" data-machine="repeat">
      連發
    </button>

  </div>
`;
document.body.append(machinePanel);


// ===== 發球機面板樣式 =====

const machineStyle = document.createElement('style');

machineStyle.textContent = `
  #vbMachinePanel {
  position: fixed;
  right: calc(16px + env(safe-area-inset-right, 0px));
  top: calc(82px + env(safe-area-inset-top, 0px));
  z-index: 17;
  width: min(278px, calc(100vw - 32px));
  padding: 14px 14px 13px;
  border: 1px solid rgba(255,255,255,.42);
  border-radius: 16px;
  background: rgba(29,42,80,.50);
  color: white;
  box-shadow: 0 12px 28px rgba(10,20,45,.22);
  font: 13px/1.55 system-ui, "PingFang TC", sans-serif;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

#vbMachinePanel[hidden] {
  display: none;
}

#vbMachinePanel .vb-machine-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

#vbMachinePanel .vb-machine-head strong {
  font-size: 15px;
  letter-spacing: .08em;
}

#vbMachinePanel button {
  border: 1px solid rgba(255,255,255,.34);
  border-radius: 10px;
  background: rgba(255,255,255,.10);
  color: white;
  font: inherit;
  cursor: pointer;
  padding: 10px 10px;
  transition: background .18s ease, border-color .18s ease;
}

#vbMachinePanel button:hover {
  background: rgba(255,255,255,.18);
}

#vbMachinePanel button:focus-visible {
  outline: 2px solid #fff1c5;
  outline-offset: 2px;
}

/* 右上角 X：放正中間 */
#vbMachinePanel .vb-machine-close {
  width: 34px;
  height: 34px;
  padding: 0;
  font-size: 22px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

/* 說明字 */
#vbMachinePanel .vb-machine-note {
  margin: 0 0 12px;
  opacity: .86;
  font-size: 12px;
  line-height: 1.5;
}

/* 只保留兩個按鈕，等寬 */
#vbMachinePanel .vb-machine-buttons {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

#vbMachinePanel .vb-machine-buttons button {
  min-height: 44px;
  padding: 10px 12px;
  font-weight: 600;
  text-align: center;
}
  #vbMachinePanel .vb-machine-hit {
  display: block;
  width: 100%;
  margin-top: 9px;
  background: rgba(224,161,118,.28);
}

#vbMachinePanel .vb-machine-hit[hidden] {
  display: none;
}
`;

document.head.append(machineStyle);

const machineNote =
  machinePanel.querySelector('#vbMachineNote');

function machineStatus(note = '') {
  if (note && machineNote) {
    machineNote.textContent = note;
  }
}
  
// ===== 開啟擊球練習選單 =====

function openMachinePanel() {

  const o = byId.get('machine');

  if (
    !o ||
    !active(o) ||
    o.arrival ||
    machineGame.running
  ) return false;

  if (organizing) {
    toggleOrganizer();
  }

  machinePanel.hidden = false;
  machineGame.open = true;

  machineStatus(
    '選好單球或連發後，選單會自動收起。'
  );

  return true;
}


// ===== 停止練習 =====

function stopMachineGame(
  message = '練習已停止。'
) {

  if (machineGame.stage === 'lifted') {

    hover = null;
    b.armed = 0;
    bv.set(0, 0, 0);

  }

  machineGame.running = false;
  machineGame.inFlight = false;
  machineGame.stage = 'idle';
  machineGame.nextIn = 0;

  machineGame.pressing = false;
  machineGame.pressedFrom = '';
  machineGame.charge = 0;
  machineGame.chargeReady = false;
  machineGame.spikeArmed = false;

  machinePanel.hidden = true;
  machineGame.open = false;

  machineStatus(message);

}


// ===== 開始單球或五球練習 =====

function startMachineGame(count) {

  const o = byId.get('machine');

  if (
    !o ||
    !active(o) ||
    o.arrival
  ) return;

  if (
    bday.active ||
    reveal ||
    spikeFlight ||
    hover ||
    b.drag
  ) {

    machineStatus(
      '請先結束其他演出或球的特殊動作。'
    );

    return;
  }

  // 回到可以自由轉動的一般視角
  if (cameraMode !== 'orbit') {
    window.worldExitSpecialView?.();
  }

  machineGame.running = true;
  machineGame.inFlight = false;
  machineGame.stage = 'waiting';

  machineGame.target = count;
  machineGame.launched = 0;
  machineGame.flightAge = 0;
  machineGame.nextIn = .55;

  machineGame.pressing = false;
  machineGame.charge = 0;
  machineGame.chargeReady = false;
  machineGame.spikeArmed = false;

  // 選完後收起面板
  machinePanel.hidden = true;
  machineGame.open = false;

  machineStatus('');

  // 焦點交回球場，方便立即使用鍵盤
  try {
    cv.focus({ preventScroll: true });
  } catch (_) {
    cv.focus();
  }

}


// ===== 發球機隨機發球 =====

function launchMachineBall() {

  const o = byId.get('machine');

  if (!o || !active(o)) {
    stopMachineGame();
    return;
  }

  // 清除前一球的動作
  spikeFlight = null;
  hover = null;

  b.drag = false;
  b.sp = false;
  b.armed = 0;
  b.combo = 0;
  b.sq = 0;

  const startX = o.x + 1.12;
  const startY = 1.53;
  const startZ = o.z;

  // 隨機選擇球場落點
  const targetX =
    3.2 + Math.random() * 2.4;

  const targetZ =
    -2.6 + Math.random() * 5.2;

  // 發球速度維持原設定
  const duration = 1.68;

  ball.position.set(
    startX,
    startY,
    startZ
  );

  bv.set(

    (targetX - startX) / duration,

    (
      BR - startY +
      .5 * G * duration * duration
    ) / duration,

    (targetZ - startZ) / duration

  );

  machineGame.launched++;
  machineGame.inFlight = true;
  machineGame.stage = 'incoming';
  machineGame.flightAge = 0;

}


// ===== 一球結束，準備下一球 =====

function finishMachineBall() {

  if (
    !machineGame.running ||
    !machineGame.inFlight
  ) return;

  machineGame.inFlight = false;
  machineGame.stage = 'waiting';

  // 原本的球間隔不變
  machineGame.nextIn = 2.1;

}


// ===== 準心成功接球 =====

function machineReceive() {

  if (
    machineGame.stage !== 'incoming' ||
    !machineAimed()
  ) return;

  machineGame.inFlight = false;
  machineGame.stage = 'lifted';

  // 成功接到球後，自然向上托起
  hover = {
    y: 5.8,
    t: 0
  };

  bv.set(0, 0, 0);

  b.sp = false;
  b.armed = 0;
  b.combo = 0;

  // 只有成功接球才出現正面回饋
  machineShowCue('接到了！');
  sfxSpike();

}


// ===== 一般擊球或特殊殺球 =====

function machineStrike(spike) {

  if (
    !machineGame.running ||
    machineGame.stage !== 'lifted'
  ) return;

  machineGame.stage = 'outgoing';
  machineGame.inFlight = true;
  machineGame.flightAge = 0;

  machineGame.spikeArmed = false;
  machineGame.chargeReady = false;

  hover = null;

  b.armed = 0;
  b.combo = 0;
  b.sp = false;
  b.sq = spike ? .2 : .1;

  // 往球網的另一側回擊
  const side =
    ball.position.x <= 0 ? 1 : -1;

  const targetX =
    side * rnd(4.3, 6.3);

  const targetZ =
    rnd(-3, 3);

  // 一般擊球較柔和，殺球較快速
  const duration =
    spike ? .56 : 1.26;

  // 沿用原本球場的重力系統
  bv.set(

    (targetX - ball.position.x) / duration,

    (
      BR - ball.position.y +
      .5 * G * duration * duration
    ) / duration,

    (targetZ - ball.position.z) / duration

  );

  machineShowCue(
    spike ? '殺球！' : '擊球！'
  );

  sfxSpike();

}


// ===== Space：按下、放開、取消 =====

window.worldMachineIsPracticing = () =>
  machineGame.running;


// 按下 Space
window.worldMachineSpaceDown = () => {

  if (
    !machineGame.running ||
    machineGame.pressing
  ) return;

  machineGame.pressing = true;
  machineGame.pressedFrom = machineGame.stage;
  machineGame.downAt = performance.now();

  machineGame.charge = 0;
  machineGame.chargeReady = false;

  // 發球階段：準心命中才接球
  if (machineGame.stage === 'incoming') {

    machineReceive();

  } else if (
    machineGame.stage === 'lifted' &&
    machineGame.spikeArmed
  ) {

    // 長按、放開後的第二次 Space
    machineStrike(true);

  }

};


// 放開 Space
window.worldMachineSpaceUp = () => {

  if (!machineGame.pressing) return;

  machineGame.pressing = false;

  if (
    !machineGame.running ||
    machineGame.pressedFrom !== 'lifted' ||
    machineGame.stage !== 'lifted'
  ) return;

  if (machineGame.chargeReady) {

    // 已完成網前瞄準與長按
    // 放開後進入特殊殺球待命
    machineGame.spikeArmed = true;

    machineShowCue('殺球已準備');

  } else if (
    performance.now() -
    machineGame.downAt < 800
  ) {

    // 短按 Space：一般擊球
    machineStrike(false);

  }

  machineGame.charge = 0;
  machineGame.chargeReady = false;

};


// 視窗失去焦點時取消長按
window.worldMachineSpaceCancel = () => {

  machineGame.pressing = false;
  machineGame.pressedFrom = '';

  machineGame.charge = 0;
  machineGame.chargeReady = false;

};


// 練習模式不使用球場原本的三連擊
window.worldMachineOnBallHit = () =>
  machineGame.running;


// 球落地後，開始準備下一球
window.worldMachineOnBallGround = () => {

  if (
    !machineGame.running ||
    !machineGame.inFlight
  ) return false;

  finishMachineBall();

  return true;

};


// ===== 發球機每幀更新 =====

function machineGameStep(dt) {

  const o = byId.get('machine');

  // 其他活動開始時停止練習
  if (
    machineGame.running &&
    (
      !o ||
      !active(o) ||
      o.arrival ||
      organizing ||
      bday.active ||
      reveal
    )
  ) {

    stopMachineGame('練習已停止。');

  }

  // 準心與光暈持續更新
  machineHudStep(dt);

  if (!machineGame.running) return;


  // 托球後不設倒數，讓玩家自由決定回擊
  if (machineGame.stage === 'lifted') {

    if (hover) {
      hover.t = 0;
    }

    return;

  }


  // 等待發球或回擊的排球自然落地
  if (machineGame.inFlight) {

    machineGame.flightAge += dt;

    // 避免球離開場地後無限等待
    if (machineGame.flightAge > 4.5) {
      finishMachineBall();
    }

    return;

  }


  machineGame.nextIn -= dt;

  if (machineGame.nextIn > 0) return;


  // 單球／五球均以實際發球數控制
  if (
    machineGame.launched >=
    machineGame.target
  ) {

    machineCueEl.textContent = '練習結束';
    machineCueTime = 1.05;

    stopMachineGame('練習結束');

  } else {

    launchMachineBall();

  }

}
// 避免操作面板時誤觸球場
machinePanel.addEventListener('keydown', e => {

  if (['Space', 'Enter', 'KeyE'].includes(e.code)) {
    e.stopPropagation();
  }

});


// 面板按鈕
machinePanel.addEventListener('click', e => {

  const button =
    e.target.closest('[data-machine]');

  if (!button) return;

  const action = button.dataset.machine;

  if (action === 'one') {
    startMachineGame(1);
  }

  if (action === 'repeat') {
  // 連發模式每次最多發出 20 球
  startMachineGame(20);
}

  if (
    action === 'stop' ||
    action === 'close'
  ) {
    stopMachineGame();
  }

});


// 開發者頁面可以直接開啟發球機
window.worldOpenMachinePanel = openMachinePanel;
// ===== 開發者：直接預覽一般擊球／特殊殺球 =====

window.worldTestMachineStrike = kind => {

  if (
    !VB_IS_DEV ||
    !['hit', 'spike'].includes(kind) ||
    bday.active ||
    reveal ||
    organizing
  ) return false;

  // 停止目前練習，避免與下一球互相干擾
  if (machineGame.running) {
    stopMachineGame();
  }

  // 開發者測試：將鏡頭移回適合觀看球路的位置
  window.worldExitSpecialView?.();
  viewMix = 0;

  tgtP.set(0, 1, 0);

  ct.th = -.55;
  ct.ph = 1;
  ct.d = 27;
  ct.tilt = 0;

  cs.th = ct.th;
  cs.ph = ct.ph;
  cs.d = ct.d;
  cs.tilt = ct.tilt;

  camStep();

  // 使用原本球場的排球與物理系統
  spikeFlight = null;
  hover = null;

  b.drag = false;
  b.sp = false;
  b.armed = 0;
  b.combo = 0;

  bv.set(0, 0, 0);

  // 把球放到能清楚看見擊球軌跡的位置
  ball.position.set(-4.5, 5.8, 0);

  // 暫時進入托球狀態，
  // 直接呼叫正式版的擊球函式
  machineGame.running = true;
  machineGame.stage = 'lifted';
  machineGame.inFlight = false;

  machineStrike(kind === 'spike');

  // 測試只播放效果，不啟動正式練習流程
  machineGame.running = false;
  machineGame.inFlight = false;
  machineGame.stage = 'idle';
  machineGame.pressing = false;

  return true;

};
  // ===== 第 10 天：野餐墊與香檳酒杯 =====

  const rugTex = (() => {
    const c = document.createElement('canvas');

    c.width = 128;
    c.height = 128;

    const g = c.getContext('2d');

    for (let j = 0; j < 8; j++) {
      for (let i = 0; i < 8; i++) {
        g.fillStyle = [
          '#f7f4dc',
          '#e9cf6d',
          '#9bbfa7'
        ][(i + j * 2) % 3];

        g.fillRect(i * 16, j * 16, 16, 16);
      }
    }

    return new T3.CanvasTexture(c);
  })();

  create('picnic', o => {
    // 野餐墊放大
    const rug = new T3.Mesh(
      new T3.PlaneGeometry(5.4, 3.9),
      new T3.MeshLambertMaterial({ map: rugTex, side: T3.DoubleSide })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.y = .048;
    o.art.add(rug);

    const glass = new T3.MeshPhongMaterial({
      color: 0xf0ffff, transparent: true, opacity: .4,
      shininess: 100, depthWrite: false, side: T3.DoubleSide
    });

    // --- 香檳杯：細長杯型，一個 ---
    const gx = .95, gz = .75;
    cyl(o.art, .2, .2, .03, gx, .065, gz, 0xe5e9dd, 20);
    cyl(o.art, .028, .028, .5, gx, .33, gz, 0xeef4ee, 10);

    const flute = new T3.Mesh(new T3.CylinderGeometry(.115, .05, .78, 18, 1, true), glass);
    flute.position.set(gx, .97, gz);
    o.art.add(flute);

    
    // ===== 香檳杯：初始少量酒液 =====

    o.parts.wine = cyl(
      o.art,
      .062, .045, .16,
      gx, .66, gz,
      0xf1de9a, 18
    );

    o.parts.wine.material.transparent = true;
    o.parts.wine.material.opacity = .70;
    o.parts.wine.material.depthWrite = false;

    o.parts.gx = gx;
    o.parts.gz = gz;


    // ===== 香檳酒瓶：常見的深綠色瓶型 =====

    const bx = 1.7;
    const bz = .35;
    const green = 0x244a3c;

    // 瓶身獨立成群組，方便整支拿起來傾斜
    const bottle = new T3.Group();

    bottle.position.set(bx, 0, bz);
    o.art.add(bottle);

    o.parts.bottle = bottle;
    o.parts.bx = bx;
    o.parts.bz = bz;

    // 寬瓶底與圓柱瓶身
    cyl(
      bottle,
      .215, .225, .68,
      0, .40, 0,
      green, 24
    );

    // 收窄的瓶肩
    cyl(
      bottle,
      .085, .215, .24,
      0, .86, 0,
      green, 24
    );

    // 細長瓶頸
    cyl(
      bottle,
      .078, .085, .30,
      0, 1.13, 0,
      green, 18
    );

    // 金色瓶口包裝
    cyl(
      bottle,
      .088, .095, .15,
      0, 1.31, 0,
      0xdab66e, 18
    );

    // 奶油白色酒標
    cub(
      bottle,
      .30, .26, .018,
      0, .45, .22,
      0xfff0d5
    );

    // 酒標上的簡單金色橫條
    cub(
      bottle,
      .19, .042, .02,
      0, .48, .231,
      0xc79c6b
    );


    // ===== 可飛出的軟木塞 =====

    o.parts.cork = cyl(
      o.art,
      .062, .058, .14,
      bx, 1.45, bz,
      0xd9b384, 12
    );


    // ===== 細緻的香檳酒液 =====

    o.parts.stream = new T3.Mesh(

      new T3.CylinderGeometry(
        .014, .023, 1, 9
      ),

      new T3.MeshLambertMaterial({
        color: 0xf6db92,
        transparent: true,
        opacity: .8,
        depthWrite: false
      })

    );

    o.parts.stream.visible = false;

    o.art.add(o.parts.stream);


    // -1 代表目前沒有播放倒酒動畫
    o.parts.pourTime = -1;


    // 點酒瓶或酒杯，都能觸發倒酒
    clickZone(
      o,
      .62, 1.45, .62,
      gx, .75, gz,
      () => o.interact(o)
    );

    clickZone(
      o,
      .72, 1.70, .72,
      bx, .83, bz,
      () => o.interact(o)
    );

  }, o => {

    const P = o.parts;

    // 動畫播放期間不重複觸發
    if (P.pourTime >= 0) return;

    P.pourTime = 0;

    // 每次重新播放時，準備軟木塞
    P.cork.visible = true;

    P.cork.position.set(
      P.bx, 1.45, P.bz
    );

    P.cork.rotation.set(0, 0, 0);

  });


  // ===== 第 14 天：睡覺的黑貓 =====

    const CAT = { state: 'sleep', t: 0, wait: rnd(15, 40), tx: 0, tz: 0, act: '', actT: 0, actDur: 1, blink: 0 };

  let catMeow = null;
  function playCatMeow() {
    const v = typeof getSfxVolumeLevel === 'function' ? getSfxVolumeLevel() : .5;
    if (v <= 0) return;
    if (!catMeow) { catMeow = new Audio('assets/sounds/cat-meow.mp3'); catMeow.preload = 'auto'; }
    catMeow.volume = Math.min(1, .5 * v);
    catMeow.currentTime = 0;
    catMeow.play().catch(() => {});
  }

  create('cat', o => {
    const fur = 0x1f2230, mat = material(fur), P = o.parts;

    P.pose = new T3.Group();
    o.art.add(P.pose);

    // 細長的身體
    P.body = new T3.Mesh(new T3.SphereGeometry(.3, 16, 12), mat);
    P.body.scale.set(1.9, .5, .52);
    P.body.position.set(0, .42, 0);
    P.pose.add(P.body);

    // 頭、耳朵、眼睛、嘴
    P.head = new T3.Group();
    P.head.position.set(.56, .55, 0);
    const skull = new T3.Mesh(new T3.SphereGeometry(.18, 16, 12), mat);
    skull.scale.set(1.05, .95, .95);
    P.head.add(skull);

    P.ears = [-1, 1].map(s => {
      const g = new T3.Group();
      g.position.set(-.02, .15, s * .09);
      const ear = new T3.Mesh(new T3.ConeGeometry(.065, .16, 4), mat);
      ear.position.y = .07;
      g.add(ear);
      P.head.add(g);
      return g;
    });

    P.eyes = [-1, 1].map(s => orb(P.head, .028, .15, .04, s * .07, 0xf1d578, 8, 6));

    P.mouth = new T3.Mesh(new T3.SphereGeometry(.035, 8, 6), material(0x5a1f2b));
    P.mouth.position.set(.17, -.05, 0);
    P.mouth.scale.set(1, .2, 1);
    P.head.add(P.mouth);

    // 生日派對帽（只有生日彩蛋時出現）
    P.hat = new T3.Group();
    const cone = new T3.Mesh(new T3.ConeGeometry(.09, .22, 8), material(0xe0a176));
    cone.position.y = .26;
    P.hat.add(cone, orb(P.hat, .03, 0, .38, 0, 0xffffff, 8, 6));
    P.hat.visible = false;
    P.head.add(P.hat);
    P.pose.add(P.head);

    // 四條細腿（各自擺動）
    P.legs = [[.36, -.09], [.36, .09], [-.38, -.09], [-.38, .09]].map(([x, z]) => {
      const g = new T3.Group();
      g.position.set(x, .38, z);
      cyl(g, .035, .03, .38, 0, -.19, 0, fur, 8);
      P.pose.add(g);
      return g;
    });

    // 尾巴
    P.tail = new T3.Group();
    P.tail.position.set(-.55, .5, 0);
    const t1 = cyl(P.tail, .03, .026, .5, -.12, .2, 0, fur, 8);
    t1.rotation.z = .5;
    const t2 = cyl(P.tail, .026, .02, .3, -.255, .57, 0, fur, 8);
    t2.rotation.z = .1;
    P.pose.add(P.tail);

    P.k = { h: .2, hy: .26 };

    clickZone(o, 1.6, 1.2, 1.6, 0, .5, 0, () => o.interact(o));
  }, o => {
    // 無反應、喵、打哈欠、伸懶腰、動尾巴、動耳朵
    const acts = [['none', 0], ['meow', 1], ['yawn', 2], ['stretch', 2.2], ['tail', 2], ['ears', 1.6]];
    const [name, dur] = acts[Math.floor(Math.random() * acts.length)];

    CAT.act = name;
    CAT.actDur = dur;
    CAT.actT = dur;

    if (name === 'meow') playCatMeow();
    if (CAT.state === 'sleep' && name !== 'none') { CAT.state = 'idle'; CAT.t = 0; CAT.wait = rnd(4, 7); }
  }, {
    fixed: true
  });

  function catTarget(o) {
    for (let i = 0; i < 40; i++) {
      const x = rnd(-23, 23), z = rnd(-19, 19);
      if (Math.abs(x) < 13.5 && Math.abs(z) < 9) continue;                          // 不踏進球場
      if (Math.hypot(x - 7, z + 9.5) < 3) continue;                                 // 記分板
      if (TREE_POS.some(([a, b]) => Math.hypot(x - a, z - b) < 2)) continue;
      if (list.some(b => b !== o && b.id !== 'sailboat' && active(b) && Math.hypot(x - b.x, z - b.z) < 2)) continue;
      const d = Math.hypot(x - o.x, z - o.z);
      if (d < 3 || d > 14) continue;                                                // 每次走不太遠
      return { x, z };
    }
    return null;
  }

  function updateCat(o, dt) {
    const P = o.parts, C = CAT, now = performance.now() * .001;
    C.t += dt;
    C.actT = Math.max(0, C.actT - dt);

    const party = bday.active && bday.lit;

    // 排球靠近：醒來伸懶腰
    const near = Math.hypot(ball.position.x - o.x, ball.position.z - o.z) < 2.4;
    if (near && C.state === 'sleep' && C.t > 1) {
      C.state = 'idle'; C.t = 0; C.wait = rnd(3, 6);
      C.act = 'stretch'; C.actDur = 2.2; C.actT = 2.2;
    }

    if (party) {
      if (C.state !== 'idle') { C.state = 'idle'; C.t = 0; }
      C.wait = 99;
    } else if (C.state === 'sleep' && C.t > C.wait) {
      C.state = 'idle'; C.t = 0; C.wait = rnd(3, 7);
    } else if (C.state === 'idle' && C.t > C.wait) {
      const r = Math.random();
      if (r < .55) {
        const tg = catTarget(o);
        if (tg) { C.tx = tg.x; C.tz = tg.z; C.state = 'walk'; C.t = 0; } else { C.t = 0; }
      } else if (r < .85) { C.state = 'sleep'; C.t = 0; C.wait = rnd(20, 60); }
      else { C.t = 0; C.wait = rnd(3, 6); }
    } else if (C.state === 'walk') {
      const dx = C.tx - o.x, dz = C.tz - o.z, d = Math.hypot(dx, dz);
      if (d < .15 || C.t > 30) { C.state = 'idle'; C.t = 0; C.wait = rnd(4, 9); }
      else {
        o.x += dx / d * .85 * dt;
        o.z += dz / d * .85 * dt;
        const want = -Math.atan2(dz, dx);
        const diff = Math.atan2(Math.sin(want - P.pose.rotation.y), Math.cos(want - P.pose.rotation.y));
        P.pose.rotation.y += diff * Math.min(1, dt * 5);
      }
    }
    o.root.position.set(o.x, 0, o.z);

    // 姿勢：睡覺時蜷伏，其他時候站著
    const sleeping = C.state === 'sleep', walking = C.state === 'walk';
    const k = P.k, L = Math.min(1, dt * 5);
    k.h += ((sleeping ? .2 : .42) - k.h) * L;
    k.hy += ((sleeping ? .26 : .55) - k.hy) * L;

    P.body.position.y = k.h;
    P.body.scale.y = sleeping ? .42 : .5;
    P.head.position.y = k.hy;
    P.legs.forEach((g, i) => {
      g.position.y = k.h - .04;
      g.scale.y = Math.max(.08, (k.h - .04) / .38);
      g.rotation.z = walking ? Math.sin(now * 7 + (i === 1 || i === 2 ? Math.PI : 0)) * .5 : 0;
    });

    // 動作進度 0 → 1 → 0
    const s = C.actT > 0 ? Math.sin(Math.PI * (1 - C.actT / C.actDur)) : 0;
    const act = C.actT > 0 ? C.act : '';

    P.pose.rotation.z = act === 'stretch' ? -.28 * s : 0;
    P.pose.scale.x = act === 'stretch' ? 1 + .1 * s : 1;
    P.head.rotation.z = (act === 'yawn' ? .45 * s : 0) + (act === 'meow' ? .25 * s : 0) + (party ? .5 : 0) + (sleeping ? -.5 : 0);
    P.mouth.scale.y = .2 + (act === 'yawn' ? 2.4 * s : 0) + (act === 'meow' ? 1.6 * Math.abs(Math.sin(now * 14)) : 0);

    P.tail.rotation.y = act === 'tail' || party ? Math.sin(now * 10) * .55 * (party ? 1 : s) : Math.sin(now * 1.5) * .15;
    P.tail.rotation.z = act === 'stretch' ? .35 * s : 0;
    P.ears.forEach((e, i) => { e.rotation.x = act === 'ears' ? Math.sin(now * 25 + i * 2) * .4 * s : 0; });

    // 眨眼：睡覺、打哈欠時閉眼
    C.blink -= dt;
    if (C.blink < -.12) C.blink = rnd(2.5, 6);
    const closed = sleeping || act === 'yawn' || (C.blink < 0 && C.blink > -.12);
    P.eyes.forEach(e => { e.scale.y = closed ? .1 : 1; });

    P.hat.visible = party;
  }
// ===== 生日彩蛋：已解鎖黑貓的特殊反應 =====

window.worldBirthdayCatReaction = () => {

  const o = byId.get('cat');

  // 黑貓未解鎖或仍在降落時，不觸發
  if (
    !o ||
    !active(o) ||
    o.arrival
  ) {
    return false;
  }

  CAT.state = 'idle';
  CAT.t = 0;
  CAT.wait = 99;

  // 播放原本就有的伸懶腰動作
  CAT.act = 'stretch';
  CAT.actDur = 2.2;
  CAT.actT = 2.2;

  return true;

};
  // ===== 第 15 天：野餐籃、三明治、魚罐頭 =====
   create('basket', o => {
    const wicker = 0xb58a68, dk = 0x906243, cx = -.95, cz = -.45;

    // 中空的籃身：底、四面牆
    cub(o.art, 1.25, .05, .8, cx, .1, cz, dk);
    for (const z of [-.4, .4]) cub(o.art, 1.25, .5, .05, cx, .37, cz + z, wicker);
    for (const x of [-.6, .6]) cub(o.art, .05, .5, .8, cx + x, .37, cz, wicker);

    // 編織紋與兩側提環
    for (let i = 0; i < 4; i++) for (const z of [-.43, .43]) cub(o.art, 1.27, .04, .02, cx, .2 + i * .11, cz + z, dk);
    for (const s of [-1, 1]) {
      const h = new T3.Mesh(new T3.TorusGeometry(.14, .03, 6, 14), material(dk));
      h.position.set(cx + s * .63, .45, cz);
      h.rotation.y = Math.PI / 2;
      o.art.add(h);
    }

    // 籃內物品
    const inner = new T3.Group();
    inner.position.set(cx, .12, cz);
    o.art.add(inner);
    o.parts.inner = inner;

    // 方形三明治：吐司、生菜、火腿、起司、吐司
    const sandwich = (x, y, z, rot) => {
      const g = new T3.Group();
      g.position.set(x, y, z);
      g.rotation.y = rot;
      [[.05, 0xffe0a8], [.03, 0x8bbba9], [.03, 0xe8a39a], [.025, 0xf2e06b], [.05, 0xffe0a8]]
        .reduce((h, [t, c]) => { cub(g, .42, t, .38, 0, h + t / 2, 0, c); return h + t; }, 0);
      inner.add(g);
    };
    sandwich(-.25, 0, 0, .1);
    sandwich(-.25, .19, .02, -.15);

    // 魚罐頭：罐身、半掀開的蓋子、油與魚
    cyl(inner, .2, .2, .15, .28, .08, 0, 0x9aafbf, 18);
    cyl(inner, .185, .185, .02, .28, .16, 0, 0x5a3d2b, 18);
    const fish = orb(inner, .09, .27, .19, 0, 0xe9a58f, 10, 8);
    fish.scale.set(1.8, .7, .8);
    const tail = new T3.Mesh(new T3.ConeGeometry(.06, .1, 4), material(0xe9a58f));
    tail.rotation.z = Math.PI / 2;
    tail.position.set(.45, .19, 0);
    inner.add(tail);
    const peel = cub(inner, .36, .012, .2, .28, .26, -.14, 0xe1e5e8);
    peel.rotation.x = -.9;

    // 可掀開的蓋子（鉸鏈在後緣）
    o.parts.lid = new T3.Group();
    o.parts.lid.position.set(cx, .63, cz - .42);
    o.art.add(o.parts.lid);
    cub(o.parts.lid, 1.3, .07, .88, 0, 0, .44, dk);
    for (const x of [-.4, 0, .4]) cub(o.parts.lid, .06, .08, .9, x, .01, .44, wicker);
    cub(o.parts.lid, .12, .1, .05, 0, -.02, .88, 0xe0a176);

    o.open = false;

    clickZone(o, 1.5, 1.3, 1.1, cx, .6, cz, () => o.interact(o));
  }, o => {
    o.open = !o.open;
  }, {
    fixed: true,
    bound: 'picnic'
  });

  // ===== 第 30 天：水域與小帆船 =====

  const ARRIVAL_ROUTE = { x: -72, z: 14, rx: 55, rz: 48 };
  const SEA = { shoreX: -20.5, farX: -430, zLimit: 380 };
  const SEA_WIDTH = 1100;
  const water = new T3.Mesh(
    new T3.PlaneGeometry(SEA_WIDTH, 1100),
    new T3.MeshBasicMaterial({
      color: 0x70b8c5,
      transparent: true,
      opacity: .84,
      depthWrite: false,
      fog: true
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(SEA.shoreX - SEA_WIDTH / 2, .045, 0);
  water.visible = false;
  sc.add(water);
  
  create('sailboat', o => {
    const hull = orb(
      o.art, 1.12,
      0, .35, 0,
      0xf5dfb7, 18, 12
    );

    hull.scale.set(.72, .35, 1.4);

    cub(
      o.art, .8, .12, 1.3,
      0, .59, 0, 0xc18d6e
    );

    cyl(
      o.art, .045, .05, 2.55,
      0, 1.88, 0, 0x926a4f
    );

    const shape = new T3.Shape();

    shape.moveTo(0, 0);
    shape.lineTo(0, 2.1);
    shape.lineTo(1.17, .12);
    shape.closePath();

    const sail = new T3.Mesh(
      new T3.ShapeGeometry(shape),
      new T3.MeshBasicMaterial({
        color: 0xfff5dc,
        side: T3.DoubleSide
      })
    );

    sail.position.set(.06, .76, 0);
    o.art.add(sail);

    clickZone(
      o, 2.4, 3.0, 3.5,
      0, 1.5, 0,
      () => o.interact(o)
    );

  }, () => {
    cameraMode =
      cameraMode === 'boat' ? 'orbit' : 'boat';

    if (organizing) toggleOrganizer();

    updateBoatControls();

    if (cameraMode === 'boat') {
      popText('方向鍵／WASD 操控帆船，按返回離船');
    }

  }, {
    fixed: true
  });

  // ===== 造訪日期紀錄 =====

  function today() {
    const d = new Date();

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  }

  function load(key, fallback) {
    try {
      const v = JSON.parse(vbStore.getItem(key));
      return v === null ? fallback : v;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      vbStore.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('無法儲存場邊物件：', e);
    }
  }

  let dates = load('vb-visit-dates', []);

  if (!Array.isArray(dates)) {
    dates = [];
  }

  dates = [
    ...new Set(
      dates.filter(v => typeof v === 'string')
    )
  ];

  const seen = load('vb-items-seen', {});
  const layout = load('vb-item-layout', {});

  function recordVisit() {
    if (VB_IS_DEV) return;

    const t = today();

    if (!dates.includes(t)) {
      dates.push(t);
      save('vb-visit-dates', dates);
    }
  }

  recordVisit();

  let currentDay = -1;
  let viewMix = 0;
  let clock = 0;

  const pressed = new Set();

  let boatSpeed = 0;
  let boatHeading = 0;

  // ===== 從畫面上方之外進入 =====

  function startHeight(o) {
    cam.updateMatrixWorld();

    for (let y = 12; y < 130; y += 5) {
      const q = new T3.Vector3(
        o.x, y, o.z
      ).project(cam);

      if (
        q.y > 1.25 &&
        q.z > -1 &&
        q.z < 1
      ) {
        return y + 5;
      }
    }

    return 70;
  }

  // ===== 物件顯示與點擊管理 =====

  function hitEnable(o, yes) {
    const i = hitList.indexOf(o.root);

    if (yes && i < 0) {
      hitList.push(o.root);
    }

    if (!yes && i >= 0) {
      hitList.splice(i, 1);
    }
  }

  function active(o) {
    const picnic = byId.get('picnic');

    return (
      o.unlocked &&
      !o.stored &&
      !o.pending &&
      (!o.bound || (picnic.unlocked && !picnic.stored))
    );
  }

  function refreshVisibility() {
    for (const o of list) {
      const yes = active(o);

      o.root.visible = yes;
      hitEnable(o, yes && !o.arrival);
    }

    water.visible = byId.get('sailboat').unlocked;
  }

  function syncDay(day) {
    for (const o of list) {
      // 小帆船正式版於 2026/12/24 開放
      // 開發版仍使用第 30 天進行測試
      const unlock = o.id === 'sailboat'
        ? (VB_IS_DEV
            ? day >= 30
            : today() >= '2026-12-24')
        : day >= o.day;

      if (unlock && !o.unlocked) {
        o.unlocked = true;

        if (
          !VB_IS_DEV &&
          !o.fixed &&
          layout[o.id]
        ) {
          const v = layout[o.id];

          if (
            Number.isFinite(v.x) &&
            Number.isFinite(v.z)
          ) {
            o.x = v.x;
            o.z = v.z;
          }

          o.stored = !!v.stored;
          o.rot = Number.isFinite(v.rot) ? v.rot : 0;
        }

        o.root.position.set(o.x, 0, o.z);

        o.root.rotation.y = o.rot;

        const first = VB_IS_DEV || !seen[o.id];

        if (first && !o.stored) {
          if (VB_IS_DEV) {
  // 小帆船從水面漂來，其他物件照舊降落
  if (o.id === 'sailboat') {
    startWindSailboatArrival(o);
  } else {
    o.arrival = {
      t: -list.indexOf(o) * .25,
      d: 6,
      height: startHeight(o)
    };
    o.root.position.y = o.arrival.height;
  }
} else {
            // 正式版：排進送達佇列，等玩家準備好
            o.pending = true;
            o.arrival = null;
          }
          } else {
          o.arrival = null;
        }
      }

      if (!unlock) {
        o.unlocked = false;
        o.arrival = null; 
        o.pending = false;

        if (VB_IS_DEV) {
          o.stored = false;
        }
      }
    }

    refreshVisibility();

    if (
      !byId.get('cart').unlocked &&
      organizing
    ) {
      toggleOrganizer();
    }

    renderStorage();
  }

  // ===== 整理模式：地面格線 =====

  const gridPositions = [];

  for (let k = -24; k <= 24; k += STEP) {
    for (let q = -24; q < 24; q += STEP) {
      if (
        Math.abs(k) < 12.7 &&
        Math.abs(q) < 8.3
      ) continue;

      gridPositions.push(
        k, .07, q,
        k, .07, q + STEP
      );

      gridPositions.push(
        q, .07, k,
        q + STEP, .07, k
      );
    }
  }

  const lines = new T3.BufferGeometry();

  lines.setAttribute(
    'position',
    new T3.Float32BufferAttribute(
      gridPositions, 3
    )
  );

  const grid = new T3.LineSegments(
    lines,
    new T3.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: .2,
      depthWrite: false
    })
  );

  grid.visible = false;
  sc.add(grid);

  // ===== 整理模式介面（記分板風格） =====

  const style = document.createElement('style');
  style.textContent = `
    #vbStoreBox{position:fixed;right:14px;bottom:14px;z-index:15;display:none;width:min(270px,calc(100vw - 28px));max-height:52vh;overflow:auto;padding:14px;color:#fff;font:14px "PingFang TC","Noto Sans TC",system-ui,sans-serif;background:#355c97;border:6px solid #1d2a50;border-radius:18px;box-shadow:0 8px 0 #1d2a50,0 18px 40px rgba(0,0,0,.35)}
    #vbStoreBox h3{margin:0;font-size:18px;letter-spacing:.2em}
    #vbStoreBox h4{margin:14px 0 8px;font-size:13px;opacity:.9;letter-spacing:.1em}
    #vbStoreBox .row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
    #vbStoreBox .hint{font-size:12px;opacity:.85;line-height:1.6;margin:0 0 10px}
    #vbStoreBox .sel{padding:8px 10px;border-radius:12px;background:#e0a176;color:#1d2a50;font-weight:700}
    #vbStoreBox .tools{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
    #vbStoreBox .stored{display:flex;flex-wrap:wrap;gap:6px}
    #vbStoreBox button{border:0;border-radius:999px;background:#1d2a50;color:#fff;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer;transition:transform .15s}
    #vbStoreBox button:hover{transform:translateY(-2px)}
    #vbStoreBox button:active{transform:scale(.95)}
    #vbStoreBox button:focus-visible{outline:3px solid #fff;outline-offset:2px}
    /* ===== 排球車：與擊球練習一致的玻璃面板 ===== */

#vbStoreBox {
  box-sizing: border-box;

  right: calc(16px + env(safe-area-inset-right, 0px));
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));

  width: min(290px, calc(100vw - 32px));
  max-height: min(72vh, 570px);

  padding: 14px;

  border: 1px solid rgba(255,255,255,.42);
  border-radius: 16px;

  background: rgba(29,42,80,.50);
  box-shadow: 0 12px 28px rgba(10,20,45,.22);

  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  font: 13px/1.55 system-ui, "PingFang TC", sans-serif;
}

/* 標題 */
#vbStoreBox h3 {
  font-size: 15px;
  letter-spacing: .08em;
}

#vbStoreBox h4 {
  margin: 12px 0 6px;
  font-size: 13px;
}

#vbStoreBox .hint {
  font-size: 12px;
  font-weight: 400;
  opacity: .85;
}

/* 標題與關閉按鈕 */
#vbStoreBox .row {
  margin-bottom: 9px;
}

#vbStoreBox .row button {
  display: grid;
  place-items: center;

  width: 34px;
  height: 34px;
  padding: 0;

  border: 1px solid rgba(255,255,255,.34);
  border-radius: 10px;

  background: rgba(255,255,255,.10);

  font-size: 22px;
  line-height: 1;
}

/* 已選取物件 */
#vbStoreBox .sel {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(224,161,118,.84);
}

/* 左轉、恢復、右轉：三個等寬按鈕 */
#vbStoreBox .tools {
  grid-template-columns: repeat(3, minmax(0,1fr));
  gap: 8px;
}

#vbStoreBox .tools button {
  display: flex;
  align-items: center;
  justify-content: center;

  min-height: 44px;
  padding: 8px 10px;

  border: 1px solid rgba(255,255,255,.34);
  border-radius: 10px;

  background: rgba(255,255,255,.10);
}

/* 收進排球車：獨立佔滿下一列 */
#vbStoreBox .tools .cart-store {
  grid-column: 1 / -1;
}

/* SVG 圖示 */
#vbStoreBox .tools button svg {
  width: 25px;
  height: 25px;

  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 車上物品按鈕 */
#vbStoreBox .stored button {
  border: 1px solid rgba(255,255,255,.34);
  background: rgba(255,255,255,.10);
  border-radius: 10px;
}
    #vbBoatCtrl{display:none;position:fixed;left:14px;bottom:14px;z-index:16;color:#fff;font:700 14px system-ui;background:#355c97;border:5px solid #1d2a50;border-radius:16px;padding:10px 12px;touch-action:none;user-select:none;box-shadow:0 6px 0 #1d2a50}
    #vbBoatCtrl .arrows{display:grid;grid-template-columns:repeat(3,46px);gap:5px;margin-top:8px}
    #vbBoatCtrl button{border:0;background:#1d2a50;color:#fff;border-radius:10px;padding:10px;touch-action:none;cursor:pointer;font:inherit}
  `;
  document.head.append(style);

  const storeBox = document.createElement('div');
  storeBox.id = 'vbStoreBox';
  document.body.append(storeBox);

  const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
  const btn = text => { const b = el('button'); b.type = 'button'; b.textContent = text; return b; };
  // ===== 排球車操作圖示 =====

const cartIcons = {

  // 向左旋轉
  left: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7H3V3"/>
      <path d="M3 7a9 9 0 1 1-1 8"/>
      <path d="m3 7 4-4"/>
    </svg>
  `,

  // 恢復初始位置
  reset: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12V4h8"/>
      <path d="m4 4 8 8"/>
      <path d="M9 19h9a2 2 0 0 0 2-2V8"/>
    </svg>
  `,

  // 向右旋轉
  right: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17 7h4V3"/>
      <path d="M21 7a9 9 0 1 0 1 8"/>
      <path d="m21 7-4-4"/>
    </svg>
  `,

  // 收進排球車
  store: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10h16v10H4z"/>
      <path d="M12 2v12"/>
      <path d="m8 10 4 4 4-4"/>
    </svg>
  `
};


// 建立只有圖示的按鈕
function cartIconButton(icon, label, handler) {

  const b = btn('');

  b.innerHTML = cartIcons[icon];

  b.setAttribute('aria-label', label);
  b.title = label;

  b.onclick = handler;

  return b;
}
  let selected = null;
  const RADIUS = { bottle: .6, towel: 1.1, cart: 1.5, picnic: 2.9, machine: 1.8 };
 
  const selRing = new T3.Mesh(
    new T3.RingGeometry(1.05, 1.25, 48),
    new T3.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8, side: T3.DoubleSide, depthWrite: false })
  );
  selRing.rotation.x = -Math.PI / 2;
  selRing.position.y = .09;
  selRing.visible = false;
  sc.add(selRing);

  function place(o) {
    o.root.position.set(o.x, 0, o.z);
    o.root.rotation.y = o.rot || 0;
  }

  function saveLayout(o) {
    layout[o.id] = { x: o.x, z: o.z, stored: o.stored, rot: o.rot || 0 };
    save('vb-item-layout', layout);
  }

  function rotateSelected(dir) {
    if (!selected) return;
    selected.rot = (selected.rot || 0) + dir * Math.PI / 4;
    selected.root.rotation.y = selected.rot;
    saveLayout(selected);
  }
  // ===== 恢復物件初始位置與方向 =====

function resetSelectedPosition() {

  if (!selected || !POS[selected.id]) return;

  // 取得這個物件的預設位置
  const [x, z] = POS[selected.id];

  // 原始位置若被其他物件佔用，
  // 就改放最近的合法空位，避免重疊。
  const point = legal(selected, x, z)
    ? { x, z }
    : nearest(selected, x, z);

  selected.x = point.x;
  selected.z = point.z;

  // 旋轉角度也恢復原始狀態
  selected.rot = 0;

  // 更新實際 3D 物件
  place(selected);

  // 儲存新位置
  saveLayout(selected);

  // 更新排球車面板
  renderStorage();

}
  // ===== 防止物件重疊 =====

  function legal(o, x, z) {
    if (Math.abs(x) > 23 || Math.abs(z) > 19) return false;
    if (Math.abs(x) < 13 && Math.abs(z) < 8.5) return false;
    if (Math.hypot(x - 7, z + 9.5) < 3) return false;                       // 記分板
    if (TREE_POS.some(([a, b]) => Math.hypot(x - a, z - b) < 2.2)) return false;

    for (const b of list) {
      if (b === o || !active(b) || b.bound || b.id === 'sailboat' || b.id === 'cat') continue;

      const pair = (o.id === 'bottle' && b.id === 'towel') || (o.id === 'towel' && b.id === 'bottle');
      const gap = pair ? 1.0 : (o.id === 'picnic' || b.id === 'picnic') ? 3.8 : 1.75;

      if (Math.hypot(x - b.x, z - b.z) < gap) return false;
    }
    return true;
  }

  function nearest(o, x, z) {
    const a = Math.round(x / STEP) * STEP;
    const b = Math.round(z / STEP) * STEP;
    let best = null, dist = Infinity;

    for (let i = -12; i <= 12; i++) {
      for (let j = -12; j <= 12; j++) {
        const xx = a + i * STEP, zz = b + j * STEP;
        if (!legal(o, xx, zz)) continue;
        const d = (xx - x) ** 2 + (zz - z) ** 2;
        if (d < dist) { dist = d; best = { x: xx, z: zz }; }
      }
    }
    return best || { x: o.x, z: o.z };
  }

  // ===== 面板內容 =====

  function storeSelected() {
    if (!selected) return;
    selected.stored = true;
    selected.arrival = null;
    saveLayout(selected);
    selected = null;
    refreshVisibility();
    renderStorage();
  }

  function putBack(o) {
    o.stored = false;
    const p = nearest(o, o.x, o.z);
    o.x = p.x; o.z = p.z;
    place(o);
    saveLayout(o);
    selected = o;
    refreshVisibility();
    renderStorage();
  }

  function renderStorage() {
    storeBox.style.display = organizing ? 'block' : 'none';
    grid.visible = organizing;
    selRing.visible = organizing && !!selected;
    if (!organizing) return;

    storeBox.replaceChildren();

    const head = el('div', 'row');
    const title = el('h3');
    title.textContent = '排球車';
    const done = btn('×');

    done.setAttribute('aria-label', '完成整理');
    done.title = '完成整理';

    done.onclick = toggleOrganizer;
    head.append(title, done);

    const hint = el('p', 'hint');
    hint.textContent =
  '拖曳物件以移動位置。\n點選物件後可旋轉或收納。';

hint.style.whiteSpace = 'pre-line';
    storeBox.append(head, hint);

    if (selected && active(selected)) {
      const s = el('div', 'sel');
      s.textContent = '已選取：' + selected.name;
      storeBox.append(s);

      const tools = el('div', 'tools');

// 第一列：左轉、恢復初始位置、右轉
tools.append(

  cartIconButton(
    'left',
    '向左旋轉',
    () => rotateSelected(-1)
  ),

  cartIconButton(
    'reset',
    '恢復初始位置',
    resetSelectedPosition
  ),

  cartIconButton(
    'right',
    '向右旋轉',
    () => rotateSelected(1)
  )

);


// 第二列：收進排球車
if (!selected.noStore && !selected.fixed) {

  const k = cartIconButton(
    'store',
    '收進排球車',
    storeSelected
  );

  k.classList.add('cart-store');

  tools.append(k);

}

storeBox.append(tools);

} // 結束「已選取物件」區塊

// 無論是否選取物件，都顯示車上收納清單
// 無論有沒有選取物件，都顯示收納清單
const stored = list.filter(
  o => o.stored && o.unlocked && !o.fixed && !o.noStore
);

const h4 = el('h4');
h4.textContent = '車上收納';
storeBox.append(h4);

    const box = el('div', 'stored');
    if (!stored.length) {
      const p = el('p', 'hint');
      p.textContent = '車上目前是空的';
      box.append(p);
    }
    for (const o of stored) {
      const b = btn('放回 ' + o.name);
      b.onclick = () => putBack(o);
      box.append(b);
    }
    storeBox.append(box);
  }

  function toggleOrganizer() {
    if (!byId.get('cart').unlocked) return;
    organizing = !organizing;
   if (!organizing) {
  selected = null;
  drag = null;
}

renderStorage();
    popText(organizing ? '拖曳物件移動；點一下物件可以旋轉或收起' : '已完成整理');
  }

  window.addEventListener('keydown', e => {
    if (!organizing || !selected) return;
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 'q') rotateSelected(-1);
    if (k === 'e') rotateSelected(1);
  });

  // ===== 整理模式：拖曳物件（排球車也能拖） =====

  let drag = null;
  const groundPlane = new T3.Plane(new T3.Vector3(0, 1, 0), 0);
  const hitPoint = new T3.Vector3();

  function pickMoveable(e) {
    ndc(e);
    ray.setFromCamera(m2, cam);

    const groups = list.filter(o => active(o) && !o.fixed && !o.arrival).map(o => o.root);
    const hits = ray.intersectObjects(groups, true);

    for (const h of hits) {
      let p = h.object;
      while (p && !p.userData.worldItem && p.parent) p = p.parent;
      if (p && p.userData.worldItem) return byId.get(p.userData.worldItem);
    }
    return null;
  }

  // ===== 整理模式專用拖曳控制 =====

// 按下滑鼠：選取物件
cv.addEventListener('pointerdown', e => {

  if (
    !organizing ||
    cameraMode !== 'orbit'
  ) return;

  // 整理模式不交給一般球場的鏡頭控制
  const o = pickMoveable(e);

// 點到空白處，讓原本的球場控制鏡頭
if (!o) return;

// 只有點到可移動物件時，才交給整理模式
e.stopImmediatePropagation();
e.preventDefault();

  cv.setPointerCapture(e.pointerId);

  selected = o;

  // 先建立拖曳狀態，再更新面板
  drag = {
  id: e.pointerId,
  o,
  startX: e.clientX,
  startY: e.clientY,
  moved: false
};

  renderStorage();

}, true);


// 移動滑鼠：拖曳已選取物件
cv.addEventListener('pointermove', e => {

  if (
    !organizing ||
    cameraMode !== 'orbit'
  ) return;

  // 整理期間不讓一般視角跟著滑鼠移動
  // 沒有拖曳物件時，不攔截原本的鏡頭移動
if (!drag || drag.id !== e.pointerId) return;

e.stopImmediatePropagation();
e.preventDefault();

// 單純點擊只選取，超過 6px 才開始拖曳
if (!drag.moved) {
  if (
    Math.hypot(
      e.clientX - drag.startX,
      e.clientY - drag.startY
    ) < 6
  ) return;

  drag.moved = true;
}

ndc(e);
ray.setFromCamera(m2, cam);

  // 將滑鼠位置投影到地面
  if (ray.ray.intersectPlane(
    groundPlane,
    hitPoint
  )) {

    drag.o.root.position.x = hitPoint.x;
    drag.o.root.position.z = hitPoint.z;

  }

}, true);


// 放開滑鼠：確認物件位置
function finishDrag(e) {

  if (
    !organizing ||
    cameraMode !== 'orbit'
  ) return;

  // 空白處的滑鼠放開，交給球場完成鏡頭操作
if (!drag || drag.id !== e.pointerId) return;

e.stopImmediatePropagation();
e.preventDefault();

// 只是點一下選取物件，不改變它的位置
if (!drag.moved) {
  drag = null;
  return;
}

const o = drag.o;

// 尋找最近的合法格線位置
  const p = nearest(
    o,
    o.root.position.x,
    o.root.position.z
  );

  o.x = p.x;
  o.z = p.z;

  place(o);
  saveLayout(o);

  drag = null;

}


cv.addEventListener(
  'pointerup',
  finishDrag,
  true
);

cv.addEventListener(
  'pointercancel',
  finishDrag,
  true
);


// 防止滑鼠捕捉意外中斷而留下拖曳狀態
cv.addEventListener(
  'lostpointercapture',
  e => {

    if (
      !drag ||
      drag.id !== e.pointerId
    ) return;

   if (!drag.moved) {
  drag = null;
  return;
}

const o = drag.o;

const p = nearest(
      o,
      o.root.position.x,
      o.root.position.z
    );

    o.x = p.x;
    o.z = p.z;

    place(o);
    saveLayout(o);

    drag = null;

  },
  true
);

  // ===== 小帆船：鍵盤與手機控制 =====

  const controls = document.createElement('div');
  controls.id = 'vbBoatCtrl';

  controls.innerHTML = `
    <div>小帆船航行</div>
    <button type="button" data-exit="1">
      返回球場
    </button>

    <div class="arrows">
      <span></span>
      <button data-key="arrowup">↑</button>
      <span></span>

      <button data-key="arrowleft">←</button>
      <button data-key="arrowdown">↓</button>
      <button data-key="arrowright">→</button>
    </div>
  `;

  document.body.append(controls);

  controls.querySelector('[data-exit]').onclick =
    () => {
      cameraMode = 'orbit';
      updateBoatControls();
    };

  for (
    const btn of
    controls.querySelectorAll('[data-key]')
  ) {
    const key = btn.dataset.key;

    btn.addEventListener('pointerdown', e => {
      e.preventDefault();

      btn.setPointerCapture(e.pointerId);
      pressed.add(key);
    });

    for (
      const evt of [
        'pointerup',
        'pointercancel',
        'pointerleave'
      ]
    ) {
      btn.addEventListener(
        evt,
        () => pressed.delete(key)
      );
    }
  }

  function updateBoatControls() {
    updateChairControls();
    controls.style.display =
      cameraMode === 'boat'
        ? 'block'
        : 'none';

    if (cameraMode !== 'boat') {
      pressed.clear();
    }
  }

  window.addEventListener('keydown', e => {
    if (cameraMode !== 'boat') return;

    if (
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        document.activeElement.tagName
      )
    ) return;

    const k = e.key.toLowerCase();

    if (
      [
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
        'w', 'a', 's', 'd', 'shift'
      ].includes(k)
    ) {
      pressed.add(k);
      e.preventDefault();
    }

    if (k === 'escape') {
      cameraMode = 'orbit';
      updateBoatControls();
    }
  });

  window.addEventListener(
    'keyup',
    e => pressed.delete(e.key.toLowerCase())
  );

  window.addEventListener(
    'blur',
    () => pressed.clear()
  );

  // ===== 裁判椅：自由環顧 =====

  const chairLook = { yaw: 0, pitch: -.12, fov: 45, drag: null };

  const chairCtrl = document.createElement('button');
  chairCtrl.type = 'button';
  chairCtrl.textContent = '離開裁判椅';
  chairCtrl.style.cssText =
    'position:fixed;left:14px;bottom:14px;z-index:16;display:none;border:0;border-radius:999px;' +
    'background:#1d2a50;color:#fff;padding:9px 16px;font:700 14px system-ui;cursor:pointer;box-shadow:0 4px 0 #0d1533';
  chairCtrl.onclick = () => { cameraMode = 'orbit'; updateBoatControls(); };
  document.body.append(chairCtrl);

  function updateChairControls() {
    chairCtrl.style.display = cameraMode === 'chair' ? 'block' : 'none';
  }

  cv.addEventListener('pointerdown', e => {
    if (cameraMode !== 'chair') return;
    e.stopImmediatePropagation();
    e.preventDefault();
    cv.setPointerCapture(e.pointerId);
    chairLook.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false };
  }, true);

  cv.addEventListener('pointermove', e => {
    const d = chairLook.drag;
    if (!d || d.id !== e.pointerId) return;
    e.stopImmediatePropagation();

    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) d.moved = true;

    const k = chairLook.fov / 45 * .005;
    chairLook.yaw -= (e.clientX - d.lx) * k;
    chairLook.pitch = Math.max(-.6, Math.min(1.45, chairLook.pitch + (e.clientY - d.ly) * k));
    d.lx = e.clientX;
    d.ly = e.clientY;
  }, true);

  function chairRelease(e) {
    const d = chairLook.drag;
    if (!d || d.id !== e.pointerId) return;
    e.stopImmediatePropagation();
    chairLook.drag = null;

    // 沒有拖曳，當作點擊
if (!d.moved && e.type === 'pointerup') {

  // 優先判斷是否點擊射手座
  if (
    pointerOnSagittarius(
      e.clientX,
      e.clientY
    ) &&
    startSagittarius()
  ) {
    return;
  }

  // 其他物件維持原本的互動
  const o = pick(e);

  if (o) {

    if (o.userData.ball) {
      hit();
    } else {
      o.userData.act();
    }

  }

}
  }
  cv.addEventListener('pointerup', chairRelease, true);
  cv.addEventListener('pointercancel', chairRelease, true);

  cv.addEventListener('wheel', e => {
    if (cameraMode !== 'chair') return;
    e.stopImmediatePropagation();
    e.preventDefault();
    chairLook.fov = Math.max(20, Math.min(70, chairLook.fov * Math.exp(e.deltaY * .001)));
  }, { capture: true, passive: false });

  // ===== 射手座：茶壺星群 → 星光人馬 → 射箭 =====
// 夜晚可見；坐上裁判椅，懸停顯示連線，點擊播放 12 秒動畫。

const sagChair = byId.get('chair');
const sagSky = new T3.Group();

sagSky.position.set(
  sagChair.x,
  84,
  sagChair.z - 160
);

sc.add(sagSky);


// ===== 星點 =====
// 前八顆構成茶壺星群，其餘為附近的微弱星點。
// 共 22 顆，全部會參與人馬變形。

const sagData = [
  ['τ Sgr', -24.8, 0, 2.1, .75],
  ['Nunki', -18.6, 5.6, 2.9, .98],
  ['φ Sgr', -9.9, 4.3, 2.2, .75],
  ['Kaus Borealis', 2.2, 14.3, 2.5, .85],
  ['Kaus Media', 8.1, 2.5, 2.6, .90],
  ['Alnasl', 22.3, .6, 2.2, .80],
  ['Kaus Australis', 6.2, -11.2, 3.2, 1],
  ['Ascella', -17.4, -6.8, 2.6, .87],

  ['', -27, 13, 1.1, .40],
  ['', -21, -14, 1.0, .36],
  ['', -11, -15, 1.2, .45],
  ['', -7, 13, 1.1, .39],
  ['', 13, 17, 1.2, .42],
  ['', 26, -8, 1.0, .40],
  ['', -29, -7, 1.1, .34],
  ['', 17, -14, 1.2, .38],
  ['', -3, -19, 1.1, .46],
  ['', 5, 20, 1.3, .40],
  ['', 25, 15, 1.0, .35],
  ['', -15, 17, 1.1, .42],
  ['', 29, 8, 1.1, .37],
  ['', -22, 19, 1.2, .37]
];

const sagIdle = sagData.map(
  a => new T3.Vector3(a[1], a[2], 0)
);
// 射手座專用圓形星點：沒有放射狀光暈
const sagRoundTex = (() => {

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;

  const ctx = canvas.getContext('2d');

  const edge = ctx.createRadialGradient(
    32, 32, 0,
    32, 32, 30
  );

  edge.addColorStop(0, 'rgba(255,255,255,1)');
  edge.addColorStop(.83, 'rgba(255,255,255,1)');
  edge.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, 64, 64);

  return new T3.CanvasTexture(canvas);

})();
const sagStars = sagData.map(
  ([name, x, y, size, brightness], i) => {

    const dot = new T3.Sprite(
      new T3.SpriteMaterial({
        map: sagRoundTex,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: false
       })
    );

    dot.position.copy(sagIdle[i]);
    dot.scale.set(size * .62, size * .62, 1);

    sagSky.add(dot);

    return {
      dot,
      brightness,
      phase: i * 1.71
    };
  }
);


// ===== 原始茶壺星群連線 =====

const sagEdges = [
  [0, 1], [0, 7],
  [1, 2], [2, 7],
  [2, 3], [3, 4],
  [2, 4], [4, 5],
  [5, 6], [4, 6],
  [6, 7]
];

const sagLines = new T3.LineSegments(

  new T3.BufferGeometry().setFromPoints(
    sagEdges.flatMap(
      ([a, b]) => [sagIdle[a], sagIdle[b]]
    )
  ),

  new T3.LineBasicMaterial({
    color: 0xdbe9ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false
  })

);

sagSky.add(sagLines);


// ===== 人馬的 22 個關節 =====
// 使用火柴人骨架概念。
// 星點會從原始位置移動到這些關節位置。

const sagPose = [
  [-16, -5],   // 馬身後部
  [-7, 0],     // 背部
  [6, -1],     // 馬身前部
  [10, -7],
  [-5, -10],
  [-13, -9],

  [-17, -18],  // 後腿
  [-21, -25],
  [-10, -12],
  [-10, -21],
  [-12, -26],

  [7, -9],     // 前腿
  [5, -19],
  [2, -26],
  [12, -18],
  [15, -25],

  [6, 0],      // 人的腰部
  [7, 12],     // 肩膀
  [7, 20],     // 頭
  [14, 13],    // 手臂
  [22, 14],    // 持弓的手
  [19, 13]     // 拉弦的手
].map(
  ([x, y]) => new T3.Vector3(x, y, 0)
);


// ===== 人馬骨架連接關係 =====

const sagBones = [
  [0, 1], [1, 2], [2, 3],
  [3, 4], [4, 5], [5, 0],

  [5, 6], [6, 7],
  [4, 8], [8, 9], [9, 10],
  [3, 11], [11, 12], [12, 13],
  [2, 14], [14, 15],

  [2, 16], [16, 17],
  [17, 18],
  [17, 19], [19, 20],
  [17, 21]
];


// ===== 動態線條工具 =====

function makeSagLine(vertexCount, segments) {

  const array = new Float32Array(vertexCount * 3);

  const geometry = new T3.BufferGeometry();

  geometry.setAttribute(
    'position',
    new T3.BufferAttribute(array, 3)
  );

  const material = new T3.LineBasicMaterial({
    color: 0xe4edff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false
  });

  const object = segments
    ? new T3.LineSegments(geometry, material)
    : new T3.Line(geometry, material);

  object.frustumCulled = false;

  sagSky.add(object);

  return {
    object,
    array,
    geometry,
    material
  };
}

const sagSkeleton = makeSagLine(
  sagBones.length * 2,
  true
);

const sagBow = makeSagLine(9, false);
const sagString = makeSagLine(3, false);
const sagArrow = makeSagLine(8, true);


// ===== 動畫狀態 =====

const sagState = {
  active: false,
  time: 0,
  hover: false,
  fade: 0,
  cooldown: 0,
  devPending: false,
  night: 0
};

const sagEase = value => {

  const x = Math.max(
    0,
    Math.min(1, value)
  );

  return x * x * (3 - 2 * x);
};


// ===== 判斷是否點到射手座 =====

function pointerOnSagittarius(clientX, clientY) {

  if (
    cameraMode !== 'chair' ||
    sagState.night < .35 ||
    sagState.active
  ) return false;

  cam.updateMatrixWorld(true);

  const rect = cv.getBoundingClientRect();

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let count = 0;

  for (const idle of sagIdle) {

    const p = idle.clone()
      .add(sagSky.position)
      .project(cam);

    if (p.z < -1 || p.z > 1) continue;

    const x =
      rect.left +
      (p.x + 1) * rect.width / 2;

    const y =
      rect.top +
      (1 - p.y) * rect.height / 2;

    if (
      x < rect.left - 30 ||
      x > rect.right + 30 ||
      y < rect.top - 30 ||
      y > rect.bottom + 30
    ) continue;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    count++;
  }

  return (
    count >= 6 &&
    clientX >= minX - 22 &&
    clientX <= maxX + 22 &&
    clientY >= minY - 22 &&
    clientY <= maxY + 22
  );
}


// ===== 開始人馬射箭 =====

function startSagittarius() {

  if (
    sagState.active ||
    cameraMode !== 'chair' ||
    sagState.night < .35 ||
    bday.active ||
    reveal ||
    organizing
  ) return false;

  sagState.active = true;
  sagState.time = 0;
  sagState.hover = false;

  return true;
}


// ===== 電腦：滑鼠懸停 =====

cv.addEventListener('pointermove', e => {

  if (e.pointerType === 'touch') return;

  sagState.hover =
    !e.buttons &&
    pointerOnSagittarius(
      e.clientX,
      e.clientY
    );

});

cv.addEventListener('pointerleave', () => {
  sagState.hover = false;
});


// ===== 鍵盤：對準星群按 E =====

window.addEventListener('keydown', e => {

  if (
    e.key.toLowerCase() !== 'e' ||
    e.repeat ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(
      document.activeElement.tagName
    )
  ) return;

  const rect = cv.getBoundingClientRect();

  if (
    pointerOnSagittarius(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    ) &&
    startSagittarius()
  ) {

    e.preventDefault();
    e.stopImmediatePropagation();

  }

}, true);


// ===== 每幀更新射手座 =====

function updateSky(dt) {

  sagState.night = sagEase(
    (starV - .12) / .58
  );

  sagSky.visible =
    sagState.night > .015;


  // 開發者測試：等鏡頭就位後開始

  if (
    sagState.devPending &&
    cameraMode === 'chair' &&
    viewMix > .9 &&
    sagState.night > .35
  ) {

    sagState.devPending = false;
    startSagittarius();

  }


  // 離開裁判椅時中止動畫

  if (
    sagState.active &&
    (
      cameraMode !== 'chair' ||
      bday.active
    )
  ) {
    sagState.active = false;
  }


  if (sagState.active) {
    sagState.time += dt;
  }

  const t = sagState.time;


  // 1.1 秒後開始變形
  // 9.1 秒後開始恢復原狀

  const morph = sagState.active
    ? sagEase((t - 1.1) / 2.5) *
      (1 - sagEase((t - 9.1) / 2.9))
    : 0;


  // 拉弓動作

  const release =
    sagEase((t - 8.0) / .18);

  const pull =
    sagEase((t - 5.1) / 2.3) *
    (1 - release);

  // 拉弦的手向後移動
  sagPose[21].x = 19 - 7 * pull;


  // ===== 星星移動到人馬關節 =====

  const now = performance.now();

  sagStars.forEach((s, i) => {

    s.dot.position
      .copy(sagIdle[i])
      .lerp(sagPose[i], morph);

    const twinkle =
      .87 +
      .13 * Math.sin(
        now * .0014 + s.phase
      );

    s.dot.material.opacity =
      sagState.night *
      (
        s.brightness * (1 - morph) +
        .85 * morph
      ) *
      twinkle;

  });


  // ===== 原始星座連線 =====

  const showHover =
    cameraMode === 'chair' &&
    !sagState.active &&
    now > sagState.cooldown &&
    sagState.hover;

  sagState.fade +=
    (
      (showHover ? 1 : 0) -
      sagState.fade
    ) *
    Math.min(
      1,
      dt * (showHover ? 2 : 1.5)
    );

  const breathe =
    .65 +
    .35 * Math.sin(
      now * Math.PI * 2 / 5200
    );

  const awaken =
    sagEase(t / .7) *
    (
      .72 +
      .28 * Math.sin(
        now * Math.PI * 2 / 4200
      )
    );

  sagLines.material.opacity =
    sagState.night *
    (1 - morph) *
    (
      sagState.active
        ? .30 * awaken
        : .28 * sagState.fade * breathe
    );

  sagLines.visible =
    sagLines.material.opacity > .002;


  // ===== 人馬骨架跟著星點移動 =====

  const bp = sagSkeleton.array;

  sagBones.forEach(([a, b], i) => {

    const u = sagStars[a].dot.position;
    const v = sagStars[b].dot.position;

    bp.set([
      u.x, u.y, u.z,
      v.x, v.y, v.z
    ], i * 6);

  });

  sagSkeleton.geometry.attributes
    .position.needsUpdate = true;

  sagSkeleton.material.opacity =
    .43 * morph * sagState.night;

  sagSkeleton.object.visible =
    sagSkeleton.material.opacity > .002;


  // ===== 星光弓 =====

  const bow = sagBow.array;

  for (let i = 0; i < 9; i++) {

    const u = i / 8;

    bow.set([
      25 + 2.6 * Math.sin(u * Math.PI),
      24 - 20 * u,
      0
    ], i * 3);

  }

  sagBow.geometry.attributes
    .position.needsUpdate = true;


  // ===== 弓弦 =====

  // 弓弦：平常筆直，拉弓時才逐漸向後彎曲
const stringCenterX = 25 - 12 * pull;

sagString.array.set([
  25, 24, 0,
  stringCenterX, 14, 0,
  25, 4, 0
]);

  sagString.geometry.attributes
    .position.needsUpdate = true;

  const gearOpacity =
    morph * sagState.night;

  sagBow.material.opacity =
    .55 * gearOpacity;

  sagString.material.opacity =
    .25 * gearOpacity;
  sagBow.object.visible =
    sagBow.material.opacity > .002;

  sagString.object.visible =
    sagString.material.opacity > .002;


  // ===== 射出星光箭 =====

  const fly =
    sagEase((t - 8.0) / 1.15);

  // ===== 星光箭矢：細長箭桿、箭鏃與尾羽 =====

// 箭尾跟隨拉弦的手移動
const tailX =
  sagPose[21].x + 62 * fly;

// 箭矢維持固定長度，不因拉弓而伸長
const arrowX = tailX + 16;

const arrowY = 14;

// 每一組座標代表一條線段
const arrowSegments = [

  // 1. 細長箭桿
  [
    tailX + .4, arrowY,
    arrowX - .9, arrowY
  ],

  // 2～4. 小型箭頭
  [
    arrowX - .9, arrowY + .22,
    arrowX, arrowY
  ],
  [
    arrowX - .9, arrowY - .22,
    arrowX, arrowY
  ],
  [
    arrowX - .9, arrowY - .22,
    arrowX - .9, arrowY + .22
  ]

];

// 將二維線段轉成 Three.js 三維座標
sagArrow.array.set(
  arrowSegments.flatMap(
    ([x1, y1, x2, y2]) => [
      x1, y1, 0,
      x2, y2, 0
    ]
  )
);

  sagArrow.geometry.attributes
    .position.needsUpdate = true;

  const arrowUp =
    sagEase((t - 5.5) / .4);

  const arrowOut =
    1 - sagEase((t - 8.55) / .65);

  sagArrow.material.opacity =
    .82 *
    gearOpacity *
    arrowUp *
    arrowOut;

  sagArrow.object.visible =
    sagArrow.material.opacity > .002;


  // ===== 12 秒後恢復星群 =====

  if (
    sagState.active &&
    t >= 12
  ) {

    sagState.active = false;
    sagState.time = 0;

    sagState.cooldown =
      now + 1600;

    sagState.hover = false;

  }

}


// ===== 開發者：預覽裁判椅夜空 =====

window.worldPreviewSagittarius = () => {

  if (
    !VB_IS_DEV ||
    reveal ||
    organizing ||
    bday.active
  ) return false;

  cameraMode = 'chair';

  chairLook.yaw = 0;
  chairLook.pitch = .46;
  chairLook.fov = 45;

  updateBoatControls();

  return true;
};


// ===== 開發者：播放人馬射箭 =====

window.worldPlaySagittarius = () => {

  if (
    !window.worldPreviewSagittarius() ||
    sagState.active
  ) return false;

  sagState.devPending = true;

  return true;
};
  
  // 裁判椅或帆船視角：雙擊返回
  cv.addEventListener('dblclick', e => {
    if (cameraMode === 'orbit') return;

    e.stopImmediatePropagation();
    e.preventDefault();

    cameraMode = 'orbit';
    updateBoatControls();

  }, true);

    // ===== 新物件送達 =====

  const touched = load('vb-items-touched', {});
  const TOP = { bottle: 1.9, towel: 1.2, cart: 2.6, chair: 5.3, machine: 2.8, picnic: 1.9, cat: 1.6, basket: 1.7, sailboat: 3.6 };
  const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));

  function markTouched(id) {
    if (touched[id]) return;
    touched[id] = true;
    if (!VB_IS_DEV) save('vb-items-touched', touched);
  }

 
let reveal = null;
let revealArmed = false;
let devSpikeTestActive = false;

// 有效殺球落地後，由 index.html 呼叫
window.worldOnValidSpike = () => {

  // 開發者版：只有進入殺球測試模式才啟用
  if (VB_IS_DEV && !devSpikeTestActive) {
    return false;
  }

  const hasPending = list.some(
    o => o.unlocked && o.pending && !o.stored
  );

  if (!hasPending) return false;

  revealArmed = true;

  if (VB_IS_DEV) {
    popText('殺球成功！新物件即將降落');
  }

  return true;
};

// 開發者專用：將指定日期的物件改成等待殺球
window.worldTestSpikeUnlock = () => {

  if (!VB_IS_DEV || reveal) return false;

  const day = Number(VB_DEV_STATE.visitDay);

  const batch = list.filter(
    o => o.day === day && o.unlocked && !o.stored
  );

  if (!batch.length) return false;

  for (const o of batch) {
    o.pending = true;
    o.arrival = null;
    o.root.position.y = 0;
  }

  revealArmed = false;
  devSpikeTestActive = true;

  refreshVisibility();

  popText(`第 ${day} 天：完成殺球後才會解鎖`);

  return true;
};


let lastInput = 0;
  let interacted = false;
  const openedAt = performance.now();

  for (const ev of ['pointerdown', 'pointermove', 'wheel', 'keydown']) {
    window.addEventListener(ev, () => { lastInput = performance.now(); }, { capture: true, passive: true });
  }
  window.addEventListener('pointerdown', () => {
    interacted = true;
  }, true);

  function finishArrival(o) {
    o.arrival = null;
    o.root.position.y = 0;
    if (!VB_IS_DEV && !seen[o.id]) {
      seen[o.id] = true;
      save('vb-items-seen', seen);
    }
  }

  // ===== 第 30 天：小帆船順風漂來 =====

function startWindSailboatArrival(o) {

  // 小帆船從水域遠方出現
 const fromX = ARRIVAL_ROUTE.x - ARRIVAL_ROUTE.rx * .82;
const fromZ = ARRIVAL_ROUTE.z + ARRIVAL_ROUTE.rz * .10;

  const heading = Math.atan2(
    o.x - fromX,
    fromZ - o.z
  );

  // 設定漂流動畫
  o.arrival = {
    kind: 'wind',
    t: 0,
    d: 11,
    fromX,
    fromZ,
    heading
  };

  // 放在水面，而不是空中
  o.root.position.set(fromX, 0.12, fromZ);
  o.art.rotation.y = -heading;
}


// ===== 每一幀更新小帆船的位置 =====

function stepWindSailboatArrival(o, dt) {

  const a = o.arrival;

  a.t = Math.min(a.d, a.t + dt);

  const p = a.t / a.d;

  // 平滑加速與減速
  const ease = p * p * (3 - 2 * p);

  // 讓船不是完全直線移動
  const drift =
    0.38 *
    Math.sin(p * Math.PI * 2) *
    Math.sin(p * Math.PI);

  // 沿水面逐漸靠岸
  o.root.position.set(
    a.fromX + (o.x - a.fromX) * ease + drift,
    0.12 + 0.045 * Math.sin(a.t * 2.2),
    a.fromZ + (o.z - a.fromZ) * ease + drift * 0.5
  );

  // 船身隨水面輕輕搖晃
  o.art.rotation.z = 0.03 * Math.sin(a.t * 1.6);
  o.art.rotation.x = 0.015 * Math.sin(a.t * 2.1);

  // 接近岸邊時，船首逐漸回正
  const settle = Math.max(
    0,
    Math.min(1, (p - 0.72) / 0.28)
  );

  const turn = settle * settle * (3 - 2 * settle);

  o.art.rotation.y = -a.heading * (1 - turn);

  // 完成靠岸
  if (p >= 1) {

    o.root.position.set(o.x, 0, o.z);

    o.art.rotation.set(0, 0, 0);

    boatHeading = 0;
    boatSpeed = 0;

    finishArrival(o);
  }
}
  // ===== 殺球後：鏡頭引導與物件降落 =====

  function tryStartReveal(now) {

    if (!revealArmed || reveal) return;

    const pend = list.filter(
      o => o.unlocked && o.pending && !o.stored
    );

    if (!pend.length) {
      revealArmed = false;

      if (VB_IS_DEV) {
        devSpikeTestActive = false;
      }

      return;
    }

    if (document.visibilityState !== 'visible') return;

    if (
      !pad.hidden ||
      bday.active ||
      organizing ||
      cameraMode !== 'orbit' ||
      viewMix > .02
    ) return;

    if (!(interacted || now - openedAt > 5000)) return;
    
    // 玩家停止操作後，才開始引導鏡頭
    if (now - lastInput < 1500) return;
    if (
  typeof window.vbIsRoamMoving === 'function' &&
  window.vbIsRoamMoving()
) {
  return;
}
    // 一次殺球只處理最早的一個解鎖日
    const day = Math.min(...pend.map(o => o.day));

    const batch = pend.filter(
      o => o.day === day
    );

    const isSailArrival =
  batch.some(o => o.id === 'sailboat');

const fx = isSailArrival
  ? -59
  : batch.reduce((sum, o) => sum + o.x, 0) / batch.length;

const fz = isSailArrival
  ? ARRIVAL_ROUTE.z
  : batch.reduce((sum, o) => sum + o.z, 0) / batch.length;

    reveal = {
      items: batch,
      phase: 'glide',
      t: 0,
      fx,
      fz,

      saved: {
        th: ct.th,
        ph: ct.ph,
        d: ct.d,
        tilt: ct.tilt,
        x: tgtP.x,
        z: tgtP.z
      }
    };

    revealArmed = false;

    if (VB_IS_DEV) {
      devSpikeTestActive = false;
    }

    // 第一階段：只移動鏡頭
    // 此時物件仍維持 pending，不會提前出現

    if (isSailArrival) {

  // 球場左側岸邊，接近玩家人眼高度
  ct.th = cs.th + wrapAngle(1.684 - cs.th);
  ct.ph = 1.54;
  ct.d = 44.6;
  ct.tilt = 0;

} else {

  // 其他物件維持原本的鏡頭演出
  ct.th =
    cs.th +
    wrapAngle(Math.atan2(fx, fz) - cs.th);

  ct.ph = 1.05;
  ct.tilt = 0;
  ct.d = 17;

}
  }


  function beginReturn() {

    if (!reveal) return;

    const r = reveal;

    r.phase = 'return';
    r.t = 0;

    ct.th =
      cs.th +
      wrapAngle(r.saved.th - cs.th);

    ct.ph = r.saved.ph;
    ct.d = r.saved.d;
    ct.tilt = r.saved.tilt;
  }


  function revealStep(dt, now) {

    if (!reveal) {
      tryStartReveal(now);
      return;
    }

    const r = reveal;
    const k = Math.min(1, dt * 2.4);

    r.t += dt;

    // 引導鏡頭朝向新物件位置
    if (r.phase !== 'return') {

      tgtP.x += (r.fx - tgtP.x) * k;
      tgtP.z += (r.fz - tgtP.z) * k;
    }

    // ===== 第一階段：鏡頭先移動 =====

    if (
      r.phase === 'glide' &&
      r.t >= 1.4
    ) {

      r.phase = 'drop';
      r.t = 0;

      // 鏡頭接近定位後，
      // 才把物件放到畫面上方並顯示

      r.items.forEach((o, i) => {

  if (o.id === 'sailboat') {

    // 小帆船：順風從遠方水面漂來
    startWindSailboatArrival(o);

  } else {

    // 其他物件：維持原本從天空降落
    const height = Math.max(
      18,
      startHeight(o)
    );

    o.arrival = {
      t: -i * .45,
      d: 6.5,
      height
    };

    o.root.position.set(
      o.x,
      height,
      o.z
    );
  }

  o.pending = false;
});
      refreshVisibility();

    }

    // ===== 第二階段：等待物件全部落地 =====

    else if (
      r.phase === 'drop' &&
      r.items.every(o => !o.arrival)
    ) {

      r.phase = 'hold';
      r.t = 0;

    }

    // ===== 第三階段：停留欣賞 =====

    else if (
      r.phase === 'hold' &&
      r.t >= 2
    ) {

      beginReturn();

    }

    // ===== 第四階段：鏡頭返回 =====

    else if (r.phase === 'return') {

      tgtP.x += (r.saved.x - tgtP.x) * k;
      tgtP.z += (r.saved.z - tgtP.z) * k;

      if (r.t >= 1.8) {
        reveal = null;
      }
    }
  }


  
  // 給 index.html 判斷目前是不是一般視角
  window.worldCameraMode = () => cameraMode;
  window.worldIsRevealing = () => !!reveal;

window.worldIsOrganizing = () => organizing;

window.worldIsSpecialTransitioning = () =>
  cameraMode === 'orbit' && viewMix > .02;

window.worldChairControl = (yaw, pitch) => {
  if (cameraMode !== 'chair') return;

  chairLook.yaw += yaw;

  chairLook.pitch = Math.max(
    -.6,
    Math.min(1.45, chairLook.pitch + pitch)
  );
};

window.worldExitSpecialView = () => {
  if (cameraMode === 'orbit') return;

  cameraMode = 'orbit';
  updateBoatControls();
};

  // ===== 開發者：切換天數並對準新物件 =====

window.setWorldPreviewDay = day => {

  if (!VB_IS_DEV) return;

  const n = Number(day);

  if (
    !Number.isInteger(n) ||
    n < 1 ||
    n > 365
  ) return;

  // 找出這一天新解鎖的物件
  const newItems = list.filter(
    o => o.day === n
  );

   // ===== 開發者預覽：不同解鎖日的攝影機 =====

  if (n === 1) {

    // 第 1 天：原始球場
    tgtP.set(0, 1, 0);

    ct.th = -0.55;
    ct.ph = 1.0;
    ct.d = 27;
    ct.tilt = 0;

  } else if (n === 30) {

    // 第 30 天：站在球場邊，看小帆船漂來
    tgtP.set(-59, 1, ARRIVAL_ROUTE.z);

    ct.th = 1.684;
    ct.ph = 1.54;
    ct.d = 44.6;
    ct.tilt = 0;

  } else if (newItems.length > 0) {

    // 其他解鎖日：觀看新物件
    const centerX =
      newItems.reduce((sum, o) => sum + o.x, 0)
      / newItems.length;

    const centerZ =
      newItems.reduce((sum, o) => sum + o.z, 0)
      / newItems.length;

    tgtP.set(centerX, 1, centerZ);

    ct.th = -0.55;
    ct.ph = 1.0;
    ct.d = 18;
    ct.tilt = 0;
  }

  // 立即更新鏡頭，讓登場起點依照新視角計算
  cs.th = ct.th;
  cs.ph = ct.ph;
  cs.d = ct.d;
  cs.tilt = ct.tilt;

  camStep();

  
// 切換日期時，取消上一個日期的殺球測試
revealArmed = false;
devSpikeTestActive = false;

if (reveal) {
  reveal.items.forEach(o => {
    if (o.arrival) finishArrival(o);
  });
  reveal = null;
}

list.forEach(o => {
  if (o.pending) {
    o.pending = false;
    o.arrival = null;
    o.root.position.y = 0;
  }
});

// 更新開發者預覽天數
VB_DEV_STATE.visitDay = n;

currentDay = -1;
syncDay(n);
currentDay = n;


};

  // ===== 每幀更新物件 =====

  window.worldItemsStep = dt => {
    clock += dt; revealStep(dt, performance.now());
    updateSky(dt);

    if (clock > 30) {
      clock = 0;
      recordVisit();
    }

    const day = VB_IS_DEV
      ? VB_DEV_STATE.visitDay
      : Math.max(1, dates.length);

    if (day !== currentDay) {

  syncDay(day);
  currentDay = day;

  // 第 7 天以前，不顯示發球機面板
  if (!active(byId.get('machine'))) {

    if (machineGame.running) {
      stopMachineGame('發球機尚未解鎖。');
    }

    machinePanel.hidden = true;
    machineGame.open = false;
  }

}

    const picnic = byId.get('picnic');
    const basket = byId.get('basket');

    // 野餐籃跟著野餐墊
    basket.root.position.x =
      picnic.root.position.x;

    basket.root.position.z =
      picnic.root.position.z; basket.root.rotation.y = picnic.root.rotation.y;

    if (!basket.arrival) {
      basket.root.position.y =
        picnic.root.position.y;
    }

    refreshVisibility();

// 每一幀更新發球機的發球與計分
machineGameStep(dt);

for (const o of list) {
      
      if (!active(o)) continue;
      
      // 首次解鎖：依物件類型播放不同動畫
if (o.arrival) {

  // 小帆船專屬：順風漂來
  if (o.arrival.kind === 'wind') {
    stepWindSailboatArrival(o, dt);
    continue;
  }

  // 其他物件維持原本的天空降落
  o.arrival.t += dt;

        const p = Math.max(
          0,
          Math.min(
            1,
            o.arrival.t / o.arrival.d
          )
        );

        const smooth =
          p * p * (3 - 2 * p);

        o.root.position.y =
          o.arrival.height * (1 - smooth);

        if (p >= 1) {
          finishArrival(o);
        }
        continue;
      }

      // 野餐籃：蓋子掀開、物品升起
      if (o.id === 'basket' && o.parts.lid) {
        o.parts.lid.rotation.x += ((o.open ? -1.9 : 0) - o.parts.lid.rotation.x) * Math.min(1, dt * 6);
        o.parts.inner.position.y += ((o.open ? .34 : .12) - o.parts.inner.position.y) * Math.min(1, dt * 5);
      }

      if (o.bound) continue;

      o.time = Math.max(
        0,
        o.time - dt
      );

      // 水瓶晃動：水體始終保持在瓶身內
if (o.id === 'bottle') {

  const t = Math.min(1, o.time);

  const slosh =
    Math.sin(o.time * 11) * t;

  const P = o.parts;
  if (P.spillTime >= 0) {
    P.spillTime = Math.min(5.8, P.spillTime + dt);
    const smooth = x => {x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
    const fall = smooth(P.spillTime / 1.05);
    const capOpen = smooth((P.spillTime - .73) / .7);
    const pour = smooth((P.spillTime - 1.08) / 1.20);
    const bloom = smooth((P.spillTime - 2.15) / 1.55);
    o.art.rotation.z = -Math.PI / 2 * .92 * fall;
    o.art.position.y = .22 * fall;
    P.cap.rotation.z = -1.45 * capOpen;
    P.puddle.scale.set(.001 + .68 * pour, .001 + .38 * pour, 1);
    P.clover.scale.setScalar(Math.max(.001, bloom));
    if (P.water) P.water.scale.y = Math.max(.2, 1 - .75 * pour);
    if (P.waterSurface) P.waterSurface.visible = pour < .98;
  } else {
    o.art.rotation.z = Math.sin(o.time * 17) * t * .11;
    if (P.water) P.water.scale.y = 1 + slosh * .012;
    if (P.waterSurface) {
      P.waterSurface.rotation.z = -slosh * .055;
      P.waterSurface.position.y = .518 + Math.sin(o.time * 14) * t * .005;
    }
  }

}

      // 單條毛巾：輕微擺動，不穿過地板
if (
  o.id === 'towel' &&
  o.parts.cloth
) {

  o.parts.cloth.rotation.z =
    .014 * Math.sin(performance.now() * .0017) +
    .022 * Math.sin(o.time * 9) *
    Math.min(1.2, o.time);

}
      // 發球機雙滾輪旋轉
if (
  o.id === 'machine' &&
  o.parts.rollers
) {

  const speed = machineGame.running
    ? dt * 16
    : dt * .2;

  o.parts.rollers.forEach((roller, i) => {

    roller.rotation.y +=
      speed * (i === 0 ? 1 : -1);

  });

}

  
      // ===== 香檳倒酒動畫 =====

      if (o.id === 'picnic' && o.parts.bottle) {

        const P = o.parts;

        if (P.pourTime >= 0) {

          P.pourTime += dt;

          const t = P.pourTime;

          // 平滑加速、平滑減速
          const ease = v => {

            const x = Math.max(
              0,
              Math.min(1, v)
            );

            return x * x * (3 - 2 * x);

          };


          // ===== 1. 軟木塞飛出 =====

          if (t < 1.8) {

            const u = t / 1.8;

            P.cork.visible = true;

            P.cork.position.set(

              P.bx + .45 * u,

              1.45 +
              1.45 * Math.sin(u * Math.PI) -
              .55 * u,

              P.bz - .25 * u

            );

            P.cork.rotation.z = u * 7.5;

          } else {

            P.cork.visible = false;

          }


          // ===== 2. 酒瓶升起與傾斜 =====

          const lifted =
            ease((t - 1) / 1.3);

          const returned =
            ease((t - 5.4) / 1.4);

          const move =
            lifted * (1 - returned);

          const tilt =
            ease((t - 2.4) / 1.1) *
            (1 - ease((t - 5.2) / 1.1));


          P.bottle.position.set(

            P.bx - .08 * move,

            .58 * move,

            P.bz + .34 * move

          );

          P.bottle.rotation.z = .55 * tilt;


          // ===== 3. 從瓶口倒入酒杯 =====

          const flow =
            ease((t - 3.5) / .35) *
            (1 - ease((t - 5) / .35));

          P.stream.visible = flow > .02;

          if (P.stream.visible) {

            const angle =
              P.bottle.rotation.z;

            // 瓶口位置
            const mouth = new T3.Vector3(

              P.bottle.position.x -
              Math.sin(angle) * 1.40,

              P.bottle.position.y +
              Math.cos(angle) * 1.40,

              P.bottle.position.z

            );

            // 酒杯開口位置
            const glassTop =
              new T3.Vector3(
                P.gx, 1.15, P.gz
              );

            const direction =
              glassTop.clone().sub(mouth);

            const length =
              direction.length();

            // 酒液位於瓶口與杯口之間
            P.stream.position
              .copy(mouth)
              .addScaledVector(direction, .5);

            P.stream.quaternion
              .setFromUnitVectors(

                new T3.Vector3(0, 1, 0),

                direction.normalize()

              );

            P.stream.scale.set(
              1,
              length * flow,
              1
            );

          }


          // ===== 4. 酒杯液面逐漸上升 =====

          // 倒酒結束後約 10 秒，
          // 液面才逐漸恢復初始高度。

          const fill =

            ease((t - 3.7) / 1.3) *

            (1 - ease((t - 15) / 1.1));


          P.wine.scale.y =
            1 + .85 * fill;

          P.wine.position.y =
            .66 + .068 * fill;


          // ===== 5. 完成並恢復初始狀態 =====

          if (t >= 16.2) {

            P.pourTime = -1;

            P.stream.visible = false;

            P.bottle.position.set(
              P.bx, 0, P.bz
            );

            P.bottle.rotation.z = 0;

            P.wine.scale.y = 1;
            P.wine.position.y = .66;

          }

        }

      }

    

      // 黑貓
      if (o.id === 'cat' && o.parts.body) updateCat(o, dt);

      // 帆船航行
      if (o.id === 'sailboat') {
        const forward =
          pressed.has('arrowup') ||
          pressed.has('w');

        const backward =
          pressed.has('arrowdown') ||
          pressed.has('s');

        const left =
          pressed.has('arrowleft') ||
          pressed.has('a');

        const right =
          pressed.has('arrowright') ||
          pressed.has('d');

        if (cameraMode === 'boat') {
          const boosting = pressed.has('shift');

          boatSpeed +=
              (forward ? (boosting ? 7.4 : 5) : 0) * dt;

          boatSpeed -=
              (backward ? 4 : 0) * dt;

          boatSpeed = Math.max(
              -1.8,
              Math.min(boosting ? 6.7 : 5, boatSpeed)
            );

          if (left) boatHeading += 1.25 * dt;
          if (right) boatHeading -= 1.25 * dt;
        }

        boatSpeed *= Math.exp(-.7 * dt);

        if (Math.abs(boatSpeed) > .01) {
          const nx =
            o.x +
            Math.sin(boatHeading) *
            boatSpeed * dt;

          const nz =
            o.z -
            Math.cos(boatHeading) *
            boatSpeed * dt;

// 海上航行不再受舊湖泊的橢圓邊界限制。
// 僅保留遠方安全界限及岸邊距離。

if (
  nx < SEA.shoreX - 1.4 &&
  nx > SEA.farX &&
  Math.abs(nz) < SEA.zLimit
) {
  o.x = nx;
  o.z = nz;
} else {
  boatSpeed = 0;
}
        }

        o.root.position.set(
          o.x,
          .1 + .05 * Math.sin(
            performance.now() * .0018
          ),
          o.z
        );

        o.art.rotation.y = -boatHeading;

        o.art.rotation.z =
          .022 *
          Math.sin(
            performance.now() * .0016
          );
      }
    }

    basket.root.position.x =
      picnic.root.position.x;

    basket.root.position.z =
      picnic.root.position.z;
  };

  // ===== 裁判椅與帆船的攝影機 =====

  const targetCamera = new T3.PerspectiveCamera();

  const previousViewPos = new T3.Vector3();
  const previousViewQuat = new T3.Quaternion();

  window.worldSceneCameraStep = dt => {
    const mode = cameraMode;
    const goal = mode === 'orbit' ? 0 : 1;
    const wantFov = mode === 'chair' ? chairLook.fov : 45;
    if (Math.abs(cam.fov - wantFov) > .05) {
      cam.fov += (wantFov - cam.fov) * Math.min(1, dt * 6);
      cam.updateProjectionMatrix();
    }

    viewMix +=
      (goal - viewMix) *
      Math.min(1, dt * 4.5);

    if (viewMix < .001) return;

    const p = new T3.Vector3();
    const look = new T3.Vector3();

    if (mode === 'chair') {
      const o = byId.get('chair');

    p.set(o.x, 4.3, o.z + .25);

    const cp = Math.cos(chairLook.pitch);
    look.set(
      p.x + Math.sin(chairLook.yaw) * cp * 10,
      p.y + Math.sin(chairLook.pitch) * 10,
      p.z - Math.cos(chairLook.yaw) * cp * 10
      );
    } else if (mode === 'boat') {
      const o = byId.get('sailboat');

      p.set(
        o.x - Math.sin(boatHeading) * 3,
        2.7,
        o.z + Math.cos(boatHeading) * 4.5
      );

      look.set(
        o.x + Math.sin(boatHeading) * 4,
        1.1,
        o.z - Math.cos(boatHeading) * 4
      );

    } else {
      // 平滑返回原本的環繞攝影機
      cam.position.lerp(
        previousViewPos,
        viewMix
      );

      cam.quaternion.slerp(
        previousViewQuat,
        viewMix
      );

      return;
    }

    cam.position.lerp(p, viewMix);

    targetCamera.position.copy(cam.position);
    targetCamera.lookAt(look);

    cam.quaternion.slerp(
      targetCamera.quaternion,
      viewMix
    );

    previousViewPos.copy(cam.position);
    previousViewQuat.copy(cam.quaternion);
  };

  // ===== 讓「收」按鈕跟著物件位置 =====

    window.worldItemsRenderStep = () => {
    if (!organizing || !selected || !active(selected)) { selRing.visible = false; return; }
    selRing.visible = true;
    selRing.position.x = selected.root.position.x;
    selRing.position.z = selected.root.position.z;
    selRing.scale.setScalar((RADIUS[selected.id] || 1.1) / 1.15);
    selRing.material.opacity = .6 + .25 * Math.sin(performance.now() * .006);
  };

  // ===== 日後替換手繪外觀的接口 =====
  // 供船艙模組讀取帆船模型與航行狀態
window.VBBoatAccess = {
  getObject: () => byId.get('sailboat'),
  isSailing: () => cameraMode === 'boat'
};
  window.VBWorldItems = {
    days: UNLOCK,

    replaceArtwork(id, build) {
      const o = byId.get(id);

      if (
        !o ||
        typeof build !== 'function'
      ) return false;

      while (o.art.children.length) {
        o.art.remove(o.art.children[0]);
      }

      o.parts = {};
      build(o.art, o);

      return true;
    }
  };

})();
