#!/bin/bash
# POC/App Log Update Suggestion Hook
# Triggered after git commit to remind updating development logs
# for any apps/* projects

# Get the list of changed files in the last commit
CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")

# Check if any apps/* files were changed
if echo "$CHANGED_FILES" | grep -q "^apps/"; then
    # Extract the app name(s) that were modified
    APP_NAMES=$(echo "$CHANGED_FILES" | grep "^apps/" | cut -d'/' -f2 | sort -u)

    echo "" >&2
    echo "========================================" >&2
    echo "Development Log Reminder" >&2
    echo "========================================" >&2
    echo "" >&2
    echo "The following app(s) were modified:" >&2
    for APP in $APP_NAMES; do
        echo "  - apps/$APP" >&2
    done
    echo "" >&2
    echo "Consider updating the development log:" >&2
    echo "  docs/business/MUEDnote/poc-log.md (for MUEDnote)" >&2
    echo "  or create a new log file for other projects" >&2
    echo "" >&2
    echo "Record:" >&2
    echo "  - What was tested/implemented" >&2
    echo "  - Issues encountered and solutions" >&2
    echo "  - Results and next steps" >&2
    echo "" >&2
    echo "========================================" >&2
fi
