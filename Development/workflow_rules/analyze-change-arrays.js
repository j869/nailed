import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

const db = new Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

async function analyzeChangeArrays() {
  try {
    await db.connect();
    console.log('=== CHANGE_ARRAY ANALYSIS ===\n');
    
    // 1. Sample change_array values from jobs
    console.log('1. SAMPLE CHANGE_ARRAYS FROM JOBS:');
    const jobSamples = await db.query(`
      SELECT id, job_template_id, change_array 
      FROM jobs 
      WHERE change_array IS NOT NULL AND change_array != '' 
      LIMIT 10
    `);
    jobSamples.rows.forEach(row => {
      console.log(`Job ${row.id} (template ${row.job_template_id}): ${row.change_array}`);
    });
    
    // 2. Pattern frequency analysis
    console.log('\n2. CHANGE_ARRAY PATTERN FREQUENCY:');
    const patterns = await db.query(`
      SELECT change_array, COUNT(*) as frequency, 
             ARRAY_AGG(DISTINCT job_template_id) as template_ids
      FROM jobs 
      WHERE change_array IS NOT NULL AND change_array != '' 
      GROUP BY change_array 
      ORDER BY frequency DESC 
      LIMIT 15
    `);
    patterns.rows.forEach(row => {
      console.log(`Pattern: "${row.change_array}" (${row.frequency} jobs, templates: ${row.template_ids})`);
    });
    
    // 3. Rule templates current state
    console.log('\n3. CURRENT RULE_TEMPLATES:');
    const templates = await db.query('SELECT id, name, category, template_json FROM rule_templates');
    if (templates.rows.length === 0) {
      console.log('No rule templates found');
    } else {
      templates.rows.forEach(row => {
        console.log(`Template ${row.id}: ${row.name} (${row.category})`);
        console.log(`  JSON: ${JSON.stringify(row.template_json)}`);
      });
    }
    
    // 4. Check for any existing foreign key relationships
    console.log('\n4. FOREIGN KEY ANALYSIS:');
    const fkCheck = await db.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND (tc.table_name = 'jobs' OR tc.table_name = 'rule_templates')
    `);
    
    if (fkCheck.rows.length === 0) {
      console.log('No foreign key relationships found between jobs and rule_templates');
    } else {
      fkCheck.rows.forEach(row => {
        console.log(`${row.table_name}.${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
      });
    }
    
    // 5. Schema analysis
    console.log('\n5. JOBS TABLE SCHEMA (relevant columns):');
    const jobSchema = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'jobs' 
        AND column_name IN ('change_array', 'job_template_id', 'id')
    `);
    jobSchema.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    console.log('\n=== RECOMMENDATIONS ===');
    console.log('Based on this analysis, here are the next steps to link change_arrays to rule_templates:');
    console.log('1. Create rule_template_id column in jobs table');
    console.log('2. Migrate existing change_array patterns to rule_templates');
    console.log('3. Update application logic to use rule_template_id instead of raw change_array');
    console.log('4. Add foreign key constraint for data integrity');
    
  } catch (error) {
    console.error('Analysis failed:', error);
  } finally {
    await db.end();
  }
}

analyzeChangeArrays();
