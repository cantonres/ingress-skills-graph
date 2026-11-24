/* ============================================================
 * data.js — 字段定义、公开勋章阈值、数据解析与自动选轴
 * 阈值来源：agent-stats.com/faq.php（官方 + 附加勋章，五档）
 * 分布参考：agent-stats.com/global.php（Lifetime AP 中位 ≈ 1,259 万，P75 ≈ 3,162 万）
 * 纯前端，无外部依赖。
 * ============================================================ */

const META_ALIASES = {
  timespan: 'timespan',
  agentname: 'agentname',
  agentfaction: 'agentfaction',
  faction: 'agentfaction',
  date: 'date',
  dateyyyymmdd: 'date',
  dateyyyy_mm_dd: 'date',
  time: 'time',
  timehhmmss: 'time'
};

const CATEGORIES = {
  general: { zh: '综合', en: 'General' },
  explore: { zh: '探索', en: 'Explore' },
  build:   { zh: '建造', en: 'Build' },
  link:    { zh: '连线', en: 'Link' },
  field:   { zh: '领域', en: 'Field' },
  combat:  { zh: '战斗', en: 'Combat' },
  hack:    { zh: '入侵', en: 'Hack' },
  drone:   { zh: '无人机', en: 'Drone' },
  mission: { zh: '任务', en: 'Mission' },
  event:   { zh: '活动', en: 'Event' },
  special: { zh: '特殊', en: 'Special' }
};

/* 有全球分布数据的衍生量（agent-stats.com/global.php 直方图分位数）。
 * 这些值不是原始字段，而是由两个原始字段计算得到；基准使用全球 P50。 */
const DERIVED_FIELDS = [
  { key: 'apphack',        zh: 'AP/Hack',        en: 'AP / Hack',        cat: 'hack',
    derived: true, calc: v => (v.lifetimeap || 0) / (v.hacks || 0),
    global: { p50: 800, p75: 1100, p90: 1400, n: 111391 } },
  { key: 'translatorhacker', zh: 'Glyph/Hack',   en: 'Translator / Hacker', cat: 'hack',
    derived: true, calc: v => (v.glyphhackpoints || 0) / (v.hacks || 0),
    global: { p50: 2, p75: 4, p90: 6, n: 89375 } },
  { key: 'destroybuild',   zh: '摧毁/建造',      en: 'Destroy / Build',  cat: 'combat',
    derived: true, calc: v => (v.resonatorsdestroyed || 0) / (v.resonatorsdeployed || 0),
    global: { p50: 0.7, p75: 0.9, p90: 1.1, n: 114176 } },
  { key: 'fieldlink',      zh: 'Field/Link',     en: 'Field / Link',     cat: 'field',
    derived: true, calc: v => (v.controlfieldscreated || 0) / (v.linkscreated || 0),
    global: { p50: 0.5, p75: 0.6, p90: 0.7, n: 113909 } },
  { key: 'mufield',        zh: 'MU/Field',       en: 'MU / Field',       cat: 'field',
    derived: true, excludeFromDefault: true,
    calc: v => (v.mindunitscaptured || 0) / (v.controlfieldscreated || 0),
    global: { p50: 177, p75: 1000, p90: 3162, n: 113190 } },
  { key: 'explorepioneer', zh: '首摸/首占',      en: 'Explorer / Pioneer', cat: 'explore',
    derived: true, calc: v => (v.uniqueportalsvisited || 0) / (v.uniqueportalscaptured || 0),
    global: { p50: 1.99526, p75: 3.16228, p90: 3.98107, n: 112810 } },
  { key: 'apkm',           zh: 'AP/km',          en: 'AP / km',          cat: 'general',
    derived: true, calc: v => (v.lifetimeap || 0) / (v.distancewalked || 0),
    global: { p50: 15848, p75: 19952, p90: 25118, n: 111500 } }
];

