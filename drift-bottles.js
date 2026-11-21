
/*
 * 排球場｜第三階段
 * 漸變海岸、岩石停泊、船艙物件、漂流瓶與信紙
 *
 * 載入順序：
 * world-items.js
 * boat-cabin.js
 * drift-bottles.js
 * roam-controls.js
 *
 * 收藏沿用 vb-boat-cabin-v1。
 * 不新增 localStorage key。
 * 正式故事內容尚未加入。
 */

(() => {
  'use strict';

  if (window.VBDriftBottles) return;

  const access = window.VBBoatAccess;
  const cabin = window.VBBoatCabin;

  if (
    !access?.getObject?.() ||
    !cabin?.getState ||
    typeof cabin.collectDriftBottle !== 'function' ||
    typeof T3 === 'undefined' ||
    typeof sc === 'undefined' ||
    typeof cv === 'undefined' ||
    typeof hitList === 'undefined'
  ) {
    console.error(
      '[VB Stage 3] 缺少船隻、場景或收藏接口。'
    );
    return;
  }

  const boat = access.getObject();

  const DEV =
    typeof VB_IS_DEV !== 'undefined' &&
    VB_IS_DEV;

  const clamp = v =>
    Math.max(0, Math.min(1, v));

  const ease = v => {
    const x = clamp(v);
    return x * x * (3 - 2 * x);
  };

  const notify = text => {
    if (typeof popText === 'function') {
      popText(text);
    }
  };

  // ====================================
  // 一、海岸設定
  // ====================================

  const COAST = {
    begin: -25.5,
    far: -470,
    middle: 14
  };

  function coastCenter(x) {
    return COAST.middle +
      Math.sin((x + 42) * .028) * 1.5;
  }

  // 靠岸時窄，遠海逐漸變寬。
  function halfWidth(x) {
    const neck = ease(
      (COAST.begin - x) / 17
    );

    const ocean = ease(
      (-x - 70) / 165
    );

    return .4 + 8.2 * neck + 400 * ocean;
  }

  function stripGeometry(
    startX,
    endX,
    count,
    section
  ) {
    const vertices = [];
    const indices = [];

    for (let i = 0; i <= count; i++) {
      const x =
        startX +
        (endX - startX) * i / count;

      const pair = section(
        x,
        i / count
      );

      vertices.push(
        x, pair[2], pair[0],
        x, pair[2], pair[1]
      );

      if (i < count) {
        const p = i * 2;

        indices.push(
          p, p + 1, p + 2,
          p + 1, p + 3, p + 2
        );
      }
    }

    const geo = new T3.BufferGeometry();

    geo.setAttribute(
      'position',
      new T3.Float32BufferAttribute(
        vertices, 3
      )
    );

    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }

  // ====================================
  // 二、海洋
  // ====================================

  const ocean = new T3.Mesh(
    stripGeometry(
      COAST.begin,
      COAST.far,
      180,
      x => [
        coastCenter(x) - halfWidth(x),
        coastCenter(x) + halfWidth(x),
        .045
      ]
    ),
    new T3.MeshBasicMaterial({
      color: 0x70b8c5,
      side: T3.DoubleSide,
      transparent: true,
      opacity: .89,
      depthWrite: false,
      fog: true
    })
  );

  ocean.visible = false;
  ocean.frustumCulled = false;

  sc.add(ocean);

  // ====================================
  // 三、沙岸與濕沙
  // ====================================

// ===== 自然銜接的海灣沙岸 =====

// 左右沙岸使用相同海岸曲線。
// 靠近球場的一端逐漸收窄，
// 不再使用額外圓形補丁。

function makeShore(side, wet) {

  const divisions = 112;

  const geo = stripGeometry(
    -18,
    -143,
    divisions,
    x => {

      // 靠近球場的一端逐漸收束
      const tip = ease(
        (-x - 18) / 12
      );

      // 海岸線的小幅度自然起伏
      const wave = tip * (
        .36 * Math.sin(x * .18) +
        .18 * Math.sin(x * .37)
      );

      const edge =
        halfWidth(x) * tip;

      const shore =
        coastCenter(x) +
        side * (edge + wave);

      // 濕沙緊鄰海水，
      // 乾沙接在濕沙外側。
      // 兩者不再大面積重疊。

      const inner =
        shore +
        side *
        (wet ? .12 : 2.12) *
        tip;

      const outer =
        shore +
        side *
        (wet ? 2.17 : 8.2) *
        tip;

      return [
        inner,
        outer,
        wet ? .068 : .061
      ];
    }
  );

  const mesh = new T3.Mesh(
    geo,
    new T3.MeshBasicMaterial({

      color: wet
        ? 0xb6a891
        : 0xe9d7ad,

      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: T3.DoubleSide

    })
  );

  mesh.frustumCulled = false;
  mesh.visible = false;

  sc.add(mesh);

  return {
    mesh,
    divisions
  };
}

// 乾沙
const sand = [
  makeShore(1, false),
  makeShore(-1, false)
];

// 濕沙
const wet = [
  makeShore(1, true),
  makeShore(-1, true)
];


  // ====================================
  // 四、小帆船停靠岩石
  // ====================================

  const rockGroup = new T3.Group();

  const rockCoords = [
    [-38.2, 11.75, .76],
    [-39.05, 11.35, .48],
    [-37.52, 11.46, .32]
  ];

  for (const [x, z, r] of rockCoords) {
    const rock = new T3.Mesh(
      new T3.DodecahedronGeometry(r, 0),
      new T3.MeshLambertMaterial({
        color: 0x89928d,
        flatShading: true
      })
    );

    rock.position.set(x, .20, z);
    rock.scale.set(1.15, .65, .95);

    rockGroup.add(rock);
  }

  rockGroup.visible = false;
  sc.add(rockGroup);

  // 找出原本的大面積矩形海面。
  const oldSeaMeshes = sc.children.filter(m =>
    m !== ocean &&
    m.isMesh &&
    m.geometry?.type === 'PlaneGeometry' &&
    m.geometry.parameters?.width >= 500 &&
    m.position.x < -100 &&
    Math.abs(
      m.rotation.x + Math.PI / 2
    ) < .04
  );

  // 原有遠海方向的山丘。
  const seaHills =
    typeof horizonHills !== 'undefined'
      ? horizonHills.filter(
          h => h.position.x < -35
        )
      : [];

  // ====================================
  // 五、依照日期逐漸形成海岸
  // ====================================

  function firstVisit() {
    try {
      const days = JSON.parse(
        vbStore.getItem('vb-visit-dates') ||
        '[]'
      );

      const valid = Array.isArray(days)
        ? days.filter(s =>
            typeof s === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(s)
          ).sort()
        : [];

      if (valid.length) {
        return valid[0];
      }

    } catch (_) {}

    const d = new Date();

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  }

  const firstDay = firstVisit();

  function terrainProgress() {
    if (DEV) {
      return clamp(
        ((VB_DEV_STATE?.visitDay || 1) - 1) / 29
      );
    }

    const target =
      new Date(2026, 11, 24).getTime();

    const from =
      new Date(
        firstDay + 'T00:00:00'
      ).getTime();

    if (Date.now() >= target) {
      return 1;
    }

    if (
      !Number.isFinite(from) ||
      from >= target
    ) {
      return 0;
    }

    return clamp(
      (Date.now() - from) /
      (target - from)
    );
  }

  let lastTerrain = -1;

  function updateTerrain() {
    const p = terrainProgress();

    const land = ease(
      (p - .16) / .54
    );

    const damp = ease(
      (p - .63) / .32
    );

    const length = ease(
      (p - .15) / .7
    );

    if (Math.abs(p - lastTerrain) > .00001) {

      for (const s of sand) {
        s.mesh.visible = land > .001;

        s.mesh.material.opacity =
          land * .95;

        s.mesh.geometry.setDrawRange(
          0,
          Math.max(
            1,
            Math.floor(
              s.divisions * length
            )
          ) * 6
        );
      }

      for (const w of wet) {
        w.mesh.visible = damp > .001;

        w.mesh.material.opacity =
          damp * .45;

        w.mesh.geometry.setDrawRange(
          0,
          Math.max(
            1,
            Math.floor(
              w.divisions * length
            )
          ) * 6
        );
      }

    

      // 最初是草地；球場本身維持不變。
      if (typeof ground !== 'undefined') {
        ground.material.color.setHex(
          0x84b6a0
        );
      }

      lastTerrain = p;
    }

    // 12/24 才正式出現海洋。
    const open = !!boat.unlocked;

    ocean.visible = open;
    rockGroup.visible = open;

    // 防止舊矩形水面重新出現。
    for (const mesh of oldSeaMeshes) {
      mesh.visible = false;
    }

    // 遠海方向不再有湖泊式山丘。
    for (const hill of seaHills) {
      hill.visible = !open;
    }

    // 小帆船撞到岩石時輕微搖晃。
    const a = boat.arrival;

    if (
      a?.kind === 'wind' &&
      a.d > 0
    ) {
      const n = clamp(
        (a.t / a.d - .88) / .12
      );

      if (n > 0 && n < 1) {
        const bump =
          Math.sin(n * Math.PI * 3) *
          (1 - n);

        boat.art.rotation.z +=
          bump * .075;
      }
    }
  }

  // ====================================
  // 六、船上 3D 實體物件
  // ====================================

  const props = new T3.Group();

  boat.art.add(props);

  const objectHits = [];

  function part(parent, geometry, color, pos) {
    const mesh = new T3.Mesh(
      geometry,
      new T3.MeshLambertMaterial({
        color
      })
    );

    mesh.position.set(...pos);
    parent.add(mesh);

    return mesh;
  }

  function target(parent, size, y, callback) {
    const hit = new T3.Mesh(
      new T3.BoxGeometry(...size),
      new T3.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );

    hit.position.y = y;
    hit.userData.act = callback;

    parent.add(hit);
    objectHits.push(hit);

    return hit;
  }

  // ====================================
  // 七、防水背包模型
  // ====================================

  const bag = new T3.Group();

  bag.position.set(.28, .67, -.22);

  // 袋身
  part(
    bag,
    new T3.BoxGeometry(.39, .41, .31),
    0x355c97,
    [0, .25, 0]
  );

  // 捲口
  part(
    bag,
    new T3.CylinderGeometry(
      .2, .2, .10, 18
    ),
    0x263653,
    [0, .49, 0]
  );

  // 扣帶
  part(
    bag,
    new T3.BoxGeometry(
      .045, .29, .025
    ),
    0xe0a176,
    [0, .37, .167]
  );

  // 扣具
  part(
    bag,
    new T3.BoxGeometry(
      .13, .055, .045
    ),
    0xffe7ad,
    [0, .46, .185]
  );

  // 背帶
  const handle = new T3.Mesh(
    new T3.TorusGeometry(
      .13, .024, 6, 18, Math.PI
    ),
    new T3.MeshLambertMaterial({
      color: 0x263653
    })
  );

  handle.rotation.z = Math.PI;
  handle.position.y = .56;

  bag.add(handle);

  // 點擊背包
  target(
    bag,
    [.7, .85, .68],
    .35,
    () => {
      if (!access.isSailing()) return;

      if (!cabin.getState().bag) {
        if (!cabin.takeItem('bag')) return notify('背包未能儲存，請再試一次。');
        notify('取得防水背包。');
      }

      cabin.openBackpack?.();
    }
  );

  props.add(bag);

  // ====================================
  // 八、信封模型
  // ====================================

  const envelope = new T3.Group();

  envelope.position.set(
    -.36, .70, -.39
  );

  part(
    envelope,
    new T3.BoxGeometry(.34, .03, .25),
    0xf9f0d9,
    [0, 0, 0]
  );

  part(
    envelope,
    new T3.BoxGeometry(.09, .012, .06),
    0xc99088,
    [0, .022, 0]
  );

  target(
    envelope,
    [.53, .38, .49],
    .16,
    () => {
      if (!access.isSailing()) return;

      if (!cabin.takeItem('letter')) return notify('信封未能儲存，請再試一次。');
      cabin.openBoatLetter?.();
    }
  );

  props.add(envelope);

  // ====================================
  // 九、航海日誌模型
  // ====================================

  const journal = new T3.Group();

  journal.position.set(
    .21, .70, .33
  );

  // 書封
  part(
    journal,
    new T3.BoxGeometry(.39, .06, .47),
    0x355c97,
    [0, 0, 0]
  );

  // 書頁
  part(
    journal,
    new T3.BoxGeometry(.32, .018, .42),
    0xf0e5d2,
    [.02, .042, 0]
  );

  // 書脊
  part(
    journal,
    new T3.BoxGeometry(.035, .065, .48),
    0x263653,
    [-.18, 0, 0]
  );

  target(
    journal,
    [.57, .38, .59],
    .16,
    () => {
      if (!access.isSailing()) return;

      if (!cabin.takeItem('log')) return notify('日誌未能儲存，請再試一次。');

      if (cabin.getState().bag) {
        cabin.openBackpackTab?.('journal');
      } else {
        notify(
          '航海日誌已取得。先拿起防水背包即可翻閱。'
        );
      }
    }
  );

  props.add(journal);

  // 隱藏舊版船艙裝飾，避免重疊。
  const legacyProps = boat.art.children.filter(
    group => {
      if (
        group === props ||
        !group.isGroup
      ) return false;

      const p = group.position;

      return (
        Math.abs(p.y - .67) < .04 &&
        (
          Math.abs(p.x + .29) < .04 ||
          Math.abs(p.x - .27) < .04 ||
          Math.abs(p.x - .24) < .04
        )
      );
    }
  );

  // ====================================
  // 十、介面樣式
  // ====================================

  const css = document.createElement('style');

  css.textContent = `
    /* 取消右上角背包按鈕 */
    #vbBagButton {
      display: none !important;
    }

    #vbRoamUiMenu [hidden] {
      display: none !important;
    }

    #vbLetterReader[hidden] {
      display: none !important;
    }

    #vbLetterReader {
      position: fixed;
      inset: 0;
      z-index: 45;
      display: grid;
      place-items: center;
      padding: 16px;
      background: rgba(14,23,44,.60);
      backdrop-filter: blur(7px);
      -webkit-backdrop-filter: blur(7px);
    }

    #vbLetterReader .sheet-wrap {
      width: min(550px,96vw);
      max-height: 92dvh;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    #vbLetterReader .sheet {
      background: #f7edda;
      color: #293850;
      border-radius: 4px;
      box-shadow:
        0 18px 45px rgba(0,0,0,.27);
      padding: 35px 30px;
      max-height: 73dvh;
      min-height: 200px;
      overflow-y: auto;
      overflow-wrap: anywhere;
      user-select: text;
      -webkit-user-select: text;
      white-space: pre-wrap;
      font: 16px/1.95
        'Noto Serif TC',
        'PingFang TC',
        serif;
      transform:
        scaleX(.08) translateY(18px);
      transform-origin: center;
      opacity: .35;
      transition:
        transform .95s cubic-bezier(.2,.9,.2,1),
        opacity .65s;
    }

    #vbLetterReader.open .sheet {
      transform:
        scaleX(1) translateY(0);
      opacity: 1;
    }

    #vbLetterReader .sender {
      font-size: 13px;
      opacity: .73;
      margin-bottom: 18px;
    }

    #vbLetterReader .buttons {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    #vbLetterReader button {
      cursor: pointer;
      border: 1px solid rgba(255,255,255,.6);
      border-radius: 10px;
      background: #293d65;
      color: white;
      padding: 10px 16px;
      font: 600 13px
        system-ui,
        'PingFang TC',
        sans-serif;
    }

    #vbLetterReader button:hover {
      background: #355c97;
    }

    @media(max-width:560px) {
      #vbLetterReader .sheet {
        padding: 23px 20px;
        font-size: 15px;
      }
    }

    @media(prefers-reduced-motion:reduce) {
      #vbLetterReader .sheet {
        transition-duration: .01s;
      }
    }
  `;

  document.head.append(css);

  // 移除舊拾取按鈕
  document.querySelector(
    '#vbDriftPickup'
  )?.remove();

  // ====================================
  // 十一、左上角選單加入防水背包
  // ====================================

  function connectBagMenu() {
    const menu = document.querySelector(
      '#vbRoamUiMenu'
    );

    const button = document.querySelector(
      '#vbRoamUiButton'
    );

    if (
      !menu ||
      !button ||
      menu.querySelector('[data-waterproof-bag]')
    ) return;

    const bagMenu =
      document.createElement('button');

    bagMenu.type = 'button';
    bagMenu.dataset.waterproofBag = '1';
    bagMenu.textContent = '防水背包';

    bagMenu.hidden =
      !cabin.getState().bag;

    bagMenu.addEventListener(
      'click',
      () => {
        if (!cabin.getState().bag) return;

        cabin.openBackpack?.();

        menu.classList.remove('open');

        button.setAttribute(
          'aria-expanded',
          'false'
        );
      }
    );

    menu.append(bagMenu);

    button.addEventListener('click', () => {
      bagMenu.hidden =
        !cabin.getState().bag;
    });
  }

  if (document.readyState === 'complete') {
    connectBagMenu();
  } else {
    window.addEventListener(
      'load',
      connectBagMenu,
      {once:true}
    );
  }

  // ====================================
  // 十二、漂流瓶資料
  // ====================================

  // 正式故事尚未加入。
  // 之後將完整故事寫入這個陣列。
  const STORY_BOTTLES = [];

  const d = new Date();

  const today = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2,'0'),
    String(d.getDate()).padStart(2,'0')
  ].join('-');

  const dayNum = Math.floor(
    new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate()
    ) / 86400000
  );

  const sources = STORY_BOTTLES
    .filter(o =>
      typeof o?.id === 'string' &&
      o.id.length <= 65 &&
      typeof o.text === 'string' &&
      o.text.trim() &&
      Number.isFinite(o.x) &&
      Number.isFinite(o.z)
    )
    .map(o => ({
      ...o,
      kind:'letter'
    }));

  // 開發者模式測試信
  if (DEV) {
    sources.push({
      id: 'dev-test-letter',
      kind: 'letter',
      x: -48,
      z: 15,
      sender: '測試紙條',
      text:
        '這只是一封用於測試的紙條。\n\n測試瓶塞打開、信紙抽出、閱讀及收藏。\n\n正式故事尚未加入。'
    });
  }

  // 依日期出現空瓶
  if (
    DEV ||
    today === '2026-12-24' ||
    dayNum % 2 === 0
  ) {
    sources.push({
      id: `empty-${today}-a`,
      kind: 'empty',
      x: -53,
      z: 20
    });
  }

  if (dayNum % 5 === 0) {
    sources.push({
      id: `empty-${today}-b`,
      kind: 'empty',
      x: -97,
      z: 4
    });
  }

  const TAKE_DISTANCE = 4.6;

  const bottles = [];
  const bottleHits = [];

  const state = () =>
    cabin.getState();

  const distance = o =>
    Math.hypot(
      boat.x - o.x,
      boat.z - o.z
    );

  // ====================================
  // 十三、建立漂流瓶模型
  // ====================================

  function makeBottle(src, index) {
    const root = new T3.Group();

    root.position.set(
      src.x, .22, src.z
    );

    root.visible = false;

    const art = new T3.Group();
    art.rotation.z = Math.PI / 2;

    root.add(art);

    const glass = new T3.MeshPhongMaterial({
      color: 0xc9eef2,
      transparent: true,
      opacity: .48,
      shininess: 95,
      side: T3.DoubleSide,
      depthWrite: false
    });

    const body = new T3.Mesh(
      new T3.CylinderGeometry(
        .21, .22, .8, 16, 1, true
      ),
      glass
    );

    art.add(body);

    const base = new T3.Mesh(
      new T3.CylinderGeometry(
        .22, .22, .03, 16
      ),
      new T3.MeshLambertMaterial({
        color: 0xa4e3e8,
        transparent: true,
        opacity: .62,
        depthWrite: false
      })
    );

    base.position.y = -.4;
    art.add(base);

    const neck = new T3.Mesh(
      new T3.CylinderGeometry(
        .105, .145, .27, 14
      ),
      glass
    );

    neck.position.y = .52;
    art.add(neck);

    const cork = new T3.Mesh(
      new T3.CylinderGeometry(
        .12, .11, .17, 12
      ),
      new T3.MeshLambertMaterial({
        color: 0xcba47b
      })
    );

    cork.position.y = .73;
    art.add(cork);

    let paper = null;

    if (src.kind === 'letter') {
      paper = new T3.Mesh(
        new T3.CylinderGeometry(
          .078, .078, .55, 10
        ),
        new T3.MeshLambertMaterial({
          color: 0xffefcf
        })
      );

      paper.position.y = -.04;
      art.add(paper);
    }

    // 獨立點擊區
    const hit = new T3.Mesh(
      new T3.BoxGeometry(
        1.38, .82, 1.3
      ),
      new T3.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );

    root.add(hit);

    const o = {
      ...src,
      root,
      art,
      cork,
      paper,
      glass,
      hit,
      index,
      mode: 'idle',
      age: 0,
      taken: false
    };

    hit.userData.act = () =>
      beginPickup(o);

    bottleHits.push(hit);
    sc.add(root);

    return o;
  }

  const seen = new Set();

  for (const [i, s] of sources.entries()) {

    if (
      seen.has(s.id) ||
      state().collectedBottleIds?.includes(s.id) ||
      state().bottles?.some(
        b => b.id === s.id
      )
    ) continue;

    seen.add(s.id);

    bottles.push(
      makeBottle(s, i)
    );
  }

  // ====================================
  // 十四、拾取判定
  // ====================================

  function beginPickup(o) {

    if (
      !o ||
      o.mode !== 'idle' ||
      o.taken ||
      !access.isSailing() ||
      cabin.isOpen?.() ||
      !reader.hidden ||
      boat.arrival ||
      boat.pending
    ) return false;

    if (distance(o) > TAKE_DISTANCE) {
      notify('再靠近漂流瓶一點。');
      return false;
    }

    if (!state().bag) {
      notify('先點擊船上的防水背包。');
      return false;
    }

    if (bottles.some(b => !b.taken && b.mode !== 'idle')) return false;

    o.mode = 'opening';
    o.age = 0;

    return true;
  }

  function resetBottle(o) {
    o.mode = 'idle';
    o.age = 0;

    o.art.position.y = 0;

    o.cork.position.y = .73;
    o.cork.rotation.set(0, 0, 0);

    if (o.paper) {
      o.paper.position.y = -.04;
    }
  }

  // ====================================
  // 十五、收藏與移除
  // ====================================

  function disposeBottle(o) {
    o.taken = true;

    sc.remove(o.root);

    const i = bottleHits.indexOf(o.hit);

    if (i >= 0) {
      bottleHits.splice(i, 1);
    }

    const disposed = new Set();

    o.root.traverse(m => {

      if (
        m.geometry &&
        !disposed.has(m.geometry)
      ) {
        disposed.add(m.geometry);
        m.geometry.dispose();
      }

      const materials = m.material
        ? (
            Array.isArray(m.material)
              ? m.material
              : [m.material]
          )
        : [];

      for (const mat of materials) {
        if (!disposed.has(mat)) {
          disposed.add(mat);
          mat.dispose();
        }
      }
    });
  }

  function collect(o) {
    const ok = cabin.collectDriftBottle({
      id: o.id,
      kind: o.kind,
      text: o.kind === 'letter'
        ? o.text
        : '',
      sender: o.sender || ''
    });

    if (!ok) {
      notify(
        '收藏失敗，請檢查背包或瀏覽器儲存權限。'
      );
      return false;
    }

    disposeBottle(o);

    notify(
      o.kind === 'letter'
        ? '信件與空瓶已收進防水背包。'
        : '空瓶已收進防水背包。'
    );

    return true;
  }

  // ====================================
  // 十六、2D 信紙閱讀介面
  // ====================================

  const reader =
    document.createElement('section');

  reader.id = 'vbLetterReader';
  reader.hidden = true;

  reader.setAttribute(
    'role',
    'dialog'
  );

  reader.setAttribute(
    'aria-label',
    '閱讀漂流瓶信件'
  );

  reader.innerHTML = `
    <div class="sheet-wrap">
      <article class="sheet">
        <div class="sender"></div>
        <div class="message"></div>
      </article>

      <div class="buttons">
        <button type="button" data-cancel>
          暫時收起
        </button>

        <button type="button" data-collect>
          收進防水背包
        </button>
      </div>
    </div>
  `;

  document.body.append(reader);

  let reading = null;

  function showLetter(o) {
    o.mode = 'reading';
    reading = o;

    reader.querySelector(
      '.sender'
    ).textContent =
      o.sender ||
      '一封從海上漂來的信';

    reader.querySelector(
      '.message'
    ).textContent = o.text;

    reader.hidden = false;

    reader.classList.remove('open');

    void reader.offsetWidth;

    reader.classList.add('open');
  }

  function closeReader() {
    reader.classList.remove('open');
    reader.hidden = true;

    if (
      reading &&
      !reading.taken
    ) {
      resetBottle(reading);
    }

    reading = null;
  }

  reader.querySelector(
    '[data-cancel]'
  ).addEventListener(
    'click',
    closeReader
  );

  reader.querySelector(
    '[data-collect]'
  ).addEventListener('click', () => {

    if (
      reading &&
      collect(reading)
    ) {
      reading = null;
      reader.hidden = true;
      reader.classList.remove('open');
    }

  });

  // ====================================
  // 十七、獨立滑鼠點擊偵測
  // ====================================

  // 避免原本整艘船的點擊區
  // 蓋住背包及漂流瓶。

  const raycast = new T3.Raycaster();
  const xy = new T3.Vector2();
  const canvas = cv;

  function pickStage3(e) {

    if (
      !access.isSailing() ||
      !reader.hidden ||
      cabin.isOpen?.()
    ) return null;

    const rect =
      canvas.getBoundingClientRect();

    xy.set(
      (e.clientX - rect.left) /
        rect.width * 2 - 1,

      -(
        (e.clientY - rect.top) /
        rect.height * 2 - 1
      )
    );

    cam.updateMatrixWorld(true);

    raycast.setFromCamera(xy, cam);

    const candidates = objectHits
      .filter(
        m =>
          m.parent?.parent?.visible !== false
      )
      .concat(
        bottleHits.filter(
          m => m.parent?.visible !== false
        )
      );

    const intersections =
      raycast.intersectObjects(
        candidates,
        false
      );

    for (const hit of intersections) {
      const obj = hit.object;

      if (
        typeof obj.userData.act === 'function'
      ) {
        return obj;
      }
    }

    return null;
  }

  let tap = null;

  // ====================================
  // 十八、滑鼠按下
  // ====================================

  canvas.addEventListener(
    'pointerdown',
    e => {

      if (
        !access.isSailing() ||
        !reader.hidden
      ) return;

      const selection = pickStage3(e);

      tap = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        selection
      };

      // 防止原本點擊到船身而離船
      e.stopImmediatePropagation();
      e.preventDefault();

    },
    true
  );

  // ====================================
  // 十九、滑鼠放開
  // ====================================

  canvas.addEventListener(
    'pointerup',
    e => {

      if (
        !access.isSailing() ||
        !reader.hidden
      ) return;

      const t = tap;
      tap = null;

      e.stopImmediatePropagation();
      e.preventDefault();

      if (
        !t ||
        t.id !== e.pointerId
      ) return;

      // 拖曳不算點擊
      if (
        Math.hypot(
          e.clientX - t.x,
          e.clientY - t.y
        ) > 8
      ) return;

      // 必須仍然指向同一個物件
      const up = pickStage3(e);

      if (
        up &&
        up === t.selection
      ) {
        up.userData.act();
      }

    },
    true
  );

  canvas.addEventListener(
    'pointercancel',
    e => {

      if (!access.isSailing()) return;

      tap = null;

      e.stopImmediatePropagation();

    },
    true
  );

  canvas.addEventListener(
    'pointermove',
    e => {

      if (
        !access.isSailing() ||
        !reader.hidden
      ) return;

      canvas.style.cursor =
        pickStage3(e)
          ? 'pointer'
          : 'default';

      e.stopImmediatePropagation();

    },
    true
  );

  // ====================================
  // 二十、防止雙擊離船
  // ====================================

  document.addEventListener(
    'dblclick',
    e => {

      if (
        access.isSailing() &&
        e.target === canvas
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }

    },
    true
  );

  const oldBoatAction =
    boat.root.userData.act;

  boat.root.userData.act = () => {

    if (access.isSailing()) return;

    oldBoatAction?.();

  };

  // ====================================
  // 二十一、鍵盤控制
  // ====================================

  window.addEventListener(
    'keydown',
    e => {

      // 閱讀時 Escape 先關閉信紙
      if (!reader.hidden) {

        if (e.key === 'Escape') {
          closeReader();
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }

        if ([
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Space',
          'ShiftLeft',
          'ShiftRight'
        ].includes(e.code)) {

          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }

      // E：畫面中央對準物件互動
      if (
        !access.isSailing() ||
        !reader.hidden ||
        cabin.isOpen?.() ||
        e.repeat ||
        e.code !== 'KeyE' ||
        ['INPUT', 'TEXTAREA'].includes(
          document.activeElement?.tagName
        )
      ) return;

      const centered = {
        clientX: innerWidth / 2,
        clientY: innerHeight / 2
      };

      const selected =
        pickStage3(centered);

      if (selected) {

        selected.userData.act();

        e.preventDefault();
        e.stopImmediatePropagation();

      }

    },
    true
  );

  // ====================================
  // 二十二、漂流瓶動畫
  // ====================================

  function updateBottles(dt) {

    const available =
      boat.unlocked &&
      !boat.arrival &&
      !boat.pending;

    const t =
      performance.now() * .001;

    for (const o of bottles) {

      if (o.taken) continue;

      o.root.visible = available;

      if (!available) continue;

      // 海面上下浮動
      o.root.position.y =
        .22 +
        Math.sin(
          t * 1.5 +
          o.index * 2.1
        ) * .038;

      // 緩慢旋轉
      o.root.rotation.y += dt * .10;

      o.root.rotation.z =
        Math.sin(
          t * 1.2 +
          o.index
        ) * .045;

      // 拾取動畫
      if (o.mode === 'opening') {
        if (!access.isSailing() || cabin.isOpen()) {
          resetBottle(o);
          continue;
        }

        o.age += dt;

        const pop = ease(
          o.age / .75
        );

        const pull = ease(
          (o.age - .5) / 1.05
        );

        // 瓶子浮起
        o.art.position.y =
          .13 * pop;

        // 瓶塞打開
        o.cork.position.y =
          .73 + 1.05 * pop;

        o.cork.rotation.z =
          pop * 2.8;

        // 信紙抽出
        if (o.paper) {
          o.paper.position.y =
            -.04 + 1.18 * pull;
        }

        if (o.age >= 1.8) {

          if (o.kind === 'letter') {

            showLetter(o);

          } else {

            if (!collect(o)) {
              resetBottle(o);
            }

          }
        }

      } else if (o.mode === 'idle') {

        const close =
          access.isSailing() &&
          distance(o) < TAKE_DISTANCE;

        // 靠近時玻璃微微變亮
        o.glass.opacity =
          close ? .59 : .48;

      }
    }
  }

  // 使用原本動畫循環
  window.vbDriftStep = updateBottles;

  // ====================================
  // 二十三、更新海岸及船上物件
  // ====================================

  const previousWorldStep =
    window.worldItemsStep;

  if (
    typeof previousWorldStep === 'function'
  ) {

    window.worldItemsStep = dt => {

      const prevX = boat.x;
      const prevZ = boat.z;

      previousWorldStep(dt);

      updateTerrain();

      // 隱藏舊船艙模型
      for (const o of legacyProps) {
        o.visible = false;
      }

      // 小帆船解鎖後顯示船上物件
      props.visible =
        boat.unlocked &&
        !boat.pending &&
        !boat.arrival;

      // 航行不得穿越沙岸或岩石
      if (
        access.isSailing() &&
        !boat.arrival
      ) {

        const inside =
          boat.x < COAST.begin - .5 &&
          Math.abs(
            boat.z - coastCenter(boat.x)
          ) < halfWidth(boat.x) - 1;

        const rock =
          rockCoords.some(
            ([x, z, r]) =>
              Math.hypot(
                boat.x - x,
                boat.z - z
              ) < r + 1.05
          );

        if (
          !inside ||
          rock
        ) {

          boat.x = prevX;
          boat.z = prevZ;

          boat.root.position.x = prevX;
          boat.root.position.z = prevZ;

          access.stop?.();

        }
      }
    };
  }

  updateTerrain();

  // ====================================
  // 二十四、公開接口
  // ====================================

  window.VBDriftBottles = {

    visibleBottleCount: () =>
      bottles.filter(
        o => !o.taken
      ).length,

    activeBottleCount: () =>
      bottles.filter(
        o => !o.taken &&
        o.root.visible
      ).length,

    terrainProgress,

    isReading: () =>
      !reader.hidden,

    takeNearest: () => {

      const o = bottles
        .filter(
          x => !x.taken &&
          x.mode === 'idle'
        )
        .sort(
          (a, b) =>
            distance(a) - distance(b)
        )[0];

      return o
        ? beginPickup(o)
        : false;
    }
  };

  console.info(
    '[VB Stage 3] 海岸、船艙點擊與漂流瓶就緒'
  );

})();
