# 飞行棋网页小游戏 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有飞行棋 HTML 原型改造成支持手机、iPad、电脑的纯前端同设备双人轮流小游戏，并保留九个版本、存档、成人模式和可配置事件。

**Architecture:** 使用原生 ES modules，把棋盘数据、规则引擎、存档和 UI 分开；`index.html` 负责开始与版本预览，`game.html` 负责游戏，`settings.html` 负责配置。浏览器通过 `<script type="module">` 加载模块，Node 内置测试直接测试无 DOM 的规则与存档纯函数。

**Tech Stack:** HTML5, CSS3, 原生 JavaScript ES modules, `localStorage`, Node.js built-in test runner, no external dependencies.

## Global Constraints

- 只做同设备双人，不做联网接口。
- 默认轻松模式；成人模式由用户主动开启。
- 成人模式默认开启回合交接遮罩，但可在设置中关闭。
- 第一版沿用现有九种版本和事件文本，不主动扩写更露骨的新内容。
- 先保持纯 HTML / CSS / JavaScript，避免构建工具和部署复杂度。
- 事件只在棋子最终停下时触发，路过格子不触发。
- 页面必须适配 375px 手机、iPad 竖横屏和 1366px 以上桌面。

## File Map

- Create: `game-data.mjs` — 九个版本、默认主题、版本元数据和事件解析。
- Create: `game-engine.mjs` — 掷骰、移动、特殊格、接受方、回合和胜负纯函数。
- Create: `storage.mjs` — 统一存档、旧键迁移、自定义设置和恢复默认。
- Create: `game-ui.mjs` — 游戏页 DOM 渲染、事件卡、交接遮罩和交互绑定。
- Create: `settings-ui.mjs` — 设置页表单、事件编辑和恢复默认交互。
- Create: `styles.css` — 共享布局、颜色变量、模式主题、控件状态和安全区适配。
- Create: `game.html` — 正式同设备双人游戏页。
- Create: `settings.html` — 模式、玩家、颜色、事件和规则设置页。
- Create: `tests/game-engine.test.mjs` — 规则引擎测试。
- Create: `tests/storage.test.mjs` — 存档迁移与默认值测试。
- Modify: `index.html` — 复用现有版本数据预览，但改为加载共享数据和进入 `game.html`。
- Modify: `flight-chess-popup.html` — 保留兼容入口，跳转或复用正式游戏页，不再维护重复规则。
- Modify: `float-window.js` — 保持拖动 API，补充适合游戏页的状态文本更新。
- Modify: `README.md` — 更新打开方式、页面职责、设置和测试命令。

### Task 1: 建立可测试的版本数据和规则引擎

**Files:**
- Create: `game-data.mjs`
- Create: `game-engine.mjs`
- Create: `tests/game-engine.test.mjs`

**Interfaces:**
- `getBoard(key)` returns `{ key, name, cells }` or the default board.
- `createInitialState({ versionKey, mode, players, settings })` returns a serializable game state.
- `rollDice(random = Math.random)` returns an integer from 1 through 6.
- `resolveMove(state, playerId, dice, board)` returns `{ state, event }` without touching DOM or storage.
- `resolveReceiver(boardKey, landerId)` returns `player` or `player2`.

- [ ] **Step 1: Write failing tests for movement and receiver rules.**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, resolveMove, resolveReceiver } from '../game-engine.mjs';
import { getBoard } from '../game-data.mjs';

test('后退格只在最终停留后生效', () => {
  const board = { key: 'test', name: '测试', cells: [
    { text: '起点' },
    { text: '普通格' },
    { text: '后进2格', backSteps: 2 },
    { text: '普通格' },
    { text: '终点' }
  ] };
  const state = createInitialState({ versionKey: 'test' });
  const result = resolveMove(state, 'player', 2, board);
  assert.equal(result.event.landedPosition, 2);
  assert.equal(result.event.finalPosition, 0);
  assert.equal(result.state.players[0].position, 0);
});

test('女仆版和SM版由player接收，男仆版由player2接收', () => {
  assert.equal(resolveReceiver('maid', 'player2'), 'player');
  assert.equal(resolveReceiver('sm', 'player'), 'player');
  assert.equal(resolveReceiver('butler', 'player'), 'player2');
});