/* key 为 normalizeKey() 后的字段标识；en 为图上唯一使用的轴名 */
const FIELD_DEFS = [
  { key: 'level',                     zh: '等级',           en: 'Level',            cat: 'general' },
  { key: 'lifetimeap',                zh: '终生 AP',        en: 'Lifetime AP',      cat: 'general', medal: 'apLevel' },
  { key: 'currentap',                 zh: '当前 AP',        en: 'Current AP',       cat: 'general' },
  { key: 'uniqueportalsvisited',      zh: '首摸 Portal',    en: 'Portals Visited',  cat: 'explore', medal: 'explorer' },
  { key: 'uniqueportalsdronevisited', zh: '无人机首摸',     en: 'Drone UPV',        cat: 'drone',   medal: 'droneExplorer' },
  { key: 'furthestdronedistance',     zh: '无人机最远',     en: 'Drone Distance',   cat: 'drone',   medal: 'droneDistance' },
  { key: 'seerpoints',                zh: 'Seer 点数',      en: 'Seer Points',      cat: 'explore', medal: 'seer' },
  { key: 'xmcollected',               zh: 'XM 收集',        en: 'XM Collected',     cat: 'general', medal: 'collector' },
  { key: 'opragreements',             zh: 'OPR 协议',       en: 'OPR Agreements',   cat: 'mission', medal: 'recon' },
  { key: 'portalscansuploadeduniques',zh: '扫描上传',       en: 'Scans Uploaded',   cat: 'build',   medal: 'scout' },
  { key: 'scoutcontrolled',           zh: 'Scout 控制',     en: 'Scout Controlled', cat: 'special', medal: 'scoutController' },
  { key: 'resonatorsdeployed',        zh: '部署 Resonator', en: 'Resonators',       cat: 'build',   medal: 'builder' },
  { key: 'linkscreated',              zh: 'Link 数',        en: 'Links',            cat: 'link',    medal: 'connector' },
  { key: 'controlfieldscreated',      zh: 'Control Field',  en: 'Fields',           cat: 'field',   medal: 'mindController' },
  { key: 'mindunitscaptured',         zh: 'Mind Unit',      en: 'MU Captured',      cat: 'field',   medal: 'illuminator' },
  { key: 'longestlinkevercreated',    zh: '最长 Link',      en: 'Longest Link',     cat: 'link',    medal: 'binder' },
  { key: 'largestcontrolfield',       zh: '最大 Field',     en: 'Largest Field',    cat: 'field',   medal: 'countryMaster' },
  { key: 'xmrecharged',               zh: 'XM 充能',        en: 'XM Recharged',     cat: 'build',   medal: 'recharger' },
  { key: 'portalscaptured',           zh: '占领 Portal',    en: 'Portals Captured', cat: 'combat',  medal: 'liberator' },
  { key: 'uniqueportalscaptured',     zh: '首占 Portal',    en: 'Unique Captured',  cat: 'combat',  medal: 'pioneer' },
  { key: 'modsdeployed',              zh: '部署 Mod',       en: 'Mods Deployed',    cat: 'build',   medal: 'engineer' },
  { key: 'hacks',                     zh: 'Hack 次数',      en: 'Hacks',            cat: 'hack',    medal: 'hacker' },
  { key: 'dronehacks',                zh: '无人机 Hack',    en: 'Drone Hacks',      cat: 'drone',   medal: 'maverick' },
  { key: 'glyphhackpoints',           zh: 'Glyph 点数',     en: 'Glyph Points',     cat: 'hack',    medal: 'translator' },
  { key: 'overclockhackpoints',       zh: '超频点数',       en: 'Overclock',        cat: 'hack',    medal: 'overclocker' },
  { key: 'completedhackstreaks',      zh: '连续 Hack',      en: 'Hackstreaks',      cat: 'hack',    medal: 'epoch' },
  { key: 'longestsojournerstreak',    zh: '最长连续天数',   en: 'Sojourner',        cat: 'hack',    medal: 'sojourner' },
  { key: 'resonatorsdestroyed',       zh: '摧毁 Resonator', en: 'Res Destroyed',    cat: 'combat',  medal: 'purifier' },
  { key: 'portalsneutralized',        zh: '中立 Portal',    en: 'Neutralized',      cat: 'combat',  medal: 'neutralizer' },
  { key: 'enemylinksdestroyed',       zh: '摧毁敌方 Link',  en: 'Links Destroyed',  cat: 'combat',  medal: 'disruptor' },
  { key: 'enemyfieldsdestroyed',      zh: '摧毁敌方 Field', en: 'Fields Destroyed', cat: 'combat',  medal: 'salvator' },
  { key: 'battlebeaconcombatant',     zh: '战斗信标',       en: 'Battle Beacon',    cat: 'event',   medal: 'bbCombatant' },
  { key: 'dronesreturned',            zh: '无人机回收',     en: 'Drones Returned',  cat: 'drone',   medal: 'droneSender' },
  { key: 'machinalinksdestroyed',     zh: 'Machina Link',   en: 'Machina Links',    cat: 'combat',  medal: 'redDisruptor' },
  { key: 'machinaresonatorsdestroyed',zh: 'Machina Reson.', en: 'Machina Res',      cat: 'combat',  medal: 'redPurifier' },
  { key: 'machinaportalsneutralized', zh: 'Machina 中立',   en: 'Machina Neut.',    cat: 'combat',  medal: 'redNeutralizer' },
  { key: 'machinaportalsreclaimed',   zh: 'Machina 夺回',   en: 'Machina Reclaim',  cat: 'combat',  medal: 'reclaimer' },
  { key: 'maxtimeportalheld',         zh: 'Portal 持有天数',en: 'Portal Held',      cat: 'special', medal: 'guardian' },
  { key: 'maxtimelinkmaintained',     zh: 'Link 维持天数',  en: 'Link Maintained',  cat: 'link',    medal: 'smuggler' },
  { key: 'maxlinklengthxdays',        zh: 'Link 长度×天',   en: 'Link Length×Days', cat: 'link',    medal: 'linkMaster' },
  { key: 'maxtimefieldheld',          zh: 'Field 持有天数', en: 'Field Held',       cat: 'field',   medal: 'controller' },
  { key: 'largestfieldmusxdays',      zh: 'Field MU×天',    en: 'Field MU×Days',    cat: 'field',   medal: 'fieldMaster' },
  { key: 'forceddronerecalls',        zh: '强制召回',       en: 'Forced Recalls',   cat: 'drone',   medal: 'droneRecalls' },
  { key: 'distancewalked',            zh: '行走距离',       en: 'Distance Walked',  cat: 'explore', medal: 'trekker' },
  { key: 'kineticcapsules',           zh: '动能胶囊',       en: 'Kinetic Capsules', cat: 'special', medal: 'crafter' },
  { key: 'completeduniquemissions',   zh: '独特任务',       en: 'Unique Missions',  cat: 'mission', medal: 'specOps' },
  { key: 'completedresearchbounties', zh: '研究悬赏',       en: 'Research Bounties',cat: 'mission', medal: 'researchBounties' },
  { key: 'researchdayscompleted',     zh: '研究天数',       en: 'Research Days',    cat: 'mission', medal: 'researchDays' },
  { key: 'missiondaysattended',       zh: 'Mission Day',    en: 'Mission Days',     cat: 'event',   medal: 'missionDay' },
  { key: 'nl1331meetupsattended',      zh: 'NL-1331 聚会',   en: 'NL-1331',          cat: 'event',   medal: 'nl1331' },
  { key: 'secondsundayevents',        zh: 'Second Sunday',  en: 'Second Sunday',    cat: 'event',   medal: 'secondSunday' },
  { key: 'oriontokens',               zh: 'Orion 代币',     en: 'Orion Tokens',     cat: 'special' },
  { key: 'orionlinkandfieldpoints',   zh: 'Orion L/F 点',   en: 'Orion L&F',        cat: 'special' },
  { key: 'cygnustokens',              zh: 'Cygnus 代币',    en: 'Cygnus Tokens',    cat: 'special' },
  { key: 'cygnusbattlebeacons',       zh: 'Cygnus 信标',    en: 'Cygnus Beacons',   cat: 'special' },
  { key: 'recursions',                zh: 'Recursions',     en: 'Recursions',       cat: 'event',   medal: 'recursions' },
  ...DERIVED_FIELDS
];

