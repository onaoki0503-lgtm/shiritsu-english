const {chromium}=require(process.env.SFC_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.SFC_CHROME || chromium.executablePath()});
const results=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 // Delayed hero: verify the entire viewport shows real placeholders and remains bounded.
 await page.route('**/assets/hero_sky_bg.jpg',async r=>{await new Promise(resolve=>setTimeout(resolve,900));await r.continue();});
 await page.goto((process.env.SFC_PREVIEW_URL || 'http://127.0.0.1:8766'),{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#siteSkeleton').isVisible(),true);assert.equal(await page.locator('#container').evaluate(e=>e.inert),true);
 await page.screenshot({path:'/tmp/sfc-liquid-skeleton.png'});await page.waitForFunction(()=>document.documentElement.classList.contains('loading_exit'));assert.equal(await page.locator('#container').evaluate(e=>e.inert),false);results.push('フェード中に見えている入力欄も操作できる');await page.waitForFunction(()=>!document.documentElement.classList.contains('is-loading'));
 assert.equal(await page.locator('#container').evaluate(e=>e.inert),false);assert.equal(await page.locator('#siteSkeleton').isVisible(),false);results.push('全画面スケルトンの表示・解除');
 await page.waitForTimeout(1000);await page.screenshot({path:'/tmp/sfc-liquid-mobile-hero.png',fullPage:false});
 for(const width of [320,360,375,390,430,768,1024,1440]){
  await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(150);
  const m=await page.evaluate(()=>{
   const bounds=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
   const header=[...document.querySelectorAll('header .inner>*')].filter(e=>getComputedStyle(e).display!=='none').map(bounds);
   const overflow=[...document.querySelectorAll('h1,h2,h3,h4,p,.form_input_arch,.btn_cv,.hero_cta,.table_price_val')].filter(e=>e.clientWidth>0&&e.scrollWidth>e.clientWidth+2).map(e=>({cls:e.className,text:e.textContent.trim().slice(0,40),width:e.clientWidth,scroll:e.scrollWidth}));
   const title=[...document.querySelectorAll('.highlight_text>span,.copy_kv .sub_block,.lead_kv')].map(bounds);
   return {width:innerWidth,scroll:document.documentElement.scrollWidth,header,overflow,title};
  });
  assert.ok(m.scroll<=width+1,JSON.stringify(m));assert.equal(m.overflow.length,0,JSON.stringify(m.overflow));
  for(let i=1;i<m.header.length;i++)assert.ok(m.header[i-1].right<=m.header[i].left+1,'header overlap '+width);
  for(let i=1;i<m.title.length;i++)assert.ok(m.title[i-1].bottom<=m.title[i].top+1,'title overlap '+width);
  if(width<=768){
    const ctas=await page.locator('.btn_cv,.hero_cta,.btn_mega_cta,.email_contact_button,.btn_sticky_cta,.btn_submit_arch').evaluateAll(els=>els.filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>e.id||e.className));
    assert.deepEqual(ctas,['mobileConsultationButton'],'mobile has one consultation action at '+width);
  }
  results.push(width+'px:横はみ出し・ヘッダー／タイトルの重なりなし');
 }
 await page.setViewportSize({width:390,height:844});await page.locator('#menuToggle').click();assert.equal(await page.locator('#menuToggle').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('#mobileMenu').isVisible(),false);results.push('モバイルメニュー開閉・Escape');results.push('スマホの無料相談操作は下部固定1つのみ');
 await page.locator('#menuToggle').click();await page.locator('#mobileMenu a[href="#tuition"]').click();await page.waitForTimeout(1000);assert.equal(await page.locator('#mobileMenu').isVisible(),false);
 await page.locator('#tuition').screenshot({path:'/tmp/sfc-liquid-mobile-pricing.png'});assert.equal(await page.locator('.price_compact').count(),6);assert.equal(await page.locator('.tuition_matrix_table').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);results.push('6プランがスマホ幅内に収まる');
 await page.locator('.tuition_details summary').click();assert.equal(await page.locator('.tuition_details').getAttribute('open'),'');results.push('料金補足の開閉');
 const q=page.locator('.faq_q_arch').first();await q.scrollIntoViewIfNeeded();await page.waitForTimeout(250);await q.focus();await page.keyboard.press('Enter');await page.waitForTimeout(500);assert.equal(await q.getAttribute('aria-expanded'),'true');assert.ok(await page.locator('.faq_a_arch').first().evaluate(e=>e.clientHeight>50));results.push('FAQキーボード操作と展開');
 await page.locator('#form_area').scrollIntoViewIfNeeded();assert.equal(await page.locator('#webFormCard').isVisible(),true);assert.equal(await page.locator('#mobileConsultationButton').getAttribute('href'),'#archContactForm');assert.equal(await page.locator('a[href^="mailto:"]').count(),0);results.push('サイト内フォームを表示し、外部メールへ移動しない');
 await page.locator('#form_area').screenshot({path:'/tmp/sfc-liquid-mobile-contact.png'});
 await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(500);await page.screenshot({path:'/tmp/sfc-liquid-desktop-hero.png'});
 await page.locator('#voicesToggle').click();assert.equal(await page.locator('#voicesToggle').getAttribute('aria-pressed'),'true');results.push('デスクトップの自動横送りを停止可能');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.glass_lens').first().evaluate(e=>getComputedStyle(e).animationName),'none');results.push('動きを減らす設定を尊重');
 assert.deepEqual(errors,[]);results.push('JavaScript実行エラーなし');
 const fallback=await browser.newPage({viewport:{width:390,height:844}});
 await fallback.route('**/js/liquid.js*',r=>r.abort());
 await fallback.goto((process.env.SFC_PREVIEW_URL || 'http://127.0.0.1:8766'),{waitUntil:'domcontentloaded'});
 await fallback.waitForFunction(()=>!document.documentElement.classList.contains('is-loading'),{timeout:9000});
 assert.equal(await fallback.locator('#container').evaluate(e=>e.inert),false);
 assert.equal(await fallback.locator('#siteSkeleton').isVisible(),false);results.push('演出JSが読み込めなくても6秒以内に画面を解除');await fallback.close();
 const offlineImage=await browser.newPage({viewport:{width:390,height:844}});
 await offlineImage.route('**/assets/hero_sky_bg.jpg',r=>r.abort());
 await offlineImage.goto((process.env.SFC_PREVIEW_URL || 'http://127.0.0.1:8766'),{waitUntil:'domcontentloaded'});
 await offlineImage.waitForFunction(()=>!document.documentElement.classList.contains('is-loading'));
 assert.equal(await offlineImage.locator('#container').evaluate(e=>e.inert),false);results.push('画像失敗時もローディングに閉じ込めない');await offlineImage.close();
 const nojsContext=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const nojs=await nojsContext.newPage();await nojs.goto((process.env.SFC_PREVIEW_URL || 'http://127.0.0.1:8766'));
 assert.equal(await nojs.locator('#siteSkeleton').isVisible(),false);assert.equal(await nojs.locator('.editorial_header').first().evaluate(e=>getComputedStyle(e).opacity),'1');
 results.push('JavaScript無効でも本文を表示');await nojsContext.close();
 console.log(JSON.stringify({pass:results.length,results},null,2));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
