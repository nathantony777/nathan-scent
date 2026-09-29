export const WEATHER_KEY = 'nathan-scent.weather.v1';
export const cities = {
  guangzhou: { label: '广州', latitude: 23.13, longitude: 113.26 },
  shenzhen: { label: '深圳', latitude: 22.54, longitude: 114.06 },
  hongkong: { label: '香港', latitude: 22.32, longitude: 114.17 }
};
export function weatherLabel(code, temp, humidity) {
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(code)) return '雨天';
  if (temp >= 30 && humidity >= 65) return '闷热';
  return code === 0 || code === 1 ? '晴天' : '多云';
}
export function normalizeWeather(data, place, now = Date.now()) {
  const c = data?.current;
  if (!c || !Number.isFinite(c.temperature_2m) || c.temperature_2m < -60 || c.temperature_2m > 60 || !Number.isFinite(c.relative_humidity_2m) || c.relative_humidity_2m < 0 || c.relative_humidity_2m > 100 || !Number.isFinite(c.weather_code) || !Number.isFinite(c.time)) throw new Error('天气数据暂不完整');
  const temp = Math.round(c.temperature_2m);
  return { temp, humidity: Math.round(c.relative_humidity_2m), apparent: Number.isFinite(c.apparent_temperature) ? Math.round(c.apparent_temperature) : temp, weather: weatherLabel(c.weather_code, temp, c.relative_humidity_2m), code: c.weather_code, observedAt: c.time * 1000, fetchedAt: now, place: place.label };
}
export function isFreshWeather(w, now = Date.now()) {
  return Boolean(w && Number.isFinite(w.fetchedAt) && Number.isFinite(w.observedAt) && now - w.fetchedAt >= 0 && now - w.fetchedAt < 90 * 60000 && now - w.observedAt >= -15 * 60000 && now - w.observedAt < 2 * 3600000);
}
export async function fetchWeather(place, fetcher = fetch) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({ latitude: String(place.latitude), longitude: String(place.longitude), current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code', timezone: 'Asia/Shanghai', timeformat: 'unixtime', forecast_days: '1' });
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetcher(url.href, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error('天气服务暂时不可用');
    return normalizeWeather(await response.json(), place);
  } finally { clearTimeout(timer); }
}
export function validPlace(raw) {
  if (raw && raw.label === '当前位置附近' && Number.isFinite(raw.latitude) && Math.abs(raw.latitude) <= 90 && Number.isFinite(raw.longitude) && Math.abs(raw.longitude) <= 180) return { label: raw.label, latitude: Math.round(raw.latitude * 100) / 100, longitude: Math.round(raw.longitude * 100) / 100 };
  return Object.values(cities).find(p => p.label === raw?.label) || cities.guangzhou;
}
