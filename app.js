const headline = document.getElementById("headline");
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

function renderScoreboard(items) {
  scoreboard.innerHTML = `
    <div class="matrix-head">
      <span>Game</span>
      <span>Live</span>
      <span>Win share</span>
      <span>Away line</span>
      <span>Home line</span>
      <span>Lean</span>
    </div>
    ${items
      .map(
        (game) => `
          <article class="matrix-row matrix-row-simple">
            <div class="team-cell">
              <strong class="game-title">
                <img class="team-logo small" src="${teamLogoUrl(game.away.code)}" alt="${game.away.code} logo" />
                <span>${game.matchup}</span>
                <img class="team-logo small" src="${teamLogoUrl(game.home.code)}" alt="${game.home.code} logo" />
              </strong>
              <p>${game.away.code} ${game.away.record || "--"} | ${game.home.code} ${game.home.record || "--"}</p>
            </div>
            <div class="live-cell">
              <strong>${game.gameStatus === "Scheduled" || game.gameStatus === "Pre-Game" ? "0-0" : `${game.awayScore}-${game.homeScore}`}</strong>
              <p>${game.gameStatus || "Scheduled"}</p>
            </div>
            <div>${matchupShareBar(game)}</div>
            <div class="line-cell">${formatSpreadWithPrice(game.away.medianSpread, game.away.medianSpreadPrice)}</div>
            <div class="line-cell">${formatSpreadWithPrice(game.home.medianSpread, game.home.medianSpreadPrice)}</div>
            <div><span class="relationship ${game.lean.includes("edge") ? "positive" : "neutral"}">${game.lean}</span></div>
          </article>
        `
      )
      .join("")}
  `;
}

function renderDashboard(payload) {
  headline.textContent = `MLB ${String.fromCodePoint(0x26be)}`;
  renderScoreboard(payload.matchups || []);
}

function renderError(message) {
  headline.textContent = `MLB ${String.fromCodePoint(0x26be)}`;
  scoreboard.innerHTML = `<div class="empty-state">${message}</div>`;
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
