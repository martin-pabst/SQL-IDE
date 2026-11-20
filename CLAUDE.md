# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SQL-IDE is a browser-based SQL learning environment (SQL counterpart of the Java [Online-IDE](https://github.com/martin-pabst/Online-IDE)). SQLite runs in the browser via sql.js (WASM). User SQL is **not** passed straight to SQLite: a custom compiler first lexes/parses/type-checks it to enforce strict, standard-like typing, produce friendlier error messages, accept much MySQL syntax (so MySQL dumps import), and feed context-sensitive editor help.

This repo contains only the TypeScript client. The full IDE talks to the shared Online-IDE Java backend (not in this repo) under `/servlet/...`. The embedded version needs no server. Class/user/exam administration is a separate external app: `MainMenu` opens `teacherbackend.online-ide.de` with a single-use session token.

## Commands

```bash
npm run dev            # Vite dev server on http://localhost:4000 (--host); /servlet and /servlet/pushWebsocket proxied to localhost:5500
npm run build          # tsc type check + build full IDE (dist/) + build embedded version (dist-embedded/)
npm run build-ide      # tsc + full IDE only
npm run build-embedded # tsc + embedded only (vite.config-embedded.ts)
npx tsc                # type check only (noEmit is set in tsconfig.json)
```

- There is no test suite and no linter.
- Dev pages: `/` = full IDE (needs the backend running on :5500 to log in); `/embedded.html` = embedded demo (works standalone). `.vscode/launch.json` has Chrome debug configs for both.
- `npm run deploy` (`src/development/ZipAndUpload.js`) uploads `dist/` to the production server over SSH using keys in the git-ignored `intern/` folder. Never run it unless explicitly asked.
- `npm run build_tools` is stale: `tsconfig_development-tools.json` does not exist.

## Architecture

### Entry points and the `MainBase` abstraction
- `index.html` → `src/client/main/IDEStarter.ts` → `Main` (full IDE: login, workspaces, server sync, teacher features)
- `embedded.html` → `src/client/embedded/EmbeddedStarter.ts` → one `MainEmbedded` per `.sql-online` div; per-instance config comes from the `data-sql-online` attribute (`databaseURL`, `enableFileAccess`, `withFileList`, ...)

`Main` and `MainEmbedded` both implement the `MainBase` interface (`src/client/main/MainBase.ts`). Shared components (compiler, editor, `DatabaseTool`, `ResultsetPresenter`, `DatabaseExplorer`, ...) depend only on `MainBase` and use `isEmbedded()` where behavior differs. If you add a method to `MainBase`, implement it in both classes.

The two Vite configs share `vite.config-common.ts`, which injects the `APP_VERSION`/`BUILD_DATE` globals and drops `DEBUG:` labeled statements in builds. The embedded build emits fixed file names (`sql-ide-embedded.js` / `.css`) with `base: ''`, so other sites can host and include it (see `public/includeIDE.js`).

### Compiler (`src/client/compiler/`)
`Compiler.compile(moduleStore)` runs three passes over every `Module` (one `Module` per editor file):
1. `Lexer` → tokens (+ bracket errors)
2. `Parser` → AST (`AST.ts`) and `SQLStatement`s
3. `SymbolResolver` → resolves tables/columns against the **live database schema** (`DatabaseTool.databaseStructure`) and checks types (`SQLTypes.ts`, `SQLMethods.ts`)

`Main.startTimer()` calls `compileIfDirty()` every 500 ms. Errors go to `ErrorManager` → Monaco markers. `SemicolonAngel` tracks and inserts missing semicolons. The `Module`'s symbol tables and identifier positions back the Monaco providers (`MyCompletionItemProvider`, `MyHoverProvider`, `MySignatureHelpProvider`, `MyReferenceProvider`, `MyCodeActionProvider`). These are registered in `main/gui/Editor.ts` for the custom language id `vscSQL`, which is defined in `VSCSql.ts`.

### Execution path
Ctrl+Enter → `ResultsetPresenter.executeSelectedStatements()`:
- Only the **last** SELECT is actually executed. If it has no `LIMIT`, `limit 100000` is appended.
- Modifying statements are rewritten by `StatementCleaner` (MySQL → SQLite-compatible CREATE TABLE, batched INSERTs) before execution. `MySqlImporter` uses the same cleaner.
- `DatabaseTool` (`src/client/sqljs-worker/DatabaseTools.ts`) posts queries to the sql.js Web Worker (`sqljsWorker.ts`) and matches replies to callbacks by query id. When `window.jo_doc` is set (embedded in a cross-origin iframe, where workers are blocked), `WorkerSim` runs sql.js on the main thread instead.

