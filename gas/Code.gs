/**
 * SFC生の英語塾 - バックエンドAPI (Google Apps Script)
 * 
 * 機能:
 * 1. 無料学習相談フォームからの問い合わせ受付・スプレッドシート記録
 * 2. 講師への即時メール通知 (Gmail)
 * 3. 講師への即時LINE通知 (LINE Notify または Messaging API)
 * 4. LP訪問者のアクセス・スクロール深度データの蓄積
 * 5. 管理者ダッシュボード (dashboard.html) への集計データAPI提供
 */

// ==========================================
// 【設定項目】ご自身の環境に合わせて書き換えてください
// ==========================================
const CONFIG = {
  // 問い合わせ通知を受信するメールアドレス
  NOTIFICATION_EMAIL: "o.naoki0503@intakingresources.com", 
  
  // LINE Notify アクセストークン（LINE通知を受け取る場合）
  // ※ LINE Notify公式サイト (https://notify-bot.line.me/) で発行したトークンを入力
  LINE_NOTIFY_TOKEN: "", 

  // LINE Messaging API チャネルアクセストークン（LINE公式アカウント経由で通知する場合・任意）
  LINE_CHANNEL_ACCESS_TOKEN: "",
  // LINE Messaging API 通知先ユーザーID（またはグループID・任意）
  LINE_USER_ID: "",

  // 各シート名
  SHEET_CONTACTS: "問い合わせ一覧",
  SHEET_LOGS: "アクセスログ"
};

/**
 * 初期化: スプレッドシートに必要なシートとヘッダーを作成
 */
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 問い合わせシート
  let contactSheet = ss.getSheetByName(CONFIG.SHEET_CONTACTS);
  if (!contactSheet) {
    contactSheet = ss.insertSheet(CONFIG.SHEET_CONTACTS);
    contactSheet.appendRow([
      "受信日時", "お名前", "学年", "希望科目", "希望頻度", 
      "メールアドレス", "電話番号", "相談・教材内容", "対応ステータス"
    ]);
    contactSheet.setFrozenRows(1);
  }
  
  // アクセスログシート
  let logSheet = ss.getSheetByName(CONFIG.SHEET_LOGS);
  if (!logSheet) {
    logSheet = ss.insertSheet(CONFIG.SHEET_LOGS);
    logSheet.appendRow([
      "アクセス日時", "セッションID", "デバイス", "最大スクロール深度(%)", 
      "到達セクション", "滞在秒数", "リファラー"
    ]);
    logSheet.setFrozenRows(1);
  }
}

/**
 * POSTリクエスト処理 (フォーム送信 & トラッキングログ受信)
 */
function doPost(e) {
  try {
    initSheets();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // データ解析
    let data;
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter;
      }
    } else {
      data = e.parameter || {};
    }

    const type = data.type || "contact";

    // 1. 問い合わせ受付
    if (type === "contact") {
      const now = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
      const name = data.name || "";
      const grade = data.grade || "";
      const subjects = data.subjects || "";
      const frequency = data.frequency || "";
      const email = data.email || "";
      const tel = data.tel || "";
      const message = data.message || "";

      // スプレッドシートに記録
      const contactSheet = ss.getSheetByName(CONFIG.SHEET_CONTACTS);
      contactSheet.appendRow([
        now, name, grade, subjects, frequency, email, tel, message, "未対応"
      ]);

      // メール通知送信
      sendEmailNotification(now, name, grade, subjects, frequency, email, tel, message);

      // LINE通知送信
      sendLineNotification(now, name, grade, subjects, frequency, email, tel, message);

      return createJsonResponse({ status: "success", message: "Inquiry received successfully." });
    }

    // 2. アクセス・スクロールトラッキング受付
    if (type === "tracking") {
      const now = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
      const sessionId = data.sessionId || "";
      const device = data.device || "PC";
      const scrollDepth = Number(data.scrollDepth) || 0;
      const reachedSections = (data.reachedSections || []).join(", ");
      const duration = Number(data.duration) || 0;
      const referrer = data.referrer || "";

      const logSheet = ss.getSheetByName(CONFIG.SHEET_LOGS);
      logSheet.appendRow([
        now, sessionId, device, scrollDepth, reachedSections, duration, referrer
      ]);

      return createJsonResponse({ status: "success", message: "Log recorded." });
    }

    return createJsonResponse({ status: "error", message: "Unknown request type." });

  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  }
}

/**
 * GETリクエスト処理 (ダッシュボード用集計データ返却)
 */
