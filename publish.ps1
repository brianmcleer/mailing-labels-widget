<#
  publish.ps1  -  One-command publish/update for an ExB custom widget repo.
  1. Copies the latest widget from the EB folder into this repo's widget subfolder
     (skips node_modules and .vs).
  2. Commits.
  3. Publishes the repo to GitHub on first run, or pushes updates after.
  4. (Optional) Cuts a versioned GitHub Release with a downloadable zip.

  RUN (from a terminal opened in this repo folder):
    Normal update:            powershell -ExecutionPolicy Bypass -File .\publish.ps1
    Update + release v1.1.0:  powershell -ExecutionPolicy Bypass -File .\publish.ps1 -Release v1.1.0
#>

param(
    [string]$Release = "",
    [string]$CommitMessage = "Update widget ($(Get-Date -Format 'yyyy-MM-dd'))"
)

$ErrorActionPreference = "Stop"

# ----- EDIT THESE THREE PER WIDGET -----------------------------------------
$WidgetName    = "mailing-labels"
$RepoName      = "mailing-labels-widget"
$ExbWidgetPath = "C:\arcgis-experience-builder-1.21\client\your-extensions\widgets\$WidgetName"
# ----------------------------------------------------------------------------

$RepoPath   = $PSScriptRoot
$WidgetDest = Join-Path $RepoPath $WidgetName

Write-Host "==> Repo:   $RepoPath"
Write-Host "==> Source: $ExbWidgetPath"

if (-not (Test-Path $ExbWidgetPath)) {
    throw "Cannot find the widget folder at:`n  $ExbWidgetPath`nEdit `$ExbWidgetPath in publish.ps1."
}

Write-Host "`n==> Syncing widget files (skipping node_modules)..."
robocopy "$ExbWidgetPath" "$WidgetDest" /MIR /XD "node_modules" ".vs" /XF "*.user" "*.suo" /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }
Write-Host "    Done."

Push-Location $RepoPath
try {
    git add -A | Out-Null
    $pending = git status --porcelain
    if ([string]::IsNullOrWhiteSpace($pending)) {
        Write-Host "`n==> No changes to commit."
    } else {
        Write-Host "`n==> Committing: $CommitMessage"
        git commit -m "$CommitMessage" | Out-Null
    }

    $hasOrigin = (git remote) -contains "origin"
    $gh = Get-Command gh -ErrorAction SilentlyContinue

    if (-not $hasOrigin) {
        if ($gh) {
            Write-Host "`n==> First run: creating GitHub repo and pushing..."
            gh repo create $RepoName --public --source="." --remote="origin" --push
        } else {
            Write-Host "`n==> Repo not on GitHub yet and gh not installed. Publish once via GitHub Desktop, then re-run."
            return
        }
    } else {
        Write-Host "`n==> Pushing to GitHub..."
        git push
    }

    if ($Release -ne "") {
        if (-not $gh) {
            Write-Host "`n==> Skipping release: gh not installed. (winget install --id GitHub.cli ; gh auth login)"
        } else {
            Write-Host "`n==> Creating release $Release ..."
            $zip = Join-Path $env:TEMP "$WidgetName.zip"
            if (Test-Path $zip) { Remove-Item $zip -Force }
            Compress-Archive -Path $WidgetDest -DestinationPath $zip
            $notes = "Download $WidgetName.zip, extract, and drop the $WidgetName folder into client\your-extensions\widgets. Then run npm install in the client folder and restart."
            gh release create $Release "$zip" --title "$RepoName $Release" --notes $notes
        }
    }

    Write-Host "`n==> Finished."
}
finally {
    Pop-Location
}
