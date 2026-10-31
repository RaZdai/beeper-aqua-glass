<#
.SYNOPSIS
  Optional: Apple Color Emoji in Beeper Desktop on Windows, for the Beeper Aqua Glass theme.

.DESCRIPTION
  1. Builds a Beeper-ready copy of AppleColorEmoji-Linux.ttf (which you download yourself from
     https://github.com/samuelngs/apple-emoji-ttf/releases) into %APPDATA%\BeeperTexts.
  2. Adds the emoji block to %APPDATA%\BeeperTexts\custom.css with that file's path (replacing an
     earlier block if present). Nothing outside the BeeperTexts folder is changed; Windows' own
     emoji font is not touched.
  Then reload the theme in Beeper: Settings > Appearance > Reload CSS.

.PARAMETER FontPath
  The downloaded AppleColorEmoji-Linux.ttf. Defaults to your Downloads folder.

.PARAMETER Uninstall
  Removes the emoji block from custom.css and deletes the built font.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\install-apple-emoji.ps1
#>
param(
  [string]$FontPath = (Join-Path $HOME 'Downloads\AppleColorEmoji-Linux.ttf'),
  [string]$BeeperDir = (Join-Path $env:APPDATA 'BeeperTexts'),
  [switch]$Uninstall
)
$ErrorActionPreference = 'Stop'
$cssPath  = Join-Path $BeeperDir 'custom.css'
$fontOut  = Join-Path $BeeperDir 'AppleColorEmoji.ttf'
$blockRe  = '(?s)\r?\n?/\* BEGIN aqua-glass-emoji \*/.*?/\* END aqua-glass-emoji \*/\r?\n?'

if ($Uninstall) {
  if (Test-Path $cssPath) {
    $css = [IO.File]::ReadAllText($cssPath)
    [IO.File]::WriteAllText($cssPath, ([regex]::Replace($css, $blockRe, "`n")).TrimEnd() + "`n", (New-Object Text.UTF8Encoding($false)))
  }
  if (Test-Path $fontOut) { Remove-Item $fontOut -Confirm:$false }
  Write-Host 'Removed. Reload CSS in Beeper (Settings > Appearance > Reload CSS).'
  return
}

if (-not (Test-Path $FontPath)) {
  throw "Font not found: $FontPath`nDownload AppleColorEmoji-Linux.ttf from https://github.com/samuelngs/apple-emoji-ttf/releases (the Linux build, not the Windows one), or pass -FontPath."
}
if (-not (Test-Path $cssPath)) {
  throw "No theme found at $cssPath. Install custom.css from Beeper Aqua Glass first."
}
$python = (Get-Command python -ErrorAction SilentlyContinue)
if (-not $python) { throw 'Python 3 is required (https://www.python.org/downloads/).' }

Write-Host 'Installing build dependencies (fonttools, uharfbuzz)...'
& python -m pip install --quiet --disable-pip-version-check fonttools uharfbuzz
if ($LASTEXITCODE -ne 0) { throw 'pip install failed.' }

Write-Host 'Building the Beeper-ready font (this takes a minute)...'
$tmp = Join-Path $env:TEMP 'aqua-glass-AppleColorEmoji.ttf'
& python -I (Join-Path $PSScriptRoot 'build_emoji_font.py') $FontPath $tmp
if ($LASTEXITCODE -ne 0) { throw 'Font build or verification failed; nothing was installed.' }
Move-Item $tmp $fontOut -Force

$fontUrl = 'file:///' + ($fontOut -replace '\\', '/')
$block = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'emoji-block.css')).Replace('__FONT_URL__', $fontUrl)
$css = [IO.File]::ReadAllText($cssPath)
$css = ([regex]::Replace($css, $blockRe, "`n")).TrimEnd() + "`n`n" + $block
[IO.File]::WriteAllText($cssPath, $css, (New-Object Text.UTF8Encoding($false)))

Write-Host "Done. Font: $fontOut"
Write-Host 'Reload the theme in Beeper: Settings > Appearance > Reload CSS (or restart Beeper).'
