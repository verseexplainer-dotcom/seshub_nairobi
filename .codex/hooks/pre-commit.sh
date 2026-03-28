#!/bin/sh
node tools/copy-autofix.js || exit 1
node tools/copy-lint.js || exit 1
