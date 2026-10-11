# AGR Studio

AGR Studio now includes a local terrain library, a live nearby cycle-path candidate search, guided three-step rider setup and a quieter cycling-journal design. It remains local-first and bilingual. Automated tests run locally with `npm test`; the included local GitHub Actions template is not uploaded because the current GitHub login lacks workflow permission.

Choose **Local riding** to use Van Brienenoordbrug, the Tweede Heinenoordtunnel area, a flat loop, your indoor trainer or a custom segment. Short-climb sessions use your editable effort and return timings without adding minutes. Per-workout terrain changes provide a rain option. Daily minute limits, week-specific days, busy-week hour caps and time-away dates make the schedule fit real life.

The nearby finder uses PDOK town-centre geocoding and OpenStreetMap/Overpass cycle-path bridge/incline data only after you submit and consent. Results are candidates to inspect, with map/source links; the app does not infer reliable gradient, elevation gain, current access or safe repetition routes. No live GPS is collected. See [local riding research](LOCAL-RIDING.md).

Other additions include an AGR skills passport, ascent logging, a weekly actual-versus-scheduled review, Zwift `.zwo` exports and a structured coaching brief for use with a GPT you trust in ChatGPT. GPT Store GPTs cannot be directly embedded in this app; the built-in coach uses the OpenAI API or local Ollama. No live AI response has been verified without a configured real provider.

A local training website for the **Amstel Gold Race Toerversie**. Build a plan around your available hours, prepare for the Limburg hills, record how training felt, and adapt the next sessions as life changes. The interface works in English and Dutch.

The next organizer-confirmed Toerversie is **Saturday 17 April 2027**, with published options of **65, 100, 125, 150, 200 and 240 km**. Route and ascent figures remain subject to change. AGR Studio is an independent project with no affiliation to the organizer or JOIN Cycling.