/* 五档：铜 / 银 / 金 / 铂 / 玛瑙。null 表示该档无定义，回落到自身取整。
 * apLevel 为游戏等级所需累计 AP（L8/L12/L14/L15/L16），不属于 agent-stats 勋章。 */
const MEDALS = {
  apLevel:        { label: 'Level AP',        tiers: [1200000, 8400000, 17000000, 24000000, 40000000] },
  explorer:       { label: 'Explorer',        tiers: [100, 1000, 2000, 10000, 30000] },
  seer:           { label: 'Seer',            tiers: [10, 50, 200, 500, 5000] },
  recon:          { label: 'Recon',           tiers: [100, 750, 2500, 5000, 10000] },
  scout:          { label: 'Scout',           tiers: [50, 250, 1000, 3000, 6000] },
  scoutController:{ label: 'Scout Controller',tiers: [100, 500, 1000, 5000, 12000] },
  builder:        { label: 'Builder',         tiers: [2000, 10000, 30000, 100000, 200000] },
  connector:      { label: 'Connector',       tiers: [50, 1000, 5000, 25000, 100000] },
  mindController: { label: 'Mind Controller', tiers: [100, 500, 2000, 10000, 40000] },
  illuminator:    { label: 'Illuminator',     tiers: [5000, 50000, 250000, 1000000, 4000000] },
  recharger:      { label: 'Recharger',       tiers: [100000, 1000000, 3000000, 10000000, 25000000] },
  liberator:      { label: 'Liberator',       tiers: [100, 1000, 5000, 15000, 40000] },
  pioneer:        { label: 'Pioneer',         tiers: [20, 200, 1000, 5000, 20000] },
  engineer:       { label: 'Engineer',        tiers: [150, 1500, 5000, 20000, 50000] },
  hacker:         { label: 'Hacker',          tiers: [2000, 10000, 30000, 100000, 200000] },
  maverick:       { label: 'Maverick',        tiers: [250, 1000, 2000, 5000, 10000] },
  translator:     { label: 'Translator',      tiers: [200, 2000, 6000, 20000, 50000] },
  sojourner:      { label: 'Sojourner',       tiers: [15, 30, 60, 180, 360] },
  epoch:          { label: 'Epoch',           tiers: [2, 4, 8, 30, 60] },
  purifier:       { label: 'Purifier',        tiers: [2000, 10000, 30000, 100000, 300000] },
  reclaimer:      { label: 'Reclaimer',       tiers: [100, 1000, 5000, 15000, 40000] },
  trekker:        { label: 'Trekker',         tiers: [10, 100, 300, 1000, 2500] },
  specOps:        { label: 'SpecOps',         tiers: [5, 25, 100, 200, 500] },
  missionDay:     { label: 'Mission Day',     tiers: [1, 3, 6, 10, 20] },
  nl1331:         { label: 'NL-1331',         tiers: [1, 5, 10, 25, 50] },
  secondSunday:   { label: 'Second Sunday',   tiers: [1, 6, 12, 24, 36] },
  recursions:     { label: 'Recursions',      tiers: [1, null, null, null, null] },
  droneExplorer:  { label: 'Drone Explorer',  tiers: [100, 1000, 2000, 10000, 30000] },
  droneDistance:  { label: 'Drone Distance',  tiers: [10, 50, 100, 250, 500] },
  collector:      { label: 'Collector',       tiers: [100000, 1000000, 10000000, 100000000, 200000000] },
  crafter:        { label: 'Crafter',         tiers: [50, 100, 200, 350, 700] },
  binder:         { label: 'Binder',          tiers: [10, 200, 800, 1300, 1800] },
  countryMaster:  { label: 'Country Master',  tiers: [5000, 30000, 100000, 1000000, 5000000] },
  overclocker:    { label: 'Overclocker',     tiers: [750, 1250, 2250, 5500, 7500] },
  neutralizer:    { label: 'Neutralizer',     tiers: [100, 1000, 5000, 15000, 40000] },
  disruptor:      { label: 'Disruptor',       tiers: [50, 1000, 5000, 25000, 100000] },
  salvator:       { label: 'Salvator',        tiers: [100, 500, 2000, 10000, 40000] },
  bbCombatant:    { label: 'Battle Beacon',   tiers: [10, 50, 200, 1000, 4000] },
  redDisruptor:   { label: 'Machina Links',   tiers: [25, 500, 2500, 12500, 50000] },
  redPurifier:    { label: 'Machina Res',     tiers: [1000, 5000, 15000, 50000, 150000] },
  redNeutralizer: { label: 'Machina Neut.',   tiers: [50, 500, 2500, 7500, 20000] },
  guardian:       { label: 'Guardian',        tiers: [3, 10, 20, 90, 150] },
  smuggler:       { label: 'Smuggler',        tiers: [1, 5, 10, 45, 75] },
  linkMaster:     { label: 'Link Master',     tiers: [1, 10, 50, 200, 1000] },
  controller:     { label: 'Controller',      tiers: [1, 3, 8, 30, 50] },
  fieldMaster:    { label: 'Field Master',    tiers: [5000, 40000, 150000, 400000, 1000000] },
  droneRecalls:   { label: 'Drone Recalls',   tiers: [50, 100, 250, 500, 1000] },
  droneSender:    { label: 'Drone Sender',    tiers: [100, 200, 500, 800, 1200] },
  researchBounties:{ label: 'Research Bounty',tiers: [50, 150, 500, 1500, 5000] },
  researchDays:   { label: 'Research Days',   tiers: [15, 30, 60, 180, 360] }
};

