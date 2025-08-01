# Define the main source directory
$sourceDir = "src"
# Define the output file
$outputFile = "project_files_content.txt"

# Define patterns/directories/files to exclude
$excludePatterns = @(
    "*.css",
    "*.d.ts",
    "*.ico",
    "*.png",
    "vite-env.d.ts",
    "package.json" # Exclude any stray package.json files within src
)
# Define full paths for directories to exclude
$excludeDirs = @(
    "$($PWD.Path)\src\styles",
    "$($PWD.Path)\src\types"
)

# Clear the output file if it exists, or create it
Clear-Content -Path $outputFile -ErrorAction SilentlyContinue

# Get files recursively from the source directory
Get-ChildItem -Path $sourceDir -Recurse -File | Where-Object {
    $currentItem = $_
    $exclude = $false

    # Check against exclude patterns
    foreach ($pattern in $excludePatterns) {
        if ($currentItem.Name -like $pattern) {
            $exclude = $true
            break
        }
    }

    # Check if the file is within an excluded directory
    if (-not $exclude) {
        foreach ($dir in $excludeDirs) {
            # Check if the file's directory path starts with the excluded directory path
            if ($currentItem.DirectoryName -like "$dir*") {
                $exclude = $true
                break
            }
        }
    }

    # Keep the file if it's not excluded
    -not $exclude
} | ForEach-Object {
    # Get relative path
    $relativePath = $_.FullName.Replace("$($PWD.Path)\", "")

    # Write header with file path to output file
    Add-Content -Path $outputFile -Value "==== START: $relativePath ===="
    Add-Content -Path $outputFile -Value "" # Add a blank line

    # Get file content and append to output file
    # Use -Raw to get content as a single string, preserving line breaks within the file
    # Use -ErrorAction SilentlyContinue in case of read errors
    $fileContent = Get-Content -Path $_.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    Add-Content -Path $outputFile -Value $fileContent

    # Write footer/separator
    Add-Content -Path $outputFile -Value "" # Add a blank line
    Add-Content -Path $outputFile -Value "==== END: $relativePath ===="
    Add-Content -Path $outputFile -Value "" # Add a blank line between files
}

Write-Host "Content of relevant files compiled into $outputFile"
