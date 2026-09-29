// 门店资料与参考价格分开记录，价格不代表门店即时库存或成交价。
export const checkedAt = '2026-09-28';
const leLaboDirectory = 'https://www.lelabofragrances.eu/hk/en/store-search';
const harbour = { city: '香港', name: 'LE LABO · 海港城', address: '尖沙咀海港城港威商场 3 楼 3230A', email: 'hongkongharbourcity@lelabofragrances.com', source: leLaboDirectory, corroboration: 'https://www.harbourcity.com.hk/en/shop/le-labo/' };
export function mapLink(store) {
  const query = `${store.city} ${store.name} ${store.address}`;
  return store.city === '香港'
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : `https://uri.amap.com/search?keyword=${encodeURIComponent(store.name + ' ' + store.address)}&city=${encodeURIComponent(store.city)}&view=map&src=nathan-scent`;
}
export const shopping = {
  cedrus: {
    size: '150 ml', prices: { mainland: { amount: 2180, currency: 'CNY', source: 'https://www.chloe.cn/product/FLEURSCEDRUS/CHCA64300046_P00', label: '中国官网 · 150 ml · 2026-09-29 核对', checkedAt: '2026-09-29' }, hongkong: null },
    additionalPrices: { mainland: [{ size: '50 ml', amount: 1215, currency: 'CNY', source: 'https://www.chloe.cn/product/FLEURSCEDRUS/CHCA64300022_P00/', label: '中国官网 · 核对时即将到货', checkedAt: '2026-09-28' }] },
    priceStatus: { hongkong: '官网未列原版售价' },
    officialSource: 'https://www.chloe.com/en-hk/c/fragrances/atelier-des-fleurs',
    note: '中国官网 150 ml 标价 ¥2,180，50 ml 标价 ¥1,215，按容量分别列出。香港官网未列 Cedrus 原版售价；深林雪松和夜间版本为不同款，不混用价格。大陆具体专柜仍待确认。',
    stores: [{ city: '香港', name: 'Chloé Atelier des Fleurs · 海港城', address: '尖沙咀海港城港威商场 2 楼 2407', phone: '+85235637198', source: 'https://www.harbourcity.com.hk/en/shop/chloe-adf-gw/' }]
  },
  gaiac10: {
    size: '已有原瓶 100 ml', refill: true,
    prices: { mainland: null, hongkong: { amount: 3360, currency: 'HKD', source: leLaboDirectory, label: '海港城门店邮件确认 · 2026-09-28 · 100 ml 原瓶续瓶' } },
    note: '你的原瓶为 100 ml。海港城门店已通过官方邮箱确认续瓶 HK$3,360；此金额不是按折扣推算。品牌官网说明全年提供续瓶，但本次回信没有说明预约及原瓶检查要求，出发前请确认。',
    officialSource: 'https://www.lelabofragrances.eu/hk/en/online-lab-refills',
    refillSource: 'https://www.harbourcity.com.hk/tc/article/le-labo-city-exclusive/',
    stores: [harbour]
  },
  another13: {
    size: '100 ml', prices: { mainland: null, hongkong: { amount: 2550, currency: 'HKD', source: leLaboDirectory, label: '海港城门店邮件确认 · 2026-09-28 · 100 ml 正装' } },
    note: '香港 100 ml 正装价已由海港城门店官方邮箱确认。内地官方现价尚未取得，按你的要求不展示媒体参考价。现货请提前确认。',
    stores: [
      { city: '广州', name: 'LE LABO · 太古汇', address: '天河区天河路 383 号太古汇', source: 'https://www.ifanr.com/digest/1609080', provenance: '开店报道，出发前确认' },
      { city: '深圳', name: 'LE LABO · 万象天地', address: '南山区深南大道 9668 号万象天地 L1 层 SL158A', phone: '+8675526925073', email: 'sznshennan@lelabofragrances.com', source: leLaboDirectory, provenance: '品牌官方门店目录' },
      harbour
    ]
  },
  lazySundayMorning: {
    size: '100 ml · EDT 淡香水', prices: {
      mainland: null,
      hongkong: { amount: 1320, currency: 'HKD', source: 'https://www.maisonmargiela.com/en-hk/replica-lazy-sunday-morning-eau-de-toilette-S33YX0018S10932001.html', label: '品牌香港官网 · 100 ml EDT · 2026-09-28 核对' }
    },
    priceStatus: { mainland: '大陆现价继续核对中' },
    note: '香港价格对应官网 100 ml EDT，门店现货另行确认。广州太古汇与深圳湾万象城精品店在品牌目录列有香氛系列，具体款式现货需确认；大陆价格继续核对。',
    stores: [{ city: '广州', name: 'Maison Margiela · 太古汇', address: '天河区天河路 383 号太古汇 L231', phone: '+862038803502', source: 'https://www.maisonmargiela.com/en-us/stores/maison-margiela-guangzhou-tkh', provenance: '品牌目录列有香氛系列，具体款式现货请确认' }, { city: '深圳', name: 'Maison Margiela · 深圳湾万象城', address: '南山区科苑南路 2888 号深圳湾万象城 L230、L231', phone: '+8675533975829', source: 'https://www.maisonmargiela.com/en-sg/stores/maison-margiela-shenzhen-bay-mixc', provenance: '品牌目录列有香氛系列，具体款式现货请确认' }, { city: '香港', name: 'Maison Margiela Fragrances · 海港城', address: '尖沙咀海港城港威商场 2 楼 2409', phone: '+85291897369', source: 'https://www.harbourcity.com.hk/tc/shop/maison-margiela-fragrances/' }]
  },
  imagination: {
    size: '100 ml', prices: {
      mainland: { amount: 2600, currency: 'CNY', source: 'https://www.louisvuitton.cn/zhs-cn/products/imagination-nvprod2970067v/LP0219' },
      hongkong: { amount: 2800, currency: 'HKD', source: 'https://hk.louisvuitton.com/eng-hk/products/Imagination-nvprod7340011v/LP0476' }
    },
    additionalPrices: { mainland: [{ size: '200 ml', amount: 3850, currency: 'CNY', source: 'https://www.louisvuitton.cn/zhs-cn/products/imagination-nvprod2970067v/LP0221', label: '中国官网 · LP0221', checkedAt: '2026-09-29' }], hongkong: [{ size: '200 ml', amount: 4150, currency: 'HKD', source: 'https://hk.louisvuitton.com/eng-hk/products/Imagination-nvprod7340011v/LP0491', label: '香港官网 · LP0491 · 对应展示图片', checkedAt: '2026-09-28' }] },
    note: '大陆为 LP0219、香港为当前 LP0476 的官网 100 ml 参考价；包装版本不同。门店现货与试香请提前确认。',
    stores: [
      { city: '广州', name: 'Louis Vuitton · 太古汇', address: '天河区天河路 383 号太古汇 L101、L201、L225a', source: 'https://www.louisvuitton.cn/zhs-cn/legal-privacy' },
      { city: '深圳', name: 'Louis Vuitton · 深圳湾万象城', address: '南山区科苑南路 2888 号深圳湾万象城 L101、L183、L201', source: 'https://www.louisvuitton.cn/zhs-cn/legal-privacy' },
      { city: '香港', name: 'Louis Vuitton · 广东道 5 号', address: '尖沙咀广东道 5 号海港城地下 G005–006 及 1 楼', phone: '+85281001182', source: 'https://ca.louisvuitton.com/eng-ca/point-of-sale/hong-kong/louis-vuitton-hong-kong-5-canton-road' }
    ]
  },
  sycomore: {
    size: '75 ml', prices: {
      mainland: { amount: 2200, currency: 'CNY', source: 'https://www.chanel.cn/cn/fragrance/p/122100/sycomore-eau-de-parfum-woody-amber-intense/' },
      hongkong: { amount: 2220, currency: 'HKD', source: 'https://www.chanel.com/hk-en/fragrance/p/122100/sycomore-eau-de-parfum-woody-amber-intense/' }
    },
    additionalPrices: { mainland: [{ size: '200 ml', amount: 3950, currency: 'CNY', source: 'https://www.chanel.cn/cn/fragrance/p/122300/sycomore-eau-de-parfum-woody-amber-intense/', label: 'CHANEL 中国官网 · 200 ml', checkedAt: '2026-09-28' }] },
    note: '以下门店资料列有珍藏系列香水。广州门店营业状态请电话确认；价格与库存以到店为准。',
    stores: [
      { city: '广州', name: 'CHANEL · 太古汇精品店', address: '天河区天河路 383 号太古汇商场首层', phone: '4009555888', source: 'https://www.chanel.cn/cn/storelocator/store/chanel-guangzhou-taikoo-hui-325/' },
      { city: '深圳', name: 'CHANEL · 深圳湾万象城精品店', address: '南山区科苑南路 2888 号深圳湾万象城 L1 层 L170、L173、L175、L177', phone: '4009555888', source: 'https://www.chanel.cn/cn/storelocator/store/chanel-shenzhen-bay-mixc-112749/' },
      { city: '香港', name: 'CHANEL BEAUTÉ · 海运大厦', address: '尖沙咀海港城海运大厦 2 楼 OT201 及 OT201A', phone: '+85236225281', source: 'https://www.chanel.com/hk-en/storelocator/store/chanel-beaute-ocean-terminal-16666/' }
    ]
  }
};
export const atomizers = [
  ['856676551834', '5663759492949'], ['804765965490', '5961368479219'],
  ['828287845996', '5727570595370'], ['823148991593', '5705154866491'],
  ['810980970396', '5540136409134']
].map(([id, sku], i) => ({ id, sku, name: `分装瓶 ${String(i + 1).padStart(2, '0')}`, url: `https://item.taobao.com/item.htm?id=${id}&skuId=${sku}` }));
