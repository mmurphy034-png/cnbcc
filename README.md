# Oil Shock Dashboard

A lightweight dashboard that tracks oil-linked ETFs and shows how their moves may be affecting other markets and stocks.

## Data source

This app now uses the official Twelve Data quote API:

- Quote endpoint: [https://api.twelvedata.com/quote](https://api.twelvedata.com/quote)
- Docs: [https://twelvedata.com/docs](https://twelvedata.com/docs)
- Bulk requests support: [https://support.twelvedata.com/en/articles/5203360-bulk-requests](https://support.twelvedata.com/en/articles/5203360-bulk-requests)

## What it shows

- Oil proxies: `USO`, `BNO`
- Energy beneficiaries: `XLE`, `XOP`, `XOM`, `CVX`
- Broad market checks: `SPY`, `QQQ`
- Fuel-sensitive names: `DAL`, `UAL`, `FDX`
- An oil-impact matrix showing whether each asset is tracking or diverging from the current oil direction

## Setup

Add this environment variable in Vercel:

`TWELVE_DATA_API_KEY`

## Notes

- Twelve Data coverage and freshness depend on your plan and each symbol's eligibility.
- This environment does not have Node.js installed, so the app was updated but not run locally here.
