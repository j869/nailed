/**
 * Comprehensive RuleEngine Test Suite
 * Following meth.md MVP prototyping methodology
 * Tests all core functionality with full working prototypes
 */

import { RuleEngine } from '../../utils/ruleEngine.js';

// Test tracking variables
let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;

// Mock database for testing
const mockDb = {
  query: async (sql, params) => {
    console.log(`📝 Mock DB Query: ${sql.substring(0, 50)}...`);
    console.log(`📝 Mock DB Params:`, params);
    return { rows: [{ id: 1, success: true }] };
  }
};

// Mock axios for API calls
const mockAxios = {
  post: async (url, data) => {
    console.log(`🌐 Mock API Call: ${url}`);
    return { data: { success: true } };
  }
};

// Mock context for testing
const mockContext = {
  user: { id: 1, name: 'Test User' },
  db: mockDb,
  axios: mockAxios,
  API_URL: 'http://test-api.com',
  fieldID: 'jobTitle',
  newValue: 'Test Job Title',
  oldValue: 'Old Job Title',
  rowID: 123,
  table: 'jobs'
};

// Assertion helper
function assert(condition, message) {
  if (condition) {
    console.log(`✅ ${message}`);
    testsPassed++;
  } else {
    console.log(`❌ ${message}`);
    testsFailed++;
  }
}

// Main test runner
async function runTests() {
  console.log('\n🧪 Comprehensive RuleEngine Test Suite');
  console.log('======================================');
  
  console.log('\n1. Initialization Tests');
  console.log('------------------------');
  
  // Test 1: RuleEngine instantiation
  let ruleEngine;
  try {
    ruleEngine = new RuleEngine();
    assert(ruleEngine instanceof RuleEngine, 'RuleEngine instantiates correctly');
    assert(typeof ruleEngine.processUpdate === 'function', 'processUpdate method exists');
    assert(typeof ruleEngine.getFieldConfiguration === 'function', 'getFieldConfiguration method exists');
    assert(typeof ruleEngine.validateInput === 'function', 'validateInput method exists');
  } catch (error) {
    assert(false, `RuleEngine instantiation failed: ${error.message}`);
    return false;
  }

  console.log('\n2. Field Configuration Tests');
  console.log('-----------------------------');
  
  // Test 2: Get field configuration for jobTitle
  try {
    const jobTitleConfig = await ruleEngine.getFieldConfiguration('jobTitle');
    assert(jobTitleConfig !== null, 'jobTitle configuration exists');
    assert(Array.isArray(jobTitleConfig.validations), 'jobTitle has validations array');
    assert(Array.isArray(jobTitleConfig.actions), 'jobTitle has actions array');
  } catch (error) {
    assert(false, `jobTitle configuration failed: ${error.message}`);
  }
  
  // Test 3: Get field configuration for jobStatus
  try {
    const jobStatusConfig = await ruleEngine.getFieldConfiguration('jobStatus');
    assert(jobStatusConfig !== null, 'jobStatus configuration exists');
    assert(Array.isArray(jobStatusConfig.validations), 'jobStatus has validations array');
    assert(Array.isArray(jobStatusConfig.actions), 'jobStatus has actions array');
  } catch (error) {
    assert(false, `jobStatus configuration failed: ${error.message}`);
  }
  
  // Test 4: Unknown field configuration
  try {
    const unknownConfig = await ruleEngine.getFieldConfiguration('unknownField');
    assert(unknownConfig === null, 'Unknown field returns null');
  } catch (error) {
    assert(false, `Unknown field test failed: ${error.message}`);
  }

  console.log('\n3. Input Validation Tests');
  console.log('--------------------------');
  
  // Test 5: Required validation - valid input
  const requiredValidInput = await ruleEngine.validateInput('Valid Input', [
    { type: 'required' }
  ]);
  assert(requiredValidInput.isValid, 'Required validation passes for valid input');
  
  // Test 6: Required validation - empty input
  const requiredEmptyInput = await ruleEngine.validateInput('', [
    { type: 'required' }
  ]);
  assert(!requiredEmptyInput.isValid, 'Required validation fails for empty input');
  
  // Test 7: Email validation - valid email
  const emailValidInput = await ruleEngine.validateInput('test@example.com', [
    { type: 'email' }
  ]);
  assert(emailValidInput.isValid, 'Email validation passes for valid email');
  
  // Test 8: Email validation - invalid email
  const emailInvalidInput = await ruleEngine.validateInput('invalid-email', [
    { type: 'email' }
  ]);
  assert(!emailInvalidInput.isValid, 'Email validation fails for invalid email');
  
  // Test 9: MaxLength validation
  const maxLengthInput = await ruleEngine.validateInput('very long text string', [
    { type: 'maxLength', value: 5 }
  ]);
  assert(!maxLengthInput.isValid, 'MaxLength validation fails for long input');

  console.log('\n4. Action Condition Tests');
  console.log('--------------------------');
  
  // Test 10: shouldExecuteAction method
  const alwaysAction = { condition: 'always' };
  assert(ruleEngine.shouldExecuteAction(alwaysAction, mockContext), 'Always condition executes');
  
  const noConditionAction = {};
  assert(ruleEngine.shouldExecuteAction(noConditionAction, mockContext), 'No condition executes');
  
  const matchingCondition = { condition: { field: 'newValue', value: 'Test Job Title' } };
  assert(ruleEngine.shouldExecuteAction(matchingCondition, mockContext), 'Matching condition executes');
  
  const nonMatchingCondition = { condition: { field: 'newValue', value: 'Different Value' } };
  assert(!ruleEngine.shouldExecuteAction(nonMatchingCondition, mockContext), 'Non-matching condition does not execute');

  console.log('\n5. Action Handler Tests');
  console.log('------------------------');
  
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

  console.log('\n6. Integration Tests');
  console.log('---------------------');
  
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

  console.log('\n7. Edge Case Tests');
  console.log('-------------------');
  
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
