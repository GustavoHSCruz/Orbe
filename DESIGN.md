---
name: Orbe
description: A personal home for music and video, in graphite and coral.
colors:
  primary: "#ff647e"
  primary-hover-web: "#ff8ca0"
  primary-action-desktop: "#d92b4b"
  primary-action-desktop-hover: "#bf1d3d"
  primary-ink-web: "#201318"
  neutral-bg: "#19191c"
  neutral-surface: "#232326"
  neutral-sidebar: "#202023"
  neutral-text: "#f6f5f7"
  neutral-muted: "#a3a2aa"
  neutral-border: "rgb(255 255 255 / 8%)"
  neutral-hover: "rgb(255 255 255 / 5%)"
  web-copy: "#b5b0bb"
  unavailable-bg: "#33242b"
  unavailable-text: "#ff9aae"
  light-bg: "#fcfcfd"
  light-surface: "#fff"
  light-sidebar: "#f2f2f5"
  light-text: "#242428"
  light-muted: "#6d6d78"
  light-border: "rgb(30 30 40 / 9%)"
  light-accent: "#bf1d3d"
  light-hover: "rgb(30 30 40 / 4%)"
  light-focus: "#cf2546"
  control-text: "#f6f5f7"
  control-surface: "#36363c"
  control-surface-hover: "#43434b"
  control-subtle: "#2b2b30"
  control-subtle-hover: "#39393f"
  control-border: "#64646e"
  control-border-hover: "#898994"
  control-danger: "#ff9aae"
  control-danger-bg: "#35242b"
  control-danger-border: "#9b5364"
  light-control-text: "#242428"
  light-control-surface: "#fff"
  light-control-surface-hover: "#ebebf0"
  light-control-subtle: "#f5f5f8"
  light-control-subtle-hover: "#e8e8ee"
  light-control-border: "#a1a1ad"
  light-control-border-hover: "#747480"
  light-control-danger: "#a91c39"
  light-control-danger-bg: "#fff4f6"
  light-control-danger-border: "#cb7d8e"
typography:
  display-web:
    fontFamily: "'Plus Jakarta Sans Variable', sans-serif"
    fontSize: "clamp(48px, 5.65vw, 79px)"
    fontWeight: 650
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  display-web-mobile:
    fontFamily: "'Plus Jakarta Sans Variable', sans-serif"
    fontSize: "clamp(33px, 7.9vw, 55px)"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  headline-web:
    fontFamily: "'Plus Jakarta Sans Variable', sans-serif"
    fontSize: "clamp(32px, 3.65vw, 49px)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  headline-desktop:
    fontFamily: "'Plus Jakarta Sans Variable', 'Segoe UI', sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.04em"
  body-web:
    fontFamily: "'Plus Jakarta Sans Variable', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  body-desktop:
    fontFamily: "'Plus Jakarta Sans Variable', 'Segoe UI', sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  label-web:
    fontFamily: "'Plus Jakarta Sans Variable', sans-serif"
    fontSize: "14px"
    fontWeight: 750
    lineHeight: 1.4
  label-desktop:
    fontFamily: "'Plus Jakarta Sans Variable', 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 600
  label-desktop-compact:
    fontFamily: "'Plus Jakarta Sans Variable', 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 600
  eyebrow-desktop:
    fontFamily: "'Plus Jakarta Sans Variable', 'Segoe UI', sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.13em"
rounded:
  control: "8px"
  search: "9px"
  artwork: "10px"
  container: "12px"
  feature: "15px"
  player: "16px"
spacing:
  inline: "8px"
  control: "12px"
  compact: "16px"
  group: "20px"
  content: "24px"
  web-gutter: "48px"
  web-gutter-tablet: "32px"
  web-gutter-mobile: "20px"
  desktop-content-inset: "36px"