test('掷骰结果始终在1到6之间', () => {
  const results = [0, 0.2, 0.5, 0.99].map(value =>
    resolveMove(createInitialState({ versionKey: 'foreplay' }), 'player', Math.floor(value * 6) + 1, getBoard('foreplay'))
  );
  assert.ok(results.every(result => result.event.dice >= 1 && result.event.dice <= 6));
});
```

- [ ] **Step 2: Run the focused test and verify it fails for the missing modules.**

Run: `node --test tests/game-engine.test.mjs`

Expected: FAIL with module-not-found or missing-export errors, not a passing test.

- [ ] **Step 3: Extract the nine existing board arrays into `game-data.mjs`.**

Keep each existing event string unchanged. Normalize every cell to this shape:

```js
{ text, type: 'normal' | 'start' | 'special' | 'end', backSteps: 0, jumpTo: null }
```

Export `BOARDS`, `DEFAULT_VERSION = 'foreplay'`, `getBoard(key)`, and `makeCells(list)`.

- [ ] **Step 4: Implement the minimum rule engine.**

Implement these pure functions:

```js
export function createInitialState(options = {}) { /* positions 0, player turn, playing */ }
export function rollDice(random = Math.random) {
  return Math.floor(random() * 6) + 1;
}
export function resolveReceiver(boardKey, landerId) { /* version-specific receiver */ }
export function resolveMove(state, playerId, dice, board) {
  /* clamp to end, resolve landed cell, apply one back/jump effect, return next state and event */
}
```

The returned event must contain `dice`, `startPosition`, `landedPosition`, `finalPosition`, `lander`, `receiver`, `cellText`, `eventText`, `roundsLeft`, and `status`.

- [ ] **Step 5: Run the focused tests and confirm they pass.**

Run: `node --test tests/game-engine.test.mjs`

Expected: all movement and receiver tests PASS.

- [ ] **Step 6: Add edge-case tests and implementation.**

Cover end-position clamping, empty events, disabled back/jump settings, second-player turn advancement, terminal state, and joint-event text preservation. Re-run `node --test tests/game-engine.test.mjs` and keep the output green.

### Task 2: Add versioned storage and legacy migration

**Files:**
- Create: `storage.mjs`
- Create: `tests/storage.test.mjs`

**Interfaces:**
- `STORAGE_KEY = 'flight_chess_game_v2'`.
- `loadGame(storage = window.localStorage)` returns a normalized state or `null`.
- `saveGame(state, storage = window.localStorage)` writes JSON and returns `true` / `false`.
- `loadSettings(storage = window.localStorage)` returns normalized settings.
- `saveSettings(settings, storage = window.localStorage)` writes settings.
- `resetGame(storage = window.localStorage)` removes the v2 save and legacy keys.

- [ ] **Step 1: Write failing migration tests.**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, saveGame, resetGame } from '../storage.mjs';

function fakeStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key)
  };
}

test('读取旧flight_chess_progress并转换为统一状态', () => {
  const storage = fakeStorage({
    flight_chess_progress: JSON.stringify({ version: 'maid', playerPos: 4, aiPos: 2, turn: 'ai' })
  });
  const state = loadGame(storage);
  assert.equal(state.versionKey, 'maid');
  assert.equal(state.players[0].position, 4);
  assert.equal(state.players[1].position, 2);
  assert.equal(state.turn, 'player2');
});

test('保存和清除统一存档', () => {
  const storage = fakeStorage();
  const state = { schemaVersion: 2, versionKey: 'foreplay', players: [] };
  assert.equal(saveGame(state, storage), true);
  assert.ok(storage.getItem('flight_chess_game_v2'));
  resetGame(storage);
  assert.equal(storage.getItem('flight_chess_game_v2'), null);
});
```

- [ ] **Step 2: Run the test to confirm the migration API is missing.**

Run: `node --test tests/storage.test.mjs`

Expected: FAIL with missing module or exports.

- [ ] **Step 3: Implement normalized defaults and legacy migration.**

Accept both `flight_chess_progress` and `flight_chess_player`. Convert old `playerPos` / `aiPos` into `players[0].position` / `players[1].position`; map old `turn: 'ai'` to `player2`; add `schemaVersion: 2`, settings, mode, and timestamp defaults.

