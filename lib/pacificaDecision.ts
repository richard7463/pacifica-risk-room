import {
  buildRiskSummary,
  clamp,
  round,
  type PacificaAccountSummary,
  type PacificaFundingCurve,
  type PacificaLiquidationEvent,
  type PacificaMarketSnapshot,
  type PacificaPosition,
  type PacificaRiskRoomResponse,
  type PacificaRiskStatus,
} from "@/lib/pacificaRiskRoom";

export type PacificaScenarioAction =
  | "hold"
  | "add_long"
  | "add_short"
  | "reduce"
  | "rotate";

export interface PacificaScenarioInput {
  symbol: string;
  action: PacificaScenarioAction;
  sizeUsd: number;
  leverage: number;
  collateralDeltaUsd: number;
  rotateToSymbol: string;
}

export interface PacificaHealthMetrics {
  grossExposureUsd: number;
  exposureMultiple: number;
  fundingDragUsd: number;
  tightestLiqDistancePct: number | null;
  marginUsagePct: number;
}

export interface PacificaScenarioResult {
  account: PacificaAccountSummary;
  riskSummary: PacificaRiskRoomResponse["riskSummary"];
  metrics: PacificaHealthMetrics;
  scoreDelta: number;
  assumptions: string[];
}

export interface PacificaPlannerOption {
  id: string;
  title: string;
  summary: string;
  rationale: string;
  steps: string[];
  scenario: PacificaScenarioInput;
  projected: PacificaScenarioResult;
}

export interface PacificaWatchItem {
  id: string;
  label: string;
  accountId: string;
  minScore: number;
  maxExposureMultiple: number;
  minLiqBufferPct: number;
  maxFundingDragUsd: number;
  createdAt: string;
  updatedAt: string;
}

export interface PacificaWatchEvaluation {
  severity: PacificaRiskStatus;
  alerts: string[];
  metrics: PacificaHealthMetrics;
  score: number;
}

export const DEFAULT_SCENARIO_INPUT: PacificaScenarioInput = {
  symbol: "BTC",
  action: "reduce",
  sizeUsd: 250,
  leverage: 5,
  collateralDeltaUsd: 0,
  rotateToSymbol: "SOL",
};

function normalizePositionSide(side: string) {
  const normalized = side.toLowerCase();
  if (normalized.includes("ask") || normalized.includes("short")) {
    return "short";
  }

  return "long";
}

function getMarket(symbol: string, marketSnapshot: PacificaMarketSnapshot[]) {
  return (
    marketSnapshot.find((item) => item.symbol === symbol) ||
    marketSnapshot[0] ||
    null
  );
}

function deriveFallbackDistance(position: PacificaPosition) {
  const leverage = Math.max(position.leverage || 5, 1);
  return clamp(100 / (leverage * 2.25), 4, 24);
}

function clonePositions(positions: PacificaPosition[]) {
  return positions.map((position) => ({ ...position }));
}

function computeLiqPrice(markPrice: number, side: string, distancePct: number | null) {
  if (!distancePct || markPrice <= 0) {
    return null;
  }

  return normalizePositionSide(side) === "short"
    ? round(markPrice * (1 + distancePct / 100), markPrice >= 100 ? 2 : 5)
    : round(markPrice * (1 - distancePct / 100), markPrice >= 100 ? 2 : 5);
}

function sortPositions(positions: PacificaPosition[]) {
  return positions
    .filter((position) => position.notionalUsd > 0.5)
    .sort((left, right) => right.notionalUsd - left.notionalUsd);
}

export function computeHealthMetrics(
  account: PacificaAccountSummary,
  fundingCurves: PacificaFundingCurve[],
): PacificaHealthMetrics {
  const grossExposureUsd = account.positions.reduce(
    (sum, position) => sum + position.notionalUsd,
    0,
  );
  const equityUsd = Math.max(account.equityUsd, 1);
  const tightestLiqDistancePct =
    account.positions
      .map((position) => position.liquidationDistancePct)
      .filter((value): value is number => value !== null)
      .sort((left, right) => left - right)[0] ?? null;

  const fundingDragUsd = account.positions.reduce((sum, position) => {
    const curve = fundingCurves.find((item) => item.symbol === position.symbol);
    return sum + Math.abs(position.notionalUsd * (curve?.nextFundingRate || 0));
  }, 0);

  return {
    grossExposureUsd: round(grossExposureUsd, 2),
    exposureMultiple: round(grossExposureUsd / equityUsd, 2),
    fundingDragUsd: round(fundingDragUsd, 4),
    tightestLiqDistancePct:
      tightestLiqDistancePct === null ? null : round(tightestLiqDistancePct, 2),
    marginUsagePct: round((account.marginUsedUsd / equityUsd) * 100, 2),
  };
}

