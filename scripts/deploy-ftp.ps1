[CmdletBinding()]
param(
  [switch]$SkipBuild,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $projectRoot '.env.deploy'
$distRoot = Join-Path $projectRoot 'dist'

if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) {
  throw '.env.deploy nebyl nalezen. Vytvořte jej podle .env.deploy.example.'
}

$deployConfig = @{}
foreach ($configLine in Get-Content -LiteralPath $configPath) {
  $trimmedLine = $configLine.Trim()
  if (-not $trimmedLine -or $trimmedLine.StartsWith('#')) {
    continue
  }

  $separatorIndex = $trimmedLine.IndexOf('=')
  if ($separatorIndex -lt 1) {
    throw "Neplatný řádek v .env.deploy: $trimmedLine"
  }

  $configKey = $trimmedLine.Substring(0, $separatorIndex).Trim()
  $configValue = $trimmedLine.Substring($separatorIndex + 1)
  $deployConfig[$configKey] = $configValue
}

foreach ($requiredKey in @('FTP_HOST', 'FTP_USER', 'FTP_REMOTE_DIR')) {
  if ([string]::IsNullOrWhiteSpace($deployConfig[$requiredKey])) {
    throw "$requiredKey chybí v .env.deploy."
  }
}

$ftpPassword = $deployConfig['FTP_PASS']
if (-not [string]::IsNullOrWhiteSpace($deployConfig['FTP_PASS_B64'])) {
  try {
    $passwordBytes = [Convert]::FromBase64String($deployConfig['FTP_PASS_B64'])
    $ftpPassword = [Text.Encoding]::UTF8.GetString($passwordBytes)
  }
  catch {
    throw 'FTP_PASS_B64 v .env.deploy není platný Base64 řetězec.'
  }
}

if ([string]::IsNullOrEmpty($ftpPassword)) {
  throw 'FTP_PASS nebo FTP_PASS_B64 chybí v .env.deploy.'
}

$ftpHost = $deployConfig['FTP_HOST']
$ftpUser = $deployConfig['FTP_USER']
$remoteRoot = $deployConfig['FTP_REMOTE_DIR'].TrimEnd('/')

if ($remoteRoot -eq '/www') {
  if ($deployConfig['FTP_ALLOW_PRODUCTION_ROOT'] -ne 'yes') {
    throw 'Produkční kořen /www vyžaduje FTP_ALLOW_PRODUCTION_ROOT=yes.'
  }
}
elseif (-not ($remoteRoot.StartsWith('/www/') -or $remoteRoot.StartsWith('/subdoms/'))) {
  throw "FTP_REMOTE_DIR '$remoteRoot' musí být /www nebo pod /www/ či /subdoms/."
}

Push-Location $projectRoot
try {
  if (-not $SkipBuild) {
    Write-Host 'Building production bundle...'
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
      throw "Produkční build selhal s kódem $LASTEXITCODE."
    }
  }

  if (-not (Test-Path -LiteralPath $distRoot -PathType Container)) {
    throw 'Adresář dist nebyl nalezen.'
  }
  if (-not (Test-Path -LiteralPath (Join-Path $distRoot '.htaccess') -PathType Leaf)) {
    throw 'dist/.htaccess nebyl nalezen; SPA routing by nefungoval.'
  }

  $deployFiles = @(Get-ChildItem -LiteralPath $distRoot -File -Recurse | Sort-Object FullName)
  Write-Host "Target: ftp://$ftpHost$remoteRoot/"
  Write-Host "Source: $distRoot"
  Write-Host "Dry run: $DryRun"
  Write-Host 'Delete operations: disabled'
  Write-Host ''

  $uploadedCount = 0
  foreach ($deployFile in $deployFiles) {
    $relativePath = $deployFile.FullName.Substring($distRoot.Length).TrimStart('\', '/').Replace('\', '/')
    $remotePath = "$remoteRoot/$relativePath"
    Write-Host -NoNewline ("[{0,3}] {1}" -f ($uploadedCount + 1), $remotePath)

    if ($DryRun) {
      Write-Host ' (dry run)'
      $uploadedCount += 1
      continue
    }

    $encodedRemotePath = ($remotePath.Split('/') | ForEach-Object { [Uri]::EscapeDataString($_) }) -join '/'
    $curlArguments = @(
      '--silent',
      '--show-error',
      '--ftp-create-dirs',
      '--ssl-reqd',
      '--ftp-pasv',
      '--connect-timeout', '30',
      '--user', "${ftpUser}:$ftpPassword",
      '--upload-file', $deployFile.FullName,
      "ftp://$ftpHost$encodedRemotePath"
    )

    & curl.exe @curlArguments
    if ($LASTEXITCODE -ne 0) {
      throw "Upload selhal pro $relativePath (curl kód $LASTEXITCODE)."
    }

    Write-Host ' OK'
    $uploadedCount += 1
  }

  if ($DryRun) {
    Write-Host "Dry run dokončen: $uploadedCount souborů, žádná změna na serveru."
  }
  else {
    Write-Host "Nasazení dokončeno: $uploadedCount souborů do $remoteRoot."
  }
}
finally {
  $ftpPassword = $null
  Pop-Location
}
