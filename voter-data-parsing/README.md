# Voter Address to Precinct Lookup

This directory contains utilities for mapping voter addresses to voting precincts using geospatial analysis.

## Overview

**parseVoterData.ts** is a TypeScript script that:

1. Loads precinct boundary data from a GeoJSON file (`Precinct_Hub_Data.geojson`)
2. Streams through large CSV address files row-by-row
3. Determines which precinct each address belongs to using point-in-polygon geospatial analysis
4. Stores the results in a dedicated SQLite database (`voter-precinct-lookup.db`)

The script is optimized for large datasets:

- **Memory-efficient**: Streams CSV files instead of loading into memory
- **Fast point lookups**: Uses [@turf/turf](https://turfjs.org/) for robust geospatial calculations
- **Batch inserts**: Inserts records in configurable batches (default 1000) for optimal database performance
- **Progress logging**: Provides detailed import summary and unmapped address warnings

## Usage

### Basic Import (Example Data)

```bash
npm run import:addresses
```

This processes the example CSV file and stores results in `voter-precinct-lookup.db`.

### Import Custom CSV File

```bash
npm run import:addresses path/to/your/large-file.csv
```

The CSV file must have these columns:

- `Latitude` - WGS84 latitude coordinate
- `Longitude` - WGS84 longitude coordinate
- `AddNo_Full` - Full address number
- `StNam_Full` - Full street name
- `Post_City` - Postal city
- `State` - State code
- `Zip_Code` - ZIP code
- `County` - County name

(The script gracefully handles additional or missing columns.)

### Dry Run (Test Without Writing)

```bash
npm run import:addresses:dry-run
```

or with a custom file:

```bash
npm run import:addresses path/to/file.csv --dry-run
```

This processes the file and shows summary statistics without writing to the database. Useful for testing large files before actual import.

### Verbose Output (Debug Mode)

```bash
npm run import:addresses:verbose
```

Shows detailed logging for each address processed, including:

- Addresses successfully mapped to precincts
- Addresses that couldn't be mapped (fall outside all precincts)
- Batch insert confirmations

## Database Schema

The script creates a separate SQLite database at `voter-precinct-lookup.db` with two tables:

### `precincts` Table

Stores reference data for all precinct boundaries:

| Column            | Type          | Description                       |
| ----------------- | ------------- | --------------------------------- |
| `id`              | TEXT (PK)     | Precinct object ID                |
| `district_number` | INTEGER       | District/precinct district number |
| `precinct_name`   | TEXT          | Precinct name (e.g., "20-1")      |
| `global_id`       | TEXT (UNIQUE) | UUID from GeoJSON                 |
| `created_at`      | DATETIME      | Record creation timestamp         |

### `voter_addresses` Table

Stores parsed addresses with precinct mappings:

| Column            | Type         | Description                                      |
| ----------------- | ------------ | ------------------------------------------------ |
| `id`              | INTEGER (PK) | Auto-increment ID                                |
| `longitude`       | REAL         | WGS84 longitude coordinate                       |
| `latitude`        | REAL         | WGS84 latitude coordinate                        |
| `address`         | TEXT         | Full address string                              |
| `city`            | TEXT         | City/municipality                                |
| `zip_code`        | TEXT         | ZIP code                                         |
| `county`          | TEXT         | County name                                      |
| `precinct_id`     | TEXT (FK)    | Foreign key to `precincts.id` (null if unmapped) |
| `precinct_name`   | TEXT         | Precinct name for quick lookup                   |
| `district_number` | INTEGER      | District number for quick lookup                 |
| `imported_at`     | DATETIME     | Import timestamp                                 |

**Index**: `idx_voter_addresses_precinct_id` on `precinct_id` for fast lookups by precinct.

## Configuration

### Environment Variables

Set these in your `.env` file:

```bash
# Override the default database location
PRECINCT_DB_URL=file:./custom-path/voter-precinct-lookup.db
```

### Script Parameters

The script supports these options:

| Option             | Description                                               |
| ------------------ | --------------------------------------------------------- |
| `path/to/file.csv` | Custom CSV file path (optional, defaults to example data) |
| `--dry-run`        | Test without writing to database                          |
| `--verbose`        | Show detailed logging for each address                    |

## Output Example

```
🚀 Voter Address to Precinct Lookup Importer
==================================================
CSV File: /path/to/voter-data-parsing/example_address_data.csv
Database: file:./voter-precinct-lookup.db
==================================================
✓ Loaded 34 precincts from GeoJSON
✓ Stored 34 precincts in database

📖 Processing addresses...

📊 Import Summary:
  Processed: 12,456
  Mapped: 12,389 (99.46%)
  Unmapped: 67

✨ Complete in 8.34s
```

## How It Works

### Point-in-Polygon Analysis

For each address (latitude, longitude):

1. The precinct GeoJSON contains polygon geometries for each precinct boundary
2. [@turf/turf's `booleanPointInPolygon()`](https://turfjs.org/docs/#booleanPointInPolygon) tests if the point falls within any polygon
3. The first matching precinct is recorded

**Unmapped addresses** are those that fall outside all defined precinct boundaries (e.g., addresses in neighboring counties or outside service areas).

### Performance Optimization

- **CSV Streaming**: Processes one row at a time (~unlimited file size capability)
- **Batch Inserts**: Collects records and inserts in configurable batches (default 1000) for 50-100x faster database writes vs single-row inserts
- **Single precinct load**: Precincts are loaded once into memory; coordinates are tested against all precincts efficiently

Expected performance: **1000-5000 addresses/second** depending on:

- Number of precincts (34 in Rutherford)
- CPU processing power
- Disk I/O speed

## Troubleshooting

### CSV File Has Different Column Names

Edit the column references in `parseVoterData.ts` lines ~180-195 to match your data:

```typescript
const latitude = parseFloat(row.YourLatitudeColumn);
const longitude = parseFloat(row.YourLongitudeColumn);
```

### All Addresses Unmapped

Check that:

- Coordinates are in **WGS84** (standard lat/lon, not projected coordinates)
- Coordinates are actually within the state/county defined in `Precinct_Hub_Data.geojson`
- GeoJSON polygon coordinates are valid and not self-intersecting

### Database Already Exists

The script uses `INSERT OR IGNORE` for precincts, so re-running will skip duplicates. To fully reset:

```bash
rm voter-precinct-lookup.db
npm run import:addresses
```

## Future Enhancements

Potential improvements:

- [ ] Support remote CSV files (S3, HTTP URLs)
- [ ] Resume interrupted imports (track progress in metadata table)
- [ ] Spatial indexing (R-tree) for even faster lookups
- [ ] API endpoint for interactive precinct lookups by address/lat-lon
- [ ] Precinct boundary validation and visualization
- [ ] Multi-threaded processing for very large files