function applyTradeToPosition(
  position: PacificaPosition | undefined,
  market: PacificaMarketSnapshot,
  desiredSide: "long" | "short",
  sizeUsd: number,
  leverage: number,
) {
  const safeLeverage = clamp(leverage, 2, Math.max(2, market.maxLeverage));

  if (!position) {
    const notionalUsd = round(sizeUsd, 2);
    return {
      nextPosition: {
        symbol: market.symbol,
        side: desiredSide,
        amount: round(notionalUsd / Math.max(market.mark, 1), 6),
        entryPrice: market.mark,
        markPrice: market.mark,
        liquidationPrice: null,
        leverage: safeLeverage,
        marginUsedUsd: round(notionalUsd / safeLeverage, 2),
        unrealizedPnlUsd: 0,
        realizedPnlUsd: 0,
        fundingPaidUsd: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        notionalUsd,
        liquidationDistancePct: null,
      } satisfies PacificaPosition,
      marginDeltaUsd: round(notionalUsd / safeLeverage, 2),
      assumptions: [
        `Opened a new ${desiredSide} ${market.symbol} line at ${safeLeverage}x assumed leverage.`,
      ],
    };
  }

  const currentSide = normalizePositionSide(position.side);
  if (currentSide === desiredSide) {
    const nextNotionalUsd = round(position.notionalUsd + sizeUsd, 2);
    const nextMarginUsedUsd = round(position.marginUsedUsd + sizeUsd / safeLeverage, 2);
    const nextEntryPrice = round(
      (position.entryPrice * position.notionalUsd + market.mark * sizeUsd) /
        Math.max(nextNotionalUsd, 1),
      market.mark >= 100 ? 2 : 5,
    );

    return {
      nextPosition: {
        ...position,
        side: desiredSide,
        amount: round(nextNotionalUsd / Math.max(market.mark, 1), 6),
        entryPrice: nextEntryPrice,
        markPrice: market.mark,
        leverage: round(nextNotionalUsd / Math.max(nextMarginUsedUsd, 1), 2),
        marginUsedUsd: nextMarginUsedUsd,
        updatedAt: Date.now(),
        notionalUsd: nextNotionalUsd,
      },
      marginDeltaUsd: round(sizeUsd / safeLeverage, 2),
      assumptions: [
        `Added ${round(sizeUsd, 0)} USD of ${desiredSide} ${market.symbol} exposure at ${safeLeverage}x assumed leverage.`,
      ],
    };
  }

  if (sizeUsd < position.notionalUsd) {
    const reductionRatio = sizeUsd / Math.max(position.notionalUsd, 1);
    const nextNotionalUsd = round(position.notionalUsd - sizeUsd, 2);
    const marginReleasedUsd = round(position.marginUsedUsd * reductionRatio, 2);

    return {
      nextPosition: {
        ...position,
        amount: round(nextNotionalUsd / Math.max(market.mark, 1), 6),
        markPrice: market.mark,
        marginUsedUsd: round(position.marginUsedUsd - marginReleasedUsd, 2),
        leverage:
          nextNotionalUsd > 0
            ? round(
                nextNotionalUsd /
                  Math.max(position.marginUsedUsd - marginReleasedUsd, 0.5),
                2,
              )
            : null,
        updatedAt: Date.now(),
        notionalUsd: nextNotionalUsd,
      },
      marginDeltaUsd: -marginReleasedUsd,
      assumptions: [
        `The new ${desiredSide} order offsets part of the existing ${currentSide} ${market.symbol} line.`,
      ],
    };
  }

  if (sizeUsd === position.notionalUsd) {
    return {
      nextPosition: null,
      marginDeltaUsd: -position.marginUsedUsd,
      assumptions: [`The scenario fully closes the existing ${market.symbol} line.`],
    };
  }

  const remainderUsd = round(sizeUsd - position.notionalUsd, 2);
  return {
    nextPosition: {
      symbol: market.symbol,
      side: desiredSide,
      amount: round(remainderUsd / Math.max(market.mark, 1), 6),
      entryPrice: market.mark,
      markPrice: market.mark,
      liquidationPrice: null,
      leverage: safeLeverage,
      marginUsedUsd: round(remainderUsd / safeLeverage, 2),
      unrealizedPnlUsd: 0,
      realizedPnlUsd: position.realizedPnlUsd,
      fundingPaidUsd: position.fundingPaidUsd,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notionalUsd: remainderUsd,
      liquidationDistancePct: null,
    } satisfies PacificaPosition,
    marginDeltaUsd: round(remainderUsd / safeLeverage - position.marginUsedUsd, 2),
    assumptions: [
      `The scenario flips ${market.symbol} from ${currentSide} to ${desiredSide} after closing the current line.`,
    ],
  };
}