components:
  button-primary-web:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-ink-web}"
    typography: "{typography.label-web}"
    rounded: "{rounded.control}"
    padding: "15px 23px"
  button-primary-web-hover:
    backgroundColor: "{colors.primary-hover-web}"
  button-primary-desktop:
    backgroundColor: "{colors.primary-action-desktop}"
    textColor: "#fff"
    typography: "{typography.label-desktop}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-primary-desktop-hover:
    backgroundColor: "{colors.primary-action-desktop-hover}"
  button-secondary-desktop:
    backgroundColor: "{colors.control-surface}"
    textColor: "{colors.control-text}"
    typography: "{typography.label-desktop}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-ghost-desktop:
    backgroundColor: "{colors.control-subtle}"
    textColor: "{colors.control-text}"
    typography: "{typography.label-desktop}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-secondary-desktop-hover:
    backgroundColor: "{colors.control-surface-hover}"
  button-ghost-desktop-hover:
    backgroundColor: "{colors.control-subtle-hover}"
  button-destructive-desktop:
    backgroundColor: "{colors.control-danger-bg}"
    textColor: "{colors.control-danger}"
    typography: "{typography.label-desktop}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-secondary-desktop-light:
    backgroundColor: "{colors.light-control-surface}"
    textColor: "{colors.light-control-text}"
  button-secondary-desktop-light-hover:
    backgroundColor: "{colors.light-control-surface-hover}"
  button-ghost-desktop-light:
    backgroundColor: "{colors.light-control-subtle}"
    textColor: "{colors.light-control-text}"
  button-ghost-desktop-light-hover:
    backgroundColor: "{colors.light-control-subtle-hover}"
  button-destructive-desktop-light:
    backgroundColor: "{colors.light-control-danger-bg}"
    textColor: "{colors.light-control-danger}"
  button-small-desktop:
    typography: "{typography.label-desktop-compact}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "36px"
  button-icon-desktop:
    rounded: "{rounded.control}"
    width: "40px"
    height: "40px"
  button-onboarding-desktop:
    height: "48px"
  search-desktop:
    backgroundColor: "{colors.neutral-hover}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.search}"
    padding: "9px 12px"
  nav-item-desktop:
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.control}"
    height: "38px"
  collection-count:
    textColor: "{colors.neutral-muted}"
  preview-web:
    rounded: "{rounded.container}"
    width: "100%"
---

# Design System: Orbe

## Overview

**Creative North Star: "Sua coleção, na sua órbita"**

Orbe gives a personal music and video collection a recognizable home. Its established identity combines graphite surfaces, a coral orbital mark and Plus Jakarta Sans. The interface uses quiet neutral layers, clear type and coral interaction cues; media artwork supplies much of the visual variety.

This document records the implemented shared identity and the two surfaces that use it. The desktop is a dense, persistent library workspace with dark and light themes. The public web page uses the same identity with larger type, wider spacing and real desktop captures. Its centered opening, chapter sequence and editorial sections belong to that landing surface; they are not requirements for every future screen. The direction contract remains in `.impeccable/surfaces/orbe-landing.md`.

**Key Characteristics:**
- Graphite neutrals with a recognizable coral accent.
- One variable sans family across brand, content and controls.
- Soft rectangular controls and circular playback geometry.
- Media-led content with restrained borders and selective elevation.
- A supported light desktop theme alongside the shared dark identity.

## Colors

The palette places warm coral against closely spaced graphite neutrals. The frontmatter records normative values; `packages/brand/tokens.css` supplies shared identity tokens, while the shared action-control section of `src/renderer/styles.css` supplies desktop control and danger tokens.

### Primary

- **Orbital coral** (`primary`): the shared logo, web primary actions, highlighted headline text and desktop interaction cues.
- **Soft coral** (`primary-hover-web`): the web action hover state.
- **Action crimson** (`primary-action-desktop` and its hover token): the desktop button component uses a deeper fill with white text. Keep this distinction when extending that component.
- **Unavailable rose** (`unavailable-bg`, `unavailable-text`): the landing's truthful installer-unavailable status, not a second general action palette.

### Neutral

- **Graphite canvas**, **raised graphite** and **sidebar graphite** (`neutral-bg`, `neutral-surface`, `neutral-sidebar`): the page, contained surfaces and desktop navigation layer.
- **Soft white** and **muted ash** (`neutral-text`, `neutral-muted`): primary content and secondary desktop copy. The web uses additional subdued editorial copy (`web-copy`).
- **Quiet borders** and **hover wash** (`neutral-border`, `neutral-hover`): low contrast separation and general interactive surface feedback.
- **Defined desktop controls** (`control-*`, with `light-control-*` overrides): dedicated text, surface, subtle surface and visible border roles distinguish buttons at rest in both themes. Hover has explicit surface and border values. These action tokens are stronger than the general surface borders.
- **Destructive rose** (`control-danger`, `control-danger-bg`, `control-danger-border`, with their light equivalents): red text, tinted fill and a visible boundary identify removal actions independently of the coral primary action.
- **Warm action ink** (`primary-ink-web`): text and icons on the coral web button.
- **Light desktop family** (`light-*`): pale canvas, white surfaces, cool light sidebar, dark ink and muted copy. The desktop maps its semantic surface, text, border, accent and hover variables to these values when `data-theme='light'` is active. Its focus and primary action colors have explicit overrides. The landing currently uses only the dark palette.

**The Shared Identity Rule.** Reuse the shared brand tokens for the dark identity. Preserve the desktop's semantic theme mapping when adding app surfaces.

## Typography

**Display and body font:** Plus Jakarta Sans Variable. The shared stack falls back to sans-serif; the desktop additionally names Segoe UI. There is no separate display or mono brand family.

