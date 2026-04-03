# MLB Betting Market Map

A lightweight dashboard for comparing MLB team performance with the way sportsbooks price those teams.

## What it measures

- `Actual win%`: wins divided by games played
- `Projected win%`: preseason win total divided by `162`
- `Playoff implied probability`: converted from American odds
- `Next-game implied probability`: converted from a representative moneyline

This helps answer the core question: how much of a team's current win percentage is actually reflected in betting apps?

## Current data model

The API uses an illustrative April 2026 sample rather than a live sportsbook feed. Each team entry contains:

- early-season record
- preseason win total
- playoff odds
- next-game moneyline
- a short interpretation of how the market is treating that team

## Key formulas

- Negative American odds to implied probability: `abs(odds) / (abs(odds) + 100)`
- Positive American odds to implied probability: `100 / (odds + 100)`
- Performance gap: `actual win% - projected win%`
- Market gap: `playoff implied probability - projected win%`

## Extending it

To turn this into a live tool, replace the sample `TEAMS` array in [api/market-data.js](/C:/Users/user/Documents/New%20project/api/market-data.js) with a feed from an MLB standings source and a sportsbook odds source, then keep the same formulas.

## Notes

- No environment variables are required in the current version.
- This environment does not have Node.js installed, so the app was updated but not run locally here.
