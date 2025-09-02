# Life Calendar Launch Script
# Opens the Life Calendar application in the default browser

$indexPath = Join-Path $PSScriptRoot "index.html"

if (Test-Path $indexPath) {
    Write-Host "Launching Life Calendar application..."
    Write-Host "Opening: $indexPath"
    
    # Open the HTML file in the default browser
    Start-Process $indexPath
    
    Write-Host "Life Calendar application launched successfully!"
    Write-Host "The application is now running in your default browser."
} else {
    Write-Host "Error: index.html file not found in the current directory."
    Write-Host "Please make sure you're running this script from the LifeAndDeath folder."
}

# Keep the window open for a moment to show the message
Start-Sleep -Seconds 2