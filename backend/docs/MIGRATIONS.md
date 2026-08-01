# Schema Migrations Framework

This document outlines the standard process for executing database schema upgrades using the custom migration runner.

## Overview
The migration framework allows us to securely evolve the MongoDB schema without relying on ad-hoc scripts. It ensures that migrations are:
- **Versioned**: Tracked in the `schema_migrations` collection.
- **Idempotent**: Executing them multiple times is safe.
- **Auditable**: Records exact timestamp and metrics.
- **Self-contained**: Scripts operate only on raw MongoDB collections.

## Creating a Migration
All migrations must reside in `backend/scripts/migrations/` and use a chronological naming convention: `XXX_descriptive_name.js`.

### Standard Interface
Every migration must `export default` an object matching this interface:

```javascript
export default {
  version: "001_migrate_deadlines",
  description: "Brief explanation of what the migration does.",
  
  async run(collection, DRY_RUN) {
    // 1. Fetch raw data
    // 2. Compute transformations
    // 3. IF (!DRY_RUN) -> execute update operations
    
    return {
      goalsUpdated: 1,
      milestonesUpdated: 4,
      successLogs: [],
      unknownFormatLogs: []
    };
  },

  async rollback(collection, DRY_RUN) {
    // Future rollback logic goes here
    console.log("[INFO] Rollback not implemented.");
  }
};
```

**Important Guidelines:**
- A migration **must never** depend on application code, models, or caching logic. They must rely solely on the raw `mongodb` driver. This ensures migrations can be executed years later without breaking due to updated Mongoose schemas.
- Do not log verbose data directly into the DB. Use the arrays returned in the report, which the runner prints cleanly.

## Migration Workflow

### 1. Run a Dry-Run
Always verify your logic safely first.
```bash
node backend/scripts/migrations/migrationRunner.js 001_migrate_deadlines.js --dry-run
```

### 2. Review the Report
Check the console output carefully. The runner will print the exact before/after shapes of transformed documents, along with skipped items.

### 3. Backup Database
Before running in production mode, you must back up the affected collections.
```bash
node backend/scripts/migrations/backupGoals.js
```

### 4. Run Production Migration
Execute the actual data transformation:
```bash
node backend/scripts/migrations/migrationRunner.js 001_migrate_deadlines.js
```
The runner will automatically insert an immutable record into `schema_migrations` upon success.

### 5. Verify Results
The migration is complete. Ensure that end-to-end functionality remains intact. 

## Special Flags
- `--dry-run`: Prevents any updates to the database (including inserting the `schema_migrations` record).
- `--force`: Bypasses the idempotency check, forcing a migration to re-run even if a successful record already exists in `schema_migrations`.
