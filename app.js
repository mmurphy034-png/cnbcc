const headline = document.getElementById("headline");
const oilPulse = document.getElementById("oilPulse");
const statusText = document.getElementById("statusText");
const refreshButton = document.getElementById("refreshButton");
const summaryBands = document.getElementById("summaryBands");
const oilGroup = document.getElementById("oilGroup");
const beneficiaryGroup = document.getElementById("beneficiaryGroup");
const broadMarketGroup = document.getElementById("broadMarketGroup");
const consumerGroup = document.getElementById("consumerGroup");
const scoreboard = document.getElementById("scoreboard");

function formatPct(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  return `${(Number(value) * 100).toFixed(1)}%`;
}

function formatDelta(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  const points = Number(value) * 100;
  const prefix = points > 0 ? "+" : "";
  return `${prefix}${points.toFixed(1)} pts`;
}

function formatAmericanOdds(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  return value > 0 ? `+${value}` : `${value}`;
}

function toneClass(value) {
  if (value === null || value === undefined) {
    return "neutral";
  }

  if (value > 0.02) {
    return "positive";
  }

  if (value < -0.02) {
    return "negative";
  }

  return "neutral";
}

function renderBand(label, value, helper) {
  return `
    <article class="band ${toneClass(value - 0.5)}">
      <p class="band-label">${label}</p>
      <h3>${formatPct(value)}</h3>
      <p class="band-helper">${helper}</p>
    </article>
  `;
}

function renderTeamCard(team) {
  return `
    <article class="quote-card ${toneClass(team.performanceGap)}">
      <div class="quote-topline">
        <div>
          <p class="symbol">${team.symbol} | ${team.record}</p>
          <h3>${team.team}</h3>
        </div>
        <div class="pill ${toneClass(team.performanceGap)}">${formatDelta(team.performanceGap)}</div>
      </div>
      <p class="last-price">Playoffs ${formatAmericanOdds(team.playoffOdds)} | Next game ${formatAmericanOdds(team.nextGameMoneyline)}</p>
      <p class="thesis">${team.thesis}</p>
    </article>
  `;
}

function renderMatrix(items) {
  scoreboard.innerHTML = `
    <div class="matrix-head">
      <span>Team</span>
      <span>Actual win%</span>
      <span>Projected win%</span>
      <span>Playoff implied</span>
      <span>Next game implied</span>
      <span>Market read</span>
    </div>
    ${items
      .map(
        (team) => `
          <article class="matrix-row">
            <div>
              <strong>${team.team}</strong>
              <p>${team.symbol} | ${team.record}</p>
            </div>
            <div>${formatPct(team.actualWinPct)}</div>
            <div>${formatPct(team.projectedWinPct)}</div>
            <div class="${toneClass(team.marketGap)}">${formatPct(team.playoffImpliedProbability)}</div>
            <div>${formatPct(team.nextGameImpliedProbability)}</div>
            <div><span class="relationship ${relationshipClass(team.marketRead)}">${team.marketRead}</span></div>
          </article>
        `
      )
      .join("")}
  `;
}

function relationshipClass(label) {
  if (label.includes("skeptical")) {
    return "diverging";
  }

  if (label.includes("forgiving") || label.includes("favorite")) {
    return "tracking";
  }

  return "neutral";
}

function setGroup(target, items, emptyText) {
  target.innerHTML = items.length
    ? items.map(renderTeamCard).join("")
    : `<div class="empty-state">${emptyText}</div>`;
}

function renderDashboard(payload) {
  headline.textContent = `${payload.summary.headline} ${payload.summary.takeaway}`;

  oilPulse.className = `oil-pulse ${toneClass(payload.summary.averages.playoffImpliedProbability - payload.summary.averages.projectedWinPct)}`;
  oilPulse.innerHTML = `
    <span>Average playoff implied probability</span>
    <strong>${formatPct(payload.summary.averages.playoffImpliedProbability)}</strong>
  `;

  summaryBands.innerHTML = [
    renderBand(
      "Actual board average",
      payload.summary.averages.actualWinPct,
      "Short-run record across the sample teams"
    ),
    renderBand(
      "Projected board average",
      payload.summary.averages.projectedWinPct,
      "Preseason win totals divided by 162"
    ),
    renderBand(
      "Playoff pricing",
      payload.summary.averages.playoffImpliedProbability,
      "How futures markets price postseason odds"
    ),
    renderBand(
      "Next-game pricing",
      payload.summary.averages.nextGameImpliedProbability,
      "How moneylines treat the next matchup"
    )
  ].join("");

  setGroup(oilGroup, payload.groups.contenders || [], "No heavy favorites in the current sample.");
  setGroup(
    beneficiaryGroup,
    payload.groups.skepticalStarts || [],
    "No teams are clearly outrunning their prices right now."
  );
  setGroup(
    broadMarketGroup,
    payload.groups.forgivingMarket || [],
    "No teams are being strongly protected by the market in this sample."
  );
  setGroup(consumerGroup, payload.groups.longshots || [], "No longshots in the current sample.");
  renderMatrix(payload.scoreboard || []);

  statusText.textContent = `Last refreshed ${new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(payload.fetchedAt))}. Sample values are illustrative so you can inspect the math directly.`;
}

function renderError(message) {
  headline.textContent = message;
  oilPulse.className = "oil-pulse neutral";
  oilPulse.textContent = "Unable to refresh";
  summaryBands.innerHTML = `<div class="empty-state">${message}</div>`;
  oilGroup.innerHTML = "";
  beneficiaryGroup.innerHTML = "";
  broadMarketGroup.innerHTML = "";
  consumerGroup.innerHTML = "";
  scoreboard.innerHTML = "";
}

async function loadDashboard() {
  refreshButton.disabled = true;
  statusText.textContent = "Refreshing MLB market model...";

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
