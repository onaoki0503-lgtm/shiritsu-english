/** 別の管理専用GASプロジェクトへ配置。公開用Code.gsと同居させない。 */
function doGet() {
  try {
    assertOwner_();
    return HtmlService.createHtmlOutputFromFile('Admin').setTitle('SFC生の英語塾 管理画面')
      .addMetaTag('viewport','width=device-width, initial-scale=1');
  } catch (err) { return HtmlService.createHtmlOutput('管理者のGoogleアカウントでログインしてください。'); }
}
function doPost() { return json_({status:'error',code:'FORBIDDEN'}); }
function getDashboard() {
  assertOwner_();
  const ss = book_();
  const rows = ss.getSheetByName(CONFIG.SHEET_CONTACTS).getDataRange().getValues().slice(1);
  const contacts = rows.slice(-100).reverse().map(r => ({id:rowId_(r),date:r[0] instanceof Date ? Utilities.formatDate(r[0],'Asia/Tokyo','yyyy/MM/dd HH:mm:ss') : String(r[0]),name:String(r[1]),grade:String(r[2]),
    subjects:String(r[3]),frequency:String(r[4]),email:String(r[5]),tel:String(r[6]),message:String(r[7]),
    status:String(r[8]),notification:String(r[11]||'unknown'),reply:String(r[13]||'')}));
  const logs = ss.getSheetByName(CONFIG.SHEET_LOGS).getDataRange().getValues().slice(1);
  const sessions = new Set(); const buckets = {25:0,50:0,75:0,100:0}; const daily = {}; const sections = {};
  let depth = 0;
  logs.forEach(r => {
    if (r[1]) sessions.add(String(r[1])); const n = Number(r[3])||0; depth += n;
    Object.keys(buckets).forEach(k=>{if(n>=Number(k)) buckets[k]++;});
    const day = r[0] instanceof Date ? Utilities.formatDate(r[0],'Asia/Tokyo','yyyy/MM/dd') : String(r[0]).slice(0,10);
    daily[day] = (daily[day]||0)+1;
    String(r[4]).split(', ').filter(Boolean).forEach(k=>{sections[k]=(sections[k]||0)+1;});
  });
  return {summary:{pv:logs.length,visitors:sessions.size,contacts:rows.length,scroll:logs.length?Math.round(depth/logs.length):0},
    buckets:buckets,daily:daily,sections:sections,contacts:contacts};
}
function sendReply(data) {
  assertOwner_();
  const id = text_(data.id,100,true), subject = text_(data.subject,200,true), body = text_(data.body,10000,true);
  if (/[\r\n]/.test(subject)) throw new Error('件名は1行で入力してください。');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sheet = contacts_(), target = findContact_(sheet,id), r = target.row;
    if (r[13] === 'sent' || r[8] === '返信済') return {status:'already_sent'};
    if (r[13]) throw new Error('送信結果をGmailの送信済みで確認してください。自動再送はできません。');
    const to = email_(String(r[5])); // クライアント指定宛先を受け取らない
    sheet.getRange(target.number,14,1,2).setValues([['sending',now_()]]); SpreadsheetApp.flush();
    try {
      MailApp.sendEmail({to:to,subject:subject,body:body,name:CONFIG.SENDER_NAME,replyTo:CONFIG.REPLY_TO_EMAIL});
    } catch(err) {
      sheet.getRange(target.number,14,1,2).setValues([['unknown',now_()]]); SpreadsheetApp.flush();
      throw new Error('送信結果が不明です。Gmailの送信済みを確認してください。');
    }
    // この更新だけ失敗してもsendingが残り、再試行で二重送信しない。
    sheet.getRange(target.number,14,1,2).setValues([['sent',now_()]]);
    sheet.getRange(target.number,9).setValue('返信済'); SpreadsheetApp.flush();
    return {status:'sent'};
  } finally { lock.releaseLock(); }
}
function retryNotification(data) {
  assertOwner_();
  if (!data || data.confirmed !== true) throw new Error('Gmailで未受信を確認してください。');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sheet = contacts_(), target = findContact_(sheet,text_(data.id,100,true));
    if (target.row[11] === 'sent') return {status:'already_sent'};
    // 公開プロジェクトが送信中の行には触れない（別プロジェクトのロックは共有されない）。
    if (target.row[11] === 'sending') throw new Error('送信処理中です。時間を置いて台帳とGmailを確認してください。');
    sheet.getRange(target.number,12,1,2).setValues([['sending',now_()]]); SpreadsheetApp.flush();
    try { notify_(target.row); }
    catch(err) {
      sheet.getRange(target.number,12,1,2).setValues([['unknown',now_()]]); SpreadsheetApp.flush();
      throw new Error('通知結果が不明です。Gmailで確認してください。');
    }
    sheet.getRange(target.number,12,1,2).setValues([['sent',now_()]]); SpreadsheetApp.flush(); return {status:'sent'};
  } finally { lock.releaseLock(); }
}
