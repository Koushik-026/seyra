param([switch]$MySql)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
New-Item -ItemType Directory -Force -Path 'tools','lib' | Out-Null
$jdkAvailable = Get-ChildItem -LiteralPath 'tools' -Filter javac.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $jdkAvailable -and -not (Get-Command javac -ErrorAction SilentlyContinue)) {
    $release = Invoke-RestMethod -Uri 'https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse'
    Invoke-WebRequest -Uri $release[0].binary.package.link -OutFile 'tools\jdk.zip'
    if ((Get-FileHash -LiteralPath 'tools\jdk.zip' -Algorithm SHA256).Hash.ToLowerInvariant() -ne $release[0].binary.package.checksum) { throw 'JDK checksum mismatch' }
    Expand-Archive -LiteralPath 'tools\jdk.zip' -DestinationPath 'tools\jdk' -Force
}
$libraries = @(
    @('com/h2database/h2/2.4.240/h2-2.4.240.jar','h2-2.4.240.jar'),
    @('com/fasterxml/jackson/core/jackson-databind/2.18.3/jackson-databind-2.18.3.jar','jackson-databind-2.18.3.jar'),
    @('com/fasterxml/jackson/core/jackson-core/2.18.3/jackson-core-2.18.3.jar','jackson-core-2.18.3.jar'),
    @('com/fasterxml/jackson/core/jackson-annotations/2.18.3/jackson-annotations-2.18.3.jar','jackson-annotations-2.18.3.jar')
)
foreach ($library in $libraries) {
    $destination = Join-Path 'lib' $library[1]
    if (-not (Test-Path -LiteralPath $destination)) { Invoke-WebRequest -Uri ('https://repo.maven.apache.org/maven2/' + $library[0]) -OutFile $destination }
}
if ($MySql) {
    Invoke-WebRequest -Uri 'https://repo.maven.apache.org/maven2/com/mysql/mysql-connector-j/9.2.0/mysql-connector-j-9.2.0.jar' -OutFile 'lib\mysql-connector-j-9.2.0.jar'
}
Write-Output 'Dependencies ready. Run npm start.'
