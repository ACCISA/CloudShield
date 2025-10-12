#!/bin/bash

# Start a new detached tmux session named "my_session"
tmux new-session -d -s my_session

tmux split-window -h -t my_session
tmux split-window -h -t my_session

# Send first command
tmux send-keys -t my_session:0.0 'cd ThreatDetection && python3 server.py ' C-m

# Send second command (runs after the first finishes unless you add &)

tmux send-keys -t my_session:0.1 'cd Agent && python3 main.py ' C-m
tmux send-keys -t my_session:0.2 'cd Agent && python3 main.py ' C-m

# Attach to the session so you can see the output
tmux attach -t my_session

