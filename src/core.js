import { perfumes, seasons, weathers, scenes, statuses } from './data.js';
export const STORAGE_KEY = 'nathan-fragrance.v1';
export function seasonForMonth(month) { return month >= 3 && month <= 5 ? '春季' : month >= 6 && month <= 8 ? '夏季' : month >= 9 && month <= 11 ? '秋季' : '冬季'; }
export function initialState() {
  return { version: 1, wearing: {}, catalogEntries: {}, conditions: { temp: 28, humidity: 65, season: seasonForMonth(new Date().getMonth() + 1), weather: '多云', scene: '日常通勤' }, entries: Object.fromEntries(perfumes.map(p => [p.id, { status: p.status, favorite: false, note: '' }])) };
}
export function normalizeState(raw) {
  const out = initialState();
  if (!raw || raw.version !== 1 || typeof raw.entries !== 'object' || !raw.entries) throw new Error('这份文件不是可识别的香水备份。');
  const c = raw.conditions || {};
  if (Number.isFinite(c.temp) && c.temp >= -10 && c.temp <= 45) out.conditions.temp = c.temp;
  if (Number.isFinite(c.humidity) && c.humidity >= 0 && c.humidity <= 100) out.conditions.humidity = c.humidity;
  for (const [key, allowed] of Object.entries({ season: seasons, weather: weathers, scene: scenes })) if (allowed.includes(c[key])) out.conditions[key] = c[key];
  for (const p of perfumes) {
    const e = raw.entries[p.id];
    if (!e || typeof e !== 'object') continue;
    out.entries[p.id] = { status: Object.hasOwn(statuses, e.status) ? e.status : p.status, favorite: e.favorite === true, note: typeof e.note === 'string' ? e.note.slice(0, 2000) : '' };
  }
  for (const p of perfumes) {
    const f = raw.wearing?.[p.id];
    if (!f || !Number.isInteger(f.sprays) || f.sprays<1 || f.sprays>12 || !['original','decant'].includes(f.nozzle) || !['faint','comfortable','strong'].includes(f.self) || !['unknown','faint','comfortable','strong'].includes(f.others)) continue;
    if (!Number.isFinite(f.temp) || f.temp < -10 || f.temp > 45 || !Number.isFinite(f.humidity) || f.humidity < 0 || f.humidity > 100 || !scenes.includes(f.scene)) continue;
    out.wearing[p.id] = { sprays:f.sprays, nozzle:f.nozzle, self:f.self, others:f.others, temp:f.temp, humidity:f.humidity, scene:f.scene };
  }
  const records = Object.entries(raw.catalogEntries || {});
  if (records.length > 1000) throw new Error('这份备份包含过多记录，请确认文件来源。');
  for (const [id, e] of records) {
    if (!/^[a-z0-9][a-z0-9-]{1,80}$/.test(id) || !e || typeof e !== 'object') continue;
    out.catalogEntries[id] = {status:Object.hasOwn(statuses,e.status)?e.status:'explore',favorite:e.favorite===true,note:typeof e.note==='string'?e.note.slice(0,2000):''};
  }
  const previousYulong = raw.archivedEntries?.yulong || raw.entries.yulong;
  if (previousYulong && typeof previousYulong === 'object') {
    out.archivedEntries = { yulong: {
      status: Object.hasOwn(statuses, previousYulong.status) ? previousYulong.status : 'wishlist',
      favorite: previousYulong.favorite === true,
      note: typeof previousYulong.note === 'string' ? previousYulong.note.slice(0, 2000) : ''
    } };
  }
  return out;
}
export function suitability(p, c) {
  const distance = Math.max(p.temp[0] - c.temp, c.temp - p.temp[1], 0);
  const reasons = [];
  if (!distance) reasons.push(`${c.temp}°C 在参考范围内`);
  if (p.weather.includes(c.weather)) reasons.push(`适合${c.weather}`);
  if (p.scenes.includes(c.scene)) reasons.push(`适合${c.scene}`);
  if (p.seasons.includes(c.season)) reasons.push(`${c.season}可选`);
  // 个人偏好：湿热时优先清透方向，避免把湿度当成香水性能的确定规律。
  const humidWarm = c.humidity >= 75 && c.temp >= 27;
  const humidityAdjustment = humidWarm ? ({ lazySundayMorning: 2, imagination: 6, another13: 3, cedrus: 0, gaiac10: -4, sycomore: -8 }[p.id] || 0) : 0;
  if (humidWarm) reasons.push(humidityAdjustment > 0 ? `湿度 ${c.humidity}%，按你的偏好优先清透感` : `湿度 ${c.humidity}%，喷法需控制浓度`);
  const score = humidityAdjustment + Math.max(0, 40 - distance * 6) + (p.scenes.includes(c.scene) ? 30 : 0) + (p.weather.includes(c.weather) ? 20 : 0) + (p.seasons.includes(c.season) ? 10 : 0);
  return { score, reasons, caution: distance ? `当前温度超出 ${p.temp[0]}–${p.temp[1]}°C 参考范围，少量试穿或暂时不用香。` : '', level: score >= 80 ? '很合适' : score >= 60 ? '可以考虑' : '谨慎选择' };
}
export function ranked(state, ownedOnly = true) {
  return perfumes.filter(p => !ownedOnly || state.entries[p.id].status === 'owned').map(p => ({ ...p, ...suitability(p, state.conditions) })).sort((a, b) => b.score - a.score || Number(state.entries[b.id].favorite) - Number(state.entries[a.id].favorite));
}
