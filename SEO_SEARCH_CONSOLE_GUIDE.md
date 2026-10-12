# Google Search Console（サーチコンソール）登録 ＆ 検索エンジン公開マニュアル

本マニュアルは、「SFC生の英語塾」LP（`https://onaoki0503-lgtm.github.io/shiritsu-english/`）をGoogleの検索結果に早く・確実にヒットさせるための登録手順書です。

すでに本リポジトリ側で以下のSEO対策・クローラー巡回設定を完了しています：
- ✅ **サイトマップ（`sitemap.xml`）** の生成・配置
- ✅ **クローラー案内（`robots.txt`）** の生成・配置
- ✅ **タイトル・メタディスクリプション・Canonical URL** の最適化
- ✅ **OGPタグ（SNSシェア時の画像・タイトル表示）** の実装
- ✅ **構造化データ（JSON-LD / Schema.org）** の実装

---

## 🚀 3ステップで完了する登録手順

### ステップ1: Google Search Console にアクセス
1. ブラウザで [Google Search Console](https://search.google.com/search-console) にアクセスします。
2. お持ちのGoogleアカウント（`o.naoki0503@intakingresources.com` など）でログインします。

### ステップ2: サイト（URLプレフィックス）を追加
1. プロパティタイプの選択画面が出たら、**右側の「URL プレフィックス」** を選択します。
2. 以下の本番URLを正確に入力します：
   ```text
   https://onaoki0503-lgtm.github.io/shiritsu-english/
   ```
3. **[続行]** をクリックします。

### ステップ3: 所有権の確認（おすすめは「HTML タグ」）
所有権の確認方法が複数表示されます。以下のいずれかで確認できます：

#### 【方法A】HTMLタグによる確認（一番おすすめ・簡単）
1. 確認方法の一覧から **「HTML タグ」** を展開します。
2. 表示されるメタタグ（`<meta name="google-site-verification" content="XXXXXXXXX" />`）の `content="ここ"` の英数字コードをコピーします。
3. `index.html` および `sfc.html` の 19行目にある以下の空欄にそのコードを貼り付けます：
   ```html
   <meta name="google-site-verification" content="コピーした英数字コード">
   ```
4. git push 後、Search Console画面で **[確認]** ボタンをクリックすると、即座に所有権が確認されます！

#### 【方法B】HTMLファイルによる確認
1. **「HTML ファイル」** を選択し、ダウンロードされる確認用ファイル（例: `google12345.html`）を `私立英語塾/lp/` に配置して git push します。
2. Search Console画面で **[確認]** ボタンをクリックします。

---

## 🗺️ 所有権確認後の重要ステップ（サイトマップ送信）

所有権が確認できたら、Googleにページを今すぐ読み込ませるためにサイトマップを送信します：

1. Search Consoleの左側メニューから **[サイトマップ]** をクリックします。
2. 「新しいサイトマップの追加」欄に以下を入力します：
   ```text
   sitemap.xml
   ```
3. **[送信]** をクリックします。
4. ステータスが **「成功しました」** になれば完了です！

---

## ⚡ 早く検索結果に載せるための裏技（URL検査 ＆ インデックス登録リクエスト）

Googleクローラーの自然巡回を待つと数日から数週間かかる場合がありますが、以下の操作を行うと**数時間〜翌日程度でGoogleに登録**されます：

1. Search Console画面最上部の検索窓（「'https://onaoki0503-lgtm.github.io/shiritsu-english/' 内の任意の URL を検査」）に、トップページURLを入力してEnterキーを押します。
2. 「URL が Google に登録されていません」と表示されたら、右上の **[インデックス登録をリクエスト]** をクリックします。
3. これでGoogleの巡回キューの最優先に追加されます。

---

## 🔍 検索順位を上げるための推奨キーワード

今回のLPには、以下の検索意図に合致するようキーワードが最適化されています：
- `慶應SFC 英語 塾`
- `慶應SFC 英語 対策`
- `SFC 英語 過去問 満点`
- `SFC 小論文 添削 個別`
- `SFC 現役生 英語指導`
