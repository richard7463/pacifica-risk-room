# Pacifica Account Health Demo Script

Target length: 90 to 120 seconds.

## Goal

Show that Pacifica Account Health is a Pacifica-native analytics product and agent skill that helps traders understand account safety before adding leverage.

## Script

### 1. Open the app

"This is Pacifica Account Health. It is a live risk dashboard and agent skill for Pacifica perpetuals accounts."

"The product answers one question before a trader adds leverage: is this account safe right now?"

"Humans can use the app, and AI agents can use the skill.md file to run the same risk check."

### 2. Show the health decision

"The app opens on a live Pacifica wallet. The current decision is High risk because BTC is close to liquidation and total exposure is much larger than account equity."

"Instead of starting with charts, the first screen gives the user the safety decision immediately."

### 3. Explain the position driving the risk

"The main risk driver is the BTC long position. The dashboard shows account equity, BTC exposure, liquidation price, margin used, and liquidation buffer in one place."

"For this account, exposure is roughly eleven times equity, and the liquidation buffer is below the high-risk threshold."

### 4. Show the recommended action

"The product does not auto-trade. It gives a risk action: do not add new leverage until BTC risk improves."

"It also shows how much BTC exposure should be reduced to move back under the target exposure band, or how much collateral would be needed to improve the account."

### 5. Show funding and market context

"Funding and market panels stay available, but they support the account decision instead of overwhelming the user."

"The trader can still inspect BTC funding, watchlist prices, volume, and recent activity."

### 6. Show the agent skill

"The project also ships as an agent-readable skill at /skill.md."

"An AI trading assistant can use this skill to ask for a Pacifica wallet, call the Account Health API, classify liquidation risk, and avoid recommending fresh leverage when the account is critical."

### 7. Show data proof

"The Live Data Proof panel shows the Pacifica REST endpoints used for account state, positions, orders, fills, portfolio history, market prices, trades, and funding."

### 8. Close

"This fits Analytics & Data because it turns Pacifica-native account and market data into a clear risk dashboard for perps traders, then exposes the same logic as a reusable agent skill."
