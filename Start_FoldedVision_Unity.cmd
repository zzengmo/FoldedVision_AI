@echo off
setlocal
set "FOLDEDVISION_PROJECT=%~dp0unity\My project"
set "FOLDEDVISION_EDITOR=%ProgramFiles%\Unity\Hub\Editor\6000.6.9f1\Editor\Unity.exe"

if not exist "%FOLDEDVISION_PROJECT%\ProjectSettings\ProjectVersion.txt" (
    echo FoldedVision Unity project folder was not found.
    pause
    exit /b 1
)

if not exist "%FOLDEDVISION_PROJECT%\Logs" md "%FOLDEDVISION_PROJECT%\Logs"
> "%FOLDEDVISION_PROJECT%\Logs\foldedvision.request" echo open

powershell.exe -NoProfile -Command "$state = Join-Path $env:FOLDEDVISION_PROJECT 'Library/EditorInstance.json'; if (Test-Path -LiteralPath $state) { $editor = Get-Content -LiteralPath $state -Raw | ConvertFrom-Json; if ((Get-Process -Id $editor.process_id -ErrorAction SilentlyContinue).ProcessName -eq 'Unity') { exit 0 } }; exit 1"
if not errorlevel 1 exit /b 0

if not exist "%FOLDEDVISION_EDITOR%" (
    echo Open the folder "unity\My project" in Unity Hub with Editor 6000.6.9f1.
    pause
    exit /b 1
)
start "" "%FOLDEDVISION_EDITOR%" -projectPath "%FOLDEDVISION_PROJECT%"
