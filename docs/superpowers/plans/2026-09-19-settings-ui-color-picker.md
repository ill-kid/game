# Settings UI Color Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the settings page and make the player color controls visibly reflect their selected colors.

**Architecture:** Keep native color inputs for platform compatibility, but render their state through custom preview rows managed by `settings-ui.mjs`. Apply scoped CSS changes to improve settings hierarchy and responsive actions without changing storage or game logic.

**Tech Stack:** Static HTML, CSS, browser ES modules, Node.js test runner.

## Global Constraints

- Preserve the current local-only, same-device game architecture.
- Support mobile, iPad, and desktop browsers.
- Do not change saved settings keys or game rules.

---

### Task 1: Color Preview State

**Files:**
- Modify: `settings-ui.mjs`
- Test: `tests/settings-ui.test.mjs`

- [ ] Export a small function that applies a color input value to a preview swatch and HEX label.
- [ ] Write a failing unit test proving valid colors are normalized and reflected in both outputs.
- [ ] Implement the function and bind it to both color inputs on initialization and `input`.
- [ ] Run `node --test tests/settings-ui.test.mjs` and confirm it passes.

### Task 2: Settings Page Markup and Styling

**Files:**
- Modify: `settings.html`
- Modify: `styles.css`

- [ ] Replace the plain color inputs with two accessible color preview rows containing swatch, label, and HEX value.
- [ ] Tighten settings-page headings, sections, controls, and mobile save actions.
- [ ] Keep the native color inputs available as transparent full-row click targets.
- [ ] Check desktop, tablet, and mobile layouts in a browser.

### Task 3: Verification and Publish

**Files:**
- Verify all changed files.

- [ ] Run JavaScript syntax checks.
- [ ] Run `node --test tests/*.test.mjs`.
- [ ] Run `git diff --check`.
- [ ] Commit and push to `main`.
- [ ] Confirm GitHub Pages returns HTTP 200.
