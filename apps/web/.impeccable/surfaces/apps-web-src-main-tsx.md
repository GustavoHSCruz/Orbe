---
version: 1
slug: "apps-web-src-main-tsx"
primary_target: "apps/web/src/main.tsx"
related_targets: ["apps/web/src/styles.css"]
---

# Orbe landing page

Mode: Persuade. Audience: Portuguese-speaking Windows and Linux users who want one home for their local music and videos. Primary action: use Baixar Orbe to reach Escolha seu sistema, then choose the appropriate installer. The user supplied public GitHub Releases URLs for Windows EXE, Linux AppImage and DEB. Missing or invalid URLs show unavailable text for that format only; macOS and Android/iOS remain unavailable without release promises.

## Direction contract

THESIS: A personal collection with a recognizable home. Product screenshots prove the promise. The user explicitly requests the existing desktop design, a simple beautiful logo, and a separate Vercel-ready landing project.

OWN-WORLD: Preserve the desktop's graphite surfaces, coral accent and Plus Jakarta Sans. Introduce a flat orbital symbol, shared as SVG and design tokens. Keep factual copy and existing capability boundaries.

STORY: Understand the library as the core; explore library, player and playlists; discover downloads, conversion and optional services; resolve questions; find installer availability.

FIRST VIEWPORT: Compact brand navigation, centered two-line headline in white and coral, one main action, brief Windows context and the top of a large real application capture. Avoid speculative testimonials, counters or commercial claims.

FORM: Code-led extension of an established interface. No seed or comp selection: the user pinned the existing visual identity and explicitly delegated the name and logo choice. Signature interaction: keyboard-accessible product chapters swap real screenshots and explanatory copy.

DOWNLOAD EXTENSION: Preserve the incumbent graphite/coral palette, Plus Jakarta Sans, open layouts and border-separated rows. An asymmetric two-column section joins an orbital mark and large left-aligned heading to Windows/Linux installer rows, with quieter macOS/mobile availability beneath. At mobile widths the introduction precedes the rows in one column. Download actions are ordinary accessible links to the user-supplied release assets; there is no modal or automatic download. Keep platform-specific installation notes visible and retain the legacy Windows environment variable as a fallback. No new visual system or raster assets are required.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Evidence

Sources: PRODUCT.md, README.md, src/renderer/app, scripts/capture-brand-preview.mjs. Four real desktop screenshots with original geometric demo media. Capture filenames are descriptive; all media are explicitly labeled demonstration content on the page. No deployment was requested from this session: the user intends to publish to Vercel.
