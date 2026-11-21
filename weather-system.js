/* ===== 第五階段：雲朵、降雨、濕地與雨後彩虹 ===== */

(() => {
'use strict';

const weather = {
  touched: new Set(),

  // 記錄上一朵不同雲被點擊的時間
  lastTapAt: -Infinity,

  kind: 'none',
  remaining: 0,
  strength: 0,
  wet: 0,
  lightning: 0,
  lightningIn: 5,
  rainbowTime: 0,
  rainbowPulse: 0
};

const weatherSky = new T3.Color(0x536a86);
const weatherFlashColor = new T3.Color(0xb8cae5);
const weatherWhite = new T3.Color(0xffffff);
const weatherCloudGray = new T3.Color(0xa6b3c7);
const WEATHER_TAP_WINDOW_MS = 3000;

// ===== 雨滴 =====

const WEATHER_DROP_COUNT = 480;
const weatherDrops = [];
const weatherCoords = new Float32Array(
  WEATHER_DROP_COUNT * 6
);

const weatherRainGeo = new T3.BufferGeometry();

weatherRainGeo.setAttribute(
  'position',
  new T3.BufferAttribute(weatherCoords, 3)
);

const weatherRain = new T3.LineSegments(
  weatherRainGeo,
  new T3.LineBasicMaterial({
    color: 0xd5eaff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false
  })
);

weatherRain.frustumCulled = false;
weatherRain.visible = false;
sc.add(weatherRain);


function resetWeatherDrop(d) {
  const a = rnd(0, PI * 2);
  const r = Math.sqrt(Math.random()) * 18;

  d.x = Math.cos(a) * r;
  d.z = Math.sin(a) * r;
  d.y = rnd(8, 28);
  d.v = rnd(14, 22);
}

for (let i = 0; i < WEATHER_DROP_COUNT; i++) {
  const drop = {};
  resetWeatherDrop(drop);
  weatherDrops.push(drop);
}


// ===== 濕地效果 =====
// 放在球場地板下面，避免蓋住白線。

const weatherWetGround = new T3.Mesh(
  new T3.CircleGeometry(18, 64),
  new T3.MeshBasicMaterial({
    color: 0x264b74,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: T3.DoubleSide
  })
);

weatherWetGround.rotation.x = -PI / 2;
weatherWetGround.position.y = .012;
sc.add(weatherWetGround);

const courtWeatherBase = [
  court.children[0].material.color.clone(),
  court.children[1].material.color.clone()
];

const courtWeatherWet = [
  new T3.Color(0x27486e),
  new T3.Color(0xb78662)
];


// ===== 七色彩虹 =====

const weatherRainbow = new T3.Group();

const rainbowColors = [
  0xffb2af,
  0xffd2ab,
  0xffedbd,
  0xc6ecc8,
  0xb8e4f2,
  0xc3d6fa,
  0xdacaf1
];

const rainbowBands = [];
const rainbowRadius = 20;

for (let i = 0; i < rainbowColors.length; i++) {

  const radius = rainbowRadius - i * .24;
  const points = [];

  for (let j = 0; j <= 48; j++) {
    const a = Math.PI * j / 48;

    points.push(new T3.Vector3(
      Math.cos(a) * radius,
      Math.sin(a) * radius,
      -37
    ));
  }

  const curve = new T3.CatmullRomCurve3(points);

  const band = new T3.Mesh(
    new T3.TubeGeometry(curve, 64, .115, 5, false),
    new T3.MeshBasicMaterial({
      color: rainbowColors[i],
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false
    })
  );

  rainbowBands.push(band);
  weatherRainbow.add(band);
}

weatherRainbow.visible = false;
sc.add(weatherRainbow);


// ===== 彩虹點擊區 =====

const rainbowHit = new T3.Mesh(
  new T3.TubeGeometry(
    new T3.CatmullRomCurve3(
      Array.from({ length: 33 }, (_, j) => {
        const a = Math.PI * j / 32;

        return new T3.Vector3(
          Math.cos(a) * 19.4,
          Math.sin(a) * 19.4,
          -37
        );
      })
    ),
    48, 1.3, 5, false
  ),
  ghost()
);

// 隱藏時不接受點擊
rainbowHit.layers.set(1);

rainbowHit.userData.act = () => {

  if (
    weather.rainbowTime <= 0 ||
    bday.active
  ) return;

  weather.rainbowPulse = 1;

  weather.rainbowTime = Math.max(
    weather.rainbowTime, 12
  );

  popText('雨後的彩虹輕輕亮起。');
};

sc.add(rainbowHit);
hitList.push(rainbowHit);
// 彩虹位於山後，依雲底在玩家眼中的仰角決定大小。
function positionRainbowInSky(framePreview = false) {
  let lowest = null;
  for (const cloud of clouds) {
    for (const { m, s } of cloud.parts) {
      const base = m.getWorldPosition(new T3.Vector3());
      // 採用雲恢復原形後的厚度，避免點雲時暫時縮小改變弧頂高度。
      base.y -= m.geometry.parameters.radius * s.y;
      if (!lowest || base.y < lowest.y) lowest = base;
    }
  }

  if (framePreview && lowest) {
    ct.th = cs.th = Math.atan2(tgtP.x - lowest.x, tgtP.z - lowest.z);
    camStep();
  }
  const bearing = cam.getWorldDirection(new T3.Vector3());
  bearing.y = 0;
  if (bearing.lengthSq() < .0001) bearing.set(0, 0, -1);
  bearing.normalize();
  const center = bearing.clone().multiplyScalar(155);
  center.y = -12;
  const depth = Math.hypot(center.x - cam.position.x, center.z - cam.position.z);
  let topY = center.y + rainbowRadius * 1.8;
  if (lowest) {
    const dx = lowest.x - cam.position.x, dz = lowest.z - cam.position.z;
    const distance = Math.max(1, Math.hypot(dx, dz));
    topY = cam.position.y + (lowest.y - cam.position.y) * depth / distance;
    // 最低的雲在眼前時讓弧頂接上它，其他方向則維持玩家原來的視線。
    const halfFov = Math.atan(Math.tan(T3.MathUtils.degToRad(cam.fov / 2)) * cam.aspect);
    const nearCenter = Math.cos(Math.min(halfFov * .55, Math.PI / 9));
    if (dx * bearing.x + dz * bearing.z >= nearCenter * distance) {
      bearing.set(dx / distance, 0, dz / distance);
    }
  }
  center.x = cam.position.x + bearing.x * depth;
  center.z = cam.position.z + bearing.z * depth;
  const yaw = Math.atan2(-bearing.x, -bearing.z);
  const heightScale = Math.max(.01, (topY - center.y) / rainbowRadius);
  // 幾何中心原在局部 z = -37。色帶與點擊區共用同一組變換。
  for (const target of [weatherRainbow, rainbowHit]) {
    target.position.copy(center).addScaledVector(bearing, -37);
    target.rotation.y = yaw;
    target.scale.set(heightScale * 1.3 / 1.8, heightScale, 1);
  }
  return Math.atan2(topY - cam.position.y, depth);
}

// ===== 判斷是否白天 =====

function weatherDaylight() {
  const hour = ((Tm % 24) + 24) % 24;
  return hour >= 7 && hour <= 17.5;
}

function weatherTapCloud(i) {

  if (
    bday.active ||
    !Number.isInteger(i)
  ) return;

  const now = performance.now();

  // 超過 3 秒沒接續下一朵，就重新開始計算
  if (
    now - weather.lastTapAt >
    WEATHER_TAP_WINDOW_MS
  ) {
    weather.touched.clear();
  }

  // 同一朵雲不重複計次
  if (weather.touched.has(i)) return;

  weather.touched.add(i);
  weather.lastTapAt = now;

  const count = weather.touched.size;

  // 第一下只播放雲朵反應，不透露隱藏機制
if (count === 1) return;

  // 第二下開始小雨；3~5 中雨；6~9 雷雨
  if (count >= 6) {
    weather.kind = 'storm';
    weather.lightningIn = rnd(1.2, 2.4);
  } else if (count >= 3) {
    weather.kind = 'medium';
  } else {
    weather.kind = 'light';
  }

  // 有效觸發後才開始倒數
  weather.remaining = rnd(25, 45);
  weather.rainbowTime = 0;
  weather.rainbowPulse = 0;

}

// ===== 開發者專用天氣測試 =====

window.worldTestWeather = kind => {

  if (!VB_IS_DEV) return false;

  if (kind === 'rainbow') {

    weather.kind = 'none';
    weather.remaining = 0;
    weather.rainbowTime = 25;
    weather.rainbowPulse = 1;

    const orbitPreview = window.worldCameraMode?.() === 'orbit';
    const elevation = positionRainbowInSky(orbitPreview);
    // 在開發者頁面按測試時，同時看見山稜和弧頂。
    if (orbitPreview) {
      ct.tilt = Math.PI / 2 - ct.ph + elevation / 2;
    }
  } else if (kind === 'clear') {

    weather.kind = 'none';
    weather.remaining = 0;
    weather.rainbowTime = 0;

  } else if (
    ['light', 'medium', 'storm'].includes(kind)
  ) {

    weather.kind = kind;
    weather.remaining = 32;
    weather.rainbowTime = 0;

    if (kind === 'storm') {
      weather.lightningIn = 1.5;
    }

  } else {
    return false;
  }

weather.touched.clear();
weather.lastTapAt = -Infinity;
return true;
};


// ===== 每幀更新天氣 =====

function weatherStep(dt) {

  // 生日演出期間暫停天氣
  if (bday.active) {

    weatherRain.visible = false;
    weatherRainbow.visible = false;
    rainbowHit.layers.set(1);
    weatherWetGround.material.opacity = 0;
    
    return;
  }


  // ===== 降雨倒數 =====

  if (weather.remaining > 0) {

    weather.remaining = Math.max(
      0,
      weather.remaining - dt
    );

    if (weather.remaining === 0) {

      // 白天雷雨結束，才會出現彩虹
      if (
        weather.kind === 'storm' &&
        weatherDaylight()
      ) {

         weather.rainbowTime = 25;

  positionRainbowInSky();

}

weather.kind = 'none';
weather.touched.clear();
weather.lastTapAt = -Infinity;
    }
  }


  // ===== 雨勢漸變 =====
  const rainLook =
  weather.kind === 'storm' ? {
    len: 2.15,
    lean: .26,
    opacity: .82,
    speed: 1.45
  } :
  weather.kind === 'medium' ? {
    len: 1.38,
    lean: .18,
    opacity: .64,
    speed: 1.18
  } :
  weather.kind === 'light' ? {
    len: .72,
    lean: .10,
    opacity: .42,
    speed: .96
 } : (weather.lastRainLook || {
  len: .72,
  lean: .10,
  opacity: .42,
  speed: .96
});

if (weather.kind !== 'none') {
  weather.lastRainLook = rainLook;
}
  const target =
    weather.kind === 'storm' ? 1 :
    weather.kind === 'medium' ? .70 :
    weather.kind === 'light' ? .43 : 0;

  weather.strength +=
    (target - weather.strength) *
    Math.min(1, dt * 1.9);

  weatherRain.visible =
    weather.strength > .015;

  weatherRain.material.opacity =
  rainLook.opacity * weather.strength;


  // ===== 雨滴降落 =====

  if (weatherRain.visible) {

    for (let i = 0; i < WEATHER_DROP_COUNT; i++) {

      const d = weatherDrops[i];

      d.y -= d.v *
  rainLook.speed *
  (0.72 + .36 * weather.strength) * dt;

d.x += dt * (.55 + rainLook.lean * 1.2);

      if (
        d.y < .15 ||
        Math.hypot(d.x, d.z) > 18
      ) {

        resetWeatherDrop(d);
        d.y = rnd(18, 28);
      }

      const k = i * 6;

      weatherCoords[k] = d.x;
      weatherCoords[k + 1] = d.y;
      weatherCoords[k + 2] = d.z;

      weatherCoords[k + 3] = d.x - rainLook.lean;
      weatherCoords[k + 4] = d.y + rainLook.len;
      weatherCoords[k + 5] = d.z;
    }

    weatherRainGeo.attributes
      .position.needsUpdate = true;
  }


  // ===== 地面逐漸濕潤 =====

  if (weather.strength > .04) {

    weather.wet = Math.min(
      1,
      weather.wet +
      dt * weather.strength * .075
    );

  } else {

    weather.wet = Math.max(
      0,
      weather.wet - dt / 26
    );
  }

  weatherWetGround.material.opacity =
    weather.wet * .085;

  for (let i = 0; i < 2; i++) {

    court.children[i].material.color
      .copy(courtWeatherBase[i])
      .lerp(
        courtWeatherWet[i],
        weather.wet * .18
      );
  }


  // ===== 雨天雲朵稍微變暗 =====

  for (const cloud of clouds) {

    for (const q of cloud.parts) {

      q.m.material.color
        .copy(weatherWhite)
        .lerp(
          weatherCloudGray,
          weather.strength * .72
        );
    }
  }


  // ===== 雷雨與閃電 =====

  amb.intensity = .8;

  weather.lightning = Math.max(
    0,
    weather.lightning - dt * 4
  );

  if (weather.kind === 'storm') {

    weather.lightningIn -= dt;

    if (weather.lightningIn <= 0) {

      weather.lightning = 1;
      weather.lightningIn = rnd(5, 9);
    }
  }

  if (weather.strength > .04) {

    sc.background.lerp(
      weatherSky,
      weather.strength * .26
    );
  }

  if (weather.lightning > 0) {

    sc.background.lerp(
      weatherFlashColor,
      weather.lightning * .3
    );

    amb.intensity =
      .8 + weather.lightning * .16;
  }

  sc.fog.color.copy(sc.background);


  // ===== 雨後彩虹 =====

  weather.rainbowTime = Math.max(
    0,
    weather.rainbowTime - dt
  );

  weather.rainbowPulse = Math.max(
    0,
    weather.rainbowPulse - dt * .55
  );

  const showRainbow =
    weather.rainbowTime > 0 &&
    weatherDaylight();

  const rainbowFade = showRainbow
    ? Math.min(1, weather.rainbowTime / 3)
    : 0;

  weatherRainbow.visible =
    rainbowFade > .01;

  rainbowHit.layers.set(
    showRainbow ? 0 : 1
  );

  rainbowBands.forEach((band, i) => {

    band.material.opacity =
      rainbowFade *
      (
        .24 +
        .17 * weather.rainbowPulse +
        .02 * Math.sin(clk * 1.3 + i)
      );

  });

}


// 提供原本球場呼叫
window.vbWeatherTapCloud = weatherTapCloud;
window.vbWeatherStep = weatherStep;

})();
