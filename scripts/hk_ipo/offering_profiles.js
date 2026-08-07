/**
 * 招股详情：PHIP PDF 自动解析 + 手动补充合并
 * 运行 fetch_offering_from_phip.js 生成 stock/hk_ipo/offering_merged.json
 */

const fs = require('fs');
const path = require('path');
const { OFFERING_OVERRIDES } = require('./offering_overrides');
const { mergeOffering } = require('./offering_merge');
const { offeringMerged: MERGED_PATH } = require('./paths');

const TIER_LABELS = {
  sovereign: '主权/政府基金',
  top_tier: '顶级资管',
  well_known: '知名机构',
  general: '一般机构',
};

/**
 * 加载合并后的 offering 配置
 * @returns {Record<number, object>}
 */
function loadOfferingProfiles() {
  if (fs.existsSync(MERGED_PATH)) {
    const data = JSON.parse(fs.readFileSync(MERGED_PATH, 'utf-8'));
    if (data.profiles && Object.keys(data.profiles).length) {
      return data.profiles;
    }
  }

  // 回退：仅手动 override
  const fallback = {};
  for (const [id, override] of Object.entries(OFFERING_OVERRIDES)) {
    fallback[id] = mergeOffering(null, override);
  }
  return fallback;
}

/** 懒加载缓存 */
let _cache = null;

function getOfferingProfiles() {
  if (!_cache) _cache = loadOfferingProfiles();
  return _cache;
}

function reloadOfferingProfiles() {
  _cache = loadOfferingProfiles();
  return _cache;
}

/** 兼容旧引用：动态 getter */
const OFFERING_PROFILES = new Proxy(
  {},
  {
    get(_, prop) {
      return getOfferingProfiles()[prop];
    },
    ownKeys() {
      return Reflect.ownKeys(getOfferingProfiles());
    },
    getOwnPropertyDescriptor(_, prop) {
      const val = getOfferingProfiles()[prop];
      if (val === undefined) return undefined;
      return { configurable: true, enumerable: true, value: val };
    },
  }
);

module.exports = {
  OFFERING_PROFILES,
  OFFERING_OVERRIDES,
  TIER_LABELS,
  getOfferingProfiles,
  reloadOfferingProfiles,
  MERGED_PATH,
};
