const TWELVE_DATA_BASE_URL = "https://api.twelvedata.com/quote";
const CACHE_TTL_MS = 5 * 60 * 1000;

const ASSETS = [
  {
    symbol: "USO",
    label: "United States Oil Fund",
    bucket: "oil",
    thesis: "Liquid ETF proxy for front-month crude exposure."
  },
  {
    symbol: "BNO",
    label: "United States Brent Oil Fund",
    bucket: "oil",
    thesis: "ETF proxy for Brent-linked crude exposure."
  },
  {
    symbol: "XLE",
    label: "Energy Select Sector SPDR",
    bucket: "beneficiaries",
    thesis: "Large-cap U.S. energy sector."
  },
  {
    symbol: "XOM",
    label: "Exxon Mobil",
    bucket: "beneficiaries",
    thesis: "Integrated oil major."
  },
  {
    symbol: "SPY",
    label: "S&P 500 ETF",
    bucket: "broad-market",
    thesis: "Broad U.S. equity benchmark."
  },
  {
    symbol: "QQQ",
    label: "Nasdaq 100 ETF",
    bucket: "broad-market",
    thesis: "Growth-heavy U.S. equities."
  },
  {
    symbol: "DAL",
    label: "Delta Air Lines",
    bucket: "consumers",
    thesis: "Airlines often face fuel-cost pressure when oil rises."
  },
  {
    symbol: "FDX",
    label: "FedEx",
    bucket: "consumers",
    thesis: "Transport and fuel-cost sensitivity."
  }
];

let cache = {
  payload: null,
  expiresAt: 0
};

function getApiKey() {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    const error = new Error("TWELVE_DATA_API_KEY is not configured.");
    error.statusCode = 500;
    throw error;
  }

  return apiKey;
}

function quoteUrl(symbol) {
  const url = new URL(TWELVE_DATA_BASE_URL);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "1day");
  url.searchParams.set("apikey", getApiKey());
  return url.toString();
}

function sendJson(res, statusCode, body) {
  res.status(statusCode).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numeric = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeQuote(rawQuote, asset) {
  return {
    ...asset,
    symbol: rawQuote.symbol || asset.symbol,
    name: rawQuote.name || asset.label,
    last: toNumber(rawQuote.close ?? rawQuote.price),
    change: toNumber(rawQuote.change),
    percentChange: toNumber(rawQuote.percent_change),
    open: toNumber(rawQuote.open),
    high: toNumber(rawQuote.high),
    low: toNumber(rawQuote.low),
    prevClose: toNumber(rawQuote.previous_close),
    volume: toNumber(rawQuote.volume),
    status: rawQuote.is_market_open ? "OPEN" : "CLOSED",
    sourceUrl: `https://twelvedata.com/market-data/${encodeURIComponent(asset.symbol)}`
  };
}

function averagePercent(items) {
  const values = items.map((item) => item.percentChange).filter((value) => value !== null);
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sentimentFromChange(value) {
  if (value === null) {
    return "flat";
  }

  if (value > 0.35) {
    return "up";
  }

  if (value < -0.35) {
    return "down";
  }

  return "flat";
}

function summarize(assets) {
  const oil = assets.filter((asset) => asset.bucket === "oil");
  const beneficiaries = assets.filter((asset) => asset.bucket === "beneficiaries");
  const broad = assets.filter((asset) => asset.bucket === "broad-market");
  const consumers = assets.filter((asset) => asset.bucket === "consumers");

  const oilMove = sentimentFromChange(averagePercent(oil));
  const beneficiaryAvg = averagePercent(beneficiaries);
  const consumerAvg = averagePercent(consumers);
  const broadAvg = averagePercent(broad);

  let headline = "Oil and cross-asset signals are mixed.";
  if (oilMove === "up") {
    headline = "Oil-linked ETFs are pushing higher and the dashboard is checking who is keeping up.";
  } else if (oilMove === "down") {
    headline = "Oil-linked ETFs are fading and the dashboard is checking where the pressure is spreading.";
  }

  let takeaway = "Leadership is scattered across the watchlist.";
  if ((beneficiaryAvg ?? 0) > 0 && (consumerAvg ?? 0) < 0) {
    takeaway = "Energy-linked names are outperforming while fuel-sensitive stocks are lagging.";
  } else if ((beneficiaryAvg ?? 0) < 0 && (consumerAvg ?? 0) > 0) {
    takeaway = "Oil-sensitive consumers are catching a break while energy producers are softer.";
  } else if ((broadAvg ?? 0) < 0 && oilMove === "up") {
    takeaway = "Higher oil proxies are coinciding with a weaker broad-market tone.";
  }

  return {
    headline,
    takeaway,
    oilDirection: oilMove,
    averages: {
      oil: averagePercent(oil),
      beneficiaries: beneficiaryAvg,
      consumers: consumerAvg,
      broadMarket: broadAvg
    }
  };
}

function scoreAgainstOil(asset, oilDirection) {
  if (asset.percentChange === null || oilDirection === "flat") {
    return "neutral";
  }

  if (asset.bucket === "beneficiaries") {
    return oilDirection === "up" && asset.percentChange > 0
      ? "tracking"
      : oilDirection === "down" && asset.percentChange < 0
        ? "tracking"
        : "diverging";
  }

  if (asset.bucket === "consumers") {
    return oilDirection === "up" && asset.percentChange < 0
      ? "tracking"
      : oilDirection === "down" && asset.percentChange > 0
        ? "tracking"
        : "diverging";
  }

  return "neutral";
}

async function fetchQuote(asset) {
  const response = await fetch(quoteUrl(asset.symbol));

  if (!response.ok) {
    throw new Error(
      `Twelve Data quote request failed for ${asset.symbol} with status ${response.status}.`
    );
  }

  const text = await response.text();
  let payload;

  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new Error(`Twelve Data returned non-JSON for ${asset.symbol}: ${text.slice(0, 140)}`);
  }

  if (payload.status === "error") {
    throw new Error(`${asset.symbol}: ${payload.message || "Twelve Data returned an error."}`);
  }

  return normalizeQuote(payload, asset);
}

async function buildPayload() {
  const quotes = await Promise.all(ASSETS.map(fetchQuote));

  const preliminary = quotes.map((asset) => ({
    ...asset,
    oilRelationship: scoreAgainstOil(asset, "flat")
  }));

  const summary = summarize(preliminary);
  const scoreboard = preliminary.map((asset) => ({
    ...asset,
    oilRelationship: scoreAgainstOil(asset, summary.oilDirection)
  }));

  return {
    fetchedAt: new Date().toISOString(),
    source: {
      name: "Twelve Data quote API",
      quoteUrl: "https://api.twelvedata.com/quote",
      note: "Cached for 5 minutes to stay within free-tier API limits."
    },
    summary,
    groups: {
      oil: scoreboard.filter((asset) => asset.bucket === "oil"),
      beneficiaries: scoreboard.filter((asset) => asset.bucket === "beneficiaries"),
      broadMarket: scoreboard.filter((asset) => asset.bucket === "broad-market"),
      consumers: scoreboard.filter((asset) => asset.bucket === "consumers")
    },
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
      error: error.message || "Unable to load market data."
    });
  }
};
