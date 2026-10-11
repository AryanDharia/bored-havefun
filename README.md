# PlayBreak — Casual Browser Games Platform

PlayBreak is a modern, dark-first casual arcade gaming platform built with React, TypeScript, Tailwind CSS, and Vite.

## Tech Stack & Setup
- **Framework:** React 19 + TypeScript
- **Bundler:** Vite
- **Styling:** Tailwind CSS v4
- **Audio:** Web Audio API synth effects
- **Routing:** Client-side hash router with full direct-link support

## Multiplayer Architecture & Room Lifecycle

PlayBreak features a real-time authoritative multiplayer room system powered by **Node.js, Express, and Socket.IO**:
- **Room Code Generation:** 6-character cryptographically secure uppercase alphanumeric codes (`crypto.randomBytes`) with zero collisions and retry limits.
- **Room Tracking:** In-memory central `Map` tracking `roomId`, `hostSocketId`, `hostId`, `players` (max 4 players), `gameStarted`, and lifecycle events.
- **Authoritative Validation:**
  - `create-room`: Sanitizes player display names, creates authoritative room, and returns structured response `{ ok, data }`.
  - `join-room`: Validates 6-character room codes; rejects nonexistent rooms (`invalid_code`), full rooms (`room_full`), and in-progress games (`game_started`).
  - `leave-room` & `disconnect`: Idempotent cleanup. Automatically transfers host ownership to the next connected player or destroys the room if empty.
  - `start-game`: Host-only execution with minimum player count enforcement (at least 2 players).
- **Transport:** Socket.IO WebSocket with automatic HTTP long-polling fallback.
- **Rate Limiting:** Sliding-window rate limit (60 events/sec per socket) protecting the server from denial-of-service attempts.

## Running the Backend Locally

```bash
# 1. Start the multiplayer backend (runs on port 3001 or process.env.PORT)
npm run start:server

# 2. In a separate terminal, start the frontend
npm run dev
```

During local development (`localhost`), the frontend automatically connects to `http://localhost:3001`.

## Deploying to Render

The repository includes a ready-to-deploy [`render.yaml`](file:///c:/Users/DELL/Downloads/Bored_havefun/render.yaml) Blueprint that sets up both services:

1. **Backend Web Service (`playbreak-server`):**
   - **Environment:** Node.js
   - **Build Command:** `npm install`
   - **Start Command:** `npm run start:server`
   - **Health Check Path:** `/health`
   - **Environment Variables:**
     - `PORT`: `10000` (assigned by Render)
     - `CORS_ORIGIN`: Your frontend URL, e.g. `https://playbreak-web.onrender.com` (or comma-separated list of allowed origins)

2. **Frontend Static Site (`playbreak-web`):**
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `./dist`
   - **Environment Variables:**
     - `VITE_BACKEND_URL`: URL of the deployed backend Web Service (e.g., `https://playbreak-server.onrender.com`).
     > [!IMPORTANT]
     > Vite bakes `VITE_BACKEND_URL` into static bundles at build time. Whenever you update `VITE_BACKEND_URL` on Render, you **must trigger a manual deploy / rebuild** of the Static Site for the change to take effect.
     >
     > If not configured in environment variables, users can also configure or test their custom server URL directly in the UI modal via **Configure Server**.

3. **Multi-Device Testing Note:**
   - Real cross-device multiplayer across phones, laptops, and tablets requires that both clients connect to the deployed Render backend URL (or shared LAN IP for local network testing), not `localhost`.

