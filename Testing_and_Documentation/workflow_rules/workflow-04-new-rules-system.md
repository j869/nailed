# Workflow Rules System Documentation

## Overview
This document outlines the tier logic and rules system for the workflow. It provides a clear structure for understanding how tiers are defined, added, and managed.

## Tier Logic

### Beginner Tier
- **Value**: 500.0000 (Default)
- **Description**: The beginner tier serves as the baseline for the system. It allows for the addition of subsequent tiers both above and below its value. Additionally, tiers can be inserted between existing ones to accommodate new requirements.

### Tier Constraints
- **Valid Range**: Tiers must be greater than or equal to `1` and less than `999`.
- **Decimals**: Tier values can include decimal points (e.g., `499.5`, `500.75`).
- **Default Tier**: If no tier is explicitly provided, the default value of `500` is assigned.

## Adding New Tiers
1. **Above the Current Tier**: New tiers can be added with values greater than the current tier.
2. **Below the Current Tier**: New tiers can be added with values less than the current tier.
3. **Between Existing Tiers**: New tiers can be inserted between two existing tiers by assigning a value that falls between their respective values.

## Example
- Beginner Tier: 500.0000
- Intermediate Tier: 750.0000
- Advanced Tier: 1000.0000

In this example, an additional tier (e.g., "Pro Tier") can be added with a value of `875.0000`, which falls between the Intermediate and Advanced tiers.
