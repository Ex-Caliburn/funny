/**
 * PHIP 解析结果与手动补充数据合并
 */

const PENDING_RE = /^待|^\[编纂\]|^N\/A$|^无$|^预计|^待从|^待全球|^待招股|^待确认|^待更新|^待公布|^待分配|^待从 PHIP|^PHIP 未|^PHIP 含|^PHIP 阶段|^惯例/;

function isPendingValue(val) {
  if (val == null) return true;
  if (typeof val === 'boolean' || typeof val === 'number') return false;
  if (typeof val === 'string') return PENDING_RE.test(val.trim()) || val.includes('待披露');
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === 'object') {
    const vals = Object.values(val).filter((v) => v != null);
    if (vals.length === 0) return true;
    return vals.every(isPendingValue);
  }
  return false;
}

function deepMergeField(phipVal, overrideVal, fieldSources, key) {
  if (overrideVal == null) return phipVal;

  if (typeof phipVal === 'object' && phipVal !== null && !Array.isArray(phipVal)
    && typeof overrideVal === 'object' && overrideVal !== null && !Array.isArray(overrideVal)) {
    const merged = { ...phipVal };
    for (const [k, v] of Object.entries(overrideVal)) {
      const childKey = `${key}.${k}`;
      if (isPendingValue(phipVal[k]) && !isPendingValue(v)) {
        merged[k] = v;
        fieldSources[childKey] = 'manual';
      } else if (phipVal[k] == null && v != null) {
        merged[k] = v;
        fieldSources[childKey] = 'manual';
      } else if (!isPendingValue(v)) {
        merged[k] = v;
        fieldSources[childKey] = 'manual';
      } else {
        merged[k] = phipVal[k] ?? v;
      }
    }
    return merged;
  }

  if (isPendingValue(phipVal) && !isPendingValue(overrideVal)) {
    fieldSources[key] = 'manual';
    return overrideVal;
  }
  if (phipVal == null && overrideVal != null) {
    fieldSources[key] = 'manual';
    return overrideVal;
  }
  if (!isPendingValue(overrideVal) && phipVal !== overrideVal) {
    fieldSources[key] = 'manual';
    return overrideVal;
  }
  return phipVal ?? overrideVal;
}

/**
 * 合并 PHIP 解析 + 手动 override
 * @param {object|null} phip - parseOfferingFromPhipText 输出
 * @param {object|null} override - offering_overrides 条目
 */
function mergeOffering(phip, override) {
  const fieldSources = {};

  if (!phip && !override) return null;
  if (!phip) {
    return {
      ...override,
      _meta: { sources: Object.fromEntries(Object.keys(override).map((k) => [k, 'manual'])), mergedAt: new Date().toISOString() },
    };
  }
  if (!override) {
    return {
      ...phip,
      _meta: {
        ...(phip._meta || {}),
        sources: Object.fromEntries(Object.keys(phip).filter((k) => k !== '_meta').map((k) => [k, 'phip_pdf'])),
        mergedAt: new Date().toISOString(),
      },
    };
  }

  const merged = { ...phip };
  const skipKeys = new Set(['_meta', 'notes', 'financials', 'aShareCode', 'listingType', 'isAh']);

  for (const [key, val] of Object.entries(override)) {
    if (skipKeys.has(key)) continue;
    merged[key] = deepMergeField(phip[key], val, fieldSources, key);
  }

  // PHIP 财务与股权优先保留
  if (phip.financials) {
    merged.financials = phip.financials;
    fieldSources.financials = 'phip_pdf';
  }
  if (phip.aShareCode) {
    merged.aShareCode = phip.aShareCode;
    fieldSources.aShareCode = 'phip_pdf';
  }
  if (phip.listingType) {
    merged.listingType = phip.listingType;
    fieldSources.listingType = 'phip_pdf';
  }

  const notes = [...new Set([...(phip.notes || []), ...(override.notes || [])])];
  merged.notes = notes;

  merged._meta = {
    parsedAt: phip._meta?.parsedAt,
    phipPdfUrl: phip._meta?.phipPdfUrl,
    phipDocType: phip._meta?.phipDocType,
    phipDataSources: phip._meta?.dataSources,
    mergedAt: new Date().toISOString(),
    sources: {
      ...Object.fromEntries(Object.keys(phip).filter((k) => !['_meta', 'notes'].includes(k)).map((k) => [k, fieldSources[k] || 'phip_pdf'])),
      ...fieldSources,
    },
    parserNote: phip._meta?.parserNote,
  };

  return merged;
}

module.exports = { mergeOffering, isPendingValue };
