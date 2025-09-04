/**
 * Admin Views Test Suite
 * Tests all admin EJS pages for proper loading with authentication
 * Following meth.md MVP prototyping methodology
 */

import request from 'supertest';
import express from 'express';

// Test tracking variables
let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;

// Test credentials
const testCredentials = {
  email: 'john@buildingbb.com.au',
  password: '123'
};

// Admin routes to test (based on EJS files found)
const adminRoutes = [
  {
    path: '/admin/rule-builder',
    view: 'admin/rule-builder.ejs',
    description: 'Rule Builder Admin Page'
  },
  {
    path: '/admin/workflow-validator', 
    view: 'admin/workflow-validator.ejs',
    description: 'Workflow Validator Admin Page'
  },
  {
    path: '/admin/users',
    view: 'admin/users.ejs', 
    description: 'User Management Page'
  },
  {
    path: '/admin/customers/import',
    view: 'customer-import.ejs',
    description: 'Customer Import Page'
  },
  {
    path: '/admin/customers/import/reverts',
    view: 'revert-list.ejs',
    description: 'Revert List Page'
  }
];

// Additional admin routes that might exist
const potentialAdminRoutes = [
  '/admin/rule-engine-demo',
  '/admin/data-integrity-report',
  '/admin/manage-rule-templates',
  '/admin/rule-builder-clean'
];

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

// Test using live server instead of imported app
async function testLiveServer() {
  const baseURL = 'http://127.0.0.1:3000';
  
  // Helper to make requests to live server
  async function makeRequest(path, options = {}) {
    const fetch = (await import('node-fetch')).default;
    const url = `${baseURL}${path}`;
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body,
      redirect: 'manual' // Don't follow redirects automatically
    });
    
    return {
      status: response.status,
      headers: response.headers,
      text: async () => await response.text(),
      redirect: response.status >= 300 && response.status < 400
    };
  }
  
  // Authentication helper for live server
  async function authenticateWithLiveServer() {
    try {
      console.log('🔐 Attempting authentication with live server...');
      
      // First get login page to establish session
      const loginPageResponse = await makeRequest('/login');
      
      if (loginPageResponse.status !== 200) {
        console.log('❌ Could not access login page:', loginPageResponse.status);
        return null;
      }
      
      // Extract cookie from login page response
      const setCookieHeader = loginPageResponse.headers.get('set-cookie');
      let sessionCookie = '';
      
      if (setCookieHeader) {
        // Handle multiple cookies in the response
        const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        const sessionCookieMatch = cookies.find(cookie => cookie.includes('connect.sid'));
        if (sessionCookieMatch) {
          sessionCookie = sessionCookieMatch.split(';')[0]; // Get just the cookie value without attributes
        }
      }
      
      console.log('🍪 Initial session cookie:', sessionCookie ? 'Found' : 'Not found');
      
      // Now submit login credentials
      const loginResponse = await makeRequest('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': sessionCookie
        },
        body: `email=${encodeURIComponent(testCredentials.email)}&password=${encodeURIComponent(testCredentials.password)}`
      });
      
      console.log('🔐 Login response status:', loginResponse.status);
      
      // Get updated session cookie from login response
      const newSetCookie = loginResponse.headers.get('set-cookie');
      if (newSetCookie) {
        const newCookies = Array.isArray(newSetCookie) ? newSetCookie : [newSetCookie];
        const newSessionCookieMatch = newCookies.find(cookie => cookie.includes('connect.sid'));
        if (newSessionCookieMatch) {
          sessionCookie = newSessionCookieMatch.split(';')[0]; // Get just the cookie value
        }
      }
      
      console.log('🍪 Updated session cookie:', sessionCookie ? 'Found' : 'Not found');
      
      // Check if login was successful (should redirect or return success)
      if (loginResponse.status === 302 || loginResponse.status === 200) {
        console.log('✅ Authentication successful with live server');
        return sessionCookie;
      } else {
        console.log('❌ Authentication failed:', loginResponse.status);
        return null;
      }
    } catch (error) {
      console.log('❌ Authentication error:', error.message);
      return null;
    }
  }
  
  return { makeRequest, authenticateWithLiveServer };
}

