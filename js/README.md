# LP JavaScript

> **最終更新日**: 2026-10-20
> **更新者**: AI (Codex)

## 概要

SFCのLPの表示・申込・アクセス計測と、アーカイブページ用スクリプト。

## フォルダ構成

- `arch.js` — スクロール進捗、FAQ、アンカー移動、保存確認・受付ID付きの申込処理
- `liquid.js` — 全画面スケルトン、モバイルメニュー、カード表示、反射・波紋、演出停止、単一モバイルCTAとメール／接続済みフォームの切替
- `liquid.browser.test.cjs` — Playwrightによる8画面幅・22項目のデザイン／操作回帰テスト
- `tracker.js` — ページ閲覧IDによるスクロール・閲覧計測。公開設定を使用
- `site-config.js` — 全訪問者共通の公開受付URL・管理専用URL（未設定。秘密鍵を入れない）
- `main.js` — アーカイブLP用の既存スクリプト
- `README.md` — 本案内

## 接続

設定・受入テストは `../gas/README.md` を参照。ブラウザのlocalStorageに生徒情報を蓄積しない。

## デザイン検証

`node liquid.browser.test.cjs`（このフォルダで実行）。別途LPフォルダのローカルHTTPサーバーを起動する。既定プレビューは `http://127.0.0.1:8766`。環境に応じ `SFC_PREVIEW_URL`、`SFC_PLAYWRIGHT_MODULE`、`SFC_CHROME` にプレビューURL・Playwrightモジュール・Chrome実行ファイルを指定する。実GASへの送信は行わない。

接続URLが空欄なら公開ページは先生へのメール案内を表示。GAS URL設定後はフォームを表示し、スマホは固定ボタンで移動と送信を兼用する。PCの送信ボタンは維持する。
