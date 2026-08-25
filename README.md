# ✨ Shiny Hunt Counter — OBS overlay + Stream Deck

An animated shiny-hunting counter for OBS. A bobbing Pokémon sprite, a big retro
counter that pops on every encounter, live shiny odds + cumulative probability,
phase tracking, and a full-screen sparkle celebration when you finally find it.

Press a Stream Deck button → the overlay updates **instantly** (live push, no refresh).

Everything runs locally with **zero install** beyond Node.js (already on your PC).
No accounts, no cloud, no `npm install`.

---

## 1. Start it

Double-click **`start.bat`**.

A console window opens (leave it open while streaming) and your browser pops open
the **Control page**. That's it.

> Prefer the terminal? Run `node server.js` in this folder.

You should see:

```
OBS overlay  ->  http://localhost:3620/
Control page ->  http://localhost:3620/control
```

---

## 2. Add the overlay to OBS

1. In OBS: **Sources → + → Browser**.
2. **URL:** `http://localhost:3620/`
3. **Width `560`**, **Height `250`** (a good starting size — resize to taste).
4. Leave "Shutdown source when not visible" **unchecked** so it stays live.
5. Click OK. The card appears in the bottom-left of the source with a transparent
   background, so it drops straight onto your scene.

### Overlay layout options (add to the URL)

| Add to URL        | Effect                                        |
|-------------------|-----------------------------------------------|
| `?align=right`    | anchor bottom-right (also `left`, `center`, `topleft`, `topright`) |
| `?scale=1.3`      | make everything bigger (or `0.8` smaller)     |
| `?sprite=0`       | hide the Pokémon sprite                        |
| `?prob=0`         | hide the odds/probability line                |
| `?bar=0`          | hide the probability bar                       |
| `?reveal=1`       | show the **normal** sprite while hunting, flip to shiny on **Found** (default is shiny sprite the whole time) |

Combine them with `&`, e.g. `http://localhost:3620/?align=right&scale=1.2`

---

## 3. Set up your hunt

Open the **Control page** (`http://localhost:3620/control`) — it opens
automatically with `start.bat`.

- Enter the **Pokémon** (name like `gible` or Pokédex number like `443`). The
  **shiny** sprite loads automatically — the overlay shows the shiny you're
  chasing the whole time. (Prefer a normal→shiny reveal on Found? Add `?reveal=1`
  to the OBS URL.)
- Pick your **method**, **generation**, and toggle **Shiny Charm** / **Masuda** —
  the odds (e.g. `1/1365`) update automatically. Or type a **custom odds** number
  to override.
- Click **Save hunt settings**.

The control page also has big **+1 / −1 / Phase / Found / Reset** buttons and
keyboard shortcuts, so you can run a whole hunt from here even without a Stream Deck.
It works from your **phone** too — use the `Phone/LAN` address printed in the console.

---

## 4. Hook up your Stream Deck

Each button just needs to open one URL. Two ways:

### Option A — No extra plugins (uses the included scripts) ✅ recommended

The `streamdeck/` folder has ready-made scripts that fire silently (no popup window):

| Button        | Action in Stream Deck              | File to point at              |
|---------------|------------------------------------|-------------------------------|
| **+1**        | `System → Open`                    | `streamdeck\increment.vbs`    |
| **−1 (undo)** | `System → Open`                    | `streamdeck\decrement.vbs`    |
| **Reset**     | `System → Open`                    | `streamdeck\reset.vbs`        |
| **Phase**     | `System → Open`                    | `streamdeck\phase.vbs`        |
| **Found!**    | `System → Open`                    | `streamdeck\found.vbs`        |

Steps for each button:
1. Drag the **System → Open** action onto a key.
2. Set **App / File** to the matching `.vbs` file (Browse to this folder).
3. Give it a title/icon. Done — press it and the overlay reacts.

### Option B — "Web Requests" plugin (no scripts)

If you install the **BarRaider "Web Requests"** plugin from the Stream Deck store,
add a *GET request* action per button pointing at these URLs:

| Button    | URL                                          |
|-----------|----------------------------------------------|
| **+1**    | `http://localhost:3620/api/increment`        |
| **−1**    | `http://localhost:3620/api/decrement`        |
| **Reset** | `http://localhost:3620/api/reset`            |
| **Phase** | `http://localhost:3620/api/phase`            |
| **Found** | `http://localhost:3620/api/toggleFound`      |

Tip: increment by more than one with `.../api/increment?by=5`.

---

## Buttons explained

- **+1** — one encounter / soft reset. This is your main hunting button.
- **−1** — undo an accidental double-count.
- **Phase** — you found a *different* shiny mid-hunt (chain/phase hunting). Bumps
  the phase counter and resets the per-phase count; your total keeps climbing.
- **Found!** — toggles the celebration (sparkles + shiny sprite + gold glow).
- **Reset** — back to 0 and clears phases/celebration. (Set a specific number
  instead from the control page or `/api/set?count=1234`.)

---

## Endpoint reference

All accept plain `GET` (just open the URL):

| Endpoint | What it does |
|---|---|
| `/api/state` | current state as JSON |
| `/api/increment?by=1` | add to the count |
| `/api/decrement?by=1` | subtract |
| `/api/reset` | zero everything |
| `/api/set?count=1234&phaseCount=0` | set exact values |
| `/api/phase` | log a phase |
| `/api/found?on=1` / `/api/toggleFound` | celebration on/off |
| `/api/config?pokemon=gible&method=...&gen=8&shinyCharm=1&masuda=0&customOdds=512&game=...&displayName=...` | configure the hunt |
| `/api/events` | live SSE stream (used by the overlay) |

Your progress is saved to `state.json`, so restarting the server or OBS keeps
your count.

---

## Customizing

- **Change the port** (if `3620` clashes with something): start with
  `set PORT=3720 && node server.js`. Then update the `3620` in the overlay URL,
  the `streamdeck\*.vbs` files, and the Web Request URLs to match.
- **Odds math:** base is `1/8192` for Gen 1–5 and `1/4096` for Gen 6+. Shiny Charm
  adds 2 rolls; Masuda adds 5 (Gen 5) or 6 (Gen 6+). "Custom odds" overrides all of it.

---

## Troubleshooting

- **Overlay is blank / says "waiting for server"** — the `start.bat` window must
  stay open. If you closed it, run it again.
- **Sprite doesn't load** — sprites come from PokéAPI, so this PC needs internet.
  Check the Pokémon name/number is spelled correctly. It falls back to a Poké Ball.
- **Stream Deck button does nothing** — make sure the server is running and the
  `.vbs` path is correct. Test the same URL in a browser first (it should return
  `{"ok":true,...}`).
- **Port already in use** — see "Change the port" above.

Happy hunting! ✨
