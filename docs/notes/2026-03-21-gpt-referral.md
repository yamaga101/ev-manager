# EV Manager — セカンドオピニオン依頼書

## プロジェクト概要

**EV Manager** は日産リーフの充電・車両管理を行う PWA（Progressive Web App）。個人開発で、ユーザーは開発者本人1名。

### Tech Stack
- **Frontend**: React 19 + TypeScript 5.9 + Tailwind CSS 4 + Vite 7 + Zustand 5
- **Backend**: Google Apps Script (GAS) — スプレッドシートへの記録
- **OCR**: Gemini Vision API — メーターパネル写真からデータ自動抽出
- **Hosting**: GitHub Pages（静的デプロイ）
- **Data**: localStorage (PWA) + Google Sheets (GAS sync)

### 主要機能（v4.5.8時点）
- 充電セッション記録（開始/終了/kWh/コスト/SoC/航続距離）
- メーターパネルカメラ撮影 → Gemini OCR → 自動入力（MeterCaptureFlow）
- AC OFF / AC ON 航続距離の並列記録
- メンテナンス・点検・保険・税金・ドライブログ管理
- GAS同期（PWA → GAS POST → スプレッドシート書込）
- CSV エクスポート / JSON インポート・エクスポート
- 統計ダッシュボード（充電コスト推移、SOH推移等）
- Deep Space デザインテーマ

### ファイル構成（約40ファイル、8,500行）
```
src/
├── components/
│   ├── charging/      StartChargingForm, LiveChargingScreen, CompletionSummary
│   ├── history/       HistoryList, EditSessionModal, DriveLogList
│   ├── meter-capture/ MeterCaptureFlow (Gemini Vision OCR)
│   ├── vehicle/       VehicleTab, Insurance, Tax
│   ├── maintenance/   MaintenanceTab, AddInspectionForm
│   ├── stats/         StatsDashboard (Recharts)
│   ├── inputs/        SmartNumberInput, Odometer, RepeaterButton
│   ├── ui/            Modal, Toast, BottomNav, Starfield
│   └── settings/      SettingsPanel
├── store/             Zustand stores (charging, location, settings, toast)
├── utils/             gas-sync, csv-export, meter-ocr, calculations
└── i18n/              ja/en 多言語対応

shared/                PWA ↔ GAS 共有型定義
├── types/index.ts     ChargingRecord, MeterExtractResult, GAS Payload types
├── utils/             calculations, formatting, gas-sync
└── constants/         defaults (APP_VERSION等)

gas/Code.gs            GAS backend (doPost, writeCharging, patchCharging, etc.)
```

### データフロー
```
[PWA] ユーザー入力 or カメラOCR
  ↓ Zustand store → localStorage
  ↓ buildGasPayload() → fetch(GAS_URL)
[GAS] doPost() → writeCharging() → Spreadsheet appendRow
```

---

## 現在の状態 (v4.5.8)

### 直近の実装履歴
| Ver | 内容 |
|-----|------|
| v4.5.3 | 写真108枚から52件のsnapshotデータ抽出、GAS snapshot/patch対応 |
| v4.5.4 | スプシ列幅最適化、SoCグラデーション条件付き書式 |
| v4.5.5 | AC ON航続距離カラム追加（Start/End両方） |
| v4.5.6 | AC OFF/ON横並びグリッド配置（compact SmartNumberInput） |
| v4.5.7 | LiveChargingScreenにMeterCaptureFlowカメラボタン追加 |
| v4.5.8 | EditSessionModal AC ON対応、スプシカラム移動（AC ON→AC OFFの隣） |

### スプレッドシートカラム構成（24列）
```
A:Timestamp B:ID C:Status D:Start Time E:End Time F:Location
G:Start Odo H:Start SoC I:Start Range J:Start Range AC ON
K:End SoC L:End Range M:End Range AC ON N:Added kWh O:Cost
P:Efficiency Q:Duration R:Record Type S:FileName T:TripMeter
U:AC_OFF_Range V:ChargingState W:VehicleTime X:Memo
```

---

## セカンドオピニオンを求めたい事項

### 1. Geolocation 充電スポット自動選択（A案）

**やりたいこと**: 充電開始時に `navigator.geolocation.getCurrentPosition()` で現在地を取得し、登録済み充電スポットから最寄りを自動選択する。

**現在の ChargingLocation 型**:
```typescript
interface ChargingLocation {
  id: string;
  name: string;
  voltage: number;
  amperage: number;
  kw: number;
}
```

**計画**:
1. `ChargingLocation` に `lat?: number; lng?: number;` を追加
2. `useLocationStore` に座標保存対応
3. `StartChargingForm` で Geolocation API → Haversine 距離計算 → 最寄り自動選択
4. スポット登録画面に「現在地を使用」ボタン追加

**懸念**:
- 室内/地下駐車場での GPS 精度
- ユーザーが1人なのでスポット数は少ない（5-10箇所）→ 過剰設計にならないか
- PWA の Geolocation パーミッション UX

### 2. GAS Drive 監視 + Gemini OCR 自動 snapshot（B案）

**やりたいこと**: Google Drive の特定フォルダ（EV-Meter/）を GAS の時限トリガー（15分毎）で監視。新規写真検出 → Gemini Vision OCR → スプレッドシートに snapshot 記録。「写真撮るだけ」運用。

**計画**:
1. `gas/Code.gs` に `processDrivePhotos()` 関数追加
2. GAS 時限トリガー（15分毎）で Drive フォルダ監視
3. 新規写真 → `UrlFetchApp.fetch()` で Gemini API → OCR結果をスプシ書込
4. Script Properties に Gemini API キー設定
5. snapshot 止め（セッション自動生成はしない）— ペアリング困難のため

**懸念**:
- GAS 実行時間制限（6分）内で Gemini API 往復が間に合うか
- Drive 同期ラグ（Google Photos → Drive は数分〜数十分）
- 過去実績: 150枚中10枚がEV関連（ノイズ率93%）→ 専用フォルダで回避予定
- GAS から Gemini API 呼び出し時のレスポンスサイズ制限

### 3. アーキテクチャ全般

- **PWA + GAS で十分か？** 将来的にプッシュ通知やウィジェットが必要になったらネイティブ移行（Expo/React Native）を検討するが、現時点では保留
- **localStorage のみでのデータ永続性** — GAS sync はあるがリアルタイムではない。データロス対策は十分か
- **Zustand store の設計** — charging, location, settings, toast で分割。これでスケールするか

---

## 質問

1. **A案の Geolocation 実装について**: スポット数が少ない個人利用で、Haversine 距離計算は過剰か？もっとシンプルなアプローチはあるか？
2. **B案の GAS Drive 監視について**: GAS の制約（6分実行制限、UrlFetchApp）で Gemini Vision API を使うのは現実的か？代替アーキテクチャはあるか？
3. **PWA vs ネイティブ**: 現在の機能セット（カメラOCR、Geolocation、オフライン対応）で PWA の限界に近づいているか？
4. **データ永続性**: localStorage + GAS sync の構成でデータロスリスクをどう見るか？IndexedDB への移行は必要か？
5. **全体のアーキテクチャで見落としているリスクや改善点はあるか？**

---

## 補足情報

- **GitHub**: yamaga101/ev-manager
- **スプレッドシート**: Google Sheets（24列、288行）
- **GAS Deploy**: clasp deploy v@10
- **開発者**: 個人開発、ユーザー兼開発者（1人）
- **車両**: 日産リーフ
- **開発環境**: macOS, Claude Code (Opus 4.6) + Orchestra v4.0
