# AtmosIQ — Frontend Prototype

Frontend prototype for **AtmosIQ**, a Delhi-NCR Air Pollution–Weather Coupled Forecasting System (SIH 2026, SIH26082, Ministry of Earth Sciences).

Frontend-only — all data is mocked (in `src/data/mockData.js` and `src/utils/assistant.js`), so it runs standalone with no backend, database, or Python engine.

The UI is a faithful build of the **Google Stitch** design: Material 3 token palette, **Plus Jakarta Sans**, and **Material Symbols Outlined** icons, implemented with Tailwind CSS.

## Run

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Design system

Ported from the Stitch export:
- **Tailwind config** (`tailwind.config.js`) carries Stitch's exact Material 3 tokens (colors, spacing, typography scale, radii).
- Neutral surface/text tokens are CSS variables (`src/index.css`) so the **light (default) / dark** theme toggle works; brand + semantic colors are fixed hex.
- Fonts + icons loaded in `index.html`.

## Pages (React Router — 7)

| Route | Page | Notes |
|---|---|---|
| `/` | Home | Radial AQI gauge, hyper-local map, forecast cards, regional breakdown, Ask-AtmosIQ bar, promo + trust strips |
| `/map` | Live AQI & Map | Full-screen map, station markers + construction hotspots, left telemetry drawer (PBL tracker, speciation, advisory) |
| `/routes` | Health-Safe Routes | One-time health-profile modal, From/To planner, safer-vs-fastest route comparison, suitability badge |
| `/command` | Command Center | Operator dashboard: OpsCenter sidebar, KPI cards, airshed telemetry map, HYSPLIT plume model, CAAQMS table, dispatch queue |
| `/assistant` | Assistant | Rich chat workspace, curated advisory chips, data-grounded templated replies (also the floating bubble) |
| `/learn` | Learn | Topic cards (expandable), AQI scale reference table, FAQ accordion |
| `/about` | About Us | Mission, "How It Works" 4 steps, data-source partner strip, governance + contact |

Global persistent components (shared `Layout`): top nav, GRAP status banner, floating chatbot bubble, EN | हि + light/dark toggles.

## Structure

```
src/
  components/   Layout, TopNav, GrapBanner, ChatbotBubble, Footer, Icon, HealthProfileModal
  pages/        Home, LiveMap, SafeRoutes, Command, Assistant, Learn, About
  context/      AppContext (theme, language, health profile, location)
  utils/        aqi.js (color scale + health messages), assistant.js (rules-based responder)
  data/         mockData.js
```

## Wiring to a real backend later

Swap the mock imports in `src/utils/assistant.js` / `src/data/mockData.js` for `fetch` calls to the
Node/Express endpoints (`/api/aqi/current`, `/api/forecast/:location`, `/api/assistant/query`, …).
Component data shapes already mirror the documented API contract.

## Note on the map imagery

The Home and Command maps use the base-map image URL from the Stitch export. If that URL ever stops
resolving, replace the `MAP_BG` constant in `src/pages/Home.jsx` / `src/pages/Command.jsx` with a local
image or a tile source.
