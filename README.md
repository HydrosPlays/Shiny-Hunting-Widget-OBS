# ✨ Shiny Hunt Counter — OBS overlay + Stream Deck

An animated, **Pokémon-themed** shiny-hunting counter for OBS. A modern Pokédex-style
card that **auto-themes to your target's types**, shows the animated shiny sprite you're
chasing, tracks live odds, and celebrates with sparkles when you find it. Juggle multiple
hunts with **Hold/Resume**, and show off your catches in a **Previous Shinies** list.

Everything is driven from a **Pokédex-styled control panel** (or your phone) and your
**Stream Deck** — the overlay updates **instantly** (live push, no refresh).

Runs locally with **zero install** beyond Node.js. No accounts, no cloud, no `npm install`.

### Features
- 🎴 Modern Pokémon menu-card overlay; **auto type-color theming**, Pokédex number, type badges.
- 🌗 **Light & dark** overlay themes — toggle live from the panel (saved).
- 🎯 Accurate shiny odds (**Full odds / Shiny Charm / Masuda**), shown as **% of odds** that
  goes past 100% once you're "over odds."
- 🔮 **Shiny Charm** icon indicator on the card.
- 🧬 Phase tracking + a full **"found" celebration** (gold glow, ✦ SHINY! ribbon, sparkles).
- ⏸ **Hold / Resume** any number of hunts without losing progress.
- ✅ **Complete** a hunt → it lands in **Previous Shinies**; the latest one shows on the overlay.
- 🕹 **Pokédex control panel** with its own ☀/🌙 light/dark switch (saved per device).
- 📱 Works from your phone on the same network; 🎛 Stream Deck friendly.

---

## 1. Start it

Double-click **`start.bat`**.

A console window opens (leave it open while streaming) and your browser pops open
the **Control page**. That's it.

> Prefer the terminal? Run `node server.js` in this folder.
>
> ⚠️ **After updating `server.js`, restart it** (close the window, reopen `start.bat`) —
> the server code only reloads on start. The HTML pages refresh live.

You should see:

```
OBS overlay  ->  http://localhost:3620/
Control page ->  http://localhost:3620/control
```

---

## 2. Add the overlay to OBS

1. In OBS: **Sources → + → Browser**.
2. **URL:** `http://localhost:3620/`
3. **Width `560`**, **Height `320`** (a good starting size — resize to taste; the Latest
   Shiny box adds a little height when it appears).
4. Leave "Shutdown source when not visible" **unchecked** so it stays live.
5. Click OK. The card sits in the bottom-left of the source on a transparent background,
   so it drops straight onto your scene.

### Overlay URL options

