#!/usr/bin/env bash
# CloudFront access logs (standard logging v2) to S3.
#
# On 2026-11-01 a crawl from about 10,000 Tencent Cloud and Alibaba Cloud addresses
# took the site down, and the only way to see who it was was SSH and the app's logs.
# These logs record every request CloudFront serves, cache hits included, with the
# client's network (asn) and country, so the next one shows up in `top`.
#
#   (no args)  preview: show what exists, change nothing
#   apply      create the bucket, delivery source, destination and delivery
#   top [H]    busiest networks, countries, IPs and user agents in the last H hours (default 1)
#   rollback   delete the delivery, destination and source (the bucket and its logs stay)
set -euo pipefail
shopt -s inherit_errexit

PROFILE=portfolio
REGION=us-east-1 # CloudFront log deliveries are configured in us-east-1
DIST_ID=E254IEMSQZLMSH
SOURCE=iwmm-cloudfront-access
DEST=iwmm-cloudfront-access-s3
RETENTION_DAYS=30
# No cs-uri-query or cs(Cookie): verification and password-reset links carry tokens in
# the query string, and the cookie is the login token. The app's request log drops both.
FIELDS=(timestamp c-ip asn c-country cs-method cs-uri-stem sc-status x-edge-result-type
    time-taken 'cs(User-Agent)' 'cs(Referer)' sc-bytes x-edge-location)

aws_() { aws --profile "$PROFILE" --region "$REGION" "$@"; }
account() { aws_ sts get-caller-identity --query Account --output text; }
find_delivery() {
    aws_ logs describe-deliveries --query "deliveries[?deliverySourceName=='$SOURCE'].id | [0]" --output text | sed 's/^None$//'
}

preview() {
    local bucket; bucket="iwmm-cloudfront-logs-$(account)"
    echo "Bucket:   $(aws_ s3api head-bucket --bucket "$bucket" >/dev/null 2>&1 && echo "$bucket" || echo none)"
    echo "Source:   $(aws_ logs get-delivery-source --name "$SOURCE" --query 'deliverySource.name' --output text 2>/dev/null || echo none)"
    echo "Dest:     $(aws_ logs get-delivery-destination --name "$DEST" --query 'deliveryDestination.arn' --output text 2>/dev/null || echo none)"
    echo "Delivery: $(find_delivery || true)"
}

apply() {
    local acct bucket dest_arn
    acct=$(account)
    bucket="iwmm-cloudfront-logs-$acct"

    aws_ s3api head-bucket --bucket "$bucket" >/dev/null 2>&1 || aws_ s3api create-bucket --bucket "$bucket" >/dev/null
    aws_ s3api put-public-access-block --bucket "$bucket" --public-access-block-configuration \
        BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
    aws_ s3api put-bucket-tagging --bucket "$bucket" --tagging 'TagSet=[{Key=project,Value=iwmm}]'
    aws_ s3api put-bucket-lifecycle-configuration --bucket "$bucket" --lifecycle-configuration \
        "{\"Rules\":[{\"ID\":\"expire\",\"Status\":\"Enabled\",\"Filter\":{},\"Expiration\":{\"Days\":$RETENTION_DAYS}}]}"
    aws_ s3api put-bucket-policy --bucket "$bucket" --policy "$(cat <<EOF
{"Version": "2012-10-17", "Statement": [{
  "Sid": "CloudFrontAccessLogDelivery",
  "Effect": "Allow",
  "Principal": {"Service": "delivery.logs.amazonaws.com"},
  "Action": "s3:PutObject",
  "Resource": "arn:aws:s3:::$bucket/*",
  "Condition": {
    "StringEquals": {"s3:x-amz-acl": "bucket-owner-full-control", "aws:SourceAccount": "$acct"},
    "ArnLike": {"aws:SourceArn": "arn:aws:logs:$REGION:$acct:delivery-source:$SOURCE"}
  }
}]}
EOF
)"

    aws_ logs put-delivery-source --name "$SOURCE" --log-type ACCESS_LOGS \
        --resource-arn "arn:aws:cloudfront::$acct:distribution/$DIST_ID" >/dev/null
    dest_arn=$(aws_ logs put-delivery-destination --name "$DEST" --output-format json \
        --delivery-destination-configuration "destinationResourceArn=arn:aws:s3:::$bucket" \
        --query 'deliveryDestination.arn' --output text)
    if [ -z "$(find_delivery)" ]; then
        aws_ logs create-delivery --delivery-source-name "$SOURCE" --delivery-destination-arn "$dest_arn" \
            --record-fields "${FIELDS[@]}" \
            --s3-delivery-configuration '{"suffixPath":"{yyyy}/{MM}/{dd}/{HH}","enableHiveCompatiblePath":false}' >/dev/null
    fi
    preview
    echo "Logs start arriving within a few minutes. Check with: $0 top"
}

top() {
    local hours=${1:-1} bucket since tmp
    bucket="iwmm-cloudfront-logs-$(account)"
    since=$(date -u -d "-$hours hours" +%Y-%m-%dT%H:%M:%S)
    tmp=$(mktemp -d)
    trap 'rm -rf "$tmp"' RETURN
    aws_ s3api list-objects-v2 --bucket "$bucket" --query "Contents[?LastModified>='$since'].Key" --output text |
        tr '\t' '\n' | grep -v '^None$' | while read -r key; do
        aws_ s3 cp "s3://$bucket/$key" - --quiet | gzip -dcf
    done > "$tmp/requests.json"
    echo "Requests in the last $hours hour(s): $(wc -l < "$tmp/requests.json")"
    for field in asn c-country c-ip 'cs(User-Agent)' cs-uri-stem; do
        echo "== $field"
        jq -r --arg f "$field" '.[$f] // "-"' "$tmp/requests.json" | sort | uniq -c | sort -rn | head -10
    done
}

rollback() {
    local id
    id=$(find_delivery)
    [ -n "$id" ] && aws_ logs delete-delivery --id "$id"
    aws_ logs delete-delivery-destination --name "$DEST" 2>/dev/null || true
    aws_ logs delete-delivery-source --name "$SOURCE" 2>/dev/null || true
    preview
}

case "${1:-}" in
    '') preview ;;
    apply) apply ;;
    top) top "${2:-1}" ;;
    rollback) rollback ;;
    *) echo "usage: $0 [apply|top [hours]|rollback]" >&2; exit 2 ;;
esac
