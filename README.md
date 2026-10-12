# AGR Studio

A local, bilingual training workspace for experienced cyclists preparing for the **Amstel Gold Race Toerversie**. Plan around your actual training history and available time, combine local climbs into repeat routes, record your effort and recovery, and adjust the coming weeks.

![Training dashboard — fictional demo rider](docs/screenshots/01-overview.png)

[10 screenshots](docs/SCREENSHOTS.md) · [Strava connection guide](docs/STRAVA.md) · [Training evidence and limitations](SCIENCE.md) · [Local riding research](LOCAL-RIDING.md) · [Event research](RACE-RESEARCH.md)

## Quick start

Requires **Node.js 20.12 or later**. There are no npm dependencies to install.

```sh
git clone https://github.com/jcveraart/agr-studio.git
cd agr-studio
npm start
```

Open **http://127.0.0.1:4177/** in Chrome. Keep the server running while using the website. On Windows, you can also double-click `Start AGR Studio.cmd` in the repository folder. The server listens only on your computer.

The site is a local single-rider application. GitHub hosts its source and instructions; it does not run the private backend or store your training account.

## Set up your training

1. Enter your goal, event distance, current weekly training and available hours. These are separate inputs: spare time alone should not determine your starting load.
2. Choose cycling days, a long-ride day, daily time limits and other sports. FTP is optional; effort cues remain available without a power meter.
3. Review the generated week and edit individual sessions. Add busy-week caps, different available days and time away as needed.

The event countdown targets **17 April 2027**. Six distance options are available: 65, 100, 125, 150, 200 and 240 km. Route details are provisional; see the event research for sources and confirmation limits. Switch between English and Dutch in the interface.

## Find climbs and build repeat routes

In **Local riding**, search from a Dutch town centre and choose a radius. With your consent, the search uses PDOK and OpenStreetMap/Overpass for mapped cycling bridges and inclines. Save a candidate or add your own riding location. Edit its effort duration, recovery/return time, approach time and start/finish coordinates.

In **Training routes**, select climbs and their repetition counts, reorder blocks, choose a starting town or coordinates, and calculate a cycling route. The builder supports 1–12 repetitions per block, up to six blocks and 31 total repetitions. BRouter connects the requested waypoints along cycling routes; the output is actual road geometry rather than straight lines. Save the route, export GPX, or assign it to a scheduled workout.

The app compares route duration with the workout budget. Assigning a route preserves the session's intensity category; endurance repetitions remain endurance. If a later adjustment makes the workout too short, it flags a conflict instead of silently fitting a long route into less time. Distance and time estimates need rider review.

Two Van Brienenoordbrug cycling approaches have mapped endpoints checked against OpenStreetMap on 12 October 2026. The public demo combines **3 south-approach repeats + 2 north-approach repeats** in a calculated **14.6 km** loop. If live map search is unavailable, the site can show its small mapped catalog and labels that result as incomplete. Inspect access, one-way directions, crossings, surface and turnaround points before riding. Terrain elevation models can miss bridge height, so route GPX exports omit unreliable elevation values.

The Heinenoord area is also available as a configurable training location. Use the permitted cycling tunnel and suitable approaches; escalators and ramps intended for other traffic are not training repetitions. Flat-road and indoor alternatives keep the intended effort available when local terrain or weather is unsuitable.

## Adjust, train and review

- Edit a workout's date, duration, type and terrain, or move it within your availability.
- Use week-specific hour limits, available days and time-away dates.
- Record actual duration, perceived effort, manually entered ascent and notes in the journal.
- Enter recovery feedback and review the proposed adjustments. Missed sessions do not create catch-up intensity.
- Compare completed and scheduled training; export workouts as Zwift `.zwo` files and your calendar as `.ics`.
- Export and restore your local training backup. Strava data and connection secrets are excluded.

The local planner uses conservative progression, easy riding, spacing between quality sessions, recovery weeks and tapering. Its workload estimates are heuristics, not TrainingPeaks TSS, clinical validation or fitness guarantees. The evidence and assumptions are documented in [SCIENCE.md](SCIENCE.md).