function reducePosition(
  position: PacificaPosition | undefined,
  market: PacificaMarketSnapshot,
  sizeUsd: number,
) {
  if (!position) {
    return {
      nextPosition: null,
      marginDeltaUsd: 0,
      assumptions: [`No live ${market.symbol} position was available to reduce.`],
    };
  }

  const cappedSizeUsd = Math.min(sizeUsd, position.notionalUsd);
  if (cappedSizeUsd >= position.notionalUsd) {
    return {
      nextPosition: null,
      marginDeltaUsd: -position.marginUsedUsd,
      assumptions: [`The scenario exits the ${market.symbol} position completely.`],
    };
  }

  const ratio = cappedSizeUsd / Math.max(position.notionalUsd, 1);
  const marginReleasedUsd = round(position.marginUsedUsd * ratio, 2);
  const nextNotionalUsd = round(position.notionalUsd - cappedSizeUsd, 2);
  const nextMarginUsedUsd = round(position.marginUsedUsd - marginReleasedUsd, 2);

  return {
    nextPosition: {
      ...position,
      amount: round(nextNotionalUsd / Math.max(market.mark, 1), 6),
      markPrice: market.mark,
      leverage:
        nextNotionalUsd > 0
          ? round(nextNotionalUsd / Math.max(nextMarginUsedUsd, 0.5), 2)
          : null,
      marginUsedUsd: nextMarginUsedUsd,
      updatedAt: Date.now(),
      notionalUsd: nextNotionalUsd,
    },
    marginDeltaUsd: -marginReleasedUsd,
    assumptions: [
      `Reduced ${market.symbol} by ${round(cappedSizeUsd, 0)} USD while keeping the existing direction.`,
    ],
  };
}

function estimatePositionBuffers(
  baseAccount: PacificaAccountSummary,
  nextAccount: PacificaAccountSummary,
  fundingCurves: PacificaFundingCurve[],
) {
  const baseMetrics = computeHealthMetrics(baseAccount, fundingCurves);
  const nextMetrics = computeHealthMetrics(nextAccount, fundingCurves);
  const baseCoverage = baseAccount.equityUsd / Math.max(baseMetrics.grossExposureUsd, 1);
  const nextCoverage = nextAccount.equityUsd / Math.max(nextMetrics.grossExposureUsd, 1);
  const coverageMultiplier = clamp(nextCoverage / Math.max(baseCoverage, 0.02), 0.45, 1.95);

  return nextAccount.positions.map((position) => {
    const basePosition = baseAccount.positions.find((item) => item.symbol === position.symbol);
    const baseDistance = basePosition?.liquidationDistancePct || deriveFallbackDistance(position);
    const sizeMultiplier = basePosition
      ? clamp(basePosition.notionalUsd / Math.max(position.notionalUsd, 1), 0.42, 1.95)
      : clamp(6 / Math.max(position.leverage || 5, 1), 0.65, 1.28);
    const leverageBase = Math.max(basePosition?.leverage || position.leverage || 5, 1);
    const leverageMultiplier = clamp(
      leverageBase / Math.max(position.leverage || leverageBase, 1),
      0.65,
      1.65,
    );
    const estimatedDistancePct = round(
      clamp(baseDistance * coverageMultiplier * sizeMultiplier * leverageMultiplier, 2.5, 38),
      2,
    );

    return {
      ...position,
      liquidationDistancePct: estimatedDistancePct,
      liquidationPrice: computeLiqPrice(position.markPrice, position.side, estimatedDistancePct),
    };
  });
}

