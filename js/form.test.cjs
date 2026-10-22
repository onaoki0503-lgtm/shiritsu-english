// 実サービスには接続せず、送信失敗→同じ受付IDで再確認する処理を検証。
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {webcrypto}=require('node:crypto');
function setup(endpoint='https://script.google.com/macros/s/test/exec') {
  const fields={name:'テスト生徒',grade:'高校3年生',subjects:'英語のみ',frequency:'相談して決めたい',email:'student@example.com',tel:'',message:'長文を相談',schedule:'平日19時以降'};
  const stored=new Map();const calls=[];let submit,status,mode='network',resets=0;
  const label={textContent:'無料学習相談に申し込む'};
  const button={disabled:false,querySelector:()=>label};
  const form={append:s=>status=s,addEventListener:(name,fn)=>{if(name==='submit')submit=fn;},querySelector:()=>button,reset:()=>resets++};
  const context={console:{...console,warn(){}},window:{SFC_CONFIG:{publicEndpoint:endpoint}},document:{
    addEventListener:(name,fn)=>fn(),getElementById:id=>id==='archContactForm'?form:null,
    querySelectorAll:()=>[],createElement:()=>({setAttribute(){},textContent:''})},
    localStorage:{removeItem(){}},sessionStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},
    FormData:class {get(k){return fields[k];}},crypto:webcrypto,TextEncoder,AbortController,setTimeout,clearTimeout,
    fetch:async(url,options)=>{const p=JSON.parse(options.body);calls.push(p);if(mode==='network')throw Error('offline');return {ok:true,status:200,json:async()=>mode==='mismatch'?{status:'success',saved:true,requestId:'other'}:{status:'success',saved:true,requestId:p.requestId,notification:'unknown'}};}
  };
  vm.runInNewContext(fs.readFileSync(__dirname+'/arch.js','utf8'),context);
  return {calls,fields,stored,button,status,get resets(){return resets;},set mode(v){mode=v;},send:()=>submit({preventDefault(){}})};
}
test('通信失敗と受付ID不一致は完了にせず、同じ内容の再送で同じIDを使う',async()=>{
  const e=setup();await e.send();assert.equal(e.resets,0);assert.equal(e.button.disabled,false);assert.match(e.status.textContent,/確認できません/);
  e.mode='mismatch';await e.send();assert.equal(e.resets,0);assert.equal(e.calls[0].requestId,e.calls[1].requestId);
  e.mode='success';await e.send();assert.equal(e.calls[0].requestId,e.calls[2].requestId);assert.equal(e.resets,1);assert.equal(e.stored.size,0);assert.match(e.status.textContent,new RegExp(e.calls[0].requestId));
  assert.match(e.calls[0].message,/【相談希望日時】\n平日19時以降/);
});
test('入力を変えると別の受付ID。ブラウザには本文や連絡先を保存しない',async()=>{
  const e=setup();await e.send();e.fields.schedule='土曜午後';await e.send();assert.notEqual(e.calls[0].requestId,e.calls[1].requestId);const pending=e.stored.get('sfc_pending_request');assert.doesNotMatch(pending,/student@|長文|土曜/);assert.equal(Object.keys(JSON.parse(pending)).sort().join(','),'fingerprint,id');
});
test('受付URL未設定では送信せず、入力を消さない',async()=>{
  const e=setup('');await e.send();assert.equal(e.calls.length,0);assert.equal(e.resets,0);assert.match(e.status.textContent,/入力内容はそのまま/);
});
