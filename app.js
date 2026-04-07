const headline = document.getElementById("headline");
const splitGrid = document.getElementById("splitGrid");
const snapshotGrid = document.getElementById("snapshotGrid");
const matchupsGrid = document.getElementById("matchupsGrid");
const scoreboard = document.getElementById("scoreboard");

const ESPN_LOGO_CODE = {
  AZ: "ari",
  ATL: "atl",
  BAL: "bal",
  BOS: "bos",
  CHC: "chc",
  CWS: "chw",
  CIN: "cin",
  CLE: "cle",
  COL: "col",
  DET: "det",
  HOU: "hou",
  KC: "kc",
  LAA: "laa",
  LAD: "lad",
  MIA: "mia",
  MIL: "mil",
  MIN: "min",
  NYM: "nym",
  NYY: "nyy",
  ATH: "oak",
  PHI: "phi",
  PIT: "pit",
  SD: "sd",
  SF: "sf",
  SEA: "sea",
  STL: "stl",
  TB: "tb",
  TEX: "tex",
  TOR: "tor",
  WSH: "wsh"
};

function teamLogoUrl(code) {
  if (!code) {
    return "";
  }

  const logoCode = ESPN_LOGO_CODE[code] || String(code).toLowerCase();
  return `https://a.espncdn.com/combiner/i?img=/i/teamlogos/mlb/500/${logoCode}.png&h=48&w=48&scale=crop&location=origin`;
}

function formatPct(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  return `${(Number(value) * 100).toFixed(1)}%`;
}

function formatMoneyline(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  return value > 0 ? `+${value}` : `${value}`;
}

function formatSpread(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  return value > 0 ? `+${value}` : `${value}`;
}

function formatSpreadWithPrice(spread, price) {
  if ((spread === null || spread === undefined) && (price === null || price === undefined)) {
    return "--";
  }

  const spreadText = formatSpread(spread);
  const priceText = formatMoneyline(price);

  if (spreadText === "--") {
    return priceText;
  }

  if (priceText === "--") {
    return spreadText;
  }

  return `${spreadText} (${priceText})`;
}

function formatGap(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  const points = Number(value) * 100;
  const prefix = points > 0 ? "+" : "";
  return `${prefix}${points.toFixed(1)} pts`;
}

function formatMetric(value, digits = 3) {
  if (value === null || value === undefined) {
    return "--";
  }

  return Number(value).toFixed(digits);
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined) {
    return "--";
  }

  return Number(value).toFixed(digits);
}

function handLabel(hand) {
  if (hand === "L") {
    return "LHP";
  }

  if (hand === "R") {
    return "RHP";
  }

  return "SP";
}

function toneClass(value) {
  if (value === null || value === undefined) {
    return "neutral";
  }

  if (value > 0.06) {
    return "positive";
  }

  if (value < -0.06) {
    return "negative";
  }

  return "neutral";
}

function probabilityBar(label, value, variant) {
  const width = value === null || value === undefined ? 0 : Math.max(0, Math.min(100, value * 100));

  return `
    <div class="probability-block">
      <div class="probability-label">
        <span>${label}</span>
        <strong>${formatPct(value)}</strong>
      </div>
      <div class="probability-track">
        <span class="probability-fill ${variant}" style="width:${width}%"></span>
      </div>
    </div>
  `;
}

function matchupWinShares(game) {
  const away = game.away.winPct;
  const home = game.home.winPct;

  if (away === null || away === undefined || home === null || home === undefined) {
    return { away: null, home: null };
  }

  const total = away + home;
  if (!total) {
    return { away: null, home: null };
  }

  return {
    away: away / total,
    home: home / total
  };
}

