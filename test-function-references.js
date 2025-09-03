#!/usr/bin/env node

/**
 * Test script to verify that JavaScript functions are properly defined
 * and can be found by onclick handlers in the rule-builder.ejs file
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing JavaScript function references in rule-builder.ejs...\n');

// Read the rule-builder.ejs file
const filePath = path.join(__dirname, 'views/admin/rule-builder.ejs');
let fileContent;

try {
    fileContent = fs.readFileSync(filePath, 'utf8');
    console.log('✅ Successfully loaded rule-builder.ejs');
} catch (error) {
    console.error('❌ Failed to load file:', error.message);
    process.exit(1);
}

// Extract the JavaScript content from the script tags
const scriptMatches = fileContent.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
if (!scriptMatches) {
    console.error('❌ No script tags found in the file');
    process.exit(1);
}

// Combine all JavaScript content
let jsContent = '';
scriptMatches.forEach(match => {
    const js = match.replace(/<\/?script[^>]*>/gi, '');
    jsContent += js + '\n';
});

console.log('✅ Extracted JavaScript content from script tags\n');

// Test 1: Check if functions are defined
console.log('🔍 Test 1: Checking function definitions...');

const functionsToTest = [
    'testSharedRuleJson',
    'importJsonToBuilder',
    'validateSharedRuleJson',
    'copyRuleToClipboard'
];

let allFunctionsDefined = true;

functionsToTest.forEach(funcName => {
    const functionRegex = new RegExp(`function\\s+${funcName}\\s*\\(`, 'i');
    if (functionRegex.test(jsContent)) {
        console.log(`  ✅ ${funcName} - FOUND`);
    } else {
        console.log(`  ❌ ${funcName} - NOT FOUND`);
        allFunctionsDefined = false;
    }
});

// Test 2: Check onclick handlers reference existing functions
console.log('\n🔍 Test 2: Checking onclick handler references...');

const onclickMatches = fileContent.match(/onclick="([^"]+)"/gi);
if (onclickMatches) {
    let allOnclickValid = true;
    
    onclickMatches.forEach(onclick => {
        const funcCall = onclick.match(/onclick="([^(]+)\(/);
        if (funcCall) {
            const funcName = funcCall[1].trim();
            
            // Check if this function is defined in our JS content
            const functionRegex = new RegExp(`function\\s+${funcName}\\s*\\(`, 'i');
            if (functionRegex.test(jsContent)) {
                console.log(`  ✅ onclick="${funcName}()" - Function exists`);
            } else {
                console.log(`  ❌ onclick="${funcName}()" - Function NOT FOUND`);
                allOnclickValid = false;
            }
        }
    });
    
    if (!allOnclickValid) {
        allFunctionsDefined = false;
    }
} else {
    console.log('  ⚠️  No onclick handlers found');
}

// Test 3: Check for element ID mismatches
console.log('\n🔍 Test 3: Checking element ID references...');

const elementChecks = [
    {
        jsReference: 'sharedRuleJson',
        htmlId: 'id="sharedRuleJson"',
        description: 'Shared rule JSON textarea'
    },
    {
        jsReference: 'testResultsContainer',
        htmlId: 'id="testResultsContainer"',
        description: 'Test results container'
    },
    {
        jsReference: 'rule-name',
        htmlId: 'id="rule-name"',
        description: 'Rule name input'
    },
    {
        jsReference: 'rule-trigger',
        htmlId: 'id="rule-trigger"',
        description: 'Rule trigger select'
    }
];

let allElementsMatch = true;

elementChecks.forEach(check => {
    const jsHasReference = jsContent.includes(`'${check.jsReference}'`) || jsContent.includes(`"${check.jsReference}"`);
    const htmlHasElement = fileContent.includes(check.htmlId);
    
    if (jsHasReference && htmlHasElement) {
        console.log(`  ✅ ${check.description} - JS references and HTML element both exist`);
    } else if (jsHasReference && !htmlHasElement) {
        console.log(`  ❌ ${check.description} - JS references "${check.jsReference}" but HTML element missing`);
        allElementsMatch = false;
    } else if (!jsHasReference && htmlHasElement) {
        console.log(`  ⚠️  ${check.description} - HTML element exists but not referenced in JS`);
    } else {
        console.log(`  ❌ ${check.description} - Neither JS reference nor HTML element found`);
        allElementsMatch = false;
    }
});

// Test 4: Check for syntax errors that might prevent script loading
console.log('\n🔍 Test 4: Checking for potential syntax issues...');

const potentialIssues = [
    {
        pattern: /\$\{[^}]+\}/g,
        description: 'Unescaped template literals (should be \\${} in EJS)',
        severity: 'ERROR'
    },
    {
        pattern: /document\.getElementById\(['"][^'"]*['"]\)\.(?:value|innerHTML)\s*=/g,
        description: 'Direct DOM manipulation without null checks',
        severity: 'WARNING'
    }
];

let hasSyntaxIssues = false;

potentialIssues.forEach(issue => {
    const matches = jsContent.match(issue.pattern);
    if (matches) {
        console.log(`  ${issue.severity === 'ERROR' ? '❌' : '⚠️'} ${issue.description}: ${matches.length} occurrences`);
        if (issue.severity === 'ERROR') {
            hasSyntaxIssues = true;
        }
        matches.slice(0, 3).forEach(match => {
            console.log(`    - ${match.trim()}`);
        });
        if (matches.length > 3) {
            console.log(`    ... and ${matches.length - 3} more`);
        }
    } else {
        console.log(`  ✅ No ${issue.description.toLowerCase()}`);
    }
});

// Final summary
console.log('\n📊 SUMMARY:');
console.log('================');

if (allFunctionsDefined && allElementsMatch && !hasSyntaxIssues) {
    console.log('🎉 ALL TESTS PASSED! The functions should work correctly.');
    process.exit(0);
} else {
    console.log('💥 ISSUES FOUND:');
    if (!allFunctionsDefined) {
        console.log('  - Some functions are not defined or onclick handlers reference missing functions');
    }
    if (!allElementsMatch) {
        console.log('  - Element ID mismatches between JavaScript and HTML');
    }
    if (hasSyntaxIssues) {
        console.log('  - Syntax issues that may prevent JavaScript from loading');
    }
    console.log('\n🔧 Please fix the issues above before testing in browser.');
    process.exit(1);
}
