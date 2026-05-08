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
- Available on Spanish and English
- Hodoku sudoku generation with difficulty calibration based on human techniques
- Hodoku solution next step hints, with the ability to send a prompt to ChatGPT to explain it.
- Hodoku base difficulties plus Very Easy, Nightmare, and Diabolical.
- Background puzzle generation
- Candidates with prefilling support
- Candidate and digit coloring
- Undo and redo movements
- Timers
- Night mode
- Share, import, and create puzzles
- Haptics support
- Free drawing
- Stylus mode for tablets


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
