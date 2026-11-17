/* 第四階段：自由漫遊控制（不改動原本排球、裁判椅、帆船的互動） */
(() => {
  'use strict';

  // 此檔案必須在 index.html 原本的 <script> 及 world-items.js 之後載入。
  if (typeof ct === 'undefined' || typeof tgtP === 'undefined' ||
      typeof cv === 'undefined' || typeof cam === 'undefined') {
    console.error('[roam-controls] 找不到球場攝影機，請檢查 script 載入順序。');
    return;
  }

  const css = document.createElement('style');
  css.textContent = `
  /* 玩家關閉提示時，隱藏球場浮動說明 */
html.vb-hide-tips #tip {
  display: none !important;
}
    /* 透明底、細白圈、可移動白圓點：沿用音量鍵的簡潔視覺 */
    .vb-roam-stick {
      position: fixed;
      bottom: calc(24px + env(safe-area-inset-bottom, 0px));
      width: 98px;
      height: 98px;
      z-index: 12;
      border: 1.5px solid rgba(255,255,255,.68);
      border-radius: 50%;
      background: transparent;
      box-shadow: 0 0 8px rgba(255,255,255,.1), inset 0 0 8px rgba(255,255,255,.04);
      opacity: .64;
      touch-action: none;
      -webkit-user-select: none;
      user-select: none;
      cursor: grab;
      transition: opacity .2s, visibility .2s;
    }
    .vb-roam-stick.left { left: calc(20px + env(safe-area-inset-left, 0px)); }
    .vb-roam-stick.right { right: calc(20px + env(safe-area-inset-right, 0px)); }
    .vb-roam-stick.pressed,
    .vb-roam-stick:hover { opacity: .92; }
    .vb-roam-stick.pressed { cursor: grabbing; }
    .vb-roam-stick.hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }
    .vb-roam-knob {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 27px;
      height: 27px;
      border-radius: 50%;
      background: rgba(255,255,255,.9);
      border: 1px solid rgba(255,255,255,.55);
      box-shadow: 0 0 9px rgba(255,255,255,.28);
      transform: translate(-50%,-50%);
      pointer-events: none;
      will-change: transform;
    }
    .vb-roam-knob.released { transition: transform .16s ease-out; }
    /* 控制元件顯示設定：透明白色按鈕，不使用常駐面板 */
    #vbRoamUiButton {
      position: fixed;
      top: calc(16px + env(safe-area-inset-top, 0px));
      left: calc(16px + env(safe-area-inset-left, 0px));
      z-index: 18;
      width: 43px;
      height: 43px;
      padding: 0;
      display: grid;
      place-items: center;
      color: rgba(255,255,255,.83);
      font: 24px system-ui, sans-serif;
      background: transparent;
      border: 1px solid rgba(255,255,255,.3);
      border-radius: 50%;
      cursor: pointer;
      text-shadow: 0 1px 4px rgba(10,20,40,.3);
      transition: opacity .2s, border-color .2s;
    }
    #vbRoamUiButton:hover, #vbRoamUiButton[aria-expanded="true"] {
      border-color: rgba(255,255,255,.8);
    }
    #vbRoamUiMenu {
      position: fixed;
      left: calc(16px + env(safe-area-inset-left, 0px));
      top: calc(68px + env(safe-area-inset-top, 0px));
      z-index: 18;
      display: none;
      align-items: center;
      gap: 8px;
    }
    #vbRoamUiMenu.open { display: flex; }
    #vbRoamUiMenu button {
      min-height: 39px;
      padding: 7px 11px;
      color: rgba(255,255,255,.92);
      font: 13px "PingFang TC", system-ui, sans-serif;
      border: 1px solid rgba(255,255,255,.48);
      border-radius: 999px;
      background: rgba(29,42,80,.2);
      cursor: pointer;
      -webkit-backdrop-filter: blur(3px);
      backdrop-filter: blur(3px);
    }
    #vbRoamUiMenu button[aria-pressed="false"] { opacity: .5; }
    #vbRoamUiMenu button:focus-visible, #vbRoamUiButton:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 2px;
    }
    @media (max-width: 700px) {
      .vb-roam-stick { width: 88px; height: 88px; }
      .vb-roam-stick.left { left: calc(16px + env(safe-area-inset-left, 0px)); }
      .vb-roam-stick.right { right: calc(16px + env(safe-area-inset-right, 0px)); }
      #tip { bottom: calc(126px + env(safe-area-inset-bottom, 0px)); }
    }
    @media (max-width: 360px) {
      .vb-roam-stick { width: 76px; height: 76px; }
      .vb-roam-knob { width: 23px; height: 23px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .vb-roam-stick, .vb-roam-knob { transition: none; }
    }
  `;
  document.head.append(css);

  function makeStick(side, label) {
    const base = document.createElement('div');
    base.className = `vb-roam-stick ${side}`;
    base.setAttribute('role', 'group');
    base.setAttribute('aria-label', label);
    base.innerHTML = '<div class="vb-roam-knob released"></div>';
    document.body.append(base);

    const knob = base.firstElementChild;
    const state = { x: 0, y: 0, pointerId: null, base, knob };

    function move(e) {
      const r = base.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const max = Math.max(10, (r.width - knob.offsetWidth) / 2 - 4);
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const length = Math.hypot(dx, dy);
      const factor = length > max ? max / length : 1;
      const x = dx * factor;
      const y = dy * factor;
      state.x = x / max;
      state.y = y / max;
      knob.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px)`;
    }

    function release() {
      state.pointerId = null;
      state.x = 0;
      state.y = 0;
      base.classList.remove('pressed');
      knob.classList.add('released');
      knob.style.transform = 'translate(-50%,-50%)';
    }

    base.addEventListener('pointerdown', e => {
      if (state.pointerId !== null || !controlsAvailable()) return;
      e.preventDefault();
      e.stopPropagation();
      state.pointerId = e.pointerId;
      base.classList.add('pressed');
      knob.classList.remove('released');
      base.setPointerCapture(e.pointerId);
      move(e);
    });
    base.addEventListener('pointermove', e => {
      if (e.pointerId !== state.pointerId) return;
      e.preventDefault();
      e.stopPropagation();
      move(e);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      base.addEventListener(type, e => {
        if (e.pointerId !== state.pointerId) return;
        e.preventDefault();
        e.stopPropagation();
        release();
      });
    }
    state.release = release;
    return state;
  }

  const leftStick = makeStick('left', '移動搖桿：前後左右移動');
  const rightStick = makeStick('right', '視角搖桿：左右轉頭、上下抬頭低頭');

  // 搖桿顯示設定記住上次選擇；E 鍵仍能以畫面中心進行互動。
  const uiPrefKey = 'vb-roam-ui-v1';
  const uiPrefs = {
  sticks: true,
  tips: true
};
  try {
    const raw = typeof vbStore !== 'undefined'
      ? vbStore.getItem(uiPrefKey)
      : localStorage.getItem(uiPrefKey);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved && typeof saved === 'object') {
      if (typeof saved.sticks === 'boolean') uiPrefs.sticks = saved.sticks;
      if (typeof saved.tips === 'boolean') {
  uiPrefs.tips = saved.tips;
}
    }
  } catch (_) { /* 儲存空間受限時仍能操作 */ }

  const uiButton = document.createElement('button');
  uiButton.type = 'button';
  uiButton.id = 'vbRoamUiButton';
  uiButton.textContent = '⋯';
  uiButton.setAttribute('aria-label', '操作介面顯示設定');
  uiButton.setAttribute('title', '顯示或隱藏搖桿');
  uiButton.setAttribute('aria-expanded', 'false');

  const uiMenu = document.createElement('div');
  uiMenu.id = 'vbRoamUiMenu';
  const sticksButton = document.createElement('button');
  sticksButton.type = 'button';
 const tipsButton = document.createElement('button');
tipsButton.type = 'button';

uiMenu.append(sticksButton, tipsButton);
  document.body.append(uiButton, uiMenu);

  function saveUiPrefs() {
    try {
      const value = JSON.stringify(uiPrefs);
      if (typeof vbStore !== 'undefined') vbStore.setItem(uiPrefKey, value);
      else localStorage.setItem(uiPrefKey, value);
    } catch (_) { /* 偏好無法儲存也不影響操控 */ }
  }

  function refreshUiButtons() {

  sticksButton.textContent =
    `搖桿 ${uiPrefs.sticks ? '開' : '關'}`;

  sticksButton.setAttribute(
    'aria-pressed',
    String(uiPrefs.sticks)
  );

  tipsButton.textContent =
    `提示 ${uiPrefs.tips ? '開' : '關'}`;

  tipsButton.setAttribute(
    'aria-pressed',
    String(uiPrefs.tips)
  );

  document.documentElement.classList.toggle(
    'vb-hide-tips',
    !uiPrefs.tips
  );

}

  uiButton.addEventListener('click', () => {
    const open = uiMenu.classList.toggle('open');
    uiButton.setAttribute('aria-expanded', String(open));
  });
  sticksButton.addEventListener('click', () => {
    uiPrefs.sticks = !uiPrefs.sticks;
    if (!uiPrefs.sticks) { leftStick.release(); rightStick.release(); }
    saveUiPrefs();
    refreshUiButtons();
  });
  tipsButton.addEventListener('click', () => {

  uiPrefs.tips = !uiPrefs.tips;

  saveUiPrefs();
  refreshUiButtons();

});
  document.addEventListener('pointerdown', e => {
    if (e.target !== uiButton && !uiButton.contains(e.target) &&
        !uiMenu.contains(e.target)) {
      uiMenu.classList.remove('open');
      uiButton.setAttribute('aria-expanded', 'false');
    }
  });
  refreshUiButtons();

  const held = new Set();
  const velocity = { x: 0, z: 0 };
  let resetting = false;
  let wasAvailable = true;

  const isTyping = () => {
    const a = document.activeElement;
    return !!a && (
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName) ||
      a.isContentEditable
    );
  };

  function mode() {
    return typeof window.worldCameraMode === 'function'
      ? window.worldCameraMode()
      : 'orbit';
  }

  function busy() {
    return (typeof window.worldIsRevealing === 'function' && window.worldIsRevealing()) ||
      (typeof window.worldIsSpecialTransitioning === 'function' && window.worldIsSpecialTransitioning()) ||
      (typeof window.worldIsOrganizing === 'function' && window.worldIsOrganizing()) ||
      (typeof bday !== 'undefined' && bday.active) ||
      (typeof pad !== 'undefined' && !pad.hidden);
  }

  function controlsAvailable() {
    return mode() === 'orbit' && !busy();
  }

  function resetCamera() {
    if (busy()) return;
    if (mode() !== 'orbit' && typeof window.worldExitSpecialView === 'function') {
      window.worldExitSpecialView();
    }
    ct.th = -.55;
    ct.ph = 1;
    ct.d = 27;
    ct.tilt = 0;
    resetting = true;
    velocity.x = 0;
    velocity.z = 0;
  }
  window.vbRoamReset = resetCamera;

  // 鍵盤沒有滑鼠時，可把畫面中央當作選取游標。
  function interactAtCenter() {
    if (
  busy() ||
  mode() === 'boat' ||
  (
    typeof window.worldMachineIsPracticing === 'function' &&
    window.worldMachineIsPracticing()
  )
) return;
    const e = { clientX: innerWidth / 2, clientY: innerHeight / 2 };
    const obj = typeof pick === 'function' ? pick(e) : null;

    if (obj) {
      if (obj.userData.ball) hit();
      else if (typeof obj.userData.act === 'function') obj.userData.act();
      return;
    }

    if (mode() !== 'orbit') return;

    const pt = typeof courtPoint === 'function' ? courtPoint(e) : null;
    if (pt && typeof ballNeedsRecall === 'function' && ballNeedsRecall()) {
      recallBall(pt);
    } else if (pt && typeof b !== 'undefined' && b.armed > 0) {
      startSpike(pt);
    }
  }

  // Space 提供純鍵盤擊球：靠近球即可連點、三擊後再次按空白鍵殺球。
  function hitBallByKeyboard() {

  if (
    !controlsAvailable() ||
    typeof ball === 'undefined'
  ) return;


  // 發球機練習期間
  // 距離判定交給發球機系統處理
  if (
    typeof window.worldMachineIsPracticing === 'function' &&
    window.worldMachineIsPracticing()
  ) {

    hit();

    return;

  }


  // 非練習模式：保留原本擊球距離
  if (
    Math.hypot(
      tgtP.x - ball.position.x,
      tgtP.z - ball.position.z
    ) <= 5.5
  ) {

    hit();

  }

}

  const heldCodes = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract',
    'ShiftLeft', 'ShiftRight'
  ]);

  window.addEventListener('keydown', e => {
    if (isTyping() || e.altKey || e.metaKey || e.ctrlKey) return;
    const code = e.code;
    if (!code) return;
    const curMode = mode();

    if (code === 'Escape' && curMode !== 'orbit') {
      if (typeof window.worldExitSpecialView === 'function') {
        window.worldExitSpecialView();
        e.preventDefault();
      }
      return;
    }

    if (code === 'KeyR' && !e.repeat) {
      resetCamera();
      e.preventDefault();
      return;
    }

    if (code === 'KeyE' && !e.repeat && !busy()) {
      interactAtCenter();
      e.preventDefault();
      return;
    }

    if (code === 'Space') {

  // 擊球練習使用專屬的按鍵控制
  if (
    typeof window.worldMachineIsPracticing === 'function' &&
    window.worldMachineIsPracticing()
  ) {

    if (!e.repeat && controlsAvailable()) {
      window.worldMachineSpaceDown();
    }

    e.preventDefault();
    return;
  }

  // 其他時候維持原本的自由擊球
  if (!e.repeat && controlsAvailable()) {

    hitBallByKeyboard();

    e.preventDefault();
    return;

  }

}

    if (curMode === 'boat') return; // 帆船沿用既有 WASD / 方向鍵。
    if (heldCodes.has(code) && (controlsAvailable() ||
        (curMode === 'chair' && code.startsWith('Arrow')))) {
      held.add(code);
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', e => {

  held.delete(e.code);

  if (
    e.code === 'Space' &&
    typeof window.worldMachineIsPracticing === 'function' &&
    window.worldMachineIsPracticing()
  ) {

    window.worldMachineSpaceUp();

    e.preventDefault();

  }

});
  window.addEventListener('blur', () => {
    if (
  typeof window.worldMachineSpaceCancel === 'function'
) {
  window.worldMachineSpaceCancel();
}
    held.clear();
    velocity.x = velocity.z = 0;
    leftStick.release();
    rightStick.release();
  });
  cv.tabIndex = 0; // 點擊球場後，iframe 能取得鍵盤操作焦點。
  cv.addEventListener('pointerdown', () => {
    try { cv.focus({ preventScroll: true }); } catch (_) { cv.focus(); }
  });

  // 讓既有的物件解鎖流程知道玩家是否還在操控，避免搖桿按住時突然切鏡。
  window.vbIsRoamMoving = () =>
    held.size > 0 ||
    Math.hypot(leftStick.x, leftStick.y) > .05 ||
    Math.hypot(rightStick.x, rightStick.y) > .05 ||
    Math.hypot(velocity.x, velocity.z) > .2 || resetting;

  const down = k => held.has(k) ? 1 : 0;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  window.vbRoamStep = dt => {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(.05, dt);

    const curMode = mode();
    const available = controlsAvailable();

    if (available !== wasAvailable) {
      wasAvailable = available;
      if (!available) {
        leftStick.release();
        rightStick.release();
        velocity.x = velocity.z = 0;
        held.clear();
      }
    }

    leftStick.base.classList.toggle('hidden', !available || !uiPrefs.sticks);
    rightStick.base.classList.toggle('hidden', !available || !uiPrefs.sticks);

    // 裁判椅：純鍵盤方向鍵仍能抬頭與環顧；帆船使用舊有操控。
    if (curMode === 'chair' && !busy()) {
      const yaw = down('ArrowLeft') - down('ArrowRight');
      const pitch = down('ArrowUp') - down('ArrowDown');
      if (typeof window.worldChairControl === 'function') {
        window.worldChairControl(yaw * dt * 1.45, pitch * dt * 1.1);
      }
      return;
    }
    if (!available) return;

    const turn = down('ArrowRight') - down('ArrowLeft') + rightStick.x;
    const up = down('ArrowUp') - down('ArrowDown') - rightStick.y;
    ct.th -= turn * dt * 1.65;
    ct.tilt = clamp(ct.tilt + up * dt * 1.15, -.55, 1.05);

    const zoomIn = down('Equal') + down('NumpadAdd');
    const zoomOut = down('Minus') + down('NumpadSubtract');
    ct.d = clamp(ct.d + (zoomOut - zoomIn) * dt * 19, 8, 60);

    let forward = down('KeyW') - down('KeyS') - leftStick.y;
    let strafe = down('KeyD') - down('KeyA') + leftStick.x;
    const len = Math.hypot(forward, strafe);
    if (len > 1) { forward /= len; strafe /= len; }

    if (len > .05) resetting = false;
    const speed = (held.has('ShiftLeft') || held.has('ShiftRight')) ? 10 : 6.2;
    const desiredX = (-Math.sin(ct.th) * forward + Math.cos(ct.th) * strafe) * speed;
    const desiredZ = (-Math.cos(ct.th) * forward - Math.sin(ct.th) * strafe) * speed;
    const alpha = 1 - Math.exp(-10 * dt);
    velocity.x += (desiredX - velocity.x) * alpha;
    velocity.z += (desiredZ - velocity.z) * alpha;

    if (resetting) {
      const k = 1 - Math.exp(-5 * dt);
      tgtP.x += (0 - tgtP.x) * k;
      tgtP.z += (0 - tgtP.z) * k;
      if (Math.hypot(tgtP.x, tgtP.z) < .02) {
        tgtP.x = tgtP.z = 0;
        resetting = false;
      }
    } else {
      let nextX = tgtP.x + velocity.x * dt;
      let nextZ = tgtP.z + velocity.z * dt;
      // 漫遊範圍包含球場、野餐區、樹林和帆船岸邊。
      const length = Math.hypot(nextX, nextZ);
      if (length > 58) {
        nextX = nextX / length * 58;
        nextZ = nextZ / length * 58;
      }
      tgtP.x = nextX;
      tgtP.z = nextZ;
    }
  };
})();
