# Social preview documentation verification

Ordinary extension of the incumbent identity; no new visual world or durable system change. `DESIGN.md` and `.impeccable/design.json` were checked and preserved. The image composition and fixed output dimensions belong to `apps/web/.impeccable/surfaces/social-preview.md`, not to the global token system.

Evidence checked: `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `packages/brand/tokens.css`, `packages/brand/mark.svg`, `packages/brand/social-preview.html`, `scripts/generate-social-preview.mjs`, `apps/web/index.html`, `tests/web/social-preview.spec.ts`, `docs/landing-page.md`, the image origin sidecar, detector output and the finish review's final `ship` verdict. Opened the actual shipping PNG (1200×630) and `.impeccable/review/social-preview/embed-400.png` (400×210). Both show the full headline, intact orbital mark and readable category descriptor without clipping or collisions. This is reduced-image inspection, not a captured live social-platform embed.

- Palette: existing graphite canvas (`#19191c`), coral (`#ff647e`), soft white (`#f6f5f7`), muted ash (`#a3a2aa`) and shared quiet border; no new color primitives.
- Type: existing self-hosted Plus Jakarta Sans Variable. Scoped image sizes are wordmark 43px/750, headline 77px/650, category 36px/450 and domain 20px/500; the headline uses 1.13 line height and tight tracking. The category's increase from 23px to 36px resolves the scored small-image finding and reads at approximately 12px in the 400px reduction.
- Geometry: the exact canonical 64-unit orbital SVG is reused at its native aspect ratio for the 52px lockup mark and 330px signature; its ring, open orbital stroke, mask and gap are preserved.
- Layout and depth: a flat 1200×630 graphite field, generous insets, left-aligned two-line headline, right-hand orbit and quiet bottom divider. These fixed raster measurements are surface-specific, not reusable spacing tokens or responsive-screen requirements.
- Named rules: Shared Identity applies directly. Recognizable Action and Related Actions remain desktop interaction rules; this static image introduces no action component or interaction rule.

The generator embeds the local font and shared SVG as data URLs in the HTML rendered by Chromium, waits for fonts, and exports at device scale 1. `apps/web/public/orbe-social-v1.png.json` records its code-native origin and exact source/generator paths. The shipping PNG also carries embedded `impeccable:prompt` origin text, independently verified after fully loading the PNG, including its trailing text chunk. This is an original composition of existing project assets; no generated illustration or reconstructed product UI is present. The implementation pass reported a provenance scan of five shipping rasters with zero missing records. The generator itself creates the sidecar; regenerating the PNG requires repeating the separate embedded-origin step before shipping.

Initial HTML supplies absolute Open Graph and Twitter image URLs, PNG type and dimensions, Portuguese alternative text, `summary_large_image`, `pt_BR`, and the canonical public URL `https://useorbe.vercel.app/`. The metadata is available before JavaScript runs. The request-based test verifies raw HTML metadata, a matching served image, PNG signature, content type and dimensions. Build, lint and four Playwright passes were reported by the implementation pass; they were not rerun by this documentation-only pass. `docs/landing-page.md` already explains regeneration, deployment, public URL changes and social-preview caching.

Drift not canonized or repaired: the detector is a historical pre-fix snapshot whose 23px category advisory no longer describes the 36px source; its remaining fixed-image size advisories do not justify extending the global type ramp. Existing `eyebrow-desktop` documentation and the sidecar's historical “Download em breve” sample also remain outside this extension. They are not approval for new eyebrows or requirements for this static image. No implementation, system file or unrelated worktree change was repaired by this pass.

System-file preservation evidence (SHA-256):

- `DESIGN.md`: `55F5B51C758D41BCA2F4E27227B51ADE019D61FC18AED671EB1A096FB907A3FE`.
- `.impeccable/design.json`: `78B2A56E654822620B095E2A387E0872D776D9F5D8CEE750586F48B86D378960`.
