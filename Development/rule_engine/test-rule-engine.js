/**
 * RuleEngine Test Suite
 * Comprehensive tests for all RuleEngine functionality
 * Following meth.md MVP prototyping methodology
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
    console.log(`🌐 Mock API Call POST: ${url}`);
    return { data: { success: true } };
  },
  get: async (url, config) => {
    console.log(`🌐 Mock API Call GET: ${url}`);
    return { data: { success: true }, status: 200 };
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
    if (jobTitleConfig) {
      assert(Array.isArray(jobTitleConfig.validations), 'jobTitle has validations array');
      assert(Array.isArray(jobTitleConfig.preActions), 'jobTitle has preActions array');
      assert(Array.isArray(jobTitleConfig.postActions), 'jobTitle has postActions array');
    }
  } catch (error) {
    assert(false, `jobTitle configuration failed: ${error.message}`);
  }
  
  // Test 3: Get field configuration for jobStatus
  try {
    const jobStatusConfig = await ruleEngine.getFieldConfiguration('jobStatus');
    assert(jobStatusConfig !== null, 'jobStatus configuration exists');
    if (jobStatusConfig) {
      assert(Array.isArray(jobStatusConfig.validations), 'jobStatus has validations array');
      assert(Array.isArray(jobStatusConfig.preActions), 'jobStatus has preActions array');
      assert(Array.isArray(jobStatusConfig.postActions), 'jobStatus has postActions array');
    }
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
  try {
    const requiredValidInput = await ruleEngine.validateInput('Valid Input', [
      { type: 'required' }
    ]);
    assert(requiredValidInput.isValid, 'Required validation passes for valid input');
  } catch (error) {
    assert(false, `Required validation test failed: ${error.message}`);
  }
  
  // Test 6: Required validation - empty input
  try {
    const requiredEmptyInput = await ruleEngine.validateInput('', [
      { type: 'required' }
    ]);
    assert(!requiredEmptyInput.isValid, 'Required validation fails for empty input');
  } catch (error) {
    assert(false, `Required empty validation test failed: ${error.message}`);
  }
  
  // Test 7: Email validation - valid email
  try {
    const emailValidInput = await ruleEngine.validateInput('test@example.com', [
      { type: 'email' }
    ]);
    assert(emailValidInput.isValid, 'Email validation passes for valid email');
  } catch (error) {
    assert(false, `Email validation test failed: ${error.message}`);
  }

  console.log('\n4. Action Handler Tests');
  console.log('------------------------');
  
  // Test 8: handleFieldUpdate
  try {
    await ruleEngine.handleFieldUpdate(
      { table: 'jobs', column: 'display_text', value: 'Test Value' },
      mockContext
    );
    assert(true, 'handleFieldUpdate executes without error');
  } catch (error) {
    assert(false, `handleFieldUpdate failed: ${error.message}`);
  }
  
  // Test 9: handleNotification
  try {
    await ruleEngine.handleNotification(
      { message: 'Test notification' },
      mockContext
    );
    assert(true, 'handleNotification executes without error');
  } catch (error) {
    assert(false, `handleNotification failed: ${error.message}`);
  }

  console.log('\n5. Integration Tests');
  console.log('---------------------');
  
  // Test 10: Full processUpdate workflow
  try {
    const validResult = await ruleEngine.processUpdate({
      fieldID: 'jobTitle',
      newValue: 'Valid Job Title',
      rowID: 456,
      table: 'jobs'
    }, mockContext);
    
    assert(typeof validResult === 'object', 'processUpdate returns object result');
    console.log('   Process result:', validResult);
  } catch (error) {
    assert(false, `processUpdate integration test failed: ${error.message}`);
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
