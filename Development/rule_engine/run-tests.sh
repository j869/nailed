#!/bin/bash

# Test Runner for Workflow Validator
# Created: 4 September 2025
# Purpose: Run all workflow validator tests

echo "========================================="
echo "Workflow Validator Test Suite"
echo "========================================="

cd /home/john/Documents/nailed

echo ""
echo "Test 1: Database Connection and Data Validation"
echo "-----------------------------------------------"
node tests/test-workflow-validator.js

echo ""
echo "Test 2: HTTP Endpoint Testing"
echo "------------------------------" 
echo "Note: This requires the server to be running"
echo "Start server with: node index.js"
echo ""
read -p "Is the server running on port 4000? (y/n): " server_running

if [ "$server_running" = "y" ] || [ "$server_running" = "Y" ]; then
    node tests/test-http-endpoint.js
else
    echo "Skipping HTTP tests - server not running"
fi

echo ""
echo "Test 3: Workflow Rules Tests"
echo "-----------------------------------------------"
for test_file in Testing_and_Documentation/workflow_rules/test_*.js; do
    echo "Running $test_file..."
    node "$test_file"
done

echo ""
echo "========================================="
echo "Test Suite Complete"
echo "========================================="
