const { chromium } = require('playwright');

const URL = 'http://127.0.0.1:8766/index.html';
const SAVE = '保存当前方案';
const CLEAN = '已保存 ✓';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  const state = () => page.evaluate(() => ({
    main: document.getElementById('btn-save').textContent.trim(),
    style: document.getElementById('style-save').textContent.trim(),
  }));

  const results = [];
  function check(name, got, wantMain, wantStyle) {
    const ok = got.main === wantMain && got.style === wantStyle;
    results.push({ name, ok, got, want: { main: wantMain, style: wantStyle } });
  }

  async function fresh() {
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    await page.evaluate(() => { document.getElementById('style-panel').open = true; });
  }

  async function cleanBoth() {
    await page.fill('#preset-name', 'AA-main');
    await page.click('#btn-save');
    await page.fill('#style-preset-name', 'BB-style');
    await page.click('#style-save');
  }

  const D = { main: SAVE, style: CLEAN };
  const S = { main: CLEAN, style: SAVE };
  const B = { main: SAVE, style: SAVE };
  const C = { main: CLEAN, style: CLEAN };

  // 1. 方案名称输入框（用户本次反馈的核心）
  await fresh(); await cleanBoth();
  await page.fill('#preset-name', 'AA-main-renamed');
  check('主方案名称输入', await state(), D.main, D.style);

  await fresh(); await cleanBoth();
  await page.fill('#style-preset-name', 'BB-style-renamed');
  check('样式方案名称输入', await state(), S.main, S.style);

  // 2. 原始数据 textarea（防抖解析）
  await fresh(); await cleanBoth();
  await page.fill('#raw-data', 'Agent Name\tXXXX\nLevel\t6\nLifetime AP\t12345678');
  await page.waitForTimeout(600);
  check('原始数据编辑(防抖解析)', await state(), D.main, D.style);

  // 3. 填入示例按钮
  await fresh(); await cleanBoth();
  await page.click('#btn-sample');
  await page.waitForTimeout(200);
  check('填入示例按钮', await state(), D.main, D.style);

  // 4. 解析数据按钮
  await fresh(); await cleanBoth();
  await page.click('#btn-parse');
  await page.waitForTimeout(200);
  check('解析数据按钮', await state(), D.main, D.style);

  // 5. 自动挑突出项
  await fresh(); await cleanBoth();
  await page.click('#btn-autopick');
  check('自动挑突出项', await state(), D.main, D.style);

  // 6. 基准策略下拉
  await fresh(); await cleanBoth();
  await page.selectOption('#baseline-mode', 'medal');
  check('基准策略切换', await state(), D.main, D.style);

  // 7. 勋章等级下拉（需先切到勋章基准模式）
  await fresh(); await cleanBoth();
  await page.selectOption('#baseline-mode', 'medal');
  await page.selectOption('#medal-tier', '1');
  check('勋章等级切换', await state(), D.main, D.style);

  // 8. Ingress 轴编辑器（数值输入）
  await fresh(); await cleanBoth();
  await page.locator('#axis-editor-ingress .axis-value').first().fill('9999');
  check('Ingress 轴数值编辑', await state(), D.main, D.style);

  // 9. Ingress 轴编辑器（字段选择）
  await fresh(); await cleanBoth();
  await page.locator('#axis-editor-ingress .axis-select').first().selectOption({ index: 1 });
  check('Ingress 轴字段切换', await state(), D.main, D.style);

  // 10. 图内标题（Ingress）
  await fresh(); await cleanBoth();
  await page.fill('#chart-title', 'Hello');
  check('Ingress 图内标题', await state(), D.main, D.style);

  // 11. 模式切换 Tab → 自定义
  await fresh(); await cleanBoth();
  await page.click('#tab-custom');
  check('切到自定义模式', await state(), D.main, D.style);

  // 12. 自定义能力名
  await fresh(); await cleanBoth();
  await page.click('#tab-custom');
  await page.locator('#axis-editor-custom .axis-name').first().fill('新能力');
  check('自定义能力名编辑', await state(), D.main, D.style);

  // 13. 自定义标题
  await fresh(); await cleanBoth();
  await page.click('#tab-custom');
  await page.fill('#custom-title', 'My New Skills');
  check('自定义图内标题', await state(), D.main, D.style);

  // 14. 阵营切换
  await fresh(); await cleanBoth();
  await page.click('#faction-enlightened');
  check('阵营切换', await state(), D.main, D.style);

  // 15. 主题切换
  await fresh(); await cleanBoth();
  await page.click('#theme-toggle');
  check('主题切换', await state(), D.main, D.style);

  // 16. 样式面板：背景预设
  await fresh(); await cleanBoth();
  await page.selectOption('#st-bgMode', 'light');
  check('样式-背景预设', await state(), S.main, S.style);

  // 17. 样式面板：线条宽度
  await fresh(); await cleanBoth();
  await page.fill('#st-baseW', '3.5');
  check('样式-基线宽度', await state(), S.main, S.style);

  // 18. 样式面板：徽标图案
  await fresh(); await cleanBoth();
  await page.selectOption('#st-logoType', 'enl');
  check('样式-徽标图案', await state(), S.main, S.style);

  // 19. 样式面板：徽标颜色
  await fresh(); await cleanBoth();
  await page.fill('#st-logoColor', '#ff00ff');
  check('样式-徽标颜色', await state(), S.main, S.style);

  // 20. 样式面板：复选框
  await fresh(); await cleanBoth();
  await page.click('#st-ringShow');
  check('样式-同心环开关', await state(), S.main, S.style);

  // 21. 保存主方案后只主按钮 clean
  await fresh(); await cleanBoth();
  await page.fill('#chart-title', 'Z');
  await page.fill('#preset-name', 'CC-main');
  await page.click('#btn-save');
  check('保存主方案(样式未见改动)', await state(), C.main, C.style);

  // 22. 样式改脏后保存主方案，样式仍脏
  await fresh(); await cleanBoth();
  await page.fill('#st-baseW', '5');
  await page.fill('#preset-name', 'DD-main');
  await page.click('#btn-save');
  check('样式脏时保存主方案(样式保持脏)', await state(), C.main, S.style);

  // 23. 主改脏后保存样式，主仍脏
  await fresh(); await cleanBoth();
  await page.fill('#chart-title', 'Y');
  await page.fill('#style-preset-name', 'EE-style');
  await page.click('#style-save');
  check('主脏时保存样式(主保持脏)', await state(), D.main, C.style);

  // 24. 载入完整方案：方案含样式快照，两边都回到已保存
  await fresh(); await cleanBoth();
  await page.fill('#preset-name', 'FF-main');
  await page.click('#btn-save');
  await page.fill('#chart-title', 'W');
  await page.selectOption('#preset-select', { label: 'Ingress 方案 · FF-main' });
  await page.click('#btn-load');
  check('载入完整方案', await state(), C.main, C.style);

  const failed = results.filter(r => !r.ok);
  console.log('TOTAL', results.length, 'PASS', results.length - failed.length, 'FAIL', failed.length);
  results.forEach(r => {
    console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name +
      ' | got ' + r.got.main + ' / ' + r.got.style +
      ' | want ' + r.want.main + ' / ' + r.want.style);
  });
  console.log('CONSOLE_ERRORS', JSON.stringify(errors));
  await browser.close();
  process.exit(failed.length ? 1 : 0);
})();
