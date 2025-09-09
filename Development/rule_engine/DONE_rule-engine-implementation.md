# Rule Engine Implementation - Stage 1 Demo

## Overview

This implementation provides a cautious and tentative approach to replacing the large switch statement in the `/update` route with a more maintainable rule engine system. The system is designed for gradual migration while maintaining backward compatibility.

## Architecture

### Core Components

1. **RuleEngine** (`utils/ruleEngine.js`)
   - Central processing engine for field updates
   - Configurable validation and action system
   - Extensible handler architecture

2. **UpdateHelper** (`utils/updateHelper.js`)
   - Standardized field update utilities
   - Transaction support
   - Cascade update handling

3. **ChangeProcessor** (`utils/changeProcessor.js`)
   - Enhanced version integrating rule engine with legacy fallback
   - Workflow automation
   - Hybrid processing approach

4. **Admin Interface** (`views/admin/rule-engine-demo.ejs`)
   - Web-based rule configuration
   - Real-time testing environment
   - Migration monitoring dashboard

## Installation & Setup

### 1. Access the Demo Interface

Navigate to `/demo/rules` in your browser after authentication.

### 2. Test the Enhanced Update Route

The new route `/update-v2` uses the rule engine with automatic fallback to legacy processing for unmigrated fields.

### 3. Run Tests

```bash
node test-rule-engine.js
```

## Configuration

### Field Configuration Format

```json
{
  "fieldID": {
    "table": "target_table",
    "column": "target_column",
    "validations": [
      { "type": "required" },
      { "type": "maxLength", "value": 126 }
    ],
    "encoding": "uri",
    "preActions": [],
    "postActions": [
      {
        "type": "notify",
        "condition": "always",
        "params": { "message": "Field updated" }
      }
    ]
  }
}
```

### Validation Types

- `required`: Value cannot be null/empty
- `email`: Valid email format
- `date`: Valid date format
- `maxLength`: Maximum string length
- `number`: Numeric value

### Action Types

- `updateField`: Update related field
- `updateStatus`: Status-specific update
- `updateDate`: Date field update with smart parsing
- `notify`: Send notification
- `executeWorkflow`: Trigger workflow rules

## Migration Strategy

### Phase 1: High Priority, Low Complexity
- `jobTitle` ✅ Migrated
- `taskTitle` ✅ Migrated
- `contactName`
- `contactEmail`
- `contactPhone`

### Phase 2: High Priority, Medium Complexity
- `jobStatus` ✅ Migrated  
- `taskStatus` ✅ Migrated
- `jobDesc`
- `taskDesc`

### Phase 3: Medium Priority
- `jobTargetDate`
- `taskTargetDate`
- `contactAddress`
- `contactStatus`

### Phase 4: Low Priority
- `jobOrder`
- `taskOrder`
- Remaining legacy fields

## Safety Features

### 1. Automatic Fallback
If the rule engine cannot process a field, it automatically falls back to the legacy `/update` route.

### 2. Demo Mode
The system operates in demo mode initially, allowing safe testing without affecting production data.

### 3. Transaction Support
All updates support transactions with automatic rollback on failure.

### 4. Extensive Logging
Comprehensive logging helps track the migration process and identify issues.

## API Endpoints

### Demo Routes
- `GET /demo/rules` - Admin interface
- `POST /demo/rules/test` - Test rule processing
- `GET /demo/rules/configs` - Get field configurations

### Enhanced Routes
- `GET /update-v2` - Enhanced update route with rule engine
- `GET /update` - Legacy route (unchanged)

## Testing

### Manual Testing
1. Access the demo interface at `/demo/rules`
2. Use the Test Runner tab to simulate field updates
3. Monitor results and validate behavior

### Automated Testing
```bash
# Run the test suite
node test-rule-engine.js

# Generate migration plan
node -e "import('./utils/migrationTester.js').then(({default: MT}) => new MT().exportMigrationPlan())"
```

## Current Status

### ✅ Implemented
- Rule engine core functionality
- Basic field configurations (jobTitle, jobStatus, taskTitle, taskStatus)
- Admin interface with live testing
- Automatic fallback mechanism
- Migration analysis tools

### 🚧 In Progress
- Additional field migrations
- Workflow integration
- Performance optimization

### 📋 Planned
- Production deployment
- Complete legacy route removal
- Advanced workflow features

## Configuration Examples

### Simple Field Update
```json
{
  "contactName": {
    "table": "customers",
    "column": "full_name",
    "validations": [
      { "type": "required" },
      { "type": "maxLength", "value": 255 }
    ],
    "encoding": "uri"
  }
}
```

### Complex Workflow Field
```json
{
  "jobStatus": {
    "table": "jobs",
    "column": "current_status",
    "validations": [{ "type": "required" }],
    "postActions": [
      {
        "type": "updateDate",
        "condition": { "field": "current_status", "value": "complete" },
        "params": { "table": "jobs", "column": "completed_date", "value": "now" }
      },
      {
        "type": "executeWorkflow",
        "condition": "always",
        "params": { "triggerField": "change_array" }
      }
    ]
  }
}
```

## Troubleshooting

### Common Issues

1. **Field not found in rule engine**
   - Check field configuration in demo interface
   - Verify field ID matches exactly
   - System will automatically fall back to legacy processing

2. **Validation failures**
   - Check validation rules in field configuration
   - Test with valid sample data first
   - Review error messages in browser console

3. **Performance issues**
   - Monitor execution time in test interface
   - Check database query logs
   - Consider optimizing validation rules

### Debugging

1. Enable detailed logging in browser console
2. Use the demo interface test runner
3. Check server logs for detailed error information
4. Use migration tester for field analysis

## Next Steps

1. **Validate Phase 1 Fields**
   - Test all high-priority, low-complexity fields
   - Gather performance metrics
   - Collect user feedback

2. **Expand Configuration**
   - Add remaining field configurations
   - Implement advanced workflow rules
   - Optimize validation performance

3. **Production Preparation**
   - Set up feature flags for gradual rollout
   - Implement monitoring and alerting
   - Create rollback procedures

4. **Migration Completion**
   - Complete all field migrations
   - Remove legacy switch statement
   - Optimize rule engine based on usage patterns

## Support

For questions or issues with the rule engine implementation:
1. Check the troubleshooting section above
2. Review the demo interface for configuration examples
3. Run the test suite to validate functionality
4. Check server logs for detailed error information

---

*This is a Stage 1 demo implementation designed for safe testing and gradual migration. Production deployment should follow a careful rollout plan with monitoring and rollback capabilities.*
