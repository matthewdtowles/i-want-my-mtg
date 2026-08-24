# Ingest runbook

What to do when the nightly Scry ingest fails, hangs, or the site is showing
stale prices. Every block below is meant to be pasted as-is.

The whole pipeline is one cron job: `/opt/scripts/scry.sh ingest` at **08:00
UTC daily**, logging to `/var/log/i-want-my-mtg/ingestion.log`. If it does not
finish, `/opt/scripts/ingest-retry.sh` gets a second attempt at 09:00 UTC, and
`scry health` pages at 10:00 UTC if the catalog is still stale.

## 0. Get on the box

```bash
ssh ubuntu@34.196.165.20
```

## 1. One command that answers "is it broken?"

Paste this whole block. It prints a verdict and everything needed to act on it.

```bash
{
  echo "=== now (UTC) ==="; date -u
  echo; echo "=== last 5 ingest starts ==="
  grep "Starting scry.sh" /var/log/i-want-my-mtg/ingestion.log | tail -5
  echo; echo "=== did the last run finish? (want a 'Scry complete' newer than the last start) ==="
  grep -aE "Scry complete|exceeded|exited with status" /var/log/i-want-my-mtg/ingestion.log | tail -5
  echo; echo "=== newest price date in the database ==="
  source /home/ubuntu/.env
  psql "$DATABASE_URL" -tAc "SELECT max(date) FROM price;"
  echo; echo "=== health verdict (exit 0 = fine) ==="
  /opt/scripts/scry.sh health; echo "health exit: $?"
  echo; echo "=== is a run still going right now? ==="
  pgrep -a -f '/opt/scripts/scry ' || echo "(nothing running)"
} 2>&1 | tail -40
```

Read it like this:

- **Newest price date is today or yesterday, health exit 0** — nothing is wrong.
  MTGJSON skips a build now and then; a one-day-old catalog is expected and
  tolerated.
- **Newest price date is two or more days old** — go to section 2.
- **A run is still going and started more than 40 minutes ago** — it is wedged.
  Go to section 3.

## 2. The last run failed. Why?

```bash
# The tail of the most recent run, with the log's colour codes stripped.
awk '/Starting scry.sh/{buf=""} {buf=buf $0 "\n"} END{print buf}' \
  /var/log/i-want-my-mtg/ingestion.log | sed 's/\x1b\[[0-9;]*m//g' | tail -60
```

Match the last line against these:

| Last line looks like | What happened | Do this |
| --- | --- | --- |
| `Processing cards for set: XYZ` and then nothing | The run blocked and was killed. This is the wedge described in section 3. | Section 4 (re-run). |
| `command exceeded its 1800s deadline` | Scry's own deadline fired. The line above it names the phase. | Section 4. |
| `exceeded 2400s and was killed` | Scry did not even manage to fail on its own. | Section 3, then section 4. |
| `already running (lock ...); skipping this run` | A previous run never exited and still holds the lock. | Section 3. |
| `Scry complete` | The run was fine. The staleness is upstream - MTGJSON skipped a build. | Nothing to fix. |
| Anything with `error` / `Failed to` | A real error. Read it; it names the phase. | Depends on the error. |

## 3. A run is wedged right now

A wedged run uses no CPU and writes nothing. Confirm before killing anything:

```bash
pid=$(pgrep -f '/opt/scripts/scry ' | head -1)
echo "pid: ${pid:-none}"
[ -n "$pid" ] && ps -o pid,lstart,etime,%cpu,stat,wchan:20,cmd -p "$pid"
echo "--- log last written ---"; stat -c '%y' /var/log/i-want-my-mtg/ingestion.log
echo "--- system busy at all? ---"; uptime
```

`%cpu` near 0 with an `etime` of many minutes and a log that stopped updating
means it is blocked, not slow. Kill it and let section 4 re-run it:

```bash
pkill -f '/opt/scripts/scry ' && sleep 5 && pgrep -a -f '/opt/scripts/scry ' || echo "clear"
```

If it is blocked on the database, this shows what it is waiting for:

```bash
source /home/ubuntu/.env
psql "$DATABASE_URL" -c "
SELECT pid, state, wait_event_type, wait_event,
       now() - query_start AS running_for,
       left(query, 120) AS query
FROM pg_stat_activity
WHERE state <> 'idle' AND pid <> pg_backend_pid()
ORDER BY query_start;"

# Anything actually blocked behind another transaction:
psql "$DATABASE_URL" -c "
SELECT blocked.pid AS blocked_pid, blocking.pid AS blocking_pid,
       left(blocked.query, 80) AS blocked_query,
       left(blocking.query, 80) AS blocking_query
FROM pg_stat_activity blocked
JOIN LATERAL unnest(pg_blocking_pids(blocked.pid)) AS b(pid) ON true
JOIN pg_stat_activity blocking ON blocking.pid = b.pid;"
```

