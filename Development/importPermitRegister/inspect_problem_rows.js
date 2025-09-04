import ExcelJS from 'exceljs';

const filePath = './Permit Register - MASTER v2.xlsm';

try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    // Focus on the Current sheet where the problem was reported
    const worksheet = workbook.getWorksheet('Current');
    if (worksheet) {
        console.log('=== DETAILED INSPECTION OF PROBLEM ROWS (120-130) ===');
        
        for (let rowNumber = 120; rowNumber <= 130; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            console.log(`\nRow ${rowNumber}:`);
            
            let cellData = [];
            let hasActualContent = false;
            
            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                let value = cell.value;
                let cellInfo = `Col${colNumber}: `;
                
                if (cell.formula) {
                    cellInfo += `FORMULA(${cell.formula})`;
                    if (cell.result !== undefined) {
                        cellInfo += ` = ${cell.result}`;
                    }
                } else if (cell.text) {
                    cellInfo += `TEXT("${cell.text}")`;
                } else if (value !== null && value !== undefined) {
                    cellInfo += `VALUE(${JSON.stringify(value)})`;
                } else {
                    cellInfo += 'NULL';
                }
                
                // Check if this constitutes actual content
                if (value !== null && value !== undefined && value !== '' && 
                    (!cell.formula || (cell.result !== null && cell.result !== undefined && cell.result !== ''))) {
                    hasActualContent = true;
                }
                
                cellData.push(cellInfo);
            });
            
            if (cellData.length === 0) {
                console.log('  COMPLETELY EMPTY (no cells)');
            } else {
                console.log(`  Cells found: ${cellData.length}`);
                console.log(`  Has actual content: ${hasActualContent}`);
                cellData.forEach(cell => console.log(`    ${cell}`));
            }
        }
        
        // Now test our improved logic on these specific rows
        console.log('\n=== TESTING OUR IMPROVED LOGIC ===');
        
        // Get headers from row 2
        const headers = {};
        const headerRow = worksheet.getRow(2);
        headerRow.eachCell((cell, colNumber) => {
            let value = cell.value;
            if (cell.formula) {
                value = cell.result || cell.text || value;
            } else if (cell.text) {
                value = cell.text;
            }
            headers[colNumber] = value;
        });
        
        for (let rowNumber = 120; rowNumber <= 130; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            
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
            
            const wouldProcess = hasRealData && (hasCustomerName || hasPhoneNumber);
            
            console.log(`Row ${rowNumber}: hasRealData=${hasRealData}, hasCustomerName=${hasCustomerName}, hasPhoneNumber=${hasPhoneNumber}, wouldProcess=${wouldProcess}`);
            
            if (hasRealData && !wouldProcess) {
                console.log(`  - Has data but missing customer name/phone, would skip`);
                const nonEmptyFields = Object.keys(rowData).filter(k => rowData[k] && rowData[k] !== '');
                console.log(`  - Non-empty fields: ${nonEmptyFields.join(', ')}`);
            }
        }
    }
    
} catch (error) {
    console.error('Error inspecting Excel file:', error.message);
}
