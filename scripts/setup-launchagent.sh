#!/bin/bash
# setup-launchagent.sh — Installs a LaunchAgent to run push.mjs every 60s

set -e

LABEL="ai.invictus.mission-control-push"
PLIST_PATH="$HOME/Library/LaunchAgents/${LABEL}.plist"
SCRIPT_PATH="/Users/jarvisbot/.openclaw/workspace/mission-control/scripts/push.mjs"
LOG_PATH="/tmp/mission-control-push.log"

echo "Installing LaunchAgent: ${LABEL}"

# Ensure scripts dir exists
mkdir -p "$(dirname "$SCRIPT_PATH")"

# Write plist
cat > "$PLIST_PATH" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>ai.invictus.mission-control-push</string>
	<key>ProgramArguments</key>
	<array>
		<string>/opt/homebrew/bin/node</string>
		<string>/Users/jarvisbot/.openclaw/workspace/mission-control/scripts/push.mjs</string>
	</array>
	<key>StartInterval</key>
	<integer>60</integer>
	<key>EnvironmentVariables</key>
	<dict>
		<key>PUSH_SECRET</key>
		<string>inv-mc-push-2026</string>
		<key>VERCEL_URL</key>
		<string>https://mission-control-gray-rho.vercel.app</string>
	</dict>
	<key>RunAtLoad</key>
	<true/>
	<key>StandardOutPath</key>
	<string>/tmp/mission-control-push.log</string>
	<key>StandardErrorPath</key>
	<string>/tmp/mission-control-push.log</string>
</dict>
</plist>
EOF

echo "plist written to: $PLIST_PATH"

# Load (or re-load) the agent
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

echo "LaunchAgent loaded. Log: $LOG_PATH"
echo "Run manually: /opt/homebrew/bin/node $SCRIPT_PATH"
echo "Uninstall:   launchctl unload $PLIST_PATH && rm $PLIST_PATH"
