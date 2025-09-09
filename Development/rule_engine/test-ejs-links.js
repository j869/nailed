/**
 * Comprehensive EJS Links and Routes Test Suite
 * Tests all admin EJS files for broken links, missing routes, and route accessibility
 * Following meth.md MVP prototyping methodology
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// Test tracking variables
let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;

// Test credentials
const testCredentials = {
  email: 'john@buildingbb.com.au',
  password: '123'
};

// Base configuration
const baseURL = 'http://127.0.0.1:3000';
const viewsPath = '/home/john/Documents/nailed/views';

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

function skip(message) {
  console.log(`⏭️  ${message}`);
  testsSkipped++;
}

// Helper to make HTTP requests
async function makeRequest(path, options = {}) {
  const fetch = (await import('node-fetch')).default;
  const url = `${baseURL}${path}`;
  
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body,
      redirect: 'manual',
      timeout: 5000 // 5 second timeout
    });
    
    return {
      status: response.status,
      headers: response.headers,
      text: async () => await response.text(),
      redirect: response.status >= 300 && response.status < 400,
      ok: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message,
      ok: false
    };
  }
}

// Authentication helper
async function authenticate() {
  try {
    console.log('🔐 Authenticating user...');
    
    // Get login page
    const loginPageResponse = await makeRequest('/login');
    if (loginPageResponse.status !== 200) {
      throw new Error(`Login page failed: ${loginPageResponse.status}`);
    }
    
    // Extract session cookie
    const setCookieHeader = loginPageResponse.headers.get('set-cookie');
    let sessionCookie = '';
    
    if (setCookieHeader) {
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
      const sessionCookieMatch = cookies.find(cookie => cookie.includes('connect.sid'));
      if (sessionCookieMatch) {
        sessionCookie = sessionCookieMatch.split(';')[0];
      }
    }
    
    // Submit login
    const loginResponse = await makeRequest('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': sessionCookie
      },
      body: `email=${encodeURIComponent(testCredentials.email)}&password=${encodeURIComponent(testCredentials.password)}`
    });
    
    // Get updated cookie
    const newSetCookie = loginResponse.headers.get('set-cookie');
    if (newSetCookie) {
      const newCookies = Array.isArray(newSetCookie) ? newSetCookie : [newSetCookie];
      const newSessionCookieMatch = newCookies.find(cookie => cookie.includes('connect.sid'));
      if (newSessionCookieMatch) {
        sessionCookie = newSessionCookieMatch.split(';')[0];
      }
    }
    
    if (loginResponse.status === 302 || loginResponse.status === 200) {
      console.log('✅ Authentication successful');
      return sessionCookie;
    } else {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
  } catch (error) {
    console.log('❌ Authentication failed:', error.message);
    return null;
  }
}

// Extract links from EJS content
function extractLinksFromEJS(content, filename) {
  const links = [];
  
  // Regular expressions to find different types of links
  const patterns = [
    // href attributes
    /href=["']([^"']+)["']/g,
    // action attributes in forms
    /action=["']([^"']+)["']/g,
    // fetch/ajax calls
    /fetch\s*\(\s*["']([^"']+)["']/g,
    // $.get, $.post calls
    /\$\.(get|post)\s*\(\s*["']([^"']+)["']/g,
    // window.location assignments
    /window\.location\s*=\s*["']([^"']+)["']/g
  ];
  
  patterns.forEach((pattern, index) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      let url = match[1] || match[2]; // Handle different capture groups
      
      // Skip external URLs, javascript:, mailto:, tel:, etc.
      if (url && !url.startsWith('http') && !url.startsWith('//') && 
          !url.startsWith('javascript:') && !url.startsWith('mailto:') && 
          !url.startsWith('tel:') && !url.startsWith('#')) {
        
        // Clean up dynamic segments and query parameters for testing
        let cleanUrl = url.split('?')[0]; // Remove query params
        cleanUrl = cleanUrl.replace(/<%.*?%>/g, ''); // Remove EJS tags
        cleanUrl = cleanUrl.replace(/\${.*?}/g, ''); // Remove template literals
        
        // Skip empty URLs after cleaning
        if (cleanUrl.trim()) {
          links.push({
            url: cleanUrl.trim(),
            originalUrl: url,
            type: index === 0 ? 'href' : index === 1 ? 'action' : 'javascript',
            line: content.substring(0, match.index).split('\n').length
          });
        }
      }
    }
  });
  
  return links;
}

// Recursively find all EJS files
function findEJSFiles(dir, ejsFiles = []) {
  try {
    const files = readdirSync(dir);
    
    files.forEach(file => {
      const fullPath = join(dir, file);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        findEJSFiles(fullPath, ejsFiles);
      } else if (extname(file) === '.ejs') {
        ejsFiles.push(fullPath);
      }
    });
    
    return ejsFiles;
  } catch (error) {
    console.log(`⚠️ Error reading directory ${dir}: ${error.message}`);
    return ejsFiles;
  }
}

// Test a specific route
async function testRoute(url, sessionCookie, context = '') {
  try {
    const response = await makeRequest(url, {
      headers: sessionCookie ? { 'Cookie': sessionCookie } : {}
    });
    
    if (response.status === 0) {
      return { success: false, message: `Connection failed: ${response.error}`, status: 0 };
    }
    
    if (response.status === 200) {
      return { success: true, message: 'OK', status: 200 };
    } else if (response.status === 302) {
      const location = response.headers.get('location');
      return { success: true, message: `Redirects to: ${location}`, status: 302 };
    } else if (response.status === 404) {
      return { success: false, message: 'Not Found', status: 404 };
    } else if (response.status === 403) {
      return { success: true, message: 'Forbidden (permissions required)', status: 403 };
    } else if (response.status === 401) {
      return { success: true, message: 'Unauthorized (authentication required)', status: 401 };
    } else {
      return { success: false, message: `HTTP ${response.status}`, status: response.status };
    }
  } catch (error) {
    return { success: false, message: `Error: ${error.message}`, status: 0 };
  }
}

// Main test runner
async function runEJSLinksTest() {
  console.log('\n🧪 Comprehensive EJS Links and Routes Test Suite');
  console.log('=================================================');
  
  // Step 1: Find all EJS files
  console.log('\n1. Discovering EJS Files');
  console.log('-------------------------');
  
  const ejsFiles = findEJSFiles(viewsPath);
  console.log(`📁 Found ${ejsFiles.length} EJS files`);
  
  // Focus on admin EJS files
  const adminEjsFiles = ejsFiles.filter(file => 
    file.includes('/admin/') || 
    file.includes('header.ejs') ||
    file.includes('navigation') ||
    file.includes('menu')
  );
  
  console.log(`🔒 Found ${adminEjsFiles.length} admin-related EJS files:`);
  adminEjsFiles.forEach(file => {
    const relativePath = file.replace('/home/john/Documents/nailed/views/', '');
    console.log(`   📄 ${relativePath}`);
  });

  // Step 2: Authentication
  console.log('\n2. Authentication Setup');
  console.log('------------------------');
  
  const sessionCookie = await authenticate();
  if (!sessionCookie) {
    console.log('❌ Cannot continue without authentication');
    return false;
  }

  // Step 3: Extract and test links
  console.log('\n3. Link Extraction and Testing');
  console.log('-------------------------------');
  
  const allLinks = new Map(); // Use Map to avoid duplicates
  const problemRoutes = [];
  
  // Test the specific demo/rules link first
  console.log('\n🔍 Testing specific problematic route: /demo/rules');
  const demoRulesResult = await testRoute('/demo/rules', sessionCookie);
  if (demoRulesResult.success) {
    assert(true, `/demo/rules - ${demoRulesResult.message} (${demoRulesResult.status})`);
  } else {
    assert(false, `/demo/rules - ${demoRulesResult.message} (${demoRulesResult.status})`);
    problemRoutes.push({ url: '/demo/rules', issue: demoRulesResult.message, file: 'header.ejs (reported)' });
  }
  
  // Process each EJS file
  for (const ejsFile of adminEjsFiles) {
    try {
      const relativePath = ejsFile.replace('/home/john/Documents/nailed/views/', '');
      console.log(`\n📄 Processing: ${relativePath}`);
      
      const content = readFileSync(ejsFile, 'utf8');
      const links = extractLinksFromEJS(content, relativePath);
      
      console.log(`   🔗 Found ${links.length} links`);
      
      for (const link of links) {
        const key = link.url;
        if (!allLinks.has(key)) {
          allLinks.set(key, {
            url: link.url,
            files: [{ file: relativePath, line: link.line, type: link.type }],
            originalUrls: [link.originalUrl]
          });
        } else {
          const existing = allLinks.get(key);
          existing.files.push({ file: relativePath, line: link.line, type: link.type });
          if (!existing.originalUrls.includes(link.originalUrl)) {
            existing.originalUrls.push(link.originalUrl);
          }
        }
      }
      
    } catch (error) {
      console.log(`⚠️ Error processing ${ejsFile}: ${error.message}`);
    }
  }

  // Step 4: Test all discovered links
  console.log('\n4. Route Testing Results');
  console.log('-------------------------');
  
  const uniqueUrls = Array.from(allLinks.keys()).sort();
  console.log(`🧪 Testing ${uniqueUrls.length} unique routes...\n`);
  
  for (const url of uniqueUrls) {
    const linkInfo = allLinks.get(url);
    const result = await testRoute(url, sessionCookie);
    
    if (result.success) {
      assert(true, `${url} - ${result.message} (${result.status})`);
    } else {
      assert(false, `${url} - ${result.message} (${result.status})`);
      problemRoutes.push({
        url: url,
        issue: result.message,
        files: linkInfo.files.map(f => `${f.file}:${f.line}`).join(', ')
      });
    }
    
    // Show which files reference this URL
    if (linkInfo.files.length > 0) {
      console.log(`   📍 Referenced in: ${linkInfo.files.map(f => `${f.file}:${f.line}`).join(', ')}`);
    }
  }

  // Step 5: Problem Report
  if (problemRoutes.length > 0) {
    console.log('\n❌ Problem Routes Found');
    console.log('========================');
    
    problemRoutes.forEach((problem, index) => {
      console.log(`\n${index + 1}. Route: ${problem.url}`);
      console.log(`   Issue: ${problem.issue}`);
      console.log(`   Files: ${problem.files}`);
    });
  }

  // Test Summary
  console.log('\n📊 EJS Links Test Summary');
  console.log('==========================');
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`⏭️  Tests Skipped: ${testsSkipped}`);
  console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  console.log(`🔗 Total Routes Tested: ${uniqueUrls.length}`);
  console.log(`❌ Problem Routes: ${problemRoutes.length}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All EJS links and routes are working!');
    return true;
  } else {
    console.log('\n⚠️  Some routes have issues. Review the problem report above.');
    return false;
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runEJSLinksTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('EJS Links test runner error:', error);
    process.exit(1);
  });
}

export { runEJSLinksTest };
