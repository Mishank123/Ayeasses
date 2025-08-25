# Database Migration to ObjectIds

This migration converts the database from auto-increment integer IDs to unique MongoDB-style ObjectIds (24-character hex strings).

## What Changed

- **ID Format**: Changed from sequential integers (1, 2, 3...) to unique ObjectIds (68a6ee5439df19d04e253d67)
- **ID Generation**: Uses timestamp-based ObjectIds for better sorting and uniqueness
- **Database Schema**: Updated all tables to use VARCHAR(24) for ID fields
- **Foreign Keys**: Updated to reference the new ObjectId format

## Tables Affected

- `assessment_user` - User accounts
- `sessions` - User sessions
- `content` - Content management
- `assessments` - Assessment data

## Running the Migration

### Prerequisites
- Backup your database before running migration
- Ensure no active connections to the database
- Stop the application server

### Steps

1. **Backup your database**
   ```bash
   mysqldump -u [username] -p [database_name] > backup_before_migration.sql
   ```

2. **Run the migration**
   ```bash
   cd backend
   npm run migrate
   ```

3. **Verify migration**
   - Check that all tables have the new structure
   - Verify that data is preserved
   - Test the application functionality

## Rollback

If migration fails, you can restore from backup:
```bash
mysql -u [username] -p [database_name] < backup_before_migration.sql
```

## New ID Format

- **Length**: 24 characters
- **Format**: Hexadecimal string
- **Example**: `68a6ee5439df19d04e253d67`
- **Uniqueness**: Guaranteed unique across all records
- **Sorting**: Timestamp-based for chronological ordering

## Benefits

1. **Global Uniqueness**: No conflicts when merging databases
2. **Distributed Systems**: Works across multiple servers
3. **Security**: Harder to guess or enumerate
4. **Scalability**: No auto-increment limitations
5. **Timestamp Information**: Built-in creation time data

## API Changes

The API endpoints remain the same, but now return ObjectIds instead of integers:

```json
{
  "id": "68a6ee5439df19d04e253d67",
  "title": "Sample Assessment",
  "created_by": "68a6ee5439df19d04e253d68"
}
```

## Validation

The system includes ID validation to ensure proper format:
- Must be exactly 24 characters
- Must contain only hexadecimal characters (0-9, a-f, A-F)
- Example: `68a6ee5439df19d04e253d67`
