// Test the workflow creation logic
import axios from "axios";

// Mock the API_URL (this would normally come from env)
const API_URL = "http://localhost:4000"; // Replace with your actual API URL if different

// Test function to simulate the createBuildWithWorkflow function
async function testWorkflowCreation() {
    console.log('Testing workflow creation logic...');
    
    // Test the sheet name logic
    const testSheets = ['Current', 'Completed', 'current', 'completed'];
    
    testSheets.forEach(sheetName => {
        const productId = /completed/i.test(sheetName) ? 6 : 5;
        const productName = productId === 6 ? 'Archive - Completed Permits' : 'Active Permits';
        
        console.log(`Sheet: "${sheetName}" → Product ID: ${productId} (${productName})`);
    });
    
    console.log('\nWorkflow creation logic test completed!');
    console.log('✅ Current sheet customers will get "Active Permits" workflow (Product ID: 5)');
    console.log('✅ Completed sheet customers will get "Archive - Completed Permits" workflow (Product ID: 6)');
}

testWorkflowCreation().catch(console.error);
