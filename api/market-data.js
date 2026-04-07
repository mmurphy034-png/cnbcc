const MLB_STANDINGS_URL = "https://statsapi.mlb.com/api/v1/standings";
const MLB_SCHEDULE_URL = "https://statsapi.mlb.com/api/v1/schedule";
const MLB_BOXSCORE_URL = "https://statsapi.mlb.com/api/v1/game";
const MLB_PEOPLE_URL = "https://statsapi.mlb.com/api/v1/people";
const ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4/sports/baseball_mlb/odds";
const CACHE_TTL_MS = 5 * 60 * 1000;

const TEAM_NAME_TO_CODE = {
  "Arizona Diamondbacks": "AZ",
  "Atlanta Braves": "ATL",
  "Baltimore Orioles": "BAL",
  "Boston Red Sox": "BOS",
  "Chicago Cubs": "CHC",
  "Chicago White Sox": "CWS",
  "Cincinnati Reds": "CIN",
  "Cleveland Guardians": "CLE",
  "Colorado Rockies": "COL",
  "Detroit Tigers": "DET",
  "Houston Astros": "HOU",
  "Kansas City Royals": "KC",
  "Los Angeles Angels": "LAA",
  "Los Angeles Dodgers": "LAD",
  "Miami Marlins": "MIA",
  "Milwaukee Brewers": "MIL",
  "Minnesota Twins": "MIN",
  "New York Mets": "NYM",
  "New York Yankees": "NYY",
  "Athletics": "ATH",
  "Oakland Athletics": "ATH",
  "Philadelphia Phillies": "PHI",
  "Pittsburgh Pirates": "PIT",
  "San Diego Padres": "SD",
  "San Francisco Giants": "SF",
  "Seattle Mariners": "SEA",
  "St. Louis Cardinals": "STL",
  "Tampa Bay Rays": "TB",
  "Texas Rangers": "TEX",
  "Toronto Blue Jays": "TOR",
  "Washington Nationals": "WSH"
};

let cache = {
  payload: null,
  expiresAt: 0
};

