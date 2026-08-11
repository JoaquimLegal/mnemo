#!/usr/bin/env bash
# Self-contained demo of mnemo. Run from a scratch dir:
#   bash scripts/demo.sh
set -euo pipefail

MM=${MM:-mm}

echo "────────────── mnemo: git-native memory for AI agents ──────────────"
echo

echo "\$ $MM init"
$MM init
echo

echo "\$ $MM new 'We chose Postgres' --body 'over Mongo, because of transactions' --tags decision,db --importance 0.9"
$MM new "We chose Postgres" --body "over Mongo, because of transactions" --tags decision,db --importance 0.9
echo

echo "\$ $MM new 'User prefers tabs' --body 'two-space indent, tabs in Makefiles' --tags preference --importance 0.6"
$MM new "User prefers tabs" --body "two-space indent, tabs in Makefiles" --tags preference --importance 0.6
echo

echo "\$ $MM ls"
$MM ls
echo

echo "\$ $MM search 'postgres decision'"
$MM search "postgres decision"
echo

echo "\$ $MM log"
$MM log
echo

echo "\$ $MM undo   # revert the last change (keeps history)"
$MM undo
echo

echo "\$ $MM log"
$MM log
echo

echo "\$ $MM branch experiment"
$MM branch experiment
echo

echo "\$ $MM new 'try sqlite instead' --importance 0.4 --type episodic"
$MM new "try sqlite instead" --importance 0.4 --type episodic
echo

echo "\$ $MM switch main"
$MM switch main
echo

echo "\$ $MM snapshot v1"
$MM snapshot v1
echo

echo "── done. Remember: an agent's memory is just a git repo. ──"
