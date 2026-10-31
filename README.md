<div align="center">

# travle

**a geography puzzle game that lives in a little retro desktop**

get from one country to another by naming the countries in between

<a href="https://travle-game.vercel.app/"><img alt="play it" src="https://img.shields.io/badge/%3E_play_it-travle--game.vercel.app-0c1611?style=for-the-badge&labelColor=0c1611&color=00e64d" /></a>

<img alt="Next.js" src="https://img.shields.io/badge/Next.js_16-0a0a0a?style=flat-square&logo=nextdotjs&logoColor=00e64d" />
<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-0a0a0a?style=flat-square&logo=typescript&logoColor=00e64d" />
<img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-0a0a0a?style=flat-square&logo=tailwindcss&logoColor=00e64d" />

<br /><br />

<img src="docs/hero.png" alt="the game window on a green desktop: a leg from Italy to Serbia with Austria on course, Greece adrift and a pixel pin on the destination" width="100%" />

</div>

<br />

## the idea

you get a start country and a target country. you type in countries one by one, and every one has to share a land border with the last one you got right. connect the two and you win.

above is an easy leg from Italy to Serbia. Austria is on course, Greece was a wrong turn.

## how a round works

every session gives you 5 levels and they get meaner as you go:

| level | name | route length |
| :-- | :-- | :-- |
| 1 | easy | 2 to 3 hops |
| 2 | medium | 4 to 5 hops |
| 3 | hard | 6 to 7 hops |
| 4 | expert | 8 to 10 hops |
| 5 | nightmare | 11 or more, through some very obscure countries |

there's no limit on guesses, so you can keep going until you get there, but the fewer you use the better your efficiency score. stuck? a hint shows the next stop, and **turn back** ends the leg and shows you the route. finish or turn back on a level to unlock the next, and unlocked levels stay unlocked next time you visit.

<img src="docs/path-log.png" alt="the end-of-leg dialog after arriving in Serbia, with guesses, best possible and the route taken" width="100%" />

every guess gets a colour so you know how you're doing, measured from everything you've already linked to the start:

| colour | meaning |
| :-- | :-- |
| 🟩 green | you moved one step closer to the target |
| 🟧 orange | a detour, you're a bit off the best route |
| ⬜ grey | way off, or doesn't connect at all |

you don't have to follow the shortest route either. if the countries you guessed link up into any valid chain from start to finish, it counts.

no double dipping: once you've entered a country you can't enter it again, and your start country is off limits too.

### ocean crossings

flip **ocean crossings** on in settings and seas and oceans become stops you can name, just like countries. countries never connect straight across water: to cross, you have to type the water itself. United States → **Bering Strait** → Russia, United Kingdom → **English Channel** → France, Spain → **Mediterranean Sea** → Egypt. each one counts as a guess.

there are 32 of them, from the five oceans down to straits like Gibraltar, and common names work too ("Med", "Bering Sea", "Arabian Gulf"). this is also what puts island countries like Japan, Sri Lanka, Australia and Fiji into puzzles. since an ocean touches dozens of coasts the world gets a lot smaller, so ocean mode uses shorter route lengths for each level. toggling it rebuilds all five levels.

### the map

it zooms in to frame your route and follows along as you guess, so a round through the Balkans isn't a speck on a world map. the countries you've linked up get joined with route lines (dashed for sea hops), your start gets a pixel flag and the destination a pixel pin, hovering a country you've revealed shows its name, and tiny countries the world map can't draw (Malta, Singapore, the Pacific islands) show up as little squares. drag to pan, ctrl+scroll or pinch to zoom, and **Fit** snaps back to your route.

## the look

the whole game is one window sitting on a flat desktop, a bit like an old Mac or a 1-bit handheld: thick ink outlines, hard drop shadows, dithered patterns and pixel lettering. the left side holds the five levels as a file tree (`# coastal` through `# here-be-dragons`) with the logbook of your guesses underneath, the map and guess bar sit on the right, and a status bar runs along the bottom. help, stats, display and settings open as popup windows.

on a phone it rearranges itself: the menu buttons move into the title bar, the map gets taller, the guess bar sits right under it, the levels turn into a row of tiles, and popups slide up from the bottom. tap a country you've revealed to see its name, and pinch to zoom.

on the map, each kind of guess has its own pattern as well as its own colour (solid for on course, stripes for a detour, a dot dither for adrift), so it still reads in the near-monochrome palettes.

there are five palettes in the display menu: desktop, inbox, midnight, beige box and blueprint.

<img src="docs/themes.png" alt="the same leg in all five palettes" width="100%" />

<sub>desktop, inbox, midnight / beige box, blueprint</sub>

sound effects are still there, toggleable in settings.

## under the hood

the world is an adjacency list. countries are nodes and shared land borders are edges, with an optional second layer of sea edges for ocean mode. every guess runs a breadth first search to the target and compares the distance before and after, and that's what decides the colour.

puzzles come from a seed fed into a tiny random number generator (mulberry32). the seed is fresh every browser session so you get new routes each time you open it, and each level only picks routes inside its hop range. level 5 pulls from the weird landlocked countries on purpose.

your stats and unlocked levels sit in local storage: games played, wins, current streak, best streak and a 30 day history chart. nothing leaves your browser.

## run it yourself

```bash
git clone https://github.com/mominmansoor/Travle-game-
cd Travle-game-
npm install
npm run dev
```

then open http://localhost:3000

## where things live

```
app/          the page and layout
components/   map, guess bar, logbook, ledger chart, dialog window, icons, palette picker
data/         countries, border data, sea links, puzzle generation, palettes
lib/          BFS pathfinding, game state, audio, theme handling
docs/         the screenshots in this readme
```

<div align="center">
<br />
<sub><code>&gt; built with react-simple-maps and world-atlas</code></sub>
</div>
