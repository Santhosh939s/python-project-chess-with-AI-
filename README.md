# Chess AI Web App

A beautiful chess web application with:
- 🤖 **Adaptive AI** — difficulty grows with your rank (Pawn → King)
- 🌐 **Online Multiplayer** — real-time games via Socket.io
- 🏆 **Rank System** — win to climb, face tougher AI
- 🎨 **Premium UI** — dark glassmorphism, animated board

## Project Structure

```
chess-ai-web/   ← Next.js frontend → Vercel
server/         ← Express + Socket.io backend → Render
```

## Local Development

### Backend (Render)
```bash
cd server
cp .env.example .env
npm install
npm run dev     # runs on :4000
```

### Frontend (Vercel)
```bash
cd chess-ai-web
# .env.local already points to localhost:4000
npm install
npm run dev     # runs on :3000
```

## Deployment

### Backend → Render
1. Create a new **Web Service** on Render
2. Root directory: `server`
3. Build command: `npm install`
4. Start command: `node index.js`
5. Add environment variable: `JWT_SECRET=<random-secret>` and `CLIENT_URL=<your-vercel-url>`

### Frontend → Vercel
1. Import the repo on Vercel
2. Root directory: `chess-ai-web`
3. Add environment variable: `NEXT_PUBLIC_SERVER_URL=<your-render-url>`
4. Deploy!

## Rank → AI Depth

| Rank   | Wins       | AI Depth |
|--------|------------|----------|
| Pawn   | 0–4        | 2        |
| Knight | 5–14       | 3        |
| Bishop | 15–29      | 3        |
| Rook   | 30–49      | 4        |
| Queen  | 50–99      | 4        |
| King   | 100+       | 5        |