import { searchableNotes } from './scent-notes.js';
import { reviewedCatalog } from './catalog-data.js';
import { perfumes } from './data.js';
import { shopping } from './shopping.js';

export const catalogBrands = [
  { id: 'chloe', name: 'Chloé 蔻依' }, { id: 'lelabo', name: 'Le Labo' },
  { id: 'armani', name: 'Armani Privé 阿玛尼私藏' }, { id: 'lv', name: 'Louis Vuitton 路易威登' },
  { id: 'chanel', name: 'CHANEL 香奈儿' }, { id: 'adp', name: 'Acqua di Parma 帕尔马之水' },
  { id: 'dior', name: 'Dior 迪奥' }
];
const personalBrands = { cedrus: 'chloe', gaiac10: 'lelabo', another13: 'lelabo', imagination: 'lv', sycomore: 'chanel' };
const frames = { cedrus: [349,-26], gaiac10:[269,-20], another13:[306,-38], imagination:[240,-14], sycomore:[220,13] };
const personal = perfumes.filter(p => personalBrands[p.id]).map(p => {
  const info = shopping[p.id];
  const quotes = Object.entries(info.prices).filter(([,q]) => q && !q.label?.includes('报道')).map(([market,q]) => ({ ...q, size: parseInt(info.size.match(/\d+/)?.[0],10), market: market === 'hongkong' ? '香港' : '大陆', kind: info.refill ? '原瓶续瓶' : '正装', label: q.label || '品牌官网' }));
  for (const [market, additional] of Object.entries(info.additionalPrices || {})) for (const q of additional) quotes.push({...q,size:parseInt(q.size,10),market:market==='hongkong'?'香港':'大陆',kind:'正装'});
  return {id:p.id,personalId:p.id,brand:personalBrands[p.id],name:p.name,cn:p.cn,description:p.description,tags:p.notes,scenes:p.scenes,image:p.image,imageSize:parseInt(p.imageSize,10),source:p.source,checkedAt:quotes.map(q=>q.checkedAt||'2026-09-28').sort().at(-1),frame:{height:frames[p.id][0],top:frames[p.id][1]},quotes};
});
export const catalog = [...personal, ...reviewedCatalog];
export function catalogEntry(state, item) { return item.personalId ? state.entries[item.personalId] : state.catalogEntries?.[item.id] || {status:'explore',favorite:false,note:''}; }
export function findCatalog({brand='all',query='',status='all'}, state) {
  const term=query.normalize('NFKC').toLocaleLowerCase().trim();
  return catalog.filter(p => (brand === 'all' || p.brand === brand) && (!term || [p.name,p.cn,p.concentration,p.description,searchableNotes(p.id),...p.tags,catalogBrands.find(b=>b.id===p.brand)?.name].join(' ').normalize('NFKC').toLocaleLowerCase().includes(term)) && (status === 'all' || (status === 'favorite' ? catalogEntry(state,p).favorite : catalogEntry(state,p).status===status)));
}
export function sceneSuggestions(item) {
  if (item.scenes) return item.scenes;
  if (/intense|extrait|oud|spicy|leather|沉香|皮革|烟熏|烟草|藏红花|辛辣/i.test(`${item.description.replace(/烟熏红茶/g,'红茶')} ${item.concentration}`)) return ['晚间出门','凉爽天气试香'];
  if (/citr|fresh|green|marine|柑橘|佛手柑|柠檬|绿茶|海洋|青柠|香橼/i.test(item.description)) return ['日常通勤','周末出门'];
  return ['日常试香','约会晚餐'];
}
