# Safe Release Script for Arduino Helper
# Usage: ./scripts/release-safe.ps1 0.7.0

param (
    [Parameter(Mandatory=$true)]
    [string]$Version
)

$ErrorActionPreference = "Stop"

if (Test-Path ".env.local") {
    Write-Host "🔑 [0/6] .env.local 파일에서 환경 변수를 로드합니다." -ForegroundColor Cyan
    Get-Content ".env.local" -Encoding UTF8 | Where-Object { $_ -match "^(.*?)=(.*)$" } | ForEach-Object {
        $name = $matches[1]
        $value = $matches[2]
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

Write-Host "🚀 [1/6] 타입 체크 및 빌드 중... (tsc --noEmit && esbuild)" -ForegroundColor Cyan
npm run build:strict

Write-Host "🕵️ [2/6] 린트 체크 중..." -ForegroundColor Cyan
npm run lint

Write-Host "📦 [3/6] 패키징 중 (.vsix 생성)..." -ForegroundColor Cyan
npx @vscode/vsce package --no-dependencies

Write-Host "📝 [4/6] Git 커밋 및 태그 작성 중..." -ForegroundColor Cyan
git commit -am "release: v$Version"
git tag "v$Version"

Write-Host "☁️ [5/6] 멀티 플랫폼 푸시 중..." -ForegroundColor Cyan
git push origin main --tags

Write-Host "✨ [6/6] 사이트 및 마켓 배포 중..." -ForegroundColor Cyan
# GitHub Release
gh release create "v$Version" "./arduino-helper-$Version.vsix" --title "Arduino Helper v$Version" --generate-notes

# Open VSX
npx ovsx publish "./arduino-helper-$Version.vsix" -p $env:OVSX_PAT

Write-Host "✅ 배포가 성공적으로 완료되었습니다!" -ForegroundColor Green
