const CACHE_TTL_MS = 5 * 60 * 1000;
const GAMES_IN_SEASON = 162;

const TEAMS = [
  {
    team: "Los Angeles Dodgers",
    symbol: "LAD",
    league: "NL",
    division: "West",
    wins: 6,
    losses: 1,
    preseasonWinTotal: 101.5,
    playoffOdds: -900,
    nextGameMoneyline: -185,
    thesis: "Elite roster depth keeps the market above even a hot early-season record."
  },
  {
    team: "New York Yankees",
    symbol: "NYY",
    league: "AL",
    division: "East",
    wins: 5,
    losses: 2,
    preseasonWinTotal: 90.5,
    playoffOdds: -325,
    nextGameMoneyline: -145,
    thesis: "The market respects the underlying roster more than the tiny current sample."
  },
  {
    team: "Atlanta Braves",
    symbol: "ATL",
    league: "NL",
    division: "East",
    wins: 3,
    losses: 4,
    preseasonWinTotal: 93.5,
    playoffOdds: -275,
    nextGameMoneyline: -155,
    thesis: "A slow week does not erase the projection, so sportsbooks stay aggressive."
  },
  {
    team: "Seattle Mariners",
    symbol: "SEA",
    league: "AL",
    division: "West",
    wins: 4,
    losses: 3,
    preseasonWinTotal: 85.5,
    playoffOdds: -105,
    nextGameMoneyline: -118,
    thesis: "This is close to a fair middle case where record and market expectation nearly agree."
  },
  {
    team: "Miami Marlins",
    symbol: "MIA",
    league: "NL",
    division: "East",
    wins: 4,
    losses: 2,
    preseasonWinTotal: 72.5,
    playoffOdds: 500,
    nextGameMoneyline: 120,
    thesis: "A strong first week lifts attention, but the market still prices them as a longshot."
  },
  {
    team: "Chicago White Sox",
    symbol: "CWS",
    league: "AL",
    division: "Central",
    wins: 2,
    losses: 5,
    preseasonWinTotal: 62.5,
    playoffOdds: 1600,
    nextGameMoneyline: 150,
    thesis: "Weak season expectations keep both futures and daily prices skeptical."
  }
];

let cache = {
  payload: null,
  expiresAt: 0
};

function sendJson(res, statusCode, body) {
  res.status(statusCode).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function americanToImpliedProbability(odds) {
  if (!Number.isFinite(odds) || odds === 0) {
    return null;
  }

  if (odds > 0) {
    return 100 / (odds + 100);
  }

  return Math.abs(odds) / (Math.abs(odds) + 100);
}

function toPercent(value) {
  return value === null ? null : value * 100;
}

function average(values) {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildTeam(team) {
  const gamesPlayed = team.wins + team.losses;
  const actualWinPct = gamesPlayed ? team.wins / gamesPlayed : null;
  const projectedWinPct = team.preseasonWinTotal / GAMES_IN_SEASON;
  const playoffImpliedProbability = americanToImpliedProbability(team.playoffOdds);
  const nextGameImpliedProbability = americanToImpliedProbability(team.nextGameMoneyline);
  const performanceGap = actualWinPct === null ? null : actualWinPct - projectedWinPct;
  const marketGap = playoffImpliedProbability - projectedWinPct;

  let marketRead = "Balanced";
  if ((performanceGap ?? 0) > 0.08 && marketGap < 0) {
    marketRead = "Hot start, market skeptical";
  } else if ((performanceGap ?? 0) < -0.05 && marketGap > 0.04) {
    marketRead = "Cold start, market forgiving";
  } else if ((nextGameImpliedProbability ?? 0) > 0.58) {
    marketRead = "Priced like a nightly favorite";
  } else if ((nextGameImpliedProbability ?? 0) < 0.45) {
    marketRead = "Priced like a nightly underdog";
  }

  return {
    ...team,
    record: `${team.wins}-${team.losses}`,
    actualWinPct,
    projectedWinPct,
    playoffImpliedProbability,
    nextGameImpliedProbability,
    performanceGap,
    marketGap,
    marketRead
  };
}

function summarize(teams) {
  const actualValues = teams.map((team) => team.actualWinPct).filter((value) => value !== null);
  const projectedValues = teams.map((team) => team.projectedWinPct);
  const playoffValues = teams.map((team) => team.playoffImpliedProbability);
  const nextGameValues = teams.map((team) => team.nextGameImpliedProbability);

  const overperformers = teams.filter((team) => (team.performanceGap ?? 0) > 0.08).length;
  const skepticalStarts = teams.filter(
    (team) => (team.performanceGap ?? 0) > 0.08 && (team.marketGap ?? 0) < 0
  ).length;

  let headline = "Sportsbooks treat MLB win percentage as context, not as the final price.";
  let takeaway = "Preseason strength and game-specific matchup details still dominate most odds.";

  if (skepticalStarts > 0) {
    takeaway =
      "Several fast starters still trade below their current win rate because betting apps fade tiny samples.";
  } else if (overperformers === 0) {
    takeaway =
      "This board is mostly aligned, showing how quickly market expectations can stabilize around consensus teams.";
  }

  return {
    headline,
    takeaway,
    averages: {
      actualWinPct: average(actualValues),
      projectedWinPct: average(projectedValues),
      playoffImpliedProbability: average(playoffValues),
      nextGameImpliedProbability: average(nextGameValues)
    },
    counts: {
      overperformers,
      skepticalStarts,
      favorites: teams.filter((team) => (team.nextGameImpliedProbability ?? 0) >= 0.55).length
    }
  };
}

function buildPayload() {
  const teams = TEAMS.map(buildTeam);
  const summary = summarize(teams);

  return {
    fetchedAt: new Date().toISOString(),
    source: {
      name: "Illustrative MLB betting model",
      note: "Sample April 2026 team records paired with preseason win totals and representative American odds."
    },
    formulaGuide: [
      "Actual win% = wins / games played",
      "Projected win% = preseason win total / 162",
      "Implied probability from negative odds = abs(odds) / (abs(odds) + 100)",
      "Implied probability from positive odds = 100 / (odds + 100)"
    ],
    summary,
    groups: {
      contenders: teams.filter((team) => team.playoffImpliedProbability >= 0.65),
      skepticalStarts: teams.filter(
        (team) => (team.performanceGap ?? 0) > 0.08 && (team.marketGap ?? 0) < 0
      ),
      forgivingMarket: teams.filter(
        (team) => (team.performanceGap ?? 0) < -0.05 && (team.marketGap ?? 0) > 0.04
      ),
      longshots: teams.filter((team) => team.playoffImpliedProbability < 0.3)
    },
    scoreboard: teams
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    if (cache.payload && Date.now() < cache.expiresAt) {
      return sendJson(res, 200, cache.payload);
    }

    const payload = buildPayload();
    cache = {
      payload,
      expiresAt: Date.now() + CACHE_TTL_MS
    };

    return sendJson(res, 200, payload);
  } catch (error) {
    return sendJson(res, 500, {
      error: error.message || "Unable to load MLB betting data."
    });
  }
};
