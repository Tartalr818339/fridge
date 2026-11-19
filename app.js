/* 鲜知 FreshSense — 手机 App 交互逻辑（无构建步骤，原生 ES） */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const appEl = $('#app-content');
  const tabEl = $('#app-tabbar');
  const modalRoot = $('#modal-root');
  const toastRoot = $('#toast-root');

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    toastRoot.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  /* ==================== 手机 App ==================== */
  const TABS = [
    { key: 'home', icon: '🏠', label: '首页' },
    { key: 'recipes', icon: '📖', label: '食谱' },
    { key: 'restock', icon: '🛒', label: '补货' },
    { key: 'device', icon: '⚙️', label: '设备' }
  ];

  function renderApp() {
    const page = STATE.appPage;
    if (page === 'nfc') appEl.innerHTML = pageNfc();
    else if (page === 'home') appEl.innerHTML = pageHome();
    else if (page === 'fridge') appEl.innerHTML = pageFridge();
    else if (page === 'recipes') appEl.innerHTML = pageRecipes();
    else if (page === 'recipe') appEl.innerHTML = pageRecipe();
    else if (page === 'restock') appEl.innerHTML = pageRestock();
    else if (page === 'product') appEl.innerHTML = pageProduct();
    else if (page === 'cart') appEl.innerHTML = pageCart();
    else if (page === 'device') appEl.innerHTML = pageDevice();

    const active = (page === 'recipe') ? 'recipes' : (page === 'product' || page === 'cart') ? 'restock' : page;
    tabEl.innerHTML = TABS.map(t => `<button class="tab ${active === t.key ? 'active' : ''}" data-tab="${t.key}"><span class="tab-ico">${t.icon}</span>${t.label}</button>`).join('');
    $$('[data-app-route]').forEach(b => b.classList.toggle('active', b.dataset.appRoute === page));
  }

  function pageNfc() {
    const pending = STATE.restock.filter(r => r.status === '待补');
    return `<div class="nfc-hero">
        <div class="nfc-success">✓</div>
        <h2>碰一碰成功</h2>
        <p>数据来自冰箱食材库 · 与冰箱实时同源，剩余天数未重算</p>
      </div>
      <div class="result-card">
        <div class="result-card-head"><div class="rc-icon">📋</div><div><h4>补货清单</h4><p>${pending.length} 项待补货</p></div></div>
        <div class="result-card-body">
          ${pending.slice(0,3).map(r => `<div class="mini-line"><span>${r.source === '临期自动' ? '⏰' : '📝'}</span><span class="ml-name">${esc(r.name)} ×${r.suggestQty}${esc(r.unit)}</span><span class="muted">${esc(r.source)}</span></div>`).join('')}
          <button class="btn btn-primary btn-block" data-go="restock" style="margin-top:10px">查看完整清单</button>
        </div>
      </div>
      <div class="result-card">
        <div class="result-card-head"><div class="rc-icon" style="background:var(--yellow-soft)">🍳</div><div><h4>今日食谱推荐</h4><p>优先消耗临期食材</p></div></div>
        <div class="result-card-body">
          ${RECIPES.slice(0,2).map(r => `<button class="mini-line" data-recipe="${r.id}" style="width:100%;text-align:left"><span>${r.emoji}</span><span class="ml-name">${esc(r.name)} · ${r.minutes} 分钟</span><span style="color:var(--green-deep);font-size:13px">${r.expiring.length ? '消耗临期' : '查看'}</span></button>`).join('')}
        </div>
      </div>`;
  }

  function pageHome() {
    const y1 = ITEMS.filter(i => i.remainingDays === 1);
    const y2 = ITEMS.filter(i => i.remainingDays === 2);
    const layerCards = LAYERS.map((layer) => {
      const its = ITEMS.filter(i => i.layer === layer);
      return `<button class="layer-mini" data-action="app-open-layer" data-layer="${esc(layer)}">
        <div class="lm-top"><span class="lm-name">${esc(layer)}</span><span class="lm-count">${its.length} 件</span></div>
        <div class="lm-tags">${its.map(i => `<span class="lm-tag ${i.freshness}"><i></i><span>${esc(i.name)}</span><b>${i.remainingDays}天</b></span>`).join('') || '<span class="lm-tag none">暂无食材</span>'}</div>
        <span class="lm-open">查看食材 ›</span>
      </button>`;
    }).join('');
    return `<div class="app-hero">
        <h2>早上好，今天也要新鲜 🍃</h2>
        <p>冰箱共 ${ITEMS.length} 件食材 · 数据同步于 ${esc(STATE.device.lastSync)}</p>
      </div>
      <div class="alert-banner">
        <span class="ab-ico">⏰</span>
        <div class="grow"><h4>临期提醒（仅 1 天 / 2 天）</h4>
          <p>以下食材请尽快食用，系统不会提醒 3 天以上的食材。</p>
          <div class="expire-chips">
            ${y1.map(i => `<span class="expire-chip y1">🔴 ${esc(i.name)} · 临期 1 天</span>`).join('')}
            ${y2.map(i => `<span class="expire-chip y2">🟡 ${esc(i.name)} · 临期 2 天</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="sec-title">四层分区总览 <span class="more">点击卡片查看食材</span></div>
      <div class="layer-summary">${layerCards}</div>
      <div class="sec-title">快速操作</div>
      <div class="row" style="gap:10px">
        <button class="btn btn-primary grow" data-go="fridge">🥬 冰箱食材库</button>
        <button class="btn btn-ghost grow" data-go="recipes">🍳 看食谱</button>
      </div>
      <div class="row" style="gap:10px;margin-top:8px">
        <button class="btn btn-ghost grow" data-go="restock">📋 补货清单</button>
        <button class="btn btn-ghost grow" data-go="device">⚙️ 设备管理</button>
      </div>`;
  }

  // 手机端冰箱食材库：下单同步后可直接查看新入库食材
  function pageFridge() {
    const urgent = ITEMS.filter(i => i.remainingDays <= 2).length;
    const layers = LAYERS.map((layer, idx) => {
      const its = ITEMS.filter(i => i.layer === layer);
      const temp = ['冷藏保鲜 · 2~6℃', '冷藏保鲜 · 2~6℃', '冷藏保鲜 · 0~4℃', '果蔬保湿 · 4~8℃'][idx];
      const warn = its.some(i => i.remainingDays <= 2);
      return `<div class="fd-layer">
        <div class="fd-layer-head"><h4>${['❄️','🧊','🫧','🥬'][idx]} ${esc(layer)}</h4><span class="fd-temp">${temp} · ${its.length} 件</span></div>
        <div class="fd-list">
          ${its.map(i => `<div class="fd-item ${i.freshness}">
            <span class="fd-emoji">${i.icon}</span>
            <div class="fd-info">
              <div class="fd-name">${esc(i.name)} <span class="pill-tag ${i.freshness}">${FRESHNESS[i.freshness].label}</span></div>
              <div class="fd-meta">${esc(i.purchaseDate)} 购买 · 保质至 ${esc(i.expiryDate)} · ${i.quantity}${esc(i.unit)}</div>
            </div>
            <div class="fd-days ${i.freshness}"><b>${i.remainingDays}</b><small>天</small></div>
          </div>`).join('') || '<div class="muted" style="padding:8px">该层暂无食材</div>'}
        </div>
      </div>`;
    }).join('');
    return `<div class="fridge-hero">
        <h2>🥬 冰箱食材库</h2>
        <p>共 ${ITEMS.length} 件食材 · ${urgent} 件需关注 · 手机下单后自动同步入库</p>
      </div>
      <div class="temp-banner">
        <span class="temp-chip"><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--green);margin-right:4px"></i>绿 = 新鲜</span>
        <span class="temp-chip"><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--yellow);margin-right:4px"></i>黄 = 临期 2 天</span>
        <span class="temp-chip warn"><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--red);margin-right:4px"></i>红 = 临期 1 天 / 过期</span>
      </div>
      ${layers}
      <div class="al-foot">剩余天数与新鲜度由冰箱食材库同源给出，App 端不重算</div>`;
  }

  function pageRecipes() {
    return `<div class="app-hero"><h2>今日食谱</h2><p>优先推荐可消耗临期食材的菜谱</p></div>
      <div class="ai-entry" data-action="ai-open">
        <div class="ai-entry-top"><span class="ai-orb">✦</span><div><h4>AI 智能配菜</h4><p>今天想吃什么？帮你整理冰箱食材</p></div><span class="ai-arrow">›</span></div>
        <div class="ai-entry-chips"><span>番茄炒蛋</span><span>香煎三文鱼</span><span>豆腐汤</span></div>
      </div>
      <div class="sec-title">全部食谱 <span class="more">共 ${RECIPES.length} 道</span></div>
      ${RECIPES.map(r => `<button class="result-card" data-recipe="${r.id}" style="width:100%;text-align:left">
        <div style="display:flex;gap:12px;padding:12px;align-items:center">
          <div style="width:56px;height:56px;border-radius:14px;background:${r.thumb};display:grid;place-items:center;font-size:28px">${r.emoji}</div>
          <div class="grow"><div style="font-size:13px;font-weight:700">${esc(r.name)}</div>
            <div class="muted" style="margin-top:3px">⏱ ${r.minutes} 分钟 · ${r.ingredients.filter(x=>x.have).length}/${r.ingredients.length} 食材已有</div>
            ${r.expiring.length ? `<span class="pill-tag yellow" style="margin-top:5px;display:inline-block">可消耗临期：${r.expiring.map(esc).join('、')}</span>` : ''}
          </div><span style="color:var(--muted)">›</span>
        </div></button>`).join('')}`;
  }

  function pageRecipe() {
    const r = RECIPES.find(x => x.id === STATE.recipeId) || RECIPES[0];
    return `<button class="muted" data-go="recipes" style="margin-bottom:10px;font-size:13px">‹ 返回食谱列表</button>
      <div class="recipe-banner" style="background:${r.thumb}"><span class="rb-emoji">${r.emoji}</span><h2>${esc(r.name)}</h2><p>⏱ ${r.minutes} 分钟 · 5 星好评</p></div>
      ${r.expiring.length ? `<div class="expiring-tip">⏰ <span>可消耗临期食材：<b>${r.expiring.map(esc).join('、')}</b>，建议今天优先做这道菜</span></div>` : ''}
      <div class="sec-title">所需食材 <span class="more">标注「已有 / 需补充」</span></div>
      <div class="card">${r.ingredients.map(ing => `<div class="ing-item">
          <span class="ing-check ${ing.have ? 'have' : 'miss'}">${ing.have ? '✓' : '+'}</span>
          <span class="ing-name">${esc(ing.name)}</span>
          ${r.expiring.includes(ing.name) ? '<span class="pill-tag yellow">临期</span>' : ''}
          <span class="ing-flag ${ing.have ? 'have' : 'miss'}">${ing.have ? '已有' : '需补充'}</span>
        </div>`).join('')}</div>
      ${r.ingredients.some(x => !x.have) ? `<button class="btn btn-primary btn-block" data-add-missing="${r.id}" style="margin-top:12px">把缺的食材加入补货清单</button>` : ''}
      <div class="sec-title">做法步骤</div>
      <div class="card">${r.steps.map((s, i) => `<div class="step-item"><span class="step-num">${i+1}</span><span>${esc(s)}</span></div>`).join('')}</div>`;
  }

  function pageRestock() {
    const list = STATE.restock;
    const selected = list.filter(r => STATE.checked.has(r.id));
    return `<div class="app-hero"><h2>补货清单</h2><p>与冰箱食材库双向同步 · 手机可编辑</p></div>
      <div class="row" style="margin-bottom:12px;gap:6px;flex-wrap:wrap">
        <span class="pill-tag gray">来源：临期自动 / 手动 / 食谱缺料</span>
        <span class="pill-tag gray" style="margin-left:auto">${list.filter(r=>r.status==='待补').length} 项待补</span>
      </div>
      ${list.map(r => {
        const checked = STATE.checked.has(r.id);
        return `<div class="restock-item ${checked ? 'checked' : ''} ${r.status === '暂不补货' ? 'skipped' : ''}">
          <div class="r-check ${checked ? 'on' : ''}" data-action="toggle-check" data-id="${r.id}">${checked ? '✓' : ''}</div>
          <span class="r-emoji">${emojiFor(r.name)}</span>
          <div class="grow"><div class="r-name">${esc(r.name)}</div><div class="r-meta">建议 ${r.suggestQty}${esc(r.unit)} · <span class="source-tag">${esc(r.source)}</span></div></div>
          ${r.status === '已加购' ? '<span class="r-status done">已加购</span>' : r.status === '暂不补货' ? '<span class="r-status skip">暂不补货</span>' : ''}
        </div>`;
      }).join('')}
      <div class="sec-title">商品浏览 <span class="more">查看商品详情时校验冰箱库存</span></div>
      <div class="row" style="gap:8px;flex-wrap:wrap">
        ${PRODUCTS.slice(0,4).map(p => `<button class="chip" data-product="${p.sku}" style="font-size:13px">${p.emoji} ${esc(p.name)}</button>`).join('')}
      </div>
      <div class="cart-bar">
        <div class="summary-line"><span>已勾选 <b>${selected.length}</b> 项 · 购物车 ${STATE.cart.length} 件</span><span class="muted">重复购买将在加购时校验</span></div>
        <div class="row" style="gap:8px">
          <button class="btn btn-ghost grow" data-go="cart">查看购物车</button>
          <button class="btn btn-primary grow" data-action="restock-add-cart">加入购物车</button>
        </div>
      </div>`;
  }

  function pageProduct() {
    const p = PRODUCTS.find(x => x.sku === STATE.productSku) || PRODUCTS[0];
    const dup = checkDuplicate(p.sku);
    return `<button class="muted" data-go="restock" style="margin-bottom:10px;font-size:13px">‹ 返回</button>
      <div class="product-hero">${p.emoji}</div>
      <div class="product-title">${esc(p.name)}</div>
      <div class="muted" style="font-size:13px">SKU: ${p.sku}</div>
      <div class="price">¥${p.price.toFixed(2)}</div>
      ${dup && dup.hit ? `<div class="dup-banner">
          <span class="db-ico">🥬</span><div><h4>冰箱里还有这个食材</h4>
          <p>${esc(dup.name)} 仍有 ${dup.item.quantity}${esc(dup.item.unit)}，保质期至 ${esc(dup.item.expiryDate)}，新鲜度：绿色（新鲜）。</p></div>
        </div>` : dup && dup.guideRestock ? `<div class="expiring-tip">⏰ ${esc(dup.name)} 在冰箱中${dup.reason === 'yellow' ? '临期 2 天' : '临期 1 天/过期'}，建议补货，不加拦截</div>` : ''}
      <div class="card" style="margin-bottom:12px">
        <div class="muted" style="line-height:1.7">商品详情：新鲜直达，源头直采。加入购物车后将自动校验冰箱库存，避免重复购买。</div>
      </div>
      <div class="row" style="gap:8px;margin-top:12px">
        <button class="btn btn-ghost grow" data-go="cart">查看购物车</button>
        <button class="btn btn-primary grow" data-action="product-add" data-sku="${p.sku}">加入购物车</button>
      </div>`;
  }

  function pageCart() {
    const dupCount = STATE.cart.filter(c => checkDuplicate(c.sku)?.hit).length;
    return `<div class="app-hero"><h2>购物车</h2><p>共 ${STATE.cart.length} 件商品</p></div>
      ${dupCount ? `<div class="cart-top-alert">🥬 检测到 <b>${dupCount}</b> 项重复购买（冰箱中仍有新鲜库存），已行内标注。</div>` : ''}
      ${STATE.cart.length ? STATE.cart.map((c, idx) => {
        const dup = checkDuplicate(c.sku);
        return `<div class="cart-row">
          <span class="cr-emoji">${emojiFor(c.name)}</span>
          <div class="grow"><div class="cr-name">${esc(c.name)}</div>
            ${dup && dup.hit ? `<span class="cart-inline">冰箱仍有 ${dup.item.quantity}${esc(dup.item.unit)} · 绿色新鲜</span>` : ''}
          </div>
          <div class="qty-ctrl"><button data-action="cart-qty" data-idx="${idx}" data-d="-1">−</button><span>${c.qty}</span><button data-action="cart-qty" data-idx="${idx}" data-d="1">+</button></div>
        </div>`;
      }).join('') : `<div class="card" style="text-align:center;padding:30px;color:var(--muted)">购物车是空的，去补货清单看看？</div>`}
      <button class="btn btn-ghost btn-block" data-action="batch-remove" style="margin-top:10px">批量移除重复项（二期开放）</button>
      <div class="cart-bar">
        <button class="btn btn-primary btn-block" data-action="checkout">${STATE.cart.length ? '📦 确认下单 · 同步到冰箱' : '去挑点食材吧'}</button>
        <button class="btn btn-ghost btn-block" data-go="restock" style="margin-top:8px">继续逛补货清单</button>
      </div>`;
  }

  function pageDevice() {
    const d = STATE.device;
    return `<div class="app-hero"><h2>设备管理</h2><p>设备状态 · NFC 绑定 · 固件</p></div>
      <div class="device-card">
        <h3>${esc(d.name)}</h3><p>${esc(d.model)} · ID: ${esc(d.id)}</p>
        <div class="device-status">
          <div class="ds-item">在线状态<b>${d.online ? '● 在线' : '○ 离线'}</b></div>
          <div class="ds-item">电量<b>${d.battery}%</b></div>
          <div class="ds-item">最近同步<b>${esc(d.lastSync)}</b></div>
        </div>
      </div>
      <div class="setting-row"><span class="sr-ico">📶</span><div><div class="sr-title">Wi-Fi 连接</div><div class="sr-sub">${esc(d.wifi)} · 已配网</div></div><button class="mini-btn" data-action="go-pairing">重新配网</button></div>
      <div class="setting-row"><span class="sr-ico">📡</span><div><div class="sr-title">NFC 绑定</div><div class="sr-sub">${d.nfcBound ? '已绑定 · 碰一碰可用' : '未绑定 · 请靠近冰箱感应区'}</div></div><div class="switch ${d.nfcBound ? 'on' : ''}" data-action="toggle-nfc"></div></div>
      <div class="setting-row"><span class="sr-ico">⚙️</span><div><div class="sr-title">固件版本</div><div class="sr-sub">${esc(d.firmware)} · ${d.firmwareLatest ? '已是最新版本' : '有可用更新'}</div></div><span class="pill-tag green">P0 只读</span></div>
      <div class="setting-row"><span class="sr-ico">🔄</span><div><div class="sr-title">层分区设置</div><div class="sr-sub">固定四层：上层 / 中层 / 下层 / 果蔬抽屉</div></div><span class="pill-tag gray">固定</span></div>
      <button class="btn btn-ghost btn-block" data-action="simulate-nfc" style="margin-top:12px">📲 模拟 NFC 碰一碰</button>`;
  }

  function emojiFor(name) {
    const map = { '鲜鸡蛋': '🥚', '全脂牛奶': '🥛', '面条': '🍜', '柠檬': '🍋', '原味酸奶': '🥣', '三文鱼': '🐟' };
    return map[name] || '🛒';
  }
  function skuByName(name) {
    return Object.keys(PRODUCT_MAPPING).find(sku => PRODUCT_MAPPING[sku] === name);
  }

  /* ==================== 重复购买提醒弹窗 ==================== */
  let dupQueue = [];
  function showDuplicateModal(sku, fromRestockId) {
    const dup = checkDuplicate(sku);
    if (!dup || !dup.hit) return false;
    const i = dup.item;
    modalRoot.innerHTML = `<div class="modal-overlay" data-action="close-modal">
      <div class="modal-card" data-stop="1">
        <div class="modal-head">
          <div class="modal-icon">🥬</div>
          <div><h3>冰箱里还有这个食材</h3><p>重复购买提醒 · 与冰箱食材库同源</p></div>
        </div>
        <div class="dup-detail">
          检测到你已购买过「<b>${esc(dup.name)}</b>」，冰箱中仍有 <b>${i.quantity}${esc(i.unit)}</b>，
          保质期至 <b>${esc(i.expiryDate)}</b>，新鲜度：<b style="color:var(--green-deep)">绿色（新鲜）</b>。
          <div class="dd-row" style="margin-top:8px;border-top:1px dashed #D9E2DC;padding-top:8px">
            <span>剩余保质期</span><span><b style="color:var(--green-deep)">${i.remainingDays} 天</b>（≥2 天，无需补货）</span>
          </div>
        </div>
        ${dupQueue.length >= 1 ? `<div class="muted" style="margin-bottom:10px;font-size:13px">还有 ${dupQueue.length} 项待校验</div>` : ''}
        <div class="modal-actions">
          <button class="btn btn-ghost" data-action="dup-skip" data-sku="${sku}" data-rid="${fromRestockId || ''}">先不买了</button>
          <button class="btn btn-primary" data-action="dup-buy" data-sku="${sku}" data-rid="${fromRestockId || ''}">仍然购买</button>
        </div>
      </div></div>`;
    return true;
  }
  function closeModal() { modalRoot.innerHTML = ''; }

  /* ============ 下单 → 自动同步到冰箱食材库 ============ */
  function doCheckout() {
    if (!STATE.cart.length) { toast('购物车是空的'); return; }
    const synced = [];
    const filled = [];
    STATE.cart.forEach(c => {
      const newItem = purchaseToItem(c.sku);
      if (!newItem) return;
      const existing = ITEMS.find(i => i.name === newItem.name);
      if (existing) {
        existing.quantity += newItem.quantity;
        existing.purchaseDate = newItem.purchaseDate;
        existing.expiryDate = newItem.expiryDate;
        existing.remainingDays = newItem.remainingDays;
        existing.freshness = 'green';
        existing.freshPct = 100;
        existing.source = 'App 下单';
      } else {
        ITEMS.push(newItem);
      }
      synced.push(newItem);
      // 货已补齐：从补货清单移除对应项，不再显示
      STATE.restock = STATE.restock.filter(r => {
        if (r.name !== newItem.name) return true;
        STATE.checked.delete(r.id);
        if (!filled.includes(r.name)) filled.push(r.name);
        return false;
      });
    });
    STATE.cart = [];
    renderApp();
    showCheckoutModal(synced, filled);
  }

  function showCheckoutModal(synced, filled) {
    modalRoot.innerHTML = `<div class="modal-overlay" data-action="close-modal">
      <div class="modal-card checkout-modal" data-stop="1">
        <div class="ck-head">
          <div class="ck-ok">✓</div>
          <div class="grow"><h3>下单成功</h3><p>食材已自动同步到冰箱食材库</p></div>
          <button class="al-close" data-action="close-checkout" aria-label="关闭">✕</button>
        </div>
        <div class="ck-list">
          ${synced.map(i => `<div class="ck-row">
            <span class="ck-emoji">${i.icon}</span>
            <div class="grow"><div class="ck-name">${esc(i.name)} <span class="pill-tag green">已入库</span></div>
              <div class="ck-meta">${esc(i.layer)} · ${i.quantity}${esc(i.unit)} · 保质至 ${esc(i.expiryDate)}</div>
            </div>
            <span class="ck-days">${i.remainingDays}天</span>
          </div>`).join('')}
        </div>
        <div class="ck-tip">🔄 下单数据与冰箱食材库实时同步，剩余天数由冰箱端同源给出</div>
        ${filled && filled.length ? `<div class="ck-tip ck-tip-done">✅ 补货清单已自动移除 ${filled.length} 项已补齐食材：${filled.map(n => esc(n)).join('、')}</div>` : ''}
        <div class="ck-actions">
          <button class="btn btn-primary grow" data-action="view-fridge">查看冰箱食材库</button>
          <button class="btn btn-ghost grow" data-action="close-checkout">继续购物</button>
        </div>
      </div>
    </div>`;
  }

  /* ============ AI 智能配菜（食谱区） ============ */
  function aiAnalyzeRecipe(recipe) {
    const have = [], need = [];
    recipe.ingredients.forEach(ing => {
      const item = ITEMS.find(i => i.name === ing.name);
      if (item) have.push(item); else need.push(ing.name);
    });
    const expiringInRecipe = recipe.ingredients
      .filter(ing => ITEMS.some(i => i.name === ing.name && i.remainingDays <= 2))
      .map(ing => ing.name);
    return { recipe, have, need, expiringInRecipe };
  }

  function showAiModal() {
    modalRoot.innerHTML = `<div class="modal-overlay" data-action="close-modal">
      <div class="modal-card ai-modal" data-stop="1">
        <div class="ai-modal-head">
          <span class="ai-orb">✦</span>
          <div class="grow"><h3>AI 智能配菜</h3><p>告诉我今天想吃什么，帮你整理冰箱</p></div>
          <button class="al-close" data-action="close-ai" aria-label="关闭">✕</button>
        </div>
        <div class="ai-input-row">
          <input id="ai-input" class="ai-input" placeholder="例如：番茄炒蛋、想吃鱼…" />
          <button class="btn btn-primary" data-action="ai-submit">分析</button>
        </div>
        <div class="ai-chips">
          <button class="ai-chip" data-action="ai-quick" data-q="番茄炒蛋">🍳 番茄炒蛋</button>
          <button class="ai-chip" data-action="ai-quick" data-q="香煎三文鱼">🐟 香煎三文鱼</button>
          <button class="ai-chip" data-action="ai-quick" data-q="豆腐蔬菜汤">🍲 豆腐蔬菜汤</button>
          <button class="ai-chip" data-action="ai-quick" data-q="我想吃鸡蛋">🥚 我想吃鸡蛋</button>
        </div>
        <div class="ai-footnote">AI 基于冰箱食材库数据（新鲜度 / 剩余天数）分析，不重算食材状态</div>
      </div>
    </div>`;
    setTimeout(() => { const el = $('#ai-input'); if (el) el.focus(); }, 50);
  }

  function aiResolveRecipe(query) {
    const q = (query || '').trim();
    let hit = RECIPES.find(r => q && (r.name.includes(q) || q.includes(r.name)));
    if (!hit) {
      const kw = [
        [/蛋|番茄/, RECIPES[0]], [/鱼|三文鱼|海鲜/, RECIPES[1]],
        [/豆腐|汤|蔬菜/, RECIPES[2]], [/鸡蛋/, RECIPES[0]]
      ];
      for (const [re, r] of kw) if (re.test(q)) { hit = r; break; }
    }
    let recommended = false;
    if (!hit) {
      hit = RECIPES.slice().sort((a, b) => b.expiring.length - a.expiring.length)[0];
      recommended = true;
    }
    return { recipe: hit, recommended };
  }

  function renderAiResult(query) {
    const { recipe, recommended } = aiResolveRecipe(query);
    const { have, need, expiringInRecipe } = aiAnalyzeRecipe(recipe);
    const chipHtml = have.map(i => `<span class="ai-have-chip ${i.freshness}">${i.icon} ${esc(i.name)} · 剩${i.remainingDays}天</span>`).join('');
    const needHtml = need.length
      ? need.map(n => `<span class="ai-need-chip">＋ ${esc(n)}</span>`).join('')
      : '<span class="ai-none">冰箱食材齐全，无需补货 🎉</span>';
    const expiringTip = expiringInRecipe.length
      ? `<div class="ai-tip">⏰ 这道菜可消耗临期食材：<b>${expiringInRecipe.map(esc).join('、')}</b>，建议今天优先做</div>` : '';
    modalRoot.innerHTML = `<div class="modal-overlay" data-action="close-modal">
      <div class="modal-card ai-modal ai-result" data-stop="1">
        <div class="ai-modal-head">
          <span class="ai-orb">✦</span>
          <div class="grow"><h3>AI 配菜结果</h3><p>${recommended ? '没找到对应菜名，为你推荐这道' : '根据冰箱食材库数据分析完成'}</p></div>
          <button class="al-close" data-action="close-ai" aria-label="关闭">✕</button>
        </div>
        <div class="ai-dish"><span class="ai-dish-emoji">${recipe.emoji}</span><div><h4>${esc(recipe.name)}</h4><p>⏱ ${recipe.minutes} 分钟 · ${recipe.steps.length} 步完成</p></div></div>
        ${expiringTip}
        <div class="ai-sec"><h5>✅ 冰箱已有（${have.length}）</h5><div class="ai-chips-static">${chipHtml || '<span class="ai-none">暂无</span>'}</div></div>
        <div class="ai-sec"><h5>🛒 需要补充（${need.length}）</h5><div class="ai-chips-static">${needHtml}</div></div>
        <div class="ai-summary">已有 ${have.length} 样 · 需补 ${need.length} 样${expiringInRecipe.length ? ' · 可消耗临期 ' + expiringInRecipe.length + ' 样' : ''}</div>
        <div class="ai-actions">
          ${need.length ? `<button class="btn btn-primary grow" data-action="ai-add-restock" data-recipe="${recipe.id}">把需补食材加入补货清单</button>` : ''}
          <button class="btn btn-ghost grow" data-recipe="${recipe.id}" data-go-recipe="1">看详细做法</button>
        </div>
      </div>
    </div>`;
  }

  // 点击「四层分区总览」的某一层，弹出该层食材详情
  function showAppLayerModal(layer) {
    const items = ITEMS.filter(i => i.layer === layer);
    const idx = LAYERS.indexOf(layer);
    const temp = ['冷藏保鲜 · 2~6℃', '冷藏保鲜 · 2~6℃', '冷藏保鲜 · 0~4℃', '果蔬保湿 · 4~8℃'][idx];
    modalRoot.innerHTML = `<div class="modal-overlay" data-action="close-modal">
      <div class="modal-card app-layer-modal" data-stop="1">
        <div class="modal-head">
          <div class="modal-icon">${['❄️','🧊','🫧','🥬'][idx]}</div>
          <div class="grow"><h3>${esc(layer)}</h3><p>${temp} · 共 ${items.length} 件食材</p></div>
          <button class="al-close" data-action="close-app-layer" aria-label="关闭">✕</button>
        </div>
        <div class="al-list">
          ${items.map(i => `<div class="al-row ${i.freshness}">
            <span class="al-emoji">${i.icon}</span>
            <div class="al-info">
              <div class="al-name">${esc(i.name)} <span class="pill-tag ${i.freshness}">${FRESHNESS[i.freshness].label}</span></div>
              <div class="al-meta">${esc(i.purchaseDate)} 购买 · 保质至 ${esc(i.expiryDate)} · ${i.quantity}${esc(i.unit)}</div>
              <div class="al-bar"><span style="width:${i.freshPct}%;background:${FRESHNESS[i.freshness].color}"></span></div>
            </div>
            <div class="al-days ${i.freshness}"><b>${i.remainingDays}</b><small>天</small></div>
          </div>`).join('')}
        </div>
        <div class="al-foot">剩余天数与新鲜度由冰箱食材库同源给出，App 端不重算</div>
      </div>
    </div>`;
  }

  function showPairGuide() {
    modalRoot.innerHTML = `<div class="modal-overlay" data-action="close-modal">
      <div class="modal-card" data-stop="1">
        <div class="modal-head">
          <div class="modal-icon">📶</div>
          <div class="grow"><h3>重新配网指引</h3><p>按以下步骤完成设备联网</p></div>
          <button class="al-close" data-action="close-app-layer" aria-label="关闭">✕</button>
        </div>
        <div class="pair-guide">
          <div class="pg-step"><span class="pg-num">1</span><span>长按冰箱屏幕电源键 3 秒，屏幕亮起后进入配网。</span></div>
          <div class="pg-step"><span class="pg-num">2</span><span>用手机扫描屏幕二维码，连接「鲜知」配网热点，输入家庭 Wi-Fi 密码。</span></div>
          <div class="pg-step"><span class="pg-num">3</span><span>用手机背部靠近冰箱右下角 NFC 感应区，完成设备绑定。</span></div>
          <div class="pg-step"><span class="pg-num">4</span><span>四层分区（上层 / 中层 / 下层 / 果蔬抽屉）初始化完成。</span></div>
        </div>
        <div class="modal-actions"><button class="btn btn-primary btn-block" data-action="close-app-layer">知道了</button></div>
      </div>
    </div>`;
  }

  function addToCart(sku, rid) {
    const p = PRODUCTS.find(x => x.sku === sku);
    if (!p) return;
    const exist = STATE.cart.find(c => c.sku === sku);
    if (exist) exist.qty += 1;
    else STATE.cart.push({ sku, name: p.name, qty: 1, fromRestockId: rid || null });
    if (rid) {
      const r = STATE.restock.find(x => x.id === rid);
      if (r) r.status = '已加购';
    }
  }
  function processDupQueue() {
    if (!dupQueue.length) { renderApp(); toast('已加入购物车'); return; }
    const next = dupQueue.shift();
    if (!showDuplicateModal(next.sku, next.rid)) processDupQueue();
  }

  /* ==================== 事件绑定 ==================== */
  document.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');

    if (actionEl) {
      const a = actionEl.dataset.action;
      if (a === 'close-modal') {
        if (e.target.closest('[data-stop]')) return;
        closeModal(); return;
      }
      if (a === 'app-open-layer') { showAppLayerModal(actionEl.dataset.layer); return; }
      if (a === 'close-app-layer' || a === 'close-ai' || a === 'close-checkout') { closeModal(); return; }
      if (a === 'checkout') { doCheckout(); return; }
      if (a === 'view-fridge') { closeModal(); STATE.appPage = 'fridge'; renderApp(); toast('已为你打开冰箱食材库，新食材已入库'); return; }
      if (a === 'ai-open') { showAiModal(); return; }
      if (a === 'ai-quick') { renderAiResult(actionEl.dataset.q); return; }
      if (a === 'ai-submit') {
        const q = ($('#ai-input') && $('#ai-input').value) || '';
        renderAiResult(q); return;
      }
      if (a === 'ai-add-restock') {
        const r = RECIPES.find(x => x.id === actionEl.dataset.recipe);
        const { need } = aiAnalyzeRecipe(r);
        let added = 0;
        need.forEach(n => {
          if (!STATE.restock.some(rs => rs.name === n)) {
            STATE.restock.push({ id: 'rs-' + Date.now() + '-' + (added++), name: n, suggestQty: 1, unit: '份', source: '食谱缺料', status: '待补' });
          }
        });
        closeModal(); STATE.appPage = 'restock'; renderApp();
        toast(added ? ('已把 ' + added + ' 样食材加入补货清单') : '所需食材已在补货清单中');
        return;
      }
      if (a === 'simulate-nfc') {
        STATE.appPage = 'nfc'; renderApp();
        toast('NFC 碰一碰成功，已拉起结果页'); return;
      }
      if (a === 'go-pairing') { showPairGuide(); return; }
      if (a === 'toggle-nfc') { STATE.device.nfcBound = !STATE.device.nfcBound; renderApp(); toast(STATE.device.nfcBound ? 'NFC 绑定成功' : '已解绑 NFC'); return; }
      if (a === 'toggle-check') {
        const id = actionEl.dataset.id;
        if (STATE.checked.has(id)) STATE.checked.delete(id); else STATE.checked.add(id);
        renderApp(); return;
      }
      if (a === 'restock-add-cart') {
        const checkedIds = Array.from(STATE.checked);
        if (!checkedIds.length) { toast('请先勾选补货项'); return; }
        dupQueue = [];
        checkedIds.forEach(id => {
          const r = STATE.restock.find(x => x.id === id);
          if (!r || r.status === '暂不补货') return;
          const sku = skuByName(r.name);
          if (!sku) return;
          const dup = checkDuplicate(sku);
          if (dup && dup.hit) dupQueue.push({ sku, rid: r.id });
          else { addToCart(sku, r.id); STATE.checked.delete(id); }
        });
        processDupQueue(); return;
      }
      if (a === 'product-add') {
        const sku = actionEl.dataset.sku;
        const dup = checkDuplicate(sku);
        if (dup && dup.hit) { dupQueue = [{ sku, rid: null }]; processDupQueue(); }
        else { addToCart(sku, null); renderApp(); toast('已加入购物车'); }
        return;
      }
      if (a === 'dup-skip' || a === 'dup-buy') {
        const { sku, rid } = actionEl.dataset;
        if (rid) STATE.checked.delete(rid);
        if (a === 'dup-buy') addToCart(sku, rid || null);
        else {
          const ci = STATE.cart.findIndex(c => c.sku === sku);
          if (ci >= 0) STATE.cart.splice(ci, 1);
          if (rid) { const r = STATE.restock.find(x => x.id === rid); if (r) r.status = '暂不补货'; }
        }
        closeModal();
        if (dupQueue.length) processDupQueue();
        else { renderApp(); toast(a === 'dup-buy' ? '已加入购物车' : '已移出购物车，标记暂不补货'); }
        return;
      }
      if (a === 'cart-qty') {
        const idx = +actionEl.dataset.idx;
        STATE.cart[idx].qty += +actionEl.dataset.d;
        if (STATE.cart[idx].qty <= 0) STATE.cart.splice(idx, 1);
        renderApp(); return;
      }
      if (a === 'batch-remove') { toast('批量移除重复项将在二期开放'); return; }
    }

    const appRouteBtn = e.target.closest('[data-app-route]');
    if (appRouteBtn) { STATE.appPage = appRouteBtn.dataset.appRoute; renderApp(); return; }
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) { STATE.appPage = tabBtn.dataset.tab; renderApp(); return; }
    const goBtn = e.target.closest('[data-go]');
    if (goBtn) { STATE.appPage = goBtn.dataset.go; renderApp(); return; }
    const recipeBtn = e.target.closest('[data-recipe]');
    if (recipeBtn) { closeModal(); STATE.recipeId = recipeBtn.dataset.recipe; STATE.appPage = 'recipe'; renderApp(); return; }
    const addMissingBtn = e.target.closest('[data-add-missing]');
    if (addMissingBtn) {
      const r = RECIPES.find(x => x.id === addMissingBtn.dataset.addMissing);
      let n = 0;
      r.ingredients.filter(x => !x.have).forEach(ing => {
        if (!STATE.restock.some(rs => rs.name === ing.name)) {
          STATE.restock.push({ id: 'rs-' + Date.now() + '-' + (n++), name: ing.name, suggestQty: 1, unit: '份', source: '食谱缺料', status: '待补' });
        }
      });
      renderApp(); toast('已把缺失食材加入补货清单'); return;
    }
    const productLine = e.target.closest('[data-product]');
    if (productLine) { STATE.productSku = productLine.dataset.product; STATE.appPage = 'product'; renderApp(); return; }
  });

  $('#btn-reset').addEventListener('click', () => {
    STATE.restock = RESTOCK_ITEMS.map(x => ({ ...x }));
    STATE.cart = []; STATE.checked = new Set(); STATE.device = { ...DEVICE };
    STATE.appPage = 'home';
    renderApp(); toast('演示数据已重置');
  });

  renderApp();
})();
