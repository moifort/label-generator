# Gridfinity Label Generator

Design printable Gridfinity bin labels in the browser and export them as a ready-to-slice 3MF plate.

**→ [moifort.github.io/label-generator](https://moifort.github.io/label-generator/)**

![Gridfinity Label Generator](assets/screenshot.png)

## Features

- **Icon library across 7 categories** — screws, nuts, electrical, magnets, rack M6, plugs and nails. Screws combine a drive type (hex, Torx, Pozidriv, Phillips, square, slotted…) with a head type, split between machine screws and wood screws.
- **Free text** — any label text, rendered with an embedded font so the result is identical on every machine.
- **Adjustable size** — label width from 1 to 3 Gridfinity units, and configurable text height (4.2 mm by default).
- **Printer-aware plate** — pick your Bambu machine (A, P, X and H series) and the labels are arranged for that plate size, with a warning when a row runs past the back edge.
- **Multi-label plate** — add several labels, adjust quantities, edit or clear them, then export the whole plate in one go.
- **Two-colour 3MF export** — the base and the raised text are separate parts assigned to extruders 1 and 2, so Bambu Studio picks up the colour change with no manual setup.
- **Live 3D preview** — see the label as it will print before committing to it.
- **Single self-contained file** — `index.html` embeds every dependency and the font, so it runs offline with no build step and no install.

## Printing

Labels print flat, no supports:

| | |
|---|---|
| Base | 0.64 mm (8 layers at 0.08 mm) |
| Raised text | 0.32 mm (4 layers) |
| Layer height | 0.08 mm for the sharpest text, up to 0.20 mm |

The tabbed Gridfinity format clips into the bin rails.

## Running it locally

Clone the repository and open `index.html` in a browser — that is all there is to it. No server, no dependencies, no build.

## Deployment

The site is served by GitHub Pages from `main`. Any push to `main` redeploys it, and the date badge in the header follows automatically.

## Credits

Designed for the [Ultimate Gridfinity Bins Collection](https://makerworld.com/fr/models/47599-ultimate-gridfinity-bins-collection-parametric#profileId-49320). Big thanks to [Alexandre Chappel](https://www.alch.shop).
