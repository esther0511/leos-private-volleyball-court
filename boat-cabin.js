/* 小帆船航行面板＋船艙物品（純程式）
 * 依賴：world-items.js 提供 window.VBBoatAccess。
 * 不改動第30天解鎖、船的航線或原本的方向鍵操作。
 */
(() => {
  'use strict';

  const access = window.VBBoatAccess;
  const controls = document.querySelector('#vbBoatCtrl');
  if (!access || !controls || !access.getObject()) {
    console.warn('小帆船船艙未初始化：請先載入 world-items.js 與 VBBoatAccess。');
    return;
  }

  // 與發球機一致的半透明玻璃面板
  const style = document.createElement('style');
  style.textContent = `
    #vbBoatCtrl, #vbBoatCabin {
      box-sizing:border-box;
      border:1px solid rgba(255,255,255,.42);
      border-radius:16px;
      background:rgba(29,42,80,.50);
      color:#fff;
      box-shadow:0 12px 28px rgba(10,20,45,.22);
      font:13px/1.55 system-ui,"PingFang TC",sans-serif;
      backdrop-filter:blur(8px);
      -webkit-backdrop-filter:blur(8px);
    }
    #vbBoatCtrl {
      left:calc(16px + env(safe-area-inset-left,0px));
      bottom:calc(16px + env(safe-area-inset-bottom,0px));
      width:min(242px,calc(100vw - 32px));
      padding:13px;
      user-select:none;
      -webkit-user-select:none;
    }
    #vbBoatCtrl .vb-boat-head, #vbBoatCabin .vb-boat-head {
      display:flex;align-items:center;justify-content:space-between;
      gap:10px;margin-bottom:8px;
    }
    #vbBoatCtrl .vb-boat-head strong, #vbBoatCabin .vb-boat-head strong {
      font-size:15px;letter-spacing:.08em;
    }
    #vbBoatCtrl button, #vbBoatCabin button {
      border:1px solid rgba(255,255,255,.34);
      border-radius:10px;
      background:rgba(255,255,255,.10);
      color:#fff;
      font:inherit;
      cursor:pointer;
      padding:9px;
      transition:background .18s ease,border-color .18s ease;
    }
    #vbBoatCtrl button:hover, #vbBoatCabin button:hover {
      background:rgba(255,255,255,.18);
    }
    #vbBoatCtrl button:focus-visible, #vbBoatCabin button:focus-visible {
      outline:2px solid #fff1c5;outline-offset:2px;
    }
    #vbBoatCtrl [data-exit], #vbBoatCabin [data-close] {
      display:inline-flex;align-items:center;justify-content:center;
      height:34px;min-width:34px;padding:0 10px;
      font-size:12px;font-weight:600;
    }
    #vbBoatCtrl [data-cabin] {
      display:block;width:100%;min-height:40px;margin:0 0 9px;
      font-weight:600;
    }
    #vbBoatCtrl .arrows {
      display:grid;
      grid-template-columns:repeat(3,44px);
      justify-content:center;
      gap:5px;margin:0;
    }
    #vbBoatCtrl .arrows button {
      height:40px;padding:0;font-size:21px;font-weight:600;
    }
    #vbBoatCabin {
      position:fixed;z-index:18;
      right:calc(16px + env(safe-area-inset-right,0px));
      top:calc(82px + env(safe-area-inset-top,0px));
      width:min(302px,calc(100vw - 32px));
      max-height:min(72vh,610px);
      overflow-y:auto;
      padding:14px;
      user-select:text;-webkit-user-select:text;
    }
    #vbBoatCabin[hidden] {display:none!important;}
    #vbBoatCabin .vb-boat-hint {margin:0 0 8px;font-size:12px;opacity:.85;}
    #vbBoatCabin .vb-boat-row {
      padding:10px 0;
      border-top:1px solid rgba(255,255,255,.22);
    }
    #vbBoatCabin .vb-boat-row strong {display:block;font-size:13px;margin-bottom:4px;}
    #vbBoatCabin .vb-boat-row p {font-size:12px;margin:0 0 7px;opacity:.85;}
    #vbBoatCabin button:disabled {opacity:.6;cursor:default;}
    #vbBoatCabin textarea {
      width:100%;box-sizing:border-box;
      min-height:90px;resize:vertical;
      border:1px solid rgba(255,255,255,.34);
      border-radius:10px;
      padding:10px;
      color:#fff;
      background:rgba(255,255,255,.11);
      font:13px/1.6 system-ui,"PingFang TC",sans-serif;
    }
    #vbBoatCabin textarea::placeholder {color:rgba(255,255,255,.55);}
    #vbBoatCabin .vb-boat-note {
      font-size:12px;opacity:.9;white-space:pre-wrap;overflow-wrap:anywhere;
    }
    @media(max-width:560px){
      #vbBoatCtrl {width:min(218px,calc(100vw - 32px));padding:11px;}
      #vbBoatCtrl .arrows {grid-template-columns:repeat(3,40px);}
      #vbBoatCtrl .arrows button {height:38px;}
      #vbBoatCabin {top:calc(70px + env(safe-area-inset-top,0px));max-height:50vh;}
    }
  `;
  document.head.append(style);

  // 原有按鈕移入新標題列，沿用 world-items.js 已綁定的事件。
  const originalTitle = controls.firstElementChild;
  const exitButton = controls.querySelector('[data-exit]');
  const arrows = controls.querySelector('.arrows');
  const head = document.createElement('div');
  head.className = 'vb-boat-head';
  const heading = document.createElement('strong');
  heading.textContent = '小帆船航行';
  head.append(heading, exitButton);
  originalTitle.remove();
  controls.prepend(head);
  exitButton.textContent = '離船 ×';
  exitButton.setAttribute('aria-label','返回球場');

  const cabinButton = document.createElement('button');
  cabinButton.type = 'button';
  cabinButton.dataset.cabin = '1';
  cabinButton.textContent = '查看船上物品';
  controls.insertBefore(cabinButton, arrows);

  // 本機儲存；與造訪日期分離，開發版也維持既有分區。
  const key = 'vb-boat-cabin-v1';
  let saved = {};
  try {
    saved = JSON.parse(vbStore.getItem(key) || '{}') || {};
  } catch (_) {}
  const state = {
    letter: saved.letter === true,
    bag: saved.bag === true,
    log: saved.log === true,
    notes: Array.isArray(saved.notes)
      ? saved.notes.filter(x=>typeof x === 'string').slice(0,60)
      : []
  };
  function persist() {
    try { vbStore.setItem(key, JSON.stringify(state)); }
    catch (err) { console.warn('船艙資料未能儲存',err); }
  }

  // 在現有船甲板上建立三個小模型；完全不需要 PNG。
  const art = access.getObject().art;
  const mesh = (g,w,h,d,x,y,z,color) => {
    const m = new T3.Mesh(new T3.BoxGeometry(w,h,d),
      new T3.MeshLambertMaterial({color}));
    m.position.set(x,y,z);
    g.add(m);
    return m;
  };
  const props = {};

  const envelope = new T3.Group();
  mesh(envelope,.31,.025,.22,0,0,0,0xf7f0d9);
  mesh(envelope,.085,.015,.045,0,.022,0,0xcb8f85);
  envelope.position.set(-.29,.67,-.37);
  art.add(envelope);
  props.letter = envelope;

  const bag = new T3.Group();
  mesh(bag,.33,.25,.30,0,.1,0,0x886e58);
  mesh(bag,.37,.04,.32,0,.24,0,0xa8896c);
  const handle = new T3.Mesh(
    new T3.TorusGeometry(.105,.021,6,16,Math.PI),
    new T3.MeshLambertMaterial({color:0x6e5043}));
  handle.rotation.z = Math.PI;
  handle.position.y = .33;
  bag.add(handle);
  bag.position.set(.27,.67,-.37);
  art.add(bag);
  props.bag = bag;

  const log = new T3.Group();
  mesh(log,.33,.04,.45,0,0,0,0xe9dec6);
  mesh(log,.06,.055,.46,-.145,.005,0,0x355c97);
  log.position.set(.24,.67,.36);
  log.rotation.y = -.18;
  art.add(log);
  props.log = log;

  function syncProps(){
    props.letter.visible = !state.letter;
    props.bag.visible = !state.bag;
    props.log.visible = !state.log;
  }
  syncProps();

  const cabinPanel = document.createElement('section');
  cabinPanel.id = 'vbBoatCabin';
  cabinPanel.hidden = true;
  cabinPanel.setAttribute('aria-label','船上物品');
  cabinPanel.innerHTML = `
    <div class="vb-boat-head">
      <strong>船上物品</strong>
      <button type="button" data-close aria-label="關閉">×</button>
    </div>
    <p class="vb-boat-hint">船艙裡有幾樣留下來的東西。</p>
    <div data-cabin-list></div>
  `;
  document.body.append(cabinPanel);
  const list = cabinPanel.querySelector('[data-cabin-list]');
  const closeButton = cabinPanel.querySelector('[data-close]');

  function row(title,desc,label,onClick,disabled=false){
    const item = document.createElement('div');
    item.className = 'vb-boat-row';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const p = document.createElement('p');
    p.textContent = desc;
    item.append(strong,p);
    if(label){
      const b = document.createElement('button');
      b.type='button';b.textContent=label;b.disabled=disabled;
      if(onClick) b.onclick=onClick;
      item.append(b);
    }
    list.append(item);
    return item;
  }

  function render(){
    list.replaceChildren();
    row('一封封好的信',
      state.letter ? '信封已收好，仍然保持未拆封。' : '放在甲板邊的信封。',
      state.letter ? '已收起' : '收起信封',
      ()=>pickup('letter'), state.letter);
    row('背包',
      state.bag ? '已取得。之後撿到的信紙與瓶子可以放進來。' : '一只放在船艙裡的背包。',
      state.bag ? '已取得' : '拿起背包',
      ()=>pickup('bag'),state.bag);
    row('空白航海日誌',
      state.log ? '日誌已取得，裡面還有許多空白頁。' : '一本留有許多空白頁的航海日誌。',
      state.log ? '已取得' : '拿起日誌',
      ()=>pickup('log'),state.log);

    if(state.log){
      const box = row('寫一頁日誌','自由留下文字，也可以把空白頁留作未來寫信。');
      const editor = document.createElement('textarea');
      editor.maxLength=600;
      editor.placeholder='想寫下什麼……';
      editor.setAttribute('aria-label','新的一頁航海日誌');
      const saveBtn=document.createElement('button');
      saveBtn.type='button';
      saveBtn.textContent='收進航海日誌';
      saveBtn.onclick=()=>{
        const text=editor.value.trim();
        if(!text)return;
        state.notes.unshift(text);
        state.notes=state.notes.slice(0,60);
        persist();render();
      };
      box.append(editor,saveBtn);
      state.notes.forEach((text,i)=>{
        const note = row(`日誌 · ${state.notes.length-i}`,'');
        const line=document.createElement('div');
        line.className='vb-boat-note';
        line.textContent=text;
        note.append(line);
      });
    }
  }

  function pickup(which){
    if(state[which])return;
    state[which]=true;
    persist();syncProps();render();
  }

  function close(){
    cabinPanel.hidden=true;
    arrows.style.pointerEvents='';
  }
  cabinButton.onclick=()=>{
    if(!access.isSailing())return;
    if(!cabinPanel.hidden){close();return;}
    render();
    cabinPanel.hidden=false;
    arrows.style.pointerEvents='none';
  };
  closeButton.onclick=close;
  exitButton.addEventListener('click',close);
  window.addEventListener('keydown',e=>{
    if(cabinPanel.hidden)return;
    if(e.key==='Escape'){
      e.stopImmediatePropagation();
      e.preventDefault();
      close();
    }
  },true);
  // 原本船用鍵盤偵聽在 world-items.js 中；此層打開時阻止方向操作。
  window.addEventListener('keydown',e=>{
    if(cabinPanel.hidden)return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)){
      e.stopImmediatePropagation();
    }
  },true);

  // 若透過其他方式離船（例如雙擊畫布），同步收起物品面板。
  const observer = new MutationObserver(()=>{
    if(controls.style.display === 'none')close();
  });
  observer.observe(controls,{attributes:true,attributeFilter:['style']});

  // 未來漂流瓶系統可透過此接口讀取/擴充道具存檔。
  window.VBBoatCabin = {
    getState:()=>JSON.parse(JSON.stringify(state)),
    show:()=>{if(access.isSailing()){render();cabinPanel.hidden=false;arrows.style.pointerEvents='none';}},
    hide:close
  };
})();
