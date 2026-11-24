/* ============================================================
 * app.js — 状态、i18n、六边形绘制、打印优化透明 PNG 导出
 * 依赖 data.js（window.SG）
 * ============================================================ */

(function () {
  'use strict';
  const SG = window.SG;
  const $ = (id) => document.getElementById(id);
  const BASE = 900;

  const FACTIONS = {
    resistance:  { name: 'Resistance',  color: '#00aeef' },
    enlightened: { name: 'Enlightened', color: '#22c55e' }
  };

  /* 全部图表样式默认值；控件修改后实时写入 state.style，预览与导出共用。 */
  const DEFAULT_STYLE = {
    bgMode: 'paper', bgColor: '#ffffff',
    baseW: 2.4, baseC: '#5b6b85',
    dataW: 4, dataC: '#00aeef', dataFollow: true,
    dataFillC: '#00aeef', dataFillFollow: true, fillAlpha: 0.30,
    spokeShow: true, spokeW: 1.4, spokeC: '#8a94a6',
    vertexR: 8, vertexC: '#00aeef', vertexFollow: true, vertexSW: 2.5, vertexSC: '#ffffff',
    labelFont: '"Segoe UI","Microsoft YaHei","PingFang SC",sans-serif', labelSize: 27, labelC: '#101a2a', labelDist: 81,
    titleFont: '"Segoe UI","Microsoft YaHei","PingFang SC",sans-serif', titleSize: 36, titleC: '#101a2a',
    ringShow: false, ringW: 1, ringC: '#8a94a6',
    ringLabelShow: false, ringLabelSize: 12, ringLabelC: '#5b6b85',
    ringLabelFont: '"Segoe UI","Microsoft YaHei","PingFang SC",sans-serif',
    valueShow: false, valueSize: 18, valueC: '#556174',
    valueFont: '"Segoe UI","Microsoft YaHei","PingFang SC",sans-serif',
    pctShow: false, pctSize: 15, pctC: '#b71c1c', pctChipC: '#fdecea',
    pctFont: '"Segoe UI","Microsoft YaHei","PingFang SC",sans-serif',
    logoType: 'none', logoSize: 60, logoAlpha: 0.12,
    logoIngressC: '#00aeef', logoResC: '#00aeef', logoEnlC: '#22c55e'
  };

  const FONT_OPTIONS = [
    ['"Segoe UI","Microsoft YaHei","PingFang SC",sans-serif', '系统默认 (Segoe UI / 微软雅黑)'],
    ['Arial,sans-serif', 'Arial'], ['Verdana,sans-serif', 'Verdana'],
    ['Georgia,serif', 'Georgia'], ['"Times New Roman",serif', 'Times New Roman'],
    ['"Courier New",monospace', 'Courier New'], ['Consolas,monospace', 'Consolas'],
    ['"Microsoft YaHei",sans-serif', '微软雅黑'], ['SimSun,serif', '宋体'],
    ['SimHei,sans-serif', '黑体'], ['KaiTi,serif', '楷体'], ['Impact,sans-serif', 'Impact']
  ];

  const STYLE_CONTROLS = {
    bgMode: 'st-bgMode', bgColor: 'st-bgColor', baseW: 'st-baseW', baseC: 'st-baseC',
    dataW: 'st-dataW', dataC: 'st-dataC', dataFollow: 'st-dataFollow',
    dataFillC: 'st-dataFillC', dataFillFollow: 'st-fillFollow', fillAlpha: 'st-fillAlpha',
    spokeShow: 'st-spokeShow', spokeW: 'st-spokeW', spokeC: 'st-spokeC',
    vertexR: 'st-vertexR', vertexC: 'st-vertexC', vertexFollow: 'st-vertexFollow',
    vertexSW: 'st-vertexSW', vertexSC: 'st-vertexSC',
    labelFont: 'st-labelFont', labelSize: 'st-labelSize', labelC: 'st-labelC', labelDist: 'st-labelDist',
    titleFont: 'st-titleFont', titleSize: 'st-titleSize', titleC: 'st-titleC',
    ringShow: 'st-ringShow', ringW: 'st-ringW', ringC: 'st-ringC',
    ringLabelShow: 'st-ringLabelShow', ringLabelSize: 'st-ringLabelSize', ringLabelC: 'st-ringLabelC',
    ringLabelFont: 'st-ringLabelFont',
    valueShow: 'st-valueShow', valueSize: 'st-valueSize', valueC: 'st-valueC', valueFont: 'st-valueFont',
    pctShow: 'st-pctShow', pctSize: 'st-pctSize', pctC: 'st-pctC', pctChipC: 'st-pctChipC', pctFont: 'st-pctFont',
    logoType: 'st-logoType', logoSize: 'st-logoSize', logoAlpha: 'st-logoAlpha'
  };

  const CUSTOM_DEFAULTS = [
    { zh: '探索', en: 'Explore', value: 86, base: 100 },
    { zh: '建造', en: 'Build',   value: 92, base: 100 },
    { zh: '连线', en: 'Link',    value: 78, base: 100 },
    { zh: '领域', en: 'Field',   value: 118, base: 100 },
    { zh: '战斗', en: 'Combat',  value: 64, base: 100 },
    { zh: '支援', en: 'Support', value: 95, base: 100 }
  ];

  const I18N = {
    zh: {
      'brand.sub': '六边形技能图生成器',
      'tab.ingress': 'Ingress 数据', 'tab.custom': '自定义能力',
      'field.paste': '粘贴 Agent 数据', 'hint.paste': '表头 + 数值两行，或逐行「字段 数值」',
      'ph.paste': 'Time Span\tAgent Name\tAgent Faction\t...\nALL TIME\tXXXX\tResistance\t...',
      'btn.parse': '解析数据', 'btn.sample': '填入示例', 'btn.autopick': '自动挑突出项',
      'btn.export': '导出透明 PNG',
      'field.baseline': '基准策略', 'hint.baseline': '决定每根轴的 100% 线',
      'opt.prominence': '单人相对刻度（推荐）', 'opt.medal': '公开勋章等级',
      'opt.bronze': '铜 Bronze', 'opt.silver': '银 Silver', 'opt.gold': '金 Gold',
      'opt.platinum': '铂 Platinum', 'opt.onyx': '玛瑙 Onyx',
      'field.axes': '六维轴与基准', 'field.chartTitle': '图内标题',
      'ph.chartTitle': '留空则使用 Agent Name', 'ph.customTitle': '例如：My Skills',
      'note.custom': '直接填写能力名与数值。每行的「满值」即 100% 基准，超过即爆表。',
      'help.summary': '数据格式说明',
      'help.1': '支持制表符、逗号、多空格或单空格分隔；单空格模式按已知字段名自动切分，自动识别千位分隔符。',
      'help.2': '也支持逐行「字段名<TAB>数值」，或 JSON 对象。',
      'help.3': '字段名大小写、空格、括号会被忽略，例如 <code>Lifetime AP</code> = <code>lifetime_ap</code>。',
      'help.4': '自动挑项使用单人数据的对数 z-score，并限制每个类别最多 2 项。',
      'hud.agent': '特工代号', 'hud.level': '等级', 'hud.ap': '终生 AP', 'hud.faction': '阵营',
      'scope.tag': '扫描台 / 技能矩阵', 'scope.note': '取景框为装饰，不写入导出图',
      'preview.title': '预览', 'preview.sub': '纸张预览，导出效果与预览一致 · PNG 背景透明',
      'preview.bgLabel': '当前背景', 'preview.bg.transparent': '透明',
      'preview.bg.paper': '白纸', 'preview.bg.light': '浅灰',
      'preview.bg.dark': '深灰', 'preview.bg.custom': '自定义',
      'export.scale': '导出倍率',
      'top.github': '在 GitHub 上查看本项目', 'top.about': '声明与更新记录',
      'top.aboutTitle': '关于本站', 'top.close': '关闭声明',
      'top.changelog': '更新记录', 'top.viewGithub': '在 GitHub 上查看本项目',
      'top.disclaimer': '本站为爱好者制作的非官方工具，与 Niantic 及 Ingress 官方无关联；Ingress 是 Niantic 的注册商标。徽标归各自权利人所有。',
      'log.1': '顶栏新增 GitHub 与声明弹窗，原页脚信息移入弹窗',
      'log.2': '采用真实 Ingress 阵营徽标与战术终端视觉',
      'log.3': '六边形内可叠加徽标，支持大小、透明度与配色',
      'log.4': '方案按 Ingress / 自定义 / 纯样式分类保存',
      'log.5': '自定义能力名支持多行描述',
      'log.6': '加入明暗主题与手机端触控适配',
      'footer.1': '支持 Ingress 数据与自定义能力，导出高清透明图',
      'footer.2': '数据源：粘贴的 Agent 数据、自定义输入、<a href="https://agent-stats.com/global.php" target="_blank" rel="noopener">Agent-stats global 页</a>（全球分布）、<a href="https://agent-stats.com/faq" target="_blank" rel="noopener">Agent-stats FAQ</a>（勋章阈值）',
      'aria.faction': '阵营配色', 'aria.theme': '切换明暗主题', 'aria.config': '数据与配置',
      'aria.preview': '图表预览', 'aria.chart': '六边形技能图预览',
      'aria.baselineMode': '基准策略', 'aria.medalTier': '勋章等级',
      'aria.axisField': '第 {0} 轴字段', 'aria.value': '数值', 'aria.base': '基准值',
      'aria.name': '能力名', 'aria.max': '满值',
      'note.baseline.prominence': '单人相对刻度默认使用 7 个有全球分布数据的衍生量（AP/Hack、Translator/Hacker 等），以全球中位数为基准；基准与下方数值均可手动修改。',
      'note.baseline.medal': '100% 线采用 agent-stats.com FAQ 的勋章阈值（铜/银/金/铂/玛瑙，覆盖 50 个字段）；未映射字段回落到自身取整。这不是官方群体平均值。',
      'note.norm': 'Ingress 图按最强项归一化为 100%，只表达相对强弱；自定义图按真实数值绘制，允许突破外圈。',
      'preset.save': '保存当前方案', 'preset.namePh': '方案名称', 'preset.load': '载入',
      'preset.delete': '删除', 'preset.none': '（暂无已保存方案）',
      'preset.saved': '已保存方案：{0}', 'preset.loaded': '已载入方案：{0}', 'preset.deleted': '已删除方案：{0}',
      'preset.needName': '请先填写方案名称', 'preset.noSelect': '请先选择一个已保存方案',
      'preset.kind.ingress': 'Ingress 方案', 'preset.kind.custom': '自定义方案',
      'preset.kind.style': '纯样式', 'preset.savedShort': '已保存 ✓',
      'warn.empty': '输入为空', 'warn.json': 'JSON 解析失败：{0}',
      'warn.colMismatch': '表头 {0} 列 / 数值 {1} 列，按较短者对齐',
      'warn.noFields': '未识别到数值字段，请检查分隔符',
      'status.parsed': '解析成功：{0} 项数值',
      'status.noData': '请先粘贴包含数值的 Agent 数据',
      'status.autopick': '已选出 6 项相对突出的指标',
      'status.warnings': '{0}',
      'export.fail': '导出失败：浏览器未生成图片',
      'export.done': '已导出 {0}×{0} 打印优化透明 PNG',
      'theme.toLight': '切换到浅色主题', 'theme.toDark': '切换到深色主题',
      'lang.toEn': 'Switch to English', 'lang.toZh': '切换到中文',
      'style.title': '样式 DIY', 'style.background': '背景', 'style.bgMode': '预设',
      'style.bg.transparent': '透明', 'style.bg.paper': '白纸', 'style.bg.light': '浅灰',
      'style.bg.dark': '深灰', 'style.bg.custom': '自定义',
      'style.lines': '线条', 'style.base': '基线', 'style.dataLine': '数据边',
      'style.follow': '跟随阵营', 'style.dataFill': '填充', 'style.spokes': '轴线', 'style.show': '画',
      'style.vertex': '顶点圆点', 'style.radius': '半径', 'style.radiusHint': '0 = 不画',
      'style.vertexFill': '填充', 'style.vertexStroke': '描边', 'style.text': '文字',
      'style.labelFont': '轴名字体', 'style.labelSize': '轴名字号', 'style.labelColor': '轴名颜色',
      'style.labelDist': '距六边形', 'style.titleFont': '标题字体',
      'style.titleSize': '标题字号', 'style.titleColor': '标题颜色',
      'axis.head.field': '指标 · 基准%', 'axis.head.value': '数值',
      'axis.head.base': '基准', 'axis.head.norm': '归一%',
      'style.rings': '同心环', 'style.ringLabels': '环刻度%',
      'style.ringLabelFont': '环刻度字体', 'style.vertexValue': '顶点数值',
      'style.valueFont': '数值字体', 'style.vertexPct': '顶点百分比',
      'style.pctChip': '百分比底色',
      'style.logo': '徽标背景', 'style.logoType': '图案', 'style.logo.none': '不画',
      'style.logoSize': '大小', 'style.logoAlpha': '透明度', 'style.logoColors': '当前徽标色'
    },
    en: {
      'brand.sub': 'Hexagonal skills graph generator',
      'tab.ingress': 'Ingress Data', 'tab.custom': 'Custom Skills',
      'field.paste': 'Paste Agent data', 'hint.paste': 'header + values on two lines, or "field value" per line',
      'ph.paste': 'Time Span\tAgent Name\tAgent Faction\t...\nALL TIME\tXXXX\tResistance\t...',
      'btn.parse': 'Parse data', 'btn.sample': 'Use sample', 'btn.autopick': 'Pick top six',
      'btn.export': 'Export transparent PNG',
      'field.baseline': 'Baseline', 'hint.baseline': 'sets the 100% line of each axis',
      'opt.prominence': 'Relative scale (recommended)', 'opt.medal': 'Public medal tiers',
      'opt.bronze': 'Bronze', 'opt.silver': 'Silver', 'opt.gold': 'Gold',
      'opt.platinum': 'Platinum', 'opt.onyx': 'Onyx',
      'field.axes': 'Six axes & baselines', 'field.chartTitle': 'Chart title',
      'ph.chartTitle': 'Leave blank to use Agent Name', 'ph.customTitle': 'e.g. My Skills',
      'note.custom': 'Enter skill names and values. The "Max" column is the 100% baseline; exceeding it overflows.',
      'help.summary': 'Data format',
      'help.1': 'Tab, comma, multiple spaces or single spaces are accepted; single-space mode splits by known field names. Thousands separators are handled.',
      'help.2': 'One "field<TAB>value" pair per line, or a JSON object, also works.',
      'help.3': 'Field names ignore case, spaces and punctuation, e.g. <code>Lifetime AP</code> = <code>lifetime_ap</code>.',
      'help.4': 'Auto-pick uses a log z-score of one agent\'s data, with at most two axes per category.',
      'hud.agent': 'Agent', 'hud.level': 'Level', 'hud.ap': 'Lifetime AP', 'hud.faction': 'Faction',
      'scope.tag': 'Scanner / skill matrix', 'scope.note': 'Frame is decorative, not exported',
      'preview.title': 'Preview', 'preview.sub': 'Paper preview matches export exactly · PNG background is transparent',
      'preview.bgLabel': 'Background', 'preview.bg.transparent': 'Transparent',
      'preview.bg.paper': 'Paper', 'preview.bg.light': 'Light grey',
      'preview.bg.dark': 'Dark grey', 'preview.bg.custom': 'Custom',
      'export.scale': 'Export scale',
      'top.github': 'View this project on GitHub', 'top.about': 'Disclaimer and changelog',
      'top.aboutTitle': 'About this site', 'top.close': 'Close disclaimer',
      'top.changelog': 'Changelog', 'top.viewGithub': 'View this project on GitHub',
      'top.disclaimer': 'An unofficial fan-made tool, not affiliated with Niantic or Ingress. Ingress is a registered trademark of Niantic. Logos belong to their respective owners.',
      'log.1': 'Added top-bar GitHub link and disclaimer popover; moved footer notes into it',
      'log.2': 'Adopted real Ingress faction emblems and tactical terminal visuals',
      'log.3': 'Emblem overlay inside the hexagon with size, opacity and colour control',
      'log.4': 'Presets grouped into Ingress / custom / style-only setups',
      'log.5': 'Custom skill names support multiple lines',
      'log.6': 'Added light/dark themes and mobile touch-target adjustments',
      'footer.1': 'Ingress data or custom skills · high-res transparent export',
      'footer.2': 'Source: pasted agent data, custom input, <a href="https://agent-stats.com/global.php" target="_blank" rel="noopener">Agent-stats global page</a> (global distributions), <a href="https://agent-stats.com/faq" target="_blank" rel="noopener">Agent-stats FAQ</a> (medal tiers)',
      'aria.faction': 'Faction colours', 'aria.theme': 'Toggle light/dark theme', 'aria.config': 'Data and settings',
      'aria.preview': 'Chart preview', 'aria.chart': 'Hexagonal skills chart preview',
      'aria.baselineMode': 'Baseline mode', 'aria.medalTier': 'Medal tier',
      'aria.axisField': 'Axis {0} field', 'aria.value': 'Value', 'aria.base': 'Baseline',
      'aria.name': 'Skill name', 'aria.max': 'Max value',
      'note.baseline.prominence': 'Relative scale defaults to seven derived metrics that have global distributions (AP/Hack, Translator/Hacker, etc.), using the global median as baseline. Baselines and values below are editable.',
      'note.baseline.medal': 'The 100% line uses medal tiers from the agent-stats.com FAQ (Bronze/Onyx, 50 fields); unmapped fields fall back to a rounded self-baseline. These are not official population averages.',
      'note.norm': 'The Ingress chart normalises the strongest axis to 100% and shows relative strength only; the custom chart uses real values and allows overflow.',
      'preset.save': 'Save current setup', 'preset.namePh': 'Setup name', 'preset.load': 'Load',
      'preset.delete': 'Delete', 'preset.none': '(no saved setups)',
      'preset.saved': 'Saved setup: {0}', 'preset.loaded': 'Loaded setup: {0}', 'preset.deleted': 'Deleted setup: {0}',
      'preset.needName': 'Enter a setup name first', 'preset.noSelect': 'Select a saved setup first',
      'preset.kind.ingress': 'Ingress setup', 'preset.kind.custom': 'Custom setup',
      'preset.kind.style': 'Style only', 'preset.savedShort': 'Saved ✓',
      'warn.empty': 'Empty input', 'warn.json': 'JSON parse failed: {0}',
      'warn.colMismatch': '{0} headers / {1} values; aligned to the shorter',
      'warn.noFields': 'No numeric fields recognised; check the delimiter',
      'status.parsed': 'Parsed {0} numeric fields',
      'status.noData': 'Paste agent data with numeric values first',
      'status.autopick': 'Picked six relatively prominent metrics',
      'status.warnings': '{0}',
      'export.fail': 'Export failed: browser produced no image',
      'export.done': 'Exported {0}×{0} print-optimised transparent PNG',
      'theme.toLight': 'Switch to light theme', 'theme.toDark': 'Switch to dark theme',
      'lang.toEn': 'Switch to English', 'lang.toZh': '切换到中文',
      'style.title': 'Style DIY', 'style.background': 'Background', 'style.bgMode': 'Preset',
      'style.bg.transparent': 'Transparent', 'style.bg.paper': 'Paper', 'style.bg.light': 'Light grey',
      'style.bg.dark': 'Dark grey', 'style.bg.custom': 'Custom',
      'style.lines': 'Lines', 'style.base': 'Baseline', 'style.dataLine': 'Data edge',
      'style.follow': 'Faction', 'style.dataFill': 'Fill', 'style.spokes': 'Spokes', 'style.show': 'Draw',
      'style.vertex': 'Vertex dots', 'style.radius': 'Radius', 'style.radiusHint': '0 = none',
      'style.vertexFill': 'Fill', 'style.vertexStroke': 'Stroke', 'style.text': 'Text',
      'style.labelFont': 'Axis font', 'style.labelSize': 'Axis size', 'style.labelColor': 'Axis colour',
      'style.labelDist': 'Axis offset', 'style.titleFont': 'Title font',
      'style.titleSize': 'Title size', 'style.titleColor': 'Title colour',
      'axis.head.field': 'Metric · base%', 'axis.head.value': 'Value',
      'axis.head.base': 'Base', 'axis.head.norm': 'Norm%',
      'style.rings': 'Rings', 'style.ringLabels': 'Ring labels%',
      'style.ringLabelFont': 'Ring label font', 'style.vertexValue': 'Vertex value',
      'style.valueFont': 'Value font', 'style.vertexPct': 'Vertex percent',
      'style.pctChip': 'Percent chip',
      'style.logo': 'Emblem', 'style.logoType': 'Emblem', 'style.logo.none': 'None',
      'style.logoSize': 'Size', 'style.logoAlpha': 'Opacity', 'style.logoColors': 'Logo colour'
    }
  };

  const state = {
    lang: 'zh',
    mode: 'ingress',
    theme: 'dark',
    faction: 'resistance',
    baselineMode: 'prominence',
    medalTier: 2,
    parsed: { meta: {}, values: {}, warnings: [], faction: 'resistance' },
    ingressAxes: [],
    customAxes: [],
    customTouched: false,
    style: Object.assign({}, DEFAULT_STYLE),
    title: '',
    customTitle: 'My Skills'
  };

  const els = {
    raw: $('raw-data'), status: $('parse-status'),
    baselineMode: $('baseline-mode'), medalTier: $('medal-tier'), baselineNote: $('baseline-note'),
    ingressEditor: $('axis-editor-ingress'), customEditor: $('axis-editor-custom'),
    title: $('chart-title'), customTitle: $('custom-title'),
    themeBtn: $('theme-toggle'), themeIcon: $('theme-icon'), langBtn: $('lang-toggle'),
    legendDot: $('legend-dot'), legendText: $('legend-text'),
    hudAgent: $('hud-agent'), hudLevel: $('hud-level'), hudAp: $('hud-ap'),
    hudFaction: $('hud-faction'), hudSigil: $('hud-sigil'), scopeReadout: $('scope-readout'),
    previewSub: $('preview-sub'),
    aboutBtn: $('about-btn'), aboutPopover: $('about-popover'), aboutClose: $('about-close'),
    githubLink: $('github-link'), aboutGithub: $('about-github'),
    canvasWrap: $('canvas-wrap'), stylePanel: $('style-panel'),
    saveBtn: $('btn-save'), presetName: $('preset-name'),
    styleSaveBtn: $('style-save'), stylePresetName: $('style-preset-name'),
    presetSelect: $('preset-select'), loadBtn: $('btn-load'), deletePresetBtn: $('btn-delete-preset'),
    canvas: $('chart'), exportScale: $('export-scale'), exportStatus: $('export-status')
  };

  let statusDesc = null;
  let exportStatusDesc = null;

  /* ---------- 通用工具 ---------- */
  function t(key, args) {
    let s = I18N[state.lang][key] || key;
    if (args) s = s.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] == null ? '' : args[Number(i)]));
    return s;
  }

  function hexToRgba(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function font(size, weight, family) {
    return (weight || 500) + ' ' + size + 'px ' + (family || '"Segoe UI","Microsoft YaHei",sans-serif');
  }

  function fitFont(ctx, text, maxWidth, size, minSize, weight, family) {
    let s = size;
    ctx.font = font(s, weight, family);
    while (s > minSize && ctx.measureText(text).width > maxWidth) {
      s -= 0.6;
      ctx.font = font(s, weight, family);
    }
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const c = Math.min(r, w * 0.25, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + c, y);
    ctx.lineTo(x + w - c, y);
    ctx.lineTo(x + w, y + c);
    ctx.lineTo(x + w, y + h - c);
    ctx.lineTo(x + w - c, y + h);
    ctx.lineTo(x + c, y + h);
    ctx.lineTo(x, y + h - c);
    ctx.lineTo(x, y + c);
    ctx.closePath();
  }

  function styleNum(id, fallback) {
    const v = Number($(id).value);
    return isFinite(v) ? v : fallback;
  }

  function logoColorKey(type) {
    return type === 'ingress' ? 'logoIngressC' : (type === 'enl' ? 'logoEnlC' : 'logoResC');
  }

  function syncLogoColorInput() {
    const type = $('st-logoType').value;
    const el = $('st-logoColor');
    el.value = state.style[logoColorKey(type)];
    el.title = type === 'ingress' ? 'Ingress' : (type === 'enl' ? 'Enlightened' : 'Resistance');
  }

  /** 从控件读取全部样式，并同步预览容器的透明棋盘格提示。 */
  function readStyle() {
    const S = state.style;
    S.bgMode = $('st-bgMode').value;
    S.bgColor = $('st-bgColor').value;
    S.baseW = styleNum('st-baseW', 2.4); S.baseC = $('st-baseC').value;
    S.dataW = styleNum('st-dataW', 4); S.dataC = $('st-dataC').value;
    S.dataFollow = $('st-dataFollow').checked;
    S.dataFillC = $('st-dataFillC').value; S.dataFillFollow = $('st-fillFollow').checked;
    S.fillAlpha = styleNum('st-fillAlpha', 30) / 100;
    S.spokeShow = $('st-spokeShow').checked;
    S.spokeW = styleNum('st-spokeW', 1.4); S.spokeC = $('st-spokeC').value;
    S.vertexR = styleNum('st-vertexR', 8);
    S.vertexC = $('st-vertexC').value; S.vertexFollow = $('st-vertexFollow').checked;
    S.vertexSW = styleNum('st-vertexSW', 2.5); S.vertexSC = $('st-vertexSC').value;
    S.labelFont = $('st-labelFont').value || DEFAULT_STYLE.labelFont;
    S.labelSize = styleNum('st-labelSize', 27); S.labelC = $('st-labelC').value;
    S.labelDist = styleNum('st-labelDist', 81);
    S.titleFont = $('st-titleFont').value || DEFAULT_STYLE.titleFont;
    S.titleSize = styleNum('st-titleSize', 36); S.titleC = $('st-titleC').value;
    S.ringShow = $('st-ringShow').checked;
    S.ringW = styleNum('st-ringW', 1); S.ringC = $('st-ringC').value;
    S.ringLabelShow = $('st-ringLabelShow').checked;
    S.ringLabelSize = styleNum('st-ringLabelSize', 12); S.ringLabelC = $('st-ringLabelC').value;
    S.ringLabelFont = $('st-ringLabelFont').value || DEFAULT_STYLE.ringLabelFont;
    S.valueShow = $('st-valueShow').checked;
    S.valueSize = styleNum('st-valueSize', 18); S.valueC = $('st-valueC').value;
    S.valueFont = $('st-valueFont').value || DEFAULT_STYLE.valueFont;
    S.pctShow = $('st-pctShow').checked;
    S.pctSize = styleNum('st-pctSize', 15); S.pctC = $('st-pctC').value;
    S.pctChipC = $('st-pctChipC').value;
    S.pctFont = $('st-pctFont').value || DEFAULT_STYLE.pctFont;
    S.logoType = $('st-logoType').value;
    S.logoSize = styleNum('st-logoSize', 60);
    S.logoAlpha = styleNum('st-logoAlpha', 12) / 100;
    S[logoColorKey(S.logoType)] = $('st-logoColor').value;
    els.canvasWrap.classList.toggle('is-transparent', S.bgMode === 'transparent');
    if (els.previewSub) {
      const bgText = t('preview.bg.' + S.bgMode) || t('preview.bg.paper');
      els.previewSub.textContent = bgText + ' · ' + t('preview.sub');
    }
  }

  function backgroundColor(S) {
    if (S.bgMode === 'transparent') return null;
    if (S.bgMode === 'custom') return S.bgColor;
    if (S.bgMode === 'dark') return '#141924';
    if (S.bgMode === 'light') return '#f4f6fa';
    return '#ffffff';
  }

  function hexagon(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 3;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function setStatus(key, cls, args) {
    statusDesc = { key: key, cls: cls, args: args || [] };
    paintStatus();
  }

  function paintStatus() {
    if (!statusDesc) return;
    els.status.textContent = t(statusDesc.key, statusDesc.args);
    els.status.className = 'status' + (statusDesc.cls ? ' ' + statusDesc.cls : '');
  }

  function paintExportStatus() {
    if (!exportStatusDesc) return;
    els.exportStatus.textContent = t(exportStatusDesc.key, exportStatusDesc.args);
  }

  /* ---------- i18n ---------- */
  function applyLang() {
    document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const v = I18N[state.lang][el.dataset.i18n];
      if (v !== undefined) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const v = I18N[state.lang][el.dataset.i18nHtml];
      if (v !== undefined) el.innerHTML = v;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const v = I18N[state.lang][el.dataset.i18nPh];
      if (v !== undefined) el.setAttribute('placeholder', v);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const v = I18N[state.lang][el.dataset.i18nAria];
      if (v !== undefined) el.setAttribute('aria-label', v);
    });
    els.langBtn.textContent = state.lang === 'zh' ? 'EN' : '中';
    els.langBtn.title = t(state.lang === 'zh' ? 'lang.toEn' : 'lang.toZh');
    els.themeBtn.title = t(state.theme === 'dark' ? 'theme.toDark' : 'theme.toLight');
    if (!state.customTouched) {
      state.customAxes.forEach((a, i) => { a.name = CUSTOM_DEFAULTS[i][state.lang]; });
    }
    updateBaselineNote();
    if (els.previewSub && state.style) {
      const bgText = t('preview.bg.' + state.style.bgMode) || t('preview.bg.paper');
      els.previewSub.textContent = bgText + ' · ' + t('preview.sub');
    }
    renderIngressEditor();
    renderCustomEditor();
    paintStatus();
    paintExportStatus();
    populatePresetSelect();
    render();
  }

  function setLang(lang) {
    state.lang = lang === 'en' ? 'en' : 'zh';
    try { localStorage.setItem('sg-lang', state.lang); } catch (e) { /* 隐私模式下忽略 */ }
    applyLang();
  }

  function updateBaselineNote() {
    els.baselineNote.textContent = t(state.baselineMode === 'medal'
      ? 'note.baseline.medal' : 'note.baseline.prominence');
  }

  /* ---------- 轴数据 ---------- */
  function autoPickAxes() {
    const keys = SG.selectAxes(state.parsed.values, state.baselineMode, state.medalTier);
    if (!keys.length) { setStatus('status.noData', 'err'); return; }
    state.ingressAxes = keys.map(key => ({
      key: key,
      value: state.parsed.values[key] || 0,
      base: SG.baselineFor(key, state.parsed.values[key] || 1, state.baselineMode, state.medalTier)
    }));
    renderIngressEditor();
    render();
    setStatus('status.autopick', 'ok');
  }

  function refreshBaselines() {
    state.ingressAxes.forEach(a => {
      a.base = SG.baselineFor(a.key, a.value || 1, state.baselineMode, state.medalTier);
    });
    renderIngressEditor();
    render();
  }

  function renderIngressEditor() {
    let html = '';
    state.ingressAxes.forEach((a, i) => {
      const pct = a.base > 0 ? (a.value / a.base * 100) : 0;
      const options = SG.FIELD_DEFS.map(f => {
        const v = state.parsed.values[f.key];
        let suffix = '';
        if (isFinite(v) && v > 0) {
          const b = SG.baselineFor(f.key, v, state.baselineMode, state.medalTier);
          suffix = ' · ' + Math.round(v / b * 100) + '%';
        }
        return '<option value="' + f.key + '"' + (f.key === a.key ? ' selected' : '') + '>' + f.en + suffix + '</option>';
      }).join('');
      html += '<div class="axis-row" data-i="' + i + '">' +
        '<select class="axis-select" aria-label="' + t('aria.axisField', [i + 1]) + '">' + options + '</select>' +
        '<input class="axis-value" type="text" inputmode="decimal" value="' + a.value + '" aria-label="' + t('aria.value') + '">' +
        '<input class="axis-base" type="text" inputmode="decimal" value="' + (Math.round(a.base * 100) / 100) + '" aria-label="' + t('aria.base') + '">' +
        '<span class="axis-pct' + (pct > 100 ? ' over' : '') + '">' + Math.round(pct) + '%</span>' +
        '</div>';
    });
    els.ingressEditor.innerHTML = html;
  }

  function renderCustomEditor() {
    let html = '';
    state.customAxes.forEach((a, i) => {
      const pct = a.base > 0 ? (a.value / a.base * 100) : 0;
      const name = String(a.name).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      html += '<div class="axis-row" data-i="' + i + '">' +
        '<textarea class="axis-name" rows="2" aria-label="' + t('aria.name') + '">' + name + '</textarea>' +
        '<input class="axis-value" type="text" inputmode="decimal" value="' + a.value + '" aria-label="' + t('aria.value') + '">' +
        '<input class="axis-base" type="text" inputmode="decimal" value="' + a.base + '" aria-label="' + t('aria.max') + '">' +
        '<span class="axis-pct' + (pct > 100 ? ' over' : '') + '">' + Math.round(pct) + '%</span>' +
        '</div>';
    });
    els.customEditor.innerHTML = html;
  }

  function rawAxes() {
    if (state.mode === 'custom') {
      return state.customAxes.map(a => ({
        label: a.name || 'Skill',
        value: Math.max(0, SG.parseNum(a.value) || 0),
        base: Math.max(1e-9, SG.parseNum(a.base) || 1)
      }));
    }
    return state.ingressAxes.map(a => {
      const def = SG.FIELD_MAP[a.key] || { en: a.key };
      return {
        label: def.en,
        value: Math.max(0, SG.parseNum(a.value) || 0),
        base: Math.max(1e-9, SG.parseNum(a.base) || 1)
      };
    });
  }

  /** Ingress：按最强轴的 value/base 归一化为 100%，只表达相对强弱，不会爆表。
   *  自定义：保留真实比率，允许顶点突破外圈。 */
  function currentAxes() {
    const axes = rawAxes();
    const withRaw = axes.map(a => Object.assign({}, a, {
      rawValue: a.value,
      rawPct: a.base > 0 ? (a.value / a.base) * 100 : 0
    }));
    if (state.mode !== 'ingress') return withRaw;
    const max = Math.max(0, ...withRaw.map(a => a.value / a.base));
    if (!(max > 0)) return withRaw.map(a => Object.assign({}, a, { value: 0, base: 1 }));
    return withRaw.map(a => ({
      label: a.label,
      value: (a.value / a.base) / max,
      base: 1,
      rawValue: a.rawValue,
      rawPct: a.rawPct
    }));
  }

  function currentTitle() {
    if (state.mode === 'custom') return state.customTitle || 'My Skills';
    return state.title || state.parsed.meta.agentname || 'Ingress Agent';
  }

  /* 真实 logo 资源：data URI 图片，预加载后可安全绘制并导出（不污染 canvas）。 */
  const LOGO_IMAGES = {};

  function initLogos() {
    const src = window.SG_LOGOS || {};
    Object.keys(src).forEach(key => {
      const img = new Image();
      img.onload = () => { LOGO_IMAGES[key] = img; render(); };
      img.src = src[key];
    });
  }

  function drawBackgroundLogo(ctx, cx, cy, size, color, alpha, type) {
    if (type === 'none' || !(alpha > 0) || !(size > 0)) return;
    const img = LOGO_IMAGES[type];
    if (!img || !img.complete || !img.naturalWidth) return;
    const S = state.style;
    const tint = type === 'ingress' ? S.logoIngressC
      : (type === 'enl' ? S.logoEnlC : S.logoResC);
    const w = img.naturalWidth, h = img.naturalHeight;
    const drawW = size * 2, drawH = drawW * h / w;
    const cacheKey = type + '|' + tint;
    if (!img._tinted || img._tinted.key !== cacheKey) {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = tint;
      x.fillRect(0, 0, w, h);
      img._tinted = { key: cacheKey, canvas: c };
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img._tinted.canvas, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
    ctx.restore();
  }

  function drawAxisLabelLine(ctx, text, lx, ly, align, avail, S) {
    const parts = String(text).split(' / ');
    ctx.fillStyle = S.labelC;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
      const num = parts[0].trim(), den = parts[1].trim();
      ctx.font = font(S.labelSize, 700, S.labelFont);
      const w = Math.max(ctx.measureText(num).width, ctx.measureText(den).width) * 1.08;
      const gap = S.labelSize * 0.78;
      ctx.fillText(num, lx, ly - gap / 2);
      ctx.fillText(den, lx, ly + gap / 2);
      const x1 = align === 'left' ? lx : (align === 'right' ? lx - w : lx - w / 2);
      ctx.strokeStyle = S.labelC;
      ctx.lineWidth = Math.max(1, S.labelSize * 0.045);
      ctx.beginPath();
      ctx.moveTo(x1, ly);
      ctx.lineTo(x1 + w, ly);
      ctx.stroke();
      return;
    }
    fitFont(ctx, text, Math.max(60, avail), S.labelSize, S.labelSize * 0.5, 700, S.labelFont);
    ctx.fillText(text, lx, ly);
  }

  /** 支持多行；X / Y 形式用分数排版：分子在上、分母在下、中间横线；字号不缩小。 */
  function drawAxisLabel(ctx, text, lx, ly, align, avail, S) {
    const lines = String(text).split(/\r?\n/);
    const lineH = S.labelSize * 1.35;
    lines.forEach((line, i) => {
      drawAxisLabelLine(ctx, line, lx, ly + (i - (lines.length - 1) / 2) * lineH, align, avail, S);
    });
  }

  /* ---------- 绘制：预览与导出共用 state.style ---------- */
  function drawChart(ctx, axes, title, W) {
    const S = state.style;
    const faction = FACTIONS[state.faction].color;
    const dataColor = S.dataFollow ? faction : S.dataC;
    const fillColor = S.dataFillFollow ? faction : S.dataFillC;
    const vertexColor = S.vertexFollow ? faction : S.vertexC;
    const bg = backgroundColor(S);

    ctx.clearRect(0, 0, W, W);
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, W); }

    const cx = W / 2, cy = W / 2;
    const R = W * 0.30;                       // 基线六边形固定
    const labelR = R + S.labelDist;           // 轴名距六边形距离可调

    // 六边形内的高透明度徽标背景
    const logoColor = S.logoType === 'enl' ? '#22c55e'
      : (S.logoType === 'res' ? '#00aeef' : faction);
    drawBackgroundLogo(ctx, cx, cy, R * S.logoSize / 100, logoColor, S.logoAlpha, S.logoType);

    // 基线六边形；同心环默认不画，可开启
    ctx.lineJoin = 'round';
    hexagon(ctx, cx, cy, R);
    ctx.strokeStyle = S.baseC;
    ctx.lineWidth = S.baseW;
    ctx.stroke();
    if (S.ringShow) {
      ctx.save();
      ctx.strokeStyle = S.ringC;
      ctx.lineWidth = S.ringW;
      [0.2, 0.4, 0.6, 0.8].forEach(m => { hexagon(ctx, cx, cy, R * m); ctx.stroke(); });
      ctx.restore();
    }

    // 形心到基线的细线，可选不画
    if (S.spokeShow) {
      ctx.save();
      ctx.strokeStyle = S.spokeC;
      ctx.lineWidth = S.spokeW;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 数据多边形：自定义模式画出真实突破；仅对荒谬大值设上限以避免坐标溢出
    const DRAW_CAP = 50;
    const pts = axes.map((a, i) => {
      const ang = -Math.PI / 2 + i * Math.PI / 3;
      const ratio = a.value / a.base;
      const rr = Math.min(DRAW_CAP, Math.max(0, ratio)) * R;
      return { x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr, ratio: ratio };
    });
    ctx.beginPath();
    pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.closePath();
    ctx.fillStyle = hexToRgba(fillColor, S.fillAlpha);
    ctx.fill();
    ctx.strokeStyle = dataColor;
    ctx.lineWidth = S.dataW;
    ctx.stroke();

    // 环刻度默认不写，可开启
    if (S.ringLabelShow) {
      ctx.save();
      ctx.fillStyle = S.ringLabelC;
      ctx.font = font(S.ringLabelSize, 500, S.ringLabelFont);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      [0.2, 0.4, 0.6, 0.8, 1].forEach(m => {
        ctx.fillText(Math.round(m * 100) + '%', cx + W * 0.012, cy - R * m);
      });
      ctx.restore();
    }

    // 顶点圆点：半径 0 时不画
    if (S.vertexR > 0) {
      pts.forEach(p => {
        if (Math.abs(p.x - cx) > W * 0.62 || Math.abs(p.y - cy) > W * 0.62) return;
        ctx.beginPath();
        ctx.arc(p.x, p.y, S.vertexR, 0, Math.PI * 2);
        ctx.fillStyle = vertexColor;
        ctx.fill();
        if (S.vertexSW > 0) {
          ctx.lineWidth = S.vertexSW;
          ctx.strokeStyle = S.vertexSC;
          ctx.stroke();
        }
      });
    }

    // 轴端能力名（分数形式）+ 可选数值与百分比
    axes.forEach((a, i) => {
      const ang = -Math.PI / 2 + i * Math.PI / 3;
      const cos = Math.cos(ang), sin = Math.sin(ang);
      const lx = cx + cos * labelR;
      const ly = cy + sin * labelR;
      const align = cos > 0.25 ? 'left' : (cos < -0.25 ? 'right' : 'center');
      const avail = align === 'left' ? (W - lx - W * 0.012)
        : (align === 'right' ? (lx - W * 0.012) : (W * 0.32));
      drawAxisLabel(ctx, a.label, lx, ly, align, avail, S);

      let below = ly + S.labelSize * 0.75;
      if (S.valueShow) {
        ctx.fillStyle = S.valueC;
        ctx.font = font(S.valueSize, 500, S.valueFont);
        ctx.textAlign = align;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(SG.formatNumber(a.rawValue == null ? a.value : a.rawValue, state.lang), lx, below);
        below += S.valueSize * 1.15;
      }
      if (S.pctShow) {
        const txt = Math.round(a.rawPct == null ? (a.value / a.base * 100) : a.rawPct) + '%';
        ctx.font = font(S.pctSize, 700, S.pctFont);
        const tw = ctx.measureText(txt).width;
        const cw = tw + W * 0.018;
        const ch = S.pctSize * 1.5;
        const chipX = align === 'left' ? lx : (align === 'right' ? lx - cw : lx - cw / 2);
        roundRectPath(ctx, chipX, below - S.pctSize * 0.5, cw, ch, ch / 2);
        ctx.fillStyle = S.pctChipC;
        ctx.fill();
        ctx.fillStyle = S.pctC;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, chipX + cw / 2, below - S.pctSize * 0.5 + ch / 2);
      }
    });

    // 中心只保留标题；不画标示能力偏移的迷你六边形
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = S.titleC;
    ctx.font = font(S.titleSize, 700, S.titleFont);
    ctx.fillText(title || '', cx, cy + W * 0.012);
  }

  function render() {
    const ctx = els.canvas.getContext('2d');
    drawChart(ctx, currentAxes(), currentTitle(), BASE);
    updatePercentLabels();
    updateHud();
  }

  function updateHud() {
    const meta = state.parsed.meta || {};
    const values = state.parsed.values || {};
    els.hudAgent.textContent = meta.agentname || '—';
    els.hudLevel.textContent = (values.level != null) ? String(values.level) : '—';
    els.hudAp.textContent = (values.lifetimeap != null)
      ? SG.formatNumber(values.lifetimeap, state.lang) : '—';
    els.hudFaction.textContent = FACTIONS[state.faction].name;
    if (els.hudSigil && window.SG_FACTION_LOGOS) {
      els.hudSigil.src = window.SG_FACTION_LOGOS[state.faction];
    }
    if (els.scopeReadout) {
      const parts = [meta.timespan, meta.date, meta.time].filter(Boolean);
      els.scopeReadout.textContent = parts.length ? parts.join(' · ') : 'LOCAL GRID / NO TELEMETRY';
    }
  }

  function updatePercentLabels() {
    const editor = state.mode === 'custom' ? els.customEditor : els.ingressEditor;
    const axes = currentAxes();
    editor.querySelectorAll('.axis-row').forEach((row, i) => {
      const span = row.querySelector('.axis-pct');
      if (!span || !axes[i]) return;
      const pct = Math.round(axes[i].value / axes[i].base * 100);
      span.textContent = pct + '%';
      span.classList.toggle('over', pct > 100);
    });
  }

  /* ---------- 方案保存 / 载入 ---------- */
  const PRESET_KEY = 'sg-presets';

  function loadPresets() {
    try {
      const arr = JSON.parse(localStorage.getItem(PRESET_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function storePresets(arr) {
    try { localStorage.setItem(PRESET_KEY, JSON.stringify(arr)); } catch (e) { /* 隐私模式忽略 */ }
  }

  function presetLabel(p) {
    const kind = p.kind || (p.mode === 'custom' ? 'custom' : 'ingress');
    return t('preset.kind.' + kind) + ' · ' + String(p.name || '');
  }

  function populatePresetSelect(selected) {
    const arr = loadPresets();
    els.presetSelect.innerHTML = arr.length
      ? arr.map((p, i) => '<option value="' + i + '">' + presetLabel(p).replace(/</g, '&lt;') + '</option>').join('')
      : '<option value="">' + t('preset.none') + '</option>';
    if (selected != null && arr[selected]) els.presetSelect.value = String(selected);
  }

  function setSaveState(btn, dirty) {
    if (!btn) return;
    btn.classList.remove('hidden', 'is-saved');
    if (!dirty) btn.classList.add('is-saved');
    btn.textContent = dirty ? t('preset.save') : t('preset.savedShort');
  }

  // which: 'main'（默认，六维轴/基准/标题/阵营）| 'style'（样式 DIY）| 'both'
  function markDirty(which) {
    if (which === 'style') setSaveState(els.styleSaveBtn, true);
    else if (which === 'both') { setSaveState(els.saveBtn, true); setSaveState(els.styleSaveBtn, true); }
    else setSaveState(els.saveBtn, true);
  }

  function markClean(which) {
    if (which === 'style') setSaveState(els.styleSaveBtn, false);
    else if (which === 'both') { setSaveState(els.saveBtn, false); setSaveState(els.styleSaveBtn, false); }
    else setSaveState(els.saveBtn, false);
  }

  function capturePreset(name, kind) {
    const preset = {
      name: name,
      kind: kind || (state.mode === 'custom' ? 'custom' : 'ingress'),
      nameField: kind === 'style' ? 'style' : 'main',
      faction: state.faction,
      theme: state.theme,
      style: Object.assign({}, state.style)
    };
    if (preset.kind !== 'style') {
      Object.assign(preset, {
        mode: state.mode,
        baselineMode: state.baselineMode,
        medalTier: state.medalTier,
        title: state.title,
        customTitle: state.customTitle,
        customTouched: state.customTouched,
        customAxes: state.customAxes.map(a => Object.assign({}, a)),
        ingressAxes: state.ingressAxes.map(a => Object.assign({}, a))
      });
    }
    return preset;
  }

  function savePreset(kindOverride) {
    const kind = kindOverride || (state.mode === 'custom' ? 'custom' : 'ingress');
    const nameEl = kind === 'style' ? els.stylePresetName : els.presetName;
    const name = nameEl.value.trim();
    if (!name) { setStatus('preset.needName', 'err'); return; }
    const arr = loadPresets();
    const idx = arr.findIndex(p => p.name === name && (p.kind || 'ingress') === kind);
    const preset = capturePreset(name, kind);
    if (idx >= 0) arr[idx] = preset; else arr.push(preset);
    storePresets(arr);
    populatePresetSelect(idx >= 0 ? idx : arr.length - 1);
    markClean(kind === 'style' ? 'style' : 'main');
    setStatus('preset.saved', 'ok', [presetLabel(preset)]);
  }

  function savePresetFromStyle() {
    savePreset('style');
  }

  function applyPreset(p) {
    const styleOnly = (p.kind || '') === 'style';
    if (!styleOnly) {
      state.mode = p.mode === 'custom' ? 'custom' : 'ingress';
      state.faction = p.faction === 'enlightened' ? 'enlightened' : 'resistance';
      state.theme = p.theme === 'light' ? 'light' : 'dark';
      state.baselineMode = p.baselineMode === 'medal' ? 'medal' : 'prominence';
      state.medalTier = Math.max(0, Math.min(4, Number(p.medalTier) || 0));
      state.title = p.title || '';
      state.customTitle = p.customTitle || 'My Skills';
      state.customTouched = !!p.customTouched;
      state.customAxes = (p.customAxes || []).map(a => Object.assign({}, a));
      state.ingressAxes = (p.ingressAxes || []).map(a => Object.assign({}, a));
    }
    state.style = Object.assign({}, DEFAULT_STYLE, p.style || {});

    // 回写所有控件
    if (!styleOnly) {
      els.title.value = state.title;
      els.customTitle.value = state.customTitle;
      els.baselineMode.value = state.baselineMode;
      els.medalTier.value = String(state.medalTier);
      els.medalTier.disabled = state.baselineMode !== 'medal';
    }
    Object.keys(STYLE_CONTROLS).forEach(k => {
      const el = $(STYLE_CONTROLS[k]);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!state.style[k];
      else if (k === 'fillAlpha') el.value = String(Math.round(state.style.fillAlpha * 100));
      else if (k === 'logoAlpha') el.value = String(Math.round(state.style.logoAlpha * 100));
      else el.value = String(state.style[k]);
    });

    syncLogoColorInput();
    readStyle();
    if (!styleOnly) {
      setTheme(state.theme);
      setFaction(state.faction);
      setMode(state.mode);
      updateBaselineNote();
      renderIngressEditor();
      renderCustomEditor();
    }
    markClean(styleOnly ? 'style' : 'main');
    render();
  }

  function loadPreset() {
    const idx = Number(els.presetSelect.value);
    const arr = loadPresets();
    if (!isFinite(idx) || !arr[idx]) { setStatus('preset.noSelect', 'err'); return; }
    applyPreset(arr[idx]);
    if ((arr[idx].nameField || 'main') === 'style') els.stylePresetName.value = arr[idx].name;
    else els.presetName.value = arr[idx].name;
    setStatus('preset.loaded', 'ok', [presetLabel(arr[idx])]);
  }

  function deletePreset() {
    const idx = Number(els.presetSelect.value);
    const arr = loadPresets();
    if (!isFinite(idx) || !arr[idx]) { setStatus('preset.noSelect', 'err'); return; }
    const name = arr[idx].name;
    arr.splice(idx, 1);
    storePresets(arr);
    populatePresetSelect();
    setStatus('preset.deleted', 'ok', [name]);
  }

  /* ---------- 交互 ---------- */
  function setFaction(f) {
    state.faction = f;
    ['resistance', 'enlightened'].forEach(k => {
      $('faction-' + k).classList.toggle('active', k === f);
    });
    els.legendDot.style.background = FACTIONS[f].color;
    els.legendDot.style.boxShadow = 'none';
    els.legendText.textContent = FACTIONS[f].name;
    render();
  }

  function setTheme(theme) {
    state.theme = theme;
    document.documentElement.dataset.theme = theme;
    els.themeIcon.textContent = theme === 'dark' ? '☾' : '☀';
    els.themeBtn.title = theme === 'dark' ? t('theme.toDark') : t('theme.toLight');
    render();
  }

  function setMode(mode) {
    state.mode = mode;
    ['ingress', 'custom'].forEach(k => {
      $('tab-' + k).classList.toggle('active', k === mode);
      $('pane-' + k).classList.toggle('hidden', k !== mode);
    });
    render();
  }

  function parseText(text) {
    const r = SG.parseAgentData(text);
    state.parsed = r;
    if (r.warnings.length) {
      const joined = r.warnings.map(w => t(w.key, w.args)).join(state.lang === 'zh' ? '；' : ' | ');
      setStatus('status.warnings', 'err', [joined]);
    } else {
      setStatus('status.parsed', 'ok', [Object.keys(r.values).length]);
    }
    if (r.faction) setFaction(r.faction);
    autoPickAxes();
    markDirty('main');
  }

  function bindEditor(editor, isCustom) {
    editor.addEventListener('input', (e) => {
      const row = e.target.closest('.axis-row');
      if (!row) return;
      const i = Number(row.dataset.i);
      const cls = e.target.className;
      if (isCustom) {
        if (cls === 'axis-name') { state.customAxes[i].name = e.target.value; state.customTouched = true; }
        if (cls === 'axis-value') state.customAxes[i].value = e.target.value;
        if (cls === 'axis-base') state.customAxes[i].base = e.target.value;
      } else {
        if (cls === 'axis-value') state.ingressAxes[i].value = SG.parseNum(e.target.value) || 0;
        if (cls === 'axis-base') state.ingressAxes[i].base = SG.parseNum(e.target.value) || 1;
      }
      markDirty('main');
      render();
    });
    editor.addEventListener('change', (e) => {
      if (isCustom || e.target.className !== 'axis-select') return;
      const row = e.target.closest('.axis-row');
      const i = Number(row.dataset.i);
      const key = e.target.value;
      const v = state.parsed.values[key] || 0;
      state.ingressAxes[i] = {
        key: key,
        value: v,
        base: SG.baselineFor(key, v || 1, state.baselineMode, state.medalTier)
      };
      renderIngressEditor();
      markDirty('main');
      render();
    });
  }

  function exportPNG() {
    const scale = Number(els.exportScale.value) || 3;
    const c = document.createElement('canvas');
    c.width = BASE * scale;
    c.height = BASE * scale;
    const ctx = c.getContext('2d');
    ctx.scale(scale, scale);
    drawChart(ctx, currentAxes(), currentTitle(), BASE);   // 与预览完全同一套样式
    c.toBlob((blob) => {
      if (!blob) { exportStatusDesc = { key: 'export.fail', args: [] }; paintExportStatus(); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safe = (currentTitle() || 'skills-graph').replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
      a.href = url;
      a.download = safe + '-' + FACTIONS[state.faction].name + '-' + (BASE * scale) + 'px.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      exportStatusDesc = { key: 'export.done', args: [BASE * scale] };
      paintExportStatus();
    }, 'image/png');
  }

  const GITHUB_URL = '#'; // TODO: 填入本项目 GitHub 仓库地址

  function setAboutOpen(open) {
    els.aboutPopover.classList.toggle('hidden', !open);
    els.aboutBtn.setAttribute('aria-expanded', String(open));
  }

  function bindAbout() {
    [els.githubLink, els.aboutGithub].forEach(a => { if (a) a.href = GITHUB_URL; });
    els.aboutBtn.addEventListener('click', () => {
      setAboutOpen(els.aboutPopover.classList.contains('hidden'));
    });
    els.aboutClose.addEventListener('click', () => setAboutOpen(false));
    document.addEventListener('pointerdown', (e) => {
      if (els.aboutPopover.classList.contains('hidden')) return;
      if (els.aboutPopover.contains(e.target) || els.aboutBtn.contains(e.target)) return;
      setAboutOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !els.aboutPopover.classList.contains('hidden')) {
        setAboutOpen(false);
        els.aboutBtn.focus();
      }
    });
  }

  function init() {
    let saved = 'zh';
    try { saved = localStorage.getItem('sg-lang') || 'zh'; } catch (e) { /* 忽略 */ }
    state.lang = saved === 'en' ? 'en' : 'zh';
    state.customAxes = CUSTOM_DEFAULTS.map(d => ({ name: d[state.lang], value: d.value, base: d.base }));

    els.raw.value = SG.SAMPLE_DATA;
    setTheme('dark');
    setFaction('resistance');
    setMode('ingress');
    bindAbout();

    $('btn-sample').addEventListener('click', () => {
      els.raw.value = SG.SAMPLE_DATA;
      parseText(els.raw.value);
    });
    $('btn-parse').addEventListener('click', () => parseText(els.raw.value));
    let parseTimer = null;
    els.raw.addEventListener('input', () => {
      clearTimeout(parseTimer);
      parseTimer = setTimeout(() => parseText(els.raw.value), 350);
    });
    $('btn-autopick').addEventListener('click', () => { autoPickAxes(); markDirty('main'); });
    $('btn-export').addEventListener('click', exportPNG);
    els.saveBtn.addEventListener('click', () => savePreset());
    els.styleSaveBtn.addEventListener('click', savePresetFromStyle);
    els.loadBtn.addEventListener('click', loadPreset);
    els.deletePresetBtn.addEventListener('click', deletePreset);

    els.baselineMode.addEventListener('change', () => {
      state.baselineMode = els.baselineMode.value;
      els.medalTier.disabled = state.baselineMode !== 'medal';
      updateBaselineNote();
      autoPickAxes();
      markDirty('main');
    });
    els.medalTier.addEventListener('change', () => {
      state.medalTier = Number(els.medalTier.value);
      if (state.baselineMode === 'medal') autoPickAxes();
      else refreshBaselines();
      markDirty('main');
    });

    els.title.addEventListener('input', () => { state.title = els.title.value; markDirty('main'); render(); });
    els.customTitle.addEventListener('input', () => { state.customTitle = els.customTitle.value; markDirty('main'); render(); });

    $('tab-ingress').addEventListener('click', () => { setMode('ingress'); markDirty('main'); });
    $('tab-custom').addEventListener('click', () => { setMode('custom'); markDirty('main'); });
    $('faction-resistance').addEventListener('click', () => { setFaction('resistance'); markDirty('main'); });
    $('faction-enlightened').addEventListener('click', () => { setFaction('enlightened'); markDirty('main'); });
    els.themeBtn.addEventListener('click', () => { setTheme(state.theme === 'dark' ? 'light' : 'dark'); markDirty('main'); });
    els.langBtn.addEventListener('click', () => setLang(state.lang === 'zh' ? 'en' : 'zh'));
    els.presetName.addEventListener('input', () => markDirty('main'));
    els.stylePresetName.addEventListener('input', () => markDirty('style'));

    bindEditor(els.ingressEditor, false);
    bindEditor(els.customEditor, true);

    document.querySelectorAll('.font-select').forEach(sel => {
      sel.innerHTML = FONT_OPTIONS.map(o =>
        '<option value="' + o[0].replace(/"/g, '&quot;') + '">' + o[1] + '</option>'
      ).join('');
      sel.value = DEFAULT_STYLE.labelFont;
    });

    syncLogoColorInput();
    readStyle();
    els.stylePanel.addEventListener('input', (e) => {
      if (e.target && e.target.id === 'st-logoType') syncLogoColorInput();
      readStyle(); markDirty('style'); render();
    });
    els.stylePanel.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'st-logoType') syncLogoColorInput();
      readStyle(); markDirty('style'); render();
    });

    populatePresetSelect();
    applyLang();
    parseText(els.raw.value);
    initLogos();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
