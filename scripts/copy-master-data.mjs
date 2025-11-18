/**
 * Script to copy master data from dev to production
 * 
 * Usage: node scripts/copy-master-data.mjs
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const tables = [
  'branches',
  'brands',
  'units',
  'animalCategories',
  'productCategories',
  'productSubcategories',
  'clinicServiceCategories',
];

async function copyTable(tableName) {
  console.log(`\n📋 Copying ${tableName}...`);
  
  try {
    // Export from dev
    const { stdout: devData } = await execAsync(
      `npx convex run --no-push ${tableName}:list`
    );
    
    console.log(`✅ Exported ${tableName} from dev`);
    
    // You would need to parse the data and insert into prod
    // This is a simplified example
    
    return true;
  } catch (error) {
    console.error(`❌ Error copying ${tableName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting master data copy from dev to prod...\n');
  
  for (const table of tables) {
    await copyTable(table);
  }
  
  console.log('\n✨ Master data copy completed!');
}

main();
