const headline = document.getElementById("headline");
const marketPulse = document.getElementById("marketPulse");
const statusText = document.getElementById("statusText");
const refreshButton = document.getElementById("refreshButton");
const snapshotGrid = document.getElementById("snapshotGrid");
const insightsGrid = document.getElementById("insightsGrid");
const contendersGroup = document.getElementById("contendersGroup");
const skepticalGroup = document.getElementById("skepticalGroup");
const longshotGroup = document.getElementById("longshotGroup");
const formulaList = document.getElementById("formulaList");
const scoreboard = document.getElementById("scoreboard");

function formatPct(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  return `${(Number(value) * 100).toFixed(1)}%`;
}

function formatAmericanOdds(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  return value > 0 ? `+${value}` : `${value}`;
}

function formatPointGap(value) {
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

  if (value > 0.02) {
    return "positive";
  }

  if (value < -0.02) {
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

function renderInsightCard(item) {
  return `
    <article class="insight-card">
      <p class="eyebrow">${item.label}</p>
      <h3>${item.team}</h3>
      <p class="symbol">${item.symbol}</p>
      <strong>${item.value}</strong>
      <p class="band-helper">${item.note}</p>
    </article>
  `;
}

function renderTeamCard(team) {
  return `
    <article class="team-card ${toneClass(team.performanceGap)}">
      <div class="team-card-top">
        <div>
          <p class="symbol">${team.symbol} | ${team.record}</p>
          <h3><a href="${team.teamUrl}" target="_blank" rel="noreferrer">${team.team}</a></h3>
        </div>
        <div class="pill ${toneClass(team.performanceGap)}">${formatPointGap(team.performanceGap)}</div>
      </div>
      <div class="probability-stack">
        ${probabilityBar("Actual", team.actualWinPct, "actual")}
        ${probabilityBar("Projected", team.projectedWinPct, "projected")}
        ${probabilityBar("Playoff", team.playoffImpliedProbability, "market")}
      </div>
      <p class="last-price">Playoffs ${formatAmericanOdds(team.playoffOdds)} | Next game ${formatAmericanOdds(team.nextGameMoneyline)}</p>
      <p class="thesis">${team.thesis}</p>
    </article>
  `;
}

function relationshipClass(label) {
  if (label.includes("skeptical")) {
    return "diverging";
  }

  if (label.includes("favorite") || label.includes("forgiving")) {
    return "tracking";
  }

  return "neutral";
}

function renderScoreboard(items) {
  scoreboard.innerHTML = `
    <div class="matrix-head">
      <span>Team</span>
      <span>Actual</span>
      <span>Projected</span>
      <span>Playoff</span>
      <span>Next game</span>
      <span>Read</span>
    </div>
    ${items
      .map(
        (team) => `
          <article class="matrix-row">
            <div class="team-cell">
              <strong><a href="${team.teamUrl}" target="_blank" rel="noreferrer">${team.team}</a></strong>
              <p>${team.symbol} | ${team.record}</p>
            </div>
            <div>${probabilityBar("Actual", team.actualWinPct, "actual")}</div>
            <div>${probabilityBar("Projected", team.projectedWinPct, "projected")}</div>
            <div>${probabilityBar("Playoff", team.playoffImpliedProbability, "market")}</div>
            <div>${probabilityBar("Next", team.nextGameImpliedProbability, "next-game")}</div>
            <div><span class="relationship ${relationshipClass(team.marketRead)}">${team.marketRead}</span></div>
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
  headline.textContent = `${payload.summary.headline} ${payload.summary.takeaway}`;

  marketPulse.innerHTML = `
    <span>League-wide playoff pricing</span>
    <strong>${formatPct(payload.summary.averages.playoffImpliedProbability)}</strong>
    <p class="status-text">Average projected win rate: ${formatPct(payload.summary.averages.projectedWinPct)}</p>
  `;

  snapshotGrid.innerHTML = [
    renderSnapshotCard(
      "Actual board average",
      payload.summary.averages.actualWinPct,
      "How the sample is performing right now.",
      "actual"
    ),
    renderSnapshotCard(
      "Projected board average",
      payload.summary.averages.projectedWinPct,
      "What preseason win totals imply over 162 games.",
      "projected"
    ),
    renderSnapshotCard(
      "Playoff pricing",
      payload.summary.averages.playoffImpliedProbability,
      "How futures markets translate team strength into postseason chances.",
      "market"
    ),
    renderSnapshotCard(
      "Next-game pricing",
      payload.summary.averages.nextGameImpliedProbability,
      "How tonight's moneylines react to matchup-level details.",
      "next-game"
    )
  ].join("");

  insightsGrid.innerHTML = (payload.insights || []).map(renderInsightCard).join("");
  formulaList.innerHTML = (payload.formulaGuide || []).map((item) => `<li>${item}</li>`).join("");

  setGroup(contendersGroup, payload.groups.contenders || [], "No heavy favorites in the current sample.");
  setGroup(
    skepticalGroup,
    payload.groups.skepticalStarts || [],
    "No fast starters are clearly being discounted right now."
  );
  setGroup(longshotGroup, payload.groups.longshots || [], "No longshots in the current sample.");
  renderScoreboard(payload.scoreboard || []);

  statusText.textContent = `Last refreshed ${new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(payload.fetchedAt))}. Team names open their MLB team pages in a new tab.`;
}

function renderError(message) {
  headline.textContent = message;
  marketPulse.textContent = "Unable to refresh";
  snapshotGrid.innerHTML = `<div class="empty-state">${message}</div>`;
  insightsGrid.innerHTML = "";
  formulaList.innerHTML = "";
  contendersGroup.innerHTML = "";
  skepticalGroup.innerHTML = "";
  longshotGroup.innerHTML = "";
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
