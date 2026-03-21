# EV Manager — セカンドオピニオン依頼書 v2

> **注意**: これは **EV Manager**（日産リーフ充電管理PWA）についての質問です。家計簿や Life Books ではありません。前回プロジェクト違いの回答があったため、再質問します。

## プロジェクト概要（簡潔版）

- **アプリ**: 日産リーフの充電・車両管理PWA（個人開発、ユーザー1名）
- **Tech Stack**: React 19 + TypeScript + Vite 7 + Zustand 5 / GAS backend / Gemini Vision OCR / GitHub Pages
- **データ**: localStorage (PWA側) + Google Sheets (GAS sync)
- **現行バージョン**: v4.5.8（充電ログ288行、24列スプレッドシート）
- **GitHub**: yamaga101/ev-manager

### データフロー
```
[PWA] ユーザー入力 or カメラOCR
  ↓ Zustand store → localStorage
  ↓ buildGasPayload() → fetch(GAS_URL)
[GAS] doPost() → writeCharging() → Spreadsheet appendRow
```

### 現在のGAS構成
```javascript
// gas/Code.gs の主要関数
doPost(e)         // エントリポイント、type で振り分け
writeCharging()   // 充電ログ書き込み（24列）
patchCharging()   // 既存行の部分更新（kWh等）
// 今後追加予定: processDrivePhotos(), writeSnapshots()
```

---

## 質問（4つ、全てEV Manager固有）

### Q1. Geolocation — Haversine vs シンプルアプローチ

**状況**: 充電開始時に `navigator.geolocation.getCurrentPosition()` で現在地を取得し、登録済み充電スポット（5-10箇所）から最寄りを自動選択したい。

**現在の型**:
```typescript
interface ChargingLocation {
  id: string;
  name: string;
  voltage: number;
  amperage: number;
  kw: number;
  // lat/lng を追加予定
}
```

**具体的な質問**:
- スポット5-10箇所の個人利用で、Haversine距離計算は過剰か？
- 代替案: 単純な緯度経度差の絶対値比較（`|lat1-lat2| + |lng1-lng2|`）で十分か？
- 室内/地下駐車場でGPS精度が低い場合のフォールバック設計はどうすべきか？
- PWAのGeolocationパーミッション取得のUXベストプラクティスは？

### Q2. GAS Drive監視 + Gemini Vision OCR の現実性

**状況**: Google Driveの専用フォルダ（EV-Meter/）をGAS時限トリガー（15分毎）で監視。新規写真 → Gemini Vision API でOCR → stagingタブに書き込み → ユーザーレビュー後に本番コミット。

**GAS側の制約**:
- 実行時間制限: 6分/回
- UrlFetchApp: 1回のfetchに60秒タイムアウト
- Gemini Vision APIのレスポンス: 画像1枚あたり約2-5秒（PWA側での実績）
- 過去実績: 150枚中10枚がEV関連（専用フォルダで解決予定）

**具体的な質問**:
- GAS 6分制限内で、1回のトリガーで処理できる写真枚数の現実的な上限は？
- `UrlFetchApp.fetch()` でGemini Vision APIにBase64画像を送る際、リクエスト/レスポンスのサイズ制限に引っかかるか？（GASの `UrlFetchApp` は50MB制限）
- staging型設計（OCR結果→stagingタブ→レビュー→本番）で、GAS側の実装パターンとして推奨されるアプローチは？
- 代替: GASではなくCloud Functions / Cloud Runを使うべきか？（現在GAS以外のバックエンドなし）

### Q3. PWAの限界判断

**現在PWAで使っている機能**:
- `navigator.mediaDevices.getUserMedia()` — カメラ撮影
- `navigator.geolocation` — 位置取得（計画中）
- localStorage — データ永続化
- Service Worker — オフライン対応（GitHub Pages）
- `fetch()` — GAS sync

**将来欲しい機能**:
- プッシュ通知（充電完了アラート）
- ホーム画面ウィジェット（次回充電までの残り航続距離）
- バックグラウンド同期

**具体的な質問**:
- 上記の「将来欲しい機能」のうち、PWAで実現可能なものと不可能なものはどれか？
- Expo/React Nativeへの移行を検討すべきタイミングの判断基準は？
- 個人利用1名のアプリで、ネイティブ移行のコスト（Apple Developer年99ドル等）に見合うか？

### Q4. localStorage永続性とデータロス対策

**現状**:
- PWAの全データがlocalStorageに保存（Zustand persist middleware）
- GAS syncは手動トリガー（充電完了時にPOST）
- リアルタイム同期なし
- バックアップ: JSON export機能あり（手動）

**過去のデータロス経験**:
- Safari/iOSのlocalStorage 7日制限に該当するかは未確認
- ブラウザキャッシュクリアでデータ消失のリスクあり

**具体的な質問**:
- IndexedDBへの移行は必要か？localStorage vs IndexedDB のPWAでの永続性の違いは？
- iOSのPWAにおけるlocalStorageの実際の挙動（7日ルール、容量制限）は？
- GAS sync を「変更のたびに自動実行」に変えるだけで十分か？それとも双方向同期が必要か？
- 288行×24列のデータ量で、localStorageの5MB制限に近づいているか？

---

## 前回の回答で参考になった点（適用予定）

前回のGPT回答から、以下の原則をEV Managerに適用予定です。これらについての追加アドバイスがあれば歓迎します:

1. **staging型取り込み** — OCR結果を直接本番に書かず、stagingタブ経由でレビュー
2. **バッチAPI化** — `writeSnapshots()` で複数snapshot一括登録
3. **idempotencyKey + sourceFileHash** — 写真再取り込み時の重複防止
4. **LockService** — GAS同時書き込み競合回避

---

## 補足

- **車両**: 日産リーフ（バッテリー容量40kWh、SOH推移を記録中）
- **充電スポット**: 自宅（200V普通充電）+ 近隣の急速充電器4-5箇所
- **利用頻度**: 週2-3回充電、月間10-15セッション
- **開発環境**: macOS, Claude Code (Opus 4.6)
- **GAS Deploy**: clasp v@10, "Execute as Me" + "Anyone can access"
