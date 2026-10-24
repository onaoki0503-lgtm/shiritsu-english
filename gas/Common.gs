/** 共通ファイル。公開用・管理用の別々のGASプロジェクトへ追加する。全補助関数はRPC非公開。 */
const CONFIG = {
  NOTIFICATION_EMAIL: 'taiseihori18@gmail.com',
  SENDER_NAME: 'トモ二塾 堀安泰世',
  REPLY_TO_EMAIL: 'taiseihori18@gmail.com',
  SHEET_CONTACTS: '問い合わせ一覧', SHEET_LOGS: 'アクセスログ'
};
const CONTACT_HEADERS = ['受信日時','お名前','学年','希望科目','希望頻度','メールアドレス','電話番号','相談・教材内容','対応ステータス','受付ID','内容ハッシュ','通知状態','通知更新日時','返信状態','返信更新日時'];
const LOG_HEADERS = ['アクセス日時','セッションID','デバイス','最大スクロール深度','到達セクション','滞在秒数','リファラー','ページ閲覧ID'];
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
  if (active !== CONFIG.NOTIFICATION_EMAIL || effective !== CONFIG.NOTIFICATION_EMAIL) throw new Error('管理者権限が必要です。');
}
function dashboardAccess_() {
  const active = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const effective = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  // 管理用は「アクセスしているユーザー」で実行する。空欄・実行者不一致は拒否する。
  if (!active || active !== effective) throw new Error('管理者権限が必要です。');
  if (active === CONFIG.NOTIFICATION_EMAIL) return {canReply:true, label:'堀安泰世 · 運営管理'};
  if (active === String(props_().getProperty('DASHBOARD_VIEWER_EMAIL') || '').trim().toLowerCase()) return {canReply:false, label:'岡本直樹 · 閲覧・保守'};
  throw new Error('管理者権限が必要です。');
}
function notify_(row) {
  MailApp.sendEmail({to: CONFIG.NOTIFICATION_EMAIL, name: CONFIG.SENDER_NAME,
    subject: '【トモ二塾】無料学習相談の申込',
    body: ['新しい申込を保存しました。', '受信日時: '+row[0], '受付ID: '+rowId_(row),
      'お名前: '+row[1], '学年: '+row[2], '科目: '+row[3], '頻度: '+row[4],
      'メール: '+row[5], '電話: '+row[6], '相談内容:', row[7]].join('\n')});
}
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
