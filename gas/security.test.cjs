// node gas/security.test.cjs (GASサービスをモックし、実メール・実台帳には接続しない)
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const crypto=require('node:crypto');
const common=fs.readFileSync(__dirname+'/Common.gs','utf8');
const publicCode=fs.readFileSync(__dirname+'/Code.gs','utf8');
const adminCode=fs.readFileSync(__dirname+'/AdminServer.gs','utf8');
function env(kind='public'){
  const owner=kind==='intake'?'o.naoki0503@intakingresources.com':'taiseihori18@gmail.com';
  const state={active:owner,effective:owner,sent:[],failMail:false,failFinal:false,reads:0,locks:0,flushes:0};
  const props=new Map([['SPREADSHEET_ID','test-sheet'],['DASHBOARD_VIEWER_EMAIL','viewer@example.com']]);
  class Sheet{
    constructor(){this.rows=[];}
    appendRow(row){assert.ok(state.locks>0||this.rows.length===0);this.rows.push([...row]);}
    getLastRow(){return this.rows.length;}
    setFrozenRows(){}
    getDataRange(){state.reads++;return {getValues:()=>this.rows.map(r=>[...r])};}
    getRange(r,c,n=1,m=1){return {
      getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>this.rows[r+i-1]?.[c+j-1]||'')),
      setValues:(values)=>{if(state.failFinal&&c===14&&values[0][0]==='sent')throw Error('storage update failure');values.forEach((row,i)=>row.forEach((v,j)=>{this.rows[r+i-1]??=[];this.rows[r+i-1][c+j-1]=v;}));},
      setValue:(v)=>{this.rows[r-1][c-1]=v;}
    };}
  }
  const sheets=new Map();
  const ss={getSheetByName:n=>{state.reads++;return sheets.get(n);},insertSheet:n=>{const s=new Sheet();sheets.set(n,s);return s;}};
  const context={console,Date,Set,JSON,Math,Number,String,Error,
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})},
    Session:{getActiveUser:()=>({getEmail:()=>state.active}),getEffectiveUser:()=>({getEmail:()=>state.effective})},
    Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,value)=>Array.from(crypto.createHash('sha256').update(value).digest()),formatDate:(_,tz,fmt)=>fmt==='yyyyMMddHH'?'2026102018':fmt==='yyyyMMdd'?'20261020':'2026/10/20 18:00:00'},
    LockService:{getScriptLock:()=>({waitLock:()=>{state.locks++;},releaseLock:()=>{state.locks--;}})},
    SpreadsheetApp:{openById:()=>ss,flush:()=>{state.flushes++;}},
    MailApp:{sendEmail:mail=>{assert.ok(state.locks>0);assert.ok(state.flushes>0);if(state.failMail)throw Error('Mail failure');state.sent.push(mail);}},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:body=>({body,setMimeType(){return this;}})},
    HtmlService:{createHtmlOutputFromFile:()=>({setTitle(){return this;},addMetaTag(){return this;}}),createHtmlOutput:body=>({body})}
  };
  vm.createContext(context);vm.runInContext(kind==='intake'?fs.readFileSync(__dirname+'/Intake.gs','utf8'):common+'\n'+publicCode,context);context.initSheets();
  if(kind==='admin')vm.runInContext(adminCode,context);
  state.reads=0;
  return {context,state,props,sheets,post:data=>JSON.parse(context.doPost({postData:{contents:JSON.stringify(data)}}).body)};
}
const payload=()=>({type:'contact',requestId:'request_0123456789abcdefghij',name:'テスト生徒',grade:'高校3年',subjects:'英語',frequency:'週1回',email:'student@example.com',tel:'',message:'長文を相談'});
function contact(e){return e.sheets.get('問い合わせ一覧').rows;}
function createAdminContact(){const e=env();const r=e.post(payload());vm.runInContext(adminCode,e.context);return {...e,id:r.requestId};}
test('公開GETは個人情報も集計も返さず、台帳にも触れない',()=>{const e=env();const r=JSON.parse(e.context.doGet().body);assert.equal(r.code,'ADMIN_UNAVAILABLE');assert.equal(e.state.reads,0);});
test('公開POSTのreply/任意種別は台帳・メールに触れる前に拒否',()=>{for(const type of ['reply','getDashboard','retryNotification','unknown']){const e=env();assert.equal(e.post({type,to:'attacker@example.com',body:'spam'}).code,'FORBIDDEN');assert.equal(e.state.reads,0);assert.equal(e.state.sent.length,0);}});
test('公開プロジェクトには管理RPCが存在しない',()=>{const e=env();for(const n of ['getDashboard','sendReply','retryNotification'])assert.equal(typeof e.context[n],'undefined');});
test('保存後の通知失敗でもsaved=true。再送は台帳・通知を増やさない',()=>{const e=env();e.state.failMail=true;const first=e.post(payload());assert.equal(first.saved,true);assert.equal(first.notification,'unknown');assert.equal(contact(e).length,2);e.state.failMail=false;const next=e.post(payload());assert.equal(next.duplicate,true);assert.equal(contact(e).length,2);assert.equal(e.state.sent.length,0);assert.equal(e.state.locks,0);});
test('正常受付の二重送信は1行・1通知。同じIDで内容変更は拒否',()=>{const e=env();assert.equal(e.post(payload()).saved,true);assert.equal(e.post(payload()).duplicate,true);assert.equal(e.state.sent.length,1);assert.equal(e.post({...payload(),name:'別名'}).code,'ID_CONFLICT');assert.equal(contact(e).length,2);});
test('不正メール・必須項目・長すぎる入力・不正IDを保存しない',()=>{for(const change of [{email:'a@example.com,b@example.com'},{name:''},{message:'x'.repeat(5001)},{requestId:'bad'},{grade:[]},{email:'a@example.com\nBcc:x@y.com'}]){const e=env();assert.equal(e.post({...payload(),...change}).saved,false);assert.equal(contact(e).length,1);assert.equal(e.state.sent.length,0);}});
test('シート数式を文字列として保存',()=>{const e=env();e.post({...payload(),name:'=IMPORTXML("bad")',message:'+cmd'});assert.equal(contact(e)[1][1],"'=IMPORTXML(\"bad\")");assert.equal(contact(e)[1][7],"'+cmd");});
test('全管理RPCは匿名・別アカウント・別実行者を拒否し、台帳に触れない',()=>{for(const [active,effective] of [['',''],['other@gmail.com','other@gmail.com'],['taiseihori18@gmail.com','other@gmail.com'],['','taiseihori18@gmail.com'],['viewer@example.com','taiseihori18@gmail.com'],['taiseihori18@gmail.com','viewer@example.com']]){const e=env('admin');e.state.active=active;e.state.effective=effective;for(const [name,args] of [['getDashboard',undefined],['sendReply',{id:'x',subject:'s',body:'b'}],['retryNotification',{id:'x',confirmed:true}]])assert.throws(()=>e.context[name](args),/管理者権限/);assert.equal(e.state.reads,0);assert.match(e.context.doGet().body,/ログイン/);}});
test('返信は保存済み申込の宛先に限定し、再クリックで送信しない',()=>{const e=createAdminContact();const d={id:e.id,to:'attacker@example.com',subject:'テスト返信',body:'本文'};assert.equal(e.context.sendReply(d).status,'sent');assert.equal(e.state.sent.at(-1).to,'student@example.com');assert.equal(e.context.sendReply(d).status,'already_sent');assert.equal(e.state.sent.length,2);assert.equal(contact(e)[1][8],'返信済');});
test('不明な受付ID・件名改行では送信しない',()=>{const e=createAdminContact();assert.throws(()=>e.context.sendReply({id:'missing',subject:'s',body:'b'}));assert.throws(()=>e.context.sendReply({id:e.id,subject:'s\nBcc:other@example.com',body:'b'}));assert.equal(e.state.sent.length,1);});
test('返信メール失敗後はunknownになり、自動再送を禁止',()=>{const e=createAdminContact();e.state.failMail=true;const d={id:e.id,subject:'s',body:'b'};assert.throws(()=>e.context.sendReply(d),/不明/);e.state.failMail=false;assert.throws(()=>e.context.sendReply(d),/確認/);assert.equal(contact(e)[1][13],'unknown');assert.equal(e.state.sent.length,1);});
test('送信後の台帳更新失敗でもsendingを残し二重送信を禁止',()=>{const e=createAdminContact();e.state.failFinal=true;const d={id:e.id,subject:'s',body:'b'};assert.throws(()=>e.context.sendReply(d),/storage/);assert.equal(contact(e)[1][13],'sending');e.state.failFinal=false;assert.throws(()=>e.context.sendReply(d),/確認/);assert.equal(e.state.sent.length,2);});
test('通知だけの再送は管理者確認を要求し、申込や生徒メールを増やさない',()=>{const e=env();e.state.failMail=true;const first=e.post(payload());vm.runInContext(adminCode,e.context);assert.throws(()=>e.context.retryNotification({id:first.requestId}),/確認/);e.state.failMail=false;assert.equal(e.context.retryNotification({id:first.requestId,confirmed:true}).status,'sent');assert.equal(contact(e).length,2);assert.equal(e.state.sent.length,1);assert.equal(e.state.sent[0].to,'taiseihori18@gmail.com');assert.equal(e.context.retryNotification({id:first.requestId,confirmed:true}).status,'already_sent');});
test('送信中の通知は管理側から再送しない',()=>{const e=createAdminContact();contact(e)[1][11]='sending';assert.throws(()=>e.context.retryNotification({id:e.id,confirmed:true}),/処理中/);assert.equal(e.state.sent.length,1);});
test('同じページ閲覧IDの計測更新は1PV。最大深度を維持',()=>{const e=env();const log={type:'tracking',pageViewId:'view_01234567890123456789',sessionId:'session_123',device:'Desktop',scrollDepth:75,reachedSections:['hero','mentor'],duration:30};e.post(log);e.post({...log,scrollDepth:25,reachedSections:['faq'],duration:60});const rows=e.sheets.get('アクセスログ').rows;assert.equal(rows.length,2);assert.equal(rows[1][3],75);assert.equal(rows[1][5],60);assert.equal(rows[1][4],'hero, mentor, faq');vm.runInContext(adminCode,e.context);assert.equal(e.context.getDashboard().summary.pv,1);});
test('通知上限に達しても、既存受付IDの再確認は成功する',()=>{const e=env();e.post(payload());e.props.set('CONTACT_RATE',JSON.stringify({hour:'2026102018',count:30}));assert.equal(e.post({...payload(),requestId:'another_0123456789abcdefghij'}).code,'RATE_LIMIT');assert.equal(e.post(payload()).duplicate,true);});
test('既存9列の台帳は受付IDなしでも管理画面で返信できる',()=>{const e=env('admin');const rows=contact(e);rows.push(['2026/10/10','旧生徒','高3','英語','週1回','legacy@example.com','','相談','未対応']);const c=e.context.getDashboard().contacts[0];assert.match(c.id,/^legacy-/);assert.equal(e.context.sendReply({id:c.id,subject:'返信',body:'本文'}).status,'sent');assert.equal(e.state.sent[0].to,'legacy@example.com');});
test('岡本管理の受付も公開GET・管理POST・管理RPCを拒否する',()=>{const e=env('intake');assert.equal(JSON.parse(e.context.doGet().body).code,'ADMIN_UNAVAILABLE');assert.equal(e.post({type:'reply'}).code,'FORBIDDEN');assert.equal(e.state.reads,0);for(const n of ['getDashboard','sendReply','retryNotification'])assert.equal(typeof e.context[n],'undefined');});
test('岡本受付は台帳保存後に先生へ1通知し、学生を返信先にする',()=>{const e=env('intake');const p={...payload(),message:'長文を相談\n\n【相談希望日時】\n平日19時以降'};assert.equal(e.post(p).saved,true);assert.equal(e.post(p).duplicate,true);assert.equal(contact(e).length,2);assert.equal(e.state.sent.length,1);assert.equal(e.state.sent[0].to,'taiseihori18@gmail.com');assert.equal(e.state.sent[0].replyTo,'student@example.com');assert.match(e.state.sent[0].body,/平日19時以降/);});
test('岡本受付の通知失敗でも保存成功を返し、再送で申込を増やさない',()=>{const e=env('intake');e.state.failMail=true;assert.equal(e.post(payload()).notification,'unknown');assert.equal(e.post(payload()).duplicate,true);assert.equal(contact(e).length,2);});
test('岡本受付の初期化は岡本本人だけに許可',()=>{const e=env('intake');for(const account of ['','taiseihori18@gmail.com','other@example.com']){e.state.active=account;assert.throws(()=>e.context.initSheets(),/管理者権限/);}assert.equal(e.state.reads,0);});

