$commandArgs = $args
if ($commandArgs.Count -gt 0 -and $commandArgs[0] -eq "--") {
  $commandArgs = if ($commandArgs.Count -gt 1) { $commandArgs[1..($commandArgs.Count - 1)] } else { @() }
}

if ($commandArgs.Count -eq 0) {
  throw "Usage: scripts/win-msvc-env.ps1 <command...>"
}

$vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\\Installer\\vswhere.exe"
if (-not (Test-Path $vswhere)) {
  throw "vswhere.exe not found. Install Visual Studio 2022 Build Tools (C++ workload)."
}

$vsPath =
  & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $vsPath) {
  throw "VS Build Tools not found or missing MSVC tools. Install the VS 2022 C++ x64/x86 build tools."
}

$vsDevCmd = Join-Path $vsPath "Common7\\Tools\\VsDevCmd.bat"
if (-not (Test-Path $vsDevCmd)) {
  throw "VsDevCmd.bat not found at: $vsDevCmd"
}

function Quote-CmdArg {
  param([string]$Value)

  if ($Value -match '[\\s\"]') {
    $escaped = $Value -replace '"', '\\"'
    return '"' + $escaped + '"'
  }

  return $Value
}

# Why: some Windows environments select LLVM tools (llvm-lib/lld) for native addon builds, which can break
# common MSVC flags (e.g. /LTCG:INCREMENTAL). We strip LLVM paths and run under VsDevCmd to force MSVC.
$cleanPathParts = @()
foreach ($p in ($env:PATH -split ";")) {
  if ([string]::IsNullOrWhiteSpace($p)) { continue }
  if ($p -match "(?i)\\\\Llvm\\\\" -or $p -match "(?i)\\\\LLVM\\\\") { continue }
  $cleanPathParts += $p
}
$cleanPath = $cleanPathParts -join ";"

$commandLine = ($commandArgs | ForEach-Object { Quote-CmdArg $_ }) -join " "

$cmd = @(
  "set ""PATH=$cleanPath""",
  "set ""GYP_MSVS_VERSION=2022""",
  "set ""GYP_MSVS_PLATFORM_TOOLSET=v143""",
  "call ""$vsDevCmd"" -arch=x64 -host_arch=x64",
  $commandLine
) -join " && "

cmd /c $cmd
exit $LASTEXITCODE
