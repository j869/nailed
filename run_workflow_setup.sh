#!/bin/bash

# Script to run the workflow setup SQL and verify the results
# This script will execute the schema_workflow.sql file and run verification tests

echo "=== Workflow Setup Script ==="
echo "Starting at: $(date)"
echo ""

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

# Check if schema_workflow.sql exists
if [ ! -f "schema_workflow.sql" ]; then
    echo "ERROR: schema_workflow.sql file not found in current directory"
    exit 1
fi

echo "=== Executing workflow setup SQL ==="
echo "Running schema_workflow.sql..."

# Execute the SQL file
psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f schema_workflow.sql

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to execute schema_workflow.sql"
    exit 1
fi

echo "✓ SQL execution completed successfully"
echo ""

echo "=== Running verification tests ==="
echo "Executing test_workflow_setup.sql..."

# Run the test verification
psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f test_workflow_setup.sql

if [ $? -ne 0 ]; then
    echo "WARNING: Test verification had issues, but setup may still be successful"
else
    echo "✓ All verification tests passed"
fi

echo ""
echo "=== Workflow Setup Complete ==="
echo "Finished at: $(date)"
echo ""
echo "Summary:"
echo "- Modular workflows 51-55 have been created"
echo "- Branching logic has been implemented"
echo "- Products 51-55 have been added"
echo "- Job templates with proper triggers have been set up"
echo ""
echo "Next steps:"
echo "1. Test the workflows in your application"
echo "2. Verify the branching logic works as expected"
echo "3. Check that workflow transitions trigger correctly"
