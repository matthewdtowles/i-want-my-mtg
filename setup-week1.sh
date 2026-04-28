#!/bin/bash

set -e

OWNER="matthewdtowles"
PROJECT_ID="PVT_kwHOAP2Yos4A4tP0"
STATUS_FIELD_ID="PVTSSF_lAHOAP2Yos4A4tP0zgtoQGs"
READY_OPTION_ID="5f2e899e"  # On Deck

# gh project item-add takes the project NUMBER (e.g. 1), not the node ID.
# Resolve it from the node ID once at startup.
PROJECT_NUMBER=$(gh project list --owner "$OWNER" --format json \
  | jq -r --arg id "$PROJECT_ID" '.projects[] | select(.id == $id) | .number')

if [ -z "$PROJECT_NUMBER" ]; then
  echo "Could not resolve project number for $PROJECT_ID under owner $OWNER" >&2
  exit 1
fi

echo "Setting up Week 1 in existing project: I Want My MTG"

create_issue_and_add () {
  TITLE=$1
  BODY=$2
  LABELS=$3

  ISSUE_URL=$(gh issue create \
    --title "$TITLE" \
    --body "$BODY" \
    --label "$LABELS")

  echo "Created: $ISSUE_URL"

  ITEM_ID=$(gh project item-add "$PROJECT_NUMBER" \
    --owner "$OWNER" \
    --url "$ISSUE_URL" \
    --format json | jq -r '.id')

  echo "Added to project: $ITEM_ID"

  gh project item-edit \
    --id "$ITEM_ID" \
    --project-id "$PROJECT_ID" \
    --field-id "$STATUS_FIELD_ID" \
    --single-select-option-id "$READY_OPTION_ID"

  echo "Set Status → On Deck"
}

# -----------------------
# CORE PRODUCT
# -----------------------

create_issue_and_add \
"Simplify landing page to single CTA" \
"Remove all competing actions. Add one CTA: 'Start Tracking Your Collection'.

Acceptance:
- One clear action
- Value obvious in <5 seconds" \
"week-1,frontend,ux,high-impact"

create_issue_and_add \
"Implement basic card search and add flow" \
"User can search and click to add instantly.

Acceptance:
- Search works (basic is fine)
- Click adds immediately

Out of scope:
- filters
- optimization" \
"week-1,frontend,backend,high-impact,do-not-overengineer"

create_issue_and_add \
"Default quantity = 1 (no friction)" \
"Selecting a card adds it with quantity = 1 automatically.

No modal. No extra input." \
"week-1,frontend,ux"

create_issue_and_add \
"Show 'Added to collection' feedback" \
"Display confirmation when card is added." \
"week-1,frontend,ux"

create_issue_and_add \
"Display collection list" \
"Show added cards in a simple list." \
"week-1,frontend"

create_issue_and_add \
"Display total collection value prominently" \
"Show large, obvious total value at top.

Must update when cards are added." \
"week-1,frontend,high-impact"

create_issue_and_add \
"Deploy app to production" \
"App must be accessible via public URL." \
"week-1,backend,high-impact"

create_issue_and_add \
"Test full user flow (incognito)" \
"Add 3 cards → see value in <2 minutes.

Identify friction points." \
"week-1,ux,high-impact"

create_issue_and_add \
"Fix top 1-2 friction issues" \
"Fix only biggest blockers. No new features." \
"week-1,ux,high-impact"

# -----------------------
# DISTRIBUTION
# -----------------------

create_issue_and_add \
"Create Reddit feedback post" \
"Post app asking for honest feedback." \
"week-1,distribution,high-impact"

create_issue_and_add \
"Create Reddit discussion post" \
"Ask how users track MTG collections today." \
"week-1,distribution"

create_issue_and_add \
"Engage with comments" \
"Reply to all comments and ask follow-ups." \
"week-1,distribution,high-impact"

# -----------------------
# SEO
# -----------------------

create_issue_and_add \
"Create SEO landing page" \
"Title: MTG Collection Tracker (Free & Fast)

2-3 paragraphs. Link to app.

Timebox: 45 minutes." \
"week-1,seo"

echo "✅ Week 1 fully loaded into your project (Status = On Deck)"