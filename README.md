# travle.exe

A geography puzzle game. Get from one country to another by guessing the countries in between — every guess has to share a land border with your last correct one.

Each session gives you 5 levels of increasing difficulty, from short 2-hop routes to multi-continent slogs through obscure landlocked nations. You get a limited number of guesses based on the optimal path length. Wrong guesses still cost you one.

---

## How it works

The world map is an adjacency list — countries are nodes, shared land borders are edges. When you make a guess, it runs BFS from your current position to the target to figure out whether you're getting closer (green), slightly off route (orange), or completely wrong (grey). Win condition is just connectivity: if your guessed countries form any valid connected path from start to end, you win — you don't have to follow the exact optimal route.

The puzzle seed is random per session so you get different routes every time you open the app.

---

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS**
- **react-simple-maps** for the world map
- **world-atlas** for the topojson data

---

## Running it

```bash
npm install
npm run dev
```

http://localhost:3000
Or just try this: https://travle-game.vercel.app/