function sendJson(res, statusCode, body) {
  res.status(statusCode).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}: ${url}`);
  }

  return response.json();
}

function average(values) {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
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

function buildStandingsUrl() {
  const url = new URL(MLB_STANDINGS_URL);
  url.searchParams.set("leagueId", "103,104");
  url.searchParams.set("sportId", "1");
  url.searchParams.set("standingsTypes", "regularSeason");
  return url.toString();
}

function buildScheduleUrl(date) {
  const url = new URL(MLB_SCHEDULE_URL);
  url.searchParams.set("sportId", "1");
  url.searchParams.set("date", date);
  url.searchParams.set("hydrate", "probablePitcher");
  return url.toString();
}

function buildPeopleStatsUrl(personId, season) {
  const url = new URL(`${MLB_PEOPLE_URL}/${personId}/stats`);
  url.searchParams.set("stats", "season");
  url.searchParams.set("group", "pitching");
  url.searchParams.set("season", String(season));
  return url.toString();
}

function buildBoxscoreUrl(gamePk) {
  return `${MLB_BOXSCORE_URL}/${gamePk}/boxscore`;
}

function buildOddsUrl() {
  const apiKey = process.env.ODDS_API_KEY;

  if (!apiKey) {
    const error = new Error("ODDS_API_KEY is not configured.");
    error.statusCode = 500;
    throw error;
  }

  const url = new URL(ODDS_API_BASE_URL);
  url.searchParams.set("regions", "us");
  url.searchParams.set("markets", "h2h");
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("apiKey", apiKey);
  return url.toString();
}

function formatDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function inningsStringToNumber(value) {
  if (!value) {
    return 0;
  }

  const [whole, partial] = String(value).split(".");
  const wholeValue = Number(whole || 0);
  const partialValue = Number(partial || 0);

  if (!Number.isFinite(wholeValue) || !Number.isFinite(partialValue)) {
    return 0;
  }

  return wholeValue + partialValue / 3;
}

async function fetchStandings() {
  const payload = await fetchJson(buildStandingsUrl());
  const records = payload.records || [];

  return records.flatMap((divisionRecord) =>
    (divisionRecord.teamRecords || []).map((teamRecord) => {
      const teamName = teamRecord.team?.name;
      const code = TEAM_NAME_TO_CODE[teamName];

      if (!code) {
        return null;
      }

      const wins = Number(teamRecord.wins || 0);
      const losses = Number(teamRecord.losses || 0);
      const gamesPlayed = wins + losses;

      return {
        team: teamName,
        code,
        wins,
        losses,
        winPct: gamesPlayed ? wins / gamesPlayed : null,
        division: divisionRecord.division?.nameShort || "",
        league: divisionRecord.league?.name || ""
      };
    })
  ).filter(Boolean);
}

function normalizeTeamName(name) {
  return TEAM_NAME_TO_CODE[name] || null;
}

async function fetchOddsByTeam() {
  const events = await fetchJson(buildOddsUrl());
  const byTeam = {};

  for (const event of events) {
    const bookmakers = event.bookmakers || [];
    const marketRows = [];

    for (const bookmaker of bookmakers) {
      const market = (bookmaker.markets || []).find((entry) => entry.key === "h2h");
      if (!market) {
        continue;
      }

      for (const outcome of market.outcomes || []) {
        marketRows.push({
          teamName: outcome.name,
          price: Number(outcome.price),
          bookmaker: bookmaker.title
        });
      }
    }

    const grouped = {};
    for (const row of marketRows) {
      const code = normalizeTeamName(row.teamName);
      if (!code || !Number.isFinite(row.price)) {
        continue;
      }

      if (!grouped[code]) {
        grouped[code] = [];
      }

      grouped[code].push(row.price);
    }

    Object.entries(grouped).forEach(([code, prices]) => {
      const impliedValues = prices
        .map((price) => americanToImpliedProbability(price))
        .filter((value) => value !== null);

      byTeam[code] = {
        medianMoneyline: median(prices),
        averageImpliedWinProbability: average(impliedValues),
        bookmakersCount: prices.length,
        commenceTime: event.commence_time || null,
        matchup: `${event.away_team} at ${event.home_team}`
      };
    });
  }

  return byTeam;
}

function signalForTeam(team) {
  const gap = team.marketVsRecordGap;

  if (gap === null) {
    return "No signal";
  }

  if (gap > 0.06) {
    return "Market higher than record";
  }

  if (gap < -0.06) {
    return "Market lower than record";
  }

  return "In line";
}

function summarize(teams) {
  const winPcts = teams.map((team) => team.winPct).filter((value) => value !== null);
  const marketPcts = teams
    .map((team) => team.averageImpliedWinProbability)
    .filter((value) => value !== null);
  const gapValues = teams.map((team) => team.marketVsRecordGap).filter((value) => value !== null);

  const bullish = teams.filter((team) => team.marketVsRecordGap !== null && team.marketVsRecordGap > 0.06);
  const skeptical = teams.filter((team) => team.marketVsRecordGap !== null && team.marketVsRecordGap < -0.06);

  let headline = "MLB win rates and betting-app pricing are broadly aligned.";
  if (bullish.length > skeptical.length) {
    headline = "Betting apps are leaning more optimistic than raw records for several clubs.";
  } else if (skeptical.length > bullish.length) {
    headline = "Betting apps are discounting several teams relative to their current records.";
  }

  return {
    headline,
    takeaway:
      "This compares live team win percentage with the implied probability from current moneylines, so it captures near-term market pricing rather than full-season futures.",
    averages: {
      actualWinPct: average(winPcts),
      marketImpliedWinPct: average(marketPcts),
      gap: average(gapValues)
    }
  };
}

async function fetchPitcherSeason(personId, season) {
  if (!personId) {
    return null;
  }

  const payload = await fetchJson(buildPeopleStatsUrl(personId, season));
  const split = payload.stats?.[0]?.splits?.[0] || null;
  const stat = split?.stat || {};

  return {
    id: personId,
    era: Number(stat.era || 0) || null,
    whip: Number(stat.whip || 0) || null,
    strikeouts: Number(stat.strikeOuts || 0) || null,
    inningsPitched: inningsStringToNumber(stat.inningsPitched || 0)
  };
}

function bullpenState(innings, appearances) {
  if (innings >= 5 || appearances >= 5) {
    return "Taxed";
  }

  if (innings >= 3 || appearances >= 4) {
    return "Warm";
  }

  return "Fresh";
}

function bullpenScore(entry) {
  if (!entry) {
    return null;
  }

  const stateScore = entry.state === "Fresh" ? 2 : entry.state === "Warm" ? 1 : 0;
  return stateScore - entry.innings * 0.08 - entry.appearances * 0.04;
}

async function fetchYesterdayBullpenUsage() {
  const payload = await fetchJson(buildScheduleUrl(formatDate(-1)));
  const games = payload.dates?.flatMap((date) => date.games || []) || [];
  const completedGames = games.filter((game) => game.status?.codedGameState === "F");
  const byTeam = {};

  await Promise.all(
    completedGames.map(async (game) => {
      const boxscore = await fetchJson(buildBoxscoreUrl(game.gamePk));

      ["home", "away"].forEach((side) => {
        const teamBox = boxscore.teams?.[side];
        const teamName = teamBox?.team?.name;
        const code = TEAM_NAME_TO_CODE[teamName];

        if (!code) {
          return;
        }

        const pitcherIds = teamBox?.pitchers || [];
        const players = teamBox?.players || {};
        const relieverIds = pitcherIds.slice(1);

        const appearances = relieverIds.length;
        const innings = relieverIds.reduce((sum, pitcherId) => {
          const player = players[`ID${pitcherId}`];
          const stat = player?.stats?.pitching || {};
          return sum + inningsStringToNumber(stat.inningsPitched);
        }, 0);

        byTeam[code] = {
          innings,
          appearances,
          state: bullpenState(innings, appearances)
        };
      });
    })
  );

  return byTeam;
}

function starterScore(pitcher) {
  if (!pitcher) {
    return null;
  }

  const era = pitcher.era ?? 4.5;
  const whip = pitcher.whip ?? 1.35;
  return -(era * 0.7 + whip * 2.2);
}

function determineSideEdge(awayScore, homeScore, awayLabel, homeLabel, evenLabel = "Even") {
  if (awayScore === null || homeScore === null) {
    return "Unknown";
  }

  if (awayScore - homeScore > 0.22) {
    return awayLabel;
  }

  if (homeScore - awayScore > 0.22) {
    return homeLabel;
  }

  return evenLabel;
}

function matchupLean(starterEdge, bullpenEdge) {
  const awayVotes = [starterEdge, bullpenEdge].filter((value) => value === "Away").length;
  const homeVotes = [starterEdge, bullpenEdge].filter((value) => value === "Home").length;

  if (awayVotes === 2) {
    return "Away edge";
  }

  if (homeVotes === 2) {
    return "Home edge";
  }

  if (awayVotes === 1 && homeVotes === 0) {
    return "Slight away edge";
  }

  if (homeVotes === 1 && awayVotes === 0) {
    return "Slight home edge";
  }

  return "Balanced";
}

async function fetchTodayMatchups() {
  const schedule = await fetchJson(buildScheduleUrl(formatDate(0)));
  const games = schedule.dates?.flatMap((date) => date.games || []) || [];
  const season = new Date().getFullYear();
  const bullpenByTeam = await fetchYesterdayBullpenUsage();

  const pitcherIds = [
    ...new Set(
      games.flatMap((game) => [
        game.teams?.away?.probablePitcher?.id,
        game.teams?.home?.probablePitcher?.id
      ]).filter(Boolean)
    )
  ];

  const pitcherEntries = await Promise.all(
    pitcherIds.map(async (personId) => [personId, await fetchPitcherSeason(personId, season)])
  );
  const pitchersById = Object.fromEntries(pitcherEntries);

  return games.map((game) => {
    const awayName = game.teams?.away?.team?.name;
    const homeName = game.teams?.home?.team?.name;
    const awayCode = TEAM_NAME_TO_CODE[awayName];
    const homeCode = TEAM_NAME_TO_CODE[homeName];
    const awayPitcherMeta = game.teams?.away?.probablePitcher || null;
    const homePitcherMeta = game.teams?.home?.probablePitcher || null;
    const awayPitcher = awayPitcherMeta ? pitchersById[awayPitcherMeta.id] : null;
    const homePitcher = homePitcherMeta ? pitchersById[homePitcherMeta.id] : null;
    const awayBullpen = bullpenByTeam[awayCode] || { innings: 0, appearances: 0, state: "Fresh" };
    const homeBullpen = bullpenByTeam[homeCode] || { innings: 0, appearances: 0, state: "Fresh" };

    const starterEdge = determineSideEdge(
      starterScore(awayPitcher),
      starterScore(homePitcher),
      "Away",
      "Home"
    );
    const bullpenEdge = determineSideEdge(
      bullpenScore(awayBullpen),
      bullpenScore(homeBullpen),
      "Away",
      "Home"
    );

    return {
      gamePk: game.gamePk,
      gameTime: game.gameDate,
      matchup: `${awayCode} @ ${homeCode}`,
      away: {
        team: awayName,
        code: awayCode,
        pitcher: {
          name: awayPitcherMeta?.fullName || "TBD",
          era: awayPitcher?.era ?? null,
          whip: awayPitcher?.whip ?? null
        },
        bullpen: awayBullpen
      },
      home: {
        team: homeName,
        code: homeCode,
        pitcher: {
          name: homePitcherMeta?.fullName || "TBD",
          era: homePitcher?.era ?? null,
          whip: homePitcher?.whip ?? null
        },
        bullpen: homeBullpen
      },
      starterEdge,
      bullpenEdge,
      lean: matchupLean(starterEdge, bullpenEdge)
    };
  });
}

async function buildPayload() {
  const [standings, oddsByTeam, matchups] = await Promise.all([
    fetchStandings(),
    fetchOddsByTeam(),
    fetchTodayMatchups()
  ]);

  const standingsByCode = Object.fromEntries(
    standings.map((team) => [team.code, team])
  );

  const scoreboard = standings
    .map((team) => {
      const odds = oddsByTeam[team.code] || null;
      const averageImpliedWinProbability = odds?.averageImpliedWinProbability ?? null;

      return {
        ...team,
        averageImpliedWinProbability,
        medianMoneyline: odds?.medianMoneyline ?? null,
        bookmakersCount: odds?.bookmakersCount ?? 0,
        nextMarketTime: odds?.commenceTime ?? null,
        matchup: odds?.matchup ?? "No current moneyline found",
        marketVsRecordGap:
          averageImpliedWinProbability === null || team.winPct === null
            ? null
            : averageImpliedWinProbability - team.winPct
      };
    })
    .sort((left, right) => {
      const leftValue = left.marketVsRecordGap ?? -999;
      const rightValue = right.marketVsRecordGap ?? -999;
      return rightValue - leftValue;
    })
    .map((team) => ({
      ...team,
      signal: signalForTeam(team)
    }));

  const summary = summarize(scoreboard);
  const matchupsWithRecords = matchups.map((game) => ({
    ...game,
    away: {
      ...game.away,
      winPct: standingsByCode[game.away.code]?.winPct ?? null
    },
    home: {
      ...game.home,
      winPct: standingsByCode[game.home.code]?.winPct ?? null
    }
  }));

  return {
    fetchedAt: new Date().toISOString(),
    source: {
      standings: buildStandingsUrl(),
      odds: ODDS_API_BASE_URL,
      note: "Win percentage comes from live MLB standings. Market pricing comes from current US h2h moneylines via The Odds API. Matchups use probable starters plus yesterday's bullpen workload from MLB Stats API boxscores."
    },
    summary,
    groups: {
      marketHigher: scoreboard.filter((team) => team.marketVsRecordGap !== null && team.marketVsRecordGap > 0.06).slice(0, 6),
      marketLower: scoreboard.filter((team) => team.marketVsRecordGap !== null && team.marketVsRecordGap < -0.06).slice(0, 6)
    },
    matchups: matchupsWithRecords,
    scoreboard
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

    const payload = await buildPayload();
    cache = {
      payload,
      expiresAt: Date.now() + CACHE_TTL_MS
    };

    return sendJson(res, 200, payload);
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      error: error.message || "Unable to load MLB market data."
    });
  }
};
