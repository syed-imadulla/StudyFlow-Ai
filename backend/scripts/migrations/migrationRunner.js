import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env') }); // fallback

/**
 * Executes a migration programmatically.
 */
export async function runMigration(migrationFile, options = {}) {
  const { dryRun = false, force = false, dbUrl } = options;
  
  if (!mongoose.connection.readyState) {
    await mongoose.connect(dbUrl || process.env.MONGODB_URI || 'mongodb://localhost:27017/studyflow');
  }
  
  const db = mongoose.connection.db;
  const migrationsCollection = db.collection('schema_migrations');
  const targetCollection = db.collection('goals'); // Default target collection for now
  
  let migrationModule;
  try {
    const rawModule = await import(`./${migrationFile}`);
    migrationModule = rawModule.default || rawModule;
  } catch (err) {
    console.error(`[ERROR] Failed to load migration file ${migrationFile}:`, err.message);
    throw err;
  }

  const version = migrationModule.version || migrationFile.replace('.js', '');

  console.log('\n==================================');
  console.log('         Migration Runner         ');
  console.log('==================================');
  console.log(`Migration: ${version}`);
  console.log(`Mode:      ${dryRun ? 'DRY RUN' : 'PRODUCTION'}`);
  console.log(`Database:  ${db.databaseName}`);
  console.log(`Backup:    Verified (or should be)`);
  console.log('==================================\n');

  // Check history for idempotency
  const existingSuccess = await migrationsCollection.findOne({ version, status: 'SUCCESS', dryRun: false });
  
  if (existingSuccess && !dryRun && !force) {
    console.log(`[INFO] Migration already executed.`);
    console.log(`[INFO] Version: ${version}`);
    console.log(`[INFO] Skipping.`);
    return { skipped: true };
  }

  console.log(`[INFO] Running migration: ${version}`);
  console.log(`[INFO] Dry Run: ${dryRun}`);
  
  let report;
  try {
    report = await migrationModule.run(targetCollection, dryRun);
  } catch (error) {
    console.error(`[ERROR] Migration failed execution.`);
    console.error(error);
    
    await migrationsCollection.insertOne({
      version,
      executedAt: new Date(),
      dryRun,
      status: 'FAILED',
      error: error.message
    });
    
    throw error;
  }
  
  console.log(`[INFO] Goals Updated: ${report.goalsUpdated}`);
  console.log(`[INFO] Milestones Updated: ${report.milestonesUpdated}`);
  
  if (report.successLogs && report.successLogs.length > 0) {
    console.log('\n--- Successful Reconstructions ---');
    report.successLogs.forEach(l => console.log(l));
  }
  
  if (report.unknownFormatLogs && report.unknownFormatLogs.length > 0) {
    console.log('\n--- Skipped & Unknown Formats ---');
    report.unknownFormatLogs.forEach(l => console.log(l));
  }

  // Insert Immutable Record
  await migrationsCollection.insertOne({
    version,
    executedAt: new Date(),
    dryRun,
    status: 'SUCCESS',
    goalsUpdated: report.goalsUpdated,
    milestonesUpdated: report.milestonesUpdated
  });
  
  console.log(`\n[SUCCESS] Migration completed successfully.`);
  return { skipped: false, report };
}

// CLI entry point
if (process.argv[1].endsWith('migrationRunner.js')) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const migrationFile = args.find(a => !a.startsWith('--'));
  
  if (!migrationFile) {
    console.error("Please specify a migration file. E.g. node migrationRunner.js 001_migrate_deadlines.js [--dry-run] [--force]");
    process.exit(1);
  }
  
  runMigration(migrationFile, { dryRun, force })
    .then(() => {
      mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      mongoose.disconnect();
      process.exit(1);
    });
}