[Public repository](https://github.com/jcveraart/agr-studio) · [Race research](RACE-RESEARCH.md) · [Training science and assumptions](SCIENCE.md)

## Open it locally

You need **Node.js 20.12 or newer** and a modern browser. The application has no npm dependencies, build step or account requirement.

On Windows, double-click **`Start AGR Studio.cmd`** in this folder. The launcher starts the local application and opens it in Chrome. If you prefer starting it yourself:

```sh
git clone https://github.com/jcveraart/agr-studio.git
cd agr-studio
npm start
```

Open [http://127.0.0.1:4177](http://127.0.0.1:4177) in Chrome. Keep the local server running while using the site. If you started it in a terminal, press `Ctrl+C` there to stop it. Open the website through the local address rather than opening `public/index.html` directly.

## Your first plan

The initial profile is a **preview**. It demonstrates the interface until you save your own information; it is not an assessment of your fitness.

1. Choose a route distance and your goal: finish comfortably, ride strongly, or work toward performance.
2. Enter your current cycling volume and realistic weekly training time. Select the days you can train and your preferred long-ride day.
3. Set your experience, plan start and event date. Add power or heart-rate information when available; perceived effort is also supported.
4. Add your other recurring sports with their day, duration and intensity. They consume training time and affect recovery.
5. Save your profile. Review the resulting week and edit sessions whenever your calendar changes.

Weekly hours are a planning ceiling, not a quota to fill. A recovery week, a busy week or a period of fatigue can contain fewer hours. A short timeline or a limited time budget may make a long-distance target unrealistic; the app cannot promise readiness.

## What you can do

| Area | Purpose |
|---|---|
| Dashboard | See the race countdown, your next workout and a summary of the current training week. |
| Weekly plan | Review cycling, other sports and rest together; adjust individual sessions. |
| Calendar | Browse the schedule and export an `.ics` file for another calendar application. |
| Recovery | Record sleep, fatigue, soreness and stress, so upcoming training reflects how you feel. |
| Activity feedback | Record actual duration, perceived exertion and how a completed session went. |
| Progress | Review logged training and consistency; these are planning indicators rather than physiological measurements. |
| Race preparation | Compare distance options, consult organizer links and work through practical preparation. |
| AI coach | Ask a connected model for advice and review proposed conservative session changes. |
| Settings | Switch language, connect an optional AI provider, and export or restore your data. |

Your planned schedule is recalculated from your profile, recovery and activity history. Personal session edits are retained as overrides. Missed sessions do not become a debt to repay with extra hard workouts. Check upcoming sessions after changing your profile, reporting fatigue or adding substantial other exercise.

The calendar export contains **all-day entries**, with workout duration and effort in the description. It is a snapshot, not a live subscription: export again after changing the plan. Re-importing the same calendar file may create duplicates depending on your calendar application.

## Adaptive planning and real AI

The local planner uses transparent, scientifically informed rules. It considers training history, available time, other sports, recent feedback and the time remaining before the event. It structures easy endurance, controlled harder work, recovery and a taper. The rules and their limits are described in [SCIENCE.md](SCIENCE.md).

This planner works without an AI connection. It is a rule-based planning engine, not a trained predictive model, and the implementation has not been clinically or prospectively validated. No built-in fitness or completion guarantee is implied.

The **AI coach** is a separate, optional connection to a real OpenAI or local Ollama model. Until a provider is configured, the interface clearly reports that the coach is disconnected. There are no simulated model replies presented as AI.

The coach can explain a training choice and suggest changes to existing upcoming cycling sessions. Plan edits are bounded to reducing duration, making a session recovery, or resting. It cannot automatically increase volume, add intervals, move event dates, change other sports, or rewrite completed activities. You review suggestions before applying them; unsupported suggestions are rejected.

Advice from a language model can still be wrong. Use your own judgment, especially around illness, pain or persistent exhaustion. This app provides training support, not diagnosis or treatment.

## Connect OpenAI

In Settings, choose **OpenAI**, enter your own API key and a model name, then save the connection. The default model is **`gpt-4.1-mini`**. A key entered through the interface is held in the local server's memory and is not included in browser storage or backups. Restarting the server clears that connection unless you also configured an environment file.

Alternatively, copy `.env.example` to **`.env.local`**, fill in the variables and restart:

```dotenv
OPENAI_API_KEY=your_own_api_key
OPENAI_MODEL=gpt-4.1-mini
PORT=4177
```

`.env.local` is ignored by Git. Keep it private, and do not paste a real key into source files, screenshots, issues or a shared backup. Existing environment variables take precedence over entries in the file.

OpenAI requests are sent by the local backend to the **Responses API**, with structured JSON output and `store: false`. The selected model must support this request format and be available to your API account. Consult the official [text generation documentation](https://developers.openai.com/api/docs/guides/text) and [GPT-4.1 mini model page](https://developers.openai.com/api/docs/models/gpt-4.1-mini). API use is billed by the provider according to your account and usage.

`store: false` does not establish zero data retention for every account or provider purpose. The applicable rules are explained in OpenAI's [API data controls documentation](https://developers.openai.com/api/docs/guides/your-data).

## Connect a local Ollama model

Run Ollama on this computer with a model you have installed. In Settings, choose **Ollama** and enter that model's exact installed name. AGR Studio sends requests to `http://127.0.0.1:11434/api/chat` through its backend.

You can also set this in `.env.local`:

```dotenv
OLLAMA_MODEL=your_installed_model_name
PORT=4177
```

Leave `OPENAI_API_KEY` empty when you want Ollama selected automatically at startup. If both are set, OpenAI takes precedence. Local model speed and ability to return the requested JSON depend on your model and hardware; malformed responses leave your plan unchanged.

## Data and privacy

Your profile, workout logs, recovery check-ins, session overrides, preparation checklist and coach conversation are stored in **Chrome localStorage** for this website's address. AGR Studio has no cloud account, automatic sync or server-side athlete database.

Browser data belongs to the combination of browser profile and website address. A different port, `localhost` instead of `127.0.0.1`, another browser, or another device may appear to have a fresh profile. Incognito data is temporary, and clearing website data removes the saved information.

Use **Export backup** regularly to download a JSON copy. Store it somewhere private. Use **Import backup** to restore it; importing replaces the current local data, so export your existing state first if you want to keep it. Backups can contain personal information and coaching messages. API keys are excluded.

Before each coaching request, the app asks for consent to share the training profile, recent activity and recovery data, and upcoming schedule with the selected provider. The profile name and activity freeform notes are excluded from the structured context. The message you write to the coach is sent as written, so include only what you intend to share. Choosing a provider alone does not send your training history.

The server listens on **`127.0.0.1` only**. It is intended for one person using their own computer, not public hosting. Public GitHub source does not include your local profile or credentials. Do not expose this server through port forwarding or a tunnel as a substitute for a secured deployment.

## Event information

[RACE-RESEARCH.md](RACE-RESEARCH.md) records the checked organizer sources and distinguishes confirmed details from provisional ones. The interface links to official registration and participant information.

The published registration period for the 2027 Toerversie is **1–31 October 2026**, followed by a lottery. The app does not register you for the event or establish that a ticket is available. Routes, ascent totals, collection times and other arrangements should be checked again with the organizer before travel. There are no guaranteed final 2027 GPX tracks in this project.

## Current limits

- Activities and recovery are entered manually. GPS recording and live Strava, Garmin, Wahoo or health-platform integrations are not implemented.
- Calendar export and JSON backups are file exports; there is no automatic cross-device sync.
- Power, heart rate, load and progress displays depend on your inputs. They are not laboratory tests or a measurement of your current fitness.
- The event dataset is a researched snapshot rather than a live organizer feed.
- An AI connection requires your provider setup. A configured key or model name does not guarantee a successful provider response.

## Troubleshooting

| Problem | What to check |
|---|---|
| The site does not open | Start the server and open `http://127.0.0.1:4177`. Verify Node.js 20.12+ is installed. |
| Port 4177 is already in use | The site may already be running. Open the address first. To use another port, set `PORT` in `.env.local`, restart, and open that port. |
| My saved data disappeared | Use the same Chrome profile, address and port. Restore your JSON backup if the browser data was cleared. |
| The coach is disconnected | Configure OpenAI or Ollama in Settings, or use `.env.local` and restart the server. |
| OpenAI returns an error | Check your API key, account access, selected model and network connection. No suggestions are applied on failure. |
| Ollama cannot be reached | Check that Ollama is running locally on port 11434 and that the exact selected model is installed. |
| The model takes too long | Try again or use a smaller local model. Requests time out after 90 seconds. |

## Development checks

```sh
npm test
npm run check
```

Tests use Node's built-in test runner. Syntax checks cover the server, interface and training engine. The GitHub workflow runs both on Node.js 22 for pushes and pull requests with read-only repository permissions. CI does not call a paid AI provider or require credentials.

The application is plain HTML, CSS and JavaScript, served by `server.js`. Race data lives in `public/race-data.js`; training assumptions and event evidence live in the linked documents. There is no package installation step.