- [ ] **Step 4: Run storage tests and add invalid JSON coverage.**

Run: `node --test tests/storage.test.mjs`

Expected: all tests PASS, including corrupted JSON returning `null` rather than throwing.

### Task 3: Build shared responsive styles and the formal game page

**Files:**
- Create: `styles.css`
- Create: `game.html`
- Create: `game-ui.mjs`
- Modify: `float-window.js`

**Interfaces:**
- `mountGamePage({ document, storage, boardKey })` binds the game page and returns `{ render, destroy }`.
- `renderGameState(state, board, document)` updates board cells, turn status, dice, and event panel without changing game state.
- `showHandoffOverlay(document, playerName)` and `hideHandoffOverlay(document)` control the privacy layer.

- [ ] **Step 1: Create the failing browser smoke fixture.**

Add `tests/game-smoke.html` with the same module imports as `game.html`, a small status output, and a script that asserts the game root exists and the first render produces board cells. Open it through a local server and record the current failure before adding the page implementation.

- [ ] **Step 2: Add the semantic game page shell.**

Create `game.html` with:

```html
<main class="game-shell" data-mode="light">
  <header class="game-header">
    <a class="icon-button" href="index.html" aria-label="返回开始页">返回</a>
    <div>
      <p class="eyebrow">同设备双人</p>
      <h1 id="gameTitle">飞行棋</h1>
    </div>
    <a class="icon-button" href="settings.html" aria-label="打开设置">设置</a>
  </header>
  <section class="game-layout">
    <section class="board-panel">
      <div class="panel-heading"><h2 id="boardName">前戏版</h2><span id="cellCount">0格</span></div>
      <div id="boardPath" class="path" aria-label="飞行棋棋盘"></div>
    </section>
    <aside class="control-panel">
      <p id="turnText" class="turn-text" aria-live="polite">轮到你</p>
      <div id="diceFace" class="dice">-</div>
      <button id="btnRoll" class="primary-button" type="button">掷骰</button>
      <section id="eventPanel" class="event-panel" aria-live="polite"></section>
    </aside>
  </section>
  <section id="handoffOverlay" class="handoff-overlay" hidden aria-modal="true" role="dialog">
    <div class="handoff-card">
      <p class="eyebrow">回合交接</p>
      <h2>请交给下一位玩家</h2>
      <p id="handoffText">准备好后继续。</p>
      <button id="btnHandoff" class="primary-button" type="button">继续</button>
    </div>
  </section>
</main>
```

Use buttons with visible labels for primary actions, `aria-live` for event updates, and a dedicated `data-testid`-like attribute only in the smoke fixture.

- [ ] **Step 3: Implement responsive CSS.**

Use CSS grid for desktop two-column layout, a single column with fixed bottom controls below 760px, safe-area padding via `env(safe-area-inset-*)`, stable aspect-ratio cells, no horizontal overflow, and separate `[data-mode="light"]` / `[data-mode="adult"]` variables. Keep cards shallow and reserve large type for the page title only.

- [ ] **Step 4: Implement render and interaction wiring.**

`game-ui.mjs` loads a board and state, renders all cells, handles `btnRoll`, disables it while resolving, calls `rollDice` and `resolveMove`, renders the event, saves after every state change, and advances `player` / `player2`. Replace the old “小机回合” wording with the configured second player name.

- [ ] **Step 5: Add handoff overlay and float-window integration.**

Adult mode defaults to the overlay on. When enabled, event text is hidden before the next player confirms. Wire `FlightFloat.setPosText()` to the two positions and keep the existing click-to-restore and drag behavior.

- [ ] **Step 6: Run the browser smoke test at three viewport sizes.**

Run a local static server from the project directory, open `tests/game-smoke.html`, and verify at 375x812, 834x1194, and 1366x768 that the root, board cells, roll button, and event panel render without horizontal overflow. Capture failures before fixing them; repeat until the smoke fixture passes.

### Task 4: Rework the start page and compatibility popup

**Files:**
- Modify: `index.html`
- Modify: `flight-chess-popup.html`
- Modify: `README.md`

