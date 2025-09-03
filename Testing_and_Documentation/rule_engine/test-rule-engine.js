#!/usr/bin/env node

/**
 * Test Script for Rule Engine Demo
 * Run this to validate the rule engine implementation
 */

import { RuleEngine } from './utils/ruleEngine.js';
import UpdateHelper from './utils/updateHelper.js';
import MigrationTester from './utils/migrationTester.js';

// Mock dependencies for testing
const mockDb = {
  query: async (query, params) => {
    console.log(`Mock DB Query: ${query}`, params);
    return {
      rows: [{ id: 1, change_array: '[]' }],
      rowCount: 1
    };
  }
};

const mockAxios = {
  get: async (url, config) => {
    console.log(`Mock API Call: ${url}`, config?.params);
    return {
      status: 201,
      data: { success: true }
    };
  }
};

async function runTests() {
  console.log('🧪 Starting Rule Engine Tests...\n');

  // Test 1: Rule Engine Initialization
  console.log('Test 1: Rule Engine Initialization');
  try {
    const ruleEngine = new RuleEngine();
    console.log('✅ Rule Engine initialized successfully');
  } catch (error) {
    console.log('❌ Rule Engine initialization failed:', error.message);
  }

  // Test 2: Update Helper Initialization
  console.log('\nTest 2: Update Helper Initialization');
  try {
    const updateHelper = new UpdateHelper(mockDb, mockAxios, 'http://test-api');
    console.log('✅ Update Helper initialized successfully');
  } catch (error) {
    console.log('❌ Update Helper initialization failed:', error.message);
  }

  // Test 3: Process Field Update
  console.log('\nTest 3: Process Field Update');
  try {
    const ruleEngine = new RuleEngine();
    const context = {
      user: { id: 1, email: 'test@example.com' },
      axios: mockAxios,
      API_URL: 'http://test-api',
      db: mockDb
    };

    const updateRequest = {
      fieldID: 'jobTitle',
      newValue: 'Test Job Title',
      rowID: 123
    };

    const result = await ruleEngine.processUpdate(updateRequest, context);
    console.log('✅ Field update processed:', result.success ? 'SUCCESS' : 'FAILED');
    if (!result.success) {
      console.log('   Error:', result.error);
    }
  } catch (error) {
    console.log('❌ Field update processing failed:', error.message);
  }

  // Test 4: Validation Rules
  console.log('\nTest 4: Validation Rules');
  try {
    const ruleEngine = new RuleEngine();
    
    // Test required validation
    const requiredResult = ruleEngine.validationRules.get('required')('test value');
    console.log('✅ Required validation:', requiredResult ? 'PASS' : 'FAIL');
    
    // Test email validation
    const emailResult = ruleEngine.validationRules.get('email')('test@example.com');
    console.log('✅ Email validation:', emailResult ? 'PASS' : 'FAIL');
    
    // Test date validation
    const dateResult = ruleEngine.validationRules.get('date')('2024-01-01');
    console.log('✅ Date validation:', dateResult ? 'PASS' : 'FAIL');
  } catch (error) {
    console.log('❌ Validation rules test failed:', error.message);
  }

  // Test 5: Migration Tester
  console.log('\nTest 5: Migration Tester');
  try {
    const migrationTester = new MigrationTester();
    const plan = migrationTester.generateMigrationPlan();
    console.log('✅ Migration plan generated');
    console.log(`   Total fields: ${plan.summary.totalFields}`);
    console.log(`   Phase 1 fields: ${plan.phase1.length}`);
  } catch (error) {
    console.log('❌ Migration tester failed:', error.message);
  }

  // Test 6: Field Configuration
  console.log('\nTest 6: Field Configuration');
  try {
    const ruleEngine = new RuleEngine();
    const jobTitleConfig = await ruleEngine.getFieldConfiguration('jobTitle');
    
    if (jobTitleConfig) {
      console.log('✅ Field configuration retrieved');
      console.log(`   Table: ${jobTitleConfig.table}`);
      console.log(`   Column: ${jobTitleConfig.column}`);
      console.log(`   Validations: ${jobTitleConfig.validations.length}`);
    } else {
      console.log('❌ Field configuration not found');
    }
  } catch (error) {
    console.log('❌ Field configuration test failed:', error.message);
  }

  console.log('\n🎉 Rule Engine Tests Completed!\n');
  
  // Generate and display migration summary
  console.log('📊 Migration Analysis:');
  const migrationTester = new MigrationTester();
  migrationTester.printSummary();
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };
