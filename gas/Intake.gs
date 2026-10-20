/** 岡本管理の受付専用GAS。先生の管理用GASとは分離し、GETで個人情報を返さない。 */
/** 共通ファイル。公開用・管理用の別々のGASプロジェクトへ追加する。全補助関数はRPC非公開。 */
const CONFIG = {
  NOTIFICATION_EMAIL: 'taiseihori18@gmail.com',
  SENDER_NAME: 'SFC生の英語塾 申込受付',
  REPLY_TO_EMAIL: 'taiseihori18@gmail.com',
  SHEET_CONTACTS: '問い合わせ一覧', SHEET_LOGS: 'アクセスログ'
};
const CONTACT_HEADERS = ['受信日時','お名前','学年','希望科目','希望頻度','メールアドレス','電話番号','相談・教材内容','対応ステータス','受付ID','内容ハッシュ','通知状態','通知更新日時','返信状態','返信更新日時'];
const LOG_HEADERS = ['アクセス日時','セッションID','デバイス','最大スクロール深度(%)','到達セクション','滞在秒数','リファラー','ページ閲覧ID'];
function props_() { return PropertiesService.getScriptProperties(); }
function book_() {
  const id = props_().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('台帳IDが未設定です。');
  return SpreadsheetApp.openById(id);
}
function now_() { return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'); }
function hash_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)
    .map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}
function text_(v, max, required) {
  if (v == null) v = '';
  if (typeof v !== 'string' || v.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) throw new Error('入力内容を確認してください。');
  v = v.trim();
  if (required && !v) throw new Error('必須項目を入力してください。');
  return v;
}
function email_(v) {
  v = text_(v, 254, true);
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(v)) throw new Error('メールアドレスを確認してください。');
  return v;
}
function safeCell_(v) { return typeof v === 'string' && /^\s*[=+@-]/.test(v) ? "'" + v : v; }
function rowId_(r) { return String(r[9] || ('legacy-' + hash_(JSON.stringify(r.slice(0, 8))))); }
function contacts_() { return book_().getSheetByName(CONFIG.SHEET_CONTACTS); }
function findContact_(sheet, id) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) if (rowId_(rows[i]) === id) return {number: i + 1, row: rows[i]};
  throw new Error('対象の申込が見つかりません。');
}
function assertOwner_() {
  const active = Session.getActiveUser().getEmail().toLowerCase();
  const effective = Session.getEffectiveUser().getEmail().toLowerCase();
  if (active !== 'o.naoki0503@intakingresources.com' || effective !== 'o.naoki0503@intakingresources.com') throw new Error('管理者権限が必要です。');
}
function notify_(row) {
  MailApp.sendEmail({to: CONFIG.NOTIFICATION_EMAIL, name: CONFIG.SENDER_NAME, replyTo: String(row[5]),
    subject: '【SFC生の英語塾】無料学習相談の申込',
    body: ['新しい申込を保存しました。', '受信日時: '+row[0], '受付ID: '+rowId_(row),
      'お名前: '+row[1], '学年: '+row[2], '科目: '+row[3], '頻度: '+row[4],
      'メール: '+row[5], '電話: '+row[6], '相談内容:', row[7]].join('\n')});
}
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

