/**
 * HTTP Test for Admin Workflow Validator Endpoint
 * Created: 4 September 2025
 * Purpose: Test the /admin/workflow-validator endpoint functionality
 */

import axios from "axios";

const API_URL = "http://localhost:4000";

async function testAdminEndpoint() {
  console.log("he1      Starting HTTP endpoint test");
  
  try {
    // Test 1: Check if server is running
    console.log("he101    Testing server connectivity");
    const healthCheck = await axios.get(`${API_URL}/`);
    console.log("he201    Server is responding:", healthCheck.status);

    // Test 2: Test admin endpoint (should redirect to login)
    console.log("he102    Testing admin endpoint without auth");
    try {
      const adminResponse = await axios.get(`${API_URL}/admin/workflow-validator`, {
        maxRedirects: 0,
        validateStatus: function (status) {
          return status >= 200 && status < 400;
        }
      });
      console.log("he202    Admin endpoint response:", adminResponse.status);
    } catch (error) {
      if (error.response && error.response.status === 302) {
        console.log("he203    Redirected to login (expected):", error.response.headers.location);
      } else {
        console.log("he308    Unexpected error:", error.message);
      }
    }

    // Test 3: Test with simulated login (if possible)
    console.log("he103    Testing workflow validator test endpoint");
    try {
      const validatorResponse = await axios.get(`${API_URL}/test-validator`);
      console.log("he204    Validator endpoint working:", validatorResponse.status);
      
      if (validatorResponse.data && validatorResponse.data.summary) {
        console.log("he205    Validator summary:");
        console.log(`he206    - Total Problems: ${validatorResponse.data.summary.totalProblems}`);
        console.log(`he207    - Jobs Processed: ${validatorResponse.data.summary.jobsProcessed}`);
        console.log(`he208    - Processing Time: ${validatorResponse.data.summary.processingTimeMs}ms`);
      }
    } catch (error) {
      console.log("he308    Validator test endpoint error:", error.message);
    }

    // Test 4: Check static resources
    console.log("he104    Testing static resource access");
    try {
      const cssResponse = await axios.get(`${API_URL}/css/styles.css`);
      console.log("he209    CSS file accessible:", cssResponse.status);
    } catch (error) {
      console.log("he309    CSS file not accessible:", error.message);
    }

    console.log("he9      HTTP endpoint test completed");
    
  } catch (error) {
    console.error("he8      HTTP test failed:", error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error("he808    Server is not running on port 4000");
    }
  }
}

// Usage instructions
console.log("=".repeat(60));
console.log("HTTP Test for Admin Workflow Validator");
console.log("=".repeat(60));
console.log("Usage:");
console.log("1. Start the server: node index.js");
console.log("2. Run this test: node tests/test-http-endpoint.js");
console.log("=".repeat(60));

// Run the test
testAdminEndpoint();