function doGet(e) {
  try {
    initSheets();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 問い合わせデータの取得 (最新20件)
    const contactSheet = ss.getSheetByName(CONFIG.SHEET_CONTACTS);
    const contactRows = contactSheet.getDataRange().getValues();
    const contacts = [];
    if (contactRows.length > 1) {
      for (let i = contactRows.length - 1; i >= 1; i--) {
        const row = contactRows[i];
        contacts.push({
          date: row[0],
          name: row[1],
          grade: row[2],
          subjects: row[3],
          frequency: row[4],
          email: row[5],
          tel: row[6],
          message: row[7],
          status: row[8]
        });
        if (contacts.length >= 20) break;
      }
    }

    // アクセスログの集計
    const logSheet = ss.getSheetByName(CONFIG.SHEET_LOGS);
    const logRows = logSheet.getDataRange().getValues();
    
    let totalPv = 0;
    const uniqueSessions = new Set();
    const scrollBuckets = { "25": 0, "50": 0, "75": 0, "100": 0 };
    const sectionVisits = {
      "hero": 0, "challenges": 0, "features": 0, "mentor": 0, 
      "tuition": 0, "flow": 0, "faq": 0, "form_area": 0
    };
    const dailyPv = {};

    if (logRows.length > 1) {
      for (let i = 1; i < logRows.length; i++) {
        totalPv++;
        const row = logRows[i];
        const dateStr = String(row[0]).substring(0, 10);
        const sId = row[1];
        const depth = Number(row[3]) || 0;
        const sectionsStr = String(row[4]);

        if (sId) uniqueSessions.add(sId);
        dailyPv[dateStr] = (dailyPv[dateStr] || 0) + 1;

        if (depth >= 25) scrollBuckets["25"]++;
        if (depth >= 50) scrollBuckets["50"]++;
        if (depth >= 75) scrollBuckets["75"]++;
        if (depth >= 100) scrollBuckets["100"]++;

        Object.keys(sectionVisits).forEach(sec => {
          if (sectionsStr.indexOf(sec) !== -1) {
            sectionVisits[sec]++;
          }
        });
      }
    }

    const result = {
      summary: {
        totalPv: totalPv,
        uniqueVisitors: uniqueSessions.size,
        totalContacts: Math.max(0, contactRows.length - 1),
        avgScrollDepth: totalPv > 0 ? Math.round((scrollBuckets["25"] + scrollBuckets["50"] + scrollBuckets["75"] + scrollBuckets["100"]) / (totalPv * 4) * 100) : 0
      },
      scrollBuckets: scrollBuckets,
      sectionVisits: sectionVisits,
      dailyPv: dailyPv,
      recentContacts: contacts
    };

    return createJsonResponse({ status: "success", data: result });

  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  }
}

/**
 * 講師へのメール通知
 */
function sendEmailNotification(now, name, grade, subjects, frequency, email, tel, message) {
  if (!CONFIG.NOTIFICATION_EMAIL) return;

  const subject = `【SFC生の英語塾】無料学習相談の申込がありました（${name}様）`;
  const body = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【SFC生の英語塾】無料学習相談 お申し込み通知
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LPフォームより新しい無料学習相談のお申し込みがありました。
内容を確認の上、24時間以内に日程調整のご連絡をお願いします。

■ 受信日時: ${now}
■ お名前: ${name} 様
■ 学年 / ご身分: ${grade}
■ 受講希望科目: ${subjects}
■ 希望面談頻度: ${frequency}
■ メールアドレス: ${email}
■ 電話番号: ${tel || "(未入力)"}

■ 現在の教材・勉強の悩み:
${message || "(未入力)"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
※このメールはSFC生の英語塾LPの自動連携システムより送信されています。
  `;

  MailApp.sendEmail({
    to: CONFIG.NOTIFICATION_EMAIL,
    subject: subject,
    body: body
  });
}

/**
 * 講師へのLINE通知
 */
function sendLineNotification(now, name, grade, subjects, frequency, email, tel, message) {
  const lineMessage = `
【SFC生の英語塾】無料学習相談の申込！
-------------------------
■ 日時: ${now}
■ 名前: ${name} 様 (${grade})
■ 科目: ${subjects}
■ 頻度: ${frequency}
■ 連絡先: ${email} ${tel ? `/ ${tel}` : ""}
■ 相談内容:
${message || "なし"}
-------------------------
24時間以内に日程連絡をお願いします。
`.trim();

  // 1. LINE Notify 経由
  if (CONFIG.LINE_NOTIFY_TOKEN) {
    try {
      UrlFetchApp.fetch("https://notify-api.line.me/api/notify", {
        method: "post",
        headers: {
          "Authorization": "Bearer " + CONFIG.LINE_NOTIFY_TOKEN
        },
        payload: {
          message: lineMessage
        },
        muteHttpExceptions: true
      });
    } catch (e) {
      Logger.log("LINE Notify Error: " + e.toString());
    }
  }

  // 2. LINE Messaging API 経由 (プッシュ通知)
  if (CONFIG.LINE_CHANNEL_ACCESS_TOKEN && CONFIG.LINE_USER_ID) {
    try {
      UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + CONFIG.LINE_CHANNEL_ACCESS_TOKEN
        },
        payload: JSON.stringify({
          to: CONFIG.LINE_USER_ID,
          messages: [{ type: "text", text: lineMessage }]
        }),
        muteHttpExceptions: true
      });
    } catch (e) {
      Logger.log("LINE Push Error: " + e.toString());
    }
  }
}

/**
 * JSONレスポンス生成ユーティリティ
 */
function createJsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