/** 公開受付専用。管理機能をこのプロジェクトに追加しないこと。 */
function initSheets() {
  assertOwner_();
  const ss = book_();
  [[CONFIG.SHEET_CONTACTS, CONTACT_HEADERS], [CONFIG.SHEET_LOGS, LOG_HEADERS]].forEach(([name, headers]) => {
    const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    const old = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (old.some((v, i) => v && v !== headers[i])) throw new Error('既存ヘッダーを確認してください: ' + name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  });
}
function doGet() {
  // 旧URLへ一覧取得を試みても個人情報・集計は返さない。
  return json_({status: 'error', code: 'ADMIN_UNAVAILABLE', message: '管理機能は専用画面へ移動しました。'});
}
function doPost(e) {
  try {
    if (!e || !e.postData || e.postData.contents.length > 16000) throw new Error('Invalid request');
    const data = JSON.parse(e.postData.contents);
    // 種別確認を、シートアクセスやメール送信より前に行う。
    if (!data || !['contact','tracking'].includes(data.type)) return json_({status:'error', code:'FORBIDDEN'});
    return json_(data.type === 'contact' ? acceptContact_(data) : acceptTracking_(data));
  } catch (err) {
    // データ保存後はacceptContact_内で通知エラーを処理する。
    return json_({status:'error', saved:false, code:'NOT_CONFIRMED', message:'受付を確認できません。同じ受付IDで再送してください。'});
  }
}
function acceptContact_(data) {
  const id = text_(data.requestId, 80, true);
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(id)) throw new Error('Invalid ID');
  const values = [text_(data.name,100,true), text_(data.grade,100,true), text_(data.subjects,100,true),
    text_(data.frequency,100,true), email_(data.email), text_(data.tel,50,false), text_(data.message,5000,false)];
  const digest = hash_(JSON.stringify(values));
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = contacts_();
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][9] === id) {
        if (rows[i][10] !== digest) return {status:'error', saved:false, code:'ID_CONFLICT'};
        // 失敗・通信断でも再送で通知は重ねて送らない。
        return {status:'success', saved:true, requestId:id, duplicate:true, notification:rows[i][11] || 'unknown'};
      }
    }
    // 公開通知の濫用でGmail送信枠を使い切らないための全体上限（IP制限ではない）。
    const hour = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMddHH');
    const bucket = JSON.parse(props_().getProperty('CONTACT_RATE') || '{}');
    const count = bucket.hour === hour ? bucket.count : 0;
    if (count >= 30) return {status:'error', saved:false, code:'RATE_LIMIT'};
    props_().setProperty('CONTACT_RATE', JSON.stringify({hour:hour, count:count+1}));
    const row = [now_(), ...values.map(safeCell_), '未対応', id, digest, 'sending', now_(), '', ''];
    sheet.appendRow(row);
    const number = sheet.getLastRow();
    SpreadsheetApp.flush(); // メール送信より先に永続保存
    let notification = 'sent';
    try { notify_(row); } catch (err) { notification = 'unknown'; }
    // MailAppと台帳更新は一つのトランザクションにできない。曖昧な失敗を自動再送しない。
    try {
      sheet.getRange(number,12,1,2).setValues([[notification,now_()]]);
      SpreadsheetApp.flush();
    } catch (err) { notification = 'unknown'; }
    return {status:'success', saved:true, requestId:id, duplicate:false, notification:notification};
  } finally { lock.releaseLock(); }
}
function acceptTracking_(data) {
  const id = text_(data.pageViewId,80,true);
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(id)) throw new Error('Invalid ID');
  const session = text_(data.sessionId,100,true);
  const allowed = ['hero','challenges','features','mentor','tuition','flow','faq','form_area'];
  const sections = Array.isArray(data.reachedSections) ? data.reachedSections.filter(v=>allowed.includes(v)) : [];
  const depth = Math.max(0,Math.min(100,Number(data.scrollDepth)||0));
  const duration = Math.max(0,Math.min(86400,Number(data.duration)||0));
  const row = [now_(),safeCell_(session),safeCell_(text_(data.device,30,false)),depth,sections.join(', '),duration,'',id];
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sheet = book_().getSheetByName(CONFIG.SHEET_LOGS);
    const rows = sheet.getDataRange().getValues();
    for (let i=1;i<rows.length;i++) if (rows[i][7] === id) {
      row[0] = rows[i][0]; row[3] = Math.max(depth,Number(rows[i][3])||0);
      row[4] = [...new Set(String(rows[i][4]).split(', ').filter(v=>allowed.includes(v)).concat(sections))].join(', ');
      row[5] = Math.max(duration,Number(rows[i][5])||0);
      sheet.getRange(i+1,1,1,8).setValues([row]); return {status:'success'};
    }
    const day = Utilities.formatDate(new Date(),'Asia/Tokyo','yyyyMMdd');
    const bucket = JSON.parse(props_().getProperty('TRACKING_RATE') || '{}');
    const count = bucket.day === day ? bucket.count : 0;
    if (count >= 5000) return {status:'error',code:'RATE_LIMIT'};
    props_().setProperty('TRACKING_RATE',JSON.stringify({day:day,count:count+1}));
    sheet.appendRow(row); return {status:'success'};
  } finally { lock.releaseLock(); }
}


/** Run once in the owner's editor. No inquiry is submitted or email sent during setup. */
function setupIntake() {
  assertOwner_();
  if (!props_().getProperty('SPREADSHEET_ID')) {
    const ss = SpreadsheetApp.create('SFC生の英語塾_申込受付台帳');
    props_().setProperty('SPREADSHEET_ID', ss.getId());
  }
  initSheets();
  console.log('受付台帳: ' + book_().getUrl());
}