## Connect your Strava

Open **Strava** from the website and enter your own API app credentials in its local form. Authorize the connection on Strava, then return to view recent activity summaries. Follow the [step-by-step guide](docs/STRAVA.md), including the callback domain and troubleshooting.

Strava is an **isolated activity viewer**. Current Strava policy restricts AI processing and analytics/combination of API data, so those activities are not sent to the coach, imported into planning, or included in training backups. No activity streams, heart-rate streams or GPS tracks are requested. Training logs are entered independently.

Connection credentials and rotating OAuth tokens are encrypted in the ignored `.private-strava/` folder. The encryption key is stored alongside that data; encryption does not protect against someone who can read the entire folder. Disconnect to revoke access, or use the local forget option and revoke access in Strava yourself.

## Optional AI coaching

The application works without an AI key. To request real model advice, configure an OpenAI API key in the local coaching settings, or run Ollama and select an installed model. A GPT Store GPT cannot simply be embedded as an API endpoint. API access requires its own credentials and may have usage costs.

The coach receives the independent training profile, manually entered feedback and planned sessions. Its proposed changes are limited to conservative reductions of future cycling sessions. Suggestions require review before application; unsupported changes are rejected. Without a configured provider, the app does not present heuristic advice as a live AI response.

Optional persistent settings: copy `.env.example` to `.env.local`, then fill only the values you need. Never publish this file.

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OLLAMA_MODEL=
PORT=4177
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
```

## Privacy and screenshots

Your training profile, journal and route library are saved in this browser's local storage. Use the backup export before clearing browser data or switching computers. Keys entered through settings remain server-side; `.env.local`, `.private-strava/`, local backups and logs are ignored by Git. Mapping/routing services receive the search locations you explicitly submit. The optional AI provider receives the training context you explicitly send.

The [screenshot gallery](docs/SCREENSHOTS.md) contains **10 actual Chrome screenshots** of a fictional rider, not private account data or generated interface mockups. The Strava screenshot uses a disconnected demo screen. Explore this isolated example at `http://127.0.0.1:4177/?demo=1`; its edits do not overwrite your saved profile. Optional parameters include `view=plan`, `view=calendar`, `view=routes` and `lang=nl`.

## Checks and source

```sh
npm run check
npm test
```

Tests cover planning budgets, availability, recovery adaptations, route repetitions and exports, request guards, and Strava OAuth/storage/refresh behavior with synthetic fixtures. The local GitHub Actions template is excluded from publication because the current GitHub login lacks workflow permission; run the checks locally or add a workflow using your own authorized GitHub account.

| File | Purpose |
| --- | --- |
| `server.js` | Local server, mapping/routing endpoints and optional coaching |
| `strava-service.js` | Isolated Strava OAuth and activity viewer backend |
| `public/training.js` | Scheduling and training adaptation |
| `public/app.js` | Bilingual interface, rider profile and journal |
| `public/places.js`, `public/climb-catalog.js` | Terrain settings and mapped climb catalog |
| `public/routes.js` | Repeat routes, workout assignment and GPX export |
| `public/strava-ui.js` | Strava connection interface |
| `docs/` | Setup guide and screenshot gallery |

## Troubleshooting

- **Site unavailable:** start the server and open the exact localhost address. If the port is occupied, the app may already be running. Set `PORT` in `.env.local` if needed; update the Strava callback accordingly.
- **Map service unavailable:** try again later, use the labeled mapped catalog, or enter your own inspected segment endpoints. The site cannot guarantee a complete list of nearby climbs.
- **Route will not fit:** lower the repetition count, shorten the approach or assign it to a longer scheduled session.
- **Strava connection problem:** keep the same hostname throughout authorization and follow [the connection guide](docs/STRAVA.md).
- **AI unavailable:** check your own provider credentials or running Ollama instance. Local planning still works.
- **Missing saved profile:** local storage belongs to the browser and origin you used. Restore an exported training backup if necessary.
