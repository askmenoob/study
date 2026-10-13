# Safe tests: generated files stay in a unique temp folder; local account reads are mocked.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$folder = Join-Path ([System.IO.Path]::GetTempPath()) ('imai-kiosk-tests-' + [guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $folder
$script:passed = 0
function Assert-Check([bool]$Condition, [string]$Label) {
  if (-not $Condition) { throw ('FAIL ' + $Label) }
  $script:passed += 1
  Write-Output ('PASS ' + $Label)
}
function Assert-Rejected([scriptblock]$Action, [string]$Label) {
  $rejected = $false
  try { & $Action | Out-Null } catch { $rejected = $true }
  Assert-Check $rejected $Label
}
try {
  foreach ($name in @('windows-preflight.ps1', 'New-StudyKioskConfig.ps1')) {
    $tokens = $null; $errors = $null
    $null = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot $name), [ref]$tokens, [ref]$errors)
    Assert-Check ($errors.Count -eq 0) ('PowerShell parses ' + $name)
  }
  $real = (& (Join-Path $PSScriptRoot 'windows-preflight.ps1')) | ConvertFrom-Json
  Assert-Check ($real.DeviceConfigurationChanged -eq $false) 'preflight reports no device changes'
  Assert-Check ($real.PSObject.Properties.Name -notcontains 'UserName') 'preflight omits user identity'
  Write-Output ('CAPABILITY ' + ($real | ConvertTo-Json -Compress -Depth 3))
  # Fixture command shadows are local to this PowerShell process, not Windows accounts.
  $global:imaiKitisAdmin = $false; $global:imaiKitexists = $true; $global:imaiKitenabled = $true
  $global:imaiKitedition = 'Professional'; $global:imaiKituac = 1
  $global:imaiKitSource = 'Local'; $global:imaiKitMembershipReadable = $true
  function Get-LocalUser {
    [CmdletBinding()] param([string]$Name)
    if (-not $global:imaiKitexists) { throw 'Fixture account not found' }
    [pscustomobject]@{ Name = $Name; SID = 'S-1-5-21-111-222-333-1001'; Enabled = $global:imaiKitenabled; PrincipalSource = $global:imaiKitSource }
  }
  function Get-LocalGroupMember {
    [CmdletBinding()] param([string]$SID)
    if (-not $global:imaiKitMembershipReadable) { throw 'Fixture membership unavailable' }
    if ($global:imaiKitisAdmin) { [pscustomobject]@{ SID = 'S-1-5-21-111-222-333-1001' } }
  }
  function Get-ItemProperty {
    [CmdletBinding()] param([string]$LiteralPath, [string]$Name)
    if ($Name -eq 'EnableLUA') { [pscustomobject]@{ EnableLUA = $global:imaiKituac } }
    else { [pscustomobject]@{ EditionID = $global:imaiKitedition; CurrentBuildNumber = '26200'; UBR = '1' } }
  }
  $generator = Join-Path $PSScriptRoot 'New-StudyKioskConfig.ps1'
  $output = Join-Path $folder 'fixture.xml'
  & $generator -KioskAccount 'QA & Child' -OutputPath $output | Out-Null
  [xml]$xml = Get-Content -LiteralPath $output -Raw
  Assert-Check ($xml.AssignedAccessConfiguration.Configs.Config.Account -eq '.\QA & Child') 'XML escaping preserves exact explicit account'
  $raw = Get-Content -LiteralPath $output -Raw
  Assert-Check ($raw.Contains('&amp;')) 'XML metacharacter is escaped'
  $app = $xml.AssignedAccessConfiguration.Profiles.Profile.KioskModeApp
  $arguments = $app.GetAttribute('ClassicAppArguments', 'http://schemas.microsoft.com/AssignedAccess/2021/config')
  Assert-Check ($arguments -eq '--kiosk https://study.imai.my/ --edge-kiosk-type=fullscreen --no-first-run') 'fixed clean start URL and kiosk arguments'
  Assert-Check (-not ($raw -match 'AutoLogonAccount|GlobalProfile|BreakoutSequence|token=|code=')) 'no autologon global scope breakout override or secrets'
  Assert-Check ($xml.AssignedAccessConfiguration.Profiles.Profile.Id -eq $xml.AssignedAccessConfiguration.Configs.Config.DefaultProfile.Id) 'profile reference is consistent'
  Assert-Rejected { & $generator -KioskAccount 'QA Child' -OutputPath $output } 'existing output is not overwritten'
  $dry = Join-Path $folder 'whatif.xml'
  & $generator -KioskAccount 'QA Child' -OutputPath $dry -WhatIf | Out-Null
  Assert-Check (-not (Test-Path -LiteralPath $dry)) 'WhatIf writes no file'
  foreach ($name in @('bad<xml>', '..\escape', 'child"quote', 'child*', 'child ', 'child.')) {
    Assert-Rejected { & $generator -KioskAccount $name -OutputPath $dry } 'hostile or ambiguous account input rejected'
  }
  $global:imaiKitSource = 'MicrosoftAccount'
  Assert-Rejected { & $generator -KioskAccount 'QA Child' -OutputPath $dry } 'non-local account rejected'
  $global:imaiKitSource = 'Local'; $global:imaiKitMembershipReadable = $false
  Assert-Rejected { & $generator -KioskAccount 'QA Child' -OutputPath $dry } 'unreadable administrator membership fails closed'
  $global:imaiKitMembershipReadable = $true
  $global:imaiKitisAdmin = $true
  Assert-Rejected { & $generator -KioskAccount 'QA Child' -OutputPath $dry } 'administrator account rejected'
  $global:imaiKitisAdmin = $false; $global:imaiKitexists = $false
  Assert-Rejected { & $generator -KioskAccount 'QA Child' -OutputPath $dry } 'missing local account rejected'
  $global:imaiKitexists = $true; $global:imaiKitenabled = $false
  Assert-Rejected { & $generator -KioskAccount 'QA Child' -OutputPath $dry } 'disabled local account rejected'
  $global:imaiKitenabled = $true; $global:imaiKitedition = 'Core'
  Assert-Rejected { & $generator -KioskAccount 'QA Child' -OutputPath $dry } 'Windows Home rejected'
  $global:imaiKitedition = 'Professional'; $global:imaiKituac = 0
  Assert-Rejected { & $generator -KioskAccount 'QA Child' -OutputPath $dry } 'disabled UAC rejected'
  $global:imaiKituac = 1
  Assert-Rejected { & $generator -KioskAccount 'QA Child' -OutputPath (Join-Path $folder 'unsafe.ps1') } 'non-XML output rejected'
  Write-Output ('TOTAL ' + $script:passed + ' ASSERTIONS PASSED')
} finally {
  Remove-Item -LiteralPath $folder -Recurse -Force
}
