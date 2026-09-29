import { catalog, catalogBrands, catalogEntry, findCatalog, sceneSuggestions } from './catalog.js';
import { requestUpdate } from './updates.js';
import { cities, WEATHER_KEY, fetchWeather, validPlace, isFreshWeather } from './weather.js';
import { wearingPlan } from './wearing.js';
import { scentNotes } from './scent-notes.js';
import { shopping, atomizers, mapLink, checkedAt } from './shopping.js';
import { perfumes, seasons, weathers, scenes, statuses } from './data.js';
import { initialState, normalizeState, STORAGE_KEY, ranked, suitability } from './core.js';

let catalogFilters = {brand:'all',query:'',status:'all'}, catalogPage = 0;
const $ = s => document.querySelector(s);
const escape = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let state = initialState(), storageProblem = '', filter = 'all', matrixMode = 'season', offlineReady = false, pendingWorker, updateRequested = false, controllerChanged = false;
try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) state = normalizeState(JSON.parse(raw)); }
catch { storageProblem = '本机记录暂时无法读取。原记录未被覆盖，请先导出原始记录留存。'; }
let weatherState = { mode: 'live', place: cities.guangzhou, current: null }, weatherLoading = false, weatherError = '', weatherRequest = 0;
try {
  const stored = JSON.parse(localStorage.getItem(WEATHER_KEY) || 'null');
  if (stored) {
    weatherState.mode = stored.mode === 'manual' ? 'manual' : 'live';
    weatherState.place = validPlace(stored.place);
    const w = stored.current;
    if (w && Number.isFinite(w.temp) && Math.abs(w.temp) <= 60 && Number.isFinite(w.humidity) && w.humidity >= 0 && w.humidity <= 100 && weathers.includes(w.weather) && Number.isFinite(w.observedAt) && Number.isFinite(w.fetchedAt) && w.place === weatherState.place.label) weatherState.current = w;
  }
} catch { /* Weather can be fetched again without touching perfume records. */ }
function saveWeather() { try { localStorage.setItem(WEATHER_KEY, JSON.stringify(weatherState)); } catch { /* In-memory weather remains usable. */ } }
function effectiveConditions() {
  const w = weatherState.mode === 'live' && weatherState.current;
  return w ? { ...state.conditions, temp: w.temp, weather: w.weather, humidity: w.humidity, apparent: w.apparent } : state.conditions;
}
function recommendations() { return ranked({ ...state, conditions: effectiveConditions() }); }
async function refreshWeather() {
  if (weatherState.mode !== 'live') return;
  const request = ++weatherRequest; weatherLoading = true; weatherError = ''; render();
  try { const value = await fetchWeather(weatherState.place); if (request !== weatherRequest) return; weatherState.current = value; saveWeather(); }
  catch { if (request !== weatherRequest) return; weatherError = navigator.onLine ? '天气更新未成功，请重试或改用手动条件。' : '当前离线，联网后可更新天气。'; }
  finally { if (request === weatherRequest) { weatherLoading = false; if (!$('#detail').open) render(); } }
}
function weatherPanel() {
  const w = weatherState.current, live = weatherState.mode === 'live';
  const stamp = w ? new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(w.observedAt)) : '';
  return `<section class="live-weather"><div class="weather-controls"><label class="sr-only" for="weather-city">天气城市</label><select id="weather-city">${Object.entries(cities).map(([k,v]) => `<option value="${k}" ${weatherState.place.label === v.label ? 'selected' : ''}>${v.label}</option>`).join('')}${weatherState.place.label === '当前位置附近' ? '<option value="nearby" selected>当前位置附近</option>' : ''}</select><button id="refresh-weather" ${weatherLoading ? 'disabled' : ''}>${weatherLoading ? '正在更新…' : '更新天气'}</button><button id="locate-weather">用当前位置</button></div><div class="weather-reading">${live && w ? `<strong>${w.temp}°</strong><span>${w.weather} · 体感 ${w.apparent}°<br>湿度 ${w.humidity}%</span>` : `<span>${live ? '正在准备当地天气' : '使用你设置的天气条件'}</span>`}</div><p class="weather-status">${live && w ? `${isFreshWeather(w) && navigator.onLine ? '最新获取' : '上次天气，非实时'} · ${escape(w.place)} · ${stamp}` : live ? '获取成功前，推荐按下方手动条件生成。' : '已切换为手动，不会自动改动温度。'}</p>${weatherError && live ? `<p class="weather-error" role="status">${weatherError}</p>` : ''}<div class="weather-source"><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">天气数据 Open-Meteo ↗</a><button id="weather-mode">${live ? '改用手动' : '使用实时天气'}</button></div><p class="location-note">点击「用当前位置」并允许定位后，会将附近位置发送给 Open-Meteo 查询天气。</p></section>`;
}
const icons = {
  today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  library: '<rect x="4" y="4" width="6" height="16" rx="2"/><rect x="14" y="4" width="6" height="16" rx="2"/>',
  matrix: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  settings: '<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0116 0v3"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  heart: '<path d="M20.5 5.5a5 5 0 00-7 0L12 7l-1.5-1.5a5 5 0 00-7 7L12 21l8.5-8.5a5 5 0 000-7Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>'
};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n] || icons.today}</svg>`;
function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('show'), 3500); }
function save() {
  if (storageProblem) { toast('尚未保存：请先处理本机记录读取问题。'); return false; }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch { toast('本机存储不可用；这次修改只在当前页面保留，请导出备份。'); return false; }
}
const options = (list, value) => list.map(x => `<option ${x === value ? 'selected' : ''}>${escape(x)}</option>`).join('');
const route = () => ['today', 'library', 'catalog', 'matrix', 'settings'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'today';
const statusBadge = p => `<span class="badge ${state.entries[p.id].status}">${statuses[state.entries[p.id].status]}</span>`;
function favorite(p) { const on = state.entries[p.id].favorite; return `<button class="favorite ${on ? 'active' : ''}" data-favorite="${p.id}" aria-label="${on ? '取消收藏' : '收藏'}${p.cn}" aria-pressed="${on}">${icon('heart')}</button>`; }
function card(p) {
  return `<article class="scent-card" style="--scent:${p.color}"><div class="card-top"><span class="eyebrow">${p.brand}</span>${favorite(p)}</div><button class="card-open" data-detail="${p.id}"><div class="mini-art ${p.image ? 'with-photo' : ''}">${p.image ? `<img src="${p.image}" alt="${p.brand} ${p.name} 香水瓶" width="105" height="140">` : `<span class="scent-number">${String(perfumes.indexOf(p) + 1).padStart(2, '0')}</span><span class="art-family">${p.family}</span>`}</div><h3>${p.name}</h3><p class="cn">${p.cn}</p><p class="muted">${p.notes.join(' · ')}</p></button><p class="personal-price">${shopping[p.id].refill ? `香港续瓶 · ${priceText(shopping[p.id].prices.hongkong)}` : shopping[p.id].prices.mainland ? `大陆 · ${shopping[p.id].size} · ${priceText(shopping[p.id].prices.mainland)}${shopping[p.id].prices.mainland.label?.includes('报道') ? '（媒体参考）' : ''}` : '大陆 · 此版本报价待确认'}</p><div class="card-foot">${statusBadge(p)}<span>${p.temp[0]}–${p.temp[1]}°C</span></div></article>`;
}
function conditions() {
  const c = effectiveConditions();
  return `<section class="conditions glass" aria-label="选香条件"><div class="condition-intro"><span class="eyebrow">TODAY’S SETTING</span><span class="muted">${weatherState.mode === 'live' ? '场景可选 · 修改温度、湿度或天气将切换手动' : '手动设置 · 非实时天气'}</span></div><div class="condition-fields"><label>温度<div class="temperature-input"><input id="temperature" name="temp" type="number" min="-10" max="45" step="1" value="${c.temp}" inputmode="numeric" aria-label="温度"><span>°C</span></div></label><label>湿度<div class="temperature-input"><input name="humidity" type="number" min="0" max="100" step="1" value="${c.humidity ?? 65}" inputmode="numeric" aria-label="湿度"><span>%</span></div></label><label>天气<select name="weather">${options(weathers, c.weather)}</select></label><label>场景<select name="scene">${options(scenes, c.scene)}</select></label><label>季节<select name="season">${options(seasons, c.season)}</select></label></div><button id="apply-conditions" class="secondary">应用条件</button></section>`;
}
function priceText(p) { return p ? `${p.currency === 'CNY' ? '¥' : 'HK$'}${p.amount.toLocaleString('en-US')}` : '待门店确认'; }
function shopPanel(p) {
  const info = shopping[p.id];
  const cities = info.refill ? ['香港'] : ['广州', '深圳', '香港'];
  return `<details class="shopping-panel"><summary><span>${info.refill ? '香港续瓶 · REFILL' : '购买地点与价格'}</span><span class="expand-mark">＋</span></summary><div class="shopping-content"><p class="shop-size">${info.size} · ${info.refill ? '只补充已有香水' : '参考价对应以下容量，可能与展示图片不同'}</p>${cities.map(city => {
    const market = city === '香港' ? 'hongkong' : 'mainland';
    const price = info.prices[market];
    const stores = info.stores.filter(store => store.city === city);
    return `<section class="city-store"><div class="city-price"><strong>${city}</strong>${price ? `<a href="${price.source}" target="_blank" rel="noopener noreferrer" aria-label="${city}价格来源">${priceText(price)} ↗</a>` : `<span>${info.priceStatus?.[market] || (info.refill ? '续瓶金额待确认' : '价格待核实')}</span>`}</div>${price?.label ? `<p class="price-provenance">${price.label}</p>` : price ? '<p class="price-provenance">品牌官网标价</p>' : ''}${(info.additionalPrices?.[market] || []).map(quote => `<p class="price-provenance"><a href="${quote.source}" target="_blank" rel="noopener noreferrer">${quote.size} · ${priceText(quote)} ↗</a><br>${quote.label} · ${quote.checkedAt}</p>`).join('')}${stores.length ? stores.map(store => `<p class="store-name">${store.name}</p><a class="map-address" href="${mapLink(store)}" target="_blank" rel="noopener noreferrer">${store.address}<span>${city === '香港' ? 'Google 地图' : '高德地图'} ↗</span></a><div class="store-meta">${store.phone ? `<a href="tel:${store.phone}">致电门店</a>` : ''}${store.email ? `<a href="mailto:${store.email}">门店邮箱</a>` : ''}<a href="${store.source}" target="_blank" rel="noopener noreferrer">${store.provenance || '门店资料'} ↗</a>${store.corroboration ? `<a href="${store.corroboration}" target="_blank" rel="noopener noreferrer">商场资料 ↗</a>` : ''}</div>`).join('') : '<p class="store-pending">销售此系列的柜台待确认</p>'}</section>`;
  }).join('')}<p class="shop-note">${info.note}</p>${info.officialSource ? `<a class="source-link" href="${info.officialSource}" target="_blank" rel="noopener noreferrer">香港品牌官网 ↗</a>` : ''}${info.refill ? `<a class="source-link" href="${info.refillSource}" target="_blank" rel="noopener noreferrer">海港城续瓶说明 ↗</a>` : ''}<p class="checked-date">门店资料 ${checkedAt} · 报价日期见各来源 · 非实时报价</p></div></details>`;
}
function homeCard(p, index) {
  return `<article class="home-card glass" style="--scent:${p.color}" id="scent-${p.id}"><div class="home-card-head"><span class="collection-index">${String(index + 1).padStart(2, '0')} / ${p.family}</span>${favorite(p)}</div><button class="bottle-stage ${p.id}" data-detail="${p.id}" aria-label="查看${p.cn}喷法与备注"><span class="bottle-frame"><img src="${p.image}" alt="${p.brand} ${p.name} ${p.imageSize} 官方产品图" width="320" height="280" ${index > 1 ? 'loading="lazy"' : ''}></span><span class="image-size">${p.imageSize} · 官方产品图</span></button><div class="home-card-copy"><div class="name-status"><span class="eyebrow">${p.brand}</span>${statusBadge(p)}</div><h2>${p.name}</h2><p class="home-cn">${p.cn}</p><p class="home-mood">${p.mood}</p><div class="scene-chips">${p.scenes.map(scene => `<span>${scene}</span>`).join('')}</div><div class="climate-line"><span>${p.temp[0]}–${p.temp[1]}°C</span><span>${p.weather.join(' / ')}</span></div><button class="record-link" data-detail="${p.id}">喷法与我的备注 ${icon('arrow')}</button></div>${shopPanel(p)}</article>`;
}
function today() {
  const pick = recommendations()[0], c = effectiveConditions(), plan = pick ? wearingPlan(pick, c, state.wearing[pick.id]) : null;
  return `<div class="collection-heading"><div><span class="eyebrow">NATHAN’S SCENT WARDROBE</span><h1>我的香水矩阵<span>气息，各有其时。</span></h1><p>木质、麝香与洁净花香，陪我走过不同的日常。</p></div><div class="collection-count"><strong>${perfumes.length.toString().padStart(2, '0')}</strong><span>支香气 / 私人收藏</span></div></div><div class="home-summary"><span><i></i>${perfumes.filter(p => state.entries[p.id].status === 'owned').length} 支已有</span><span>${perfumes.filter(p => state.entries[p.id].status === 'wishlist').length} 支想买</span><a href="#shopping-kit">随行分装 ↗</a></div><section class="daily-compact glass">${weatherPanel()}<div><span class="eyebrow">TODAY’S PICK · 已有香水</span><h2>${pick ? pick.cn : '今天，也可以不用香'}</h2><p>${pick ? `${c.temp}°C · ${c.weather} · ${c.scene} / ${pick.level}` : '把香水设为「已有」后，这里会给出参考。'}</p></div>${pick ? `<button class="daily-arrow" data-detail="${pick.id}" aria-label="查看今日推荐">${icon('arrow')}</button>` : ''}${plan ? `<div class="daily-wearing"><div><span>出门前试穿 · ${plan.count} 喷</span><strong>${plan.locations}</strong><p class="fine">${plan.calibration}</p><p>${plan.reason}</p><p class="fine">${plan.presence}</p><p class="spray-refill">${plan.refill}</p>${pick.caution ? `<p class="caution">${pick.caution}</p>` : ''}</div><div><span>今日着装</span><p>${plan.outfit}</p></div><small>目标：自己经常闻到 · 别人靠近可闻 · 舒服不呛</small></div>` : ''}<details class="condition-drawer"><summary>调整场景与选香条件</summary>${conditions()}</details></section><div class="home-collection">${perfumes.map(homeCard).join('')}</div><p class="reference-note">场景、温度与喷法是个人选香参考。价格与门店资料展开可见，出发前确认现货。</p><section class="atomizer-section glass" id="shopping-kit"><div class="section-head"><div><span class="eyebrow">THE TRAVEL EDIT</span><h2>把喜欢的气息，随身带走。</h2></div><span class="kit-count">05</span></div><p>你选的五款分装瓶，随时回到淘宝购买。</p><div class="atomizer-grid">${atomizers.map((a, i) => `<a class="atomizer-link" href="${a.url}" target="_blank" rel="noopener noreferrer"><span class="atomizer-number">${String(i + 1).padStart(2, '0')}</span><span><strong>${a.name}</strong><small>已保留你选择的款式链接</small></span>${icon('arrow')}</a>`).join('')}</div><div class="kit-footer"><span>商品图、容量与价格待补充</span><a href="https://shop306684392.taobao.com/category.htm" target="_blank" rel="noopener noreferrer">逛这家店 ↗</a></div></section><footer class="home-footer">N / SCENT <span>A LITTLE LESS, A LITTLE CLOSER.</span></footer>`;
}
function libraryTabs(active) { return `<div class="segmented library-tabs"><a href="#library" ${active==='library'?'aria-current="page"':''}>我的香水</a><a href="#catalog" ${active==='catalog'?'aria-current="page"':''}>品牌数据库 · ${catalog.length}</a></div>`; }
function catalogQuote(q) { return `${q.market} · ${q.size} ml${q.kind==='原瓶续瓶'?' 原瓶续瓶':''} · ${priceText(q)}`; }
function scentStructure(n) {
  return n.mode === 'pyramid'
    ? `<dl class="note-pyramid">${[['top','前调','初闻'],['heart','中调','展开'],['base','后调','余韵']].map(([key,label,stage]) => `<div><dt><span>${label}</span><small>${stage}</small></dt><dd>${n[key].map(escape).join(' · ')}</dd></div>`).join('')}</dl>`
    : `<div class="tags">${n.accords.map(x=>`<span>${escape(x)}</span>`).join('')}</div><p class="fine">${escape(n.reason)}</p>`;
}
function scentProfile(id) {
  const n = scentNotes[id];
  if (!n) return '';
  return `<section class="scent-profile"><div class="section-head"><h3>香调结构</h3><span class="fine">${n.mode === 'pyramid' ? '前 · 中 · 后' : '核心香气'}</span></div>${scentStructure(n)}<p class="note-source"><a href="${escape(n.source)}" target="_blank" rel="noopener noreferrer">${escape(n.sourceLabel)} ↗</a><small>${escape(n.version)} · ${n.checkedAt} 核对</small></p>${(n.additionalSources || []).map(source=>`<div class="note-reference"><p class="note-source"><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.label)} ↗</a><small>${escape(source.version)} · ${source.checkedAt}</small></p>${source.profile ? `<details class="note-comparison"><summary>查看此来源的${source.profile.mode === 'pyramid' ? '三调' : '核心香气'}</summary>${scentStructure(source.profile)}</details>` : ''}</div>`).join('')}${n.additionalSources?.some(s=>s.profile) ? '<p class="fine note-explanation">不同来源的香料名称与分段可能不同，以上分别保留各自写法。</p>' : ''}</section>`;
}
function catalogPriceSummary(item) {
  const markets = item.id === 'gaiac10' ? ['香港'] : ['大陆','香港'];
  return markets.map(market=>{
    const quote=item.quotes.filter(q=>q.market===market).sort((a,b)=>b.size-a.size)[0];
    return quote ? `<p class="catalog-price">${catalogQuote(quote)}</p>` : '';
  }).join('');
}
function catalogPageView() {
  const list=findCatalog(catalogFilters,state), pages=Math.max(1,Math.ceil(list.length/12)); catalogPage=Math.min(catalogPage,pages-1);
  return `<div class="page-title"><div><span class="eyebrow">SCENT INDEX</span><h1>品牌香水数据库</h1><p>从官方资料认识香气，再加入自己的收藏。</p></div></div>${libraryTabs('catalog')}<p class="catalog-coverage">已收录 ${catalog.length} 款 · 仅展示已核实大陆或香港报价的款式。不同浓度分别收录，不同容量合并；七品牌仍在补全。</p><form id="catalog-search" class="catalog-toolbar glass"><label>搜索香水<input name="query" type="search" placeholder="名称、品牌、香调" value="${escape(catalogFilters.query)}"></label><label>品牌<select name="brand"><option value="all">全部品牌</option>${catalogBrands.map(b=>`<option value="${b.id}" ${catalogFilters.brand===b.id?'selected':''}>${b.name} · ${catalog.filter(p=>p.brand===b.id).length} 款</option>`).join('')}</select></label><label>状态<select name="status">${Object.entries({all:'全部',owned:'已有',wishlist:'想买',favorite:'收藏'}).map(([key,label])=>`<option value="${key}" ${catalogFilters.status===key?'selected':''}>${label}</option>`).join('')}</select></label><button class="secondary" type="submit">筛选</button></form><p class="fine">${list.length} 款符合条件 · 第 ${catalogPage+1} / ${pages} 页。资料与记录可离线使用；官方产品图在浏览后缓存。</p><div class="home-collection catalog-grid">${list.slice(catalogPage*12,(catalogPage+1)*12).map(item=>{
    const entry=catalogEntry(state,item);
    return `<article class="home-card"><div class="home-card-head"><span class="eyebrow">${catalogBrands.find(b=>b.id===item.brand).name}</span><button class="favorite ${entry.favorite?'active':''}" data-catalog-favorite="${item.id}" aria-label="${entry.favorite?'取消收藏':'收藏'}${escape(item.name)}" aria-pressed="${entry.favorite}">${icon('heart')}</button></div><button class="bottle-stage" data-catalog-detail="${item.id}" aria-label="查看 ${escape(item.name)}"><span class="photo-frame"><span class="photo-unavailable" hidden>官方图片暂时无法加载<br><small>点此仍可查看香调与价格</small></span><img loading="lazy" decoding="async" src="${escape(item.image)}" alt="${escape(item.name)} ${item.imageSize} ml 官方产品图" style="height:${item.frame?.height||250}px;top:${item.frame?.top??-15}px;left:50%;transform:translateX(-50%);max-width:none;width:auto;position:absolute"></span></button><div class="home-card-copy"><div class="name-status"><span class="eyebrow">${escape(item.concentration||item.tags.join(' · '))}</span><span class="badge ${entry.status}">${statuses[entry.status]}</span></div><h2>${escape(item.name)}</h2>${item.cn ? `<p class="cn">${escape(item.cn)}</p>` : ''}<p class="fine">展示瓶型 ${item.imageSize} ml</p><p class="home-mood">${escape(item.tags.join(' · '))}</p><div class="scene-chips">${sceneSuggestions(item).map(scene=>`<span>${scene}</span>`).join('')}</div>${catalogPriceSummary(item)}<button class="record-link" data-catalog-detail="${item.id}"><span>香调、价格与我的记录</span>${icon('arrow')}</button></div></article>`;
  }).join('')||'<div class="empty glass"><h2>暂时没有匹配的已核实商品</h2><p>此品牌尚未收齐，或当前筛选没有结果。</p></div>'}</div><div class="catalog-paging"><button class="secondary" data-catalog-page="${catalogPage-1}" ${catalogPage===0?'disabled':''}>上一页</button><span>${catalogPage+1} / ${pages}</span><button class="secondary" data-catalog-page="${catalogPage+1}" ${catalogPage>=pages-1?'disabled':''}>下一页</button></div><p class="fine">场景为选香参考，并非品牌承诺。各款核对日期见详情。实际库存、门店价格以购买时为准。</p>`;
}
function openCatalogDetail(id) {
  const item=catalog.find(p=>p.id===id); if(!item)return;
  if(item.personalId){openDetail(item.personalId, true);return;}
  const entry=catalogEntry(state,item), d=$('#detail');
  d.innerHTML=`<form id="catalog-detail-form"><div class="dialog-top"><span class="eyebrow">${catalogBrands.find(b=>b.id===item.brand).name}</span><button type="button" id="close-catalog-detail" class="icon-button" aria-label="关闭详情">${icon('close')}</button></div><h2>${escape(item.name)}</h2>${item.cn ? `<p class="cn">${escape(item.cn)}</p>` : ''}<p>${escape(item.concentration||'')}</p>${item.versionNote ? `<p class="fine">${escape(item.versionNote)}</p>` : ''}<div class="tags">${item.tags.map(tag=>`<span>${escape(tag)}</span>`).join('')}</div><p class="fine">品牌香气说明：${escape(item.description)}</p>${scentProfile(item.id)}<h3 class="catalog-detail-title">容量与已核实报价</h3><div class="catalog-quotes">${[...item.quotes].sort((a,b)=>(a.currency==='CNY'?0:1)-(b.currency==='CNY'?0:1)||b.size-a.size).map(q=>`<a href="${escape(q.source)}" target="_blank" rel="noopener noreferrer"><strong>${catalogQuote(q)}</strong><small>${escape(q.label||'品牌官网')} · ${q.sku ? `${escape(q.sku)} · ` : ''}${q.checkedAt||item.checkedAt} · ${q.availability==='OutOfStock'?'核对时官网暂缺货':q.availability==='InStock'?'核对时官网有货':'官网标价，库存另询'} ↗</small></a>`).join('')}</div><p class="fine"><a href="${escape(item.imageSource||item.source)}" target="_blank" rel="noopener noreferrer">${item.imageSize} ml 官方瓶图出处 ↗</a> · 各笔报价按地区与容量列出。${item.checkedAt} 核对。</p><div class="detail-fields"><label>收藏状态<select name="status">${Object.entries(statuses).map(([key,label])=>`<option value="${key}" ${key===entry.status?'selected':''}>${label}</option>`).join('')}</select></label><label class="checkbox"><input type="checkbox" name="favorite" ${entry.favorite?'checked':''}> 加入收藏</label></div><label for="catalog-note">我的试香记录</label><textarea id="catalog-note" name="note" maxlength="2000" rows="4">${escape(entry.note)}</textarea><p class="fine">数据库记录独立保存。首页继续显示你选定的六支香水；新试香不自动加入每日喷法推荐。</p><div class="detail-bottom"><a href="${escape(item.source)}" target="_blank" rel="noopener noreferrer">品牌资料 ↗</a><button class="primary" type="submit">保存记录</button></div></form>`;
  const values=()=>({status:d.querySelector('[name=status]').value,favorite:d.querySelector('[name=favorite]').checked,note:d.querySelector('[name=note]').value});
  const close=()=>{if(JSON.stringify(values())!==JSON.stringify(entry)&&!confirm('这次修改还没保存，要放弃修改并关闭吗？'))return;d.close();};
  $('#close-catalog-detail').onclick=close;d.oncancel=event=>{event.preventDefault();close();};
  $('#catalog-detail-form').onsubmit=event=>{event.preventDefault();state.catalogEntries[id]=values();const ok=save();d.close();render();if(ok)toast('试香记录已保存');};d.showModal();
}
function library() {
  const list = perfumes.filter(p => filter === 'all' || (filter === 'favorite' ? state.entries[p.id].favorite : state.entries[p.id].status === filter));
  return `<div class="page-title"><div><span class="eyebrow">THE COLLECTION</span><h1>我的香水库</h1><p>${perfumes.filter(p => state.entries[p.id].status === 'owned').length} 支已有 · ${perfumes.filter(p => state.entries[p.id].status === 'wishlist').length} 支想买 · 留一点探索的空间</p></div></div>${libraryTabs('library')}<div class="segmented" aria-label="筛选香水">${Object.entries({ all: '全部', owned: '已有', wishlist: '想买', explore: '待探索', favorite: '收藏' }).map(([k, v]) => `<button data-filter="${k}" aria-pressed="${filter === k}" class="${filter === k ? 'selected' : ''}">${v}</button>`).join('')}</div><div class="collection-grid">${list.length ? list.map(card).join('') : '<div class="empty glass"><h2>这里还没有香水</h2><p>在香水详情里调整状态，或点爱心收藏。</p></div>'}</div>`;
}
function matrix() {
  const configs = { season: { title: '季节', columns: seasons, match: (p, c) => p.seasons.includes(c) }, temperature: { title: '温度', columns: ['10–19°C', '20–25°C', '26–30°C', '31–35°C'], match: (p, c) => { const [lo, hi] = c.match(/\d+/g).map(Number); return p.temp[0] <= lo && p.temp[1] >= hi ? true : p.temp[0] <= hi && p.temp[1] >= lo ? 'partial' : false; } }, weather: { title: '天气', columns: weathers, match: (p, c) => p.weather.includes(c) }, scene: { title: '场景', columns: scenes, match: (p, c) => p.scenes.includes(c) } };
  const cfg = configs[matrixMode];
  return `<div class="page-title"><div><span class="eyebrow">FIND YOUR BALANCE</span><h1>一眼看懂，怎么选。</h1><p>木质、麝香与洁净花香，放进你的日常。</p></div></div><div class="segmented" aria-label="矩阵维度">${Object.entries(configs).map(([k, v]) => `<button data-matrix="${k}" class="${matrixMode === k ? 'selected' : ''}" aria-pressed="${matrixMode === k}">${v.title}</button>`).join('')}</div><div class="matrix-legend"><span><b class="match-dot"></b>优先考虑</span><span><b class="match-dot partial"></b>部分温度适用</span><span>— 非优先</span></div><div class="matrix-wrap glass" tabindex="0" role="region" aria-label="可横向滚动的香水矩阵"><table><caption class="sr-only">${cfg.title}香水矩阵</caption><thead><tr><th scope="col">香水 / ${cfg.title}</th>${cfg.columns.map(c => `<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${perfumes.map(p => `<tr><th scope="row"><button data-detail="${p.id}">${p.cn}<small>${p.name} · ${statuses[state.entries[p.id].status]}</small></button></th>${cfg.columns.map(c => { const match = cfg.match(p, c); return `<td>${match ? `<span class="match-dot ${match === 'partial' ? 'partial' : ''}" role="img" aria-label="${match === 'partial' ? '部分温度适用' : '优先考虑'}"></span>` : '<span aria-label="非优先">—</span>'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div><p class="fine matrix-note">手机可左右滑动表格。温度为选香参考，不是硬性界限；实际感受请以试香为准。</p><section class="matrix-summary glass"><span class="eyebrow">YOUR SCENT WARDROBE</span><h2>日常的木质，夏日的清透。</h2><p>北国雪松与愈创木10构成安静的底色；Another 13 与慵懒周末补充清透麝香与柔和花香。Imagination 与梧桐影木留作新的体验。</p></section>`;
}
function settings() {
  return `<div class="page-title"><div><span class="eyebrow">MAKE IT YOURS</span><h1>属于你的香气日常</h1><p>记录留在这台设备，按你的节奏慢慢补全。</p></div></div><div class="settings-grid"><section class="settings-panel glass"><h2>放到 iPhone 主屏幕</h2><ol><li>用 Safari 打开已部署的网址。</li><li>点「分享」，选择「添加到主屏幕」。</li><li>若出现「作为网页 App 打开」，保持开启。</li><li>联网打开一次，等下方显示「离线已准备好」，再试飞行模式。</li></ol><p id="offline-status" class="connection">${offlineReady ? '离线已准备好' : '正在确认离线状态…'}</p><p class="fine">${navigator.standalone || matchMedia('(display-mode: standalone)').matches ? '当前以主屏幕 App 模式运行。' : '当前在浏览器中运行。'}</p><button id="update-app" class="secondary">${pendingWorker || controllerChanged ? '立即更新页面' : '检查应用更新'}</button></section><section class="settings-panel glass"><h2>记录与备份</h2><p>已有、想买、收藏和备注保存在当前浏览器。不同手机与 Safari／主屏幕 App 之间不保证共享记录。</p><p class="fine">清理网站数据、卸载或更换网址可能导致记录不可用。重要备注建议先导出备份。</p><div class="button-row"><button id="export" class="primary">导出备份</button><button id="import" class="secondary">导入备份</button><input type="file" id="import-file" accept=".json,application/json" hidden></div>${storageProblem ? '<button id="export-original" class="secondary">导出原始记录</button>' : ''}</section><section class="settings-panel glass"><h2>关于推荐</h2><p>先从「已有」香水中，按温度、湿度、场景、天气与季节综合选择。同样适合时，优先收藏的香水。</p><p class="fine">默认获取广州天气，可选深圳、香港或手动设置。只有你点击并允许定位后，才查询当前位置附近天气。温度和喷法是参考建议，不代表品牌官方结论；香气感受因人而异。</p></section><section class="settings-panel glass"><h2>N / Scent</h2><p>Nathan 的私人香水矩阵</p><p class="fine">版本 1.6.0 · 纯前端 · 本机保存<br>香气资料来源可在各香水详情查看。</p><p id="update-state" class="fine"></p></section></div>`;
}
function render() {
  const page = route();
  $('.bottom-nav').innerHTML = Object.entries({ today: '首页', library: '香水库', matrix: '矩阵', settings: '我的' }).map(([k, v]) => `<a href="#${k}" ${page === k || (page === 'catalog' && k === 'library') ? 'aria-current="page"' : ''}>${icon(k)}<span>${v}</span></a>`).join('');
  $('#main').innerHTML = `${storageProblem ? `<p class="notice" role="alert">${storageProblem} <a href="#settings">去备份</a></p>` : ''}${({ today, library, catalog:catalogPageView, matrix, settings })[page]()}`;
  bindPage();
}
function bindPage() {
  if ($('#catalog-search')) {
    const form=$('#catalog-search');
    const apply=()=>{catalogFilters=Object.fromEntries(new FormData(form));catalogPage=0;render();};
    form.onsubmit=event=>{event.preventDefault();apply();};form.querySelectorAll('select').forEach(select=>select.onchange=apply);
  }
  document.querySelectorAll('[data-catalog-page]').forEach(b=>b.onclick=()=>{catalogPage=Number(b.dataset.catalogPage);render();window.scrollTo(0,0);});
  document.querySelectorAll('[data-catalog-detail]').forEach(b=>b.onclick=()=>openCatalogDetail(b.dataset.catalogDetail));
  document.querySelectorAll('[data-catalog-favorite]').forEach(b=>b.onclick=()=>{
    const item=catalog.find(p=>p.id===b.dataset.catalogFavorite);const entry=catalogEntry(state,item);const next={...entry,favorite:!entry.favorite};
    if(item.personalId)state.entries[item.personalId]=next;else state.catalogEntries[item.id]=next;
    const ok=save();render();if(ok)toast('收藏已更新');
  });
  if ($('#weather-city')) $('#weather-city').onchange = event => { const city = cities[event.target.value]; if (!city) return; weatherState.place = city; weatherState.mode = 'live'; weatherState.current = null; saveWeather(); refreshWeather(); };
  if ($('#refresh-weather')) $('#refresh-weather').onclick = () => { weatherState.mode = 'live'; saveWeather(); refreshWeather(); };
  if ($('#weather-mode')) $('#weather-mode').onclick = () => { weatherState.mode = weatherState.mode === 'live' ? 'manual' : 'live'; weatherRequest++; weatherLoading = false; saveWeather(); weatherState.mode === 'live' ? refreshWeather() : render(); };
  if ($('#locate-weather')) $('#locate-weather').onclick = () => {
    if (!navigator.geolocation) { toast('此浏览器暂不支持定位，请选择城市。'); return; }
    $('#locate-weather').textContent = '等待定位…';
    navigator.geolocation.getCurrentPosition(position => {
      weatherState.place = validPlace({ label: '当前位置附近', latitude: position.coords.latitude, longitude: position.coords.longitude });
      weatherState.mode = 'live'; weatherState.current = null; saveWeather(); refreshWeather();
    }, () => { toast('未取得定位，可直接选择广州、深圳或香港。'); render(); }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  }

  document.querySelectorAll('[data-detail]').forEach(b => b.onclick = () => openDetail(b.dataset.detail));
  document.querySelectorAll('[data-favorite]').forEach(b => b.onclick = () => { state.entries[b.dataset.favorite].favorite = !state.entries[b.dataset.favorite].favorite; const ok = save(); render(); if (ok) toast('收藏已更新'); });
  document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { filter = b.dataset.filter; render(); });
  document.querySelectorAll('[data-matrix]').forEach(b => b.onclick = () => { matrixMode = b.dataset.matrix; render(); });
  if ($('#apply-conditions')) $('#apply-conditions').onclick = () => {
    const controls = [...document.querySelectorAll('.conditions input, .conditions select')];
    if (controls.some(el => !el.reportValidity() || el.value === '')) return;
    const next = Object.fromEntries(controls.map(el => [el.name, ['temp', 'humidity'].includes(el.name) ? Number(el.value) : el.value]));
    const current = effectiveConditions();
    if (next.temp !== current.temp || next.humidity !== current.humidity || next.weather !== current.weather) { weatherState.mode = 'manual'; weatherRequest++; weatherLoading = false; saveWeather(); }
    state.conditions = next; const ok = save(); render(); if (ok) toast('选香条件已更新');
  };
  if ($('#export')) $('#export').onclick = () => download(JSON.stringify(state, null, 2), `nathan-scent-${new Date().toISOString().slice(0, 10)}.json`);
  if ($('#export-original')) $('#export-original').onclick = () => { try { download(localStorage.getItem(STORAGE_KEY) || '', 'nathan-scent-original.txt'); } catch { toast('浏览器仍不允许读取记录。'); } };
  if ($('#import')) $('#import').onclick = () => $('#import-file').click();
  if ($('#import-file')) $('#import-file').onchange = importBackup;
  if ($('#update-app')) $('#update-app').onclick = async () => {
    const button = $('#update-app'); button.disabled = true; button.textContent = '正在检查与更新…';
    updateRequested = true;
    try {
      const result = await requestUpdate(navigator.serviceWorker, { reload: () => location.reload(), changed: () => controllerChanged });
      if (result === 'current') { updateRequested = false; toast('已是当前可用版本。'); }
      else toast('正在应用新版，记录会保留。');
    } catch { updateRequested = false; toast('暂未完成更新，请联网后再试；你的记录会保留。'); }
    finally { button.disabled = false; button.textContent = pendingWorker || controllerChanged ? '立即更新页面' : '检查应用更新'; }
  };
}
function download(text, filename) { const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); }
async function importBackup(event) {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 2000000) throw new Error('备份文件过大，请选择 N / Scent 导出的备份。');
    const restored = normalizeState(JSON.parse(await file.text()));
    if (!confirm('用这份备份替换本机香水状态、备注和选香条件？建议先导出当前记录。')) return;
    // Persist before replacing visible state; failed imports retain current data.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(restored)); state = restored; storageProblem = ''; render(); toast('备份已导入并保存');
  } catch (e) { toast(e instanceof SyntaxError ? '文件内容无法识别，请选择有效的 JSON 备份。' : e.message || '导入失败，原记录保持不变。'); }
  event.target.value = '';
}
function wearingFeedbackForm(id, plan) {
  const f = state.wearing[id];
  const choices = {faint:'不够明显',comfortable:'闻得到、舒服',strong:'太浓或呛'};
  const select = (name, label, values, value) => `<label>${label}<select name="${name}">${Object.entries(values).map(([k,v]) => `<option value="${k}" ${k === value ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`;
  return `<details class="wearing-feedback"><summary>让建议更贴合我${f ? ' · 已有体感记录' : ''}</summary><p class="fine">记录一次出门前用量，不填全天多次补喷的总数。反馈用于下一次试穿，不用于当天反复补喷。</p><label class="checkbox"><input type="checkbox" id="record-wearing" name="recordWearing"> 保存这次实际体感</label><div class="detail-fields"><label>一次出门前实际喷量<input type="number" name="sprays" value="${f?.sprays || plan.count}" min="1" max="12" step="1" required inputmode="numeric"></label>${select('nozzle','用的喷头',{original:'原瓶',decant:'分装瓶'},f?.nozzle || 'original')}${select('selfFeeling','我自己的感觉',choices,f?.self || 'comfortable')}${select('othersFeeling','身边人的反馈',{unknown:'还没确认',...choices},f?.others || 'unknown')}</div></details>`;
}
function openDetail(id, includeShopping = false) {
  const p = perfumes.find(p => p.id === id); if (!p) return;
  const e = state.entries[id], d = $('#detail'), plan = wearingPlan(p, effectiveConditions(), state.wearing[id]);
  d.innerHTML = `<form id="detail-form"><div class="dialog-top"><span class="eyebrow">${p.brand}</span><button type="button" id="close-detail" class="icon-button" aria-label="关闭详情">${icon('close')}</button></div><h2>${p.name}</h2><p class="hero-cn">${p.cn}</p><p>${p.description}</p>${scentProfile(p.id)}<section class="spray-note"><span class="eyebrow">HOW TO WEAR</span><h3>出门前试穿方案</h3><p><strong>共 ${plan.count} 喷：${plan.locations}</strong></p><p class="fine">${plan.calibration}</p><p>${plan.reason}</p><p class="fine">${plan.presence}</p><p class="spray-refill">${plan.refill}</p><h3>着装搭配</h3><p>${plan.outfit}</p><span class="fine">${plan.tip}</span></section>${wearingFeedbackForm(id, plan)}${shopPanel(p)}<div class="detail-fields"><label>收藏状态<select name="status">${Object.entries(statuses).map(([k, v]) => `<option value="${k}" ${k === e.status ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label class="checkbox"><input type="checkbox" name="favorite" ${e.favorite ? 'checked' : ''}> 加入收藏</label></div><label class="note-label" for="scent-note">我的备注 <span class="fine">试香感受、用量或想起的片刻</span></label><textarea id="scent-note" name="note" maxlength="2000" rows="4" placeholder="今天穿它，感觉怎样？">${escape(e.note)}</textarea><div class="detail-bottom"><a href="${p.source}" target="_blank" rel="noopener noreferrer">品牌资料 ↗</a><button class="primary" type="submit">保存记录</button></div></form>`;
  const initial = () => ({ status: d.querySelector('[name=status]').value, favorite: d.querySelector('[name=favorite]').checked, note: d.querySelector('[name=note]').value });
  const feedbackValues = () => Object.fromEntries(new FormData($('#detail-form')));
  const originalFeedback = JSON.stringify(feedbackValues());
  const feedbackChanged = () => JSON.stringify(feedbackValues()) !== originalFeedback;
  const close = () => { if ((feedbackChanged() || JSON.stringify(initial()) !== JSON.stringify(e)) && !confirm('这次修改还没保存。要放弃修改并关闭吗？')) return; d.close(); };
  $('#close-detail').onclick = close;
  d.oncancel = ev => { ev.preventDefault(); close(); };
  $('#detail-form').onsubmit = ev => { ev.preventDefault(); if ($('#record-wearing').checked) { const f = feedbackValues(); const c = effectiveConditions(); state.wearing[id] = { sprays:Number(f.sprays), nozzle:f.nozzle, self:f.selfFeeling, others:f.othersFeeling, temp:c.temp, humidity:c.humidity, scene:c.scene }; } state.entries[id] = initial(); const ok = save(); d.close(); render(); if (ok) toast('记录已保存在本机'); };
  d.showModal();
}
// Product images may be unavailable offline before their first successful load.
document.addEventListener('error', event => {
  if (!(event.target instanceof HTMLImageElement)) return;
  const frame = event.target.closest('.photo-frame');
  if (!frame) return;
  const message = frame.querySelector('.photo-unavailable');
  if (!message) return;
  event.target.hidden = true;
  message.hidden = false;
}, true);

window.addEventListener('hashchange', () => { if ($('#detail').open) $('#detail').close(); render(); if (location.hash === '#shopping-kit') $('#shopping-kit')?.scrollIntoView({ behavior: 'smooth' }); else window.scrollTo(0, 0); });
window.addEventListener('offline', () => { if (!$('#detail').open) render(); toast(offlineReady ? '已离线，香水库和记录仍可使用。' : '已离线；请稍后联网完成离线准备。'); });
render();
if (weatherState.mode === 'live') refreshWeather();
window.addEventListener('online', () => { if (weatherState.mode === 'live') refreshWeather(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && weatherState.mode === 'live' && !weatherLoading && !$('#detail').open && !isFreshWeather(weatherState.current)) refreshWeather(); });
if ('serviceWorker' in navigator) {
  let refreshing = false;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    controllerChanged = true; pendingWorker = null;
    if (updateRequested && !refreshing) { refreshing = true; location.reload(); }
    else { toast('新版已就绪，到「我的」点立即更新页面。'); if ($('#update-app')) $('#update-app').textContent = '立即更新页面'; }
  });
  navigator.serviceWorker.register('./sw.js').then(async registration => {
    function waiting() { pendingWorker = hadController ? registration.waiting : null; if (pendingWorker) { toast('新版本已准备好，可在「我的」中更新。'); if ($('#update-state')) $('#update-state').textContent = '新版本已准备好。'; if ($('#update-app')) $('#update-app').textContent = '立即更新页面'; } }
    waiting(); registration.addEventListener('updatefound', () => { registration.installing?.addEventListener('statechange', waiting); });
    await navigator.serviceWorker.ready; offlineReady = true; if ($('#offline-status')) $('#offline-status').textContent = '离线已准备好';
  }).catch(() => { if ($('#offline-status')) $('#offline-status').textContent = '离线尚未准备好，请联网刷新后重试。'; });
}
// Optional browser integration; normal Safari operation does not require it.
if (document.modelContext?.registerTool) {
  try { Promise.resolve(document.modelContext.registerTool({ name: 'read_fragrance_recommendations', title: '读取今日香水推荐', description: '读取当前手动条件下的已有香水推荐，不修改任何记录。', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute(input) { if (!input || typeof input !== 'object' || Object.keys(input).length) throw new Error('无需参数'); return { conditions: effectiveConditions(), recommendations: recommendations().map(p => ({ name: p.cn, level: p.level, reasons: p.reasons })) }; } })).catch(() => {}); } catch { /* Optional capability unavailable. */ }
}
