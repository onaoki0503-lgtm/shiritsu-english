/** 発行後の公開URLのみを設定する。トークン・個人情報を置かない。 */
window.SFC_CONFIG = Object.freeze({
  publicEndpoint: '', // 公開受付専用GASの /exec URL
  adminUrl: '' // 「自分のみ」の管理用GASの /exec URL
});
