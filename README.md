# Magic Retro

Simple medieval-fantasy retrospective icebreaker.

## File structure

```text
magic-retro/
├── client/        # Vue 3 + TypeScript frontend (Vite)
└── server/        # Express backend with in-memory entries
```

## Local run

Requirements: Node.js 18+.

1. Install dependencies:
   - `npm install --prefix server`
   - `npm install --prefix client`
2. Start backend:
   - `npm run dev --prefix server`
3. In a second terminal, start frontend:
   - `npm run dev --prefix client`
4. Open the frontend URL shown by Vite (usually `http://localhost:5173`).

## Build for production

1. Build frontend:
   - `npm run build --prefix client`
2. Start backend (serves API + built frontend):
   - `npm run start --prefix server`

## Render deployment (one Web Service)

- **Service type:** Web Service
- **Root directory:** repository root (`magic-retro`)
- **Build command:**
  - `npm install --prefix server && npm install --prefix client && npm run build --prefix client`
- **Start command:**
  - `npm run start --prefix server`
- **Port handling:**
  - No manual setup needed. Server listens on `process.env.PORT` (fallback `3000` locally).

## API

- `GET /api/entries`
- `POST /api/entries`

Data model:

```json
{
  "id": "string",
  "role": "string",
  "characterName": "string",
  "text": "string",
  "createdAt": 1710000000000
}
```

## Short explanation of choices

- Express backend with in-memory array keeps complexity very low.
- Vue 3 Composition API keeps all UI logic in one small component.
- Role-based name generation is client-side for speed and simplicity.
- Polling every 4 seconds supports multi-user updates without WebSockets.
- Server serves the built client so Render deploy is a single service.
