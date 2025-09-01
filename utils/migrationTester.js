/**
 * Migration Test Script for Rule Engine
 * Tests the transition from legacy update logic to rule engine
 */

import fs from 'fs';
import path from 'path';

export class MigrationTester {
  constructor() {
    this.testResults = [];
    this.fieldMappings = new Map();
    this.loadFieldMappings();
  }

  /**
   * Load field mappings from the legacy switch statement analysis
   */
  loadFieldMappings() {
    // These are the fields found in the existing switch statement
    const legacyFields = [
      'customerFollowUpDate',
      'jobTargetDate', 
      'taskTargetDate',
      'dueDate',
      'changeArray',
      'jobTier',
      'processChangeArray',
      'jobDesc',
      'jobOwner',
      'taskDesc',
      'jobTitle',
      'taskStatus',
      'taskTitle',
      'taskOrder',
      'taskPerson',
      'flowChangeArray',
      'flowTier',
      'otherContact',
      'contactStatus',
      'contactName',
      'contactAddress',
      'contactPhone', 
      'contactEmail',
      'nextJob',
      'daytaskTitle',
      'daytaskPerson',
      'daytaskDate',
      'daytaskArchive',
      'jobOrder',
      'jobPerson',
      'jobStatus'
    ];

    // Map legacy fields to new rule engine configurations
    legacyFields.forEach(field => {
      this.fieldMappings.set(field, {
        status: 'pending_migration',
        complexity: this.assessComplexity(field),
        priority: this.assessPriority(field)
      });
    });

    // Mark fields already configured in rule engine
    const configuredFields = ['jobTitle', 'jobStatus', 'taskTitle', 'taskStatus'];
    configuredFields.forEach(field => {
      if (this.fieldMappings.has(field)) {
        this.fieldMappings.set(field, {
          ...this.fieldMappings.get(field),
          status: 'migrated'
        });
      }
    });
  }

  /**
   * Assess the complexity of migrating a field
   */
  assessComplexity(fieldID) {
    const complexFields = [
      'jobStatus', // Has extensive workflow logic
      'jobOwner',  // Updates multiple tables
      'daytaskPerson', // Has transaction logic
      'daytaskDate'   // Complex date handling
    ];

    const mediumFields = [
      'jobTier',      // Updates related records
      'taskOrder',    // Handles both tasks and jobs
      'changeArray'   // JSON processing
    ];

    if (complexFields.includes(fieldID)) return 'high';
    if (mediumFields.includes(fieldID)) return 'medium';
    return 'low';
  }

  /**
   * Assess the priority of migrating a field
   */
  assessPriority(fieldID) {
    const highPriorityFields = [
      'jobTitle', 'jobStatus', 'taskTitle', 'taskStatus', 
      'contactName', 'contactEmail', 'contactPhone'
    ];

    const mediumPriorityFields = [
      'jobDesc', 'taskDesc', 'jobTargetDate', 'taskTargetDate',
      'contactAddress', 'contactStatus'
    ];

    if (highPriorityFields.includes(fieldID)) return 'high';
    if (mediumPriorityFields.includes(fieldID)) return 'medium';
    return 'low';
  }

  /**
   * Generate migration plan
   */
  generateMigrationPlan() {
    const plan = {
      phase1: [], // High priority, low complexity
      phase2: [], // High priority, medium complexity  
      phase3: [], // Medium priority, any complexity
      phase4: [], // Low priority, any complexity
      summary: {
        totalFields: this.fieldMappings.size,
        migrated: 0,
        pending: 0,
        byComplexity: { low: 0, medium: 0, high: 0 },
        byPriority: { low: 0, medium: 0, high: 0 }
      }
    };

    this.fieldMappings.forEach((config, fieldID) => {
      const { status, complexity, priority } = config;
      
      // Update summary
      if (status === 'migrated') {
        plan.summary.migrated++;
      } else {
        plan.summary.pending++;
      }
      plan.summary.byComplexity[complexity]++;
      plan.summary.byPriority[priority]++;

      // Skip if already migrated
      if (status === 'migrated') return;

      // Assign to phases
      if (priority === 'high' && complexity === 'low') {
        plan.phase1.push({ fieldID, complexity, priority });
      } else if (priority === 'high' && complexity === 'medium') {
        plan.phase2.push({ fieldID, complexity, priority });
      } else if (priority === 'medium') {
        plan.phase3.push({ fieldID, complexity, priority });
      } else {
        plan.phase4.push({ fieldID, complexity, priority });
      }
    });

    return plan;
  }

  /**
   * Generate test cases for each field
   */
  generateTestCases() {
    const testCases = [];

    this.fieldMappings.forEach((config, fieldID) => {
      const testCase = {
        fieldID,
        testData: this.generateTestData(fieldID),
        expectedBehavior: this.getExpectedBehavior(fieldID),
        validationRules: this.getValidationRules(fieldID)
      };
      testCases.push(testCase);
    });

    return testCases;
  }

