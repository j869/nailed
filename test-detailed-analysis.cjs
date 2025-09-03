// Enhanced script to find exactly where functions are located
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'views/admin/rule-builder.ejs');
const content = fs.readFileSync(filePath, 'utf8');

console.log('🔍 Detailed Script Analysis...\n');

// Split content by script tags
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let scriptIndex = 0;

while ((match = scriptRegex.exec(content)) !== null) {
    scriptIndex++;
    const scriptContent = match[1];
    const startPos = match.index;
    const lines = content.substring(0, startPos).split('\n').length;
    
    console.log(`📜 Script ${scriptIndex} (starts around line ${lines}):`);
    
    // Check for our target functions
    const targetFunctions = ['testSharedRuleJson', 'importJsonToBuilder', 'validateSharedRuleJson', 'copyRuleToClipboard'];
    
    targetFunctions.forEach(funcName => {
        if (scriptContent.includes(`function ${funcName}`)) {
            console.log(`   ✅ Contains ${funcName}`);
        }
    });
    
    // Check script attributes
    const scriptTag = match[0].split('>')[0] + '>';
    if (scriptTag.includes('src=')) {
        console.log(`   📎 External script: ${scriptTag}`);
    } else {
        console.log(`   📄 Inline script (${scriptContent.length} characters)`);
        
        // Check for any function definitions
        const functionMatches = scriptContent.match(/function\s+\w+\s*\(/g);
        if (functionMatches) {
            console.log(`   🔧 Functions found: ${functionMatches.length}`);
            if (functionMatches.length <= 10) { // Show if not too many
                functionMatches.forEach(func => {
                    console.log(`      - ${func.replace(/\s+/g, ' ')}`);
                });
            }
        }
    }
    console.log('');
}

console.log('🔍 Checking for JavaScript syntax issues that could break function definitions...\n');

// Check for template literal issues in onclick handlers
const onclickMatches = content.match(/onclick="[^"]*"/g);
if (onclickMatches) {
    console.log('📋 Onclick handlers found:');
    onclickMatches.forEach((onclick, index) => {
        console.log(`${index + 1}. ${onclick}`);
        
        // Check for template literal syntax in onclick
        if (onclick.includes('${')) {
            console.log(`   ⚠️  Contains template literal syntax - this might cause issues!`);
        }
    });
}

console.log('\n🔧 Checking for potential EJS template conflicts...');

// Check for EJS syntax near our functions
const lines = content.split('\n');
let inScript = false;
let scriptLineStart = 0;

lines.forEach((line, index) => {
    if (line.includes('<script')) {
        inScript = true;
        scriptLineStart = index + 1;
    } else if (line.includes('</script>')) {
        inScript = false;
    } else if (inScript && line.includes('${')) {
        console.log(`⚠️  Line ${index + 1} (script line ${index + 1 - scriptLineStart}): Template literal in script: ${line.trim()}`);
    }
});

console.log('\n🎯 Specific fix for your error:');
console.log('The error suggests functions are not defined when onclick is triggered.');
console.log('This usually happens when:');
console.log('1. Functions are defined after the HTML elements that reference them');
console.log('2. JavaScript errors prevent function definitions from being processed');
console.log('3. Template literal syntax breaks the JavaScript parsing');

console.log('\n🔧 Quick Fix Script:');
console.log('Let me check the exact line numbers where onclick handlers are defined...');

const targetButtons = [
    'testSharedRuleJson()',
    'importJsonToBuilder()'
];

targetButtons.forEach(funcCall => {
    const regex = new RegExp(`onclick="[^"]*${funcCall.replace('()', '\\(\\)')}[^"]*"`, 'g');
    let match;
    let lineNum = 1;
    let position = 0;
    
    while ((match = regex.exec(content)) !== null) {
        // Count lines up to this position
        const beforeMatch = content.substring(0, match.index);
        lineNum = beforeMatch.split('\n').length;
        
        console.log(`📍 ${funcCall} called at line ${lineNum}: ${match[0]}`);
    }
});
