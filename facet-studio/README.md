# Facet

A macOS app for building Jetpack Compose UIs: design screens on a canvas, write your ViewModel in Kotlin, and connect taps to events without hand-wiring.

- **Design:** layers, auto layout, sizing, Material 3 color/type tokens, navigation flow, transitions and motion.
- **Code:** live `HomeScreen.kt` / `DetailScreen.kt` / `CartScreen.kt`, `NavGraph.kt` and `Theme.kt` generated from the canvas. `MenuViewModel.kt` is yours to edit; the events and state you declare appear in the Interactions and binding pickers.
- **Prototype:** `⌘↩` runs the app with live state; every event and state change is logged.
- **Files:** `⌘S` saves a `.facet` project (double-click to reopen), `⇧⌘E` exports the Kotlin sources into an Android project's `app/src/main/java/...` tree.

## Run from source

```sh
cd facet-studio
npm install
npm start
```

## Build the Mac app

```sh
npm run dist        # dmg + zip for Apple Silicon and Intel → dist/
```

Builds are ad-hoc signed. Pushing changes under `facet-studio/` also builds them on a macOS runner via `.github/workflows/facet-studio-mac.yml` (download from the run's **Artifacts**).

### First launch of a downloaded build

Ad-hoc builds aren't notarized, so macOS quarantines them. Move `Facet.app` to Applications, then either right-click → **Open**, or run:

```sh
xattr -cr /Applications/Facet.app
```

A zip built on Linux has no signature at all. On Apple Silicon, also run `codesign --force --deep --sign - /Applications/Facet.app`.

For public distribution, sign with a Developer ID certificate and notarize (set `mac.identity`, `hardenedRuntime: true` and `notarize` in `package.json`).

## Architecture

| File | Role |
|---|---|
| `main.js` | Main process: windows, native menu bar, open/save/export, unsaved-changes prompt, Finder file associations |
| `preload.js` | `contextBridge` API, the only path from the page to the file system |
| `src/` | The editor UI (sandboxed renderer, strict CSP, fonts bundled offline) |

The generated Kotlin follows Compose conventions (stateless screens + `onEvent`, `StateFlow`, type-safe Navigation routes, Material 3). It is a starting point and isn't compiled by Facet. Build it in Android Studio.