export function buildScenarioResult(
  payload: PacificaRiskRoomResponse,
  input: PacificaScenarioInput,
): PacificaScenarioResult {
  const baseAccount = payload.account;
  const positions = clonePositions(baseAccount.positions);
  const assumptions: string[] = [];
  const sourceMarket = getMarket(input.symbol, payload.marketSnapshot);
  const targetMarket = getMarket(input.rotateToSymbol || input.symbol, payload.marketSnapshot);
  const scenarioSizeUsd = Math.max(0, round(input.sizeUsd, 2));
  const leverage = clamp(input.leverage || 5, 2, Math.max(2, sourceMarket?.maxLeverage || 5));
  let marginDeltaUsd = 0;

  if (sourceMarket) {
    const sourceIndex = positions.findIndex((item) => item.symbol === sourceMarket.symbol);
    const currentPosition = sourceIndex >= 0 ? positions[sourceIndex] : undefined;

    if (input.action === "add_long" || input.action === "add_short") {
      const trade = applyTradeToPosition(
        currentPosition,
        sourceMarket,
        input.action === "add_long" ? "long" : "short",
        scenarioSizeUsd,
        leverage,
      );

      marginDeltaUsd += trade.marginDeltaUsd;
      assumptions.push(...trade.assumptions);

      if (trade.nextPosition) {
        if (sourceIndex >= 0) {
          positions[sourceIndex] = trade.nextPosition;
        } else {
          positions.push(trade.nextPosition);
        }
      } else if (sourceIndex >= 0) {
        positions.splice(sourceIndex, 1);
      }
    } else if (input.action === "reduce") {
      const trade = reducePosition(currentPosition, sourceMarket, scenarioSizeUsd);
      marginDeltaUsd += trade.marginDeltaUsd;
      assumptions.push(...trade.assumptions);

      if (trade.nextPosition) {
        if (sourceIndex >= 0) {
          positions[sourceIndex] = trade.nextPosition;
        }
      } else if (sourceIndex >= 0) {
        positions.splice(sourceIndex, 1);
      }
    } else if (input.action === "rotate" && targetMarket) {
      const reduceTrade = reducePosition(currentPosition, sourceMarket, scenarioSizeUsd);
      marginDeltaUsd += reduceTrade.marginDeltaUsd;
      assumptions.push(...reduceTrade.assumptions);

      if (reduceTrade.nextPosition) {
        if (sourceIndex >= 0) {
          positions[sourceIndex] = reduceTrade.nextPosition;
        }
      } else if (sourceIndex >= 0) {
        positions.splice(sourceIndex, 1);
      }

      const sourceSide =
        normalizePositionSide(currentPosition?.side || "long") === "short"
          ? "short"
          : "long";
      const targetIndex = positions.findIndex((item) => item.symbol === targetMarket.symbol);
      const targetPosition = targetIndex >= 0 ? positions[targetIndex] : undefined;
      const addTrade = applyTradeToPosition(
        targetPosition,
        targetMarket,
        sourceSide,
        scenarioSizeUsd,
        clamp(input.leverage || 5, 2, Math.max(2, targetMarket.maxLeverage)),
      );

      marginDeltaUsd += addTrade.marginDeltaUsd;
      assumptions.push(
        `Rotated ${round(scenarioSizeUsd, 0)} USD from ${sourceMarket.symbol} into ${targetMarket.symbol}.`,
        ...addTrade.assumptions,
      );

      if (addTrade.nextPosition) {
        if (targetIndex >= 0) {
          positions[targetIndex] = addTrade.nextPosition;
        } else {
          positions.push(addTrade.nextPosition);
        }
      } else if (targetIndex >= 0) {
        positions.splice(targetIndex, 1);
      }
    }
  }

  if (input.action === "hold" && input.collateralDeltaUsd === 0) {
    assumptions.push("Scenario keeps position exposure unchanged.");
  }

  if (input.collateralDeltaUsd !== 0) {
    assumptions.push(
      input.collateralDeltaUsd > 0
        ? `Added ${round(input.collateralDeltaUsd, 0)} USD of collateral.`
        : `Removed ${round(Math.abs(input.collateralDeltaUsd), 0)} USD of collateral.`,
    );
  }

  const baseMetrics = computeHealthMetrics(baseAccount, payload.fundingCurves);
  const nextEquityUsd = round(Math.max(1, baseAccount.equityUsd + input.collateralDeltaUsd), 2);
  const nextMarginUsedUsd = round(
    clamp(baseAccount.marginUsedUsd + marginDeltaUsd, 0, nextEquityUsd * 0.98),
    2,
  );
  const nextAvailableToSpendUsd = round(
    Math.max(0, nextEquityUsd - nextMarginUsedUsd),
    2,
  );

  const nextAccount: PacificaAccountSummary = {
    ...baseAccount,
    equityUsd: nextEquityUsd,
    availableToSpendUsd: nextAvailableToSpendUsd,
    marginUsedUsd: nextMarginUsedUsd,
    positions: sortPositions(positions),
  };

  nextAccount.positions = estimatePositionBuffers(
    baseAccount,
    nextAccount,
    payload.fundingCurves,
  );

  const nextRiskSummary = buildRiskSummary(
    payload.marketSnapshot,
    payload.fundingCurves,
    nextAccount,
    payload.liquidationRadar as PacificaLiquidationEvent[],
  );
  const nextMetrics = computeHealthMetrics(nextAccount, payload.fundingCurves);

  if (nextMetrics.grossExposureUsd === baseMetrics.grossExposureUsd) {
    assumptions.push("Projected funding and liquidation changes are estimated from current market structure.");
  }

  return {
    account: nextAccount,
    riskSummary: nextRiskSummary,
    metrics: nextMetrics,
    scoreDelta: round(nextRiskSummary.score - payload.riskSummary.score, 0),
    assumptions: [...new Set(assumptions)],
  };
}

