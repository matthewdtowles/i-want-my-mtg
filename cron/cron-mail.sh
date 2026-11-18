#!/bin/bash
set -uo pipefail

# Runs one cron job and, when it fails, mails a plain-English account of it.
#
# Cron's own mail was the job's raw stderr under a subject naming the command
# line ("Cron <ubuntu@ip-...> /opt/scripts/ingest-chain.sh >> ..."), so every
# failure read the same: a dropped download that the next hour would retry
# looked exactly like an outage. Every job in /etc/cron.d/i-want-my-mtg now
# runs through this, which writes the mail itself:
#
#   Subject  MTG hourly update: Card catalog not updated (prices OK) - retrying 17:00 UTC
#   Body     what happened, what users see, whether you need to do anything
#
# Jobs (and scry) talk to it through tagged stderr lines:
#   SUMMARY: <headline>   the first one becomes the subject; later ones are
#                         fallbacks for when the job beneath printed none
#   IMPACT: <sentence>    what a user of the site would notice
#   ACTION: <sentence>    what to do, when "it retries on its own" is not true
# Every other stderr line is quoted as detail. A job that tags nothing still
# gets a readable mail from its defaults below.
#
# Consecutive failures are counted per job in $STATE_DIR. Below the job's
# threshold the mail says it will retry and needs nothing from you; at the
# threshold the subject says ACTION NEEDED, and once it recovers from that,
# one more mail says so. A job that succeeds but writes to stderr (scry's
# NOTICE about a stalled price feed) gets a "note" mail, as cron would have
# sent before.
#
# Mail goes through the sendmail cron itself uses. If that fails, the whole
# message goes to stderr instead and cron mails it the old way, so a broken
# mailer here cannot silence a failure.
#
# Usage, from the crontab: cron-mail.sh <job> <command> [args...]

JOB="$1"
shift
STATE_DIR="${CRON_STATE_DIR:-$HOME/.cron-state}"
SENDMAIL="${SENDMAIL:-/usr/sbin/sendmail}"
MAIL_TO="${MAILTO:-legal@iwantmymtg.net}"
LOG_DIR="/var/log/i-want-my-mtg"

case "$JOB" in
    hourly-update)
        name="hourly MTG data update"
        short="hourly update"
        log="ingestion.log"
        next_hour="$(date -u -d '+1 hour' +%H:00) UTC"
        retry="retrying $next_hour"
        next="It tries again at $next_hour, the next hourly run."
        escalate_at=3
        default_impact="Unknown; see what happened above."
        stuck="It is not fixing itself. Start with what happened above, then docs/ingest-runbook.md in the i-want-my-mtg repo."
        ;;
    health)
        name="daily data freshness check"
        short="freshness check"
        log="health.log"
        retry="checks again tomorrow 10:00 UTC"
        next="It checks again tomorrow at 10:00 UTC."
        escalate_at=1
        default_impact="Prices on the site are out of date."
        stuck="The data update has not finished in over a day. The hourly update emails, or ingestion.log, say why."
        ;;
    decks)
        name="daily tournament deck import"
        short="deck import"
        log="decks.log"
        retry="retrying tomorrow 03:30 UTC"
        next="It tries again tomorrow at 03:30 UTC and re-fetches the last 2 days, so a single miss fills itself in."
        escalate_at=2
        default_impact="Tournament decks published since the last good import are missing."
        stuck="It has failed two days running, so recent decks are now being lost. Check decks.log."
        ;;
    retention)
        name="weekly price-history cleanup"
        short="history cleanup"
        log="retention.log"
        retry="retrying next Sunday"
        next="It tries again next Sunday at 03:00 UTC."
        escalate_at=2
        default_impact="Nothing for users. Old price history is kept longer and uses more disk."
        stuck="It has failed two weeks running. Check retention.log."
        ;;
    log-cleanup)
        name="weekly log cleanup"
        short="log cleanup"
        log="cleanup.log"
        retry="retrying next Sunday"
        next="It tries again next Sunday at 04:00 UTC."
        escalate_at=2
        default_impact="Nothing for users. Logs keep growing until it succeeds."
        stuck="It has failed two weeks running. Check cleanup.log."
        ;;
    *)
        name="cron job '$JOB'"
        short="$JOB"
        log=""
        retry="will retry"
        next="It runs again at its next scheduled time."
        escalate_at=1
        default_impact="Unknown; see what happened above."
        stuck="cron-mail.sh has no description for this job; check its log."
        ;;
