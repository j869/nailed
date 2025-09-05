import { activityLog } from './logging.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userActivityDir = path.join(__dirname, 'userActivity');
const logFile = path.join(userActivityDir, '1.log');

// Fill the log file to >50MB
function fillLogFile() {
  const entry = 'FILLER LOG ENTRY\n';
  const targetSize = 52 * 1024 * 1024; // 52MB
  let written = 0;
  const stream = fs.createWriteStream(logFile, { flags: 'w' });
  while (written < targetSize) {
    stream.write(entry);
    written += entry.length;
  }
  stream.end();
console.log('Filled log file to', (written / (1024 * 1024)).toFixed(2), 'MB');
}

// Run the test
function testTrimLogic() {
  fillLogFile();
  // Now call activityLog to trigger trimming

  console.log('------------------------------------------------');
  console.log('-------  TESTING TRIM LOGIC  ------');
  console.log('------------------------------------------------');

  activityLog({
    user: { id: 1 },
    method: 'POST',
    originalUrl: '/test/trim',
    query: {},
    body: { test: 'trim' },
    params: { id: 1 }
  }, '', 'Testing trim logic after file exceeds 50MB');
  // Check final file size
  const stats = fs.statSync(logFile);
console.log('Final log file size:', (stats.size / (1024 * 1024)).toFixed(2), 'MB');
}

testTrimLogic();
