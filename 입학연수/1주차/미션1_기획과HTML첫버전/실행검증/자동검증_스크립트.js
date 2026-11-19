const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const [,, htmlPath, outDir] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const url = 'file://' + path.resolve(htmlPath);
const log = [];
const results = [];
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
function L(s) { log.push(`[${now()} UTC] ${s}`); console.log(s); }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 820 }, locale: 'ko-KR' });
  let page = await ctx.newPage();
  const dialogs = [];
  const hook = (p) => {
    p.on('console', m => L(`  (브라우저 콘솔) ${m.type()}: ${m.text()}`));
    p.on('pageerror', e => L(`  (페이지 오류) ${e.message}`));
    p.on('dialog', async d => { dialogs.push(d.message()); L(`  확인창 표시: "${d.message()}" → [확인] 누름`); await d.accept(); });
  };
  hook(page);
  const shot = async (name) => { await page.screenshot({ path: path.join(outDir, name) }); L(`  캡처 저장: ${name}`); };
  const zoneTitles = (tier) => page.$$eval(`.drop-zone[data-tier="${tier}"] .card span:first-child`, els => els.map(e => e.textContent));
  const allTiers = async () => { const o = {}; for (const t of ['S', 'A', 'B', 'C', 'D', 'F', 'pool']) o[t] = await zoneTitles(t); return o; };
  const record = (no, name, pass, detail, img) => { results.push({ no, name, pass, detail, img }); L(`  → 완성 기준 ${no}: ${pass ? 'PASS' : 'FAIL'} (${detail})`); };
  const card = (title) => page.locator('.card').filter({ has: page.locator(`span:first-child:text-is("${title}")`) });

  L(`브라우저: Chromium ${browser.version()} (헤드리스, 자동 실행)`);
  L(`파일 열기: ${path.basename(htmlPath)} (file:// 로 직접 열기, 서버 없음)`);
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  L(`페이지 제목: "${await page.title()}" / 저장된 데이터 비우고 시작`);
  await shot('00_처음_연_화면.png');

  L('[기준 1] "기생충" 입력 후 [추가] 버튼 클릭');
  await page.fill('#movieInput', '기생충');
  await page.click('#addBtn');
  let pool = await zoneTitles('pool');
  record(1, '추가 버튼으로 보관함에 카드 생성', pool.includes('기생충'), `보관함 카드: [${pool.join(', ')}]`, '01_추가버튼.png');
  await shot('01_추가버튼.png');

  L('[기준 2] "인터스텔라" 입력 후 Enter 키 (이어서 "올드보이", "괴물"도 Enter로 추가)');
  for (const t of ['인터스텔라', '올드보이', '괴물']) { await page.fill('#movieInput', t); await page.press('#movieInput', 'Enter'); }
  pool = await zoneTitles('pool');
  record(2, 'Enter 키로 카드 추가', ['인터스텔라', '올드보이', '괴물'].every(x => pool.includes(x)), `보관함 카드: [${pool.join(', ')}]`, '02_엔터키.png');
  await shot('02_엔터키.png');

  L('[기준 3] 공백 "   "만 입력 후 [추가] 클릭, 이어서 Enter');
  const before = await page.locator('.card').count();
  await page.fill('#movieInput', '   ');
  await page.click('#addBtn');
  await page.press('#movieInput', 'Enter');
  const after = await page.locator('.card').count();
  record(3, '공백만 입력하면 추가 안 됨', before === after, `카드 수 ${before}개 → ${after}개`, '03_공백입력.png');
  await shot('03_공백입력.png');
  await page.fill('#movieInput', '');

  L('[기준 4] "기생충"→S, "인터스텔라"→A, "괴물"→C 로 드래그 앤 드롭');
  await card('기생충').dragTo(page.locator('.drop-zone[data-tier="S"]'));
  await card('인터스텔라').dragTo(page.locator('.drop-zone[data-tier="A"]'));
  await card('괴물').dragTo(page.locator('.drop-zone[data-tier="C"]'));
  let t = await allTiers();
  record(4, '드래그로 S~F 티어에 이동', t.S.includes('기생충') && t.A.includes('인터스텔라') && t.C.includes('괴물'), `S=[${t.S}] A=[${t.A}] C=[${t.C}] 보관함=[${t.pool}]`, '04_티어로_드래그.png');
  await shot('04_티어로_드래그.png');

  L('[기준 5] C칸의 "괴물"을 보관함으로 다시 드래그');
  await card('괴물').dragTo(page.locator('#pool'));
  t = await allTiers();
  record(5, '티어 카드를 보관함으로 되돌림', t.pool.includes('괴물') && !t.C.includes('괴물'), `C=[${t.C}] 보관함=[${t.pool}]`, '05_보관함으로_되돌리기.png');
  await shot('05_보관함으로_되돌리기.png');

  L('[기준 6] "올드보이" 카드의 × 클릭');
  const cntBefore = await page.locator('.card').count();
  await card('올드보이').locator('.del').click();
  const titles = await page.$$eval('.card span:first-child', els => els.map(e => e.textContent));
  record(6, '× 버튼은 해당 카드만 삭제', !titles.includes('올드보이') && titles.length === cntBefore - 1, `카드 ${cntBefore}개 → ${titles.length}개, 남은 카드: [${titles.join(', ')}]`, '06_X버튼_삭제.png');
  await shot('06_X버튼_삭제.png');

  L('[기준 8] 새로고침(F5) 후, 탭을 닫고 같은 브라우저에서 파일을 다시 열기');
  const beforeReload = await allTiers();
  L(`  브라우저 저장소(localStorage) "movieTierlistData" = ${await page.evaluate(() => localStorage.getItem('movieTierlistData'))}`);
  await page.reload();
  const same1 = JSON.stringify(beforeReload) === JSON.stringify(await allTiers());
  await page.close();
  page = await ctx.newPage();
  hook(page);
  await page.goto(url);
  const after2 = await allTiers();
  const same2 = JSON.stringify(beforeReload) === JSON.stringify(after2);
  record(8, '새로고침·다시 열어도 상태 유지', same1 && same2, `새로고침 후 같음=${same1}, 다시 연 뒤 같음=${same2} / S=[${after2.S}] A=[${after2.A}] 보관함=[${after2.pool}]`, '08_다시열어도_유지.png');
  await shot('08_다시열어도_유지.png');

  L('[기준 9] 티어 라벨 배경색 확인');
  const colors = await page.$$eval('.tier-label', els => els.map(e => e.textContent.trim() + '=' + getComputedStyle(e).backgroundColor));
  const uniq = new Set(colors.map(c => c.split('=')[1]));
  record(9, 'S~F 라벨이 서로 다른 색', colors.length === 6 && uniq.size === 6, colors.join(', '), '09_티어색상.png');
  await page.locator('#tierContainer').screenshot({ path: path.join(outDir, '09_티어색상.png') });
  L('  캡처 저장: 09_티어색상.png');

  L('[기준 7] [전체 초기화] 클릭 → 확인창에서 [확인] → 새로고침');
  const dBefore = dialogs.length;
  await page.click('#resetBtn');
  const left = await page.locator('.card').count();
  await page.reload();
  const leftAfter = await page.locator('.card').count();
  record(7, '전체 초기화 확인 후 모든 카드 삭제', left === 0 && leftAfter === 0 && dialogs.length > dBefore, `확인창 ${dialogs.length - dBefore}회, 초기화 직후 카드 ${left}개, 새로고침 후 ${leftAfter}개`, '07_전체초기화.png');
  await shot('07_전체초기화.png');

  await browser.close();
  results.sort((a, b) => a.no - b.no);
  L(`결과: ${results.filter(r => r.pass).length} / ${results.length} 통과`);
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(outDir, '실행로그.txt'), log.join('\n') + '\n');
})().catch(e => { console.error(e); process.exit(1); });
