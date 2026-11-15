
/* 第四階段：逐日解鎖、場邊物件、球車整理、小帆船 */

(() => {
  'use strict';

  // 修改解鎖日期，只需要改這張表
  const UNLOCK = Object.freeze({
    bottle: 2,
    towel: 2,
    cart: 3,
    chair: 5,
    bench: 7,
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
    bench: '觀眾長椅',
    picnic: '野餐墊與酒杯',
    cat: '黑貓',
    basket: '野餐籃',
    sailboat: '小帆船'
  };

  // 每個物件預設落地的位置
  const POS = {
    bottle: [-13.7, 2.5],
    towel: [-15.7, 3.5],
    cart: [14.5, 1.5],
    chair: [1.0, 10.5],
    bench: [-14.5, -4],
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
      bound: opts.bound || null,
      parts: {},
      interact
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
    cyl(o.art, .22, .25, .8, 0, .48, 0, 0x8ec6bd);
    cyl(o.art, .18, .18, .15, 0, .96, 0, 0xf0dfbe);
    cub(o.art, .25, .08, .06, 0, .54, .23, 0xffffff);

    clickZone(
      o, .8, 1.3, .8, 0, .6, 0,
      () => o.interact(o)
    );
  }, o => {
    o.time = .8;
  });

  // ===== 第 2 天：毛巾 =====

  create('towel', o => {
    o.parts.cloth = cub(
      o.art, 1.5, .07, .85,
      0, .13, 0, 0xffead6
    );

    [-.24, -.1, .04].forEach(z => {
      cub(
        o.art, 1.4, .013, .025,
        0, .18, z, 0xe0a176
      );
    });

    clickZone(
      o, 1.8, .5, 1.2, 0, .2, 0,
      () => o.interact(o)
    );
  }, o => {
    o.time = 1.5;
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

    volley(o.art, -.4, 1.03, 0, .27);
    volley(o.art, .33, 1.03, .2, .27);
    volley(o.art, 0, 1.31, -.2, .27);

    clickZone(
      o, 2.3, 1.7, 1.65,
      0, .9, 0,
      () => toggleOrganizer()
    );

  }, () => toggleOrganizer(), {
    fixed: true
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

  // ===== 第 7 天：觀眾長椅與坐墊 =====

  create('bench', o => {
    cub(
      o.art, 3.0, .19, 1.05,
      0, 1.05, 0, 0x926a4f
    );

    for (const x of [-1.2, 1.2]) {
      for (const z of [-.35, .35]) {
        cub(
          o.art, .16, .96, .16,
          x, .49, z, 0x6b4938
        );
      }
    }

    cub(
      o.art, 3.0, .57, .15,
      0, 1.44, -.52, 0x926a4f
    );

    o.parts.cushion = cub(
      o.art, 2.65, .2, .8,
      0, 1.22, 0, 0xe8a39a
    );

    // 坐墊分成左側、中央、右側
    const touch = (x, action) => {
      clickZone(
        o, .85, .24, .9,
        x, 1.44, 0,
        () => {
          if (organizing) return;

          o.action = action;
          o.time = .55;
        }
      );
    };

    touch(-.88, 'right');
    touch(0, 'press');
    touch(.88, 'left');

  }, o => {
    o.action = 'press';
    o.time = .55;
  });

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
    const rug = new T3.Mesh(
      new T3.PlaneGeometry(4.2, 3),
      new T3.MeshBasicMaterial({
        map: rugTex,
        side: T3.DoubleSide
      })
    );

    rug.rotation.x = -Math.PI / 2;
    rug.position.y = .048;
    o.art.add(rug);

    const glass = new T3.MeshPhongMaterial({
      color: 0xf0ffff,
      transparent: true,
      opacity: .42,
      shininess: 100,
      depthWrite: false,
      side: T3.DoubleSide
    });

    cyl(
      o.art, .045, .045, .48,
      .85, .39, .3, 0xf3ebd8
    );

    cyl(
      o.art, .25, .25, .035,
      .85, .13, .3, 0xe5e9dd
    );

    const bowl = new T3.Mesh(
      new T3.CylinderGeometry(
        .28, .11, .6, 16, 1, true
      ),
      glass
    );

    bowl.position.set(.85, .86, .3);
    o.art.add(bowl);

    cyl(
      o.art, .17, .12, .15,
      .85, .68, .3, 0xe9d39d
    );

    o.parts.bubbles = [];

    for (let i = 0; i < 7; i++) {
      const m = orb(
        o.art,
        .025,
        .85 + Math.sin(i * 4) * .1,
        .69,
        .3 + Math.cos(i * 3) * .1,
        0xffffff,
        8,
        6
      );

      m.visible = false;
      o.parts.bubbles.push(m);
    }

    // 只點酒杯才會冒出氣泡
    clickZone(
      o, .7, 1.25, .7,
      .85, .7, .3,
      () => o.interact(o)
    );

  }, o => {
    o.time = 1.8;
  });

  // ===== 第 14 天：睡覺的黑貓 =====

  create('cat', o => {
    o.parts.body = orb(
      o.art, .56, 0, .42, 0,
      0x242735, 18, 12
    );

    o.parts.body.scale.set(1, .58, .78);

    o.parts.head = orb(
      o.art, .34, -.42, .7, .10,
      0x242735, 18, 12
    );

    for (const z of [-.14, .14]) {
      const ear = new T3.Mesh(
        new T3.ConeGeometry(.12, .26, 3),
        material(0x242735)
      );

      ear.position.set(-.49, .99, .10 + z);
      o.art.add(ear);
    }

    const curve = new T3.CatmullRomCurve3([
      new T3.Vector3(.42, .54, 0),
      new T3.Vector3(.78, .62, 0),
      new T3.Vector3(.88, 1.02, 0),
      new T3.Vector3(.72, 1.15, 0)
    ]);

    o.parts.tail = new T3.Mesh(
      new T3.TubeGeometry(
        curve, 14, .055, 7, false
      ),
      material(0x242735)
    );

    o.art.add(o.parts.tail);

    o.parts.eyes = [];

    for (const z of [0, .2]) {
      const eye = orb(
        o.art, .032,
        -.71, .75, z,
        0xf1d578, 8, 6
      );

      eye.visible = false;
      o.parts.eyes.push(eye);
    }

    o.parts.heart = orb(
      o.art, .12, .62, 1.65, 0,
      0xe8a39a
    );

    o.parts.heart.visible = false;
    o.parts.wakeCooldown = 0;

    clickZone(
      o, 1.5, 1.5, 1.5,
      0, .7, 0,
      () => o.interact(o)
    );

  }, o => {
    o.action = 'roll';
    o.time = 1.1;
  });

  // ===== 第 15 天：野餐籃、三明治、魚罐頭 =====

  create('basket', o => {
    cub(
      o.art, 1.25, .55, .8,
      -.95, .36, -.45, 0xb58a68
    );

    for (const z of [-.82, -.08]) {
      cub(
        o.art, 1.28, .1, .07,
        -.95, .65, z, 0x906243
      );
    }

    for (const x of [-1.53, -.37]) {
      cub(
        o.art, .065, .5, .82,
        x, .42, -.45, 0x906243
      );
    }

    // 方形三明治
    cub(
      o.art, .43, .12, .39,
      -1.18, .72, -.43, 0xffe9be
    );

    cub(
      o.art, .4, .04, .37,
      -1.18, .65, -.43, 0x8bbba9
    );

    cub(
      o.art, .42, .08, .38,
      -1.18, .79, -.43, 0xffe9be
    );

    // 魚罐頭
    cyl(
      o.art, .22, .22, .17,
      -.67, .73, -.40, 0x9aafbf, 16
    );

    cyl(
      o.art, .205, .205, .025,
      -.67, .83, -.40, 0xe1e5e8, 16
    );

    const handle = new T3.Mesh(
      new T3.TorusGeometry(
        .36, .065, 7, 20, Math.PI
      ),
      material(0x906243)
    );

    handle.scale.x = 1.2;
    handle.position.set(-.95, .82, -.45);
    o.art.add(handle);

    clickZone(
      o, 1.5, 1.15, 1.05,
      -.95, .6, -.45,
      () => o.interact(o)
    );

  }, o => {
    o.time = .65;
  }, {
    fixed: true,
    bound: 'picnic'
  });

  // ===== 第 30 天：水域與小帆船 =====

  const LAKE = {
    x: -38,
    z: 14,
    r: 16
  };

  const water = new T3.Mesh(
    new T3.CircleGeometry(LAKE.r, 56),
    new T3.MeshBasicMaterial({
      color: 0x70b8c5,
      transparent: true,
      opacity: .84,
      depthWrite: false
    })
  );

  water.rotation.x = -Math.PI / 2;
  water.position.set(LAKE.x, .045, LAKE.z);
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

  // 可選擇使用真實的柔和登場音檔
  const arrivalSound = new Audio(
    'assets/sounds/item-arrival.mp3'
  );

  arrivalSound.preload = 'none';

  function soundArrival() {
    if (typeof getSfxVolumeLevel === 'function') {
      const v = Math.min(
        1,
        .22 * getSfxVolumeLevel()
      );

      if (v <= 0) return;
      arrivalSound.volume = v;
    }

    if (arrivalSound.readyState < 2) return;

    arrivalSound.currentTime = 0;
    arrivalSound.play().catch(() => {});
  }

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
      (
        !o.bound ||
        (picnic.unlocked && !picnic.stored)
      )
    );
  }

  function refreshVisibility() {
    for (const o of list) {
      const yes = active(o);

      o.root.visible = yes;
      hitEnable(o, yes && !o.arrival);
    }

    water.visible =
      byId.get('sailboat').unlocked;
  }

  function syncDay(day) {
    for (const o of list) {
      const unlock = day >= o.day;

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
        }

        o.root.position.set(o.x, 0, o.z);

        const first =
          VB_IS_DEV || !seen[o.id];

        if (first && !o.stored) {
          o.arrival = {
            t: -list.indexOf(o) * .25,
            d: 6 + Math.random() * 2,
            height: startHeight(o)
          };

          o.root.position.y = o.arrival.height;
        } else {
          o.arrival = null;
        }
      }

      if (!unlock) {
        o.unlocked = false;
        o.arrival = null;

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

  // ===== 整理模式介面 =====

  const style = document.createElement('style');

  style.textContent = `
    #vbStoreBox {
      position: fixed;
      bottom: 12px;
      right: 12px;
      z-index: 15;
      display: none;
      width: 220px;
      max-height: 42vh;
      overflow: auto;
      padding: 12px;
      border-radius: 13px;
      background: rgba(29,42,80,.75);
      color: white;
      font: 13px system-ui;
      border: 1px solid #ffffff55;
      backdrop-filter: blur(7px);
    }

    #vbStoreBox button,
    #vbPackButtons button {
      border: 1px solid #fff8;
      border-radius: 8px;
      background: #355c97;
      color: white;
      padding: 6px 8px;
      cursor: pointer;
      font: 12px system-ui;
      margin: 3px;
    }

    #vbPackButtons button {
      position: fixed;
      display: none;
      z-index: 14;
      background: #1d2a50bb;
    }

    #vbStoreBox h3 {
      font-size: 14px;
      margin: 0 0 9px;
    }

    #vbBoatCtrl {
      display: none;
      position: fixed;
      left: 12px;
      bottom: 12px;
      z-index: 16;
      color: white;
      font: 13px system-ui;
      background: rgba(29,42,80,.6);
      padding: 10px;
      border-radius: 14px;
      touch-action: none;
      user-select: none;
    }

    #vbBoatCtrl .arrows {
      display: grid;
      grid-template-columns: repeat(3,46px);
      gap: 5px;
      margin-top: 7px;
    }

    #vbBoatCtrl button {
      border: 1px solid #fff8;
      background: #355c97;
      color: white;
      border-radius: 8px;
      padding: 10px;
      touch-action: none;
      cursor: pointer;
    }
  `;

  document.head.append(style);

  const storeBox = document.createElement('div');
  storeBox.id = 'vbStoreBox';
  document.body.append(storeBox);

  const packButtons = document.createElement('div');
  packButtons.id = 'vbPackButtons';
  document.body.append(packButtons);

  const pack = new Map();

  for (const o of list) {
    if (o.fixed) continue;

    const button = document.createElement('button');

    button.textContent = '收';
    button.title = '收起' + o.name;

    button.onclick = () => {
      o.stored = true;
      o.arrival = null;

      layout[o.id] = {
        x: o.x,
        z: o.z,
        stored: true
      };

      save('vb-item-layout', layout);
      refreshVisibility();
      renderStorage();
    };

    packButtons.append(button);
    pack.set(o.id, button);
  }

  // ===== 防止物件重疊 =====

  function legal(o, x, z) {
    if (
      Math.abs(x) > 23 ||
      Math.abs(z) > 19
    ) return false;

    if (
      Math.abs(x) < 13 &&
      Math.abs(z) < 8.5
    ) return false;

    if (
      TREE_POS.some(
        ([a, b]) =>
          Math.hypot(x - a, z - b) < 2.2
      )
    ) return false;

    for (const b of list) {
      if (
        b === o ||
        !active(b) ||
        b.bound ||
        b.id === 'sailboat'
      ) continue;

      const gap =
        o.id === 'picnic' ||
        b.id === 'picnic'
          ? 3.3
          : 1.75;

      if (
        Math.hypot(
          x - b.x,
          z - b.z
        ) < gap
      ) return false;
    }

    return true;
  }

  function nearest(o, x, z) {
    const a = Math.round(x / STEP) * STEP;
    const b = Math.round(z / STEP) * STEP;

    let best = null;
    let dist = Infinity;

    for (let i = -12; i <= 12; i++) {
      for (let j = -12; j <= 12; j++) {
        const xx = a + i * STEP;
        const zz = b + j * STEP;

        if (!legal(o, xx, zz)) continue;

        const d =
          (xx - x) ** 2 +
          (zz - z) ** 2;

        if (d < dist) {
          dist = d;
          best = { x: xx, z: zz };
        }
      }
    }

    return best || {
      x: o.x,
      z: o.z
    };
  }

  // ===== 球車收納清單 =====

  function renderStorage() {
    storeBox.style.display =
      organizing ? 'block' : 'none';

    grid.visible = organizing;

    if (!organizing) {
      for (const b of pack.values()) {
        b.style.display = 'none';
      }

      return;
    }

    storeBox.replaceChildren();

    const title = document.createElement('h3');
    title.textContent = '排球車 · 收納';
    storeBox.append(title);

    const close = document.createElement('button');
    close.textContent = '完成整理';
    close.onclick = toggleOrganizer;
    storeBox.append(close);

    const stored = list.filter(
      o =>
        o.stored &&
        o.unlocked &&
        !o.fixed
    );

    if (!stored.length) {
      const t = document.createElement('p');
      t.textContent = '目前沒有收納物件';
      storeBox.append(t);
    }

    for (const o of stored) {
      const b = document.createElement('button');

      b.textContent = '放回 ' + o.name;

      b.onclick = () => {
        o.stored = false;

        const p = nearest(o, o.x, o.z);

        o.x = p.x;
        o.z = p.z;

        o.root.position.set(o.x, 0, o.z);

        layout[o.id] = {
          x: o.x,
          z: o.z,
          stored: false
        };

        save('vb-item-layout', layout);
        refreshVisibility();
        renderStorage();
      };

      storeBox.append(b);
    }
  }

  function toggleOrganizer() {
    if (!byId.get('cart').unlocked) return;

    organizing = !organizing;
    renderStorage();

    popText(
      organizing
        ? '拖曳物件移動；點「收」放進排球車'
        : '已完成整理'
    );
  }

  // ===== 整理模式：拖曳物件 =====

  let drag = null;

  const groundPlane = new T3.Plane(
    new T3.Vector3(0, 1, 0),
    0
  );

  const hitPoint = new T3.Vector3();

  function pickMoveable(e) {
    ndc(e);
    ray.setFromCamera(m2, cam);

    const groups = list
      .filter(
        o =>
          active(o) &&
          !o.fixed &&
          !o.arrival
      )
      .map(o => o.root);

    const hits = ray.intersectObjects(
      groups, true
    );

    for (const h of hits) {
      let p = h.object;

      while (
        p &&
        !p.userData.worldItem &&
        p.parent
      ) {
        p = p.parent;
      }

      if (
        p &&
        p.userData.worldItem
      ) {
        return byId.get(
          p.userData.worldItem
        );
      }
    }

    return null;
  }

  cv.addEventListener('pointerdown', e => {
    if (
      !organizing ||
      cameraMode !== 'orbit'
    ) return;

    const o = pickMoveable(e);
    if (!o) return;

    e.stopImmediatePropagation();
    e.preventDefault();

    cv.setPointerCapture(e.pointerId);

    drag = {
      id: e.pointerId,
      o
    };

  }, true);

  cv.addEventListener('pointermove', e => {
    if (
      !drag ||
      drag.id !== e.pointerId
    ) return;

    e.stopImmediatePropagation();
    e.preventDefault();

    ndc(e);
    ray.setFromCamera(m2, cam);

    if (
      ray.ray.intersectPlane(
        groundPlane,
        hitPoint
      )
    ) {
      drag.o.root.position.x = hitPoint.x;
      drag.o.root.position.z = hitPoint.z;
    }

  }, true);

  function finishDrag(e) {
    if (
      !drag ||
      drag.id !== e.pointerId
    ) return;

    e.stopImmediatePropagation();
    e.preventDefault();

    const o = drag.o;

    const p = nearest(
      o,
      o.root.position.x,
      o.root.position.z
    );

    o.x = p.x;
    o.z = p.z;

    o.root.position.set(
      o.x, 0, o.z
    );

    layout[o.id] = {
      x: o.x,
      z: o.z,
      stored: false
    };

    save('vb-item-layout', layout);
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
        'w', 'a', 's', 'd'
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

  // 裁判椅或帆船視角：雙擊返回
  cv.addEventListener('dblclick', e => {
    if (cameraMode === 'orbit') return;

    e.stopImmediatePropagation();
    e.preventDefault();

    cameraMode = 'orbit';
    updateBoatControls();

  }, true);

  // ===== 開發者：預覽造訪天數 =====

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

  if (n === 1) {

    // 第 1 天恢復原本球場視角
    tgtP.set(0, 1, 0);

    ct.th = -0.55;
    ct.ph = 1.0;
    ct.d = 27;
    ct.tilt = 0;

  } else if (newItems.length > 0) {

    // 以當天物件的平均位置作為觀看中心
    const centerX =
      newItems.reduce((sum, o) => sum + o.x, 0) /
      newItems.length;

    const centerZ =
      newItems.reduce((sum, o) => sum + o.z, 0) /
      newItems.length;

    tgtP.set(centerX, 1, centerZ);

    ct.th = -0.55;
    ct.ph = 1.0;
    ct.d = n === 30 ? 22 : 18;
    ct.tilt = 0;
  }

  // 立即更新鏡頭，讓登場起點依照新視角計算
  cs.th = ct.th;
  cs.ph = ct.ph;
  cs.d = ct.d;
  cs.tilt = ct.tilt;

  camStep();

  // 更新開發者預覽天數
  VB_DEV_STATE.visitDay = n;

  currentDay = -1;
  syncDay(n);
  currentDay = n;

};

  // ===== 每幀更新物件 =====

  window.worldItemsStep = dt => {
    clock += dt;

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
    }

    const picnic = byId.get('picnic');
    const basket = byId.get('basket');

    // 野餐籃跟著野餐墊
    basket.root.position.x =
      picnic.root.position.x;

    basket.root.position.z =
      picnic.root.position.z;

    if (!basket.arrival) {
      basket.root.position.y =
        picnic.root.position.y;
    }

    refreshVisibility();

    for (const o of list) {
      if (!active(o)) continue;

      // 首次解鎖：從天空降落
      if (o.arrival) {
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
          o.arrival = null;
          o.root.position.y = 0;

          if (
            !VB_IS_DEV &&
            !seen[o.id]
          ) {
            seen[o.id] = true;
            save('vb-items-seen', seen);
          }

          soundArrival();
        }

        continue;
      }

      if (o.bound) continue;

      o.time = Math.max(
        0,
        o.time - dt
      );

      // 水壺晃動
      if (o.id === 'bottle') {
        o.art.rotation.z =
          Math.sin(o.time * 17) *
          o.time * .15;
      }

      // 毛巾隨風擺動
      if (
        o.id === 'towel' &&
        o.parts.cloth
      ) {
        o.parts.cloth.rotation.z =
          .035 *
          Math.sin(performance.now() * .0017) +
          .13 *
          Math.sin(o.time * 9) *
          o.time;
      }

      // 坐墊中央下陷、側邊移動
      if (
        o.id === 'bench' &&
        o.parts.cushion
      ) {
        const t = Math.sin(
          Math.PI *
          Math.min(1, o.time / .55)
        );

        o.parts.cushion.scale.y =
          o.action === 'press'
            ? 1 - .3 * t
            : 1;

        o.parts.cushion.position.x =
          o.action === 'left'
            ? -.22 * t
            : o.action === 'right'
              ? .22 * t
              : 0;
      }

      // 香檳氣泡
      if (
        o.id === 'picnic' &&
        o.parts.bubbles
      ) {
        o.parts.bubbles.forEach((m, i) => {
          const p =
            (1.8 - o.time) * .9 +
            i * .18;

          m.visible =
            o.time > 0 &&
            p >= 0 &&
            p < 1;

          m.position.y =
            .68 + Math.max(0, p) * .43;
        });
      }

      // 黑貓
      if (
        o.id === 'cat' &&
        o.parts.body &&
        o.parts.head &&
        o.parts.eyes &&
        o.parts.heart
      ) {
        const near = Math.hypot(
          ball.position.x - o.x,
          ball.position.z - o.z
        ) < 2.3;

        // 排球靠近，醒來伸懶腰
        if (
          near &&
          o.parts.wakeCooldown <= 0 &&
          !bday.active
        ) {
          o.action = 'stretch';
          o.time = 1.8;
          o.parts.wakeCooldown = 7;
        }

        o.parts.wakeCooldown = Math.max(
          0,
          o.parts.wakeCooldown - dt
        );

        // 生日彩蛋的特殊反應
        if (bday.active && bday.lit) {
          o.action = 'birthday';
          o.time = 1.8;
        }

        if (
          o.time === 0 &&
          !bday.active
        ) {
          o.action = '';
        }

        o.parts.eyes.forEach(eye => {
          eye.visible =
            (
              o.action === 'stretch' &&
              o.time > 0
            ) ||
            (bday.active && bday.lit);
        });

        o.parts.heart.visible =
          bday.active && bday.lit;

        o.parts.head.position.y =
          .7 +
          (
            o.action === 'stretch'
              ? .14 * Math.sin(o.time * 2)
              : 0
          );

        o.parts.body.rotation.z =
          o.action === 'roll'
            ? .35 * Math.sin(o.time * 8)
            : 0;

        o.parts.body.scale.y =
          .58 +
          (
            o.action === 'stretch'
              ? .15 * Math.sin(o.time * 2)
              : 0
          );
      }

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
          boatSpeed +=
            (forward ? 5 : 0) * dt;

          boatSpeed -=
            (backward ? 4 : 0) * dt;

          boatSpeed = Math.max(
            -1.8,
            Math.min(5, boatSpeed)
          );

          if (left) {
            boatHeading += 1.25 * dt;
          }

          if (right) {
            boatHeading -= 1.25 * dt;
          }
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

          // 航行範圍限制在水域
          if (
            Math.hypot(
              nx - LAKE.x,
              nz - LAKE.z
            ) < LAKE.r - 2
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

  const targetCamera = new T3.Object3D();

  const previousViewPos = new T3.Vector3();
  const previousViewQuat = new T3.Quaternion();

  window.worldSceneCameraStep = dt => {
    const mode = cameraMode;
    const goal = mode === 'orbit' ? 0 : 1;

    viewMix +=
      (goal - viewMix) *
      Math.min(1, dt * 4.5);

    if (viewMix < .001) return;

    const p = new T3.Vector3();
    const look = new T3.Vector3();

    if (mode === 'chair') {
      const o = byId.get('chair');

      p.set(
        o.x,
        4.3,
        o.z + .25
      );

      look.set(0, 1.2, 0);

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
    if (!organizing) return;

    for (const o of list) {
      const btn = pack.get(o.id);
      if (!btn) continue;

      if (!active(o) || o.arrival) {
        btn.style.display = 'none';
        continue;
      }

      const p = new T3.Vector3(
        o.root.position.x,
        1.5,
        o.root.position.z
      ).project(cam);

      const onscreen =
        p.z > -1 &&
        p.z < 1 &&
        Math.abs(p.x) < .95 &&
        Math.abs(p.y) < .95;

      btn.style.display =
        onscreen ? 'block' : 'none';

      if (onscreen) {
        btn.style.left =
          (p.x + 1) *
          innerWidth / 2 + 'px';

        btn.style.top =
          (1 - p.y) *
          innerHeight / 2 + 'px';
      }
    }
  };

  // ===== 日後替換手繪外觀的接口 =====

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
