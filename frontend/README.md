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
