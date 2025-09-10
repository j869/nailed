#!/bin/bash

DB_NAME="nailed"
DB_USER="postgres"
SCHEMA_FILE="schema_changes.sql"

# Check if schema file exists
if [ ! -f "$SCHEMA_FILE" ]; then
    echo "Error: Schema file '$SCHEMA_FILE' not found!" >&2
    exit 1
fi

# Check if running as root (sudo)
if [ "$EUID" -ne 0 ]; then
    echo -n "Enter database password for user $DB_USER: "
    read -s DB_PASS
    echo
    # Execute as regular user with password
    PGPASSWORD="$DB_PASS" psql -U "$DB_USER" -d "$DB_NAME" -f "$SCHEMA_FILE"
    exit_code=$?
else
    # Execute as root using sudo to run as postgres user
    sudo -u postgres psql -d "$DB_NAME" -f "$SCHEMA_FILE"
    exit_code=$?
fi

# Check exit status
if [ $exit_code -eq 0 ]; then
    echo "Schema changes applied successfully."
else
    echo "Error: Failed to apply schema changes!" >&2
    exit $exit_code
fi