# travle.exe

A geography puzzle game that looks like a terminal. You get a starting country and a target country, and you have to get from one to the other by naming the countries in between. Every guess needs to share a land border with the last one you got right.

**Play it here:** https://travle-game.vercel.app/

## How a round works

Each session gives you 5 levels, and they get harder as you go:

| Level | Route length |
| --- | --- |
| 1 | 2 to 3 hops |
| 2 | 4 to 5 hops |
| 3 | 6 to 7 hops |
| 4 | 8 to 10 hops |
| 5 | 11 or more, through some very obscure countries |

You get a number of guesses equal to the shortest route plus 5, and a wrong guess still uses one up. Beat a level to unlock the next one.

Guesses are colour coded so you know how you are doing:

- **Green** means the guess moved you closer to the target.
- **Orange** means it is a detour, so you are a bit off the best route.
- **Grey** means it was wrong.

You do not have to follow the shortest route. If the countries you guessed link up into any valid chain from start to finish, you win.

## How it works under the hood

The world is stored as an adjacency list, where countries are nodes and shared land borders are edges. Each time you guess, a breadth first search runs from your current position to the target and compares the distance before and after, which is how the colours get decided.

Puzzles are generated from a seed with a small random number generator (mulberry32). The seed is picked fresh each browser session, so you get different routes every time you open the game, and each level only picks routes inside its hop range, with level 5 pulling from the more obscure landlocked countries.

Your stats live in local storage: games played, wins, current streak, best streak and a 30 day history chart. Nothing leaves your browser.

## The fun extras

- 20 colour themes, including Dracula, Nord, Tokyo Night, Gruvbox, Catppuccin Mocha, Synthwave and a plain green on black terminal.
- CRT scanlines, sound effects and a green text mode, all of which you can switch on or off in settings.
- A shareable result line so you can show off your score.

## Stack

- Next.js 16 (App Router, Turbopack)
- TypeScript
- Tailwind CSS
- react-simple-maps for the world map
- world-atlas for the topojson data

## Running it locally

```bash
git clone https://github.com/mominmansoor/Travle-game-
cd Travle-game-
npm install
npm run dev
```

Then head to http://localhost:3000.

## Where things live

```
app/          the page and layout
components/   map, guess input, guess history, stats chart, terminal frame, theme picker
data/         countries, border data, puzzle generation, themes
lib/          BFS pathfinding, game state, audio, theme handling
```
