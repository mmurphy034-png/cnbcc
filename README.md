# Oil Shock Dashboard

A lightweight dashboard that pulls delayed CNBC market data and frames how oil price moves may be affecting other markets and stocks.

## What it shows

- Oil benchmarks: `@CL.1`, `@LCO.1`, and `USO`
- Energy beneficiaries: `XLE`, `XOP`, `XOM`, `CVX`
- Broad market checks: `SPY`, `QQQ`
- Fuel-sensitive names: `DAL`, `UAL`, `FDX`
- A simple oil-impact matrix showing whether each asset is moving in a way that is tracking or diverging from the latest oil direction

## How it works

- The frontend calls `/api/market-data`
- That serverless route requests CNBC quote data from `https://quote.cnbc.com/quote-html-webservice/quote.htm`
- The response is normalized and grouped for the dashboard

## Deployment

This project is designed to work well on Vercel:

1. Create a Vercel project from this folder.
2. Deploy without any required environment variables.
3. Open the deployed URL.

## Notes

- CNBC quote data is delayed at least 15 minutes on quote pages.
- CNBC may change or restrict the quote endpoint over time, so this integration may need maintenance later.
- This environment does not have Node.js installed, so the app was authored but not run locally here.

## Sources used for the implementation

- CNBC quote pages for target symbols like [WTI crude](https://www.cnbc.com/quotes/%40CL.1), [Brent crude](https://www.cnbc.com/quotes/%40LCO.1), [XLE](https://www.cnbc.com/quotes/XLE), and [XOM](https://www.cnbc.com/quotes/XOM)
- CNBC quote modules page showing delayed quote fields: [apps.cnbc.com/company/quote/index.asp](https://apps.cnbc.com/company/quote/index.asp)

Inference note:

- The exact quote-webservice request shape used in `api/market-data.js` is inferred from CNBC's public quote behavior and widely documented examples of its quote endpoint. If CNBC changes that internal request shape, the server route will need to be updated.
