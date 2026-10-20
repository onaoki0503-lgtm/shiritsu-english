const {chromium}=require(process.env.SFC_PLAYWRIGHT_MODULE || 'playwright');
const http=require('node:http'), fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';try{const data=fs.readFileSync(f);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.webp':'image/webp'})[path.extname(f)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;try{browser=await chromium.launch({headless:true,executablePath:process.env.SFC_CHROME || chromium.executablePath()});}catch(e){server.close();throw e;}
let checks=0;
try{
const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',route=>{const url=route.request().url();return url.startsWith(origin)?route.continue():route.fulfill({status:200,body:''});});
await page.goto(origin);await page.waitForFunction(()=>!document.documentElement.classList.contains('is-loading'));
assert.equal(await page.locator('#webFormCard').isVisible(),false);assert.match(await page.locator('#mobileConsultationButton').getAttribute('href'),/^mailto:taiseihori18@gmail.com/);checks++;
await page.route('**/js/site-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SFC_CONFIG={publicEndpoint:'https://script.google.com/macros/s/test/exec',adminUrl:''};"}));
let mode='fail',requests=[];
await page.route('https://script.google.com/macros/s/test/exec',async r=>{const p=r.request().postDataJSON();if(p.type!=='contact')return r.fulfill({headers:{'Access-Control-Allow-Origin':'*'},json:{status:'success'}});requests.push(p);if(mode==='network')return r.abort();await r.fulfill({headers:{'Access-Control-Allow-Origin':'*'},json:mode==='fail'?{status:'error',saved:false}:{status:'success',saved:true,requestId:p.requestId,notification:'unknown'}});});
await page.reload();await page.locator('[name=name]').fill('テスト太郎');await page.locator('[name=grade]').selectOption('高校3年生');await page.locator('[name=subjects]').selectOption('英語のみ');await page.locator('[name=email]').fill('test@example.com');
await page.waitForFunction(()=>document.querySelector('#mobileConsultationButton .sticky_cta_main').textContent.includes('入力内容'));const submit=page.locator('#mobileConsultationButton');await submit.click();await page.waitForFunction(()=>document.querySelector('#archContactForm [role=status]').textContent.includes('確認できません'));
assert.equal(await page.locator('[name=name]').inputValue(),'テスト太郎');checks++;
mode='network';await submit.click();await page.waitForFunction(()=>!document.querySelector('button[type=submit]').disabled);assert.equal(requests[0].requestId,requests[1].requestId);assert.match(await page.locator('#archContactForm [role=status]').innerText(),/確認できません/);checks++;
mode='success';await submit.click();await page.waitForFunction(()=>document.querySelector('#archContactForm [role=status]').textContent.includes('受け付けました'));
assert.equal(requests[0].requestId,requests[2].requestId);assert.equal(await page.locator('[name=name]').inputValue(),'');assert.equal(await page.evaluate(()=>sessionStorage.getItem('sfc_pending_request')),null);assert.equal(await page.evaluate(()=>localStorage.getItem('sfc_local_contacts')),null);checks++;
assert.ok(await page.locator('#archContactForm').evaluate(e=>e.getBoundingClientRect().right<=innerWidth));checks++;
await page.goto(origin+'/dashboard.html');assert.equal(await page.locator('table').count(),0);assert.equal(await page.locator('input').count(),0);assert.match(await page.locator('body').innerText(),/ログイン/);checks++;
// 管理画面はgoogle.script.runをモックし、実際のHTML描画・XSS・モーダル動作を検証。
const admin=await browser.newPage({viewport:{width:1440,height:1000}});let sendCount=0;admin.on('dialog',d=>d.accept());
await admin.exposeFunction('mockRpc',async(method,args)=>{
 if(method==='getDashboard')return {summary:{pv:4,visitors:3,contacts:2,scroll:60},buckets:{25:4,50:3,75:2,100:1},daily:{'2026/10/20':4},sections:{hero:4},contacts:[1,2].map(i=>({id:'id'+i,date:'2026/10/20',name:i===1?'<img src=x onerror="window.xss=1">':'二人目',grade:'高3',subjects:'英語',frequency:'週1回',email:'test'+i+'@example.com',tel:'',message:'相談',status:'未対応',notification:'sent',reply:''}))};
 if(method==='sendReply'){sendCount++;return {status:'sent'};}throw Error(method);
});
await admin.addInitScript(()=>{window.google={script:{run:new Proxy({}, {get(_,method){if(method==='withSuccessHandler')return success=>({withFailureHandler:failure=>new Proxy({}, {get(_,name){return (...args)=>window.mockRpc(name,args).then(success,failure);}})});}})}};});
await admin.goto(origin+'/gas/Admin.html');await admin.waitForFunction(()=>document.querySelectorAll('#rows tr').length===2);
assert.equal(await admin.locator('#rows img').count(),0);assert.equal(await admin.evaluate(()=>window.xss),undefined);checks++;
await admin.getByText('返信を作成').first().click();assert.equal(await admin.locator('#to').inputValue(),'test1@example.com');assert.equal(await admin.locator('#to').getAttribute('readonly'),'');checks++;
await admin.locator('#send').click();await admin.waitForFunction(()=>document.querySelector('#replyNotice').textContent.includes('送信しました'));assert.equal(sendCount,1);await admin.locator('#close').click();await admin.getByText('返信を作成').nth(1).click();assert.equal(await admin.locator('#send').isEnabled(),true);checks++;
await admin.screenshot({path:'/tmp/sfc-admin-desktop.png',fullPage:true});await admin.setViewportSize({width:390,height:844});await admin.locator('#close').click();await admin.screenshot({path:'/tmp/sfc-admin-mobile.png',fullPage:true});
assert.ok(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
assert.deepEqual(errors,[]);checks++;
console.log(JSON.stringify({browserChecks:checks,status:'PASS',screenshots:['/tmp/sfc-admin-desktop.png','/tmp/sfc-admin-mobile.png']}));
}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
