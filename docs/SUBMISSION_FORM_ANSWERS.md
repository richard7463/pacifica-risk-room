# Pacifica Account Health Submission Answers

## Project Name

Pacifica Account Health

## Track

Analytics & Data

## One-Line Description

Pacifica Account Health shows whether a Pacifica perps account is safe to add leverage by combining live account equity, position exposure, liquidation distance, funding, and market context.

## What Problem Does It Solve

Perps traders often know their position size, but not whether the whole account is safe. Before adding leverage, they need a fast answer:

- How large is my exposure compared with account equity?
- How close is my closest liquidation price?
- Which position is driving the risk score?
- Is funding meaningful for my current position?
- Should I add risk, reduce exposure, or add collateral?

Pacifica Account Health turns those questions into one live account health dashboard.

## What Makes It Innovative

- It is Pacifica-native rather than a generic perps terminal.
- It turns raw REST data into a pre-liquidation account health decision.
- It focuses on the live position driving risk instead of showing every market equally.
- It converts account data into trader-readable guidance: do not add leverage, reduce exposure, or add collateral.
- It keeps market and funding data as context while making account health the primary product.

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
2. The default live Pacifica wallet loads automatically.
3. Read the account health score and current decision.
4. Inspect the position driving the score.
5. Review exposure/equity, liquidation buffer, and funding cost.
6. Follow the recommended action before adding leverage.
7. Check Live Data Proof to verify the Pacifica endpoints used.

## Why It Fits This Track

The project maps directly to `Analytics & Data` because it provides:

- market intelligence
- PnL and account posture tracking
- liquidation-risk analytics
- funding-cost analytics
- a risk dashboard built from Pacifica-native data

It does not execute trades automatically. It helps traders make safer decisions before increasing leverage.

## Short Demo Summary

The demo opens on a live Pacifica account. The app detects that BTC is the main risk driver, shows exposure at roughly `11x` equity, highlights the liquidation buffer, and recommends not adding leverage until BTC exposure is reduced or collateral is added.

## Future Expansion

- push-based WebSocket refresh
- liquidation and funding alerts
- saved account watchlists
- multi-account risk comparison
- optional order-plan handoff for reduce-only exits
