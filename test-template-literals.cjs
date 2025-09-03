/**
 * Rule Builder Template Literal Test
 * Tests to verify that template literal conversions resolved JavaScript parsing issues
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const testConfig = {
    ejsFilePath: './views/admin/rule-builder.ejs',
    logLevel: 'info'
};

function log(level, message) {
    const timestamp = new Date().toISOString();
    if (testConfig.logLevel === 'info' || level === 'error') {
        console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    }
}

// Test 1: Check if EJS file exists and is readable
function testFileAccess() {
    log('info', 'TEST 1: Checking file access...');
    
    try {
        if (!fs.existsSync(testConfig.ejsFilePath)) {
            throw new Error(`File not found: ${testConfig.ejsFilePath}`);
        }
        
        const stats = fs.statSync(testConfig.ejsFilePath);
        log('info', `✓ File exists and is ${stats.size} bytes`);
        
        // Try to read the file
        const content = fs.readFileSync(testConfig.ejsFilePath, 'utf8');
        log('info', `✓ File is readable, ${content.length} characters`);
        
        return { passed: true, content: content };
        
    } catch (error) {
        log('error', `✗ File access test failed: ${error.message}`);
        return { passed: false, error: error.message };
    }
}

// Test 2: Check for remaining problematic template literals
function testTemplateLiteralConversion(content) {
    log('info', 'TEST 2: Checking template literal conversion...');
    
    const results = {
        passed: true,
        totalBackticks: 0,
        problematicLines: [],
        templateLiterals: 0
    };
    
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
        const backtickCount = (line.match(/`/g) || []).length;
        results.totalBackticks += backtickCount;
        
        // Check for template literals with ${} syntax
        if (line.includes('${') && line.includes('`')) {
            results.templateLiterals++;
            results.problematicLines.push({
                lineNumber: index + 1,
                content: line.trim(),
                issue: 'Template literal with EJS conflict'
            });
        }
        
        // Check for unclosed template literals
        if (backtickCount % 2 !== 0 && line.includes('${')) {
            results.problematicLines.push({
                lineNumber: index + 1,
                content: line.trim(),
                issue: 'Potentially unclosed template literal'
            });
        }
    });
    
    log('info', `Total backticks found: ${results.totalBackticks}`);
    log('info', `Template literals with \${} syntax: ${results.templateLiterals}`);
    
    if (results.problematicLines.length > 0) {
        results.passed = false;
        log('error', `✗ Found ${results.problematicLines.length} problematic lines:`);
        results.problematicLines.forEach(line => {
            log('error', `  Line ${line.lineNumber}: ${line.issue}`);
            log('error', `    ${line.content}`);
        });
    } else {
        log('info', '✓ No problematic template literals found');
    }
    
    return results;
}

// Test 3: Check for critical function definitions
function testFunctionDefinitions(content) {
    log('info', 'TEST 3: Checking critical function definitions...');
    
    const criticalFunctions = [
        'testSharedRuleJson',
        'importJsonToBuilder',
        'logActivity',
        'generateRule',
        'addConditionLegacy',
        'addActionLegacy',
        'addValidation'
    ];
    
    const results = {
        passed: true,
        foundFunctions: [],
        missingFunctions: []
    };
    
    criticalFunctions.forEach(funcName => {
        const regex = new RegExp(`function\\s+${funcName}\\s*\\(`, 'g');
        if (regex.test(content)) {
            results.foundFunctions.push(funcName);
            log('info', `✓ Function found: ${funcName}`);
        } else {
            results.missingFunctions.push(funcName);
            log('error', `✗ Function missing: ${funcName}`);
            results.passed = false;
        }
    });
    
    return results;
}

// Test 4: Check for string concatenation patterns
function testStringConcatenation(content) {
    log('info', 'TEST 4: Checking string concatenation patterns...');
    
    const results = {
        passed: true,
        concatenationCount: 0,
        logActivityCalls: 0,
        convertedLogActivities: 0
    };
    
    // Count string concatenations (looking for + operator in strings)
    const concatenationPattern = /['"][^'"]*['"]\s*\+\s*[^+]/g;
    const concatenationMatches = content.match(concatenationPattern) || [];
    results.concatenationCount = concatenationMatches.length;
    
    // Count logActivity calls
    const logActivityPattern = /logActivity\s*\(/g;
    const logActivityMatches = content.match(logActivityPattern) || [];
    results.logActivityCalls = logActivityMatches.length;
    
    // Count converted logActivity calls (string concatenation instead of template literals)
    const convertedLogActivityPattern = /logActivity\s*\(\s*['"][^'"]*['"]\s*\+/g;
    const convertedMatches = content.match(convertedLogActivityPattern) || [];
    results.convertedLogActivities = convertedMatches.length;
    
    log('info', `String concatenations found: ${results.concatenationCount}`);
    log('info', `LogActivity calls found: ${results.logActivityCalls}`);
    log('info', `Converted logActivity calls: ${results.convertedLogActivities}`);
    
    if (results.logActivityCalls > 0 && results.convertedLogActivities > 0) {
        log('info', '✓ String concatenation conversion appears successful');
    } else {
        log('error', '✗ String concatenation conversion may be incomplete');
        results.passed = false;
    }
    
    return results;
}

// Test 5: Basic JavaScript syntax validation
function testJavaScriptSyntax(content) {
    log('info', 'TEST 5: Testing JavaScript syntax validation...');
    
    const results = {
        passed: true,
        syntaxErrors: []
    };
    
    try {
        // Extract JavaScript content between <script> tags
        const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
        const scriptMatches = content.match(scriptRegex) || [];
        
        if (scriptMatches.length === 0) {
            log('error', '✗ No script tags found in EJS file');
            results.passed = false;
            return results;
        }
        
        scriptMatches.forEach((script, index) => {
            // Remove script tags and extract JavaScript
            const jsContent = script.replace(/<\/?script[^>]*>/gi, '');
            
            // Basic syntax checks
            const openBraces = (jsContent.match(/{/g) || []).length;
            const closeBraces = (jsContent.match(/}/g) || []).length;
            const openParens = (jsContent.match(/\(/g) || []).length;
            const closeParens = (jsContent.match(/\)/g) || []).length;
            
            if (openBraces !== closeBraces) {
                results.syntaxErrors.push(`Script ${index + 1}: Unmatched braces (${openBraces} open, ${closeBraces} close)`);
                results.passed = false;
            }
            
            if (openParens !== closeParens) {
                results.syntaxErrors.push(`Script ${index + 1}: Unmatched parentheses (${openParens} open, ${closeParens} close)`);
                results.passed = false;
            }
        });
        
        if (results.passed) {
            log('info', '✓ Basic JavaScript syntax validation passed');
        } else {
            log('error', `✗ JavaScript syntax validation failed:`);
            results.syntaxErrors.forEach(error => log('error', `  ${error}`));
        }
        
    } catch (error) {
        log('error', `✗ JavaScript syntax validation failed: ${error.message}`);
        results.passed = false;
        results.syntaxErrors.push(error.message);
    }
    
    return results;
}

// Main test runner
function runTests() {
    console.log('=====================================');
    console.log('Rule Builder Template Literal Tests');
    console.log('=====================================\n');
    
    const startTime = Date.now();
    let totalTests = 0;
    let passedTests = 0;
    
    // Test 1: File Access
    totalTests++;
    const fileTest = testFileAccess();
    if (fileTest.passed) passedTests++;
    
    if (!fileTest.passed) {
        console.log('\n❌ Cannot proceed with other tests - file access failed');
        return;
    }
    
    // Test 2: Template Literal Conversion
    totalTests++;
    const templateTest = testTemplateLiteralConversion(fileTest.content);
    if (templateTest.passed) passedTests++;
    
    // Test 3: Function Definitions
    totalTests++;
    const functionTest = testFunctionDefinitions(fileTest.content);
    if (functionTest.passed) passedTests++;
    
    // Test 4: String Concatenation
    totalTests++;
    const concatenationTest = testStringConcatenation(fileTest.content);
    if (concatenationTest.passed) passedTests++;
    
    // Test 5: JavaScript Syntax
    totalTests++;
    const syntaxTest = testJavaScriptSyntax(fileTest.content);
    if (syntaxTest.passed) passedTests++;
    
    // Summary
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n=====================================');
    console.log('TEST SUMMARY');
    console.log('=====================================');
    console.log(`Tests Run: ${totalTests}`);
    console.log(`Tests Passed: ${passedTests}`);
    console.log(`Tests Failed: ${totalTests - passedTests}`);
    console.log(`Duration: ${duration}ms`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 ALL TESTS PASSED!');
        console.log('✓ Template literal issues have been resolved');
        console.log('✓ JavaScript functions should now be accessible');
        console.log('✓ Rule builder interface should work correctly');
    } else {
        console.log('\n⚠️  SOME TESTS FAILED');
        console.log('❌ Additional template literal fixes may be needed');
        console.log('❌ JavaScript functions may still be inaccessible');
    }
    
    return {
        totalTests,
        passedTests,
        allPassed: passedTests === totalTests,
        duration
    };
}

// Run the tests
if (require.main === module) {
    runTests();
}

module.exports = {
    runTests,
    testFileAccess,
    testTemplateLiteralConversion,
    testFunctionDefinitions,
    testStringConcatenation,
    testJavaScriptSyntax
};
