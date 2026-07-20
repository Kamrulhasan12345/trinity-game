# Kickoff Trinity — Brand & Assets

## Color palette

The game is a dark "neon clockwork" look: a deep indigo field, warm brass UI, and
three neon accent colours — one per ball / goal (the "trinity").

| Role | Hex | Notes |
| --- | --- | --- |
| Background (deep) | `#0a0818` | Canvas / darkest field |
| Background | `#0d0a1f` | Page background |
| Panel | `#171232` | Cards, raised surfaces |
| Panel line | `#2a2350` | Borders, dividers |
| Ink (text) | `#e8e4ff` | Primary text |
| Muted text | `#8a82c0` | Secondary text, hints |
| Brass | `#c9a86a` | UI accent, headings, buttons |
| Brass (dim) | `#6b5836` | Ticks, inactive brass |
| Cyan (Ball 1) | `#39d6ff` | Accent / links |
| Magenta (Ball 2) | `#ff4fd8` | Accent |
| Yellow (Ball 3) | `#ffd23f` | Accent / win gold |

## itch.io theme mapping

In the itch.io editor → **Edit theme**, use:

| itch.io field | Hex |
| --- | --- |
| Background | `#0d0a1f` |
| Text | `#e8e4ff` |
| Link color | `#39d6ff` |

Recommended extras (if using the "advanced"/CSS theme):

- Secondary / heading accent: `#c9a86a` (brass)
- Buttons / call-to-action: `#c9a86a` background, `#0a0818` text
- Borders: `#2a2350`
- Set the page to the **dark** base theme so the neon accents read correctly.

## Assets

All art is authored as editable SVG (source of truth) and rasterized to 2× PNG
for upload. The PNGs are ready to use; regenerate with `scratchpad/rasterize.mjs`.

| File | Size (PNG) | Use |
| --- | --- | --- |
| `logo.svg` / `logo.png` | 1920×600, transparent | Game logo on dark surfaces |
| `cover.svg` / `cover.png` | 1260×1000 (630×500 @2×) | itch.io **cover image** |
| `banner.svg` / `banner.png` | 2400×1260 (1200×630 @2×) | itch.io page header / social / OpenGraph |
| `../public/favicon.svg` (+ `favicon-32.png`, `apple-touch-icon.png`, `favicon-512.png`) | 64px source → 32/180/512 | Browser tab icon — trinity orbs on a dark tile; ships from `public/` |

Note: the logo PNG is transparent and designed for **dark** backgrounds. The cover
and banner are self-contained (own background). itch.io covers must be raster
(PNG/JPG) — upload the `.png`, not the `.svg`.
