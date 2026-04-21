# Sudoku PWA

Sudoku power web app based on Typescript.

This project is free software released under the GNU General Public License, version 3 or any later version. See [`LICENSE`](LICENSE).

You can try it  [here](https://starxmaker.github.io/SudokuPWA/)

## Features

- Free and open source
- Installable (PWA)
- Completely client side code, no servers used.
- Can be played on PC/Tablet/Phones
- Offline support
- QQwing sudoku generation
- Sudoku.JS solvable check
- Hodoku difficulty calibration (based on human techniques)
- Candidates with prefilling support
- Candidate and digit coloring
- Undo movements
- Timers
- Night mode
- Share and import puzzles
- Haptics support
- Free drawing
- Pencil mode for tablets

## Limitations

- Only single solution puzzles are supported for the meantime
- No score or time tracking
- No hints
- Hodoku difficulty calibration is based on [Hodoku partial port on TS](https://github.com/starxmaker/hodoku-difficulty-rating-ts).  As you see, parity on difficulty rating is not still 100% on expert puzzles compared with the original Java version.
- Hodoku score caps and score ranges are now used during generation for finer-grained estimation tiers.

## TODO
- i18n
- Better Difficulty selection UI with notes about times on nightmare and diabolical difficulties

## License and source availability

- The project source in this repository is licensed under **GPL-3.0-or-later**.
- The shipped web bundle also includes copyleft code from:
  - [`hodoku-difficulty-rating-ts@0.2.0`](https://github.com/starxmaker/hodoku-difficulty-rating-ts) (`GPL-3.0-only`)
  - [`qqwing@1.3.4`](https://github.com/stephenostermiller/qqwing) (the distributed source header states `GPL-2.0-or-later`; see `THIRD_PARTY_NOTICES.md`)
- The app already links back to the source repository from the home screen, and the complete corresponding source for this build is available from this repository together with the exact dependency versions pinned in `package-lock.json`.
- Production builds also publish `LICENSE.txt` and `THIRD_PARTY_NOTICES.md` in `dist\` so the deployed app carries its license texts alongside the static assets.

To rebuild the published bundle from source:

```bash
npm ci
npm run build
```

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for third-party copyright, licensing, and source provenance details.