const FIELD_MAP = Object.fromEntries(FIELD_DEFS.map(f => [f.key, f]));

/* ---------- 用户提供的示例数据 ---------- */
const SAMPLE_HEADER = [
  'Time Span','Agent Name','Agent Faction','Date (yyyy-mm-dd)','Time (hh:mm:ss)',
  'Level','Lifetime AP','Current AP','Unique Portals Visited','Unique Portals Drone Visited',
  'Furthest Drone Distance','Seer Points','XM Collected','OPR Agreements','Portal Scans Uploaded Uniques',
  'Scout Controlled','Resonators Deployed','Links Created','Control Fields Created','Mind Units Captured',
  'Longest Link Ever Created','Largest Control Field','XM Recharged','Portals Captured','Unique Portals Captured',
  'Mods Deployed','Hacks','Drone Hacks','Glyph Hack Points','Overclock Hack Points',
  'Completed Hackstreaks','Longest Sojourner Streak','Resonators Destroyed','Portals Neutralized','Enemy Links Destroyed',
  'Enemy Fields Destroyed','Battle Beacon Combatant','Drones Returned','Machina Links Destroyed','Machina Resonators Destroyed',
  'Machina Portals Neutralized','Machina Portals Reclaimed','Max Time Portal Held','Max Time Link Maintained','Max Link Length x Days',
  'Max Time Field Held','Largest Field MUs x Days','Forced Drone Recalls','Distance Walked','Kinetic Capsules',
  'Completed Unique Missions','Completed Research Bounties','Research Days Completed','Mission Day(s) Attended',
  'NL-1331 Meetup(s) Attended','Second Sunday Events','Orion Tokens','Orion Link And Field Points',
  'Cygnus Tokens','Cygnus Battle Beacons','Recursions'
];
const SAMPLE_VALUES = [
  'ALL TIME','XXXX','Resistance','2026-1-1','3:30:53',
  '5','10432271','2411298','2236','38',
  '8','56','41604323','523','4',
  '4','15232','1858','881','483307',
  '30','257501','24727730','2797','1367',
  '2485','7305','124','10921','5',
  '33','74','10324','1581','1617',
  '892','119','60','278','2326',
  '256','102','32','29','79',
  '29','246421','33','683','41',
  '126','247','39','1','2',
  '12','1880','129','1200','109','2'
];
const SAMPLE_DATA = SAMPLE_HEADER.join('\t') + '\n' + SAMPLE_VALUES.join('\t');

