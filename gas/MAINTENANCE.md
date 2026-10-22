# 先生側AIへの管理画面共同保守手順

> 最終更新日: 2026-10-22 / 更新者: AI (Codex)

## 担当と範囲

- 堀安先生: 日常の申込閲覧・生徒への返信、GASと台帳の所有・公開管理。
- 岡本: GitHubソースとPages、フォーム・表示の改修、先生側AIへの差分依頼。
- 先生側AI: 先生の承認を得たGAS更新と再デプロイ・本人での受入確認。

認証とメール送信者は先生本人のままとし、岡本のメールアドレスをassertOwner_の許可先へ追加しない。URLを知るだけで管理情報を閲覧できる状態にしない。GAS編集者は認証・送信処理を変えられる強い権限なので、共有する場合は先生の明示確認を得る。パスワードやトークンは送付しない。

## 1回だけ必要な表示用CSSの接続

岡本が管理する表示用CSSを公開する:
https://onaoki0503-lgtm.github.io/shiritsu-english/css/dashboard.css

先生の管理専用プロジェクトの現行Admin.htmlをバックアップし、既存styleの後、</head>の前へ次の1行を追加する。同じ行があれば重複追加しない。

```html
<link rel="stylesheet" href="https://onaoki0503-lgtm.github.io/shiritsu-english/css/dashboard.css">
```

公開前にCSSのHTTP 200を確認。保存後は既存管理デプロイのバージョンを更新し、同じ/exec URLを維持する。新規の公開アクセス権は付与しない。既存inline CSSを残すので外部CSS障害時も基本操作は維持する。

以後の配色・余白・文字サイズ・レスポンシブ調整は、岡本がGitHubのcss/dashboard.cssを修正してPages公開すれば、管理画面の再読込後に反映できる（配信キャッシュで時間差あり）。外部CSSにはデータ・認証情報・外部追跡・送信処理を含めない。

項目追加・返信処理などHTML/サーバー変更は、先生側の最新ソースを起点に差分を作る。こちらのAdmin.gsは先生側ではAdminServer.gsの名称。両方を同時に追加せず、doGet等を重複定義しない。先生が合わせたスクロール列名を上書きしない。

## 受入確認と返送項目

先生本人で管理表示・申込一覧・返信操作の維持を確認。別アカウントと匿名の拒否も維持。返信テストはテスト申込だけに限定する。

返送: CSS組込の可否・実施結果、管理プロジェクトの編集URL、実デプロイバージョン、現行Code/Common/AdminServer/Adminソース（プロパティ・台帳の実データ・トークンは含めない）。岡本アカウント o.naoki0503@intakingresources.com への管理GAS編集共有を許可できるかも先生に確認し、許可がある場合のみ共有する。台帳や公開用プロジェクトまで自動的に共有しない。共有不可でも、メールで差分→先生側AIが反映する運用で保守できる。

## 根拠

Google HTML Serviceは外部stylesheetをHTTPSで読み込める:
https://developers.google.com/apps-script/guides/html/restrictions

## 現時点

CSSをGitHub Pagesへ公開し、ローカルAdmin.htmlの読込行を準備済み。2026-10-22 15:26、先生側AIへの差分依頼をメール送信済み。先生側の本番への1行組込・共有権限の承認は未完了。CSS配信だけで本番組込済みとは扱わない。
