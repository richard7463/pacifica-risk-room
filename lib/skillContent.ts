export const PACIFICA_ACCOUNT_HEALTH_SKILL = `---
name: pacifica-account-health
description: Use this skill when a user asks an AI agent to check Pacifica perpetuals account health, liquidation risk, exposure versus equity, funding cost, or whether a Pacifica wallet is safe to add leverage. The skill calls Pacifica Account Health API and returns a trader-readable risk report.
metadata:
  homepage: https://pacifica-risk-room.vercel.app
  track: Analytics & Data
---

# Pacifica Account Health

Use this skill to check whether a Pacifica perps account is safe to add leverage.

## Inputs

- Required: Pacifica wallet or subaccount address.
- Optional: watchlist symbols, comma-separated. Default: BTC, ETH, SOL, XRP, HYPE, PUMP.

## API

\`\`\`bash
curl "https://pacifica-risk-room.vercel.app/api/pacifica-risk-room?account=<PACIFICA_ACCOUNT>"
\`\`\`

Optional watchlist:

\`\`\`bash
curl "https://pacifica-risk-room.vercel.app/api/pacifica-risk-room?account=<PACIFICA_ACCOUNT>&symbols=BTC,ETH,SOL"
\`\`\`

## Agent Workflow

1. Ask for a Pacifica wallet or subaccount address if the user has not provided one.
2. Call the API with the account address.
3. Read \`sourceStatus\`. If \`account\` is \`sample\`, clearly say the account did not return live state.
4. Read \`riskSummary.status\`, \`riskSummary.score\`, and \`riskSummary.verdict\`.
5. Identify the largest open position from \`account.positions[0]\`.
6. Report:
   - account health status
   - health score
   - account equity
   - total position exposure
   - exposure divided by equity
   - liquidation buffer for the largest position
   - funding cost for the active position if available
   - recommended next action
7. Do not present the output as financial advice. Frame it as risk analytics from Pacifica data.

## Output Template

\`\`\`text
Pacifica Account Health

Status: <Healthy | Watch | High risk>
Score: <score>/100
Verdict: <riskSummary.verdict>

Account:
- Equity: $...
- Available: $...
- Open positions: ...

Main risk driver:
- Symbol: ...
- Side: ...
- Exposure: $...
- Exposure / equity: ...x
- Liquidation price: ...
- Liquidation buffer: ...%

Recommended action:
- ...

Data source:
- Pacifica REST account, positions, orders, trade history, portfolio, prices, trades, and funding endpoints.
\`\`\`

## Safety Rules

- If liquidation buffer is below 8%, classify as high risk.
- If total exposure is above 10x equity, classify as high risk.
- If account data is unavailable, do not infer live account safety. Say sample mode was used.
- Do not recommend opening new leverage when the API returns \`critical\`.
- Prefer reduce-only or collateral-add guidance for high-risk accounts.
`;