test('岡本本人は申込と集計を閲覧でき、返信・通知再送はサーバー側で拒否する',()=>{
  const e=createAdminContact();e.state.active=e.state.effective='viewer@example.com';
  const before=JSON.stringify(contact(e)),sent=e.state.sent.length;
  const d=e.context.getDashboard();assert.equal(d.contacts.length,1);assert.equal(d.access.canReply,false);assert.match(d.access.label,/岡本直樹/);
  assert.ok(!e.context.doGet().body);
  e.state.reads=0;
  for(const [method,data] of [['sendReply',{id:e.id,subject:'s',body:'b'}],['retryNotification',{id:e.id,confirmed:true}]]) assert.throws(()=>e.context[method](data),/管理者権限/);
  assert.equal(e.state.reads,0);assert.equal(e.state.sent.length,sent);assert.equal(JSON.stringify(contact(e)),before);
});
test('先生の管理権限と返信操作は維持する',()=>{
 const e=createAdminContact();assert.equal(e.context.getDashboard().access.canReply,true);
 assert.equal(e.context.sendReply({id:e.id,subject:'s',body:'b'}).status,'sent');
 assert.equal(e.state.sent.at(-1).name,'トモ二塾 堀安泰世');
});

test('閲覧者設定が空欄なら追加アカウントを許可しない',()=>{
 const e=env('admin');e.props.delete('DASHBOARD_VIEWER_EMAIL');e.state.active=e.state.effective='viewer@example.com';
 assert.throws(()=>e.context.getDashboard(),/管理者権限/);assert.equal(e.state.reads,0);
});
