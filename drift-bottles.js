
/*
 * 排球場｜第三階段整合模組
 * 2026.11
 *
 * 功能：
 * 1. 草地、沙岸、濕沙逐日演變
 * 2. 12/24 開放不規則海灣
 * 3. 岩石與小帆船停靠
 * 4. 調整船上鏡頭與離船操作
 * 5. 3D 防水背包、信封、航海日誌
 * 6. 滑鼠直接點擊漂流瓶
 * 7. 抽出信紙與攤開閱讀
 * 8. 收藏沿用 vb-boat-cabin-v1
 *
 * 載入位置：
 * world-items.js
 * boat-cabin.js
 * drift-bottles.js
 * roam-controls.js
 * weather-system.js
 */

(() => {
  'use strict';

  if (window.VBDriftBottles) return;

  const access = window.VBBoatAccess;
  const cabin = window.VBBoatCabin;

  if (
    !access?.getObject?.() ||
    !cabin?.getState ||
    typeof T3 === 'undefined' ||
    typeof sc === 'undefined' ||
    typeof hitList === 'undefined'
  ) {
    console.error('[VB Stage 3] 必要接口尚未載入');
    return;
  }

  const boat = access.getObject();
  const DEV =
    typeof VB_IS_DEV !== 'undefined' &&
    VB_IS_DEV;

  const PI2 = Math.PI * 2;
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => {
    x = clamp(x);
    return x * x * (3 - 2 * x);
  };

  const notify = text => {
    if (typeof popText === 'function') {
      popText(text);
    }
  };

  // ========================================
  // A. 基礎樣式
  // ========================================

  const style = document.createElement('style');

  style.textContent = `
    /* 取消原本右上角的獨立背包按鈕 */
    #vbBagButton {
      display: none !important;
    }

    #vbRoamUiMenu button[hidden] {
      display: none !important;
    }

    /* 信紙閱讀介面 */
    #vbLetterReader {
      position: fixed;
      inset: 0;
      z-index: 40;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(12, 25, 47, .60);
      backdrop-filter: blur(7px);
      -webkit-backdrop-filter: blur(7px);
    }

    #vbLetterReader[hidden] {
      display: none !important;
    }

    #vbLetterReader .reader-inner {
      width: min(540px, 94vw);
      max-height: 90dvh;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    #vbLetterReader .reader-paper {
      position: relative;
      overflow-y: auto;
      min-height: 180px;
      max-height: 69dvh;
      padding: 38px 34px;
      background: #f7edda;
      color: #293850;
      border-radius: 5px;
      box-shadow:
        inset 0 0 30px rgba(172,139,87,.10),
        0 18px 45px rgba(0,0,0,.30);
      transform: scaleX(.12) rotate(-4deg);
      opacity: .35;
      transform-origin: center;
      transition:
        transform .85s cubic-bezier(.19,1,.22,1),
        opacity .55s ease;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font: 16px/1.95
        "PingFang TC",
        "Noto Serif TC",
        serif;
      user-select: text;
      -webkit-user-select: text;
    }

    #vbLetterReader.show .reader-paper {
      transform: scaleX(1) rotate(0);
      opacity: 1;
    }

    #vbLetterReader .reader-sender {
      margin-bottom: 20px;
      font-size: 13px;
      opacity: .7;
    }

    #vbLetterReader .reader-actions {
      display: flex;
      justify-content: flex-end;
      gap: 9px;
    }

    #vbLetterReader button {
      padding: 11px 17px;
      border: 1px solid rgba(255,255,255,.5);
      border-radius: 10px;
      background: rgba(29,42,80,.85);
      color: white;
      font: 600 13px
        system-ui,"PingFang TC",sans-serif;
      cursor: pointer;
    }

    #vbLetterReader button:hover {
      background: #355c97;
    }

    @media(max-width:560px) {
      #vbLetterReader {
        padding: 12px;
      }

      #vbLetterReader .reader-paper {
        padding: 26px 23px;
        font-size: 15px;
      }
    }

    @media(prefers-reduced-motion:reduce) {
      #vbLetterReader .reader-paper {
        transition-duration: .01s;
      }
    }
  `;

  document.head.append(style);

  // 移除舊版右下角拾取按鈕
  document.querySelector('#vbDriftPickup')?.remove();

  // ========================================
  // B. 地形演變
  // ========================================

  const SHORE = {
    x: -28,
    centerZ: 14,
    farX: -450,
    progress: 0
  };

  function coastCenter(x) {
    return SHORE.centerZ +
      Math.sin((x + 40) * .04) * 2.2;
  }

  // 靠岸時窄，越往遠海越寬
  function coastHalfWidth(x) {
    const neck = ease((-x - 27) / 23);
    const open = ease((-x - 72) / 145);

    return .2 + neck * 15 + open * 450;
  }

  // ========================================
  // C. 建立不規則海面
  // ========================================

  function buildSeaGeometry() {
    const positions = [];
    const indices = [];
    const segments = 160;

    for (let i = 0; i <= segments; i++) {
      const x =
        SHORE.farX +
        (SHORE.x - SHORE.farX) *
        i / segments;

      const center = coastCenter(x);
      const half = coastHalfWidth(x);

      positions.push(
        x, .048, center - half,
        x, .048, center + half
      );

      if (i < segments) {
        const a = i * 2;

        indices.push(
          a, a + 1, a + 2,
          a + 1, a + 3, a + 2
        );
      }
    }

    const geometry = new T3.BufferGeometry();

    geometry.setAttribute(
      'position',
      new T3.Float32BufferAttribute(
        positions, 3
      )
    );

    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  const sea = new T3.Mesh(
    buildSeaGeometry(),
    new T3.MeshBasicMaterial({
      color: 0x70b8c5,
      transparent: true,
      opacity: .88,
      depthWrite: false,
      side: T3.DoubleSide,
      fog: true
    })
  );

  sea.visible = false;
  sea.frustumCulled = false;
  sc.add(sea);

  // 找出舊版矩形水面，稍後隱藏。
  // 不刪除原模型，避免影響其他引用。
  const legacyWater = sc.children.find(o =>
    o !== sea &&
    o.isMesh &&
    o.geometry?.type === 'PlaneGeometry' &&
    o.geometry.parameters?.width >= 500 &&
    o.position.x < -100 &&
    Math.abs(o.rotation.x + Math.PI / 2) < .02
  );

  // ========================================
  // D. 沙岸與濕沙
  // ========================================

  function makeShoreBand(side, offset, width, color) {
    const positions = [];
    const indices = [];
    const segments = 88;

    for (let i = 0; i <= segments; i++) {
      const x = -28 - i * 132 / segments;
      const center = coastCenter(x);
      const half = coastHalfWidth(x);

      const z0 =
        center + side * (half + offset);

      const z1 =
        z0 + side * width;

      positions.push(
        x, .064, z0,
        x, .064, z1
      );

      if (i < segments) {
        const a = i * 2;

        indices.push(
          a, a + 1, a + 2,
          a + 1, a + 3, a + 2
        );
      }
    }

    const geo = new T3.BufferGeometry();

    geo.setAttribute(
      'position',
      new T3.Float32BufferAttribute(
        positions, 3
      )
    );

    geo.setIndex(indices);

    const mesh = new T3.Mesh(
      geo,
      new T3.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: T3.DoubleSide
      })
    );

    mesh.visible = false;
    mesh.frustumCulled = false;
    sc.add(mesh);

    return { mesh, segments };
  }

  const sandBands = [
    makeShoreBand(1, .2, 7.5, 0xe9d7ad),
    makeShoreBand(-1, .2, 7.5, 0xe9d7ad)
  ];

  const wetBands = [
    makeShoreBand(1, .1, 2, 0xb7ac96),
    makeShoreBand(-1, .1, 2, 0xb7ac96)
  ];

  // 海灣最內側的一小片沙地
  const beachCap = new T3.Mesh(
    new T3.CircleGeometry(1, 48),
    new T3.MeshBasicMaterial({
      color: 0xe9d7ad,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: T3.DoubleSide
    })
  );

  beachCap.rotation.x = -Math.PI / 2;
  beachCap.position.set(-26.8, .063, 14);
  beachCap.scale.set(5, 11, 1);
  beachCap.visible = false;
  sc.add(beachCap);

  // ========================================
  // E. 小帆船停靠岩石
  // ========================================

  const rocks = new T3.Group();

  const rockPositions = [
    [-38.3, 11.75, .70],
    [-37.15, 11.45, .46],
    [-39.35, 11.25, .34]
  ];

  for (const [x, z, radius] of rockPositions) {
    const rock = new T3.Mesh(
      new T3.DodecahedronGeometry(radius, 0),
      new T3.MeshLambertMaterial({
        color: 0x87918f,
        flatShading: true
      })
    );

    rock.position.set(x, .13, z);
    rock.scale.set(1.2, .65, .9);

    rocks.add(rock);
  }

  rocks.visible = false;
  sc.add(rocks);

  // 遠海方向原有的山丘，
  // 在海洋出現時隱藏，避免像湖泊。
  const distantHills = sc.children.filter(o =>
    o.isMesh &&
    o.geometry?.type === 'ConeGeometry' &&
    o.position.x < -40 &&
    Math.hypot(o.position.x, o.position.z) > 75
  );

  // ========================================
  // F. 依日期計算地形形成程度
  // ========================================

  function firstVisitDate() {
    try {
      const raw =
        typeof vbStore !== 'undefined'
          ? vbStore.getItem('vb-visit-dates')
          : null;

      const dates = JSON.parse(raw || '[]');

      if (Array.isArray(dates)) {
        const valid = dates
          .filter(x =>
            typeof x === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(x)
          )
          .sort();

        if (valid.length) return valid[0];
      }
    } catch (_) {}

    const now = new Date();

    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2,'0'),
      String(now.getDate()).padStart(2,'0')
    ].join('-');
  }

  const firstDate = firstVisitDate();

  function terrainProgress() {
    if (DEV) {
      const day =
        typeof VB_DEV_STATE !== 'undefined'
          ? Number(VB_DEV_STATE.visitDay || 1)
          : 1;

      return clamp((day - 1) / 29);
    }

    const start =
      new Date(firstDate + 'T00:00:00').getTime();

    const finish =
      new Date(2026, 11, 24).getTime();

    const now = Date.now();

    if (now >= finish) return 1;
    if (start >= finish) return 0;

    return clamp(
      (now - start) / (finish - start)
    );
  }

  // 球場原本的藍色地面改為草地色。
  // 不改變球場、樹木或其他物件位置。
  if (typeof ground !== 'undefined') {
    ground.material.color.setHex(0x84b6a0);
  }

  function updateTerrain() {
    const p = terrainProgress();
    SHORE.progress = p;

    // 25% 左右開始出現沙岸
    const sand = ease((p - .18) / .52);

    // 後期才出現濕沙
    const wet = ease((p - .68) / .25);

    // 沙岸由靠近球場的區域向遠方延伸
    const length = ease((p - .15) / .72);

    for (const item of sandBands) {
      item.mesh.visible = sand > .001;

      item.mesh.material.opacity =
        sand * .92;

      item.mesh.geometry.setDrawRange(
        0,
        Math.max(
          1,
          Math.floor(item.segments * length)
        ) * 6
      );
    }

    for (const item of wetBands) {
      item.mesh.visible = wet > .001;

      item.mesh.material.opacity =
        wet * .45;

      item.mesh.geometry.setDrawRange(
        0,
        Math.max(
          1,
          Math.floor(item.segments * length)
        ) * 6
      );
    }

    beachCap.visible = sand > .001;
    beachCap.material.opacity = sand * .92;

    // 正式海洋與小帆船同一天出現
    const ocean = !!boat.unlocked;

    sea.visible = ocean;
    rocks.visible = ocean;

    if (legacyWater) {
      legacyWater.visible = false;
    }

    for (const hill of distantHills) {
      hill.visible = !ocean;
    }

    // 小帆船靠岸最後一刻碰上岩石，
    // 船身短暫輕微晃動。
    if (boat.arrival?.kind === 'wind') {
      const a = boat.arrival;
      const k = clamp(
        (a.t / a.d - .89) / .11
      );

      if (k > 0 && k < 1) {
        const bump =
          Math.sin(k * Math.PI * 3) *
          (1 - k);

        boat.art.rotation.z += bump * .075;
        boat.art.rotation.x += bump * .025;
      }
    }
  }

  // ========================================
  // G. 讓玩家從發球機左側觀看登場
  // ========================================

  let placedForArrival = false;

  function positionNearMachine() {
    if (
      typeof tgtP === 'undefined' ||
      typeof ct === 'undefined'
    ) return;

    // 發球機預設座標約 (-14.5, -4)
    // 玩家放在左側數個單位的位置
    tgtP.set(-17.8, 1, -4);

    ct.th = 1.25;
    ct.ph = 1.16;
    ct.d = 32;
    ct.tilt = 0;

    placedForArrival = true;
  }

  // 開發模式切換第 30 天時，
  // 不再把玩家移到海面中央。
  if (typeof window.setWorldPreviewDay === 'function') {
    const oldPreview = window.setWorldPreviewDay;

    window.setWorldPreviewDay = day => {
      oldPreview(day);

      if (DEV && Number(day) === 30) {
        positionNearMachine();
      }
    };
  }

  // ========================================
  // H. 防止點擊船身意外離船
  // ========================================

  const originalBoatAction =
    boat.root.userData.act;

  boat.root.userData.act = () => {
    if (access.isSailing()) return;

    if (typeof originalBoatAction === 'function') {
      originalBoatAction();
    }
  };

  // 阻止帆船模式下雙擊畫布離船。
  // 裁判椅原本的雙擊返回不受影響。
  document.addEventListener(
    'dblclick',
    e => {
      if (
        access.isSailing() &&
        e.target === document.querySelector('#c')
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true
  );

  // ========================================
  // I. 船上的 3D 物件
  // ========================================

  const cabinProps = new T3.Group();
  cabinProps.userData.vbStage3 = true;
  boat.art.add(cabinProps);

  function box(parent, x,y,z, w,h,d, color) {
    const mesh = new T3.Mesh(
      new T3.BoxGeometry(w,h,d),
      new T3.MeshLambertMaterial({color})
    );

    mesh.position.set(x,y,z);
    parent.add(mesh);

    return mesh;
  }

  function addClickArea(parent, w,h,d, y, fn) {
    const hit = new T3.Mesh(
      new T3.BoxGeometry(w,h,d),
      new T3.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );

    hit.position.y = y;
    hit.userData.act = fn;
    parent.add(hit);
  }

  function openCabinItem(kind) {
    if (!access.isSailing()) return;

    const state = cabin.getState();

    if (kind === 'bag') {
      if (state.bag) cabin.openBackpack?.();
      else cabin.show?.();

      return;
    }

    if (kind === 'letter') {
      if (!state.letter) {
        cabin.show?.();
      } else if (state.bag) {
        cabin.openBackpack?.();
      } else {
        cabin.show?.();
      }

      return;
    }

    if (kind === 'log') {
      if (!state.log || !state.bag) {
        cabin.show?.();
        return;
      }

      cabin.openBackpack?.();

      const journalTab = [
        ...document.querySelectorAll(
          '#vbBoatCabin [role="tab"]'
        )
      ].find(x => x.textContent === '日誌');

      journalTab?.click();
    }
  }

  // ===== 防水背包 =====

  const waterproofBag = new T3.Group();
  waterproofBag.position.set(.37,.66,.20);

  // 袋身
  box(
    waterproofBag,
    0,.23,0,
    .37,.44,.31,
    0x355c97
  );

  // 捲口
  box(
    waterproofBag,
    0,.49,0,
    .40,.12,.32,
    0x263653
  );

  // 防水扣帶
  box(
    waterproofBag,
    0,.39,.166,
    .055,.30,.025,
    0xe0a176
  );

  box(
    waterproofBag,
    0,.50,.185,
    .13,.055,.035,
    0xf2e6cc
  );

  // 背帶
  const strap = new T3.Mesh(
    new T3.TorusGeometry(
      .16,.024,6,18,Math.PI
    ),
    new T3.MeshLambertMaterial({
      color:0x263653
    })
  );

  strap.rotation.z = Math.PI;
  strap.position.y = .56;
  waterproofBag.add(strap);

  addClickArea(
    waterproofBag,
    .64,.85,.64,.35,
    () => openCabinItem('bag')
  );

  cabinProps.add(waterproofBag);

  // ===== 船上信封 =====

  const shipLetter = new T3.Group();
  shipLetter.position.set(-.36,.69,-.27);

  box(
    shipLetter,
    0,.02,0,
    .35,.035,.27,
    0xf7edda
  );

  box(
    shipLetter,
    0,.045,0,
    .10,.012,.06,
    0xc48b7e
  );

  addClickArea(
    shipLetter,
    .53,.40,.46,.17,
    () => openCabinItem('letter')
  );

  cabinProps.add(shipLetter);

  // ===== 航海日誌 =====

  const shipLog = new T3.Group();
  shipLog.position.set(-.11,.69,.39);

  box(
    shipLog,
    0,.02,0,
    .40,.07,.48,
    0x355c97
  );

  box(
    shipLog,
    .015,.063,0,
    .36,.015,.43,
    0x426d9a
  );

  box(
    shipLog,
    -.18,.04,0,
    .045,.08,.49,
    0xf2dfae
  );

  addClickArea(
    shipLog,
    .56,.38,.60,.15,
    () => openCabinItem('log')
  );

  cabinProps.add(shipLog);

  // 原第二階段的小型船艙物件，
  // 改由新模型呈現，避免疊成兩份。
  const originalProps = boat.art.children.filter(o => {
    if (!o.isGroup || o === cabinProps) return false;

    const p = o.position;

    return (
      Math.abs(p.y - .67) < .03 &&
      (
        Math.abs(p.x + .29) < .03 ||
        Math.abs(p.x - .27) < .03 ||
        Math.abs(p.x - .24) < .03
      )
    );
  });

  // ========================================
  // J. 左上角選單加入防水背包
  // ========================================

  function addBackpackMenu() {
    const menu =
      document.querySelector('#vbRoamUiMenu');

    const menuButton =
      document.querySelector('#vbRoamUiButton');

    if (!menu || !menuButton) return;

    if (menu.querySelector('[data-waterproof-bag]')) {
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.waterproofBag = '1';
    button.textContent = '防水背包';

    button.hidden = !cabin.getState().bag;

    button.addEventListener('click', () => {
      if (!cabin.getState().bag) return;

      cabin.openBackpack?.();

      menu.classList.remove('open');

      menuButton.setAttribute(
        'aria-expanded',
        'false'
      );
    });

    menu.append(button);

    menuButton.addEventListener('click', () => {
      button.hidden = !cabin.getState().bag;
    });
  }

  // roam-controls.js 在後面載入，
  // 所以等網頁載入完畢才加入選單。
  window.addEventListener(
    'load',
    addBackpackMenu,
    {once:true}
  );

  // ========================================
  // K. 調整船上攝影機
  // ========================================

  const cameraGuide = new T3.Object3D();

  function updateBoatCamera(dt) {
    if (!access.isSailing()) return;

    const heading = -boat.art.rotation.y;

    const sideX = Math.cos(heading);
    const sideZ = Math.sin(heading);

    const frontX = Math.sin(heading);
    const frontZ = -Math.cos(heading);

    // 攝影機偏向船的一側，
    // 避免桅杆和帆布擋住正中央。
    const desired = new T3.Vector3(
      boat.x + sideX * 2.0 - frontX * 2.2,
      2.5,
      boat.z + sideZ * 2.0 - frontZ * 2.2
    );

    const look = new T3.Vector3(
      boat.x + frontX * 3.3,
      1.0,
      boat.z + frontZ * 3.3
    );

    cam.position.lerp(
      desired,
      Math.min(1,dt * 7)
    );

    cameraGuide.position.copy(cam.position);
    cameraGuide.lookAt(look);

    cam.quaternion.slerp(
      cameraGuide.quaternion,
      Math.min(1,dt * 8)
    );
  }

  const oldCameraStep =
    window.worldSceneCameraStep;

  if (typeof oldCameraStep === 'function') {
    window.worldSceneCameraStep = dt => {
      oldCameraStep(dt);
      updateBoatCamera(dt);
    };
  }

  // ========================================
  // L. 舊世界更新後追加海岸更新
  // ========================================

  const oldWorldStep = window.worldItemsStep;

  if (typeof oldWorldStep === 'function') {
    window.worldItemsStep = dt => {
      const previousX = boat.x;
      const previousZ = boat.z;

      oldWorldStep(dt);

      // 正式版首次帆船登場前，
      // 將玩家放在發球機左側附近。
      if (
        !placedForArrival &&
        boat.unlocked &&
        (boat.pending || boat.arrival)
      ) {
        positionNearMachine();
      }

      updateTerrain();

      // 不讓帆船駛上岸邊草地、沙灘或岩石。
      if (
        access.isSailing() &&
        !boat.arrival
      ) {
        const x = boat.x;
        const z = boat.z;

        const withinWater =
          x < -29 &&
          Math.abs(z - coastCenter(x)) <
            coastHalfWidth(x) - 1.2;

        const hitsRock =
          Math.hypot(
            x + 38.3,
            z - 11.75
          ) < 1.6;

        if (!withinWater || hitsRock) {
          boat.x = previousX;
          boat.z = previousZ;

          boat.root.position.x = previousX;
          boat.root.position.z = previousZ;
        }
      }

      // 船上物件始終可見。
      for (const prop of originalProps) {
        prop.visible = false;
      }

      cabinProps.visible = !!boat.unlocked;
    };
  }

  updateTerrain();

  // ========================================
  // M. 信紙閱讀介面
  // ========================================

  const reader = document.createElement('section');

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
    <div class="reader-inner">
      <article class="reader-paper">
        <div class="reader-sender"></div>
        <div class="reader-text"></div>
      </article>

      <div class="reader-actions">
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

  const senderEl =
    reader.querySelector('.reader-sender');

  const letterTextEl =
    reader.querySelector('.reader-text');

  let readingBottle = null;

  // ========================================
  // N. 漂流瓶來源
  // ========================================

  // 正式故事尚未定稿，不擅自加入正文。
  // 之後才在這裡加入正式信件。
  const STORY_BOTTLES = [];

  const todayDate = new Date();

  const localDay = [
    todayDate.getFullYear(),
    String(todayDate.getMonth()+1).padStart(2,'0'),
    String(todayDate.getDate()).padStart(2,'0')
  ].join('-');

  const dayNumber = Math.floor(
    new Date(
      todayDate.getFullYear(),
      todayDate.getMonth(),
      todayDate.getDate()
    ).getTime() / 86400000
  );

  const source = STORY_BOTTLES
    .filter(o =>
      o &&
      typeof o.id === 'string' &&
      typeof o.text === 'string' &&
      o.text.trim() &&
      Number.isFinite(o.x) &&
      Number.isFinite(o.z)
    )
    .map(o => ({...o,kind:'letter'}));

  // 開發者模式測試信
  if (DEV) {
    source.push({
      id:'dev-test-letter',
      kind:'letter',
      x:-48,
      z:15,
      sender:'測試紙條',
      text:
        '這只是一封測試信。\n\n用來確認漂流瓶、信紙展開、閱讀與收藏功能。\n\n正式故事尚未加入。'
    });
  }

  // 偶爾出現的空瓶
  if (
    DEV ||
    localDay === '2026-12-24' ||
    dayNumber % 2 === 0
  ) {
    source.push({
      id:`empty-${localDay}-a`,
      kind:'empty',
      x:-53,
      z:20
    });
  }

  if (dayNumber % 5 === 0) {
    source.push({
      id:`empty-${localDay}-b`,
      kind:'empty',
      x:-84,
      z:-12
    });
  }

  const items = [];
  const TAKE_DISTANCE = 4.6;

  function distance(o) {
    return Math.hypot(
      boat.x-o.x,
      boat.z-o.z
    );
  }

  function alreadyCollected(id) {
    const state = cabin.getState();

    return (
      state.collectedBottleIds?.includes(id) ||
      state.bottles?.some(o=>o.id===id)
    );
  }

  // ========================================
  // O. 3D 漂流瓶
  // ========================================

  function makeDriftBottle(d,index) {
    const root = new T3.Group();
    root.position.set(d.x,.22,d.z);
    root.visible = false;

    const art = new T3.Group();
    art.rotation.z = Math.PI/2;
    root.add(art);

    const glass = new T3.MeshPhongMaterial({
      color:0xc9eef2,
      transparent:true,
      opacity:.48,
      shininess:95,
      depthWrite:false,
      side:T3.DoubleSide
    });

    const body = new T3.Mesh(
      new T3.CylinderGeometry(
        .2,.22,.79,16,1,true
      ),
      glass
    );
    art.add(body);

    const bottom = new T3.Mesh(
      new T3.CylinderGeometry(
        .22,.22,.035,16
      ),
      new T3.MeshLambertMaterial({
        color:0xa4e3e8,
        transparent:true,
        opacity:.62,
        depthWrite:false
      })
    );
    bottom.position.y=-.39;
    art.add(bottom);

    const neck = new T3.Mesh(
      new T3.CylinderGeometry(
        .105,.145,.27,14
      ),
      glass
    );
    neck.position.y=.51;
    art.add(neck);

    const cork = new T3.Mesh(
      new T3.CylinderGeometry(
        .122,.11,.17,12
      ),
      new T3.MeshLambertMaterial({
        color:0xcba47b
      })
    );
    cork.position.y=.72;
    art.add(cork);

    let paper = null;

    if(d.kind==='letter') {
      paper = new T3.Mesh(
        new T3.CylinderGeometry(
          .078,.078,.54,10
        ),
        new T3.MeshLambertMaterial({
          color:0xffefcf
        })
      );

      paper.position.y=-.04;
      art.add(paper);
    }

    const hit = new T3.Mesh(
      new T3.BoxGeometry(1.35,.75,1.25),
      new T3.MeshBasicMaterial({
        transparent:true,
        opacity:0,
        depthWrite:false
      })
    );

    root.add(hit);

    const o = {
      ...d,
      index,
      root,
      art,
      cork,
      paper,
      glass,
      taken:false,
      mode:'idle',
      age:0
    };

    root.userData.act = () => startPickup(o);
    hit.userData.act = () => startPickup(o);

    sc.add(root);
    hitList.push(root);

    return o;
  }

  const usedIds = new Set();

  for(const [i,d] of source.entries()) {
    if(
      usedIds.has(d.id) ||
      alreadyCollected(d.id)
    ) continue;

    usedIds.add(d.id);
    items.push(makeDriftBottle(d,i));
  }

  // ========================================
  // P. 收藏寫入
  // ========================================

  function saveCollectedBottle(o) {
    const data = {
      id:o.id,
      kind:o.kind,
      text:o.kind==='letter' ? o.text : '',
      sender:o.sender || ''
    };

    // 優先使用新版一次儲存接口
    if(typeof cabin.collectDriftBottle==='function') {
      return cabin.collectDriftBottle(data);
    }

    // 相容尚未升級的船艙接口
    const state = cabin.getState();

    if(o.kind==='letter') {
      const noteId = `note-${o.id}`;

      if(
        !state.letters?.some(x=>x.id===noteId)
      ) {
        if(
          !cabin.addLetter?.(
            noteId,
            data.text,
            data.sender
          )
        ) return false;
      }
    }

    const latest = cabin.getState();

    if(
      !latest.bottles?.some(x=>x.id===o.id)
    ) {
      if(!cabin.addBottle?.(o.id)) {
        return false;
      }
    }

    return cabin.markCollectedBottle?.(o.id)===true;
  }

  // ========================================
  // Q. 拾取動畫
  // ========================================

  function startPickup(o) {
    if(
      o.taken ||
      o.mode!=='idle' ||
      !access.isSailing() ||
      cabin.isOpen?.() ||
      boat.arrival ||
      boat.pending
    ) return;

    if(distance(o)>TAKE_DISTANCE) {
      notify('再靠近漂流瓶一點。');
      return;
    }

    if(!cabin.getState().bag) {
      notify(
        '先到船上取得防水背包，才能收藏漂流瓶。'
      );
      return;
    }

    o.mode='opening';
    o.age=0;
  }

  function resetBottle(o) {
    o.mode='idle';
    o.age=0;

    o.cork.visible=true;
    o.cork.position.set(0,.72,0);
    o.cork.rotation.set(0,0,0);

    if(o.paper) {
      o.paper.visible=true;
      o.paper.position.y=-.04;
    }

    o.art.position.y=0;
    o.art.rotation.y=0;
  }

  function removeBottle(o) {
    o.taken=true;

    const i=hitList.indexOf(o.root);
    if(i>=0)hitList.splice(i,1);

    sc.remove(o.root);

    const disposed=new Set();

    o.root.traverse(obj=>{
      if(
        obj.geometry &&
        !disposed.has(obj.geometry)
      ) {
        disposed.add(obj.geometry);
        obj.geometry.dispose();
      }

      const materials=obj.material
        ? (Array.isArray(obj.material)
            ? obj.material
            : [obj.material])
        : [];

      for(const material of materials) {
        if(!disposed.has(material)) {
          disposed.add(material);
          material.dispose();
        }
      }
    });
  }

  function collectBottle(o) {
    if(!saveCollectedBottle(o)) {
      notify('收藏失敗，請確認瀏覽器儲存權限。');
      return false;
    }

    removeBottle(o);

    if(o.kind==='letter') {
      notify(
        '信件與空瓶已收進防水背包。'
      );
    } else {
      notify(
        '空瓶已收進防水背包。'
      );
    }

    return true;
  }

  // ========================================
  // R. 信紙攤開閱讀
  // ========================================

  function showLetter(o) {
    readingBottle=o;
    o.mode='reading';

    senderEl.textContent =
      o.sender || '一封從海上漂來的信';

    letterTextEl.textContent=o.text || '';

    reader.hidden=false;
    reader.classList.remove('show');

    void reader.offsetWidth;

    reader.classList.add('show');
  }

  function closeReader() {
    reader.classList.remove('show');
    reader.hidden=true;

    if(readingBottle && !readingBottle.taken) {
      resetBottle(readingBottle);
    }

    readingBottle=null;
  }

  reader.querySelector('[data-cancel]')
    .addEventListener('click',closeReader);

  reader.querySelector('[data-collect]')
    .addEventListener('click',()=>{
      if(!readingBottle)return;

      if(collectBottle(readingBottle)) {
        readingBottle=null;
        reader.classList.remove('show');
        reader.hidden=true;
      }
    });

  // Esc 優先關閉信紙，而不是離船
  document.addEventListener(
    'keydown',
    e=>{
      if(reader.hidden)return;

      if(e.key==='Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeReader();
        return;
      }

      if(
        [
          'KeyW','KeyA','KeyS','KeyD',
          'ArrowUp','ArrowDown',
          'ArrowLeft','ArrowRight',
          'Space','ShiftLeft','ShiftRight'
        ].includes(e.code)
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true
  );

  // ========================================
  // S. 每幀漂流瓶更新
  // ========================================

  let nearest=null;

  window.vbDriftStep=dt=>{
    const sailing=
      access.isSailing() &&
      !cabin.isOpen?.() &&
      reader.hidden;

    const visible=
      boat.unlocked &&
      !boat.pending &&
      !boat.arrival;

    const time=performance.now()*.001;

    nearest=null;
    let best=TAKE_DISTANCE;

    for(const o of items) {
      if(o.taken)continue;

      o.root.visible=visible;

      if(!visible)continue;

      // 海面浮動
      o.root.position.y=
        .22+
        Math.sin(time*1.5+o.index*2.1)*.038;

      o.root.rotation.y+=dt*.1;

      o.root.rotation.z=
        Math.sin(time*1.2+o.index)*.045;

      if(o.mode==='opening') {
        o.age+=dt;

        const lift=ease(o.age/.8);
        const pull=ease((o.age-.45)/.95);

        // 瓶身微微浮起
        o.art.position.y=.15*lift;

        // 軟木塞打開，向外移動並旋轉
        o.cork.position.y=.72+1.1*lift;
        o.cork.rotation.z=lift*2.8;

        // 紙捲逐漸從瓶口抽出
        if(o.paper) {
          o.paper.position.y=
            -.04+1.15*pull;
        }

        // 空瓶不出現信紙
        if(o.age>=1.5) {
          if(o.kind==='letter') {
            showLetter(o);
          } else {
            if(!collectBottle(o)) {
              resetBottle(o);
            }
          }
        }

        continue;
      }

      if(o.mode==='reading')continue;

      // 靠近時，瓶身出現細微亮度變化
      const dist=distance(o);

      const near=sailing &&
        dist<=TAKE_DISTANCE;

      o.glass.opacity=near?.57:.48;

      if(near && dist<best) {
        best=dist;
        nearest=o;
      }
    }
  };

  // ========================================
  // T. 鍵盤 E 輔助拾取
  // ========================================

  window.addEventListener(
    'keydown',
    e=>{
      if(
        e.code!=='KeyE' ||
        e.repeat ||
        !nearest ||
        !reader.hidden ||
        ['INPUT','TEXTAREA','SELECT']
          .includes(
            document.activeElement?.tagName
          )
      )return;

      const target=nearest;

      startPickup(target);

      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true
  );

  // ========================================
  // U. 對外公開接口
  // ========================================

  window.VBDriftBottles={
    visibleBottleCount:()=>
      items.filter(o=>!o.taken).length,

    activeBottleCount:()=>
      items.filter(o=>
        !o.taken && o.root.visible
      ).length,

    takeNearest:()=>{
      if(!nearest)return false;
      startPickup(nearest);
      return true;
    },

    terrainProgress:()=>SHORE.progress
  };

  console.info(
    '[VB Stage 3] 海岸、船艙與漂流瓶模組已載入'
  );

})();
