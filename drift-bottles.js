
/* 排球場｜第三階段：漂流瓶尋找、拾取、信紙與空瓶收藏
 *
 * 載入順序：
 * world-items.js → boat-cabin.js → drift-bottles.js
 *
 * 正式故事文字尚未定稿。
 * 在 STORY_BOTTLES 加入完整信件後才會顯示。
 *
 * 收藏沿用 vb-boat-cabin-v1。
 * 不新增 localStorage key。
 */

(() => {
  'use strict';

  const access = window.VBBoatAccess;
  const cabin = window.VBBoatCabin;

  // ===== 初始化檢查 =====

  if (
    !access?.getObject?.() ||
    !cabin?.collectDriftBottle ||
    typeof T3 === 'undefined' ||
    typeof sc === 'undefined' ||
    typeof hitList === 'undefined'
  ) {
    console.warn(
      '[drift-bottles] 船隻、船艙收藏或場景介面尚未就緒。'
    );
    return;
  }

  // 避免重複載入
  if (window.VBDriftBottles) return;

  const boat = access.getObject();

  // 船隻靠近漂流瓶的拾取距離
  const TAKE_DISTANCE = 4.6;

  const items = [];

  // ===== 日期 =====

  const date = new Date();

  const localDay = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');

  const daysSinceEpoch = Math.floor(
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ).getTime() / 86400000
  );

  // ===== 正式故事信件 =====
  //
  // 故事尚未定稿，因此保持空白。
  //
  // 之後可使用以下格式：
  //
  // {
  //   id: 'letter-01',
  //   x: -74,
  //   z: 18,
  //   sender: '',
  //   text: '完整信件內容'
  // }
  //
  // 不在遊戲畫面顯示章節、劇情編號或收集進度。

  const STORY_BOTTLES = [];

  const source = STORY_BOTTLES
    .filter(b =>
      b &&
      typeof b.id === 'string' &&
      b.id.length <= 65 &&
      typeof b.text === 'string' &&
      b.text.trim() &&
      Number.isFinite(b.x) &&
      Number.isFinite(b.z)
    )
    .map(b => ({
      ...b,
      kind: 'letter'
    }));

  // ===== 開發者模式測試信 =====

  // 正式版不會顯示這封信。

  if (
    typeof VB_IS_DEV !== 'undefined' &&
    VB_IS_DEV
  ) {
    source.push({
      id: 'dev-test-letter',
      kind: 'letter',
      x: -48,
      z: 15,
      sender: '測試紙條',
      text:
        '這只是一封用來測試拾取與收藏功能的紙條。正式故事尚未加入。'
    });
  }

  // ===== 每日空瓶 =====

  // 按照日期生成少量空瓶。
  // 同一個 ID 撿過後，不會因重新整理而重新出現。

  if (
    (typeof VB_IS_DEV !== 'undefined' && VB_IS_DEV) ||
    localDay === '2026-12-24' ||
    daysSinceEpoch % 2 === 0
  ) {
    source.push({
      id: `empty-${localDay}-a`,
      kind: 'empty',
      x: -53,
      z: 20
    });
  }

  if (daysSinceEpoch % 5 === 0) {
    source.push({
      id: `empty-${localDay}-b`,
      kind: 'empty',
      x: -84,
      z: -12
    });
  }

  // ===== 拾取按鈕樣式 =====

  const css = document.createElement('style');

  css.textContent = `
    #vbDriftPickup {
      position: fixed;
      z-index: 18;

      right: calc(
        18px + env(safe-area-inset-right, 0px)
      );

      bottom: calc(
        24px + env(safe-area-inset-bottom, 0px)
      );

      max-width: min(
        240px,
        calc(100vw - 36px)
      );

      padding: 10px 15px;

      border: 1px solid rgba(255,255,255,.6);
      border-radius: 999px;

      background: rgba(29,42,80,.45);
      color: white;

      -webkit-backdrop-filter: blur(7px);
      backdrop-filter: blur(7px);

      font: 600 13px/1.5
        system-ui,
        'PingFang TC',
        sans-serif;

      box-shadow:
        0 7px 20px rgba(10,20,45,.17);

      cursor: pointer;
    }

    #vbDriftPickup[hidden] {
      display: none !important;
    }

    #vbDriftPickup:hover {
      background: rgba(29,42,80,.67);
    }

    #vbDriftPickup:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 3px;
    }

    @media (max-width:560px) {
      #vbDriftPickup {
        bottom: calc(
          18px + env(safe-area-inset-bottom,0px)
        );

        font-size: 12px;
      }
    }
  `;

  document.head.append(css);

  // ===== 建立拾取按鈕 =====

  const pickupButton =
    document.createElement('button');

  pickupButton.id = 'vbDriftPickup';
  pickupButton.type = 'button';
  pickupButton.textContent = '拾起漂流瓶';

  pickupButton.setAttribute(
    'aria-label',
    '拾起附近的漂流瓶'
  );

  pickupButton.hidden = true;

  document.body.append(pickupButton);

  // ===== 基礎工具 =====

  function notify(message) {
    if (typeof popText === 'function') {
      popText(message);
    }
  }

  function distance(o) {
    return Math.hypot(
      boat.x - o.x,
      boat.z - o.z
    );
  }

  // ===== 建立漂流瓶模型 =====

  function makeBottle(d, i) {

    const root = new T3.Group();

    root.position.set(
      d.x,
      .22,
      d.z
    );

    root.visible = false;

    root.userData.act = () => take(d.id);

    const art = new T3.Group();

    // 漂流瓶橫躺在海面上
    art.rotation.z = Math.PI / 2;

    root.add(art);

    // 透明玻璃材質
    const glass = new T3.MeshPhongMaterial({
      color: 0xc9eef2,
      transparent: true,
      opacity: .48,
      shininess: 95,
      depthWrite: false,
      side: T3.DoubleSide
    });

    // 瓶身
    const body = new T3.Mesh(
      new T3.CylinderGeometry(
        .20, .22, .79, 16, 1, true
      ),
      glass
    );

    art.add(body);

    // 瓶底
    const bottom = new T3.Mesh(
      new T3.CylinderGeometry(
        .22, .22, .035, 16
      ),
      new T3.MeshLambertMaterial({
        color: 0xa4e3e8,
        transparent: true,
        opacity: .62,
        depthWrite: false
      })
    );

    bottom.position.y = -.39;
    art.add(bottom);

    // 瓶頸
    const neck = new T3.Mesh(
      new T3.CylinderGeometry(
        .105, .145, .27, 14
      ),
      glass
    );

    neck.position.y = .51;
    art.add(neck);

    // 軟木塞
    const cork = new T3.Mesh(
      new T3.CylinderGeometry(
        .122, .11, .17, 12
      ),
      new T3.MeshLambertMaterial({
        color: 0xcba47b
      })
    );

    cork.position.y = .72;
    art.add(cork);

    // ===== 有信件的漂流瓶 =====

    if (d.kind === 'letter') {

      const paper = new T3.Mesh(
        new T3.CylinderGeometry(
          .078, .078, .54, 10
        ),
        new T3.MeshLambertMaterial({
          color: 0xffefcf
        })
      );

      paper.position.y = -.04;

      art.add(paper);
    }

    // ===== 點擊判定範圍 =====

    const hit = new T3.Mesh(
      new T3.BoxGeometry(
        1.35,
        .75,
        1.25
      ),
      new T3.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );

    hit.userData.act = () => take(d.id);

    root.add(hit);

    sc.add(root);
    hitList.push(root);

    return {
      ...d,
      root,
      i,
      taken: false
    };
  }

  // ===== 收藏狀態檢查 =====

  function alreadyTaken(id) {

    const state = cabin.getState();

    return (
      state.collectedBottleIds?.includes(id) === true
    );
  }

  // ===== 生成尚未撿過的瓶子 =====

  const seenIds = new Set();

  source.forEach((d, i) => {

    if (
      seenIds.has(d.id) ||
      alreadyTaken(d.id)
    ) {
      return;
    }

    seenIds.add(d.id);

    items.push(
      makeBottle(d, i)
    );
  });

  // ===== 移除已拾取的瓶子 =====

  function remove(o) {

    o.taken = true;

    const idx =
      hitList.indexOf(o.root);

    if (idx >= 0) {
      hitList.splice(idx, 1);
    }

    sc.remove(o.root);

    // 釋放模型資源，避免記憶體累積
    const disposed = new Set();

    o.root.traverse(mesh => {

      if (
        mesh.geometry &&
        !disposed.has(mesh.geometry)
      ) {
        disposed.add(mesh.geometry);
        mesh.geometry.dispose();
      }

      const materials = mesh.material
        ? (
            Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material]
          )
        : [];

      materials.forEach(m => {

        if (!disposed.has(m)) {
          disposed.add(m);
          m.dispose();
        }

      });
    });
  }

  // ===== 拾取漂流瓶 =====

  function take(id) {

    const o = items.find(
      x => x.id === id && !x.taken
    );

    // 必須正在航行，且船隻接近漂流瓶
    if (
      !o ||
      !access.isSailing() ||
      cabin.isOpen?.() ||
      distance(o) > TAKE_DISTANCE ||
      boat.arrival ||
      boat.pending
    ) {
      return false;
    }

    const current = cabin.getState();

    // 必須先拿到背包
    if (!current.bag) {
      notify(
        '先到船上拿起背包，才能收好漂流瓶。'
      );

      return false;
    }

    // ===== 一次儲存所有收藏資料 =====

    const saved = cabin.collectDriftBottle({
      id: o.id,
      kind: o.kind,

      text:
        o.kind === 'letter'
          ? o.text
          : '',

      sender:
        o.kind === 'letter'
          ? (o.sender || '')
          : ''
    });

    if (!saved) {

      notify(
        '漂流瓶暫時無法儲存，請檢查背包空間或瀏覽器儲存權限。'
      );

      return false;
    }

    // 儲存成功後才移除海面上的瓶子
    remove(o);

    nearest = null;

    pickupButton.hidden = true;

    // ===== 拾取回饋 =====

    if (o.kind === 'letter') {

      notify(
        '找到一封紙條。原信與空瓶都已收進背包。'
      );

      cabin.openBackpack?.();

    } else {

      notify(
        '撿到一個空瓶子，已收進背包。'
      );

    }

    return true;
  }

  // ===== 最近的漂流瓶 =====

  let nearest = null;

  // 手機或滑鼠點擊拾取
  pickupButton.addEventListener(
    'click',
    () => {

      if (nearest) {
        take(nearest.id);
      }

    }
  );

  // 電腦按 E 拾取
  window.addEventListener(
    'keydown',
    e => {

      if (
        e.code !== 'KeyE' ||
        e.repeat ||
        !nearest ||
        ['INPUT', 'TEXTAREA', 'SELECT']
          .includes(
            document.activeElement?.tagName
          )
      ) {
        return;
      }

      if (take(nearest.id)) {

        e.preventDefault();
        e.stopImmediatePropagation();

      }

    },
    true
  );

  // ===== 每幀動畫 =====

  // 使用 index.html 原本的動畫循環。
  // 不另外建立 requestAnimationFrame。

  window.vbDriftStep = dt => {

    const sailing =
      access.isSailing() &&
      !cabin.isOpen?.();

    const visible =
      boat.unlocked &&
      !boat.pending &&
      !boat.arrival;

    nearest = null;

    let best = TAKE_DISTANCE;

    const t = performance.now() * .001;

    for (const o of items) {

      if (o.taken) continue;

      o.root.visible = visible;

      if (!visible) continue;

      // 海面自然上下漂浮
      o.root.position.y =
        .22 +
        Math.sin(
          t * 1.5 + o.i * 2.1
        ) * .038;

      // 緩慢旋轉
      o.root.rotation.y += dt * .10;

      // 小幅度搖晃
      o.root.rotation.z =
        Math.sin(
          t * 1.2 + o.i
        ) * .045;

      if (!sailing) continue;

      // 計算船隻與瓶子的距離
      const d = distance(o);

      if (d < best) {

        nearest = o;
        best = d;

      }
    }

    // 接近瓶子才顯示拾取按鈕
    pickupButton.hidden = !nearest;
  };

  // ===== 對外接口 =====

  window.VBDriftBottles = {

    // 尚未拾取的瓶子數量
    visibleBottleCount: () =>
      items.filter(x => !x.taken).length,

    // 目前場景中顯示的瓶子數量
    activeBottleCount: () =>
      items.filter(
        x => !x.taken && x.root.visible
      ).length,

    // 拾取最近的瓶子
    takeNearest: () =>
      nearest
        ? take(nearest.id)
        : false

  };

})();
