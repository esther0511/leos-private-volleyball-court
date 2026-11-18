/* 排球場｜小帆船第二階段：背包、信封、航海日誌、空白紙
 * 需在 world-items.js 之後載入，取代 boat-cabin.js（不可同時載入）。
 * 保留 vb-boat-cabin-v1 舊資料：letter / bag / log / notes。
 */
(() => {
  'use strict';
  const access = window.VBBoatAccess;
  const controls = document.querySelector('#vbBoatCtrl');
  const boat = access?.getObject?.();
  const arrows = controls?.querySelector('.arrows');
  const exitButton = controls?.querySelector('[data-exit]');
  if (!boat || !controls || !arrows || !exitButton || !window.vbStore && typeof vbStore === 'undefined') {
    console.warn('[boat-cabin-v2] 缺少小帆船或儲存接口。');
    return;
  }
  if (controls.dataset.cabinVersion === '2') return;
  controls.dataset.cabinVersion = '2';

  const KEY = 'vb-boat-cabin-v1';
  const TOTAL_PAGES = 100;
  // 第一封信的正文，等故事定稿後再填入這裡。
  const FIRST_LETTER_TEXT = '';
  const MAX_TEXT = 1200;
  const limit = (s, max = MAX_TEXT) => typeof s === 'string' ? s.slice(0, max) : '';
  const safeInt = (v, lo, hi, fallback) => Number.isInteger(v) && v >= lo && v <= hi ? v : fallback;
  const newId = () => 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  const clone = v => JSON.parse(JSON.stringify(v));
  let saved = {};
  try { saved = JSON.parse(vbStore.getItem(KEY) || '{}') || {}; } catch (_) {}
  if (!saved || Array.isArray(saved) || typeof saved !== 'object') saved = {};

  // v1 只有 notes:string[]；v2 轉成可翻閱、可編輯的頁面，不丟棄舊文字。
  const legacy = Array.isArray(saved.notes) ? saved.notes.filter(v => typeof v === 'string').slice(0, 100) : [];
  const validEntries = Array.isArray(saved.entries)
    ? saved.entries.filter(e => e && typeof e === 'object' && typeof e.text === 'string').slice(0, TOTAL_PAGES)
    : null;
  const entries = validEntries
    ? validEntries.map((e, i) => ({ id: limit(e.id, 70) || `old-${i}`, text: limit(e.text), at: safeInt(e.at, 0, 9999999999999, 0) }))
    : legacy.map((text, i) => ({ id: `legacy-${i}`, text: limit(text), at: 0 }));
  const validSheets = Array.isArray(saved.sheets)
    ? saved.sheets.filter(s => s && typeof s === 'object' && typeof s.text === 'string').slice(0, TOTAL_PAGES)
      .map((s, i) => ({ id: limit(s.id, 70) || `sheet-${i}`, text: limit(s.text), at: safeInt(s.at, 0, 9999999999999, 0) }))
    : [];
  const remainingFallback = Math.max(0, TOTAL_PAGES - entries.length - validSheets.length);
  const state = {
    letter: saved.letter === true,
    bag: saved.bag === true,
    log: saved.log === true,
    letterOpened: saved.letterOpened === true,
    entries,
    sheets: validSheets,
    pagesRemaining: safeInt(saved.pagesRemaining, 0, TOTAL_PAGES, remainingFallback),
    // 預留未來漂流瓶模組的收藏資料；此階段不生成故事瓶。
    letters: Array.isArray(saved.letters) ? saved.letters.filter(l => l && typeof l === 'object' && typeof l.text === 'string').slice(0, 100)
      .map(l => ({ id: limit(l.id,70), text: limit(l.text,4000), sender: limit(l.sender,100) })) : [],
    bottles: Array.isArray(saved.bottles) ? saved.bottles.filter(b => b && typeof b === 'object' && typeof b.id === 'string').slice(0, 100)
      .map(b => ({ id: limit(b.id,70), text: limit(b.text,MAX_TEXT) })) : [],
    // 單獨記錄撿過的瓶子：之後即使把空瓶放回海上也不會重刷。    
    collectedBottleIds: Array.isArray(saved.collectedBottleIds)
      ? [...new Set(
        saved.collectedBottleIds.filter(
          x => typeof x === 'string' && x.length <= 70
        )
      )].slice(0, 500)
    : []
  };
  // 以原本的 key 儲存；也保留 notes 以便舊版讀取。

  const persist = () => {
    const data = { ...state, version: 2, notes: state.entries.map(e => e.text) };
    try { vbStore.setItem(KEY, JSON.stringify(data)); return true; }
    catch (err) { console.error('[boat-cabin-v2] 儲存失敗', err); return false; }
  };

  const css = document.createElement('style');
  css.textContent = `
    #vbBoatCtrl, #vbBoatCabin {
      box-sizing:border-box;border:1px solid rgba(255,255,255,.42);
      border-radius:16px;background:rgba(29,42,80,.50);color:#fff;
      box-shadow:0 12px 28px rgba(10,20,45,.22);
      font:13px/1.55 system-ui,'PingFang TC',sans-serif;
      backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    }
    #vbBoatCtrl {left:calc(16px + env(safe-area-inset-left,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));
      width:min(242px,calc(100vw - 32px));padding:13px;user-select:none;-webkit-user-select:none;}
    #vbBoatCtrl .vb-boat-head, #vbBoatCabin .vb-boat-head {display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px;}
    #vbBoatCtrl .vb-boat-head strong, #vbBoatCabin .vb-boat-head strong {font-size:15px;letter-spacing:.08em;}
    #vbBoatCtrl button, #vbBoatCabin button, #vbBagButton {
      border:1px solid rgba(255,255,255,.34);border-radius:10px;background:rgba(255,255,255,.10);
      color:#fff;font:inherit;cursor:pointer;padding:9px;transition:background .18s ease,border-color .18s ease;
    }
    #vbBoatCtrl button:hover, #vbBoatCabin button:hover, #vbBagButton:hover {background:rgba(255,255,255,.19);}
    #vbBoatCtrl button:focus-visible, #vbBoatCabin button:focus-visible, #vbBagButton:focus-visible {outline:2px solid #fff1c5;outline-offset:2px;}
    #vbBoatCtrl [data-exit], #vbBoatCabin [data-close] {display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:4px 10px;font-size:12px;font-weight:600;}
    #vbBoatCtrl [data-cabin] {display:block;width:100%;margin:0 0 9px;min-height:40px;font-weight:600;}
    #vbBoatCtrl .arrows {display:grid;grid-template-columns:repeat(3,44px);justify-content:center;gap:5px;margin:0;}
    #vbBoatCtrl .arrows button {height:40px;padding:0;font-size:21px;font-weight:600;}
    #vbBagButton {position:fixed;z-index:18;top:calc(19px + env(safe-area-inset-top,0px));
      right:calc(82px + env(safe-area-inset-right,0px));height:43px;min-width:53px;padding:6px 9px;
      border-radius:999px;border-color:rgba(255,255,255,.52);background:rgba(29,42,80,.26);
      backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font:600 13px system-ui,'PingFang TC',sans-serif;}
    #vbBagButton[hidden] {display:none!important;}
    #vbBoatCabin {position:fixed;z-index:19;right:calc(16px + env(safe-area-inset-right,0px));
      top:calc(82px + env(safe-area-inset-top,0px));width:min(336px,calc(100vw - 32px));
      max-height:min(77dvh,680px);overflow-y:auto;padding:15px;user-select:text;-webkit-user-select:text;}
    #vbBoatCabin[hidden] {display:none!important;}
    #vbBoatCabin .vb-hint {margin:0 0 10px;font-size:12px;opacity:.83;line-height:1.6;}
    #vbBoatCabin .vb-row {padding:11px 0;border-top:1px solid rgba(255,255,255,.2);}
    #vbBoatCabin .vb-row strong {display:block;margin-bottom:3px;font-size:13px;}
    #vbBoatCabin .vb-row p {font-size:12px;margin:0 0 8px;opacity:.87;}
    #vbBoatCabin .vb-tabs {display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin:6px 0 12px;}
    #vbBoatCabin .vb-tabs button {padding:8px 3px;font-size:12px;}
    #vbBoatCabin .vb-tabs button[aria-selected="true"] {background:rgba(224,161,118,.36);border-color:rgba(255,232,196,.9);}
    #vbBoatCabin .vb-tools {display:flex;flex-wrap:wrap;gap:7px;margin:8px 0;}
    #vbBoatCabin .vb-tools button {flex:1;min-width:75px;}
    #vbBoatCabin button:disabled {opacity:.4;cursor:not-allowed;}
    #vbBoatCabin textarea {display:block;box-sizing:border-box;width:100%;min-height:132px;resize:vertical;
      padding:11px;border-radius:10px;border:1px solid rgba(255,255,255,.35);color:#293850;
      background:#f9f1df;font:14px/1.7 system-ui,'PingFang TC',sans-serif;user-select:text;-webkit-user-select:text;}
    #vbBoatCabin textarea::placeholder {color:#77756f;}
    #vbBoatCabin .vb-paper {padding:14px 13px;border-radius:9px;background:#f9f1df;color:#263653;
      white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.75;min-height:66px;user-select:text;}
    #vbBoatCabin .vb-count {font-size:12px;color:#ffe4ba;}
    @media(max-width:560px) {
      #vbBoatCtrl {width:min(218px,calc(100vw - 32px));padding:11px;}
      #vbBoatCtrl .arrows {grid-template-columns:repeat(3,40px);}
      #vbBoatCtrl .arrows button {height:38px;}
      #vbBoatCabin {top:calc(73px + env(safe-area-inset-top,0px));max-height:calc(100dvh - 95px);}
      #vbBagButton {right:calc(80px + env(safe-area-inset-right,0px));}
    }
  `;
  document.head.append(css);

  // 不重綁舊帆船按鍵，只改用相同視覺與增加船艙入口。
  const originalTitle = controls.firstElementChild;
  const head = document.createElement('div');
  head.className = 'vb-boat-head';
  const heading = document.createElement('strong');
  heading.textContent = '小帆船航行';
  head.append(heading, exitButton);
  if (originalTitle && originalTitle !== exitButton) originalTitle.remove();
  controls.prepend(head);
  exitButton.textContent = '離船 ×';
  exitButton.setAttribute('aria-label', '返回球場');
  const cabinButton = document.createElement('button');
  cabinButton.type = 'button';
  cabinButton.dataset.cabin = '1';
  cabinButton.textContent = '查看船上物品';
  controls.insertBefore(cabinButton, arrows);

  const bagButton = document.createElement('button');
  bagButton.id = 'vbBagButton';
  bagButton.type = 'button';
  bagButton.textContent = '背包';
  bagButton.setAttribute('aria-label', '打開個人背包');
  bagButton.hidden = !state.bag;
  document.body.append(bagButton);

  // 船上可見的實體物品；已取走便隱藏，不使用 PNG。
  const mesh = (g,w,h,d,x,y,z,color) => {
    const m = new T3.Mesh(new T3.BoxGeometry(w,h,d),new T3.MeshLambertMaterial({color}));
    m.position.set(x,y,z);g.add(m);return m;
  };
  const props = {};
  const envelope = new T3.Group();
  mesh(envelope,.31,.025,.22,0,0,0,0xf7f0d9);
  mesh(envelope,.085,.015,.045,0,.022,0,0xcb8f85);
  envelope.position.set(-.29,.67,-.37);boat.art.add(envelope);props.letter = envelope;
  const bag = new T3.Group();
  mesh(bag,.33,.25,.30,0,.1,0,0x886e58);
  mesh(bag,.37,.04,.32,0,.24,0,0xa8896c);
  const handle = new T3.Mesh(new T3.TorusGeometry(.105,.021,6,16,Math.PI),new T3.MeshLambertMaterial({color:0x6e5043}));
  handle.rotation.z = Math.PI;handle.position.y = .33;bag.add(handle);
  bag.position.set(.27,.67,-.37);boat.art.add(bag);props.bag = bag;
  const log = new T3.Group();
  mesh(log,.33,.04,.45,0,0,0,0xe9dec6);
  mesh(log,.06,.055,.46,-.145,.005,0,0x355c97);
  log.position.set(.24,.67,.36);log.rotation.y = -.18;boat.art.add(log);props.log = log;
  const syncProps = () => { for (const id of ['letter','bag','log']) props[id].visible = !state[id];bagButton.hidden = !state.bag; };
  syncProps();

  const panel = document.createElement('section');
  panel.id = 'vbBoatCabin';panel.hidden = true;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-label','船艙與背包');
  panel.innerHTML = `<div class="vb-boat-head"><strong data-title>船上物品</strong>
    <button type="button" data-close aria-label="關閉面板">×</button></div><div data-content></div>`;
  document.body.append(panel);
  const content = panel.querySelector('[data-content]');
  const title = panel.querySelector('[data-title]');
  let view = 'boat', tab = 'letters', entryIndex = 0, sheetIndex = 0;
  let seenSailing = false;
  const button = (text, fn, disabled=false) => {
    const b=document.createElement('button');b.type='button';b.textContent=text;b.disabled=disabled;
    if(fn)b.addEventListener('click',fn);return b;
  };
  const el = (tag, klass, text) => {
    const a=document.createElement(tag);if(klass)a.className=klass;if(text!==undefined)a.textContent=text;return a;
  };
  const hint = text => content.append(el('p','vb-hint',text));
  const row = (name, description) => {
    const r=el('div','vb-row');r.append(el('strong','',name));
    if(description)r.append(el('p','',description));content.append(r);return r;
  };
  const tools = host => {const d=el('div','vb-tools');host.append(d);return d;};
  const picked = id => {
    if(state[id])return;
    state[id]=true;persist();syncProps();render();
  };

  function renderBoat() {
    hint('船艙裡留下了一些東西。');
    for (const [id,name,desc,verb] of [
      ['letter','一封信','一封還未拆開的信。','收起信封'],
      ['bag','背包','可以裝信紙、空白紙和日後撿到的瓶子。','拿起背包'],
      ['log','航海日誌','裡面還有許多空白頁。','拿起日誌']
    ]) {
      const r=row(name, state[id] ? '已收進物品。' : desc);
      const wrap=tools(r);
      wrap.append(button(state[id]?'已取得':verb,()=>picked(id),state[id]));
    }
    if(state.bag){
      const wrap=tools(content);
      wrap.append(button('打開背包',()=>{view='bag';tab='letters';render();}));
    }
  }
  function renderLetters() {
    if(state.letter){
      const r=row('船上找到的信',state.letterOpened?'已拆封，可再次閱讀。':'目前還是封好的。');
      tools(r).append(button(state.letterOpened?'閱讀':'拆開信封',()=>{
        state.letterOpened=true;persist();view='letter';render();
      }));
    }
    if(state.letters.length){
      for(const letter of state.letters){
        const r=row(letter.sender || '一封漂來的信','已收藏');
        tools(r).append(button('閱讀',()=>{view='found-letter';panel.dataset.letterId=letter.id;render();}));
      }
    }
    if(!state.letter && !state.letters.length)hint('目前還沒有收藏的信件。');
  }
  function renderFirstLetter() {
    const r=row('船上找到的信','');
    r.append(el('div','vb-paper',FIRST_LETTER_TEXT || '（這封信的正文尚未加入，之後會放入正式故事文字。）'));
    tools(r).append(button('返回信件',()=>{view='bag';tab='letters';render();}));
  }
  function renderFoundLetter() {
    const letter=state.letters.find(l=>l.id===panel.dataset.letterId);
    const r=row(letter?.sender || '一封信','');
    r.append(el('div','vb-paper',letter?.text || ''));
    tools(r).append(button('返回信件',()=>{view='bag';tab='letters';render();}));
  }
  function renderJournal() {
    if(!state.log){hint('航海日誌還留在船上。');return;}
    hint(`尚有 ${state.pagesRemaining} 頁空白紙。日誌每頁文字會自動保存在這台裝置。`);
    const bar=tools(content);
    bar.append(button('寫新的一頁',()=>{
      if(state.pagesRemaining<=0 || state.entries.length>=TOTAL_PAGES)return;
      state.pagesRemaining--;state.entries.unshift({id:newId(),text:'',at:Date.now()});
      entryIndex=0;persist();render();
    },state.pagesRemaining===0 || state.entries.length>=TOTAL_PAGES));
    bar.append(button('取出一張空白紙',()=>{
      if(state.pagesRemaining<=0 || state.sheets.length>=TOTAL_PAGES)return;
      state.pagesRemaining--;state.sheets.unshift({id:newId(),text:'',at:Date.now()});
      sheetIndex=0;persist();tab='sheets';render();
    },state.pagesRemaining===0 || state.sheets.length>=TOTAL_PAGES));
    if(state.entries.length===0){hint('這本日誌目前還沒有寫過的頁面。');return;}
    entryIndex=Math.min(entryIndex,state.entries.length-1);
    const entry=state.entries[entryIndex];
    const r=row(`第 ${state.entries.length-entryIndex} 頁`,`${entryIndex+1} / ${state.entries.length}`);
    const box=el('textarea');box.maxLength=MAX_TEXT;
    box.value=entry.text;box.placeholder='在這一頁留下文字……';
    box.setAttribute('aria-label','航海日誌內容');
    box.addEventListener('input',()=>{entry.text=box.value;persist();});
    r.append(box);
    const turn=tools(r);
    turn.append(button('←',()=>{entryIndex--;render();},entryIndex===0));
    turn.append(button('→',()=>{entryIndex++;render();},entryIndex>=state.entries.length-1));
  }
  function renderSheets() {
    if(!state.log){hint('取得航海日誌後，才能從裡面取出紙張。');return;}
    if(!state.sheets.length){hint('背包裡沒有取出的紙張。可以從航海日誌取一頁。');
      tools(content).append(button('打開航海日誌',()=>{tab='journal';render();}));return;}
    sheetIndex=Math.min(sheetIndex,state.sheets.length-1);
    const sheet=state.sheets[sheetIndex];
    const r=row(`取出的紙張 ${sheetIndex+1} / ${state.sheets.length}`,'可以保持空白，也可以先寫好文字；未來再放進漂流瓶。');
    const box=el('textarea');box.maxLength=MAX_TEXT;box.value=sheet.text;
    box.placeholder='想寫給誰，或單純留下什麼……';
    box.setAttribute('aria-label','紙張文字');
    box.addEventListener('input',()=>{sheet.text=box.value;persist();});
    r.append(box);
    const turn=tools(r);
    turn.append(button('←',()=>{sheetIndex--;render();},sheetIndex===0));
    turn.append(button('→',()=>{sheetIndex++;render();},sheetIndex>=state.sheets.length-1));
  }
  function renderBottles() {
    if(!state.bottles.length){hint('背包裡還沒有瓶子。以後出航時，可能會撿到漂流瓶或空瓶。');return;}
    state.bottles.forEach((b,i)=>row(`瓶子 ${i+1}`,b.text?'裡面放著一張紙。':'空瓶子'));
  }
  function renderBag() {
    hint('這些物品可以帶離小帆船，隨時回來查看。');
    const tabs=el('div','vb-tabs');tabs.setAttribute('role','tablist');
    for (const [id,name] of [['letters','信件'],['journal','日誌'],['sheets','紙張'],['bottles','瓶子']]) {
      const b=button(name,()=>{tab=id;render();});b.setAttribute('role','tab');b.setAttribute('aria-selected',String(tab===id));
      tabs.append(b);
    }
    content.append(tabs);
    if(tab==='letters')renderLetters();
    else if(tab==='journal')renderJournal();
    else if(tab==='sheets')renderSheets();
    else renderBottles();
  }
  function render() {
    content.replaceChildren();
    title.textContent=view==='boat'?'船上物品':view==='bag'?'我的背包':'閱讀信件';
    if(view==='boat')renderBoat();
    else if(view==='bag')renderBag();
    else if(view==='letter')renderFirstLetter();
    else renderFoundLetter();
  }
  function close() {panel.hidden=true;arrows.style.pointerEvents='';}
  function open(which='bag') {
    if(which==='boat' && !access.isSailing())return;
    if(which==='bag' && !state.bag)return;
    view=which;tab='letters';
    if(access.isSailing())access.pauseControls?.();
    render();panel.hidden=false;arrows.style.pointerEvents='none';
  }
  cabinButton.addEventListener('click',()=>{
    if(!access.isSailing())return;
    if(!panel.hidden){close();return;}
    open('boat');
  });
  bagButton.addEventListener('click',()=>{
    if(!panel.hidden){close();return;}
    open('bag');
  });
  panel.querySelector('[data-close]').addEventListener('click',close);
  exitButton.addEventListener('click',close);
  // 船艙打開後，鍵盤不會同時控制帆船或觸發其他球場操作。
  window.addEventListener('keydown',e=>{
    if(panel.hidden)return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D',' ','Enter'].includes(e.key)){
      if(!['TEXTAREA','INPUT'].includes(document.activeElement?.tagName))e.preventDefault();
      e.stopImmediatePropagation();
    }
  },true);
  // 離開特殊視角時若船艙還開著，收起面板；背包在陸地開啟不受影響。
  const observer=new MutationObserver(()=>{
    if(controls.style.display==='none' && view==='boat')close();
  });
  observer.observe(controls,{attributes:true,attributeFilter:['style']});

  // 公開接口保留原始方法；後續漂流瓶可以直接與同一份存檔接軌。
  window.VBBoatCabin={
    getState:()=>clone(state),
    show:()=>open('boat'),
    hide:close,
    openBackpack:()=>open('bag'),
    isOpen:()=>!panel.hidden,
    addLetter:(id,text,sender='')=>{
      if(!state.bag || typeof id!=='string' || !id || typeof text!=='string')return false;
      if(state.letters.some(l=>l.id===id))return false;
      state.letters.push({id:limit(id,70),text:limit(text,4000),sender:limit(sender,100)});
      return persist();
    },
    addBottle:(id,text='')=>{
      if(!state.bag || typeof id!=='string' || !id || typeof text!=='string')return false;
      if(state.bottles.some(b=>b.id===id))return false;
      state.bottles.push({id:limit(id,70),text:limit(text)});
      return persist();
    },
    // 只提供讀取，目前不消耗紙張；第三／四階段再加上確認裝瓶流程。
    hasCollectedBottle: id =>
  state.collectedBottleIds.includes(id),

markCollectedBottle: id => {
  if (typeof id !== 'string' || !id || id.length > 70)
    return false;

  if (!state.collectedBottleIds.includes(id))
    state.collectedBottleIds.push(id);

  state.collectedBottleIds =
    state.collectedBottleIds.slice(-500);

  return persist();
},
    listSheets:()=>clone(state.sheets)
  };
})();
