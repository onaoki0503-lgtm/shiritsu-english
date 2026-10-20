# SFC生の英語塾 LP・管理画面

> **最終更新日**: 2026-10-20
> **更新者**: AI (Codex)
> **リリース**: `20261020-glass-cta1`

## 概要

慶應SFC向けの個別学習伴走塾のLP。白基調Liquid Glass UI、深い青のボタン、全画面スケルトンとアニメーションに刷新し、スマホの文字重なりを修正した。スマホの無料相談導線は下部固定ボタン1つに集約する。

## 公開構成

- 判定：既存案件。GitHub Pages＋Google Apps Script＋Google Sheetsを継続し、基盤を移行しない。
- 判定理由：既存静的LPを改修し、一般向け受付と管理者専用機能は別GASで扱う構成を維持する。
- ソース管理：https://github.com/onaoki0503-lgtm/shiritsu-english （既存の公開範囲を維持）
- 公開基盤：GitHub Pages。`main`ブランチのルートから公開（legacy build）。
- サイト：https://onaoki0503-lgtm.github.io/shiritsu-english/
- 管理入口：https://onaoki0503-lgtm.github.io/shiritsu-english/dashboard.html
- 管理用GASの実プロジェクト・デプロイURLは未共有。入口から個人情報を取得・返信送信しない。
- DB・認証：先生側のGoogle Sheets台帳と、本人限定・サーバー側で権限照合する管理用GAS。
- 外部接続：公開受付URL・管理URLは `js/site-config.js` に設定する。現在は未設定。
- 現在の相談受付：講師 `taiseihori18@gmail.com` へのメール作成。未接続フォームと仮LINEリンクは表示しない。GAS接続後は自動でフォーム表示に切り替える。
- 公開状態：2026-10-20 16:26 JST、GitHub Pagesのbuild成功と実URL検証完了。公開ソースコミット `df56dfc954f6a95af036caa50d8f92e4fc7ecf77`。

## フォルダ構成

- `index.html` / `sfc.html` — 同一内容の本番SFC向けLP
- `dashboard.html` — 管理専用GASへのログイン入口。個人情報・返信機能なし
- `css/` — 基礎スタイル、Liquid Glass UI、案内README
- `js/` — 表示・申込・計測・接続設定、モバイルCTA、演出とブラウザテスト
- `gas/` — 公開用Code.gs、管理用Admin.gs / Admin.html、Common.gs、設定手順とテスト
- `assets/` — 既存の講師写真・背景・イラスト
- `aoyama.html` / `chuo.html` / `hosei.html` / `keio.html` / `march.html` / `meiji.html` / `rikkyo.html` — 他大学向けアーカイブ
- `hub_campuses_backup.html` — 既存バックアップ
- `SEO_SEARCH_CONSOLE_GUIDE.md` — 検索登録手順
- `robots.txt` / `sitemap.xml` — 検索エンジン向け設定
- `堀安先生_システム初期設定手順書.html` / `.pdf` — 2026-10-20新版設定手順
- `README.md` — 本案内

## モバイルの相談導線

768px以下では、ヘッダー・ヒーロー・料金欄・メール案内内の相談ボタンとフォーム内送信ボタンを表示せず、下部固定ボタンだけを使う。

現状はそのボタンから先生へのメールを作成する。公開用GAS URL設定後はフォームへの移動に変わり、フォームが見えている間は同じ固定ボタンが「入力内容を送信する」に変わる。入力検証・二重送信防止・保存確認を経て完了表示する。PCの相談CTAとフォーム送信操作は維持する。

## デザインと検証

白い半透明パネル、ぼかし、光沢、レンズ浮遊、カードの段階表示、ボタン波紋、メニュー・FAQ開閉を実装。深い青 `#000066` はみずほの公式ブランド説明を参考にしたUIトークンで、公式HEX仕様の断定ではない。外部フォント依存を除去し、動き低減・背景ぼかし非対応・画像／演出JS読込失敗にも対応する。

ローカル確認：320／360／375／390／430／768／1024／1440pxを含む表示・操作22項目、申込・管理画面のブラウザ回帰11項目、GASサービスモック17件が合格。ID・ラベル・素材・LP正本一致・JS構文・diff空白を確認した。

実GASでのGoogle認証・実メール送信テストは先生側設定後に行う。[GAS設定手順](gas/README.md)を参照。Safari・Android実機の確認は未実施。


## 公開後の検証（2026-10-20 16:26 JST）

公開URLで10項目合格。320／390／768pxで無料相談操作が下部固定ボタン1つだけで、横はみ出しがないことを確認。1440pxのPC表示では既存の相談CTAを維持した。メニュー・6料金の表・FAQ・メール作成リンクを確認し、仮LINEと未接続フォームは表示されない。

配信されたindex / sfc / CSS / JS / 接続設定 / 管理入口 / 公開用GASコードのHTTP 200とローカル正本のSHA-256一致を確認。公開ページのJavaScript実行エラーなし。メールアプリの起動・送信・先生側の受信確認は実施していない。管理用GASの接続とアクセス計測は先生側URLの共有後に有効化する。
