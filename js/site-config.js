/** 発行後の公開URLのみを設定する。トークン・個人情報を置かない。 */
window.SFC_CONFIG = Object.freeze({
  publicEndpoint: 'https://script.google.com/macros/s/AKfycbzCiA0ABPbm_m0y7WYlDtFhINrzzP074ZmpE9LiO_4UaGhgzWeldsSjNQVJ_VHXKBeJ/exec', // 公開受付専用GASの /exec URL
  adminUrl: 'https://script.google.com/macros/s/AKfycbzhI0Hh6o8B-bBst1BqNDa6mgZmTUThT7iPsOZV_kljXWB0B8zhKajqtfIAzqfihKQx/exec' // Google本人認証とサーバー権限照合を行う管理用GASの /exec URL
});