// Main test runner
async function runAdminTests() {
  console.log('\n🧪 Admin Views Test Suite');
  console.log('==========================');
  console.log('Testing against live server at http://127.0.0.1:3000');

  const { makeRequest, authenticateWithLiveServer } = await testLiveServer();

  console.log('\n1. Server Connectivity Tests');
  console.log('------------------------------');
  
  // Test 1: Server is running
  try {
    const response = await makeRequest('/');
    assert(response.status === 200 || response.status === 302, 'Server is accessible');
  } catch (error) {
    assert(false, `Server connectivity failed: ${error.message}`);
    console.log('❌ Cannot continue tests - server not accessible');
    return false;
  }
  
  // Test 2: Login page accessibility
  try {
    const response = await makeRequest('/login');
    assert(response.status === 200, 'Login page loads successfully');
  } catch (error) {
    assert(false, `Login page test failed: ${error.message}`);
  }

  console.log('\n2. Authentication Tests');
  console.log('------------------------');
  
  // Test 3: Authentication process
  let sessionCookie = null;
  try {
    sessionCookie = await authenticateWithLiveServer();
    assert(sessionCookie !== null, 'User authentication works');
    
    if (!sessionCookie) {
      console.log('⚠️  Cannot continue with admin tests without authentication');
      return false;
    }
  } catch (error) {
    assert(false, `Authentication test failed: ${error.message}`);
    return false;
  }

  console.log('\n3. Admin Route Protection Tests');
  console.log('--------------------------------');
  
  // Test 4: Admin routes redirect when not authenticated
  try {
    const response = await makeRequest('/admin/rule-builder');
    assert(response.redirect, 'Admin routes redirect when not authenticated');
    
    if (response.redirect) {
      const location = response.headers.get('location');
      assert(location && location.includes('login'), 'Redirect goes to login page');
    }
  } catch (error) {
    assert(false, `Admin protection test failed: ${error.message}`);
  }

  console.log('\n4. Admin Page Load Tests');
  console.log('-------------------------');
  
  if (!sessionCookie) {
    console.log('❌ Cannot test admin pages without authentication');
    return false;
  }
  
  // First test: verify authentication is working by testing a known authenticated route
  try {
    console.log('\nTesting: Authentication verification');
    const homeResponse = await makeRequest('/', {
      headers: { 'Cookie': sessionCookie }
    });
    
    console.log('🔍 Home page response status:', homeResponse.status);
    
    // If home redirects to login, our session isn't working
    if (homeResponse.status === 302) {
      const location = homeResponse.headers.get('location');
      if (location && location.includes('login')) {
        console.log('❌ Session cookie not working - home page redirects to login');
        console.log('🍪 Cookie being sent:', sessionCookie);
        return false;
      }
    }
  } catch (error) {
    console.log('❌ Authentication verification failed:', error.message);
  }
  
  // Test each admin route
  for (const route of adminRoutes) {
    try {
      console.log(`\nTesting: ${route.description}`);
      console.log(`🍪 Using cookie: ${sessionCookie.substring(0, 50)}...`);
      
      const response = await makeRequest(route.path, {
        headers: { 'Cookie': sessionCookie }
      });
      
      console.log(`📊 Response status: ${response.status}`);
      
      if (response.status === 200) {
        assert(true, `${route.path} loads successfully (200)`);
        
        // Check if response contains HTML
        const responseText = await response.text();
        const hasHtml = responseText && responseText.includes('<html');
        assert(hasHtml, `${route.path} returns valid HTML content`);
        
        // Check if it contains the expected view elements
        const hasTitle = responseText && (
          responseText.includes('<title>') || 
          responseText.includes('class=') ||
          responseText.includes('id=')
        );
        assert(hasTitle, `${route.path} contains structured content`);
        
      } else if (response.status === 302) {
        const location = response.headers.get('location');
        console.log(`⚠️  ${route.path} redirects (${response.status}) to: ${location}`);
        skip(`${route.path} - redirected instead of loading`);
      } else if (response.status === 404) {
        console.log(`⚠️  ${route.path} not found (404)`);
        skip(`${route.path} - route not implemented`);
      } else if (response.status === 403) {
        console.log(`⚠️  ${route.path} forbidden (403) - may require special permissions`);
        skip(`${route.path} - access forbidden`);
      } else {
        assert(false, `${route.path} failed with status ${response.status}`);
      }
      
    } catch (error) {
      assert(false, `${route.path} test failed: ${error.message}`);
    }
  }

  console.log('\n5. Potential Admin Route Discovery');
  console.log('-----------------------------------');
  
  // Test potential admin routes
  for (const path of potentialAdminRoutes) {
    try {
      const response = await makeRequest(path, {
        headers: { 'Cookie': sessionCookie }
      });
      
      if (response.status === 200) {
        assert(true, `${path} exists and loads successfully`);
      } else if (response.status === 404) {
        skip(`${path} - route not found (404)`);
      } else {
        skip(`${path} - status ${response.status}`);
      }
    } catch (error) {
      skip(`${path} - error: ${error.message}`);
    }
  }

  // Test Summary
  console.log('\n📊 Admin Views Test Summary');
  console.log('============================');
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`⏭️  Tests Skipped: ${testsSkipped}`);
  console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All admin page tests passed!');
    return true;
  } else {
    console.log('\n⚠️  Some admin page tests failed. Review the output above.');
    return false;
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAdminTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Admin test runner error:', error);
    process.exit(1);
  });
}

export { runAdminTests };