Rounded geometric letterforms carry both the friendly brand and the functional library UI. Weight, size and spacing establish hierarchy. Display headings use tight tracking; smaller interface copy keeps ordinary spacing. The implementation uses distinct responsive roles rather than a single fixed ratio.

### Hierarchy

- **Web display:** `display-web`, switching to `display-web-mobile` at the mobile breakpoint. The landing headline is balanced and uses coral for its second line.
- **Web headline:** `headline-web` is the default section heading. Specific FAQ, closing and editorial headings use their own observed sizes; do not force them into the desktop title role.
- **Desktop headline:** `headline-desktop` is the page heading; its supporting paragraph uses `body-desktop` and a maximum width of 65ch.
- **Body:** `body-web` establishes the page baseline. Most supporting landing paragraphs are 13–15px; the opening paragraph is 17px, becoming 14px on mobile. Desktop supporting copy is generally 14px, with smaller metadata.
- **Labels:** web calls to action use `label-web`; desktop default button labels use `label-desktop`, while small buttons use `label-desktop-compact`. Sidebar category captions are sentence case, while the listening-page eyebrow uses `eyebrow-desktop` in uppercase.

## Layout

Shared spacing values in the frontmatter are observed reusable distances, not a claim that every measurement follows a strict scale. Keep brand consistency while fitting the density of the current surface.

**Web surface.** The centered container is `min(1200px, calc(100% - 96px))`. At widths up to 1000px it becomes `calc(100% - 64px)`; up to 720px it becomes `calc(100% - 40px)`. The header changes from 108px to 84px on mobile. Broad sections typically have 100–125px of vertical breathing room on large screens and 70–78px on mobile. Desktop chapter, tools, integration and FAQ columns stack at the mobile breakpoint. Hero actions stack; header navigation becomes a disclosed menu with a 44px toggle. The web page remains a scrolling document.

**Desktop surface.** The app occupies the window, with a persistent 224px sidebar, 70px top bar, independently scrolling content and a fixed mini-player. Main content is capped at 1400px with 36px horizontal insets. At widths up to 1150px the sidebar is 200px, insets become 26px and the four-column library becomes three columns. Height-specific rules at 760px compact headings, shortcuts and controls to retain usable workspace. Preserve these desktop constraints; the landing's mobile layout does not imply a mobile desktop app.

## Elevation & Depth

The ordinary workspace is primarily tonal: subtle borders and neighboring surface colors separate regions, and ordinary premium cards have no shadow. Floating players, menus and the landing's main screenshot use shadows to establish their specific layer. Artwork and the expanded player also use gradients and atmospheric color already present in the desktop; a blanket ban on gradients would misdescribe the system.

### Shadow Vocabulary

- **Web application preview:** `0 30px 70px #0004`, attached to the large screenshot.
- **Desktop mini-player:** `0 8px 35px #00000026`, for the floating playback surface.
- **Desktop overflow menu:** `0 12px 35px #00000040`, for the library action menu.
- **Selected view switch:** `0 1px 5px #00000015`, a small local active-state lift.

Motion belongs to state changes and playback: desktop controls transition over 0.18s, web actions over 0.2s, while download progress and expanded-player atmospheres have dedicated animation. Respect the existing reduced-motion overrides. These motion values live in the sidecar because the token format has no motion group.

## Shapes

Controls are softly rectangular. Web actions and sidebar items use the control radius; search fields and artwork have their own slightly larger radii. Desktop component-library buttons use the control radius, and the mini-player uses the player radius. Playback controls and progress orbits are circular. Library covers are square with softened corners; list artwork is more compact. Borders are normally a single subtle stroke.

The canonical logo is `packages/brand/mark.svg`: a simple coral ring crossed by an open orbital stroke, in a square 64-unit view box. Reuse this asset at its native aspect ratio; preserve its mask, gap and stroke silhouette. Web lockups pair it with the lowercase wordmark; the desktop pairs it with “Orbe.” Observed display sizes include 32–40px in web navigation, 34px in the desktop sidebar, and larger standalone placements on the landing. No formal clear-space or minimum-size standard has been established.

## Components

### Buttons

Web primary actions are coral with warm dark ink, the control radius and compact bold labels. The normal button has a minimum height of 54px; the compact header variant is 42px with 11px × 16px padding. Hover lightens the fill and lifts the action by 2px. The unavailable installer is a status with rose colors and no hover lift.

Desktop actions have a visible boundary and fill at rest. The shared component uses the control radius, a single-pixel border, default labels at 14px/600 and a 20px line height. Default buttons are 44px high with 20px horizontal padding; small buttons are 36px high with 12px horizontal padding and the compact 13px label; icon buttons are 40px square. Preserve existing contextual dimensions for compact library, toolbar and playback controls rather than treating these defaults as a universal minimum.

