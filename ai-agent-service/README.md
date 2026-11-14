# AI storefront assistant

This Go service provides a Gemini-backed text endpoint for the React storefront.
The browser uses its native speech-recognition and speech-synthesis APIs when
available; the transcript is sent to this service for multilingual responses.
Provider credentials stay on the server. Conversation history is held in the
browser's active assistant panel only and is not stored by this service.

The assistant can navigate to the storefront's home, shop, cart, or account
screen, search the sample catalog, and add an item to the local demo cart. It
does not have access to customer records or an order API. The storefront's
catalog/prices are illustrative, and its checkout does not create real orders
or process payments. The assistant must not claim otherwise.

## Configure and run locally

Use Go 1.22 or later. Set a Gemini API key in the server process environment;
never expose it as a `VITE_` variable or put it in source control.

```powershell
$env:GEMINI_API_KEY = "your-key"
$env:GEMINI_MODEL = "gemini-2.5-flash" # optional
go run .
```

By default the service listens on port 8082. Configure `AI_AGENT_ADDR` to change
the listen address. The frontend Vite development server proxies
`/api/assistant` to this service. Start it separately from `frontend`:

```powershell
cd ai-agent-service
go run .

# In a second terminal
cd frontend
npm run dev
```

For production, place the assistant service behind the application's
same-origin HTTPS reverse proxy and set `GEMINI_API_KEY` through the deployment
secret manager. Do not expose the service directly to the public internet
without network-level rate limiting and TLS. The endpoint applies a modest
in-memory per-IP request limit and does not log conversation content.

## API

- `GET /healthz` returns service readiness.
- `POST /assistant/chat` accepts the selected language, at most 12 recent text
  turns, and non-sensitive storefront context. It returns a localized reply and
  an optional validated UI action. It rejects unsupported languages and unsafe
  action types.

The initial language list is English, Telugu, Hindi, Tamil, Kannada, Malayalam,
Bengali, Marathi, Gujarati, Urdu, Spanish, French, German, Arabic, Portuguese,
Japanese, and Chinese. Native browser speech recognition and speech voices are
device/browser dependent; text interaction remains available when voice APIs
or a matching language voice are unavailable.

## Tests

```powershell
go test .
```
