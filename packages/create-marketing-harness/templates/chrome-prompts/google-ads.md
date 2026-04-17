以下の手順で Google Ads API の認証情報を取得してください。

【重要】Developer Token の審査には 1〜5 営業日かかります。
審査中はスキップして、承認後に「npx marketing-harness configure google-ads」で再設定できます。

1. Developer Token の取得:
   - Google Ads にログインし、ツールと設定 → API センターを開く
   - Developer Token を申請する（Basic access で申請）
   - 審査完了のメールが届いたら次のステップへ

2. OAuth2 クライアントの作成:
   - Google Cloud Console (https://console.cloud.google.com/) を開く
   - 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuth クライアント ID」
   - アプリケーションの種類：「デスクトップアプリ」を選択して作成
   - クライアント ID とクライアントシークレットをコピー

3. OAuth同意画面を「本番環境」に変更:
   - 「APIとサービス」→「OAuth 同意画面」を開く
   - 「アプリを公開」をクリックして「本番環境」に変更する
   ※「テスト」のままだとリフレッシュトークンが7日で失効します

4. リフレッシュトークンの取得:
   - OAuth Playground (https://developers.google.com/oauthplayground/) を開く
   - 右上の設定アイコンをクリック
   - 「Use your own OAuth credentials」をチェックし、クライアントIDとシークレットを入力
   - 左側の「Google Ads API v18」→スコープ「https://www.googleapis.com/auth/adwords」を選択
   - 「Authorize APIs」→Googleアカウントでログイン→「Exchange authorization code for tokens」
   - 取得したリフレッシュトークンをコピー

5. Customer ID の確認:
   - Google Ads 管理画面の右上に表示される「123-456-7890」形式のID
   - ハイフンなし（例: 1234567890）で入力

以下の値を教えてください：
- Developer Token
- OAuth2 クライアント ID
- OAuth2 クライアントシークレット
- リフレッシュトークン
- カスタマー ID（ハイフンなし）
