// Nathan 偏好：有存在感；每支单独定量。湿度用于选区间，不将全部香水压成一喷。
export const sprayProfiles = {
  cedrus: { range: [4, 6], daily: 5, note: '柔和木质，先用分散的喷点建立存在感' },
  gaiac10: { range: [5, 6], daily: 6, note: '贴肤木质可用较分散的喷点，建立自己和他人都可感知的存在感' },
  another13: { range: [3, 4], daily: 3, note: '清透感不等于别人闻不到，先以身边人的反馈校准' },
  lazySundayMorning: { range: [4, 6], daily: 5, note: '让洁净花香在身体活动时自然带出' },
  imagination: { range: [3, 5], daily: 4, note: '明亮气息分散佩戴，先观察近距离的存在感' },
  sycomore: { range: [2, 4], daily: 3, note: '烟熏木质从较低档试穿，确认舒服后再增加' }
};
function sprayPlacements(count, selfFocus = false) {
  if (count === 1) return [{site:'一侧前臂',count:1}];
  if (count === 2) return [{site:'上胸口',count:1},{site:'一侧前臂',count:1}];
  if (count === 3) return [{site:'上胸口',count:1},{site:'左前臂',count:1},{site:'右前臂',count:1}];
  const points = [{site:'左锁骨下',count:1},{site:'右锁骨下',count:1},{site:'左前臂',count:1},{site:'右前臂',count:1}];
  if (count === 5) points.push({site:'后颈',count:1});
  if (count >= 6) points.push({site:'左上臂',count:1},{site:'右上臂',count:1});
  if (count === 7) points.push({site:'后颈',count:1});
  if (count === 8) points.push({site:'后颈左侧',count:1},{site:'后颈右侧',count:1});
  if (count > 8) points.push({site:'左上臂外侧另一位置',count:Math.ceil((count-8)/2)},{site:'右上臂外侧另一位置',count:Math.floor((count-8)/2)});
  if (count > 8) points.push({site:'后颈左侧',count:1},{site:'后颈右侧',count:1});
  if (selfFocus && count >= 4) { points[0].site='左前臂另一位置'; points[1].site='右前臂另一位置'; }
  return points.filter(point=>point.count>0);
}
export function wearingPlan(p, c, feedback) {
  const profile = sprayProfiles[p.id];
  if (!profile) throw new Error('这支香水还没有个人喷量建议');
  const humid = Number.isFinite(c.humidity) && c.humidity >= 75;
  const hot = c.temp >= 30 || (c.apparent ?? c.temp) >= 33;
  const close = ['日常通勤', '办公室', '约会晚餐'].includes(c.scene);
  const humidWarm = humid && c.temp >= 27;
  const low = close || c.scene === '居家独处' || hot || humidWarm;
  let count = low ? profile.range[0] : c.scene === '周末出门' ? profile.range[1] : profile.daily;
  let calibration = '首次试穿参考，尚未用你的实际体感校准';
  let reason = `${profile.note}。先试 ${count} 喷，喷量是起点，不是你的固定标准。`;
  let selfFocus = false;
  if (feedback && Number.isInteger(feedback.sprays) && feedback.sprays >= 1 && feedback.sprays <= 12) {
    count = feedback.sprays;
    calibration = `依据上次 ${feedback.nozzle === 'decant' ? '分装喷头' : '原瓶喷头'}的实际体感`;
    if (feedback.self === 'strong' || feedback.others === 'strong') {
      count = Math.max(1, count - 1); reason = '上次自己或身边人觉得太浓，下次出门前先减 1 喷，并减少靠近鼻子的喷点。';
    } else if (feedback.self === 'faint' && feedback.others === 'faint') {
      count = Math.min(12, count + 1); reason = '上次自己和身边人都觉得淡，下次出门前先加 1 喷，分散位置再观察。';
    } else if (feedback.self === 'faint') {
      selfFocus = true; reason = '上次自己闻不清，但没有双方都觉得淡的反馈。下次总量先不加，把喷点移到前臂，让活动时更容易闻到。';
    } else {
      reason = feedback.others === 'comfortable' && feedback.self === 'comfortable' ? '上次自己和身边人都觉得合适，优先保留已经验证过的喷量。' : '先沿用上次用量；还没有足够反馈支持加量。';
    }
    if (feedback.scene !== c.scene || Math.abs(feedback.temp-c.temp) >= 6 || Math.abs(feedback.humidity-c.humidity) >= 20) reason += '这次环境和上次不同，天气作为观察条件，不直接覆盖你的体感记录。';
  }
  const placements = sprayPlacements(count, selfFocus);
  const locations = placements.map(point => `${point.site} ${point.count} 喷`).join(' + ');
  reason += ` 当前 ${c.temp}°C${Number.isFinite(c.humidity) ? `、湿度 ${c.humidity}%` : ''}；${c.scene}。`;
  const colors = { cedrus: '米白、浅卡其', gaiac10: '米灰、深棕', another13: '白、浅灰', lazySundayMorning: '米白、浅灰、淡紫', imagination: '白、浅蓝', sycomore: '炭灰、深棕' }[p.id];
  let outfit = hot ? '轻薄棉麻衬衫或素色 T 恤，配透气长裤' : c.temp < 20 ? '薄针织搭长裤，外出加一件外套' : '干净的棉质衬衫，配直筒长裤';
  if (c.scene === '办公室' && !hot) outfit = '简洁衬衫或薄针织，配西裤；冷气足时加薄外套';
  if (c.scene === '约会晚餐') outfit = hot ? '轻薄衬衫配垂感长裤，少一点层叠' : '细针织或素色衬衫，配深色长裤';
  if (c.scene === '居家独处') outfit = hot ? '宽松棉质短袖与家居裤' : '柔软棉质家居服或薄针织';
  return { refill: '这是一次出门前的参考用量，不是补喷量。已经喷过时不要再照着完整喷一轮；自己闻淡先不补。只有身边人也确认已经很淡，再考虑局部补 1 喷，重新观察。', count, range: profile.range, calibration, nozzle: feedback?.nozzle || 'original', placements, locations, outfit: `${colors}系：${outfit}。`, reason,
    presence: '目标是自己活动时能闻到，别人靠近或经过时也有存在感，而不是充满整个房间。自己闻淡不等于别人闻不到；用身边人的反馈校准。',
    tip: '未记录喷头时按原瓶完整按压参考；分装瓶出量不同，不能直接照搬次数。分散喷在皮肤上，避开脸部与破损处；衣物先确认面料允许且不会留印。喷量是个人试穿建议，不是品牌标准。' };
}
