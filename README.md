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
- Hodoku sudoku generation with difficulty calibration based on human techniques
- Candidates with prefilling support
- Candidate and digit coloring
- Undo movements
- Timers
- Night mode
- Share and import puzzles
- Haptics support
- Free drawing
- Pencil mode for tablets
- Hodoku score caps and score ranges are now used during generation for finer-grained estimation tiers.

## Limitations

- Only single solution puzzles are supported for the meantime
- No score or time tracking
- No hints

## TODO
- i18n
- Better Difficulty selection UI with notes about times on nightmare and diabolical difficulties

## License and source availability

- The project source in this repository is licensed under **GPL-3.0-or-later**.
- The shipped web bundle also includes copyleft code from:
- [`Hodoku@2.3.2`](https://github.com/PseudoFish/Hodoku) (the distributed source header states `GPL-3.0`; see `COPYING.md`)
- [`hodoku-core-js@1.1.0`](https://github.com/starxmaker/Hodoku) (`GPL-3.0-only`). Port of Hodoku core functionality to JS. 
- The app already links back to the source repository from the home screen, and the complete corresponding source for this build is available from this repository together with the exact dependency versions pinned in `package-lock.json`.
- Production builds also publish `LICENSE.txt` and `THIRD_PARTY_NOTICES.md` in `dist\` so the deployed app carries its license texts alongside the static assets.

To rebuild the published bundle from source:

```bash
npm ci
npm run build
```

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for third-party copyright, licensing, and source provenance details.
