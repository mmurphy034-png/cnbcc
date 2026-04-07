const headline = document.getElementById("headline");
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

function formatGap(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  const points = Number(value) * 100;
  const prefix = points > 0 ? "+" : "";
  return `${prefix}${points.toFixed(1)} pts`;
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

function centeredProbabilityBar(label, value, side) {
  const width = value === null || value === undefined ? 0 : Math.max(0, Math.min(50, value * 50));

  return `
    <div class="probability-block centered-block">
      <div class="probability-label">
        <span>${label}</span>
        <strong>${formatPct(value)}</strong>
      </div>
      <div class="probability-track centered-track">
        <span class="probability-fill centered-fill ${side}" style="width:${width}%"></span>
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

function renderTeamCard(team) {
  return `
    <article class="team-card ${toneClass(team.marketVsRecordGap)}">
      <div class="team-card-top">
        <div>
          <p class="symbol">${team.code} | ${team.wins}-${team.losses}</p>
          <h3>${team.team}</h3>
        </div>
        <div class="pill ${toneClass(team.marketVsRecordGap)}">${formatGap(team.marketVsRecordGap)}</div>
      </div>
      <div class="probability-stack">
        ${probabilityBar("Record win%", team.winPct, "actual")}
        ${probabilityBar("Market implied", team.averageImpliedWinProbability, "market")}
      </div>
      <p class="last-price">Median moneyline ${formatMoneyline(team.medianMoneyline)} across ${team.bookmakersCount} books</p>
      <p class="thesis">${team.signal}. ${team.matchup}</p>
    </article>
  `;
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined) {
    return "--";
  }

  return Number(value).toFixed(digits);
}

function renderMatchupCard(game) {
  const leanClass =
    game.lean.includes("Away") ? "positive" : game.lean.includes("Home") ? "positive" : "neutral";

  return `
    <article class="matchup-card">
      <div class="matchup-top">
        <div>
          <h3>${game.matchup}</h3>
          <p class="eyebrow ${leanClass}">${game.lean}</p>
        </div>
        <div class="pill ${game.lean.includes("away") ? "positive" : game.lean.includes("home") ? "negative" : "neutral"}">${game.gameTime ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(game.gameTime)) : "TBD"}</div>
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
      <span>Away win%</span>
      <span>Home win%</span>
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
              <p>${game.away.code} ${game.away.record || "--"} | ${game.home.code} ${game.home.record || "--"}</p>
            </div>
            <div>${centeredProbabilityBar(game.away.code, game.away.winPct, "away")}</div>
            <div>${centeredProbabilityBar(game.home.code, game.home.winPct, "home")}</div>
            <div>${game.starterEdge}</div>
            <div>${game.bullpenEdge}</div>
            <div><span class="relationship ${game.lean.includes("edge") ? "positive" : "neutral"}">${game.lean}</span></div>
          </article>
        `
      )
      .join("")}
  `;
}

function setGroup(target, items, emptyText) {
  target.innerHTML = items.length
    ? items.map(renderTeamCard).join("")
    : `<div class="empty-state">${emptyText}</div>`;
}

function renderDashboard(payload) {
  headline.textContent = "MLB ⚾";

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