function matchupShareBar(game) {
  const shares = matchupWinShares(game);
  const awayWidth =
    shares.away === null || shares.away === undefined
      ? 0
      : Math.max(0, Math.min(50, shares.away * 100));
  const homeWidth =
    shares.home === null || shares.home === undefined
      ? 0
      : Math.max(0, Math.min(50, shares.home * 100));

  return `
    <div class="matchup-share">
      <div class="matchup-share-labels">
        <span>${game.away.code} ${formatPct(shares.away)}</span>
        <span>${game.home.code} ${formatPct(shares.home)}</span>
      </div>
      <div class="matchup-share-track">
        <span class="matchup-share-fill away" style="width:${awayWidth}%"></span>
        <span class="matchup-share-fill home" style="width:${homeWidth}%"></span>
      </div>
    </div>
  `;
}

function renderSnapshotCard(label, value, helper, variant) {
  return `
    <article class="snapshot-card">
      <p class="eyebrow">${label}</p>
      <h3>${formatPct(value)}</h3>
      <p class="band-helper">${helper}</p>
      ${probabilityBar(label, value, variant)}
    </article>
  `;
}

function renderSplitCard(game) {
  const awayPitcherHand = handLabel(game.home.pitcher.hand);
  const homePitcherHand = handLabel(game.away.pitcher.hand);
  const awayPitcherAllowed = game.home.pitcher.allowedWobaByBatterHand || {};
  const homePitcherAllowed = game.away.pitcher.allowedWobaByBatterHand || {};

  return `
    <article class="split-card">
      <div class="split-card-top">
        <h3>${game.matchup}</h3>
        <span class="eyebrow">${game.gameStatus || "Scheduled"}</span>
      </div>
      <div class="split-row">
        <div>
          <p class="symbol">${game.away.code} bats vs ${awayPitcherHand}</p>
          <strong>${formatMetric(game.away.hittingWobaVsPitcherHand)}</strong>
        </div>
        <div class="split-meta">
          <span>${game.home.pitcher.name} allowed</span>
          <span>LHB ${formatMetric(awayPitcherAllowed.vl)} | RHB ${formatMetric(awayPitcherAllowed.vr)}</span>
        </div>
      </div>
      <div class="split-row">
        <div>
          <p class="symbol">${game.home.code} bats vs ${homePitcherHand}</p>
          <strong>${formatMetric(game.home.hittingWobaVsPitcherHand)}</strong>
        </div>
        <div class="split-meta">
          <span>${game.away.pitcher.name} allowed</span>
          <span>LHB ${formatMetric(homePitcherAllowed.vl)} | RHB ${formatMetric(homePitcherAllowed.vr)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderMatchupCard(game) {
  const leanClass =
    game.lean.includes("Away") ? "positive" : game.lean.includes("Home") ? "positive" : "neutral";
  const gameState = game.gameStatus || "Scheduled";
  const scoreLine =
    gameState === "Scheduled" || gameState === "Pre-Game"
      ? "0-0"
      : `${game.away.code} ${game.awayScore} - ${game.homeScore} ${game.home.code}`;

  return `
    <article class="matchup-card">
      <div class="matchup-top">
        <div>
          <h3>${game.matchup}</h3>
          <p class="eyebrow ${leanClass}">${game.lean}</p>
        </div>
        <div class="pill ${game.lean.includes("away") ? "positive" : game.lean.includes("home") ? "negative" : "neutral"}">${game.gameTime ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(game.gameTime)) : "TBD"}</div>
      </div>
      <div class="score-line">
        <strong>${scoreLine}</strong>
        <span>${gameState}</span>
      </div>
      <div class="matchup-columns">
        <div class="matchup-team">
          <div class="team-heading">
            <img class="team-logo" src="${teamLogoUrl(game.away.code)}" alt="${game.away.code} logo" />
            <strong>${game.away.code}</strong>
          </div>
          <span class="win-pct">Win% ${formatPct(game.away.winPct)}</span>
          <span class="team-record">${game.away.record || "--"}</span>
          <p>${game.away.pitcher.name}</p>
          <span>ERA ${formatNumber(game.away.pitcher.era)} | WHIP ${formatNumber(game.away.pitcher.whip)}</span>
          <span>Run line ${formatSpreadWithPrice(game.away.medianSpread, game.away.medianSpreadPrice)}</span>
          <span>Bullpen ${game.away.bullpen.state} (${formatNumber(game.away.bullpen.innings, 1)} IP yesterday)</span>
        </div>
        <div class="matchup-meta">
          <span>Starter edge: ${game.starterEdge}</span>
          <span>Bullpen edge: ${game.bullpenEdge}</span>
        </div>
        <div class="matchup-team">
          <div class="team-heading">
            <img class="team-logo" src="${teamLogoUrl(game.home.code)}" alt="${game.home.code} logo" />
            <strong>${game.home.code}</strong>
          </div>
          <span class="win-pct">Win% ${formatPct(game.home.winPct)}</span>
          <span class="team-record">${game.home.record || "--"}</span>
          <p>${game.home.pitcher.name}</p>
          <span>ERA ${formatNumber(game.home.pitcher.era)} | WHIP ${formatNumber(game.home.pitcher.whip)}</span>
          <span>Run line ${formatSpreadWithPrice(game.home.medianSpread, game.home.medianSpreadPrice)}</span>
          <span>Bullpen ${game.home.bullpen.state} (${formatNumber(game.home.bullpen.innings, 1)} IP yesterday)</span>
        </div>
      </div>
    </article>
  `;
}

function renderScoreboard(items) {
  scoreboard.innerHTML = `
    <div class="matrix-head">
      <span>Game</span>
      <span>Win share</span>
      <span>Starter edge</span>
      <span>Bullpen edge</span>
      <span>Lean</span>
    </div>
    ${items
      .map(
        (game) => `
          <article class="matrix-row">
            <div class="team-cell">
              <strong class="game-title">
                <img class="team-logo small" src="${teamLogoUrl(game.away.code)}" alt="${game.away.code} logo" />
                <span>${game.matchup}</span>
                <img class="team-logo small" src="${teamLogoUrl(game.home.code)}" alt="${game.home.code} logo" />
              </strong>
              <p>${game.away.code} ${game.away.record || "--"} | ${game.home.code} ${game.home.record || "--"} | ${game.gameStatus || "Scheduled"}</p>
            </div>
            <div>${matchupShareBar(game)}</div>
            <div>${game.starterEdge}</div>
            <div>${game.bullpenEdge}</div>
            <div><span class="relationship ${game.lean.includes("edge") ? "positive" : "neutral"}">${game.lean}</span></div>
          </article>
        `
      )
      .join("")}
  `;
}

function renderDashboard(payload) {
  headline.textContent = "MLB ⚾";

  splitGrid.innerHTML = (payload.matchups || []).length
    ? (payload.matchups || []).map(renderSplitCard).join("")
    : `<div class="empty-state">No handedness split matchups found for today.</div>`;

  snapshotGrid.innerHTML = [
    renderSnapshotCard(
      "Actual average",
      payload.summary.averages.actualWinPct,
      "Average live team win percentage.",
      "actual"
    ),
    renderSnapshotCard(
      "Market average",
      payload.summary.averages.marketImpliedWinPct,
      "Average implied probability from current moneylines.",
      "market"
    ),
    renderSnapshotCard(
      "Average gap",
      payload.summary.averages.gap,
      "Positive means apps price teams stronger than their current record.",
      "gap"
    )
  ].join("");

  matchupsGrid.innerHTML = (payload.matchups || []).length
    ? (payload.matchups || []).map(renderMatchupCard).join("")
    : `<div class="empty-state">No probable matchups found for today.</div>`;

  renderScoreboard(payload.matchups || []);
}

function renderError(message) {
  headline.textContent = "MLB ⚾";
  splitGrid.innerHTML = "";
  snapshotGrid.innerHTML = `<div class="empty-state">${message}</div>`;
  matchupsGrid.innerHTML = "";
  scoreboard.innerHTML = "";
}

async function loadDashboard() {
  try {
    const response = await fetch("/api/market-data");
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unable to fetch MLB market data.");
    }

    renderDashboard(payload);
  } catch (error) {
    renderError(error.message);
  }
}

loadDashboard();
