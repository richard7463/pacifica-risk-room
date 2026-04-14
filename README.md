# Pacifica Account Health

![Landing](docs/assets/landing-hero.png)

![Track](https://img.shields.io/badge/Track-Analytics%20%26%20Data-0f766e)
![Platform](https://img.shields.io/badge/Platform-Pacifica%20Perps-111827)
![Surface](https://img.shields.io/badge/Surface-Account%20Health-c2410c)
![Mode](https://img.shields.io/badge/Modes-Live%20Account%20%7C%20Sample%20Mode-2563eb)
![Refresh](https://img.shields.io/badge/Refresh-20s%20auto--refresh-0ea5e9)

Your Pacifica trading history, turned into personal risk guardrails.

Pacifica Account Health is a live risk workspace for Pacifica perpetuals accounts. It turns recent account history, position exposure, liquidation distance, funding, recent fills, and market context into one decision loop:

**What risk posture does this trader usually run, what is the desk risk right now, what happens if I change it, and which path is safest next?**

It also ships as an agent-readable skill:

```bash
curl -s https://pacifica-risk-room.vercel.app/skill.md > SKILL.md
```

## Product Summary

The app opens on a real Pacifica account and immediately explains:

- account health score
- current risk state: healthy, watch, or high risk
- largest position driving the score
- exposure divided by equity
- liquidation buffer
- scenario lab for adds, reductions, collateral top-ups, and rotations
- planner workspace with three de-risk paths
- history-built risk profiles and saved desk watches
- live data proof from Pacifica REST endpoints

For the current live account demo, the product detects that the BTC position is the main risk driver: exposure is around `11x` account equity and the liquidation buffer is below the high-risk threshold. The workspace recommends not adding leverage, shows how much BTC to trim or how much collateral to add, and lets the user save this desk into a threshold-based watchlist.

## Why Analytics & Data

Pacifica's hackathon track definition for `Analytics & Data` includes market intelligence, PnL tracking, and risk dashboards. This project maps directly to that track:

- `Market intelligence`: live Pacifica prices, funding, open interest, volume, and watchlist context.
- `PnL and posture tracking`: account equity, available balance, positions, fills, and portfolio replay.
- `Risk dashboard`: account health score, exposure/equity, liquidation buffer, funding cost, scenario outcomes, and recommended action paths.

It is not an auto-trading bot. The value is decision support before the trader adds more leverage.

## For Judges

| Item | Evidence |
| --- | --- |
| Track | `Analytics & Data` |
| Landing page | `https://pacifica-risk-room.vercel.app` |
| Product route | `https://pacifica-risk-room.vercel.app/app` |
| Skill route | `https://pacifica-risk-room.vercel.app/skill.md` |
| Skill explainer | `https://pacifica-risk-room.vercel.app/skill` |
| Landing source | [`components/Landing/PacificaLandingPage.tsx`](components/Landing/PacificaLandingPage.tsx) |
| Product route source | [`app/app/page.tsx`](app/app/page.tsx) and [`app/pacifica-risk-room/page.tsx`](app/pacifica-risk-room/page.tsx) |
| Product UI source | [`components/PacificaRiskRoom/PacificaRiskRoomPage.tsx`](components/PacificaRiskRoom/PacificaRiskRoomPage.tsx) |
| API route | [`app/api/pacifica-risk-room/route.ts`](app/api/pacifica-risk-room/route.ts) |
| Risk engine | [`lib/pacificaRiskRoom.ts`](lib/pacificaRiskRoom.ts) |
| Skill content | [`lib/skillContent.ts`](lib/skillContent.ts) |
| Demo script | [`docs/DEMO_VIDEO_SCRIPT.md`](docs/DEMO_VIDEO_SCRIPT.md) |
| Submission answers | [`docs/SUBMISSION_FORM_ANSWERS.md`](docs/SUBMISSION_FORM_ANSWERS.md) |

## Pacifica APIs Used

- `GET /info`
- `GET /info/prices`
- `GET /trades?symbol=...`
- `GET /funding_rate/history?symbol=...`
- `GET /account?account=...`
- `GET /positions?account=...`
- `GET /orders?account=...`
- `GET /trades/history?account=...`
- `GET /positions/history?account=...`
- `GET /portfolio?account=...&time_range=1d`

## Scorecard

| Judging criteria | Evidence in this project |
| --- | --- |
| Innovation | Turns Pacifica account, position, funding, and market telemetry into a decision workspace with scenario simulation, action planning, saved watches, and an agent skill. |
| Technical execution | Aggregates multiple Pacifica REST endpoints, computes derived risk metrics, runs scenario projections client-side on top of live data, handles live/sample modes, renders a multi-pane Next.js product, and serves an agent skill from the same app. |
| User experience | Landing page explains the product, `/app` exposes desk, scenario, planner, and watch workflows, and `/skill.md` lets agents run the same risk logic. |
| Potential impact | Perps traders can reduce avoidable liquidations by seeing exposure/equity, liquidation buffer, funding cost, and projected outcomes before increasing risk. |
| Presentation | README, screenshots, demo script, and form-ready answers are included. |

## Screenshots

| Landing | Account health app |
| --- | --- |
| ![Landing](docs/assets/landing-hero.png) | ![Account health](docs/assets/risk-room-hero.png) |

## Product Flow

1. Open the landing page.
2. Launch the account health app.
3. The default live Pacifica wallet loads automatically.
4. Read the account health score and current decision.
5. Inspect the position driving the score.
6. Open Scenario to test adds, reductions, collateral top-ups, or market rotation.
7. Open Planner to compare three suggested action paths.
8. Save the desk into Watch Mode with custom thresholds.
9. Download `skill.md` so an AI agent can run the same risk check.

## Architecture

```mermaid
graph TD
  A["Trader"] --> B["Pacifica Account Health UI"]
  B --> C["/api/pacifica-risk-room"]
  C --> D["Pacifica account endpoints"]
  C --> E["Pacifica market endpoints"]
  C --> F["Pacifica funding endpoints"]
  C --> G["Risk engine"]
  G --> H["Health score"]
  G --> I["Exposure / equity"]
  G --> J["Liquidation buffer"]
  G --> K["Recommended action"]
  H --> B
  I --> B
  J --> B
  K --> B
```

## Runtime Sequence

```mermaid
sequenceDiagram
  participant User
  participant Page as Account Health UI
  participant API as /api/pacifica-risk-room
  participant Pacifica as Pacifica REST
  User->>Page: Open app or submit wallet address
  Page->>API: Request watchlist plus optional account
  API->>Pacifica: Fetch account, positions, orders, fills, portfolio, prices, trades, and funding
  Pacifica-->>API: Return raw Pacifica data
  API->>API: Compute health score and recommended action
  API-->>Page: Return account health payload
  Page->>Page: Run scenario engine, planner, and watch threshold checks
  Page-->>User: Show desk state, what-if outcomes, plan lanes, and watch alerts
```

## Agent Skill

The project exposes a reusable skill at:

```text
https://pacifica-risk-room.vercel.app/skill.md
```

Agents use it to:

- ask for a Pacifica wallet or subaccount address
- call the Account Health API
- classify account risk
- summarize exposure/equity and liquidation buffer
- report whether new leverage should be blocked
- avoid suggesting fresh leverage when the account is critical

## What Makes It Different

| Generic perps dashboard | Pacifica Account Health |
| --- | --- |
| Starts with charts | Starts with whether the account is safe |
| Shows many markets equally | Identifies the position driving account risk |
| Displays raw liquidation or funding numbers | Converts them into liquidation buffer and funding cost |
| Leaves next step unclear | Simulates what-if outcomes and recommends concrete action paths |
| Is only useful once | Saves desks into a watch workflow with alert thresholds |
| Looks like a data dump | Starts with the desk state, then opens scenario, planner, and watch workspaces |

## Local Run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Submission Package

- README: this file
- Landing route: `/`
- Product route: `/app`
- Compatibility route: `/pacifica-risk-room`
- Agent skill: `/skill.md`
- Skill explainer: `/skill`
- Demo script: [`docs/DEMO_VIDEO_SCRIPT.md`](docs/DEMO_VIDEO_SCRIPT.md)
- Submission answers: [`docs/SUBMISSION_FORM_ANSWERS.md`](docs/SUBMISSION_FORM_ANSWERS.md)