/* ---------- 工具函数 ---------- */
function normalizeKey(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function parseNum(raw) {
  if (typeof raw === 'number') return isFinite(raw) ? raw : NaN;
  let s = String(raw == null ? '' : raw).trim();
  if (!s) return NaN;
  const m = s.match(/^(-?[\d,]+(?:\.\d+)?)([kKmMbB])?$/);
  if (!m) return NaN;
  let n = Number(m[1].replace(/,/g, ''));
  const suf = (m[2] || '').toLowerCase();
  if (suf === 'k') n *= 1e3;
  else if (suf === 'm') n *= 1e6;
  else if (suf === 'b') n *= 1e9;
  return n;
}

function detectFaction(raw) {
  const s = String(raw || '').toLowerCase();
  return s.indexOf('enlightened') >= 0 ? 'enlightened' : 'resistance';
}

function niceFloor(v) {
  if (!(v > 0)) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const mant = v / base;
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8];
  let chosen = 1;
  for (const s of steps) { if (s <= mant + 1e-9) chosen = s; }
  return chosen * base;
}

/** 基准值：勋章模式优先用公开阈值；未映射字段或该档无定义时回落到自身数值取整。 */
function baselineFor(key, value, mode, tier) {
  const def = FIELD_MAP[key];
  // 衍生量没有勋章阈值，用 global.php 的全球中位数作基准
  if (def && def.global && def.global.p50 > 0) return def.global.p50;
  if (mode === 'medal' && def && def.medal && MEDALS[def.medal]) {
    const t = MEDALS[def.medal].tiers[Math.max(0, Math.min(4, Number(tier) || 0))];
    if (typeof t === 'number' && t > 0) return t;
  }
  return niceFloor(value > 0 ? value : 1);
}

