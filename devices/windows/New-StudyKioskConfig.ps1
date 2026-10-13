# Generates a reviewable XML file only. Never applies Windows configuration.
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern("^[\p{L}\p{N}][\p{L}\p{N} ._&'-]{0,19}$")]
  [string]$KioskAccount,
  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)
$ErrorActionPreference = 'Stop'
if ($KioskAccount -ne $KioskAccount.Trim() -or $KioskAccount.EndsWith('.')) {
  throw 'Use an exact local account name without a trailing space or dot.'
}
$capability = (& (Join-Path $PSScriptRoot 'windows-preflight.ps1')) | ConvertFrom-Json
if (-not $capability.AssignedAccessSupported) { throw 'Assigned Access requires Windows Pro, Enterprise, Education or IoT Enterprise.' }
if ($capability.UACEnabled -ne $true) { throw 'UAC must be enabled before preparing Assigned Access.' }
if (-not $capability.EdgePath) { throw 'A machine-wide Microsoft Edge installation was not found.' }
if (-not (Get-Command Get-LocalUser -ErrorAction SilentlyContinue)) { throw 'Run with 64-bit Windows PowerShell where LocalAccounts is available.' }
# The account must already exist; this kit never creates or edits accounts.
$users = @(Get-LocalUser -Name $KioskAccount -ErrorAction Stop | Where-Object { $_.Name -ceq $KioskAccount })
if ($users.Count -ne 1 -or -not $users[0].Enabled) { throw 'An enabled, exact matching local account is required.' }
$account = $users[0]
if ([string]$account.PrincipalSource -ne 'Local') { throw 'Only an explicitly local account is supported; Microsoft or domain accounts are not accepted.' }
$administrators = @(Get-LocalGroupMember -SID 'S-1-5-32-544' -ErrorAction Stop)
if (@($administrators | Where-Object { [string]$_.SID -eq [string]$account.SID }).Count -gt 0) {
  throw 'The kiosk account must be a standard local user, never an administrator.'
}
# Fail closed if account membership cannot be read. No credentials are requested.
$fullPath = [System.IO.Path]::GetFullPath($OutputPath)
if ([System.IO.Path]::GetExtension($fullPath) -ne '.xml') { throw 'OutputPath must name an XML file.' }
if (-not (Test-Path -LiteralPath ([System.IO.Path]::GetDirectoryName($fullPath)) -PathType Container)) { throw 'The output directory must already exist.' }
if (Test-Path -LiteralPath $fullPath) { throw 'Refusing to overwrite an existing file.' }
$ns = 'http://schemas.microsoft.com/AssignedAccess/2017/config'
$v4 = 'http://schemas.microsoft.com/AssignedAccess/2021/config'
$profileId = '{' + [guid]::NewGuid().ToString() + '}'
$document = New-Object System.Xml.XmlDocument
$null = $document.AppendChild($document.CreateXmlDeclaration('1.0', 'utf-8', $null))
$root = $document.CreateElement('AssignedAccessConfiguration', $ns)
$root.SetAttribute('xmlns:v4', $v4)
$null = $document.AppendChild($root)
$profiles = $document.CreateElement('Profiles', $ns)
$null = $root.AppendChild($profiles)
$profile = $document.CreateElement('Profile', $ns)
$profile.SetAttribute('Id', $profileId)
$null = $profiles.AppendChild($profile)
$app = $document.CreateElement('KioskModeApp', $ns)
$pathAttribute = $document.CreateAttribute('v4', 'ClassicAppPath', $v4)
$pathAttribute.Value = $capability.EdgePath
$null = $app.Attributes.Append($pathAttribute)
$argsAttribute = $document.CreateAttribute('v4', 'ClassicAppArguments', $v4)
$argsAttribute.Value = '--kiosk https://study.imai.my/ --edge-kiosk-type=fullscreen --no-first-run'
$null = $app.Attributes.Append($argsAttribute)
$null = $profile.AppendChild($app)
$configs = $document.CreateElement('Configs', $ns)
$null = $root.AppendChild($configs)
$config = $document.CreateElement('Config', $ns)
$null = $configs.AppendChild($config)
$accountElement = $document.CreateElement('Account', $ns)
$accountElement.InnerText = '.\' + $KioskAccount
$null = $config.AppendChild($accountElement)
$defaultProfile = $document.CreateElement('DefaultProfile', $ns)
$defaultProfile.SetAttribute('Id', $profileId)
$null = $config.AppendChild($defaultProfile)
# No AutoLogonAccount, global profile, custom breakout, tokens or share links.
if ($PSCmdlet.ShouldProcess($fullPath, 'Write preparation XML only; no Windows settings will be applied')) {
  $settings = New-Object System.Xml.XmlWriterSettings
  $settings.Indent = $true
  $settings.Encoding = New-Object System.Text.UTF8Encoding($false)
  $stream = [System.IO.File]::Open($fullPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write)
  try {
    $writer = [System.Xml.XmlWriter]::Create($stream, $settings)
    try { $document.Save($writer) } finally { $writer.Dispose() }
  } finally { $stream.Dispose() }
  Write-Output 'Preparation XML written. Windows configuration was not changed.'
}
