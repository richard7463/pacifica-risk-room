# Pacifica Account Health Final Submission Packet

## Recommended Track

`Analytics & Data`

This is the strongest fit because Pacifica's track definition includes market intelligence, PnL tracking, and risk dashboards. Pacifica Account Health is a live risk dashboard that helps traders understand account safety before adding leverage.

## Project Name

Pacifica Account Health

## One-Line Pitch

Pacifica Account Health shows whether a Pacifica perps account is safe to add leverage by combining live account equity, position exposure, liquidation distance, funding, and market context.

## Short Summary

Pacifica Account Health is a Pacifica-native account risk monitor for perpetuals traders. It turns raw account, position, funding, trade, and market data into one readable health score and a concrete next action. The product answers the trader's most important question before they increase leverage: is this account safe right now?

## Detailed Description

Perpetual traders often see prices and positions, but still have to reason manually about liquidation distance, exposure versus equity, margin usage, funding, and recent fills. Pacifica Account Health compresses that work into one product surface.

The app loads a live Pacifica wallet by default, identifies the position driving account risk, computes exposure/equity, finds the tightest liquidation buffer, estimates funding cost on the active position, and recommends a risk action such as reducing exposure or adding collateral before adding leverage.

For the current live demo account, the app identifies BTC as the main risk driver and explains that exposure is roughly `11x` account equity with a sub-8% liquidation buffer. The product therefore recommends not adding leverage until BTC exposure is reduced or more collateral is added.

## What Makes It Innovative

- It is Pacifica-native rather than a generic portfolio dashboard.
- It turns Pacifica REST data into a pre-liquidation account health decision.
- It identifies the live position driving risk instead of showing all markets equally.
- It converts risk metrics into concrete user actions.
- It keeps API data proof available without making the product feel like a technical demo.

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

## User Flow

1. Open Pacifica Account Health.
2. The live Pacifica wallet loads automatically.
3. Read the current decision: Healthy, Watch, or High risk.
4. Inspect the position driving the score.
5. Review exposure/equity, liquidation buffer, margin used, and funding cost.
6. Follow the recommended action before adding leverage.
7. Use Live Data Proof to verify the Pacifica endpoints behind the dashboard.

## Judging Angle

### Innovation

The project reframes Pacifica account telemetry as a pre-liquidation safety product, not a quote board.

### Technical Execution

It aggregates multiple Pacifica REST endpoints, computes derived account-risk metrics, handles live and sample modes, and renders the result in a responsive Next.js app.

### User Experience

The first screen answers the user's real question directly: whether the account is safe and what should happen next.

### Potential Impact

Pacifica traders can reduce avoidable liquidation risk by seeing exposure/equity and liquidation buffer before increasing leverage.

### Presentation

README, screenshots, demo script, and form-ready answers are included.

## Demo Flow

1. Open the live app.
2. Show the account health score and current decision.
3. Explain the live BTC position as the main risk driver.
4. Show exposure/equity and liquidation buffer.
5. Show the recommended action: do not add leverage and reduce BTC exposure or add collateral.
6. Show funding and market context as supporting data.
7. End with Live Data Proof and the Analytics & Data track fit.

## Remaining External Links

- Repository URL: `https://github.com/richard7463/pacifica-risk-room`
- Pull Request URL: `not applicable, standalone repository`
- Demo Video URL: `add your uploaded video link`
- Live Demo URL: `https://pacifica-risk-room.vercel.app`

## Files Included In This Submission Packet

- [`README.md`](../README.md)
- [`DEMO_VIDEO_SCRIPT.md`](./DEMO_VIDEO_SCRIPT.md)
- [`SUBMISSION_FORM_ANSWERS.md`](./SUBMISSION_FORM_ANSWERS.md)
- [`risk-room-hero.png`](./assets/risk-room-hero.png)
- [`risk-room-panels.png`](./assets/risk-room-panels.png)

## Final Checklist

- record or upload demo video
- verify the repository and live demo links in the submission form
- submit under `Analytics & Data`
