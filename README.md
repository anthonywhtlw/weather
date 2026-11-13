# Medford room station

An ESP32 with a DHT22 posts its temperature and humidity to Postgres every five seconds.
This Next.js app is the console: it stores the readings, draws the history, and shows a
five-day forecast. Deployed on [Vercel](https://vercel.com) with a Neon database.

**Live:** <https://weather-one-virid.vercel.app>

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![Vercel](https://img.shields.io/badge/Vercel-deployed-black)

## What it does

- `now` — the newest reading from the board, straight out of Postgres, refreshed every 5 seconds
- a temperature history chart from every reading stored so far
- a threshold you can change on the page; the board reads it back from its next upload and
  switches the LED on GPIO 2
- five days of highs and lows for Medford from [Open-Meteo](https://open-meteo.com), cached 30 minutes

The two sources are independent: if Open-Meteo is down the room numbers still show, and if the
board stops the forecast still loads.

## The API

Four endpoints — the whole app.

| Route | Method | Purpose |
| --- | --- | --- |
| `/cloud/history` | `POST` | The board sends `{"station","temperature","humidity"}`. The reply carries `threshold_c`. |
| `/cloud/history` | `GET` | The page reads the newest readings, each with its timestamp, plus `threshold_c`. |
| `/cloud/threshold` | `POST` | The page sets `{"threshold_c": 26}` in the single settings row. |
| `/cloud/forecast` | `GET` | Five days of highs and lows, fetched server-side and cached. |

```bash
curl -X POST http://localhost:3000/cloud/history \
  -H 'Content-Type: application/json' \
  -d '{"station":"medford-01","temperature":22.5,"humidity":40}'
# {"ok":true,"threshold_c":24}

curl http://localhost:3000/cloud/history
# {"readings":[{"timestamp":"2026-11-13T21:53:48Z","temperature":22.5,"humidity":40.2}],"threshold_c":26}
```

## The database

Postgres from the Vercel Marketplace (Neon). Create the store under **Storage → Create Database**,
connect it to the project, and Vercel injects `DATABASE_URL` into the environment.

There is no SQL to run by hand. The app creates both tables on its first request:

```sql
create table if not exists readings (
  id bigserial primary key, station text not null,
  temperature real not null, humidity real,
  taken_at timestamptz not null default now()
);
create table if not exists settings (
  id int primary key default 1, threshold_c real not null default 24
);
```

## Run locally

```bash
npm install
vercel env pull .env.local --environment=production   # gets DATABASE_URL
npm run dev
```

Open <http://localhost:3000>. Without the board you can `POST` a reading with curl — the dashboard
fills in within five seconds.

```bash
npm run build
npm start
npm run typecheck
```

## The board

`esp32/main.py` connects to Wi-Fi and POSTs every five seconds with `urequests`, prints the status
and body, closes every response, reads `threshold_c` from the reply, and drives GPIO 2 (the
onboard LED). Wiring is in `esp32/dht22.yml` — three jumpers: VCC→3V3, DATA→GPIO 4, GND→GND.

## Project layout

```
app/
  page.tsx                  # renders the dashboard
  cloud/history/route.ts    # POST from the board, GET for the page
  cloud/threshold/route.ts  # read and write the settings row
  cloud/forecast/route.ts   # Open-Meteo, cached 30 minutes
components/
  dashboard.tsx             # polls /cloud/history, chart, threshold, forecast cards
lib/
  db.ts                     # Neon client, schema bootstrap, queries
  forecast.ts               # Open-Meteo daily highs and lows
  weather.ts                # unit and comfort helpers
```
