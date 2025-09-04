
# Workflow Rules System Documentation

## Overview
This document outlines the new rules system for the workflow. It provides a clear structure for understanding how workflow rules are defined, added, and managed.

**The RuleEngine class (`utils/ruleEngine.js`) is responsible for processing field updates, validating inputs, and executing workflow automation actions.**

---

## Tier Logic

### Beginner Tier
- **Value**: 500.0000 (Default)
- **Description**: The beginner tier serves as the baseline for the system. It allows for the addition of subsequent tiers both above and below its value. Additionally, tiers can be inserted between existing ones to accommodate new requirements.

### Tier Constraints
- **Valid Range**: Tiers must be greater than or equal to `1` and less than `999`.
- **Decimals**: Tier values can include decimal points (e.g., `499.5`, `500.75`).
- **Default Tier**: If no tier is explicitly provided, the default value of `500` is assigned.

### Tier System in Code
- **Tier 500**: Major phase headers/milestones
- **Tier 501**: Individual tasks within phases
- **Tier 502+**: Sub-tasks (if used)

---

## Adding New Tiers
1. **Above the Current Tier**: New tiers can be added with values greater than the current tier.
2. **Below the Current Tier**: New tiers can be added with values less than the current tier.
3. **Between Existing Tiers**: New tiers can be inserted between two existing tiers by assigning a value that falls between their respective values.

## Example
- Beginner Tier: 500.0000
- Intermediate Tier: 750.0000
- Advanced Tier: 1000.0000

In this example, an additional tier (e.g., "Pro Tier") can be added with a value of `875.0000`, which falls between the Intermediate and Advanced tiers.

---

## Rule Engine Implementation

### Core Features (`utils/ruleEngine.js`)
- **Field Update Processing**: Handles updates to fields, validates input, and executes pre/post actions.
- **Validation**: Supports required, email, date, and maxLength validations.
- **Action Handlers**: Includes handlers for updating fields, status, dates, related records, notifications, worksheet creation, and workflow execution.
- **Workflow Execution**: Can trigger workflow logic based on field changes and context.


---

# rule example
{
  "on": "current_status:complete",
  "name": "Job Completion Workflow",
  "description": "Activate next job and update dates when current job completes",
  "conditions": [],
  "validations": [],
  "actions": [
    {
      "type": "updateRelatedStatus",
      "description": "Activate next job in workflow",
      "target": "next_job",
      "value": "active"
    },
    {
      "type": "updateDate",
      "description": "Set target date for next job",
      "field": "target_date",
      "value": "business_days_3",
      "target": "next_job"
    }
  ]
}


## event driven, ie

  "on": "current_status:complete",
  "name": "Job Completion Workflow",
  "description": "Activate next job and update dates when current job completes",
  "conditions": [],
  "validations": [],
  "actions": []


## action syntax
### change status of a job
    {
      "type": "updateRelatedStatus",
      "description": "Activate next job in workflow",
      "target": "next_job",
      "value": "active"
    }

### change a field of a job
    {
      "type": "updateDate",
      "description": "Set target date for next job",
      "field": "target_date",
      "value": "business_days_3",
      "target": "next_job"
    }