function pickRotationMarket(
  payload: PacificaRiskRoomResponse,
  primaryPosition: PacificaPosition,
) {
  const side = normalizePositionSide(primaryPosition.side);
  const primarySymbol = primaryPosition.symbol;

  const candidates = payload.marketSnapshot.filter((market) => market.symbol !== primarySymbol);
  if (!candidates.length) {
    return payload.marketSnapshot[0] || null;
  }

  return (
    candidates
      .slice()
      .sort((left, right) => {
        const leftScore =
          side === "long"
            ? left.nextFundingRate * 200000 + left.crowdedScore * 0.3
            : -left.nextFundingRate * 200000 + left.crowdedScore * 0.3;
        const rightScore =
          side === "long"
            ? right.nextFundingRate * 200000 + right.crowdedScore * 0.3
            : -right.nextFundingRate * 200000 + right.crowdedScore * 0.3;
        return leftScore - rightScore;
      })[0] || null
  );
}

export function buildPlannerOptions(
  payload: PacificaRiskRoomResponse,
): PacificaPlannerOption[] {
  const account = payload.account;
  const primaryPosition = account.positions[0] || null;
  const metrics = computeHealthMetrics(account, payload.fundingCurves);
  const targetExposureMultiple = payload.riskSummary.status === "critical" ? 8 : 10;

  if (!primaryPosition) {
    const market = payload.marketSnapshot[0];
    if (!market) {
      return [];
    }

    const probeScenario: PacificaScenarioInput = {
      symbol: market.symbol,
      action: "add_long",
      sizeUsd: 250,
      leverage: 4,
      collateralDeltaUsd: 0,
      rotateToSymbol: market.symbol,
    };

    return [
      {
        id: "first-probe",
        title: "Open a bounded first probe",
        summary: "No live position exists, so the product recommends a capped starter line instead of a full-size trade.",
        rationale: "Start with a small, liquid market so Pacifica builds account history before scaling.",
        steps: [
          `Use ${market.symbol} for the first probe because it is already in the watchlist and has reliable liquidity.`,
          "Keep leverage below 4x on the first entry.",
          "Do not add to the line until the account has more equity history.",
        ],
        scenario: probeScenario,
        projected: buildScenarioResult(payload, probeScenario),
      },
    ];
  }

  const reduceSizeUsd = round(
    Math.max(
      primaryPosition.notionalUsd * 0.2,
      metrics.grossExposureUsd - account.equityUsd * targetExposureMultiple,
      primaryPosition.notionalUsd * 0.12,
    ),
    0,
  );
  const collateralNeededUsd = round(
    Math.max(
      metrics.grossExposureUsd / targetExposureMultiple - account.equityUsd,
      (metrics.tightestLiqDistancePct !== null && metrics.tightestLiqDistancePct < 10
        ? account.equityUsd * 0.15
        : 0),
    ),
    0,
  );
  const rotationMarket = pickRotationMarket(payload, primaryPosition);
  const rotateSizeUsd = round(
    Math.max(primaryPosition.notionalUsd * 0.25, reduceSizeUsd * 0.7),
    0,
  );

  const reduceScenario: PacificaScenarioInput = {
    symbol: primaryPosition.symbol,
    action: "reduce",
    sizeUsd: clamp(reduceSizeUsd, 50, primaryPosition.notionalUsd),
    leverage: primaryPosition.leverage || 5,
    collateralDeltaUsd: 0,
    rotateToSymbol: primaryPosition.symbol,
  };

  const collateralScenario: PacificaScenarioInput = {
    symbol: primaryPosition.symbol,
    action: "hold",
    sizeUsd: 0,
    leverage: primaryPosition.leverage || 5,
    collateralDeltaUsd: clamp(collateralNeededUsd, 0, Math.max(account.equityUsd, 1) * 1.25),
    rotateToSymbol: primaryPosition.symbol,
  };

  const rotateScenario: PacificaScenarioInput = {
    symbol: primaryPosition.symbol,
    action: "rotate",
    sizeUsd: clamp(rotateSizeUsd, 50, primaryPosition.notionalUsd),
    leverage: 4,
    collateralDeltaUsd: 0,
    rotateToSymbol: rotationMarket?.symbol || primaryPosition.symbol,
  };

  return [
    {
      id: "de-risk-fast",
      title: "Cut back to the safe band",
      summary: "This is the fastest way to move the account back under the target exposure multiple.",
      rationale: `${primaryPosition.symbol} is the main risk driver, so trimming that line has the highest immediate score impact.`,
      steps: [
        `Reduce about ${round(reduceScenario.sizeUsd, 0)} USD from ${primaryPosition.symbol}.`,
        `Keep exposure below ${targetExposureMultiple}x equity before adding fresh leverage.`,
        "Leave a reduce-only exit live until the score returns to watch or stable.",
      ],
      scenario: reduceScenario,
      projected: buildScenarioResult(payload, reduceScenario),
    },
    {
      id: "collateral-top-up",
      title: "Buy time with collateral",
      summary: "Improves liquidation buffer without changing market exposure.",
      rationale: "If the conviction on the current position is unchanged, adding collateral is the cleanest way to widen the buffer.",
      steps: [
        `Add about ${round(collateralScenario.collateralDeltaUsd, 0)} USD of collateral.`,
        "Re-check the account before adding any new directional trade.",
        "If the score is still critical after the top-up, combine this with a small reduction.",
      ],
      scenario: collateralScenario,
      projected: buildScenarioResult(payload, collateralScenario),
    },
    {
      id: "rotate-carry",
      title: "Rotate into a cleaner market",
      summary: "Shifts part of the stressed line into a less crowded carry regime.",
      rationale:
        rotationMarket && rotationMarket.symbol !== primaryPosition.symbol
          ? `${rotationMarket.symbol} currently offers a cleaner funding and crowding profile than ${primaryPosition.symbol}.`
          : "When one line dominates the account, partial rotation can lower concentration without fully flattening risk.",
      steps: [
        `Rotate about ${round(rotateScenario.sizeUsd, 0)} USD out of ${primaryPosition.symbol}.`,
        `Re-deploy the same size into ${rotateScenario.rotateToSymbol} with capped leverage.`,
        "Use passive orders first so the carry improvement is not lost to bad entry quality.",
      ],
      scenario: rotateScenario,
      projected: buildScenarioResult(payload, rotateScenario),
    },
  ];
}