### Database persistence model
A database (`WDatabase`) is **a template binary dump plus an ordered list of modifying SQL statements plus a version number**. The live SQLite instance is always rebuilt with `DatabaseTool.initializeWorker(templateDump, statements)`.
- **Full IDE:** templates are fetched from the server (zip/pako-compressed), cached via the browser Cache API (`CacheManager`), and replayed with the statements. After execution, successful modifying statements go to the server via `NetworkManager.AddDatabaseStatements`. If the server returns `statements_before` (someone else wrote concurrently), the client fetches all statements, resets, and replays from scratch. Rollback = asking the server to drop statements back to a version. `HistoryViewer` shows the write history.
- **Embedded:** the template comes from `databaseURL`. `WriteQueryManager` records write statements, and `EmbeddedIndexedDB` persists them and the files in the browser's IndexedDB.

### Server communication (`src/client/communication/`)
- `AjaxHelper.ajax`/`ajaxAsync` prefix `servlet/` and attach the CSRF token as the `x-token-pm` header. Responses may rotate the token.
- All request/response types live in `Data.ts`.
- `NetworkManager` periodically sends dirty files/workspaces (`sendUpdates`) and wraps all workspace/database CRUD.
- `PushClientManager` gets server push over a WebSocket, falling back to long polling.

### Settings (`src/client/settings/`)
Settings resolve across scopes `user` / `class` / `school` / `default`. The lookup order depends on the key: most use `userClassSchoolDefault`, but some keys are listed in `SettingsStore.ts` as `classSchoolUserDefault`, so a teacher or school can override the user. `SettingsMetadata.ts` declares the nested group/setting tree that `SettingsGUI` renders (translated names, option values, optional `action` run on change). Read values via `main.getSettings()`.

### i18n
UI strings live in `*Messages.ts` classes as lazy functions:
```ts
static Settings = () => lm({ "de": "Einstellungen", "en": "Settings", "fr": "Paramètres" })
```
Call them (`MainMenuMessages.Settings()`) at render time so the current language applies. `lm`/`le` live in `src/tools/language/LanguageManager.ts`. German is the default language. New strings need at least `de` and `en`.

### UI
jQuery and w2ui, plus custom components in `src/tools/` (`components/treeview`, `TabManager`, `GUIButton`, ...). CSS lives in `assets/css/` and is imported from the starter files. Sample databases for templates/embedded demos are in `public/assets/databases/`.

Icons are CSS classes `img_<name>` in `assets/css/icons.css`. Each one shows `assets/icons/dark/<name>.svg`, or `assets/icons/light/<name>.svg` when `ThemeManager` has set `jo_theme-light` on `<html>`. Use only the plain class name in code (no `-dark` suffix). Every icon needs both SVG files and both CSS rules. To add an icon, put the dark SVG in `dark/` and run `node src/development/IconTool.js derive` to create the light one, then `node src/development/IconTool.js check`. Run `clean` after editing icons in Inkscape.

## Conventions and gotchas
- Relative TS imports mostly use the `.js` extension (`import { Lexer } from "./lexer/Lexer.js"`). Follow the surrounding file.
- `tsconfig.json` has `strict: false`.
- `src/client/main/gui/ProjectExplorerOld.ts` is dead code: nothing imports it.
- Much code was ported from the Java Online-IDE, so some names are leftovers (e.g. `Formatter` registers for language `myJava`, `spritesheetId` on `Workspace`).
- Code comments and UI text mix German and English. Commit messages are in English.

## Test
- Use playwright to execute GUI Tests: start dev server on port 4000, then URL http://localhost:4000/embedded.html for embedded version and http://localhost:4000/index.html for full GUI version. For full GUI version use username and password given in file @intern\keys\dev-credentials.md. 

### Dev server lifecycle (Windows)
`npm run dev` starts a chain of processes (bash → npm → cmd → vite). Stopping the background task, or the session ending, kills only the outer shell. `vite` survives and keeps port 4000 blocked.
- Before starting, check `Get-NetTCPConnection -LocalPort 4000 -State Listen` (PowerShell). If something is listening, reuse it: Vite reloads changed files, so never start a second server. Don't use `netstat | grep LISTENING`: this Windows prints the state in German (`ABHÖREN`).
- Stop it by port, not by stopping the task. The rest of the process chain then exits by itself:
  `Get-NetTCPConnection -LocalPort 4000 -State Listen | % { taskkill /PID $_.OwningProcess /T /F }`
- Stop the server at the end of a task unless the user asks to keep it running.
- `server.strictPort` is set in `vite.config.ts`, so a blocked port makes `npm run dev` fail instead of silently moving to 4001.