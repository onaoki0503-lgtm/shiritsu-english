/**
 * SFC生の英語塾 - アクセス ＆ スクロール深度トラッキングエンジン (tracker.js)
 * 
 * 計測対象:
 * 1. ページビュー (PV) & ユニーク訪問 (UU)
 * 2. 最大スクロール深度 (25%, 50%, 75%, 100%)
 * 3. 主要セクション到達率 (hero, challenges, features, mentor, tuition, flow, faq, form_area)
 * 4. ページ滞在時間
 * 5. ボタンクリック (LINE相談ボタン, CTA)
 */

(function () {
  'use strict';

  // GASエンドポイントURL（未設定の場合はローカルストレージに蓄積してダッシュボードで確認可能）
  const STORAGE_ENDPOINT_KEY = 'sfc_analytics_endpoint';
  const DEFAULT_ENDPOINT = localStorage.getItem(STORAGE_ENDPOINT_KEY) || '';

  // セッションID生成・取得
  let sessionId = sessionStorage.getItem('sfc_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    sessionStorage.setItem('sfc_session_id', sessionId);
  }

  // デバイス判定
  function getDeviceType() {
    const width = window.innerWidth;
    const ua = navigator.userAgent;
    if (/Mobi|Android|iPhone|iPod/i.test(ua) || width <= 768) return 'Smartphone';
    if (/iPad|Tablet/i.test(ua) || (width > 768 && width <= 1024)) return 'Tablet';
    return 'Desktop';
  }

  const startTime = Date.now();
  let maxScrollDepth = 0;
  const reachedMilestones = new Set();
  const reachedSections = new Set();
  let isSent = false;

  // 1. スクロール深度のリアルタイム計測
  function checkScrollDepth() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollPercent = Math.min(100, Math.round((scrollTop / docHeight) * 100));

    if (scrollPercent > maxScrollDepth) {
      maxScrollDepth = scrollPercent;
    }

    [25, 50, 75, 100].forEach(milestone => {
      if (scrollPercent >= milestone && !reachedMilestones.has(milestone)) {
        reachedMilestones.add(milestone);
      }
    });
  }

  window.addEventListener('scroll', checkScrollDepth, { passive: true });

  // 2. セクション到達判定 (IntersectionObserver)
  const targetSections = [
    { id: 'top', alias: 'hero' },
    { id: 'challenges', alias: 'challenges' },
    { id: 'features', alias: 'features' },
    { id: 'mentor', alias: 'mentor' },
    { id: 'tuition', alias: 'tuition' },
    { id: 'flow', alias: 'flow' },
    { id: 'faq', alias: 'faq' },
    { id: 'form_area', alias: 'form_area' }
  ];

  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const matched = targetSections.find(s => s.id === entry.target.id);
          if (matched && !reachedSections.has(matched.alias)) {
            reachedSections.add(matched.alias);
          }
        }
      });
    }, { threshold: 0.2 });

    targetSections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) sectionObserver.observe(el);
    });
  }

  // 3. データ送信処理 (GAS Webhook or ローカルキャッシュ)
  function sendTrackingData() {
    if (isSent) return;
    checkScrollDepth();

    const duration = Math.round((Date.now() - startTime) / 1000);
    const endpoint = localStorage.getItem(STORAGE_ENDPOINT_KEY) || DEFAULT_ENDPOINT;

    const payload = {
      type: 'tracking',
      sessionId: sessionId,
      device: getDeviceType(),
      scrollDepth: maxScrollDepth,
      milestones: Array.from(reachedMilestones),
      reachedSections: Array.from(reachedSections),
      duration: duration,
      referrer: document.referrer || 'direct',
      timestamp: new Date().toISOString()
    };

    // ローカルストレージにも最新ログをキャッシュ（ダッシュボードでの即時可視化用）
    try {
      const localLogs = JSON.parse(localStorage.getItem('sfc_local_tracking_logs') || '[]');
      localLogs.push(payload);
      if (localLogs.length > 50) localLogs.shift();
      localStorage.setItem('sfc_local_tracking_logs', JSON.stringify(localLogs));
    } catch (e) {
      console.warn('Local storage write error:', e);
    }

    // エンドポイントが設定されている場合は実際にPOST送信
    if (endpoint) {
      isSent = true;
      const jsonStr = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        const blob = new Blob([jsonStr], { type: 'text/plain;charset=UTF-8' });
        navigator.sendBeacon(endpoint, blob);
      } else {
        fetch(endpoint, {
          method: 'POST',
          mode: 'no-cors',
          body: jsonStr,
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
        }).catch(() => {});
      }
    }
  }

  // ページ離脱時または非表示時にデータ送信
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      sendTrackingData();
    }
  });
  window.addEventListener('beforeunload', sendTrackingData);

  // 定期バッチ送信（30秒ごと、最大スクロール深度が更新された場合）
  setInterval(() => {
    if (maxScrollDepth >= 25 && !isSent) {
      // 離脱前に一度ログを保存
      sendTrackingData();
      isSent = false; // 再更新可能に
    }
  }, 30000);

  // グローバルオブジェクトに公開（デバッグ & ダッシュボード連動）
  window.SFC_TRACKER = {
    getSummary: function () {
      checkScrollDepth();
      return {
        sessionId: sessionId,
        device: getDeviceType(),
        scrollDepth: maxScrollDepth,
        reachedMilestones: Array.from(reachedMilestones),
        reachedSections: Array.from(reachedSections),
        duration: Math.round((Date.now() - startTime) / 1000)
      };
    },
    setEndpoint: function (url) {
      localStorage.setItem(STORAGE_ENDPOINT_KEY, url);
    }
  };

})();
