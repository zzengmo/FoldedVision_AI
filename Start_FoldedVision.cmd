@echo off
setlocal EnableExtensions DisableDelayedExpansion
title FoldedVision AI Inspection Lab

pushd "%~dp0sites\foldedvision-inspection" 2>nul
if errorlevel 1 goto :missing_site
if not exist "package.json" goto :missing_package

where.exe node.exe >nul 2>&1
if errorlevel 1 goto :missing_node
where.exe npm.cmd >nul 2>&1
if errorlevel 1 goto :missing_node

if not exist "node_modules\.bin\vite.cmd" (
    echo Installing the web dependencies for the first run...
    call npm.cmd ci --include=dev
    if errorlevel 1 goto :install_failed
)

echo Preparing the latest FoldedVision AI build...
call npm.cmd run build
if errorlevel 1 goto :start_failed

echo Starting FoldedVision AI and opening your browser...
echo Keep this window open while using the site. Press Ctrl+C to stop.
echo(
call npm.cmd run preview -- --host 127.0.0.1 --open
if errorlevel 1 goto :start_failed
popd
exit /b 0

:missing_package
popd
:missing_site
echo The web project was not found. Keep this CMD file in the FoldedVision_AI folder.
goto :failed

:missing_node
echo Node.js and npm are required. Install Node.js, then double-click this file again.
goto :failed_in_site

:install_failed
echo Dependency installation failed. Check the npm message above and try again.
goto :failed_in_site

:start_failed
echo The site could not start. Check the message above.

:failed_in_site
popd
:failed
pause
exit /b 1
