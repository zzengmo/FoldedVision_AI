@echo off
setlocal EnableExtensions DisableDelayedExpansion
title FoldedVision Inspection Workspace
pushd "%~dp0sites\foldedvision-inspection" 2>nul
if errorlevel 1 goto :missing
where.exe node.exe >nul 2>&1
if errorlevel 1 goto :node
node -e "if(Number(process.versions.node.split('.')[0])<22)process.exit(1)"
if errorlevel 1 goto :node
where.exe npm.cmd >nul 2>&1
if errorlevel 1 goto :node
if not exist "node_modules\drizzle-kit\bin.cjs" (
  echo Installing web dependencies...
  call npm.cmd ci --include=dev
  if errorlevel 1 goto :failed
)
echo Building the inspection workspace...
call npm.cmd run build
if errorlevel 1 goto :failed
echo Starting the inspection workspace. Keep this window open.
echo Records and photos are stored under sites/foldedvision-inspection/.runtime/
echo Press Ctrl+C to stop. No model training will start.
set FOLDEDVISION_OPEN=1
call npm.cmd start
popd
exit /b 0
:node
echo Node.js 22.13 or newer and npm are required.
goto :failed
:missing
echo The web project was not found. Keep this CMD in the project root.
pause
exit /b 1
:failed
popd
pause
exit /b 1
