# Usage: .\sync.ps1
# This script pushes the dist/ folder contents to GCP.

# Ensure we are in the script's directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($scriptPath) { Set-Location $scriptPath } else { $scriptPath = Get-Location }

# Load .env
if (Test-Path ".env") {
    foreach ($line in Get-Content ".env") {
        if ($line -match "^([^=]+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2])
        }
    }
}

$user = ${env:REMOTE_USER}
$host_ip = ${env:REMOTE_HOST}
$remote_path = ${env:REMOTE_PATH}
$key_path = ${env:SSH_KEY_PATH}

if (-not $user -or -not $host_ip -or -not $remote_path -or -not $key_path) {
    Write-Error "Please ensure .env is correctly configured."
    exit
}

if (-not (Test-Path "dist")) {
    Write-Error "Error: 'dist' folder not found."
    exit
}

Write-Host "--- Deploying 'dist' contents to GCP ---" -ForegroundColor Green

# Resolve absolute path for key
$absKey = (Resolve-Path $key_path).Path
$absDist = (Resolve-Path "dist").Path

# Use Push-Location to run scp from within the dist directory
# This ensures that . refers to the contents of dist
Push-Location $absDist
scp -i "$absKey" -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL -o PubkeyAcceptedAlgorithms=+ssh-rsa -o IdentitiesOnly=yes -r . "${user}@${host_ip}:${remote_path}"
Pop-Location

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment Successful!" -ForegroundColor Green
}
else {
    Write-Error "Deployment failed."
}
