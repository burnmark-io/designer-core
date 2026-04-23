#!/usr/bin/env node
// Entry point — hands off to the compiled dist bundle.
import('../dist/index.js')
  .then(m => m.run(process.argv))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
