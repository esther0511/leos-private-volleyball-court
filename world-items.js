
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
    bottle: [-14.2, 2.5],
    towel: [-15.2, 2.5],
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

    o.parts.water = cyl(o.art, .19, .17, .46, 0, .3, 0, 0x6fc3e6, 22);
    o.parts.water.material.transparent = true;
    o.parts.water.material.opacity = .62;

    for (let i = 0; i < 4; i++) cub(o.art, .09, .014, .01, 0, .2 + i * .14, .222, 0xffffff);

    cyl(o.art, .17, .2, .08, 0, .85, 0, 0x355c97, 22);
    cyl(o.art, .13, .15, .13, 0, .96, 0, 0x355c97, 22);
    cyl(o.art, .045, .06, .1, 0, 1.08, 0, 0xe0a176, 12);

    const loop = new T3.Mesh(new T3.TorusGeometry(.1, .02, 6, 16), material(0xe0a176));
    loop.position.set(.15, .97, 0);
    o.art.add(loop);

    clickZone(o, .8, 1.35, .8, 0, .62, 0, () => o.interact(o));
  }, o => {
    o.time = .9;
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
    // 三層折疊，邊緣有圓角，才像厚毛巾而不是板子
    const fold = (w, h, d, y, rotY) => {
      const side = material(0xf6e3c8);
      const g = new T3.Group();
      g.add(new T3.Mesh(
        new T3.BoxGeometry(w, h, d),
        [side, side, new T3.MeshLambertMaterial({ map: towelTex }), side, side, side]
      ));
      for (const s of [-1, 1]) {
        const e = new T3.Mesh(new T3.CylinderGeometry(h / 2, h / 2, d, 10), material(0xf6e3c8));
        e.rotation.x = Math.PI / 2;
        e.position.x = s * w / 2;
        g.add(e);
      }
      g.position.y = y;
      g.rotation.y = rotY;
      o.art.add(g);
      return g;
    };

    fold(1.5, .11, .86, .07, 0);
    fold(1.42, .1, .8, .17, .05);
    o.parts.cloth = fold(1.34, .1, .74, .27, -.04);

    clickZone(o, 1.8, .6, 1.2, 0, .25, 0, () => o.interact(o));
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
    // 野餐墊放大
    const rug = new T3.Mesh(
      new T3.PlaneGeometry(5.4, 3.9),
      new T3.MeshBasicMaterial({ map: rugTex, side: T3.DoubleSide })
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

    o.parts.wine = cyl(o.art, .095, .05, .5, gx, .83, gz, 0xf1de9a, 16);
    o.parts.wine.material.transparent = true;
    o.parts.wine.material.opacity = .65;

    o.parts.bubbles = [];
    for (let i = 0; i < 7; i++) {
      const m = orb(o.art, .022, gx, .6, gz, 0xffffff, 8, 6);
      m.visible = false;
      o.parts.bubbles.push(m);
    }
    o.parts.gx = gx;
    o.parts.gz = gz;

    // --- 香檳酒瓶：深綠玻璃、金色錫箔、軟木塞，一個 ---
    const bx = 1.7, bz = .35, green = 0x2f5b45;
    cyl(o.art, .2, .2, .62, bx, .34, bz, green, 18);
    cyl(o.art, .2, .08, .22, bx, .76, bz, green, 18);
    cyl(o.art, .08, .075, .38, bx, 1.06, bz, green, 14);
    cyl(o.art, .095, .095, .17, bx, 1.2, bz, 0xe9c46a, 14);
    cub(o.art, .22, .26, .015, bx, .4, bz + .2, 0xfff3d6);
    cub(o.art, .13, .04, .017, bx, .43, bz + .2, 0xcc5a38);

    o.parts.cork = cyl(o.art, .062, .062, .13, bx, 1.35, bz, 0xd9b384, 10);
    o.parts.foam = orb(o.art, .09, bx, 1.33, bz, 0xffffff, 10, 8);
    o.parts.foam.visible = false;
    o.parts.bx = bx;
    o.parts.bz = bz;

    // 點酒杯：冒氣泡；點酒瓶：砰！軟木塞彈出
    clickZone(o, .6, 1.5, .6, gx, .75, gz, () => o.interact(o));
    clickZone(o, .6, 1.6, .6, bx, .8, bz, () => { markTouched(o.id); o.pop = 1.5; });

  }, o => {
    o.time = 1.8;
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
          o.rot = Number.isFinite(v.rot) ? v.rot : 0;
        }

        o.root.position.set(o.x, 0, o.z);

        o.root.rotation.y = o.rot;

        const first = VB_IS_DEV || !seen[o.id];

        if (first && !o.stored) {
          if (VB_IS_DEV) {
            // 開發者預覽：立刻降落
            o.arrival = { t: -list.indexOf(o) * .25, d: 6, height: startHeight(o) };
            o.root.position.y = o.arrival.height;
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

  let selected = null;
  const RADIUS = { bottle: .6, towel: 1.1, cart: 1.5, picnic: 2.9, bench: 1.8 };

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
    const done = btn('完成');
    done.onclick = toggleOrganizer;
    head.append(title, done);

    const hint = el('p', 'hint');
    hint.textContent = '拖曳物件移動。點一下物件選取，就能旋轉或收起。';
    storeBox.append(head, hint);

    if (selected && active(selected)) {
      const s = el('div', 'sel');
      s.textContent = '已選取：' + selected.name;
      storeBox.append(s);

      const tools = el('div', 'tools');
      const l = btn('↺ 左轉'); l.onclick = () => rotateSelected(-1);
      const r = btn('右轉 ↻'); r.onclick = () => rotateSelected(1);
      tools.append(l, r);

      if (!selected.noStore && !selected.fixed) {
        const k = btn('收進排球車');
        k.style.gridColumn = '1 / -1';
        k.onclick = storeSelected;
        tools.append(k);
      }
      storeBox.append(tools);
    }

    const stored = list.filter(o => o.stored && o.unlocked && !o.fixed && !o.noStore);
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
    if (!organizing) selected = null;
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

  cv.addEventListener('pointerdown', e => {
    if (!organizing || cameraMode !== 'orbit') return;

    const o = pickMoveable(e);
    if (!o) return;

    e.stopImmediatePropagation();
    e.preventDefault();
    cv.setPointerCapture(e.pointerId);

    selected = o;
    renderStorage();
    drag = { id: e.pointerId, o };
  }, true);

  cv.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;

    e.stopImmediatePropagation();
    e.preventDefault();

    ndc(e);
    ray.setFromCamera(m2, cam);

    if (ray.ray.intersectPlane(groundPlane, hitPoint)) {
      drag.o.root.position.x = hitPoint.x;
      drag.o.root.position.z = hitPoint.z;
    }
  }, true);

  function finishDrag(e) {
    if (!drag || drag.id !== e.pointerId) return;

    e.stopImmediatePropagation();
    e.preventDefault();

    const o = drag.o;
    const p = nearest(o, o.root.position.x, o.root.position.z);
    o.x = p.x; o.z = p.z;
    place(o);
    saveLayout(o);
    drag = null;
  }

  cv.addEventListener('pointerup', finishDrag, true);
  cv.addEventListener('pointercancel', finishDrag, true);

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
      const o = pick(e);
      if (o) { if (o.userData.ball) hit(); else o.userData.act(); }
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

  // ===== 銀河（夜晚才看得見） =====

  const milkyTex = (() => {
    const W2 = 2048, H2 = 1024;
    const c = document.createElement('canvas');
    c.width = W2; c.height = H2;
    const g = c.getContext('2d');
    const gauss = () => { let s = 0; for (let i = 0; i < 4; i++) s += Math.random(); return (s - 2) / .58; };

    // 柔和光暈（中央偏暖）
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * W2, y = H2 / 2 + gauss() * H2 * .035, r = rnd(50, 150);
      const warm = Math.abs(x / W2 - .5) < .18;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, warm ? 'rgba(255,226,200,.05)' : 'rgba(190,205,255,.045)');
      gr.addColorStop(1, 'rgba(190,205,255,0)');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // 暗色塵埃帶
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * W2, y = H2 / 2 + gauss() * H2 * .02, r = rnd(30, 90);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(4,8,28,.12)');
      gr.addColorStop(1, 'rgba(4,8,28,0)');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // 細小星點
    for (let i = 0; i < 16000; i++) {
      g.globalAlpha = rnd(.12, .8);
      g.fillStyle = Math.random() < .2 ? '#ffe9d0' : '#dbe6ff';
      g.fillRect(Math.random() * W2, H2 / 2 + gauss() * H2 * .07, rnd(.6, 1.6), rnd(.6, 1.6));
    }
    return new T3.CanvasTexture(c);
  })();

  const milky = new T3.Mesh(
    new T3.SphereGeometry(300, 48, 24),
    new T3.MeshBasicMaterial({ map: milkyTex, transparent: true, opacity: 0, side: T3.BackSide, depthWrite: false, fog: false })
  );
  milky.rotation.set(.9, 0, .5);
  milky.renderOrder = -10;
  sc.add(milky);

  function updateSky(dt) {
    const sv = Math.max(starV, bday.magic * .7);
    const k = Math.max(0, Math.min(1, (sv - .15) / .6));
    milky.material.opacity = k * .9;
    milky.visible = k > .01;
    milky.rotation.y += dt * .003;
  }
    
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
  const TOP = { bottle: 1.9, towel: 1.2, cart: 2.6, chair: 5.3, bench: 2.4, picnic: 1.9, cat: 1.6, basket: 1.7, sailboat: 3.6 };
  const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));

  function markTouched(id) {
    if (touched[id]) return;
    touched[id] = true;
    if (!VB_IS_DEV) save('vb-items-touched', touched);
  }

  let reveal = null;
  let lastInput = 0;
  let interacted = false;
  const openedAt = performance.now();

  for (const ev of ['pointerdown', 'pointermove', 'wheel', 'keydown']) {
    window.addEventListener(ev, () => { lastInput = performance.now(); }, { capture: true, passive: true });
  }
  window.addEventListener('pointerdown', () => {
    interacted = true;
    if (reveal) skipReveal();
  }, true);

  function finishArrival(o) {
    o.arrival = null;
    o.root.position.y = 0;
    if (!VB_IS_DEV && !seen[o.id]) {
      seen[o.id] = true;
      save('vb-items-seen', seen);
    }
  }

  function landingEffect(o) {
    const r = new T3.Mesh(
      new T3.RingGeometry(.4, .6, 32),
      new T3.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: T3.DoubleSide })
    );
    r.rotation.x = -Math.PI / 2;
    r.position.set(o.x, .06, o.z);
    sc.add(r);
    rings.push({ r, t: 0 });
    shake = Math.max(shake, .2);
  }

  function tryStartReveal(now) {
    const pend = list.filter(o => o.unlocked && o.pending && !o.stored);
    if (!pend.length) return;
    if (document.visibilityState !== 'visible') return;
    if (!pad.hidden || bday.active || organizing || cameraMode !== 'orbit' || viewMix > .02) return;
    if (!(interacted || now - openedAt > 5000)) return;
    if (now - lastInput < 1500) return;

    const day = Math.min(...pend.map(o => o.day));
    const batch = pend.filter(o => o.day === day);
    const fx = batch.reduce((s, o) => s + o.x, 0) / batch.length;
    const fz = batch.reduce((s, o) => s + o.z, 0) / batch.length;

    reveal = {
      items: batch, phase: 'glide', t: 0, fx, fz,
      saved: { th: ct.th, ph: ct.ph, d: ct.d, tilt: ct.tilt, x: tgtP.x, z: tgtP.z }
    };

    batch.forEach((o, i) => {
      o.pending = false;
      o.arrival = { t: -1.3 - i * .5, d: 5, height: 15 };
      o.root.position.set(o.x, 15, o.z);
    });
    refreshVisibility();

    // 鏡頭站在物件外側，朝球場方向看
    ct.th = cs.th + wrapAngle(Math.atan2(fx, fz) - cs.th);
    ct.ph = 1.05;
    ct.tilt = 0;
    ct.d = batch.some(o => o.id === 'sailboat') ? 24 : 17;
  }

  function beginReturn() {
    const r = reveal;
    r.phase = 'return';
    r.t = 0;
    ct.th = cs.th + wrapAngle(r.saved.th - cs.th);
    ct.ph = r.saved.ph;
    ct.d = r.saved.d;
    ct.tilt = r.saved.tilt;
  }

  function skipReveal() {
    if (!reveal || reveal.phase === 'return') return;
    reveal.items.forEach(o => { if (o.arrival) finishArrival(o); });
    beginReturn();
  }

  function revealStep(dt, now) {
    if (!reveal) { tryStartReveal(now); return; }

    const r = reveal;
    const k = Math.min(1, dt * 2.4);
    r.t += dt;

    if (r.phase !== 'return') {
      tgtP.x += (r.fx - tgtP.x) * k;
      tgtP.z += (r.fz - tgtP.z) * k;
    }

    if (r.phase === 'glide' && r.t > 1) r.phase = 'drop';
    else if (r.phase === 'drop' && r.items.every(o => !o.arrival)) { r.phase = 'hold'; r.t = 0; }
    else if (r.phase === 'hold' && r.t > 2.4) beginReturn();
    else if (r.phase === 'return') {
      tgtP.x += (r.saved.x - tgtP.x) * k;
      tgtP.z += (r.saved.z - tgtP.z) * k;
      if (r.t > 1.8) reveal = null;
    }
  }

  function updateSparkle(o) {
    const want = !o.arrival && !touched[o.id];
    if (!want) { if (o.sparkle) o.sparkle.visible = false; return; }

    if (!o.sparkle) {
      o.sparkle = new T3.Sprite(new T3.SpriteMaterial({
        map: starGlowTexture, color: 0xfff0b8, blending: T3.AdditiveBlending,
        transparent: true, depthWrite: false, fog: false
      }));
      o.root.add(o.sparkle);
    }

    const t = performance.now() * .003 + o.day;
    const s = 1.5 + .25 * Math.sin(t * 1.3);
    o.sparkle.visible = true;
    o.sparkle.material.opacity = .5 + .3 * Math.sin(t);
    o.sparkle.scale.set(s, s, 1);
    o.sparkle.position.y = (TOP[o.id] || 2) + .12 * Math.sin(t * 1.7);
  }

  // 給 index.html 判斷目前是不是一般視角
  window.worldCameraMode = () => cameraMode;
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

    for (const o of list) {
      if (!active(o)) { if (o.sparkle) o.sparkle.visible = false; continue; }
      updateSparkle(o);

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
          finishArrival(o);
          landingEffect(o);
          soundArrival();
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

      // 水壺晃動
      if (o.id === 'bottle') {
        o.art.rotation.z = Math.sin(o.time * 17) * o.time * .12;
        if (o.parts.water) o.parts.water.rotation.z = -Math.sin(o.time * 11) * o.time * .5;
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
            if (o.id === 'picnic' && o.parts.bubbles) {
        const P = o.parts;

        P.bubbles.forEach((m, i) => {
          const p = (1.8 - o.time) * .9 + i * .18;
          m.visible = o.time > 0 && p >= 0 && p < 1;
          m.position.set(
            P.gx + Math.sin(i * 5 + p * 6) * .045,
            .62 + Math.max(0, p) * .46,
            P.gz + Math.cos(i * 3) * .04
          );
        });

        // 開香檳：軟木塞彈出，落回瓶口
        o.pop = Math.max(0, (o.pop || 0) - dt);
        if (o.pop > 0) {
          const q = 1 - o.pop / 1.5;
          const back = Math.max(0, (q - .7) / .3);
          P.cork.position.set(
            P.bx + q * .5 * (1 - back),
            1.35 + Math.sin(q * Math.PI) * 2.4 * (1 - back),
            P.bz - q * .3 * (1 - back)
          );
          P.cork.rotation.z = q * 9 * (1 - back);
          P.foam.visible = q < .6;
          P.foam.scale.setScalar(.6 + Math.sin(Math.min(1, q / .6) * Math.PI) * 1.2);
        } else {
          P.cork.position.set(P.bx, 1.35, P.bz);
          P.cork.rotation.z = 0;
          P.foam.visible = false;
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
