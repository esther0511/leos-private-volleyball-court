
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

  // 灣底是一段半橢圓，兩岸在同一個端點平滑接合。
  const bendX = COAST.begin - 8;
  const inletRadius = 7;
  const capSegments = 24;
  const bankSegments = 176;
  const coastEnd = -154;

  function halfWidth(x) {
    if (x > bendX) {
      const u = Math.min(1, (x - bendX) / 8);
      return inletRadius * Math.sqrt(1 - u * u);
    }
    return inletRadius + 2.2 * ease((bendX - x) / 28) + Math.max(0, -x - 55) * ease((-x - 55) / 75) * .95;
  }

  function sampleX(i) {
    if (i <= capSegments) return bendX + 8 * Math.cos(i / capSegments * Math.PI / 2);
    if (i <= bankSegments) return bendX + (coastEnd - bendX) * (i - capSegments) / (bankSegments - capSegments);
    return coastEnd - (i - bankSegments) * 2;
  }

  function shoreZ(x, side) {
    return coastCenter(x) + side * halfWidth(x);
  }

  function stripGeometry(count, section) {
    const vertices = [];
    const indices = [];
    for (let i = 0; i <= count; i++) {
      vertices.push(...section(sampleX(i), i));
      if (i < count) {
        const k = i * 2;
        indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
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
    stripGeometry(bankSegments + Math.ceil((coastEnd - COAST.far) / 2), x => [
      x, .045, shoreZ(x, -1), x, .045, shoreZ(x, 1)
    ]),
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

function makeShore(side, wet) {
  const divisions = bankSegments;
  const geo = stripGeometry(divisions, (x, i) => {
    const z = shoreZ(x, side);
    // 沿岸線法向量向外推，同一個岸點的濕沙和乾沙共用邊界。
    let nx = 1, nz = 0;
    if (i > 0) {
      const before = sampleX(i - 1), after = sampleX(i + 1);
      const dx = after - before;
      const dz = shoreZ(after, side) - shoreZ(before, side);
      const length = Math.hypot(dx, dz);
      nx = side * dz / length;
      nz = -side * dx / length;
    }
    const dune = 5.6 + .9 * Math.sin((COAST.begin - x) * .12);
    const inner = wet ? 0 : 1.5;
    const outer = wet ? 1.5 : dune;
    const height = wet ? .068 : .061;
    return [x + nx * inner, height, z + nz * inner,
            x + nx * outer, height, z + nz * outer];
  });

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

  const bagArt = new T3.Group();
  bagArt.rotation.y = 2.1;
  bag.add(bagArt);

  // 橢圓形袋底，袋口收窄成一道摺邊；左右兩端比中央高。
  const sections = [
    // 高度、半寬、半深、袋口兩側隆起
    [0, .147, .103, 0], [.025, .179, .128, 0],
    [.09, .19, .14, 0], [.29, .18, .135, 0],
    [.42, .174, .104, .029], [.471, .169, .042, .056],
    [.489, .157, .025, .06]
  ];
  const sides = 16;
  const fabric = [], triangles = [];
  sections.forEach(([height, width, depth, rise], ring) => {
    for (let j = 0; j < sides; j++) {
      const angle = 2 * Math.PI * j / sides;
      const x = Math.cos(angle), z = Math.sin(angle);
      fabric.push(width * x, height + rise * x * x,
        depth * z * (1 + .045 * Math.sin(3 * angle + ring * .55)));
      if (!ring) continue;
      const a = (ring - 1) * sides + j;
      const b = (ring - 1) * sides + (j + 1) % sides;
      triangles.push(a, a + sides, b, b, a + sides, b + sides);
    }
  });
  const rim = (sections.length - 1) * sides;
  for (let j = 1; j < sides - 1; j++) {
    triangles.push(0, j, j + 1, rim, rim + j + 1, rim + j);
  }
  const shell = new T3.BufferGeometry();
  shell.setAttribute('position', new T3.Float32BufferAttribute(fabric, 3));
  shell.setIndex(triangles);
  shell.computeVertexNormals();
  part(bagArt, shell, 0x486785, [0, 0, 0]);

  // 沿曲線擠出扁平織帶。截面隨曲線轉向，從側面也看得到厚度。
  function webbing(points, width, thickness, across, color) {
    const curve = new T3.CatmullRomCurve3(points.map(p => new T3.Vector3(...p)));
    const axis = new T3.Vector3(...across);
    const vertices = [], indices = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, center = curve.getPoint(t);
      const normal = curve.getTangent(t).cross(axis).normalize();
      for (const [w, h] of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
        vertices.push(...center.clone().addScaledVector(axis, w * width / 2)
          .addScaledVector(normal, h * thickness / 2).toArray());
      }
      if (!i) continue;
      for (let k = 0; k < 4; k++) {
        const a = (i - 1) * 4 + k, b = (i - 1) * 4 + (k + 1) % 4;
        indices.push(a, b, a + 4, b, b + 4, a + 4);
      }
    }
    const geo = new T3.BufferGeometry();
    geo.setAttribute('position', new T3.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    part(bagArt, geo, color, [0, 0, 0]);
  }

  for (const side of [-1, 1]) {
    // 捲口兩端向中間扣合，提把下方鏤空。
    webbing([[side*.154,.52,0], [side*.138,.566,0],
      [side*.079,.608,0], [side*.018,.62,0]], .052,.021,[0,0,1],0x567e99);
    // 雙肩帶向袋背拱起，底端縫回袋身。
    const x = side * .083;
    webbing([[x,.453,-.058],[x,.419,-.143],[x,.31,-.189],
      [x,.15,-.17],[x,.071,-.106]], .041,.013,[1,0,0],0x2c465e);
  }
  part(bagArt,new T3.BoxGeometry(.074,.028,.059),0x263749,[0,.618,0]);
  // 六個固定袢撐出兩層交叉繩，中央凸起貼合圓弧袋面。
  const cordColor = 0x8cd6e6;
  const tabColor = 0x263749;
  const left = -.127, right = .127;
  const top = .367, middle = .263, bottom = .159;
  function elastic(points, radius = .005) {
    const curve = new T3.CatmullRomCurve3(points.map(p => new T3.Vector3(...p)));
    part(bagArt, new T3.TubeGeometry(curve, points.length * 4, radius, 6, false),
      cordColor, [0, 0, 0]);
  }

  for (const x of [left, right]) {
    for (const [y, z] of [[top,.094], [middle,.103], [bottom,.108]]) {
      const tab = part(bagArt, new T3.BoxGeometry(.014,.027,.017), tabColor, [x,y,z]);
      tab.rotation.y = Math.sign(x) * .55;
    }
  }
  // 一條繩從底部繩扣穿上去，繞過上緣，再沿另一側穿回繩扣。
  elastic([[0,.14,.149], [left*.64,.147,.135], [left,bottom,.113],
    [0,.211,.151], [right,middle,.108], [0,.315,.142], [left,top,.100],
    [0,.358,.132], [right,top,.100], [0,.315,.153], [left,middle,.108],
    [0,.211,.162], [right,bottom,.113], [right*.64,.147,.135], [0,.14,.149]]);
  const lock = part(bagArt, new T3.CylinderGeometry(.014,.015,.031,8),
    tabColor, [0,.136,.154]);
  lock.rotation.z = -.34;
  elastic([[-.004,.13,.154], [.002,.101,.156], [.009,.067,.15],
    [.01,.051,.148], [.005,.034,.145]], .0037);
  elastic([[.004,.13,.154], [.014,.096,.154], [.015,.07,.15],
    [.01,.051,.148], [.024,.036,.145]], .0037);
  part(bagArt, new T3.SphereGeometry(.007,7,5), cordColor, [.01,.051,.148]);

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
    .21, .727, -.83
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
    #vbDriftPickupHint {
      position: fixed;
      right: calc(16px + env(safe-area-inset-right, 0px));
      bottom: calc(20px + env(safe-area-inset-bottom, 0px));
      color: white;
      font-size: 14px;
      line-height: 1.5;
      text-shadow: 0 1px 3px #24334b, 0 0 4px #24334b;
      pointer-events: none;
      user-select: none;
    }
    html.vb-sticks-enabled #vbDriftPickupHint {
      bottom: calc(116px + env(safe-area-inset-bottom, 0px));
    }
    html.vb-hide-tips #vbDriftPickupHint, #vbDriftPickupHint[hidden], #vbLetterReader[hidden] {
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

  const pickupHint = document.createElement('span');
  pickupHint.id = 'vbDriftPickupHint';
  pickupHint.textContent = '點一下漂流瓶，就能撿起來';
  pickupHint.hidden = true;
  document.querySelector('#vbBoatCtrl').append(pickupHint);


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
  // 發出的位置和紙條與背包共用同一筆存檔，重開後可在原處找到。
  function addReleased(message, animate) {
    const bottle = makeBottle({ ...message, kind: 'letter', sender: '自己寫的紙條' }, bottles.length);
    bottles.push(bottle);
    if (animate) {
      bottle.mode = 'throwing';
      bottle.from = boat.root.position.clone();
      bottle.root.position.copy(bottle.from);
      bottle.root.visible = true;
    }
  }

  for (const message of state().afloat) addReleased(message, false);

  function releaseBottle(id) {
    if (!access.isSailing() || !reader.hidden) return false;
    const direction = cam.getWorldDirection(new T3.Vector3());
    const heading = Math.atan2(direction.z, direction.x);
    // 優先向畫面前方投出，靠岸時改取旁邊的水面。
    for (const offset of [.34, -.34, .9, -.9, 1.6, -1.6, Math.PI]) {
      const x = boat.x + 3.8 * Math.cos(heading + offset);
      const z = boat.z + 3.8 * Math.sin(heading + offset);
      if (x >= COAST.begin - .5 || x < COAST.far + 1 ||
          Math.abs(z - coastCenter(x)) >= halfWidth(x) - .45 ||
          rockCoords.some(([rx, rz, r]) => Math.hypot(x-rx, z-rz) < r + .6)) continue;
      const message = cabin.launchMessage(id, x, z);
      if (!message) return false;
      cabin.hide();
      access.pauseControls();
      addReleased(message, true);
      notify('漂流瓶落在海面上了。');
      return true;
    }
    return false;
  }

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

    access.pauseControls?.();
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

      if (!e.isPrimary || e.button !== 0) return;
      const panelWasOpen = cabin.isOpen();
      const selection = panelWasOpen ? null : pickStage3(e);
      canvas.setPointerCapture(e.pointerId);

      tap = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        lastX: e.clientX, lastY: e.clientY, dragged: false,
        selection, panelWasOpen
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
      if (!t || t.id !== e.pointerId) return;
      tap = null;

      e.stopImmediatePropagation();
      e.preventDefault();

      if (t.dragged) return;

      // 拖曳不算點擊
      if (
        Math.hypot(
          e.clientX - t.x,
          e.clientY - t.y
        ) > 8
      ) return;

      // 必須仍然指向同一個物件
      if (t.panelWasOpen) { cabin.hide(); return; }
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

      if (tap?.id === e.pointerId) {
        tap.dragged ||= Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 8;
        if (tap.dragged) {
          access.lookAround(e.clientX - tap.lastX, e.clientY - tap.lastY);
          tap.lastX = e.clientX; tap.lastY = e.clientY;
        }
      }
      canvas.style.cursor = tap?.dragged ? 'grabbing' :
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

    let hasNearbyBottle = false;
    let opening = false;
    for (const o of bottles) {

      if (o.taken) continue;

      o.root.visible = available;

      if (!available) continue;

      if (o.mode === 'throwing') {
        o.age += dt;
        const t = Math.min(1, o.age / .95);
        o.root.position.set(o.from.x + (o.x - o.from.x) * t,
          .22 + (1-t) * .95 + Math.sin(Math.PI*t) * 1.25,
          o.from.z + (o.z - o.from.z) * t);
        o.root.rotation.z = (1 - t) * Math.PI;
        if (t === 1) o.mode = 'idle';
        continue;
      }

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
        opening = true;
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

        if (close) hasNearbyBottle = true;
        // 靠近時玻璃微微變亮
        o.glass.opacity =
          close ? .59 : .48;

      }
    }
    pickupHint.hidden = !hasNearbyBottle || opening || !reader.hidden || cabin.isOpen();
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
    releaseBottle,

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
