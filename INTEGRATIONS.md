# Integrations

Nothing below is claimed as integrated. Status per integration:

| Integration | Status | What exists | Needed to complete |
|---|---|---|---|
| **Razorpay** (requested) | 🟡 Implemented, awaiting keys | Orders API, checkout.js, server-side signature verification `HMAC(order_id|payment_id)`, webhook `POST /api/v1/payments/razorpay/webhook` (HMAC of raw body), idempotent fulfilment, receipts. `PAYMENT_PROVIDER=test` gives a clearly-labelled development gateway (refused in production) | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`; set `PAYMENT_PROVIDER=razorpay`; configure webhook URL in Razorpay dashboard. **Confirm Razorpay can onboard a UAE entity / AED**, otherwise add a UAE gateway adapter (same interface) |
| UAE gateways (Network International / Telr / PayTabs / DubaiPay) | ⛔ Not implemented | Same `PaymentGateway` interface | Merchant account + credentials |
| E-mail (Microsoft 365 / Google Workspace) | ⛔ Not implemented | Reset tokens generated and stored hashed. Link is logged to the console **in development only** | SMTP/Graph credentials, sender domain, templates (EN/AR) |
| UAE PASS | ⛔ Not implemented | Auth module structured for an OIDC provider | UAE PASS onboarding, client ID/secret, staging test |
| SMS / WhatsApp Business | ⛔ Not implemented | — | Provider account and templates |
| Live classroom | ✅ **Self-hosted — no third-party service.** mediasoup SFU runs inside our API; socket.io signalling at `/live`; teacher broadcasts camera/screen + mic, students receive; automatic attendance; live comments; viewer count | Production: open UDP/TCP `LIVE_RTC_MIN_PORT–LIVE_RTC_MAX_PORT`, set `LIVE_ANNOUNCED_IP` to the public IP, HTTPS (browsers require it for camera), and a self-hosted TURN server (coturn) for students behind strict firewalls. For 1,000+ concurrent viewers run several media workers/servers |
| Object storage (UAE region) | 🟡 Local driver only | `StorageService` abstraction (private keys, path-traversal guard) | Bucket in AWS me-central-1 or Azure UAE North + S3/Blob driver |
| 360° campus tour | ⛔ Pending | `university.tourUrl` setting + per-stop `panoramaUrl` | Tour provider URL |
| Maps | ⛔ Pending | `contact.mapUrl` setting renders an embed | Confirmed campus location |
