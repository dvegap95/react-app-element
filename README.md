# react-app-element

A **custom element base class** for mounting full React applications inside any HTML page or host application — without the host running a React build step.

Use it when you ship a self-contained React bundle and need a stable, framework-agnostic tag (`<my-app>`) that non-React pages can drop in. The library itself is tiny: **React and ReactDOM are peer dependencies** loaded by the host page (or your app shell), not bundled into this package.

> Prior art / inspiration: [r2wc](https://github.com/bitovi/react-to-web-component), [remount](https://github.com/remount/remount). This project targets a different slice of the problem — see [How this differs from r2wc](#how-this-differs-from-r2wc).

## Install

> Note: `react-app-element` is **not published to the npm registry yet**.
> The instructions below install/use it from this repository (after building `dist/`).

```bash
# 1) Build this repo (generates dist/)
npm install
npm run build

# 2) In your consuming project, install this repo as a local dependency
#    (the local install will pick up the generated dist/ folder)
npm install file:../path/to/react-app-element

# Your host app must also provide peer dependencies:
npm install react react-dom   # peer dependencies — same major as your app
```

## Host page: load React first

Because React is externalized, the page that hosts your custom element must provide React **before** your element bundle runs.

**CDN (quick test):**

```html
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script type="module" src="/dist/my-app-element.js"></script>
```

**Bundled host (Vite / webpack):** mark `react` and `react-dom` as externals or rely on your bundler’s shared vendor chunk so only one React instance exists on the page.

**Important:** the React version on the host should match the version you built your app against (currently `^18.3`).

## Quick start

```ts
import { ReactEmbed } from 'react-app-element';
import App from './App';

class MyAppElement extends ReactEmbed {
  static get Component() {
    return App;
  }

  static get attributesMap() {
    return { 'base-path': 'basePath' };
  }

  static get propertiesMap() {
    return {
      locale: 'locale',
      onReady: 'onReady',
    };
  }
}

customElements.define('my-app', MyAppElement);
```

```html
<my-app
  base-path="/apps/my-app/"
  locale="en"
  stylesheet="/apps/my-app/styles.css"
  styles-dir="/apps/my-app/assets"
  use-shadow-dom="true"
></my-app>
```

### Declarative maps

| Static getter | Purpose |
|---------------|---------|
| `attributesMap` | HTML attributes (strings) → React props. Keys must be lowercase. |
| `propertiesMap` | JS properties on the element → React props (including `on*` handlers). |
| `transformAttributes` | Per-attribute `parse` / `stringify` (or a parse function). Defaults to JSON try/parse. |
| `Component` | Root React component (usually your entire app). |

### Shadow DOM and styles

- Pass `use-shadow-dom="true"` or `new MyAppElement(true)` to render inside an open shadow root.
- `stylesheet` — single CSS file URL injected as `<link rel="stylesheet">`.
- `styles-dir` — prefix for additional chunk CSS files passed in the constructor’s `styleFiles` array.
- `ReactEmbedConfigContext` exposes `styleRoot` (`ShadowRoot` or `document.head`) so Emotion / other CSS-in-JS can target the correct insertion point.

### Imperative updates from outside React

Attribute and property changes dispatch an internal `props` event; `EventManager` merges updates into the mounted tree. Host scripts can set `element.locale = 'es'` or `element.setAttribute('base-path', '/v2/')` without re-mounting.

## API

```ts
import {
  ReactEmbed,
  ReactEmbedConfigContext,
  type AttributesMap,
  type TransformAttributesMap,
  type ReactEmbedConfigContextType,
} from 'react-app-element';
```

`ReactEmbed` is the default export name re-exported as a **named** export to keep the published bundle free of mixed default/named Rollup warnings.

## Development

```bash
npm install
npm test
npm run build   # emits dist/main.js (~few KB, React external)
```

## How this differs from r2wc

| | **react-app-element** | **@r2wc/react-to-web-component** |
|---|------------------------|----------------------------------|
| **API shape** | `class MyEl extends ReactEmbed` + static maps | `r2wc(Component, { props, shadow, events })` factory |
| **Typical target** | Whole app / micro-frontend shell | Single presentational component |
| **Prop wiring** | `attributesMap`, `propertiesMap`, `transformAttributes` on the subclass | `props: ['foo', 'bar']` or `{ foo: 'string' }` config object |
| **Styling story** | Shadow DOM toggle, external CSS URLs, `styleRoot` context for CSS-in-JS | Optional `shadow: 'open'`; no built-in stylesheet injection |
| **Bundle** | Peer `react` / `react-dom` (host supplies) | ~1–2 KB wrapper; peers React |
| **Ecosystem** | Standalone prior work / portfolio | De-facto standard, Bitovi-backed, very high npm adoption |

**Overlap (honest):** both create a custom element, observe attributes, and call `createRoot().render()`. For wrapping one component with a handful of props, r2wc is simpler and battle-tested.

**Where this project pushes further today:** subclass + maps scale better when one element owns an entire app with many host-driven knobs; shadow + linked stylesheets + `ReactEmbedConfigContext` target embed scenarios (legacy host, CMS, PHP shell) rather than “turn `Button` into `<my-button>`”.

## Future work

Not planned for the initial publish — documented so direction stays clear:

- [ ] **Light DOM children → React** — project slotted / child nodes into the React tree (declarative composition from host HTML).
- [ ] **Recursive custom elements** — nested tags that each extend `ReactEmbed`, with maps composed or inherited down the tree.
- [ ] **Custom Elements Manifest** — generate CEM from `attributesMap` / `propertiesMap` for IDE and docs tooling.
- [ ] **Generic typing** — infer React props from maps instead of `any` on the element instance.
- [ ] **Demo site** — minimal host page (CDN React) + one full app element example.
- [ ] **CEM + Storybook** — document elements defined in consuming apps, not only this base class.
- [ ] **Optional default props** — static `defaultProps` merged before attribute/property layers.
- [ ] **Disconnect / reconnect** — explicit `disconnectedCallback` root teardown and re-mount policy.

Contributions welcome once the repo stabilizes after npm publish.

## Related

- [lerna-vite-monorepo-template](https://github.com/dvegap95/lerna-vite-monorepo-template) — monorepo that vendors this package for zero-config bootstrapping; swap to `react-app-element` from npm when ready.

## License

MIT
