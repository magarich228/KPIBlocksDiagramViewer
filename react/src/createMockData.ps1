param(
    [Parameter(Mandatory=$false)]
    [string]$Directory = "."
)

# Проверяем наличие модуля для работы с YAML
if (-not (Get-Module -ListAvailable -Name powershell-yaml)) {
    Write-Host "Установка модуля PowerShell-YAML..." -ForegroundColor Yellow
    Install-Module -Name powershell-yaml -Scope CurrentUser -Force -SkipPublisherCheck
}

Import-Module powershell-yaml

# Получаем абсолютный путь к директории
$targetPath = Resolve-Path $Directory
$scriptPath = Get-Location

# Функция для преобразования scope из YAML в древовидную структуру
function ConvertTo-ScopeTree {
    param(
        [hashtable]$yamlData,
        [string]$parentPath = ""
    )
    
    $result = @()
    
    foreach ($key in $yamlData.Keys) {
        if ($key.StartsWith("/")) {
            $scopePath = if ($parentPath) { "$parentPath$key" } else { $key }
            $scopeName = $key.Trim('/')
            
            $scope = @{
                path = $scopePath
                name = $scopeName
                description = $yamlData[$key].description
                children = @()
            }
            
            # Рекурсивно обрабатываем дочерние элементы
            $childKeys = $yamlData[$key].Keys | Where-Object { $_ -ne "description" -and $_.StartsWith("/") }
            if ($childKeys.Count -gt 0) {
                foreach ($childKey in $childKeys) {
                    $childData = @{$childKey = $yamlData[$key][$childKey]}
                    $childScopes = ConvertTo-ScopeTree -yamlData $childData -parentPath $scopePath
                    $scope.children += $childScopes
                }
            }
            
            $result += $scope
        }
    }
    
    return $result
}

# Функция для обработки аспектов (перечисление строк через запятую)
function Process-Aspects {
    param([string]$aspects)
    
    if ([string]::IsNullOrWhiteSpace($aspects)) {
        return ""
    }
    
    # Возвращаем как есть, но убираем лишние пробелы вокруг запятых
    return ($aspects -split ',' | ForEach-Object { $_.Trim() }) -join ', '
}

# Функция для обработки extend/based (перечисление строк через запятую)
function Process-ExtendBased {
    param([string]$value)
    
    if ([string]::IsNullOrWhiteSpace($value)) {
        return ""
    }
    
    # Возвращаем как есть, но убираем лишние пробелы вокруг запятых
    return ($value -split ',' | ForEach-Object { $_.Trim() }) -join ', '
}

# Функция для обработки blockPart (разделение пути по / в массив строк)
function Process-BlockPart {
    param([string]$blockPart)
    
    if ([string]::IsNullOrWhiteSpace($blockPart)) {
        return @()
    }
    
    # Разделяем по / и убираем пустые элементы
    $parts = $blockPart.Split('/') | Where-Object { $_ -ne "" }
    
    # Гарантируем, что возвращаем именно массив, а не строку
    # Если только один элемент, все равно возвращаем массив
    return ,@($parts)
}

# Читаем .scopes-catalog.yml
$scopesCatalogPath = Join-Path $targetPath ".scopes-catalog.yml"
if (-not (Test-Path $scopesCatalogPath)) {
    Write-Error "Файл .scopes-catalog.yml не найден в директории: $targetPath"
    exit 1
}

$scopesYamlContent = Get-Content $scopesCatalogPath -Raw
$scopesYaml = ConvertFrom-Yaml $scopesYamlContent

# Преобразуем YAML scope в древовидную структуру
$scopesTree = ConvertTo-ScopeTree -yamlData $scopesYaml

# Ищем все файлы .block-definition.yml
$blockFiles = Get-ChildItem -Path $targetPath -Filter ".block-definition.yml" -Recurse -File

$blocks = @()

foreach ($file in $blockFiles) {
    try {
        $yamlContent = Get-Content $file.FullName -Raw
        $blockData = ConvertFrom-Yaml $yamlContent
        
        # Пропускаем блоки без scope
        if (-not $blockData.scope) {
            Write-Error "Блок без scope: $($file.FullName)"
            continue
        }
        
        # Пропускаем блоки без blockName (пустая строка или null)
        if ([string]::IsNullOrWhiteSpace($blockData.blockName)) {
            Write-Warning "Блок без blockName: $($file.FullName)"
            continue
        }
        
        # Получаем относительные пути от целевой директории
        $relativeFilePath = $file.FullName.Substring($targetPath.Path.Length + 1)
        $relativeDirPath = $file.DirectoryName.Substring($targetPath.Path.Length + 1)
        
        # Обрабатываем поля
        $blockPartArray = Process-BlockPart -blockPart $blockData.blockPart
        $aspectsString = Process-Aspects -aspects $blockData.aspects
        $extendString = Process-ExtendBased -value $blockData.extend
        $basedString = Process-ExtendBased -value $blockData.based
        
        # Проверяем и гарантируем, что blockPart - это массив
        # Явно создаем массив, даже если он пустой или содержит один элемент
        if ($null -eq $blockPartArray) {
            $blockPartArray = @()
        } elseif ($blockPartArray -isnot [array]) {
            $blockPartArray = @($blockPartArray)
        }
        
        # Создаем объект блока
        $block = @{
            filePath = $relativeFilePath.Replace('\', '\\')
            directory = if ($relativeDirPath) { $relativeDirPath.Replace('\', '\\') + "\\" } else { "" }
            scope = $blockData.scope
            blockName = $blockData.blockName
            blockPart = $blockPartArray  # Всегда массив
            description = $blockData.description
            aspects = $aspectsString
            ignore = [bool]$blockData.ignore
            extend = $extendString
            based = $basedString
        }
        
        $blocks += $block
        
    } catch {
        Write-Error "Ошибка при обработке файла $($file.FullName): $_"
    }
}

# Формируем итоговый объект
$result = @{
    scopes = $scopesTree -is [System.Array] ?
        $scopesTree :
        @( $scopesTree )
    blocks = $blocks
    catalog = $null
}

# Конвертируем в JSON с правильным форматированием
# Используем -AsArray для гарантии, что массивы сериализуются как массивы
$jsonResult = $result | ConvertTo-Json -Depth 20

# Сохраняем в файл в рабочей директории скрипта
$outputPath = Join-Path $scriptPath "mockData.json"
$jsonResult | Set-Content -Path $outputPath -Encoding UTF8

Write-Host "Файл mockData.json успешно создан по пути: $outputPath" -ForegroundColor Green
Write-Host "Обработано директорий из: $targetPath" -ForegroundColor Cyan
Write-Host "Найдено блоков: $($blocks.Count)" -ForegroundColor Green
Write-Host "Найдено scope: $($scopesTree.Count)" -ForegroundColor Green