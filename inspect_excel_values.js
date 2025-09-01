import ExcelJS from 'exceljs';

const filePath = './Permit Register - MASTER v2.xlsm';

try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    console.log(`Found ${workbook.worksheets.length} worksheets`);
    
    // Focus on the main sheets we found earlier
    const mainSheets = ['Current', 'Completed'];
    
    for (const sheetName of mainSheets) {
        const worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) continue;
        
        console.log(`\n=== ANALYZING SHEET: ${sheetName} ===`);
        console.log(`Total rows: ${worksheet.rowCount}`);
        
        // Get actual values instead of formulas
        console.log('\n=== ROW 2 (Expected Headers) ===');
        const headerRow = worksheet.getRow(2);
        const headers = [];
        for (let col = 1; col <= 20; col++) {
            const cell = headerRow.getCell(col);
            let value = cell.value;
            
            // If it's a formula, try to get the result
            if (cell.formula) {
                value = cell.result || cell.text || `FORMULA: ${cell.formula}`;
            } else if (cell.text) {
                value = cell.text;
            } else if (typeof value === 'object' && value !== null) {
                value = JSON.stringify(value);
            }
            
            headers.push(value || '');
        }
        console.log('Headers:', headers.filter(h => h !== ''));
        
        // Look for actual data starting from different rows
        for (let testRow = 3; testRow <= 15; testRow++) {
            const dataRow = worksheet.getRow(testRow);
            const data = [];
            let hasData = false;
            
            for (let col = 1; col <= 20; col++) {
                const cell = dataRow.getCell(col);
                let value = cell.value;
                
                // If it's a formula, try to get the result
                if (cell.formula) {
                    value = cell.result || cell.text || `FORMULA: ${cell.formula}`;
                } else if (cell.text) {
                    value = cell.text;
                } else if (typeof value === 'object' && value !== null) {
                    value = JSON.stringify(value);
                }
                
                if (value && value !== '' && !String(value).startsWith('FORMULA:')) {
                    hasData = true;
                }
                
                data.push(value || '');
            }
            
            if (hasData) {
                console.log(`\n=== ROW ${testRow} (Sample Data) ===`);
                console.log('Data:', data.filter(d => d !== ''));
                
                // Show mapping between columns A and B for job number
                const colA = dataRow.getCell(1).value;
                const colB = dataRow.getCell(2).value;
                console.log(`Column A: ${colA}, Column B: ${colB}, Combined: ${colA}${colB}`);
                break;
            }
        }
        
        // Look at a few more data rows to understand the pattern
        console.log('\n=== SAMPLING MORE DATA ROWS ===');
        let sampleCount = 0;
        for (let row = 3; row <= worksheet.rowCount && sampleCount < 5; row++) {
            const dataRow = worksheet.getRow(row);
            const colA = dataRow.getCell(1).value;
            const colB = dataRow.getCell(2).value;
            const colC = dataRow.getCell(3).value;
            
            if (colA || colB || colC) {
                console.log(`Row ${row}: A="${colA}" B="${colB}" C="${colC}"`);
                sampleCount++;
            }
        }
    }
    
} catch (error) {
    console.error('Error reading Excel file:', error.message);
}
