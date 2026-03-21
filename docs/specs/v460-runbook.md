# v4.6.0 本番セットアップ Runbook

## Phase 1: Token設定

### 1-1. Apps Script側
1. Apps Script エディタ → プロジェクト設定 → スクリプトプロパティ
2. プロパティ追加: キー `EV_MANAGER_SHARED_TOKEN`, 値は任意の秘密文字列
   - または Apps Script コンソールで `rotateSharedToken()` を実行 → ログに表示されたトークンをコピー

### 1-2. PWA側
1. Settings → GAS Shared Token にトークンを入力
2. 「Test GAS Connection」ボタンを押す
3. 成功: `{ ok: true, type: "ping", version: "4.6.0" }` が返る

## Phase 2: 本番確認4項目

| # | テスト | 手順 | 期待結果 |
|---|--------|------|----------|
| 1 | 重複送信 | 同一充電セッションを2回送信 | スプシに1行のみ (idempotencyKey重複検知) |
| 2 | offline→online | 機内モード→充電記録→機内モード解除 | outboxが自動drain、スプシに反映 |
| 3 | reload保持 | outboxに未送信あり→ブラウザリロード | outbox件数が維持される (zustand persist) |
| 4 | CORS | GitHub Pages→GAS POST | response.json()でACK読み取り可 (no-cors廃止済) |

## Phase 3: B案 staging PoC 仕様

### 概要
GAS時間駆動トリガーでGoogle Drive写真を取得→Gemini OCR→snapshot_stagingシートに書込

### 実装範囲
- `processDrivePhotos()` GAS関数
- 5枚/trigger (GAS 6分制限対策)
- `snapshot_staging` シート (レビュー用、承認後に充電ログへ移動)
- `sourceFileHash` で重複防止
- PropertiesService に処理済ファイルID記録

### カラム (snapshot_staging)
| 列 | 内容 |
|----|------|
| A | Timestamp (処理日時) |
| B | FileName |
| C | DriveFileId |
| D | ShotTime (EXIF/撮影日時) |
| E | SoC |
| F | Range (AC OFF) |
| G | Range (AC ON) |
| H | Odometer |
| I | TripMeter |
| J | ChargingState |
| K | VehicleTime |
| L | Confidence |
| M | RawOcrText |
| N | Status (pending/approved/rejected) |

### トリガー
- 15分間隔の時間駆動トリガー
- `ensureStagingTrigger_()` で自動登録
