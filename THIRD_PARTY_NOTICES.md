# Third-party notices

Sudoku PWA is distributed under the GNU General Public License, version 3 or any later version (`GPL-3.0-or-later`). The production bundle also includes third-party software and icon artwork listed below.

## Included GPL-covered components

| Component | Version | Role in this project | License | Source |
| --- | --- | --- | --- | --- |
| `Hodoku` | `2.3.2` | HoDoKu logical difficulty rating used by `src\utils\generators\hodoku.ts` | `GPL-3.0` | <https://github.com/PseudoFish/Hodoku> |
| `hodoku-core-js` | `1.1.0` | Port of above component to JS used in `src\utils\generators\hodoku.ts` | `GPL-3.0` | <https://github.com/starxmaker/Hodoku> |

## Other shipped runtime packages

| Package | Version | Role in this project | License | Source |
| --- | --- | --- | --- | --- |
| `react` | `18.3.1` | UI runtime | MIT | <https://github.com/facebook/react> |
| `react-dom` | `18.3.1` | DOM renderer for the React app | MIT | <https://github.com/facebook/react> |
| `@khmyznikov/pwa-install` | `0.6.3` | Install prompt custom element used on the home screen | MIT | <https://github.com/khmyznikov/pwa-install> |
| `web-haptics` | `0.0.6` | Haptic feedback support | MIT | <https://github.com/lochie/web-haptics> |
| `react-icons` | `5.6.0` | React wrapper that ships the icon component code used by the UI | MIT | <https://github.com/react-icons/react-icons> |
| `workbox-sw` / `workbox-window` and related Workbox runtime modules | `7.4.0` | Service worker runtime files emitted into `dist\` by `vite-plugin-pwa` | MIT | <https://github.com/GoogleChrome/workbox> |

## Included ML model components

| Component | Version | Role in this project | License | Source |
| --- | --- | --- | --- | --- |
| `browser-handwritten-digit-recognition` | `1.0.1` | Offline handwritten digit recognition for user-drawn digits in the Sudoku UI | `MIT` | <https://github.com/starxmaker/browser-handwritten-digit-recognition> |
| `MNIST-8` extracted model weights | `mnist-8` | CNN weights used by the handwritten digit recognizer for offline inference | `MIT` | <https://github.com/onnx/models/tree/main/validated/vision/classification/mnist> |


## UI icon libraries used through `react-icons`

The app uses `react-icons@5.6.0` as an MIT-licensed wrapper that exposes icon sets as React components rendering inline SVG. The actual icon artwork licenses come from the source icon families below.

| Import path | Upstream icon family | License | Used icons in this app | Source |
| --- | --- | --- | --- | --- |
| `react-icons/md` | Material Design Icons | Apache-2.0 | `MdPlayArrow`, `MdPause`, `MdUndo`, `MdRedo`, `MdHistory`, `MdOutlineInvertColorsOff`, `MdDrawer` | <https://github.com/google/material-design-icons> |
| `react-icons/fa` | Font Awesome 5 | CC BY 4.0 | `FaEraser`, `FaGithub` | <https://fontawesome.com/> |
| `react-icons/fa6` | Font Awesome 6 | CC BY 4.0 | `FaBrush`, `FaWandMagicSparkles` | <https://fontawesome.com/> |
| `react-icons/gi` | Game Icons | CC BY 3.0 | `GiMagicBroom` | <https://game-icons.net/> |
| `react-icons/lu` | Lucide | ISC | `LuClipboardList` | <https://lucide.dev/> |
| `react-icons/pi` | Phosphor Icons | MIT | `PiFlagCheckeredFill`, `PiPencilSlash` | <https://github.com/phosphor-icons/core> |
| `react-icons/tb` | Tabler Icons | MIT | `TbNumbers` | <https://github.com/tabler/tabler-icons> |
| `react-icons/fc` | Flat Color Icons | MIT | `FcOk` | <https://github.com/icons8/flat-color-icons> |

## App icons versus UI icons

The static files in `public\icons\` are the PWA/app icons used by the web manifest and install surfaces. They are separate assets from the runtime UI icons imported from `react-icons`.

## Corresponding source and rebuild information

The preferred form of the work for making modifications is available from:

1. This repository for the Sudoku PWA application source.
2. The exact dependency versions pinned in `package-lock.json`.
3. The upstream repositories listed above, or the exact npm source tarballs for the bundled versions.

To rebuild the production bundle from source:

```bash
npm ci
npm run build
```

The production build also copies this notice file and the GPL text into `dist\` (`THIRD_PARTY_NOTICES.md` and `LICENSE.txt`) so deployed static bundles carry the relevant license materials.

To fetch npm source tarballs for the exact package versions used by this project:

```bash
npm pack hodoku-core-js@1.1.0
npm pack react@18.3.1
npm pack react-dom@18.3.1
npm pack @khmyznikov/pwa-install@0.6.3
npm pack react-icons@5.6.0
npm pack web-haptics@0.0.6
npm pack workbox-window@7.4.0
npm pack workbox-sw@7.4.0
npm pack browser-handwritten-digit-recognition@1.0.1
```

## No warranty

As required by the GNU GPL, this software is provided without any warranty; see `LICENSE` for details.

## MIT-licensed component notices

### `browser-handwritten-digit-recognition`

MIT License

Copyright (c) 2026 browser-handwritten-digit-recognition contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH 
