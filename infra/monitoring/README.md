# Uptime alerts (#625)

Two alarms email `legal@iwantmymtg.net`, the same address the cron jobs mail, through
the SNS topic `iwmm-production-alerts`. Everything lives in `us-east-1`, the only region
where Route 53 health check metrics and CloudFront metrics are published. Nothing here
is applied automatically: run `setup-alerts.sh` with the `portfolio` AWS profile (no
argument previews; then `apply`, `test`, `restore`, or `rollback`).

| Alarm | Watches | Fires when | Catches |
|---|---|---|---|
| `iwmm-origin-failing` | Route 53 health check `iwmm-origin` | fewer than 75% of checks pass in 3 of the last 5 minutes | the app or the database is down or flapping |
| `iwmm-cloudfront-5xx` | CloudFront `5xxErrorRate` on `E254IEMSQZLMSH` | more than 10% of responses are 5xx in 3 of the last 5 minutes | what users actually see, including errors CloudFront generates itself |

Both alarms also email when they recover.

## Why the health check skips CloudFront

The check requests `http://lightsail.iwantmymtg.net/api/v1/sets?page=1&limit=1` directly.
Through CloudFront that path is cached for 60 seconds and can be served stale for 5
minutes more, so a dead origin could look healthy for several minutes. Hitting the
origin makes every check run the real path: controller, service, repository, database.

The check runs from 3 regions every 30 seconds with a failure threshold of 1, so each
checker reports the raw result and the percentage tracks the real failure rate. "3 of
the last 5 minutes" alarms on flapping without firing on a single blip. Route 53 also
counts a response slower than about 2 seconds as a failure.

## Verify

An alarm that has never fired on purpose is not known to work. `setup-alerts.sh`'s
`test` mode points the health check at a path that returns 404 and forces the CloudFront
alarm into ALARM. Expect both ALARM emails, then run `restore` and expect both OK
emails.

## Cost

About $1 a month: one Route 53 health check on a non-AWS endpoint and two CloudWatch
alarms. SNS email delivery is free at this volume.