Since the 2026-08-22 fix this should be self-correcting: `lock_timeout` is 30s
and `statement_timeout` is 10 minutes on every connection scry opens, so a lock
wait now fails loudly instead of hanging. If you see a wedge with no blocking
pid and no query running, the connection's socket died and scry's own 1800s
deadline is what will end it.

## 4. Re-run the ingest by hand

Safe to run any time. It is idempotent, takes about 10 minutes, and is the same
command cron runs. Always go through the wrapper - the bare `/opt/scripts/scry`
has no `DATABASE_URL`.

```bash
# Foreground, watch it go:
/opt/scripts/scry.sh ingest

# Or detached, if you want your shell back:
nohup /opt/scripts/scry.sh ingest >> /var/log/i-want-my-mtg/ingestion.log 2>&1 &

# Follow along either way:
tail -f /var/log/i-want-my-mtg/ingestion.log | sed 's/\x1b\[[0-9;]*m//g' \
  | grep -vE "Skipping price for card|Processing cards for set"
```

Confirm it worked:

```bash
source /home/ubuntu/.env
psql "$DATABASE_URL" -c "SELECT max(date) AS newest_price FROM price;"
/opt/scripts/scry.sh health --detailed
```

## 5. Data looks wrong, not missing

```bash
source /home/ubuntu/.env

# Sets showing up with no cards in them (should be 0 after a healthy run):
psql "$DATABASE_URL" -c "
SELECT count(*) AS empty_sets FROM set s
WHERE NOT EXISTS (SELECT 1 FROM card c WHERE c.set_code = s.code);"

# Which ones:
psql "$DATABASE_URL" -c "
SELECT s.code, s.name FROM set s
WHERE NOT EXISTS (SELECT 1 FROM card c WHERE c.set_code = s.code)
ORDER BY s.code;"
```

A non-zero count means either the last ingest died partway (check section 1) or
the post-ingest prune did not run. The prune only runs after a *successful*
ingest, by design - pruning against a half-written catalog deletes every set the
run never reached. To run just the cleanup against a catalog you believe is
complete:

```bash
/opt/scripts/scry.sh post-ingest-prune
/opt/scripts/scry.sh post-ingest-updates
```

## 6. Is the binary current?

Scry updates ship with web deploys, not on their own. If a Scry fix is not
taking effect, the server may still be on the old binary:

```bash
ls -la /opt/scripts/scry          # mtime should match the last web deploy
/opt/scripts/scry.sh --version    # prints the banner first, version last
```

Compare that against scry's newest release (`gh release list --repo
matthewdtowles/scry --limit 1`). They drift whenever scry publishes *after* the
web deploy that would have carried it - on 2026-08-23 the server ran 5.18.3 for
a day while 5.18.5 was published, so two merged fixes were live nowhere. Every
deploy log now ends the cron setup with `Installed scry version: …`, so you can
also read it from the last CI run instead of SSH-ing in.

Refresh it without a full web deploy:

```bash
docker pull ghcr.io/matthewdtowles/scry:latest
cid=$(docker create ghcr.io/matthewdtowles/scry:latest)
sudo docker cp "$cid:/app/scry" /opt/scripts/scry
sudo chmod 755 /opt/scripts/scry
docker rm "$cid" && docker rmi ghcr.io/matthewdtowles/scry:latest
```

Do this only when the schema already has whatever the new binary expects - i.e.
after this repo's migrations have run. See the deployment-order section in
`CLAUDE.md`.

## The three nested deadlines

Worth knowing which one fired, because they say different things:

| Deadline | Where | Default | Meaning when it fires |
| --- | --- | --- | --- |
| `lock_timeout` | Postgres, per connection | 30s | Something else holds a lock scry needs. Usually the web app. |
| `statement_timeout` | Postgres, per connection | 10 min | One query ran absurdly long. |
| `SCRY_COMMAND_TIMEOUT_SECONDS` | inside scry | 1800s | The whole run overran. The last log line names the phase. |
| `SCRY_TIMEOUT_SECONDS` | `scry.sh`, via `timeout` | 2400s | Scry could not even fail on its own. Worst case; least informative. |

Before 2026-08-22 the first three did not exist, so a blocked query sat there
until the outermost one killed it an hour later with nothing in the log.
