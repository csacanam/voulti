# Voulti brand assets

The mark is a green ring around a check-shaped V. The wordmark sets "Voulti"
next to it in a bold neo-grotesque.

Brand green is `#288E5B`. Wordmark ink is `#0A0B0C`.

## The palette

| step | hex | on white | where it goes |
| --- | --- | --- | --- |
| 50 | `#E4EEE7` | 1.19:1 | tinted panels |
| 100 | `#D4E9DB` | 1.27:1 | step markers, soft fills |
| 200 | `#B7DEC5` | 1.47:1 | borders on tinted panels |
| 300 | `#8DC8A3` | 1.92:1 | |
| 400 | `#5AAC7D` | 2.75:1 | |
| **500** | **`#288E5B`** | 4.11:1 | **the logo, and only the logo** |
| **600** | **`#017B49`** | 5.34:1 | **primary buttons, links, focus rings** |
| 700 | `#026A3E` | 6.70:1 | hover on 600 |
| 800 | `#015732` | 8.71:1 | gradient ends |
| 900 | `#004728` | 10.87:1 | |
| 950 | `#002B16` | 15.47:1 | |

Interactive things use **600**, not the logo green. The logo green only clears
4.11:1 on white, and white text on it fails WCAG AA; 600 is a step darker and
clears 5.34:1, which is where the violet it replaced sat (5.70:1).

The ladder borrows Tailwind's violet lightness steps and slides them so 500
lands exactly on the logo. That is why the palette this replaced maps across
one-for-one — `violet-600` became `brand-600` and nothing changed weight.

Green also means *paid* in this product. Status badges deliberately keep
Tailwind's own `green-*` rather than the brand family, so "this invoice is
paid" never reads as "this is a button". Anything new that means success
should follow that, not `brand-*`.

Defined in `apps/checkout/tailwind.config.js` (v3) and in the `@theme` block of
`apps/{merchant,miniapp}/app/globals.css` (v4).

| File | What it is |
| --- | --- |
| `voulti-mark.svg` | The mark, vector, 512 viewBox. The source every icon here is drawn from. |
| `voulti-mark.png` | The mark at 1024px, transparent background. |
| `voulti-wordmark.png` | Mark + wordmark, 636×174, transparent background. For light backgrounds. |
| `voulti-wordmark-white.png` | The same in white, for dark backgrounds. |
| `voulti-og.png` | 1200×630 social card. |

## Using it in an app

Do not import from this folder at build time — each app serves its own copy
under `public/`, and Next's `app/icon.svg` and `app/apple-icon.png` file
conventions need the file to physically live in the app. The copies in the apps
are generated from `voulti-mark.svg`; if the mark ever changes, change it here
first and re-derive them.

In the UI, prefer the `VoultiLogo` component each app ships over an `<img>`:
it inlines the SVG and takes its colour from `currentColor`, so it works on any
background.

## Provenance

`voulti-mark.svg` was traced from `contracts/core/docs/logo-voulti.png`, the
original 500px raster of the mark, and matches it to under 1% of pixels. The
ring is drawn analytically (it is a true circle: r=218.4, stroke 43.2 in the
512 viewBox); the two arms are the traced outline.

The wordmark's lettering is set in Arial Bold rather than the original raster's
typeface, which we do not have the source for. It is a close match — same
weight, same round dot on the `i` — and it only appears in generated rasters
(social cards, e-mail headers). Anywhere the UI can render live text, it does,
using the app's own font next to the vector mark.
