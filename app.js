const headline = document.getElementById("headline");
const marketPulse = document.getElementById("marketPulse");
const statusText = document.getElementById("statusText");
const refreshButton = document.getElementById("refreshButton");
const snapshotGrid = document.getElementById("snapshotGrid");
const matchupsGrid = document.getElementById("matchupsGrid");
const marketHigherGroup = document.getElementById("marketHigherGroup");
const marketLowerGroup = document.getElementById("marketLowerGroup");
const scoreboard = document.getElementById("scoreboard");

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
          <p class="eyebrow">${game.matchup}</p>
          <h3 class="${leanClass}">${game.lean}</h3>
        </div>
        <div class="pill ${game.lean.includes("away") ? "positive" : game.lean.includes("home") ? "negative" : "neutral"}">${game.gameTime ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(game.gameTime)) : "TBD"}</div>
      </div>
      <div class="matchup-columns">
        <div class="matchup-team">
          <strong>${game.away.code}</strong>
          <span class="win-pct">Win% ${formatPct(game.away.winPct)}</span>
          <p>${game.away.pitcher.name}</p>
          <span>ERA ${formatNumber(game.away.pitcher.era)} | WHIP ${formatNumber(game.away.pitcher.whip)}</span>
          <span>Bullpen ${game.away.bullpen.state} (${formatNumber(game.away.bullpen.innings, 1)} IP yesterday)</span>
        </div>
        <div class="matchup-meta">
          <span>Starter edge: ${game.starterEdge}</span>
          <span>Bullpen edge: ${game.bullpenEdge}</span>
        </div>
        <div class="matchup-team">
          <strong>${game.home.code}</strong>
          <span class="win-pct">Win% ${formatPct(game.home.winPct)}</span>
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
              <strong>${game.matchup}</strong>
              <p>${game.away.code} ${formatPct(game.away.winPct)} | ${game.home.code} ${formatPct(game.home.winPct)}</p>
            </div>
            <div>${probabilityBar(game.away.code, game.away.winPct, "actual")}</div>
            <div>${probabilityBar(game.home.code, game.home.winPct, "market")}</div>
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
  headline.textContent = "MLB";

  marketPulse.innerHTML = `
    <span>Average pricing gap</span>
    <strong>${formatGap(payload.summary.averages.gap)}</strong>
    <p class="status-text">Record ${formatPct(payload.summary.averages.actualWinPct)} vs market ${formatPct(payload.summary.averages.marketImpliedWinPct)}</p>
  `;

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

  setGroup(
    marketHigherGroup,
    payload.groups.marketHigher || [],
    "No teams are materially above their record in current pricing."
  );
  setGroup(
    marketLowerGroup,
    payload.groups.marketLower || [],
    "No teams are materially below their record in current pricing."
  );
  renderScoreboard(payload.matchups || []);

  statusText.textContent = `Last refreshed ${new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(payload.fetchedAt))}. Moneylines are near-term pricing, not full-season futures.`;
}

function renderError(message) {
  headline.textContent = "MLB";
  marketPulse.textContent = "Unable to refresh";
  snapshotGrid.innerHTML = `<div class="empty-state">${message}</div>`;
  matchupsGrid.innerHTML = "";
  marketHigherGroup.innerHTML = "";
  marketLowerGroup.innerHTML = "";
  scoreboard.innerHTML = "";
}

async function loadDashboard() {
  refreshButton.disabled = true;
  statusText.textContent = "Refreshing MLB pricing data...";

  try {
    const response = await fetch("/api/market-data");
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unable to fetch MLB market data.");
    }

    renderDashboard(payload);
  } catch (error) {
    renderError(error.message);
    statusText.textContent = "Refresh failed.";
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadDashboard);
loadDashboard();
