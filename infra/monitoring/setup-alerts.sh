#!/usr/bin/env bash
# Uptime alerts for #625.
#   (no args)  preview: show what exists, change nothing
#   apply      create or update the topic, subscription, health check and both alarms
#   test       break the health check path on purpose and force the edge alarm, so both emails arrive
#   restore    put the health check path back after a test
#   rollback   delete everything this script created
set -euo pipefail
shopt -s inherit_errexit

PROFILE=portfolio
REGION=us-east-1          # Route 53 health check metrics and CloudFront metrics only exist here
EMAIL=legal@iwantmymtg.net
TOPIC_NAME=iwmm-production-alerts
DIST_ID=E254IEMSQZLMSH
ORIGIN_HOST=lightsail.iwantmymtg.net
GOOD_PATH='/api/v1/sets?page=1&limit=1'
BAD_PATH='/api/v1/iwmm-alert-test'
HC_NAME=iwmm-origin
ORIGIN_ALARM=iwmm-origin-failing
EDGE_ALARM=iwmm-cloudfront-5xx

aws_() { aws --profile "$PROFILE" --region "$REGION" "$@"; }

find_topic() { aws_ sns list-topics --query "Topics[?ends_with(TopicArn, ':$TOPIC_NAME')].TopicArn | [0]" --output text | sed 's/^None$//'; }
find_hc() {
  aws_ route53 list-health-checks --query "HealthChecks[?HealthCheckConfig.FullyQualifiedDomainName=='$ORIGIN_HOST'].Id | [0]" --output text | sed 's/^None$//'
}

preview() {
  echo "Topic:        $(find_topic || true)"
  local t; t=$(find_topic)
  [ -n "$t" ] && aws_ sns list-subscriptions-by-topic --topic-arn "$t" --query 'Subscriptions[].[Endpoint,SubscriptionArn]' --output text
  local hc; hc=$(find_hc)
  echo "Health check: ${hc:-none}"
  [ -n "$hc" ] && aws_ route53 get-health-check --health-check-id "$hc" --query 'HealthCheck.HealthCheckConfig.[FullyQualifiedDomainName,Port,ResourcePath,RequestInterval,FailureThreshold]' --output text
  aws_ cloudwatch describe-alarms --alarm-names "$ORIGIN_ALARM" "$EDGE_ALARM" --query 'MetricAlarms[].[AlarmName,StateValue]' --output text
}

apply() {
  local topic
  topic=$(aws_ sns create-topic --name "$TOPIC_NAME" --query TopicArn --output text)
  echo "Topic: $topic"

  if aws_ sns list-subscriptions-by-topic --topic-arn "$topic" --query 'Subscriptions[].Endpoint' --output text | grep -qx "$EMAIL"; then
    echo "Email already subscribed."
  else
    aws_ sns subscribe --topic-arn "$topic" --protocol email --notification-endpoint "$EMAIL" >/dev/null
    echo "Subscribed $EMAIL. Click the confirmation link AWS just emailed, or no alert will be delivered."
  fi

  local hc; hc=$(find_hc)
  if [ -z "$hc" ]; then
    hc=$(aws_ route53 create-health-check --caller-reference "$HC_NAME-$(date +%s)" --query HealthCheck.Id --output text \
      --health-check-config "{\"Type\":\"HTTP\",\"FullyQualifiedDomainName\":\"$ORIGIN_HOST\",\"Port\":80,\"ResourcePath\":\"$GOOD_PATH\",\"RequestInterval\":30,\"FailureThreshold\":1,\"Regions\":[\"us-east-1\",\"us-west-2\",\"eu-west-1\"]}")
    aws_ route53 change-tags-for-resource --resource-type healthcheck --resource-id "$hc" --add-tags "Key=Name,Value=$HC_NAME"
    echo "Created health check $hc"
  else
    echo "Health check exists: $hc"
  fi
  [[ "$hc" =~ ^[0-9a-f-]{36}$ ]] || { echo "Unexpected health check id: $hc"; exit 1; }

  aws_ cloudwatch put-metric-alarm --alarm-name "$ORIGIN_ALARM" \
    --alarm-description "The app on the Lightsail server failed the sets check from 3 AWS regions in 3 of the last 5 minutes (#625)." \
    --namespace AWS/Route53 --metric-name HealthCheckPercentageHealthy \
    --dimensions "Name=HealthCheckId,Value=$hc" \
    --statistic Average --period 60 --evaluation-periods 5 --datapoints-to-alarm 3 \
    --threshold 75 --comparison-operator LessThanThreshold --treat-missing-data breaching \
    --alarm-actions "$topic" --ok-actions "$topic"
  echo "Alarm $ORIGIN_ALARM set."

  aws_ cloudwatch put-metric-alarm --alarm-name "$EDGE_ALARM" \
    --alarm-description "More than 10% of CloudFront responses were 5xx in 3 of the last 5 minutes (#625)." \
    --namespace AWS/CloudFront --metric-name 5xxErrorRate \
    --dimensions "Name=DistributionId,Value=$DIST_ID" "Name=Region,Value=Global" \
    --statistic Average --period 60 --evaluation-periods 5 --datapoints-to-alarm 3 \
    --threshold 10 --comparison-operator GreaterThanThreshold --treat-missing-data notBreaching \
    --alarm-actions "$topic" --ok-actions "$topic"
  echo "Alarm $EDGE_ALARM set."
}

set_path() {
  local hc; hc=$(find_hc)
  [ -n "$hc" ] || { echo "No health check. Run apply first."; exit 1; }
  aws_ route53 update-health-check --health-check-id "$hc" --resource-path "$1" >/dev/null
  echo "Health check now requests $1"
}

test_() {
  set_path "$BAD_PATH"
  echo "Expect an ALARM email for $ORIGIN_ALARM in about 3 to 5 minutes. Then run: restore"
  aws_ cloudwatch set-alarm-state --alarm-name "$EDGE_ALARM" --state-value ALARM --state-reason "Test of alert delivery (#625)"
  echo "Forced $EDGE_ALARM to ALARM. Expect its ALARM email now and an OK email within a few minutes."
}

rollback() {
  aws_ cloudwatch delete-alarms --alarm-names "$ORIGIN_ALARM" "$EDGE_ALARM"
  local hc; hc=$(find_hc)
  [ -n "$hc" ] && aws_ route53 delete-health-check --health-check-id "$hc"
  local t; t=$(find_topic)
  [ -n "$t" ] && aws_ sns delete-topic --topic-arn "$t"
  echo "Removed."
}

case "${1:-preview}" in
  preview) preview ;;
  apply) apply ;;
  test) test_ ;;
  restore) set_path "$GOOD_PATH" ;;
  rollback) rollback ;;
  *) echo "Usage: $0 [preview|apply|test|restore|rollback]"; exit 1 ;;
esac
