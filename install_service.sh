#!/bin/bash

# Path to this script for re-running it
SCRIPT_PATH="$0"

# Set DEBUG_MODE to true initially
DEBUG_MODE=${DEBUG_MODE:-true}

# Ensure the script is run from the root directory of the repo
if [ ! -d ".git" ]; then
    echo "Please run this script from the root directory of your Git repository."
    exit 1
fi

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "tmux is not installed. Please install tmux and try again."
    exit 1
fi

# Capture the start time of the installation
start_time=$(date "+%Y-%m-%d %H:%M:%S")

# Dynamically detect the current repository path and name
REPO_PATH=$(pwd)
SAFE_REPO_NAME=$(basename "$REPO_PATH" | sed 's/[^a-zA-Z0-9]/_/g')

# Check if the update_check log file exists and remove it if so
LOG_FILE="$REPO_PATH/update_check.log"
if [ -f "$LOG_FILE" ]; then
    echo "Removing existing log file: $LOG_FILE"
    rm "$LOG_FILE"
fi

# Set the service file name and service name
SERVICE_NAME="CD-$SAFE_REPO_NAME"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"
TRACE_FILE="$REPO_PATH/$SERVICE_NAME.service.trace.txt"

# Select ExecStart based on DEBUG_MODE
if [ "$DEBUG_MODE" = true ]; then
    EXEC_START_LINE="ExecStart=/usr/bin/tmux new-session -s \"CD-$SAFE_REPO_NAME\" -d 'cd $REPO_PATH;/bin/bash $REPO_PATH/update_check.sh >> \"$LOG_FILE\" 2>&1'"
else
    EXEC_START_LINE="ExecStart=/usr/bin/tmux new-session -s \"CD-$SAFE_REPO_NAME\" -d 'cd $REPO_PATH;/bin/bash $REPO_PATH/update_check.sh'"
fi

# Create the service file dynamically
echo "Creating $SERVICE_NAME.service with path $REPO_PATH..."
sudo bash -c "cat > $SERVICE_FILE" <<EOL
[Unit]
Description=Repository Update Check Service. Starts tmux session called "CD-$SAFE_REPO_NAME", visible by sudo tmux list-sessions
After=network.target

[Service]
Type=forking
User=$USER
WorkingDirectory=$REPO_PATH
$EXEC_START_LINE
ExecStop=/usr/bin/tmux kill-session -t "CD-$SAFE_REPO_NAME"
RemainAfterExit=yes
KillMode=none

[Install]
WantedBy=multi-user.target
EOL

# Created the service file 
echo "Created the service file $SERVICE_NAME.service..."
cat $SERVICE_FILE

# Reload systemd to recognize the new service
echo "Reloading systemd daemon..."
sudo systemctl daemon-reload

# Enable and start the service
echo "Enabling and starting $SERVICE_NAME.service..."
sudo systemctl enable "$SERVICE_NAME.service"
sudo systemctl restart "$SERVICE_NAME.service"

# Wait briefly to give tmux time to start the session
sleep 2

# Create a trace file
echo "Recording service status to $TRACE_FILE..."
{
    echo "Service Status:"
    systemctl status "$SERVICE_NAME.service" --no-pager -l | tail -20
    echo -e "\nJournal Logs:"
    journalctl -u "$SERVICE_NAME.service" --since="$start_time" -n 20
} > "$TRACE_FILE"

# Display the content of the trace file
cat "$TRACE_FILE"

# Define the expected base name for the session
BASE_SESSION_NAME="CD-$SAFE_REPO_NAME"

# Find the actual session name that contains the base name
ACTUAL_SESSION_NAME=$(tmux list-sessions | grep "$BASE_SESSION_NAME" | awk '{print $1}' | sed 's/://')

# Check if the session was found
if [ -n "$ACTUAL_SESSION_NAME" ]; then
    echo "The tmux session '$ACTUAL_SESSION_NAME' has started successfully."
else
    echo "Error: No tmux session matching '$BASE_SESSION_NAME' was found."
    echo "Please check the service configuration and logs for details."
    echo "Contents of '$LOG_FILE':"
    cat "$LOG_FILE"
    exit 1
fi

# Check if the script is running in DEBUG_MODE and needs to switch to standard mode
if [ "$DEBUG_MODE" = true ]; then
    echo "Debug mode completed. Switching to standard mode without logging."
    
    # Re-run the script with DEBUG_MODE set to false
    DEBUG_MODE=false exec "$SCRIPT_PATH"
else
    echo "Installation and setup of $SERVICE_NAME.service completed without debug mode."
fi
