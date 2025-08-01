# PowerShell script to run SQL commands against Supabase
param(
    [Parameter(Mandatory=$true)]
    [string]$sqlFilePath
)

# Validate the file path
if (-not (Test-Path -Path $sqlFilePath -PathType Leaf)) {
    Write-Error "SQL file not found at path: $sqlFilePath"
    exit 1
}

# !! SECURITY WARNING: Hardcoded credentials below. Consider using environment variables. !!
$connectionString = "Host=db.qwvukolqraoucpxjqpmu.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=PFUj63Bwj37nV1hz;SslMode=Require;"
$psqlConnectionString = "postgresql://postgres:PFUj63Bwj37nV1hz@db.qwvukolqraoucpxjqpmu.supabase.co:5432/postgres"

# Read the SQL content from the provided file path
$sqlContent = Get-Content -Path $sqlFilePath -Raw

# Output for debugging
Write-Host "Running SQL script from: $sqlFilePath"

# Send the SQL command to PostgreSQL using psql
# Ensure psql is in the PATH or provide the full path
try {
    # Use Invoke-Expression to handle potential spaces in paths if needed, though piping should be fine
    $sqlContent | psql $psqlConnectionString -v ON_ERROR_STOP=1
    Write-Host "SQL execution complete for $sqlFilePath"
} catch {
    Write-Error "Error executing SQL script: $_"
    exit 1
}