**Interfaces:**
- Start page reads `getBoard()` and `loadGame()` instead of maintaining a second embedded copy of the board data.
- “开始游戏” navigates to `game.html?version=<key>`.
- Existing popup URL remains openable and forwards to the formal game page while preserving its saved state.

- [ ] **Step 1: Update `index.html` to import shared data.**

Remove the duplicate board declaration and use `type="module"` to render the version strip and preview. Keep the existing `flight_chess_progress` compatibility read through `loadGame()`.

- [ ] **Step 2: Add start-page controls.**

Add mode selection, two player name inputs, a continue button when a save exists, and a settings entry. Store the draft in `localStorage` before navigating to `game.html`.

- [ ] **Step 3: Replace popup game logic with a compatibility redirect or shared module wrapper.**

Do not leave a second copy of `movePiece`, `resolveReceiver`, or board data. The popup must either redirect to `game.html` or load the same modules and render the same state.

- [ ] **Step 4: Update README usage and file table.**

Document `index.html`, `game.html`, `settings.html`, module files, the same-device flow, adult-mode handoff setting, and `node --test tests/*.test.mjs`.

- [ ] **Step 5: Verify existing entry points.**

Open both `index.html` and `flight-chess-popup.html` through a local server, start one turn from each, refresh, and confirm the same save resumes in `game.html`.

### Task 5: Add settings and custom event editing

**Files:**
- Create: `settings.html`
- Create: `settings-ui.mjs`
- Modify: `styles.css`
- Modify: `storage.mjs`

**Interfaces:**
- `loadSettings()` / `saveSettings()` store `{ mode, handoffOverlay, players, theme, rules }`.
- `getCustomEvents(versionKey)` returns a copy of custom events for one version.
- `saveCustomEvents(versionKey, events)` stores only that version’s overrides.
- `resetCustomEvents(versionKey)` removes overrides and restores default data at render time.

- [ ] **Step 1: Add failing storage tests for custom events and default restoration.**

Test that an override for `maid` does not alter `foreplay`, and that reset removes the override without modifying the imported defaults.

- [ ] **Step 2: Implement custom event storage.**

Use separate namespaced keys under `flight_chess_custom_events_v2:<versionKey>`. Validate event values as strings, preserve empty strings only as explicit empty events, and return copies so callers cannot mutate stored defaults.

- [ ] **Step 3: Create the settings page.**

Add accessible controls for mode, handoff overlay, player names, colors, back/jump/penalty switches, version selection, event list editing, save, cancel, and restore defaults. Keep the page usable without a modal-only flow on mobile.

- [ ] **Step 4: Wire settings back into start and game pages.**

Start and game pages load the same settings keys. Switching mode updates `[data-mode]`; changing the mode to light turns the default overlay off unless the user explicitly overrides it.

- [ ] **Step 5: Verify custom settings manually.**

Edit one event, start that version, confirm the edited text appears; switch version and confirm its defaults remain; restore defaults and confirm the original text returns after reload.

### Task 6: Final responsive and regression verification

**Files:**
- Modify: `styles.css`
- Modify: `README.md`
- Optional Modify: `game-ui.mjs`, `settings-ui.mjs`, `float-window.js`

- [ ] **Step 1: Run all automated tests.**

Run: `node --test tests/*.test.mjs`

Expected: exit code 0 with zero failed tests.

- [ ] **Step 2: Run static syntax checks.**

Run: `node --check game-engine.mjs && node --check game-data.mjs && node --check storage.mjs && node --check game-ui.mjs && node --check settings-ui.mjs`

Expected: exit code 0 for every module.

- [ ] **Step 3: Exercise the full manual checklist.**

Verify all nine versions, both modes, both players, special cells, end position, refresh recovery, corrupted-save recovery, handoff overlay, floating restore, keyboard activation, and the three target viewport sizes.

- [ ] **Step 4: Inspect the final diff and user-facing files.**

Run `git diff --check` when a repository is available; otherwise run `rg -n "TODO|TBD|placeholder|lorem" .` and inspect all modified files. Confirm no duplicate board arrays or duplicate move logic remain.

- [ ] **Step 5: Report evidence.**

Report the exact test command, exit code, viewport checks, and any remaining limitations. Do not claim completion until these commands and checks have been run.
