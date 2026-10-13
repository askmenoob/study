# Read-only Windows capability report. No elevation, writes, accounts or policy changes.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$report = [ordered]@{
  KitVersion = '1.0'
  Edition = 'Unknown'
  Build = 'Unknown'
  AssignedAccessSupported = $false
  EdgeVersion = $null
  EdgePath = $null
  UACEnabled = $null
  SessionType = 'Unknown'
  ConsoleValidationRequired = $true
  DeviceConfigurationChanged = $false
  Notes = @()
}
try {
  $os = Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
  $report.Edition = [string]$os.EditionID
  $report.Build = [string]$os.CurrentBuildNumber + '.' + [string]$os.UBR
  $report.AssignedAccessSupported = $report.Edition -match '^(Professional|Enterprise|Education|IoTEnterprise)'
} catch { $report.Notes += 'Windows edition could not be read.' }
try {
  $policy = Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' -Name EnableLUA
  $report.UACEnabled = ([int]$policy.EnableLUA -eq 1)
} catch { $report.Notes += 'UAC state could not be read.' }
foreach ($base in @([Environment]::GetFolderPath([Environment+SpecialFolder]::ProgramFilesX86), [Environment]::GetFolderPath([Environment+SpecialFolder]::ProgramFiles), $env:ProgramFiles)) {
  if (-not $base) { continue }
  $candidate = Join-Path $base 'Microsoft\Edge\Application\msedge.exe'
  if (Test-Path -LiteralPath $candidate -PathType Leaf) {
    $report.EdgePath = $candidate
    $report.EdgeVersion = (Get-Item -LiteralPath $candidate).VersionInfo.ProductVersion
    break
  }
}
if ($env:SESSIONNAME -eq 'Console') { $report.SessionType = 'Console' }
elseif ($env:SESSIONNAME -like 'RDP-*') { $report.SessionType = 'RemoteDesktop' }
elseif ($env:SESSIONNAME) { $report.SessionType = 'NonConsoleOrService' }
$report.Notes += 'This report cannot prove kiosk enforcement. Validate at the physical Windows console.'
$report | ConvertTo-Json -Depth 3
