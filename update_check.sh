#!/bin/bash

# Detect the current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Detect the remote associated with the current branch
REMOTE=$(git config branch."$BRANCH".remote)

# Get the latest commit hash on the specified branch
last_commit=$(git rev-parse "$REMOTE/$BRANCH")

# Get the directory of this script and define the path to build_and_deploy.sh
SCRIPT_DIR=$(dirname "$(realpath "$0")")
BUILD_SCRIPT="$SCRIPT_DIR/build_and_deploy.sh"

# Check if build_and_deploy.sh is executable
if [ ! -x "$BUILD_SCRIPT" ]; then
    echo "Error: $BUILD_SCRIPT not found or not executable."
    exit 1
fi

while true; do
    # Fetch the latest commit hash on the remote branch
    current_commit=$(git ls-remote "$REMOTE" "refs/heads/$BRANCH" | awk '{print $1}')

    # Check if there is a new commit
    if [[ "$current_commit" != "$last_commit" ]]; then
        echo "New commit detected"
        echo "Starting build_and_deploy pipeline"

        # Execute the build_and_deploy script
        if "$BUILD_SCRIPT"; then
            echo "Build and deploy successful"
        else
            echo "Error: Build and deploy failed"
        fi

        # Update the last known commit hash
        last_commit=$current_commit
    fi

    # Wait for n seconds before checking again
    sleep 5
done
