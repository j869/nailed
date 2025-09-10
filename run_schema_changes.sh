#!/bin/bash
# to run use this command: bash run_workflow_setup.sh

# Script to run the schema changes SQL and verify basic execution
# This script will execute the schema_changes.sql file


# Check if PostgreSQL is available
if ! command -v psql &> /dev/null; then
    echo "ERROR: psql command not found. Please install PostgreSQL client."
    exit 1
fi

# Set database connection parameters (modify these as needed)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-nailed}"
DB_USER="${DB_USER:-postgres}"

echo "Database connection settings:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Check if schema_changes.sql exists
if [ ! -f "schema_changes.sql" ]; then
    echo "ERROR: schema_changes.sql file not found in current directory"
    exit 1
fi

echo "=== Executing schema changes SQL ==="

# Execute the SQL file and capture output
OUTPUT=$(psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f schema_changes.sql 2>&1)
EXIT_CODE=$?

echo "$OUTPUT"

echo "=== Schema Changes Setup Complete ==="

if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "❌ ERROR: Failed to execute schema_changes.sql"
    echo "Exit code: $EXIT_CODE"
    exit 1
fi

# Check for common error patterns in output
if echo "$OUTPUT" | grep -i "error\|failed\|fatal" | grep -v "IF NOT EXISTS\|already exists"; then
    echo ""
    echo "⚠️  WARNING: Potential errors detected in output (see above)"
    echo "Review the output carefully for any important errors"
else
    echo ""
    echo "✅ SQL execution completed successfully"
fi

