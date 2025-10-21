#!/bin/bash

# Truncate Docker logs
for log in /var/lib/docker/containers/*/*-json.log; do
  truncate -s 0 "$log"
done

# (Optional) Truncate all logs in /var/log/
# for log in /var/log/*.log; do
#   truncate -s 0 "$log"
# done