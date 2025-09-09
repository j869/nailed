import ExcelJS from 'exceljs';

const filePath = './Permit Register - MASTER v2.xlsm';

try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    console.log(`Testing import logic with ${workbook.worksheets.length} worksheets`);
    
    // Test the logic for both Current and Completed sheets
    const mainSheets = ['Current', 'Completed'];
    
    for (const sheetName of mainSheets) {
        const worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) continue;
        
        console.log(`\n=== TESTING SHEET: ${sheetName} ===`);
        
        const rows = [];
        let headers = {};
        
        // Get headers from row 2 (for Permit Register format)
        const headerRow = worksheet.getRow(2);
        headerRow.eachCell((cell, colNumber) => {
            let value = cell.value;
            // Handle formula cells
            if (cell.formula) {
                value = cell.result || cell.text || value;
            } else if (cell.text) {
                value = cell.text;
            }
            headers[colNumber] = value;
        });
        
        console.log('Headers found:', Object.values(headers).filter(h => h));
        
        // Process first 10 data rows starting from row 9 to test empty row detection
        let sampleCount = 0;
        let emptyRowCount = 0;
        for (let rowNumber = 9; rowNumber <= worksheet.rowCount && sampleCount < 10; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            
            // Check if row has actual meaningful data (not empty or formula-only)
            let hasRealData = false;
            let hasCustomerName = false;
            let hasPhoneNumber = false;
            const rowData = {};
            
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                let value = cell.value;
                
                // Handle formula cells
                if (cell.formula) {
                    value = cell.result || cell.text;
                } else if (cell.text) {
                    value = cell.text;
                }
                
                // Skip null, undefined, empty strings, and formula placeholders
                if (value === null || value === undefined || value === '' || String(value).startsWith('FORMULA:')) {
                    value = '';
                } else {
                    // Convert to string and trim whitespace
                    value = String(value).trim();
                    if (value !== '') {
                        hasRealData = true;
                        
                        // Check for essential fields based on header
                        const header = headers[colNumber];
                        if (header === 'Customer Name' && value) {
                            hasCustomerName = true;
                        }
                        if (header === 'Phone #' && value) {
                            hasPhoneNumber = true;
                        }
                    }
                }
                
                const header = headers[colNumber];
                if (header) {
                    rowData[header] = value;
                }
            });
            
            // Concatenate columns A and B for Job Number
            const colA = row.getCell(1).value;
            const colB = row.getCell(2).value;
            if (colA || colB) {
                const jobNo = `${colA || ''}${colB || ''}`.trim();
                if (jobNo) {
                    rowData["Job No"] = jobNo;
                    hasRealData = true;
                }
            }
            
            // Only process rows that have meaningful data and at least Customer Name or Phone #
            if (hasRealData && (hasCustomerName || hasPhoneNumber)) {
                console.log(`\nRow ${rowNumber} processed:`);
                console.log(`  Job No: ${rowData["Job No"]}`);
                console.log(`  Customer Name: ${rowData["Customer Name"]}`);
                console.log(`  Phone #: ${rowData["Phone #"]}`);
                console.log(`  Address: ${rowData["Address"] || rowData["Site Location"]}`);
                sampleCount++;
            } else if (hasRealData) {
                console.log(`\nRow ${rowNumber} skipped (has data but no customer name/phone):`);
                console.log(`  Available data: ${Object.keys(rowData).filter(k => rowData[k]).join(', ')}`);
                emptyRowCount++;
            } else {
                emptyRowCount++;
            }
        }
        
        console.log(`Found ${sampleCount} valid data rows and ${emptyRowCount} empty/incomplete rows (showing first 10 total)`);
        
        // Test specifically around the problem area (rows 120-130)
        console.log('\n=== TESTING PROBLEM AREA (Rows 120-130) ===');
        for (let rowNumber = 120; rowNumber <= 130; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            let hasAnyData = false;
            
            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
                    hasAnyData = true;
                }
            });
            
            if (hasAnyData) {
                console.log(`Row ${rowNumber}: Contains some data`);
            } else {
                console.log(`Row ${rowNumber}: Completely empty`);
            }
        }
    }
    
} catch (error) {
    console.error('Error testing import logic:', error.message);
}