/** 单空格分隔时，按已知字段名从长到短贪婪切分表头。 */
/* 社区里常见的表头变体，映射到本项目的规范字段名。 */
const HEADER_ALIASES = {
  'Completed Research Days Completed': 'Research Days Completed'
};

function tokenizeHeaderByDict(line) {
  let rest = String(line || '').trim();
  const dict = SAMPLE_HEADER.concat(Object.keys(HEADER_ALIASES)).sort((a, b) => b.length - a.length);
  const out = [];
  while (rest.length) {
    let hit = null;
    for (const name of dict) {
      const pattern = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      const m = rest.match(new RegExp('^' + pattern, 'i'));
      if (m) { hit = { text: m[0], name: name }; break; }
    }
    if (!hit) return null;
    out.push(HEADER_ALIASES[hit.name] || hit.name);
    rest = rest.slice(hit.text.length).replace(/^\s+/, '');
  }
  return out;
}

/**
 * 解析粘贴文本。warnings 为结构化 {key, args}，便于界面做中英切换。
 */
function parseAgentData(text) {
  const raw = String(text || '').trim();
  const warnings = [];
  if (!raw) return { meta: {}, values: {}, warnings: [{ key: 'warn.empty' }], faction: 'resistance' };

  const pairs = [];
  if (raw[0] === '{') {
    try {
      const obj = JSON.parse(raw);
      for (const [k, v] of Object.entries(obj)) pairs.push([k, v]);
    } catch (e) {
      return { meta: {}, values: {}, warnings: [{ key: 'warn.json', args: [e.message] }], faction: detectFaction(raw) };
    }
  } else {
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      const pick = (line) => {
        if (line.indexOf('\t') >= 0) return line.split('\t');
        if (line.indexOf(',') >= 0) return line.split(',');
        return line.split(/\s{2,}/);
      };
      let head = pick(lines[0]);
      let val = pick(lines[1]);
      if (head.length <= 3 || val.length <= 3) {
        const dh = tokenizeHeaderByDict(lines[0]);
        const dv = lines[1].trim().split(/\s+/);
        if (dh && dh.length > 3 && dv.length > 3) {
          const first = normalizeKey(dh[0]);
          while (dv.length > dh.length && dv.length > 1 && first === 'timespan') {
            dv.splice(0, 2, dv[0] + ' ' + dv[1]);
          }
          head = dh; val = dv;
        }
      }
      if (head.length > 3 && val.length > 3) {
        if (head.length !== val.length) {
          warnings.push({ key: 'warn.colMismatch', args: [head.length, val.length] });
        }
        const n = Math.min(head.length, val.length);
        for (let i = 0; i < n; i++) pairs.push([head[i], val[i]]);
      } else {
        for (const line of lines) {
          const parts = line.split(/\t|,\s*|\s{2,}/);
          if (parts.length >= 2) pairs.push([parts[0], parts.slice(1).join(' ')]);
        }
      }
    }
  }

  const meta = {};
  const values = {};
  for (const [k0, v0] of pairs) {
    const nk = normalizeKey(k0);
    if (!nk) continue;
    const key = META_ALIASES[nk] || nk;
    if (key === 'date' || key === 'time' || key === 'timespan' || key === 'agentname' || key === 'agentfaction') {
      meta[key] = String(v0 == null ? '' : v0).trim();
      continue;
    }
    if (!FIELD_MAP[key]) continue;
    const n = parseNum(v0);
    if (isFinite(n)) values[key] = n;
  }

  // 计算有全球分布数据的衍生量（分母为 0 时不产生字段）
  DERIVED_FIELDS.forEach(d => {
    const v = d.calc(values);
    if (isFinite(v) && v > 0) values[d.key] = v;
  });

  if (!Object.keys(values).length) warnings.push({ key: 'warn.noFields' });

  return { meta, values, warnings, faction: detectFaction(meta.agentfaction || raw) };
}

