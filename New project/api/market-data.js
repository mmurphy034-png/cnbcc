const CNBC_QUOTE_URL = "https://quote.cnbc.com/quote-html-webservice/quote.htm";

const ASSETS = [
  {
    symbol: "@CL.1",
    label: "WTI Crude",
    bucket: "oil",
    thesis: "Primary U.S. oil benchmark."
  },
  {
    symbol: "@LCO.1",
    label: "Brent Crude",
    bucket: "oil",
    thesis: "Global oil benchmark."
  },
  {
    symbol: "USO",
    label: "United States Oil Fund",
    bucket: "oil-linked",
    thesis: "ETF proxy for front-month crude exposure."
  },
  {
    symbol: "XLE",
    label: "Energy Select Sector SPDR",
    bucket: "beneficiaries",
    thesis: "Large-cap U.S. energy sector."
  },
  {
    symbol: "XOP",
    label: "S&P Oil & Gas E&P ETF",
    bucket: "beneficiaries",
    thesis: "Higher-beta exploration and production names."
  },
  {
    symbol: "XOM",
    label: "Exxon Mobil",
    bucket: "beneficiaries",
    thesis: "Integrated oil major."
  },
  {
    symbol: "CVX",
    label: "Chevron",
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
    symbol: "UAL",
    label: "United Airlines",
    bucket: "consumers",
    thesis: "Another fuel-sensitive airline proxy."
  },
  {
    symbol: "FDX",
    label: "FedEx",
    bucket: "consumers",
    thesis: "Transport and fuel-cost sensitivity."
  }
];

function quoteEndpoint(symbols) {
  const url = new URL(CNBC_QUOTE_URL);
  url.searchParams.set("noform", "1");
  url.searchParams.set("partnerId", "2");
  url.searchParams.set("fund", "1");
  url.searchParams.set("exthrs", "0");
  url.searchParams.set("output", "json");
  url.searchParams.set("symbolType", "symbol");
  url.searchParams.set("symbols", symbols.join("|"));
  url.searchParams.set("requestMethod", "extended");
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

  const cleaned = String(value).replace(/,/g, "");
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : null;
}

function getField(source, keys) {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null && source[key] !== "") {
      return source[key];
    }
  }

  return null;
}

function normalizeQuote(rawQuote) {
  const quick = rawQuote?.QuickQuote || rawQuote?.quickQuote || rawQuote || {};
  const fundamentals = quick.FundamentalData || rawQuote?.FundamentalData || {};

  const symbol = getField(quick, ["symbol", "altSymbol"]);
  const last = toNumber(
    getField(quick, ["last", "last_trade", "lastPrice", "lastExtendedHoursTradePrice"])
  );
  const change = toNumber(getField(quick, ["change", "change_val", "priceChange"]));
  const percentChange = toNumber(
    getField(quick, ["change_pct", "changePercent", "percentChange", "change_pct_num"])
  );
  const open = toNumber(getField(fundamentals, ["open", "Open"]));
  const high = toNumber(getField(fundamentals, ["high", "High", "day_high"]));
  const low = toNumber(getField(fundamentals, ["low", "Low", "day_low"]));
  const prevClose = toNumber(getField(fundamentals, ["prev_close", "PrevClose", "previous_day_closing"]));
  const volume = toNumber(getField(quick, ["volume", "Volume"])) || toNumber(getField(fundamentals, ["volume", "Volume"]));
  const ytd = toNumber(getField(fundamentals, ["ytd_pct_chg", "YTD % Change", "ytdChange"]));

  return {
    symbol,
    name: getField(quick, ["name", "shortName"]) || symbol,
    last,
    change,
    percentChange,
    open,
    high,
    low,
    prevClose,
    volume,
    ytd,
    status: getField(quick, ["curmktstatus", "marketStatus"]) || "UNKNOWN",
    sourceUrl: `https://www.cnbc.com/quotes/${encodeURIComponent(symbol)}`
  };
}

function attachMetadata(assetsBySymbol) {
  return ASSETS.map((asset) => ({
    ...asset,
    ...assetsBySymbol[asset.symbol]
  }));
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

function averagePercent(items) {
  const values = items.map((item) => item.percentChange).filter((value) => value !== null);
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarize(assets) {
  const oil = assets.filter((asset) => asset.bucket === "oil" || asset.bucket === "oil-linked");
  const beneficiaries = assets.filter((asset) => asset.bucket === "beneficiaries");
  const broad = assets.filter((asset) => asset.bucket === "broad-market");
  const consumers = assets.filter((asset) => asset.bucket === "consumers");

  const wti = oil.find((asset) => asset.symbol === "@CL.1");
  const oilMove = sentimentFromChange(wti?.percentChange ?? averagePercent(oil));
  const beneficiaryAvg = averagePercent(beneficiaries);
  const consumerAvg = averagePercent(consumers);
  const broadAvg = averagePercent(broad);

  let headline = "Oil and cross-asset signals are mixed.";
  if (oilMove === "up") {
    headline = "Oil is pushing higher and the dashboard is checking who is keeping up.";
  } else if (oilMove === "down") {
    headline = "Oil is fading and the dashboard is checking where the pressure is spreading.";
  }

  let takeaway = "Leadership is scattered across the watchlist.";
  if ((beneficiaryAvg ?? 0) > 0 && (consumerAvg ?? 0) < 0) {
    takeaway = "Energy-linked names are outperforming while fuel-sensitive stocks are lagging.";
  } else if ((beneficiaryAvg ?? 0) < 0 && (consumerAvg ?? 0) > 0) {
    takeaway = "Oil-sensitive consumers are catching a break while energy producers are softer.";
  } else if ((broadAvg ?? 0) < 0 && oilMove === "up") {
    takeaway = "Higher oil is coinciding with a weaker broad-market tone.";
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

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const response = await fetch(quoteEndpoint(ASSETS.map((asset) => asset.symbol)), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OilImpactDashboard/1.0)"
      }
    });

    if (!response.ok) {
      throw new Error(`CNBC quote request failed with status ${response.status}.`);
    }

    const payload = await response.json();
    const rawQuotes =
      payload?.ExtendedQuoteResult?.ExtendedQuote ||
      payload?.QuickQuoteResult?.QuickQuote ||
      [];

    const assetsBySymbol = {};
    for (const rawQuote of rawQuotes) {
      const quote = normalizeQuote(rawQuote);
      if (quote.symbol) {
        assetsBySymbol[quote.symbol] = quote;
      }
    }

    const assets = attachMetadata(assetsBySymbol);
    const summary = summarize(assets);
    const scoreboard = assets.map((asset) => ({
      ...asset,
      oilRelationship: scoreAgainstOil(asset, summary.oilDirection)
    }));

    return sendJson(res, 200, {
      fetchedAt: new Date().toISOString(),
      source: {
        name: "CNBC quote service",
        quoteUrl: CNBC_QUOTE_URL,
        note: "CNBC market data on quote pages is delayed at least 15 minutes."
      },
      summary,
      groups: {
        oil: scoreboard.filter((asset) => asset.bucket === "oil" || asset.bucket === "oil-linked"),
        beneficiaries: scoreboard.filter((asset) => asset.bucket === "beneficiaries"),
        broadMarket: scoreboard.filter((asset) => asset.bucket === "broad-market"),
        consumers: scoreboard.filter((asset) => asset.bucket === "consumers")
      },
      scoreboard
    });
  } catch (error) {
    return sendJson(res, 500, {
      error: error.message || "Unable to load CNBC market data."
    });
  }
};
