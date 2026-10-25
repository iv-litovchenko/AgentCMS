# Agent CMS — Windows: WSL2 + install.sh (без npm).
$ErrorActionPreference = "Stop"

$Repo = "https://github.com/iv-litovchenko/AgentCMS.git"
$InstallSh = "https://raw.githubusercontent.com/iv-litovchenko/AgentCMS/main/scripts/install.sh"

Write-Host "Agent CMS on Windows: use Docker Desktop + WSL2." -ForegroundColor Cyan
Write-Host ""
Write-Host "In WSL (Ubuntu):" -ForegroundColor Yellow
Write-Host "  curl -fsSL $InstallSh | bash"
Write-Host ""
Write-Host "Or from PowerShell (WSL):" -ForegroundColor Yellow
Write-Host "  wsl bash -c `"curl -fsSL $InstallSh | bash`""
Write-Host ""
Write-Host "Native Windows without WSL is not supported for this Docker stack."
Write-Host "WSL install path (default): ~/agent-cms  -> /home/<user>/agent-cms"
Write-Host "Native folder (if using Git Bash later): %USERPROFILE%\agent-cms"
Write-Host "See README: docker-compose.windows.yml"