- **Primary:** action crimson with matching border and white text; hover deepens both fill and border using the desktop action-hover token in both themes.
- **Secondary:** the semantic control surface, text and border; hover uses the corresponding surface-hover and border-hover tokens. A small structural shadow (`0 1px 2px #00000014`) supports default and secondary controls.
- **Tertiary:** the existing `ghost` API now renders a subtle filled, outlined button with semantic control text and no shadow. Hover uses the subtle-hover surface and border-hover tokens; keep this low-emphasis action visibly actionable at rest.
- **Destructive:** the semantic danger text, tinted background and border, with no shadow. Hover uses the danger text color for the border and mixes 16% danger into the danger background. Use it for removing a library record and its confirmation.
- **Focus, press and disabled:** keyboard focus is a 2px semantic focus outline offset by 3px. Enabled pressed buttons scale to 0.985. Disabled buttons suppress pointer interaction, use 0.42 opacity, remove the shadow and retain their resting fill. Toggle selection uses `aria-pressed`, an accent border/text and a 12% accent mix into the subtle control surface.
- **Playback:** the mini-player keeps its circular inverse play/pause control: semantic text as fill and semantic canvas as icon color. Its explicit hover mixes 88% text with canvas, preserving contrast in both themes. Expanded playback retains its white primary fill and dark ink, with a light-gray hover. These are playback exceptions to the rectangular action pattern.

**The Recognizable Action Rule.** Desktop actions remain visibly bounded and filled before hover; preserve semantic primary, secondary, tertiary and destructive hierarchy in dark and light themes.

**The Related Actions Rule.** Group actions by the decision they support, with 8px within a compact group and 12px between recovery groups. Keep file/folder location together; place redownload and record removal in a separate group, aligned to the end when space permits and below at compact widths. Confirmation copy occupies its own full row above the choices.

First entry uses the same graphite/coral controls. Present the two main entry choices as an equal-width pair with a 12px gap and 48px height: primary file import, secondary link download. A divided footer separates optional preferences from these start actions; subsequent steps place back/skip and continue/open on opposite ends. The ordinary step and footer actions retain the default 44px height. At narrow widths the entry choices stack and the preferences footer becomes a column. Preserve the native import, directory selection, completion and download behavior.

### Inputs / Fields

The global desktop search is a compact bordered hover-wash surface, with the search radius, 9px × 12px padding and 14px input text. Its container owns the accent focus outline; the input itself is transparent. Other desktop compound inputs have a border shift on focus. The public landing has no text-entry form.

### Navigation

Desktop navigation uses 38px rows with 14px labels, coral icons and a softly tinted selected surface. The current page is communicated with `aria-current`. Hover uses the semantic hover wash. Web navigation is a low-density text row that becomes a disclosed vertical menu on mobile; links turn coral on hover.

Keyboard focus is visible: the web uses a 2px coral outline offset by 6px; desktop controls generally use 2px outlines with offsets appropriate to their component, including a 2px offset on the global search. The light desktop has its own focus color.

### Cards / Containers

Ordinary desktop containers use semantic surfaces and restrained borders; library grid entries are open artwork-and-text groups with no enclosing card fill, border or shadow. List entries use separators and a hover wash. Avoid adding a filled card around each grid item by default. The landing's main screenshot is a bordered, rounded, elevated preview; smaller chapter captures use quieter framing.

### Tags / Counts

The collection count is small muted inline metadata with an icon and a 7px gap, not a prominent badge. Selection controls such as the library view switch communicate state through a small surface change and coral icon. There is no independent global chip component in the current component library.

### Product chapters and disclosures

The landing chapter selector uses border-separated rows, coral selection and an arrow cue; selecting a chapter changes both copy and its real application screenshot. It implements tab semantics, roving focus and arrow/Home/End keyboard movement. FAQ items use native disclosures, a coral open state and a rotating chevron. These are landing patterns; preserve their interaction semantics when reusing them.

## Do's and Don'ts

### Do:
- **Do** use the shared orbital asset, graphite/coral tokens and Plus Jakarta Sans across web and desktop.
- **Do** keep desktop surfaces and controls connected to semantic light/dark theme variables.
- **Do** give desktop actions visible resting borders and fills, with clear semantic variants and grouped related choices.
- **Do** preserve visible focus, keyboard navigation and reduced-motion behavior when extending existing patterns.
- **Do** let real media and application captures carry the visual content, with demonstration media labeled where used.
- **Do** fit spacing and typography to the surface: spacious web presentation and compact desktop workspace.

### Don't:
- **Don't** distort or redraw the shared orbital mark independently on each surface.
- **Don't** turn the landing's centered hero, chapter sequence or editorial layout into global screen requirements.
- **Don't** remove the desktop light theme when applying the shared dark identity.
- **Don't** add enclosing filled cards to library grid items that currently use open artwork-and-text composition.
- **Don't** style the unavailable installer status as an enabled download control.
