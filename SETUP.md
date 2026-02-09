# ゼミ振り返りボード - Supabase + Vercel セットアップガイド

## 1. Supabase プロジェクト作成

### 1.1 アカウント作成
1. [supabase.com](https://supabase.com) にアクセス
2. GitHub アカウントでサインアップ（推奨）

### 1.2 新規プロジェクト作成
1. ダッシュボードで「New Project」をクリック
2. 以下を設定:
   - **Name**: `seminar-reflection-board`
   - **Database Password**: 安全なパスワードを設定
   - **Region**: `Northeast Asia (Tokyo)` を選択
3. 「Create new project」をクリック（2分程度待機）

### 1.3 データベーステーブル作成
1. 左メニューの「SQL Editor」をクリック
2. 「New query」をクリック
3. `supabase/schema.sql` の内容を貼り付けて実行

### 1.4 API キー取得
1. 左メニューの「Project Settings」→「API」
2. 以下をコピー:
   - **Project URL** (例: `https://xxxx.supabase.co`)
   - **anon public key** (例: `eyJhbG...`)

---

## 2. アプリにキーを設定

`app.js` の冒頭を編集:

```javascript
const SUPABASE_URL = 'https://あなたのプロジェクト.supabase.co';
const SUPABASE_ANON_KEY = 'あなたのanonキー';
```

---

## 3. Vercel デプロイ

### 3.1 GitHub にプッシュ
```bash
cd /Users/taro/.gemini/antigravity/scratch/seminar-reflection-board
git init
git add .
git commit -m "Initial commit with Supabase"
gh repo create seminar-reflection-board --public --source=. --push
```

### 3.2 Vercel にデプロイ
1. [vercel.com](https://vercel.com) にアクセス
2. GitHub でログイン
3. 「Add New...」→「Project」
4. `seminar-reflection-board` リポジトリを選択
5. そのまま「Deploy」をクリック

### 3.3 デプロイ完了
- URLが発行されます（例: `seminar-reflection-board.vercel.app`）
- このURLをチームに共有してください

---

## 注意事項

⚠️ **anonキーについて**
- `anon` キーはブラウザに公開されますが、これはSupabaseの設計上問題ありません
- Row Level Security (RLS) で保護されています

⚠️ **データの永続性**
- Supabaseの無料プランでは、7日間非アクティブだとプロジェクトが一時停止します
- 定期的にアクセスするか、有料プランを検討してください
