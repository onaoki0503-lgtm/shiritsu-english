# Google Search Console 登録手順

> **最終更新日**: 2026-10-26
> **更新者**: AI (Codex)

## 対象と現在の状態

本番URLは `https://tomoni-juku.web.app/`。canonical、OGP、構造化データ、robots.txt、sitemap.xmlを新URLへ更新して公開済み。旧GitHub PagesのLPはJavaScriptで新URLへ転送する。

運用担当からプロパティ追加と確認タグ発行の報告を受領。既存タグを残して追加した。所有権の確認・サイトマップ送信と処理結果は担当側の確認待ち。検索結果への掲載時期・順位は保証されない。

## 登録する手順

1. [Google Search Console](https://search.google.com/search-console) で、管理するGoogleアカウントを選ぶ。
2. URLプレフィックスのプロパティとして `https://tomoni-juku.web.app/` を追加する。
3. 「HTMLタグ」の確認方法を選び、指定されたタグとindex.html／sfc.html内の `google-site-verification` を照合する。現在ある値が使えると断定せず、そのアカウントの画面に従う。変更する場合はLP2ファイルを同じ内容に保つ。
4. GitHubへ保存し、`node build-hosting.cjs`、`firebase deploy --only hosting:school --project tomoni-juku` でFirebaseへ反映する。GitHubへのpushだけでは新HPへ反映されない。
5. 公開HTMLを確認してから、Search Consoleで所有権を確認する。
6. サイトマップとして `https://tomoni-juku.web.app/sitemap.xml` を送信し、処理結果を確認する。
7. 必要に応じてURL検査からインデックス登録をリクエストし、後日結果を確認する。

HTMLファイルで所有権を確認する場合は、そのファイルを `build-hosting.cjs` の公開許可リストにも追加する。配置・GitHubへのpushだけではFirebaseへ配信されない。

管理入口はnoindex設定のまま維持する。先生の管理用GAS・顧客データを検索登録しない。
