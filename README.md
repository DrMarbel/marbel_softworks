<!--
	Developer: Martin Barry
	Date Started: 01.27.2026
	Date Modified: 01.29.2026
-->

# Marbel Softworks

## Purpose

This repository is a small site for Marbel Softworks (MBSoftworks). It demonstrates
an animated background that resembles a printed circuit board (PCB) with light "wisps"
travelling along generated circuit traces, a responsive hero and navigation, and a
minimal, accessible layout for marketing pages.

## Changelog (high level)

All changes below were made on or before 2026-01-29.

- `index.html`
	- Added semantic header and footer structure.
	- Inserted a full-screen PCB canvas (`#pcb-canvas`).
	- Added an accessible hamburger button and `nav` role for mobile navigation.
	- Updated developer header comment.

- `assets/css/styles.css`
	- Reworked color palette to a blue/cyan PCB theme.
	- Added hero, navbar and footer styling consistent with the theme.
	- Implemented responsive styles for tablet/phone, including stacked footer and
		mobile nav layout.
	- Added hamburger and navlink visuals and hover states.

- `assets/js/pcb.js`
	- Created an optimized PCB animation script that:
		- Renders static traces to an offscreen canvas for stable redraws.
		- Generates multiple CPU origin nodes and many random paths.
		- Animates fewer, slower wisps that travel the full path and hold at the end.
	- Replaced earlier steampunk code; added comments and cleaned formatting.

- `assets/js/nav.js`
	- New lightweight, dependency-free script to toggle the mobile hamburger menu.
	- Accessible controls (aria-expanded, Escape to close, close on outside click).

- `legal/privacy.html`
	- Added a minimal placeholder privacy page and header comments.

- `README.md`
	- (This file) — added purpose, changelog, and credits.

## Development Credit

- Development & Design: Martin Belt

## Notes & Next Steps

- To preview: open `index.html` in a browser (no build step required).
- Tuning options: adjust `assets/js/pcb.js` variables (`BASE_WISP_SPEED`, path density)
	and `assets/css/styles.css` for color/contrast.

If you want, I can add a production-friendly build (minified JS/CSS), or wire in
placeholder content for the company pages.