| Add to URL | Effect |
|---|---|
| `?align=right` | anchor bottom-right (also `left`, `center`, `topleft`, `topright`) |
| `?scale=1.3` | make everything bigger (or `0.8` smaller) |
| `?theme=dark` / `?theme=light` | force the overlay theme (otherwise it follows the panel's toggle) |
| `?stat=chance` | show cumulative "% chance by now" instead of the default "% of odds" |
| `?shinies=0` | hide the **Latest Shiny** box |
| `?sprite=0` | hide the Pokémon sprite |
| `?prob=0` | hide the odds/probability line |
| `?bar=0` | hide the progress bar |
| `?reveal=1` | show the **normal** sprite while hunting, flip to shiny on **Found** (default shows shiny the whole time) |

Combine them with `&`, e.g. `http://localhost:3620/?align=right&scale=1.2`

---

## 3. Set up your hunt

Open the **Control page** (`http://localhost:3620/control`) — it opens automatically with
`start.bat`, and mirrors your Stream Deck. Keep it on a second monitor or your phone.

- Enter the **Pokémon** (name like `gible` or Pokédex number like `443`). Its **shiny**
  sprite, Pokédex number, and **type colors** load automatically.
- Pick your **method** (dropdown), **generation**, and toggle **Shiny Charm** / **Masuda** —
  the odds (e.g. `1/1365`) update automatically. Or type a **custom odds** number to override.
- Click **Save hunt settings**.

The panel also has big **+1 / −1 / Phase / Found / Reset** buttons and keyboard shortcuts,
so you can run a whole hunt from here even without a Stream Deck.

**Two independent themes:**
- **☀/🌙 top-right of the panel** styles the **control panel** (saved in your browser).
- **Light / Dark under the preview** styles the **OBS overlay** (saved on the server, live to OBS).

---

## 4. Managing hunts — Hold & Complete

- **⏸ Hold** — parks the current hunt in the **On Hold** list and clears the box for a new
  one. Each held hunt shows its sprite, name, count, and game, with a **Resume** button.
- **Resume** — swaps a held hunt back into the box. Whatever was active is **auto-parked**
  first, so you never lose progress. Hold as many hunts as you like.
- **✓ Complete — caught!** — archives the current hunt to **Previous Shinies** (sprite, name,
  the total count when you finished, and game). The **newest** one appears in the slim
  **✦ Latest Shiny** box under the overlay card. (The box is hidden until you complete one.)
- Remove any On Hold or Previous Shinies entry with its **×**.

---

## 5. Hook up your Stream Deck

Each button just opens one URL. Two ways:

### Option A — No extra plugins (uses the included scripts) ✅ recommended

The `streamdeck/` folder has ready-made scripts that fire silently (no popup window):

| Button | Action in Stream Deck | File to point at |
|---|---|---|
| **+1** | `System → Open` | `streamdeck\increment.vbs` |
| **−1 (undo)** | `System → Open` | `streamdeck\decrement.vbs` |
| **Reset** | `System → Open` | `streamdeck\reset.vbs` |
| **Phase** | `System → Open` | `streamdeck\phase.vbs` |
| **Found!** | `System → Open` | `streamdeck\found.vbs` |

Steps for each button:
1. Drag the **System → Open** action onto a key.
2. Set **App / File** to the matching `.vbs` file (Browse to this folder).
3. Give it a title/icon. Done — press it and the overlay reacts.

### Option B — "Web Requests" plugin (no scripts)

Install the **BarRaider "Web Requests"** plugin, then add a *GET request* action per button
pointing at any endpoint below — e.g. `http://localhost:3620/api/increment`. This is also
how you'd add **Hold**, **Complete**, or **theme** buttons (no `.vbs` needed).

Tip: increment by more than one with `.../api/increment?by=5`.

---

## Buttons explained

- **+1** — one encounter / soft reset. Your main hunting button.
- **−1** — undo an accidental double-count.
- **Phase** — you found a *different* shiny mid-hunt (chain/phase hunting). Bumps the phase
  counter and resets the per-phase count; your total keeps climbing.
- **Found!** — toggles the celebration (sparkles + gold glow + ✦ SHINY! ribbon).
- **Reset** — back to 0 and clears phases/celebration.
- **Hold** — park the current hunt; **Resume** it later from the list.
- **Complete** — mark the hunt done and add it to Previous Shinies.

---

## Endpoint reference

All accept plain `GET` (just open the URL):

| Endpoint | What it does |
|---|---|
| `/api/state` | current state as JSON |
| `/api/increment?by=1` | add to the count |
| `/api/decrement?by=1` | subtract |
| `/api/reset` | zero the current hunt (count, phases, celebration) |
| `/api/set?count=1234&phaseCount=0` | set exact values |
| `/api/phase` | log a phase |
| `/api/found?on=1` / `/api/toggleFound` | celebration on/off |
| `/api/config?pokemon=gible&displayName=...&method=...&game=...&gen=8&shinyCharm=1&masuda=0&customOdds=512&theme=dark` | configure the hunt / overlay theme |
| `/api/toggleTheme` | flip the overlay light/dark |
| `/api/hold` | park the current hunt |
| `/api/resume?id=<id>` | resume a held hunt (auto-parks the current one) |
| `/api/removeHeld?id=<id>` | delete a held hunt |
| `/api/complete` | archive the current hunt to Previous Shinies |
| `/api/removeCaught?id=<id>` | delete a Previous Shiny |
| `/api/events` | live SSE stream (used by the overlay + panel) |

Everything is saved to `state.json`, so restarting the server or OBS keeps your count,
held hunts, and previous shinies.

---

## Customizing

- **Change the port** (if `3620` clashes): start with `set PORT=3720 && node server.js`.
  Then update `3620` in the overlay URL, the `streamdeck\*.vbs` files, and any Web Request URLs.
- **Odds math** — base is `1/8192` (Gen 2–5) or `1/4096` (Gen 6+). Rolls (shiny checks):
  full odds = 1, **Shiny Charm +2**, **Masuda +5** (Gen 5+; +4 in Gen 4). Odds = base ÷ rolls.
  Examples (Gen 8): Charm → `1/1365`, Masuda → `1/683`, Charm + Masuda → **`1/512`**.
  *Masuda only applies to egg hatching* — leave it off for encounters/soft resets.
- **"% of odds" vs "% chance"** — the overlay shows **count ÷ odds** (100% at the average,
  past 100% when you're "over odds"). Add `?stat=chance` for the cumulative probability
  ("chance you'd have found one by now"), which approaches but never reaches 100%.

---

## Troubleshooting

- **Overlay is blank / "waiting for server"** — the `start.bat` window must stay open. Reopen it.
- **New feature not working (Hold / Complete / theme / Latest Shiny box)** — restart the
  server (close `start.bat`, reopen). `server.js` changes only take effect on restart.
- **Latest Shiny box missing** — it only appears after you **Complete** at least one hunt.
- **Sprite doesn't load** — sprites come from PokéAPI, so this PC needs internet. Check the
  Pokémon name/number. It falls back to a Poké Ball.
- **Stream Deck button does nothing** — make sure the server is running and the `.vbs` path
  is correct. Test the URL in a browser first (it should return `{"ok":true,...}`).
- **Port already in use** — see "Change the port" above.

Happy hunting! ✨
