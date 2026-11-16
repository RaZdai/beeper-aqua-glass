<#
.SYNOPSIS
  Optional: make Beeper Desktop on Windows draw its popovers (emoji and reaction picker, hover
  menus) inside the main window instead of in separate native windows.

.DESCRIPTION
  By default Beeper opens each popover as its own small window. Tiling window managers such as
  Komorebi or GlazeWM treat that as a new app window and tile it beside Beeper. Beeper already has
  an in-window mode (it uses it on Linux/Wayland); this script switches it on for Windows by
  changing one character in Beeper's app archive (resources\app.asar). The file keeps its size and
  nothing else in it changes.

  A backup is saved first as %APPDATA%\BeeperTexts\app.asar.before-inline-popovers.
  Beeper updates replace app.asar, so run this again after an update.

.PARAMETER Restore
  Puts the backup back, undoing the change.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\inline-popovers.ps1
#>
param(
  [string]$Asar = (Join-Path $env:LOCALAPPDATA 'Programs\BeeperTexts\resources\app.asar'),
  [string]$Backup = (Join-Path $env:APPDATA 'BeeperTexts\app.asar.before-inline-popovers'),
  [switch]$Restore
)
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $Asar)) { throw "Beeper not found at $Asar (pass -Asar)." }
if (Get-Process Beeper -ErrorAction SilentlyContinue) {
  throw 'Beeper is running. Quit it first (tray icon > Quit), then run this again.'
}

if ($Restore) {
  if (-not (Test-Path $Backup)) { throw "No backup at $Backup." }
  Copy-Item $Backup $Asar -Force
  Write-Host 'Restored. Start Beeper again.'
  return
}

# The flag lives in Beeper's main process: on anything but Linux it returns true ("use popover
# windows"). Variable names change between builds, so match the shape and the ozone-platform
# check that follows it, not the names.
$bytes = [IO.File]::ReadAllBytes($Asar)
$latin1 = [Text.Encoding]::GetEncoding(28591)
$text = $latin1.GetString($bytes)
$re = [regex]'if\(!\w+\)return!([01]);const \w+=\w+\.commandLine\.getSwitchValue\("ozone-platform"\)'
$found = $re.Matches($text)
if ($found.Count -ne 1) {
  throw "Expected one match in app.asar, found $($found.Count). This Beeper version may have changed; nothing was modified."
}
$digit = $found[0].Groups[1]
if ($digit.Value -eq '1') { Write-Host 'Already patched. Start Beeper.'; return }

Copy-Item $Asar $Backup -Force
$bytes[$digit.Index] = [byte][char]'1'
[IO.File]::WriteAllBytes($Asar, $bytes)
Write-Host "Done. Backup: $Backup"
Write-Host 'Start Beeper. Popovers now open inside its window. To undo: run again with -Restore.'
