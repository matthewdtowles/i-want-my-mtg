#!/usr/bin/env bash
set -euo pipefail

# Watch a PR for review activity and alert (terminal bell + desktop notification).
#
# The actual check (`--once`) is stateless: it compares the PR against a small
# state file and notifies on change. That makes it driveable by ANY scheduler -
# systemd timer, cron, or macOS launchd - so nothing runs between checks.
#
# Usage:
#   watch-pr-review.sh [PR] [INTERVAL]   Foreground loop (default INTERVAL=60s)
#   watch-pr-review.sh --once [PR]       Single check; remembers state in a file
#   watch-pr-review.sh --start PR [INTERVAL]   Start a background systemd user timer
#   watch-pr-review.sh --stop PR               Stop the background timer and clean up
#
# PR defaults to the PR for the current branch. Under a scheduler there is no
# repo cwd, so pass PR explicitly (--start does this for you).

STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/pr-review-watch"

notify() {
    local pr="$1" msg="$2"
    printf '\a'  # terminal bell
    case "$(uname -s)" in
        Linux)
            if command -v notify-send >/dev/null 2>&1; then
                # cron/systemd often lack a session bus address; fall back to the
                # standard per-user bus so the desktop notification still delivers.
                : "${DBUS_SESSION_BUS_ADDRESS:=unix:path=/run/user/$(id -u)/bus}"
                export DBUS_SESSION_BUS_ADDRESS
                notify-send "PR #$pr reviewed" "$msg" || true
            fi
            ;;
        Darwin)
            if command -v terminal-notifier >/dev/null 2>&1; then
                terminal-notifier -title "PR #$pr reviewed" -message "$msg" || true
            else
                osascript -e "display notification \"$msg\" with title \"PR #$pr reviewed\"" || true
            fi
            ;;
    esac
    echo ">>> PR #$pr: $msg"
}

resolve_pr() {
    local pr="$1"
    [ -n "$pr" ] || pr=$(gh pr view --json number --jq .number)
    echo "$pr"
}

# Fetch raw review JSON for a PR, or return 1 on failure.
fetch() {
    gh pr view "$1" --json reviews,reviewDecision 2>/dev/null
}

# reviewDecision is "" when a PR only has COMMENTED reviews; normalize to PENDING.
parse_count()    { jq '.reviews | length' <<<"$1"; }
parse_decision() { jq -r 'if (.reviewDecision // "") == "" then "PENDING" else .reviewDecision end' <<<"$1"; }
parse_latest()   { jq -r '.reviews[-1] // {} | "\(.author.login // "-"): \(.state // "-")"' <<<"$1"; }

check_once() {
    local pr; pr=$(resolve_pr "${1:-}")
    mkdir -p "$STATE_DIR"
    local state_file="$STATE_DIR/pr-$pr.state"

    local data; data=$(fetch "$pr") || { echo "gh failed for PR #$pr"; return 0; }
    local count decision latest
    count=$(parse_count "$data"); decision=$(parse_decision "$data"); latest=$(parse_latest "$data")

    if [ ! -f "$state_file" ]; then
        printf '%s\t%s\n' "$count" "$decision" >"$state_file"
        echo "baseline PR #$pr: $count review(s), decision=$decision"
        return 0
    fi

    local p_count p_decision
    IFS=$'\t' read -r p_count p_decision <"$state_file"
    if [ "$count" -gt "$p_count" ] || [ "$decision" != "$p_decision" ]; then
        notify "$pr" "$latest (decision: $decision)"
    fi
    printf '%s\t%s\n' "$count" "$decision" >"$state_file"
}

loop() {
    local pr; pr=$(resolve_pr "${1:-}")
    local interval="${2:-60}"
    local title; title=$(gh pr view "$pr" --json title --jq .title)
    echo "Watching PR #$pr: $title (every ${interval}s, Ctrl-C to stop)"
    local p_count="" p_decision="" data count decision latest
    while true; do
        if data=$(fetch "$pr"); then
            count=$(parse_count "$data"); decision=$(parse_decision "$data"); latest=$(parse_latest "$data")
            if [ -z "$p_count" ]; then
                p_count=$count; p_decision=$decision
                echo "$(date '+%H:%M:%S') baseline: $count review(s), decision=$decision"
            elif [ "$count" -gt "$p_count" ] || [ "$decision" != "$p_decision" ]; then
                notify "$pr" "$latest (decision: $decision)"
                p_count=$count; p_decision=$decision
            else
                echo "$(date '+%H:%M:%S') no change ($count review(s), $decision)"
            fi
        else
            echo "$(date '+%H:%M:%S') gh failed, retrying"
        fi
        sleep "$interval"
    done
}

start_watch() {
    local pr="${1:-}" interval="${2:-60}"
    [ -n "$pr" ] || { echo "usage: $0 --start PR [interval_seconds]" >&2; exit 1; }
    local self; self=$(readlink -f "$0")
    local unit_dir="$HOME/.config/systemd/user"
    mkdir -p "$unit_dir"

    cat >"$unit_dir/pr-review-watch@.service" <<EOF
[Unit]
Description=Check PR %i for review activity

[Service]
Type=oneshot
# cron/systemd start with a bare PATH; gh (snap) lives in /snap/bin.
Environment=PATH=/snap/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=$self --once %i
EOF

    cat >"$unit_dir/pr-review-watch@.timer" <<EOF
[Unit]
Description=Poll PR %i for review activity

[Timer]
OnBootSec=1min
OnUnitActiveSec=${interval}s
# Slack lets systemd batch this with other timers to stay power-friendly.
AccuracySec=1min
Persistent=true

[Install]
WantedBy=timers.target
EOF

    systemctl --user daemon-reload
    systemctl --user enable --now "pr-review-watch@${pr}.timer"
    loginctl enable-linger "$USER" 2>/dev/null || \
        echo "(note: 'loginctl enable-linger $USER' needed to keep running after logout)"

    echo "Started. Watching PR #$pr every ${interval}s (no resident process between checks)."
    echo "  status: systemctl --user list-timers pr-review-watch@${pr}.timer"
    echo "  logs:   journalctl --user -u pr-review-watch@${pr}.service -f"
    echo "  stop:   $0 --stop $pr"
}

stop_watch() {
    local pr="${1:-}"
    [ -n "$pr" ] || { echo "usage: $0 --stop PR" >&2; exit 1; }
    systemctl --user disable --now "pr-review-watch@${pr}.timer" 2>/dev/null || true
    rm -f "$STATE_DIR/pr-$pr.state"
    echo "Stopped watcher for PR #$pr."
}

case "${1:-}" in
    --once)    shift; check_once "${1:-}" ;;
    --start)   shift; start_watch "${1:-}" "${2:-}" ;;
    --stop)    shift; stop_watch "${1:-}" ;;
    -h|--help) sed -n '4,17p' "$0" ;;
    *)           loop "${1:-}" "${2:-}" ;;
esac
