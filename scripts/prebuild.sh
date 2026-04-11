#!/usr/bin/env bash
set -euo pipefail

# Fix ownership of ./dist before `nest build` writes into it.
#
# This only matters inside the Linux Docker build (the web container runs as
# a non-root user but bind-mounts from the host can leave dist/ owned by root
# from a prior run). On macOS / native host dev, there is nothing to fix, so
# we skip — running chown against your own home directory is pointless noise
# and sometimes prompts for sudo on CI runners with odd shell setups.
if [ "$(uname)" = "Linux" ]; then
    chown -R "$(whoami):$(whoami)" ./dist 2>/dev/null || true
fi
