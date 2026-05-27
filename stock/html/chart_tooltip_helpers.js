/**
 * ECharts 图表 tooltip 通用配置（各 *_chart.html 引用）
 */
(function (global) {
  /** tooltip 最大高度占视口高度的比例（0.2~0.85） */
  var TOOLTIP_MAX_HEIGHT_RATIO = 0.45;

  var AXIS_LINE_POINTER = {
    type: 'line',
    lineStyle: { color: '#64748b', type: 'dashed' }
  };

  var LINE_EMPHASIS = {
    focus: 'series',
    lineStyle: { width: 3 },
    itemStyle: { borderColor: '#fff', borderWidth: 1 }
  };

  var LINE_BLUR = {
    lineStyle: { opacity: 0.12 },
    itemStyle: { opacity: 0.12 }
  };

  function getTooltipMaxHeightPx() {
    return Math.round(global.innerHeight * TOOLTIP_MAX_HEIGHT_RATIO);
  }

  /**
   * 限制 tooltip 在图表内，按视口比例限高，长列表可滚动
   * @param {Object} [extra]
   * @returns {Object}
   */
  function buildConfinedTooltip(extra) {
    var maxHvh = Math.round(TOOLTIP_MAX_HEIGHT_RATIO * 100);
    var base = {
      confine: true,
      enterable: true,
      extraCssText: 'max-height:' + maxHvh + 'vh;overflow-y:auto;pointer-events:auto;box-sizing:border-box;',
      position: function (point, params, dom, rect, size) {
        var pad = 8;
        var cw = size.contentSize[0];
        var ch = Math.min(size.contentSize[1], getTooltipMaxHeightPx());
        var vw = size.viewSize[0];
        var vh = size.viewSize[1];
        var x = point[0] + pad;
        var y = point[1] + pad;
        if (x + cw > vw - pad) x = Math.max(pad, point[0] - cw - pad);
        if (y + ch > vh - pad) y = Math.max(pad, point[1] - ch - pad);
        if (x < pad) x = pad;
        if (y < pad) y = pad;
        return [x, y];
      }
    };
    if (!extra) return base;
    var out = {};
    var k;
    for (k in base) {
      if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    }
    for (k in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k];
    }
    return out;
  }

  /** 多折线图：悬浮时高亮当前线、淡化其它线 */
  function applyLineSeriesHover(seriesItem) {
    if (!seriesItem || seriesItem.type !== 'line') return seriesItem;
    seriesItem.emphasis = LINE_EMPHASIS;
    seriesItem.blur = LINE_BLUR;
    return seriesItem;
  }

  /** axis 触发 tooltip 常用样式 */
  function axisTooltipStyle(extra) {
    return buildConfinedTooltip(Object.assign({
      trigger: 'axis',
      axisPointer: AXIS_LINE_POINTER,
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#1f2937',
      textStyle: { color: '#e2e8f0' }
    }, extra || {}));
  }

  global.TOOLTIP_MAX_HEIGHT_RATIO = TOOLTIP_MAX_HEIGHT_RATIO;
  global.getTooltipMaxHeightPx = getTooltipMaxHeightPx;
  global.buildConfinedTooltip = buildConfinedTooltip;
  global.applyLineSeriesHover = applyLineSeriesHover;
  global.axisTooltipStyle = axisTooltipStyle;
  global.ChartTooltipHelpers = {
    TOOLTIP_MAX_HEIGHT_RATIO: TOOLTIP_MAX_HEIGHT_RATIO,
    getTooltipMaxHeightPx: getTooltipMaxHeightPx,
    buildConfinedTooltip: buildConfinedTooltip,
    applyLineSeriesHover: applyLineSeriesHover,
    axisTooltipStyle: axisTooltipStyle,
    AXIS_LINE_POINTER: AXIS_LINE_POINTER
  };
})(typeof window !== 'undefined' ? window : global);