export function evaluateWatchItem(
  item: PacificaWatchItem,
  payload: PacificaRiskRoomResponse,
): PacificaWatchEvaluation {
  const metrics = computeHealthMetrics(payload.account, payload.fundingCurves);
  const alerts: string[] = [];

  if (payload.riskSummary.score < item.minScore) {
    alerts.push(`Risk score ${payload.riskSummary.score} is below the ${item.minScore} floor.`);
  }

  if (metrics.exposureMultiple > item.maxExposureMultiple) {
    alerts.push(
      `Exposure is ${round(metrics.exposureMultiple, 1)}x equity, above the ${item.maxExposureMultiple}x limit.`,
    );
  }

  if (
    metrics.tightestLiqDistancePct !== null &&
    metrics.tightestLiqDistancePct < item.minLiqBufferPct
  ) {
    alerts.push(
      `Liquidation buffer is ${round(metrics.tightestLiqDistancePct, 1)}%, below the ${item.minLiqBufferPct}% floor.`,
    );
  }

  if (metrics.fundingDragUsd > item.maxFundingDragUsd) {
    alerts.push(
      `Next funding drag is ${round(metrics.fundingDragUsd, 2)} USD, above the ${item.maxFundingDragUsd} USD threshold.`,
    );
  }

  let severity: PacificaRiskStatus = "stable";
  if (alerts.length >= 3 || payload.riskSummary.status === "critical") {
    severity = "critical";
  } else if (alerts.length > 0 || payload.riskSummary.status === "watch") {
    severity = "watch";
  }

  return {
    severity,
    alerts,
    metrics,
    score: payload.riskSummary.score,
  };
}