  /**
   * Generate appropriate test data for a field
   */
  generateTestData(fieldID) {
    const testDataMap = {
      // Text fields
      'jobTitle': ['New Job Title', 'A very long job title that exceeds normal length limits to test truncation behavior', ''],
      'taskTitle': ['New Task Title', 'Short title', ''],
      'jobDesc': ['Job description with\nnewlines', 'Simple description', ''],
      'taskDesc': ['Task description', '', 'Description with special chars: &<>'],
      
      // Status fields
      'jobStatus': ['pending', 'active', 'complete', 'cancelled'],
      'taskStatus': ['pending', 'active', 'complete'],
      'contactStatus': ['active', 'inactive', 'pending'],
      
      // Date fields
      'jobTargetDate': ['2024-01-01', '2024-12-31', 'invalid-date', ''],
      'taskTargetDate': ['2024-01-01', '', 'today'],
      'daytaskDate': ['2024-01-01', 'add_5', 'today 3'],
      
      // Contact fields
      'contactName': ['John Doe', 'Jane Smith-Wilson', ''],
      'contactEmail': ['test@example.com', 'invalid-email', ''],
      'contactPhone': ['555-1234', '+1-555-123-4567', 'invalid-phone'],
      'contactAddress': ['123 Main St, City, State', '', 'Address with\nspecial\nchars'],
      
      // Numeric fields
      'jobOrder': ['1', '999', '0', '-1'],
      'taskOrder': ['1', '10', '0'],
      'jobTier': ['100', '500', '1000'],
      
      // User/Owner fields
      'jobOwner': ['1', '2', '', 'null'],
      'taskPerson': ['1', '2', ''],
      'daytaskPerson': ['1', '2'],
      
      // JSON/Complex fields
      'changeArray': ['[]', '[{"action": "test"}]', 'invalid-json'],
      'processChangeArray': ['[]', '[{"rule": "test"}]'],
      'flowChangeArray': ['[]', '[{"flow": "test"}]']
    };

    return testDataMap[fieldID] || ['test-value', '', 'another-test'];
  }

  /**
   * Get expected behavior for a field
   */
  getExpectedBehavior(fieldID) {
    const behaviorMap = {
      'jobTitle': 'Should update jobs.display_text with URI encoding and length limit',
      'jobStatus': 'Should update status, trigger workflow, update completion date if complete',
      'taskTitle': 'Should update tasks.display_text with URI encoding and length limit',
      'taskStatus': 'Should update tasks.current_status',
      'contactEmail': 'Should validate email format and update customers.primary_email',
      'jobTargetDate': 'Should validate date format and update jobs.target_date',
      'jobOwner': 'Should update jobs.user_id and cascade to child jobs and tasks'
    };

    return behaviorMap[fieldID] || 'Standard field update with appropriate validation';
  }

  /**
   * Get validation rules for a field
   */
  getValidationRules(fieldID) {
    const validationMap = {
      'jobTitle': ['required', 'maxLength:126'],
      'taskTitle': ['required', 'maxLength:126'],
      'contactEmail': ['email'],
      'jobTargetDate': ['date'],
      'taskTargetDate': ['date'],
      'contactName': ['required', 'maxLength:255'],
      'jobStatus': ['required'],
      'taskStatus': ['required']
    };

    return validationMap[fieldID] || [];
  }

  /**
   * Export migration plan to file
   */
  exportMigrationPlan(outputPath = './migration-plan.json') {
    const plan = this.generateMigrationPlan();
    const testCases = this.generateTestCases();
    
    const exportData = {
      generatedAt: new Date().toISOString(),
      migrationPlan: plan,
      testCases: testCases,
      recommendations: this.generateRecommendations(plan)
    };

    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    console.log(`Migration plan exported to: ${outputPath}`);
    
    return exportData;
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(plan) {
    return {
      immediate: [
        'Start with Phase 1 fields (high priority, low complexity)',
        'Set up A/B testing to compare legacy vs rule engine performance',
        'Create comprehensive test suite for each field type'
      ],
      shortTerm: [
        'Migrate Phase 2 fields with careful testing',
        'Implement fallback mechanisms for critical fields',
        'Monitor performance metrics during migration'
      ],
      longTerm: [
        'Complete migration of all fields to rule engine',
        'Remove legacy switch statement code',
        'Optimize rule engine based on usage patterns'
      ],
      riskMitigation: [
        'Keep legacy route as fallback during migration',
        'Implement feature flags for gradual rollout',
        'Monitor error rates and rollback if necessary',
        'Create detailed migration logs for troubleshooting'
      ]
    };
  }

  /**
   * Print migration summary to console
   */
  printSummary() {
    const plan = this.generateMigrationPlan();
    
    console.log('\n=== RULE ENGINE MIGRATION PLAN ===\n');
    console.log(`Total Fields: ${plan.summary.totalFields}`);
    console.log(`Migrated: ${plan.summary.migrated}`);
    console.log(`Pending: ${plan.summary.pending}`);
    
    console.log('\nBy Complexity:');
    console.log(`  Low: ${plan.summary.byComplexity.low}`);
    console.log(`  Medium: ${plan.summary.byComplexity.medium}`);
    console.log(`  High: ${plan.summary.byComplexity.high}`);
    
    console.log('\nBy Priority:');
    console.log(`  High: ${plan.summary.byPriority.high}`);
    console.log(`  Medium: ${plan.summary.byPriority.medium}`);
    console.log(`  Low: ${plan.summary.byPriority.low}`);
    
    console.log('\nMigration Phases:');
    console.log(`  Phase 1 (High Priority, Low Complexity): ${plan.phase1.length} fields`);
    console.log(`  Phase 2 (High Priority, Medium Complexity): ${plan.phase2.length} fields`);
    console.log(`  Phase 3 (Medium Priority): ${plan.phase3.length} fields`);
    console.log(`  Phase 4 (Low Priority): ${plan.phase4.length} fields`);
    
    console.log('\nNext Steps:');
    console.log('1. Review and validate field mappings');
    console.log('2. Create test cases for Phase 1 fields');
    console.log('3. Implement rule configurations for Phase 1');
    console.log('4. Set up A/B testing infrastructure');
    console.log('5. Begin gradual migration starting with Phase 1');
  }
}

// Export for use in tests or scripts
export default MigrationTester;
