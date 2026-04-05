# RootTrace Novus

A computational historical linguistics environment for reconstructing ancestral linguistic forms (Proto-forms) from cognate sets using Bayesian inference, MCMC simulations, and AI-driven analysis.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express.js (Node.js) serving the SPA + Vite middleware in dev
- **Styling**: Tailwind CSS v4
- **Editor**: CodeMirror via `@uiw/react-codemirror`
- **Package Manager**: npm

## Development

Run `npm run dev` to start the server (Express + Vite dev middleware) on port 5000.

## Project Structure

- `App.tsx` — Main React entry point with primary layout and state
- `server.ts` — Express server (dev: Vite middleware; prod: serves dist/)
- `services/` — Core linguistic algorithms (engine, phonetics, SCA parser/rules)
- `src/components/` — React UI components
- `public/` — Static assets and linguistic data (phoible_segments.json)
- `mcmc.worker.ts` — Web Worker for heavy MCMC computations
- `types.ts` — Centralized TypeScript types

## Key Features

1. Proto-Reconstructor: Bayesian reconstruction of ancestral forms
2. Sound Shift Creator: Custom sound law sandbox
3. Auto-Evolver: AI inference of sound laws between lexicons
4. Phylogenetic Trees: Interactive SVG linguistic descent visualization

## Setup Notes

- Native binary packages (`@rollup/rollup-linux-x64-gnu`, `lightningcss-linux-x64-gnu`, `@tailwindcss/oxide-linux-x64-gnu`) must be manually extracted due to npm optional dependency resolution issues in the Replit environment.
- Workflow: `npm run dev` on port 5000 (webview)
- Deployment: `npm run build` then `node dist/server.cjs`
