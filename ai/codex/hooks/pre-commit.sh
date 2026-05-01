#!/bin/sh
node tools/node/copy-autofix.js || exit 1
node tools/node/copy-lint.js || exit 1
