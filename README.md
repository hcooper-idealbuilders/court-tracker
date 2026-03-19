# Court Tracker

A lightweight Windows system-tray utility for tracking whose court the ball is in across multiple contacts or ongoing conversations.

## What it does

Each entry represents a back-and-forth relationship — a deal, a project, a conversation. A toggle switch shows who currently has the ball: you (blue) or them (orange). Flip it with one click whenever the ball moves.

## Features

- **Court toggle** — one-click pill switch, color-coded blue (your court) / orange (their court)
- **Priority system** — mark entries urgent (red), medium (yellow), or low (green); list auto-sorts red → yellow → green → unprioritized
- **Priority accent** — the selected priority color appears as a right-side border stripe on each card, mirroring the court color on the left
- **Notes** — attach free-text notes to any entry; URLs are auto-detected and open in the default browser
- **Hover popup** — hovering an entry slides a popup in from the right showing notes, priority selector, and edit timestamp
- **Inline note editing** — click the pencil icon to expand a textarea; priority can also be set here
- **Persistent storage** — data saved automatically to the user's app-data directory
- **Single instance** — clicking the tray icon a second time focuses the existing window

## Tech stack

- [Electron](https://www.electronjs.org/) (v33) — frameless, tray-anchored window
- Vanilla JS + CSS — no frontend framework
- Node `fs` for JSON persistence

## Getting started

```bash
npm install
npm start
```

The app lives in the system tray. Click the tray icon to open/close the window.

## Data storage

Entries are saved to `%APPDATA%\court-tracker\court-tracker.json` and persist across restarts.