/** 自动挑六轴：prominence 用单人 log z-score；medal 用 v/基准 的 log 值。每类别最多 2 项。 */
function selectAxes(values, mode, tier) {
  const entries = Object.entries(values).filter(([k, v]) => isFinite(v) && v > 0 && FIELD_MAP[k]);
  if (!entries.length) return [];

  // 单人相对刻度：默认优先从有全球数据的衍生量中挑，按相对全球中位数的强弱排序
  if (mode === 'prominence') {
    const derived = entries.filter(([k]) => FIELD_MAP[k].derived && !FIELD_MAP[k].excludeFromDefault);
    if (derived.length) {
      return derived
        .sort((a, b) => (b[1] / baselineFor(b[0], b[1], mode, tier)) - (a[1] / baselineFor(a[0], a[1], mode, tier)))
        .slice(0, 6)
        .map(e => e[0]);
    }
  }

  const logs = entries.map(([k, v]) => Math.log10(v + 1));
  const mean = logs.reduce((a, b) => a + b, 0) / logs.length;
  const sd = Math.sqrt(logs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / logs.length) || 1;

  const scored = entries.map(([k, v], i) => {
    const prom = (logs[i] - mean) / sd;
    const base = baselineFor(k, v, mode, tier);
    const ratioScore = Math.log10(Math.max(v, 1e-9) / Math.max(base, 1e-9));
    return { key: k, score: mode === 'medal' ? ratioScore : prom };
  }).sort((a, b) => b.score - a.score);

  const picked = [];
  const catCount = {};
  for (const item of scored) {
    const cat = FIELD_MAP[item.key].cat;
    if ((catCount[cat] || 0) >= 2) continue;
    picked.push(item.key);
    catCount[cat] = (catCount[cat] || 0) + 1;
    if (picked.length === 6) break;
  }
  if (picked.length < 6) {
    for (const item of scored) {
      if (picked.indexOf(item.key) < 0) picked.push(item.key);
      if (picked.length === 6) break;
    }
  }
  return picked;
}

function formatNumber(n, lang) {
  if (!isFinite(n)) return '—';
  const a = Math.abs(n);
  if (lang === 'en') {
    if (a >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
    if (a >= 1e4) return (n / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'k';
    return Math.round(n).toLocaleString('en-US');
  }
  if (a >= 1e8) return (n / 1e8).toFixed(a >= 1e9 ? 0 : 1) + '亿';
  if (a >= 1e4) return (n / 1e4).toFixed(a >= 1e6 ? 0 : 1) + '万';
  return Math.round(n).toLocaleString('zh-CN');
}

window.SG = {
  FIELD_DEFS, FIELD_MAP, DERIVED_FIELDS, CATEGORIES, MEDALS,
  SAMPLE_DATA, SAMPLE_HEADER, SAMPLE_VALUES,
  normalizeKey, parseNum, detectFaction, niceFloor, baselineFor,
  tokenizeHeaderByDict, parseAgentData, selectAxes, formatNumber
};