esac

mkdir -p "$STATE_DIR"
count_file="$STATE_DIR/$JOB.failures"
err_file=$(mktemp)
trap 'rm -f "$err_file"' EXIT

ran_at="$(date -u +%H:%M) UTC"
log_stamp=$(date -u +%Y-%m-%dT%H)

"$@" 2>"$err_file"
status=$?

# Cron no longer mails stderr directly, so keep it in the job's log (stdout
# goes there) and the log alone still tells the whole story.
if [ -s "$err_file" ]; then
    sed 's/^/[stderr] /' "$err_file"
fi

prior=$(cat "$count_file" 2>/dev/null || true)
[[ "$prior" =~ ^[0-9]+$ ]] || prior=0

summary=$(sed -n 's/^SUMMARY: //p' "$err_file" | head -n 1)
impact=$(sed -n 's/^IMPACT: //p' "$err_file" | sed 's/^/  /')
action=$(sed -n 's/^ACTION: //p' "$err_file" | sed 's/^/  /')
# Everything else. Later SUMMARY lines are dropped too: they are fallbacks a
# wrapping script prints in case the job beneath it printed none.
details=$(grep -vE '^(SUMMARY|IMPACT|ACTION): ' "$err_file" | sed 's/^/  /')
where=""
if [ -n "$log" ]; then
    where="

Where to look
  grep $log_stamp $LOG_DIR/$log"
fi

send_mail() {
    local subject="$1" body="$2"
    if ! printf 'To: %s\nSubject: %s\nContent-Type: text/plain; charset=UTF-8\n\n%s\n' \
            "$MAIL_TO" "$subject" "$body" | "$SENDMAIL" "-FI Want My MTG" -i -t; then
        printf 'cron-mail.sh could not send this through %s, so cron is mailing it instead.\n\nSubject: %s\n\n%s\n' \
            "$SENDMAIL" "$subject" "$body" >&2
    fi
}

if [ "$status" -eq 0 ]; then
    rm -f "$count_file"
    if [ "$prior" -ge "$escalate_at" ]; then
        send_mail "MTG $short: back to normal" \
"The $name succeeded at $ran_at, after failing $prior runs in a row.

Do you need to do anything?
  No. This closes out the ACTION NEEDED emails."
    fi
    if [ -s "$err_file" ]; then
        note=${summary:-$(sed -n 's/^NOTICE: //p' "$err_file" | head -n 1)}
        send_mail "MTG $short: note - ${note:-the job succeeded but printed a warning}" \
"The $name succeeded at $ran_at, but reported something worth knowing:

$details

Do you need to do anything?
  Usually not. This is a heads-up, not a failure.$where"
    fi
    exit 0
fi

count=$((prior + 1))
echo "$count" > "$count_file"
headline=${summary:-"The $name failed"}
if [ "$count" -gt 1 ]; then
    opening="The $name ran at $ran_at and failed. That is $count runs in a row."
else
    opening="The $name ran at $ran_at and failed."
fi

if [ "$count" -ge "$escalate_at" ]; then
    if [ "$count" -gt 1 ]; then
        subject="MTG $short: ACTION NEEDED - $headline - $count failed runs in a row"
    else
        subject="MTG $short: ACTION NEEDED - $headline"
    fi
    todo="  YES. $stuck"
    [ -n "$action" ] && todo="$todo
$action"
elif [ -n "$action" ]; then
    subject="MTG $short: $headline"
    todo="$action"
else
    subject="MTG $short: $headline - $retry"
    todo="  No. $next
  You will get an ACTION NEEDED email if it fails $escalate_at runs in a row."
fi

send_mail "$subject" "$opening

What happened
  $headline
${details:-  (the job printed nothing else)}

What users see
${impact:-  $default_impact}

Do you need to do anything?
$todo$where"

exit "$status"
