# EV Manager — Step 1b + Step 2 bundle

This bundle covers the next actions after v4.5.9 Step 1:

1. **GAS shared token guard**
2. **Automatic daily cleanup trigger for idempotency keys**
3. **Browser-visible GAS/CORS smoke test**
4. **Geolocation candidate suggestion (Haversine + accuracy gating)**

## Included changes

### Security / sync
- `gas/Code.gs`
  - requires `payload.token`
  - reads expected value from Script Properties key `EV_MANAGER_SHARED_TOKEN`
  - adds `type: "ping"` for non-mutating connectivity tests
  - auto-ensures a single daily trigger for `cleanupOldIdempotencyKeys()`
  - adds helper functions:
    - `setSharedToken(token)`
    - `rotateSharedToken()`
    - `clearSharedToken()`
    - `installMaintenanceTriggers()`
- `shared/utils/gas-sync.ts`
  - sends `token` alongside `idempotencyKey`
  - adds `pingGas()` helper
- `src/store/useSyncStore.ts`
  - injects `settings.gasSharedToken` into normal sync and retry sync
- `src/store/useSettingsStore.ts`
  - adds `settings.gasSharedToken`
- `shared/constants/defaults.ts`
  - adds `DEFAULT_GAS_SHARED_TOKEN = import.meta.env.VITE_GAS_SHARED_TOKEN ?? ""`

### Geolocation
- `shared/types/index.ts`
  - extends `ChargingLocation` with `lat`, `lng`, `radiusMeters`, `lastUsedAt`
- `src/store/useLocationStore.ts`
  - adds `markLocationUsed(id)`
- `src/utils/location-suggest.ts`
  - Haversine distance + candidate selection
- `src/components/charging/StartChargingForm.tsx`
  - shows `Use Current Location`
  - auto-suggests only when permission is already granted
  - otherwise stays manual until user taps
  - uses `accuracy <= 80m` and spot radius for confident auto-selection
- `src/components/settings/SettingsPanel.tsx`
  - adds spot coordinates + radius inputs
  - adds `Use Current Location` while editing a spot
  - adds `GAS Shared Token` input
  - adds `Test GAS Connection` button
- `public/gas-ping.html`
  - standalone browser smoke test page

## One-time setup after applying patch

### GAS Script Properties
Set Script Property:

- key: `EV_MANAGER_SHARED_TOKEN`
- value: same value as `VITE_GAS_SHARED_TOKEN` or the Settings UI field `gasSharedToken`

If you want GAS to generate one, run `rotateSharedToken()` once in Apps Script and copy the logged value into the app settings or `VITE_GAS_SHARED_TOKEN`.

### Recommended browser test order
1. Open Settings → enter GAS URL + shared token
2. Press **Test GAS Connection**
3. Confirm toast success
4. Open `/gas-ping.html` on the deployed app and verify `PASS`
5. Try an offline save, then reconnect and verify outbox drains
6. Retry same payload and confirm duplicate suppression

## Important note
A fixed token inside a client-side PWA is **not a strong secret** because it can be extracted from the bundle or requests. It is still useful as a lightweight gate against casual or accidental POSTs, but a stronger boundary would require a server-held secret (for example a thin Cloud Run proxy).
