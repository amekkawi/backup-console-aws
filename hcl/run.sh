#!/bin/bash

SCRIPTDIR="$(cd "$(dirname "$0")" 2> /dev/null && pwd)"

ACTION="$1"
! echo "$ACTION" | grep -qE '^(plan|apply|destroy)$' && echo "First argument should be plan, apply, or destroy" 1>&2 && exit 1

PLAN_OR_DIR="$SCRIPTDIR"
IS_PLAN=0

function exitClean() {
    clean
    exit $1
}

function clean() {
    # Remove symlink used in dev environment
    if [ -h "${SCRIPTDIR}/../node_modules/backup-console-core" ]; then
        echo "Removing symlink to backup-console-core"
        rm "${SCRIPTDIR}/../node_modules/backup-console-core"
        [ $? -ne 0 ] && echo "Failed to remove node_modules/backup-console-core symlink" 1>&2
    fi
}

# Clean up before running, just in case
clean

# Determine terraform CLI path
TERRAFORM_CMD="$(command -v terraform 2> /dev/null)"
[ -z "$TERRAFORM_CMD" -a -x "./terraform" ] && TERRAFORM_CMD="./terraform"
[ -z "$TERRAFORM_CMD" ] && echo "terraform CLI not found" 1>&2 && exitClean 1

# Determine git CLI path
GIT_CMD="$(command -v git 2> /dev/null)"
[ -z "$GIT_CMD" ] && echo "git CLI not found" 1>&2 && exitClean 1

# Determine git short hash
COMMIT_HASH="$(cd "$SCRIPTDIR" 2> /dev/null && "$GIT_CMD" rev-parse --short HEAD)"
[ -z "$COMMIT_HASH" ] && echo "Failed to determine commit hash" 1>&2 && exitClean 1

# Check for second arg for "apply"
if [ -n "$2" ]; then
    [ "$ACTION" != "apply" ] && echo "Unexpected arg: $2" 1>&2 && exitClean 1
    [ ! -f "$2" ] && echo "File does not exist: $2" 1>&2 && exitClean 1
    PLAN_OR_DIR="$2"
    IS_PLAN=1
fi

# Create lambda zip, unless using "apply" with a plan file
if [ "$ACTION" != "apply" -o "$IS_PLAN" -eq 0 ]; then
    ORIG_CWD="$(pwd)"

    if [ -f "$SCRIPTDIR/lambda_src.zip" ]; then
        rm "$SCRIPTDIR/lambda_src.zip"
        [ $? -ne 0 ] && echo "Failed to remove old lambda_src.zip" 1>&2 && exitClean 1
    fi

    if [ -f "$SCRIPTDIR/lambda_worker_src.zip" ]; then
        rm "$SCRIPTDIR/lambda_worker_src.zip"
        [ $? -ne 0 ] && echo "Failed to remove old lambda_worker_src.zip" 1>&2 && exitClean 1
    fi

    cd "$SCRIPTDIR/.."
    [ ! -d lib ] && echo "lib dir not found" 1>&2 && exitClean 1
    [ ! -d node_modules/cwlogs-writable ] && echo "node_modules/cwlogs-writable dir not found" 1>&2 && exitClean 1
    #[ ! -d node_modules/backup-console-core ] && echo "node_modules/backup-console-core dir not found" 1>&2 && exitClean 1

    # Use symlink in dev environment
    if [ ! -d node_modules/backup-console-core -a -d ../backup-console-core ]; then
        echo "Creating symlink to backup-console-core"
        ln -s ../backup-console-core node_modules/backup-console-core
        [ $? -ne 0 ] && echo "Failed to create symlink" 1>&2 && exitClean 1
    fi

    echo "Zipping lambda_src.zip"
    zip -qXr "$SCRIPTDIR/lambda_src.zip" \
        lib \
        node_modules/backup-console-core/package.json \
        node_modules/backup-console-core/lib \
        node_modules/cwlogs-writable
    [ $? -ne 0 ] && echo "Failed to zip lambda_src.zip" 1>&2 && exitClean 1

    echo "Zipping lambda_worker_src.zip"
    zip -qXr "$SCRIPTDIR/lambda_worker_src.zip" \
        lib \
        node_modules/backup-console-core/package.json \
        node_modules/backup-console-core/lib \
        node_modules/backup-console-core/node_modules/mailparser \
        node_modules/backup-console-core/node_modules/htmlparser2 \
        node_modules/cwlogs-writable
    [ $? -ne 0 ] && echo "Failed to zip lambda_worker_src.zip" 1>&2 && exitClean 1

    cd "$ORIG_CWD"
    [ $? -ne 0 ] && echo "Failed to CD back to original working dir" 1>&2 && exitClean 1
fi

CLI_ARGS=
if [ "$ACTION" == "plan" ]; then
    #_$(date -u +%Y%m%dT%H%M%SZ)
    CLI_ARGS="-out $SCRIPTDIR/terraform.plan"
fi

if [ "$ACTION" == "apply" -a "$IS_PLAN" -eq 1 ]; then
    "$TERRAFORM_CMD" "$ACTION" $CLI_ARGS \
        -state="$SCRIPTDIR/terraform.tfstate" \
        "$PLAN_OR_DIR"
else
    "$TERRAFORM_CMD" "$ACTION" $CLI_ARGS \
        -var 'EmailDomain=ses.andremekkawi.com' \
        -var 'EmailPrefix=backup-consolev3' \
        -var 'ResourcePrefix=backup-console-v3' \
        -var 'SecondaryEmail=' \
        -var 'SesRuleSet=v3-rule-set' \
        -var "CommitHash=${COMMIT_HASH}" \
        -state="$SCRIPTDIR/terraform.tfstate" \
        "$PLAN_OR_DIR"
fi

# If used a plan file, remove it so it isn't used again by accident.
if [ "$IS_PLAN" -eq 1 -a -f "$PLAN_OR_DIR" ]; then
    echo "Removing $PLAN_OR_DIR"
    rm "$PLAN_OR_DIR"
fi

exitClean 0
