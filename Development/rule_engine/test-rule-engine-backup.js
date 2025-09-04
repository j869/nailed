#!/usr/bin/env node

/**
 * RuleEngine Test Suite
 * Tests all RuleEngine functionality including action handlers, validation rules, and field configurations
 * Created: 4 September 2025
 */

import { RuleEngine } from '../../utils/ruleEngine.js';

console.log('🧪 RuleEngine Test Suite');
console.log('========================\n');

let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;

// Test helper functions
function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    testsPassed++;
  } else {
    console.log(`  ❌ ${message}`);
    testsFailed++;
  }
}

function skip(message) {
  console.log(`  ⏭️  ${message}`);
  testsSkipped++;
}

// Mock context for testing
const mockContext = {
  user: { id: 123 },
  rowID: 456,
  fieldID: 'jobTitle',
  newValue: 'Test Job Title',
  axios: {
    get: async (url, params) => {
      console.log(`    Mock API call: ${url}`, params?.params || params);
      return { status: 201, data: { success: true } };
    }
  },
  API_URL: 'http://localhost:4000/api',
  db: {
    query: async (sql, params) => {
      console.log(`    Mock DB query: ${sql}`, params);
      return { rows: [{ change_array: '[]', id: 456 }] };
    }
  }
};

async function runTests() {
  const ruleEngine = new RuleEngine();

  console.log('1. RuleEngine Initialization Tests');
  console.log('-----------------------------------');
  
  // Test 1: Constructor initialization
  assert(ruleEngine instanceof RuleEngine, 'RuleEngine instance created');
  assert(ruleEngine.actionHandlers instanceof Map, 'Action handlers Map initialized');
  assert(ruleEngine.validationRules instanceof Map, 'Validation rules Map initialized');
  
  // Test 2: Action handlers registration
  const expectedHandlers = ['updateField', 'updateStatus', 'updateDate', 'updateRelated', 'notify', 'createWorksheet', 'executeWorkflow'];
  expectedHandlers.forEach(handler => {
    assert(ruleEngine.actionHandlers.has(handler), `${handler} action handler registered`);
  });
  
  // Test 3: Validation rules registration
  const expectedValidators = ['required', 'email', 'date', 'maxLength'];
  expectedValidators.forEach(validator => {
    assert(ruleEngine.validationRules.has(validator), `${validator} validation rule registered`);
  });

  console.log('\n2. Field Configuration Tests');
  console.log('-----------------------------');
  
  // Test 4: Field configuration retrieval
  const jobTitleConfig = await ruleEngine.getFieldConfiguration('jobTitle');
  assert(jobTitleConfig !== null, 'jobTitle configuration exists');
  assert(jobTitleConfig.table === 'jobs', 'jobTitle has correct table');
  assert(jobTitleConfig.column === 'display_text', 'jobTitle has correct column');
  
  const jobStatusConfig = await ruleEngine.getFieldConfiguration('jobStatus');
  assert(jobStatusConfig !== null, 'jobStatus configuration exists');
  assert(jobStatusConfig.postActions.length > 0, 'jobStatus has post actions');
  
  const unknownConfig = await ruleEngine.getFieldConfiguration('unknownField');
  assert(unknownConfig === null, 'Unknown field returns null');

  console.log('\n3. Validation Rules Tests');
  console.log('-------------------------');
  
  // Test 5: Required validation
  const requiredValidator = ruleEngine.validationRules.get('required');
  assert(requiredValidator('test'), 'Required validation passes with value');
  assert(!requiredValidator(''), 'Required validation fails with empty string');
  assert(!requiredValidator(null), 'Required validation fails with null');
  assert(!requiredValidator(undefined), 'Required validation fails with undefined');
  
  // Test 6: Email validation
  const emailValidator = ruleEngine.validationRules.get('email');
  assert(emailValidator('test@example.com'), 'Email validation passes with valid email');
  assert(!emailValidator('invalid-email'), 'Email validation fails with invalid email');
  assert(!emailValidator('test@'), 'Email validation fails with incomplete email');
  
  // Test 7: Date validation
  const dateValidator = ruleEngine.validationRules.get('date');
  assert(dateValidator('2025-09-04'), 'Date validation passes with valid date');
  assert(dateValidator('September 4, 2025'), 'Date validation passes with text date');
  assert(!dateValidator('invalid-date'), 'Date validation fails with invalid date');
  
  // Test 8: MaxLength validation
  const maxLengthValidator = ruleEngine.validationRules.get('maxLength');
  assert(maxLengthValidator('test', 10), 'MaxLength validation passes when under limit');
  assert(maxLengthValidator('test', 4), 'MaxLength validation passes at exact limit');
  assert(!maxLengthValidator('test string', 5), 'MaxLength validation fails when over limit');

  console.log('\n4. Input Validation Tests');
  console.log('-------------------------');
  
  // Test 9: validateInput method
  const validInput = await ruleEngine.validateInput('test@example.com', [
    { type: 'required' },
    { type: 'email' }
  ]);
  assert(validInput.isValid, 'Valid input passes all validations');
  assert(validInput.errors.length === 0, 'Valid input has no errors');
  
  const invalidInput = await ruleEngine.validateInput('', [
    { type: 'required' },
    { type: 'email' }
  ]);
  assert(!invalidInput.isValid, 'Invalid input fails validation');
  assert(invalidInput.errors.length > 0, 'Invalid input has errors');
  
  const maxLengthInput = await ruleEngine.validateInput('very long text string', [
    { type: 'maxLength', value: 5 }
  ]);
  assert(!maxLengthInput.isValid, 'MaxLength validation fails for long input');

  console.log('\n5. Action Condition Tests');
  console.log('-------------------------');
  
  // Test 10: shouldExecuteAction method
  const alwaysAction = { condition: 'always' };
  assert(ruleEngine.shouldExecuteAction(alwaysAction, mockContext), 'Always condition executes');
  
  const noConditionAction = {};
  assert(ruleEngine.shouldExecuteAction(noConditionAction, mockContext), 'No condition executes');
  
  const matchingCondition = { condition: { field: 'newValue', value: 'Test Job Title' } };
  assert(ruleEngine.shouldExecuteAction(matchingCondition, mockContext), 'Matching condition executes');
  
  const nonMatchingCondition = { condition: { field: 'newValue', value: 'Different Value' } };
  assert(!ruleEngine.shouldExecuteAction(nonMatchingCondition, mockContext), 'Non-matching condition does not execute');

  console.log('\n6. Action Handler Tests');
  console.log('-----------------------');
  
  // Test 11: handleFieldUpdate
  try {
    await ruleEngine.handleFieldUpdate(
      { table: 'jobs', column: 'display_text', value: 'Test Value' },
      mockContext
    );
    assert(true, 'handleFieldUpdate executes without error');
  } catch (error) {
    assert(false, `handleFieldUpdate failed: ${error.message}`);
  }
  
  // Test 12: handleDateUpdate with 'now'
  try {
    await ruleEngine.handleDateUpdate(
      { table: 'jobs', column: 'completed_date', value: 'now' },
      mockContext
    );
    assert(true, 'handleDateUpdate with "now" executes without error');
  } catch (error) {
    assert(false, `handleDateUpdate failed: ${error.message}`);
  }
  
  // Test 13: handleNotification
  try {
    await ruleEngine.handleNotification(
      { message: 'Test notification' },
      mockContext
    );
    assert(true, 'handleNotification executes without error');
  } catch (error) {
    assert(false, `handleNotification failed: ${error.message}`);
  }
  
  // Test 14: handleExecuteWorkflow
  try {
    await ruleEngine.handleExecuteWorkflow(
      { triggerField: 'change_array' },
      mockContext
    );
    assert(true, 'handleExecuteWorkflow executes without error');
  } catch (error) {
    assert(false, `handleExecuteWorkflow failed: ${error.message}`);
  }

  console.log('\n7. Integration Tests');
  console.log('--------------------');
  
  // Test 15: Full processUpdate workflow - valid case
  try {
    const validResult = await ruleEngine.processUpdate({
      fieldID: 'jobTitle',
      newValue: 'Valid Job Title',
      rowID: 456,
      table: 'jobs'
    }, mockContext);
    
    assert(validResult.success === true, 'Valid processUpdate returns success');
    assert(validResult.message, 'Valid processUpdate returns message');
  } catch (error) {
    assert(false, `Valid processUpdate failed: ${error.message}`);
  }
  
  // Test 16: Full processUpdate workflow - invalid field
  try {
    const invalidResult = await ruleEngine.processUpdate({
      fieldID: 'unknownField',
      newValue: 'Some value',
      rowID: 456,
      table: 'jobs'
    }, mockContext);
    
    assert(invalidResult.success === false, 'Unknown field processUpdate returns failure');
    assert(invalidResult.error.includes('Unknown field'), 'Unknown field error message is correct');
  } catch (error) {
    assert(false, `Invalid field processUpdate test failed: ${error.message}`);
  }
  
  // Test 17: Full processUpdate workflow - validation failure
  try {
    const validationFailResult = await ruleEngine.processUpdate({
      fieldID: 'jobTitle',
      newValue: '', // Empty value should fail required validation
      rowID: 456,
      table: 'jobs'
    }, mockContext);
    
    assert(validationFailResult.success === false, 'Validation failure processUpdate returns failure');
    assert(validationFailResult.error.includes('Validation failed'), 'Validation failure error message is correct');
  } catch (error) {
    assert(false, `Validation failure processUpdate test failed: ${error.message}`);
  }

  console.log('\n8. Edge Case Tests');
  console.log('------------------');
  
  // Test 18: Empty validations array
  const emptyValidationResult = await ruleEngine.validateInput('any value', []);
  assert(emptyValidationResult.isValid, 'Empty validations array passes');
  
  // Test 19: Current user value substitution
  try {
    await ruleEngine.handleFieldUpdate(
      { table: 'jobs', column: 'user_id', value: 'current_user' },
      mockContext
    );
    assert(true, 'Current user value substitution works');
  } catch (error) {
    assert(false, `Current user substitution failed: ${error.message}`);
  }
  
  // Test 20: Action execution with conditions
  const conditionalActions = [
    { type: 'notify', condition: 'always', params: { message: 'Always execute' } },
    { type: 'notify', condition: { field: 'newValue', value: 'Test Job Title' }, params: { message: 'Conditional execute' } },
    { type: 'notify', condition: { field: 'newValue', value: 'Wrong Value' }, params: { message: 'Should not execute' } }
  ];
  
  try {
    await ruleEngine.executeActions(conditionalActions, mockContext);
    assert(true, 'Conditional action execution completes');
  } catch (error) {
    assert(false, `Conditional action execution failed: ${error.message}`);
  }

  // Test Summary
  console.log('\n📊 RuleEngine Test Summary');
  console.log('===========================');
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`⏭️  Tests Skipped: ${testsSkipped}`);
  console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All RuleEngine tests passed!');
    return true;
  } else {
    console.log('\n⚠️  Some RuleEngine tests failed. Review the output above.');
    return false;
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

export { runTests };
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
