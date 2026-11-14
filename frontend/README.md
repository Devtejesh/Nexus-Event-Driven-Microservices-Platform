# ChickenFresh Frontend

ChickenFresh is a responsive React storefront preview for weight-based chicken shopping. The interface includes Home, Shop, Product Details, Cart & Checkout, Merchant Operations, and Account screens. English, Hindi, and Telugu are available from the language selector.

## Run locally

From this directory:

```powershell
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173/`.

Production checks:

```powershell
npm run lint
npm run build
```

## Authentication service

Login and registration call the existing user service through the Vite development proxy at `http://localhost:8080`. Start the user service before testing those forms. For a deployed frontend, configure an equivalent same-origin reverse proxy; the Vite proxy is development-only.

## Preview data and checkout

Catalog names, sample prices, ratings, promo codes, delivery threshold, and merchant dashboard figures are illustrative. Cart, filters, weight selection, and totals work locally and the cart/language preference are stored in browser local storage. Checkout collects delivery details and produces a clearly labeled local demo confirmation; it does not create an order or process payment.

The current backend does not provide catalog price data or customer order history, and its Stripe amount currency does not match the INR prices shown in this preview. Do not enable a real charge with these sample values. A live checkout requires a trusted server-side catalog/price source, user identity derived from the verified token, matching currency configuration, and customer-facing order APIs.

## AI voice assistant

The floating assistant uses the separate Go service in `ai-agent-service` and a
server-side `GEMINI_API_KEY`. Follow [the assistant service instructions](../ai-agent-service/README.md)
to configure and start it on port 8082; the Vite development server proxies
`/api/assistant` to that service. The browser's native speech APIs provide voice
input/output when supported; browser and installed-language availability vary.
Speech recognition may process microphone audio through the browser's speech
service. The assistant sends the transcript and limited storefront context to
Gemini. If browser recognition fails with a network or language error, the
assistant offers a Gemini audio fallback. After you select it, the assistant
records up to 30 seconds and sends that recording to Gemini for transcription.
Text chat remains available if speech recognition is unavailable.

The assistant supports multilingual guidance, navigation to storefront screens,
catalog search, and edits to the local demo cart. Conversation history remains
in the active browser panel and is sent to Gemini for responses; it is not
stored by the assistant service. The assistant does not access customer records
or create, cancel, or charge real orders. Never use the sample catalog or demo
checkout as a live commerce integration.
