---
'@burnmark-io/designer-vue': minor
'@burnmark-io/designer-react': minor
---

Initial release of the Vue 3 composable and React 18+ hook bindings for
`@burnmark-io/designer-core`.

Both packages expose a `useLabelDesigner` entry point that wraps a
`LabelDesigner` instance with:

- Reactive document state (version-counter / `shallowRef` pattern so in-place
  core mutations surface through framework reactivity)
- Debounced render loop (200ms) with generation-counter cancellation of stale
  results and an `isRendering` flag for spinner UI
- `renderWarning` and `renderError` channels routed by payload type from the
  core `'error'` event
- Selection state managed in the binding, auto-pruned when objects are
  removed
- External-designer hand-off (`{ designer }` in options) to wrap a
  pre-existing instance
- Full designer action surface plus wrapped `exportPng` / `exportPdf` /
  `exportSheet` / `exportBundled` convenience methods
- React binding is StrictMode- and SSR-safe

See [`packages/vue/README.md`](../packages/vue/README.md) and
[`packages/react/README.md`](../packages/react/README.md) for usage.
