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

function formatPrice(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(Number(value));
}

function formatPercent(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${Number(value).toFixed(2)}%`;
}

function toneClass(value) {
  if (value === null || value === undefined) {
    return "neutral";
  }

  if (value > 0) {
    return "positive";
  }

  if (value < 0) {
    return "negative";
  }

  return "neutral";
}

function renderBand(label, value, helper) {
  return `
    <article class="band ${toneClass(value)}">
      <p class="band-label">${label}</p>
      <h3>${formatPercent(value)}</h3>
      <p class="band-helper">${helper}</p>
    </article>
  `;
}

function renderQuoteCard(asset) {
  return `
    <article class="quote-card ${toneClass(asset.percentChange)}">
      <div class="quote-topline">
        <div>
          <p class="symbol">${asset.symbol}</p>
          <h3>${asset.label}</h3>
        </div>
        <div class="pill ${toneClass(asset.percentChange)}">${formatPercent(asset.percentChange)}</div>
      </div>
      <p class="last-price">${formatPrice(asset.last)}</p>
      <p class="thesis">${asset.thesis}</p>
    </article>
  `;
}

function renderMatrix(items) {
  scoreboard.innerHTML = `
    <div class="matrix-head">
      <span>Asset</span>
      <span>Last</span>
      <span>Day move</span>
      <span>Oil read-through</span>
    </div>
    ${items
      .map(
        (asset) => `
          <article class="matrix-row">
            <div>
              <strong>${asset.label}</strong>
              <p>${asset.symbol}</p>
            </div>
            <div>${formatPrice(asset.last)}</div>
            <div class="${toneClass(asset.percentChange)}">${formatPercent(asset.percentChange)}</div>
            <div><span class="relationship ${asset.oilRelationship}">${asset.oilRelationship}</span></div>
          </article>
        `
      )
      .join("")}
  `;
}

function setGroup(target, items) {
  target.innerHTML = items.map(renderQuoteCard).join("");
}

function renderDashboard(payload) {
  headline.textContent = `${payload.summary.headline} ${payload.summary.takeaway}`;

  const wti = (payload.groups.oil || []).find((asset) => asset.symbol === "@CL.1");
  oilPulse.className = `oil-pulse ${toneClass(wti?.percentChange)}`;
  oilPulse.innerHTML = `
    <span>${wti ? wti.label : "WTI Crude"}</span>
    <strong>${wti ? formatPercent(wti.percentChange) : "--"}</strong>
  `;

  summaryBands.innerHTML = [
    renderBand("Oil basket", payload.summary.averages.oil, "WTI, Brent, and USO"),
    renderBand(
      "Energy shares",
      payload.summary.averages.beneficiaries,
      "XLE, XOP, XOM, and CVX"
    ),
    renderBand(
      "Broad market",
      payload.summary.averages.broadMarket,
      "SPY and QQQ as a quick risk barometer"
    ),
    renderBand(
      "Fuel-sensitive",
      payload.summary.averages.consumers,
      "DAL, UAL, and FDX"
    )
  ].join("");

  setGroup(oilGroup, payload.groups.oil || []);
  setGroup(beneficiaryGroup, payload.groups.beneficiaries || []);
  setGroup(broadMarketGroup, payload.groups.broadMarket || []);
  setGroup(consumerGroup, payload.groups.consumers || []);
  renderMatrix(payload.scoreboard || []);

  statusText.textContent = `Last synced ${new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(payload.fetchedAt))}. Twelve Data quote coverage depends on your plan.`;
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
  statusText.textContent = "Refreshing market data...";

  try {
    const response = await fetch("/api/market-data");
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unable to fetch market data.");
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
