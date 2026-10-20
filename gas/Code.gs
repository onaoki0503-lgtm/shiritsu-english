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
