# PlayBreak — Casual Browser Games Platform

PlayBreak is a modern, dark-first casual arcade gaming platform built with React, TypeScript, Tailwind CSS, and Vite.

## Tech Stack & Setup
- **Framework:** React 19 + TypeScript
- **Bundler:** Vite
- **Styling:** Tailwind CSS v4
- **Audio:** Web Audio API synth effects
- **Routing:** Client-side hash router with full direct-link support

## Available Scripts

- `npm run dev` — Starts local development server on port 5173
- `npm run build` — Typechecks with TypeScript and compiles production build
- `npm run preview` — Locally previews production build

## Games Catalog (20 Games)
- **Classic Arcade & Retro:** Snake (Nokia classic edge wrap-around), Pong, Breakout, 2048, Minesweeper
- **Board & Tabletop:** Snakes & Ladders (3D tumbling dice, token hops), Ludo, Chess, Checkers, Connect 4, Tic-Tac-Toe, Dots & Boxes
- **Mind & Brain:** Sudoku, Math Rush, Memory Match, Reaction Speed Test, Word Quest
- **Casual & Party:** Rock Paper Scissors, Psych!, Pocket Tanks

## Base44 / Base Code Environment Setup
This repository is configured for seamless deployment and sandboxing within Base44 and Base Code:
1. Connect this repository to your Base44 workspace under **Base Code**.
2. Base Code uses the standard Vite configuration (`npm install` and `npm run dev`).
3. Pure client-side architecture preserves full game-feel without requiring external backend or database configurations.
