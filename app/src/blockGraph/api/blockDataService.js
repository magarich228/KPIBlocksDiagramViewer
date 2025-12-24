import * as yaml from 'js-yaml';
import mockData from '../../mockData.json'
import { spiderApi } from './spiderApi';

export class BlockDataService {
  static directoryHandle = null;

  // Основной метод получения всех данных проекта
  static async getProjectData() {
    console.log('Starting project data loading...');

    // Тест RN API
    /*const response = await spiderApi.spider('C:\\Users\\k.groshev\\source\\repos\\rgb3\\', 'feature/documentation/IMP-3064-blocks-markup-new-format');
    
    const data = {
      scopes: response.scopes,
      blocks: response.blocks,
      catalog: null
    };

    console.log("Loaded api data:");
    console.log(data);

    return data;*/

    if (!this.isFileSystemAPISupported()) {
      console.log('File System API not supported, using mock data');
      return this.getMockProjectData();
    }

    const accessGranted = await this.requestDirectoryAccess();
    if (!accessGranted) {
      throw new Error('Доступ к файловой системе не предоставлен');
    }

    try {
      console.log('Loading scopes, blocks and catalog...');

      const blocks = await this.loadBlockDefinitions();
      const scopes = await this.loadScopesCatalog(blocks);
      const catalog = await this.loadBlockCatalog();

      console.log('Project data loaded:', {
        scopesCount: scopes.length,
        blocksCount: blocks.length,
        catalog: catalog ? 'present' : 'missing'
      });

      // Отсюда беру актуальный mockData
      console.log(JSON.stringify({ scopes, blocks, catalog }));

      return { scopes, blocks, catalog };
    } catch (error) {
      console.error('Error loading project data:', error);
      throw new Error('Ошибка при чтении файлов: ' + error.message);
    }
  }

  // Загрузка каталога областей
  static async loadScopesCatalog(blocks) {
    try {
      console.log('Looking for .scopes-catalog.yml...');
      const scopesFile = await this.findScopesCatalogFile(this.directoryHandle);
      if (scopesFile) {
        console.log('Found scopes catalog:', scopesFile.path);
        
        const scopes = await this.parseScopesCatalog(scopesFile.handle, scopesFile.path, blocks);
        return scopes;
      }
      console.log('No scopes catalog found');
      return [];
    } catch (error) {
      console.warn('Error loading scopes catalog:', error);
      return [];
    }
  }

  // Загрузка определений блоков
  static async loadBlockDefinitions() {
    try {
      console.log('Looking for .block-definition.yml files...');
      const definitionFiles = await this.findBlockDefinitionFiles(this.directoryHandle);
      console.log(`Found ${definitionFiles.length} block definition files`);
      
      const blocks = [];
      let parsedCount = 0;
      let ignoredCount = 0;
      
      for (const fileInfo of definitionFiles) {
        const block = await this.parseBlockDefinition(fileInfo.handle, fileInfo.path);
        if (block) {
          if (!block.ignore) {
            blocks.push(block);
            parsedCount++;
          } else {
            ignoredCount++;
          }
        }
      }
      
      console.log(`Blocks: ${parsedCount} parsed, ${ignoredCount} ignored`);
      return blocks;
    } catch (error) {
      console.warn('Error loading block definitions:', error);
      return [];
    }
  }

  // Загрузка глоссария блоков
  static async loadBlockCatalog() {
    try {
      console.log('Looking for .block-catalog.yml...');
      const catalogFile = await this.findBlockCatalogFile(this.directoryHandle);
      if (catalogFile) {
        console.log('Found block catalog:', catalogFile.path);
        const catalog = await this.parseBlockCatalog(catalogFile.handle, catalogFile.path);
        return catalog;
      }
      console.log('No block catalog found');
      return null;
    } catch (error) {
      console.warn('Error loading block catalog:', error);
      return null;
    }
  }

  // Поиск .scopes-catalog.yml файла
  static async findScopesCatalogFile(dirHandle, path = '') {
    try {
      for await (const entry of dirHandle.values()) {
        const entryPath = path ? `${path}/${entry.name}` : entry.name;
        
        if (entry.kind === 'file' && entry.name === '.scopes-catalog.yml') {
          return {
            handle: entry,
            path: entryPath
          };
        }
      }
    } catch (error) {
      console.warn(`Cannot read directory: ${path}`, error.message);
    }
    return null;
  }

  // Парсинг .scopes-catalog.yml файла
  static async parseScopesCatalog(fileHandle, filePath, blocks) {
    try {
      const file = await fileHandle.getFile();
      const content = await file.text();
      const data = yaml.load(content);
      
      console.log('Parsing scopes catalog structure...');
      
      const parseScopes = (scopesData, currentPath = '') => {
        const scopes = [];
        
        for (const [key, value] of Object.entries(scopesData)) {
          // Удаление начального слэша если есть
          const cleanKey = key.replace(/^\//, '');
          const scopePath = currentPath ? `${currentPath}/${cleanKey}` : `/${cleanKey}`;
          
          const scope = {
            path: scopePath,
            name: cleanKey,
            description: value.description || '',
            children: []
          };

          const scopeBlockDefinition = blocks.find(b => b.blockName === null & b.scope === scopePath);

          if (scopeBlockDefinition)
          {
            scope.filesCount = scopeBlockDefinition.filesCount;
            scope.codeLines = scopeBlockDefinition.codeLines;
          }

          console.log(scope);
          
          // Рекурсивно парсим дочерние области
          if (value && typeof value === 'object') {
            // Поиск дочерниъ элементов (исключаем стандартные поля)
            const childKeys = Object.keys(value).filter(k => 
              !['description', 'ignore', 'blockName', 'blockPart', 'aspects', 'parents', 'scope', 'extend', 'based'].includes(k)
            );
            
            if (childKeys.length > 0) {
              const childrenData = {};
              childKeys.forEach(childKey => {
                childrenData[childKey] = value[childKey];
              });
              scope.children = parseScopes(childrenData, scopePath);
            }
          }
          
          scopes.push(scope);
        }
        
        return scopes;
      };
      
      const result = parseScopes(data);
      console.log('Scopes parsed successfully:', result);
      return result;
    } catch (error) {
      console.warn(`Error parsing scopes catalog ${filePath}:`, error.message);
      return [];
    }
  }

  static async requestDirectoryAccess() {
    try {
      if ('showDirectoryPicker' in window) {
        this.directoryHandle = await window.showDirectoryPicker();
        console.log('Directory access granted');

        return true;
      }
      console.log('File System API not available');
      return false;
    } catch (error) {
      console.warn('Error selecting directory:', error);
      return false;
    }
  }

  static async findBlockCatalogFile(dirHandle, path = '') {
    try {
      for await (const entry of dirHandle.values()) {
        const entryPath = path ? `${path}/${entry.name}` : entry.name;
        
        if (entry.kind === 'file' && entry.name === '.block-catalog.yml') {
          return {
            handle: entry,
            path: entryPath
          };
        }
      }
    } catch (error) {
      console.warn(`Cannot read directory: ${path}`, error.message);
    }
    return null;
  }

  static async parseBlockCatalog(fileHandle, filePath) {
    try {
      const file = await fileHandle.getFile();
      const content = await file.text();
      return yaml.load(content);
    } catch (error) {
      console.warn(`Error parsing catalog file ${filePath}:`, error.message);
      return null;
    }
  }

  static async findBlockDefinitionFiles(dirHandle, path = '') {
    const files = [];
    
    try {
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && entry.name === '.block-definition.yml') {
          const entryPath = path ? `${path}/${entry.name}` : entry.name;
          files.push({
            handle: entry,
            path: entryPath
          });
        } else if (entry.kind === 'directory') {
          // Пропуск директорий
          if (['node_modules', '.git', '.vscode', 'dist', 'Build', 'Bin', 'bin', 'obj'].includes(entry.name)) {
            continue;
          }
          
          const subPath = path ? `${path}/${entry.name}` : entry.name;
          const subFiles = await this.findBlockDefinitionFiles(entry, subPath);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      console.warn(`Cannot read directory: ${path}`, error.message);
    }
    
    return files;
  }

  static async parseBlockDefinition(fileHandle, filePath) {
    try {
      const file = await fileHandle.getFile();
      const content = await file.text();
      const data = yaml.load(content);
      
      const fullPath = filePath.replace(/\//g, '\\');
      const directory = filePath.split('/').slice(0, -1).join('/');

      const blockPart = typeof data.blockPart === 'string' && data.blockPart.trim() !== ''
        ? data.blockPart.split('/').filter(part => part.trim() !== '')
        : [];

      const block = {
        filePath: fullPath,
        directory: directory,
        scope: data.scope || '',
        blockName: data.blockName,
        blockPart: blockPart,
        description: data.description || '',
        aspects: data.aspects || '',
        ignore: data.ignore || false,
        extend: data.extend || '',
        based: data.based || '',
        filesCount: 0,
        codeLines: 0
      };

      const enrichedBlock = await this.addFileStatsToBlock(block);

      return enrichedBlock;
    } catch (error) {
      console.warn(`Error parsing file ${filePath}:`, error.message);
      return null;
    }
  }

  // Mock-данные для тестирования
  static getMockProjectData() {
    console.log('Using mock project data');

    const loadedMockData = mockData;
    
    return loadedMockData;
  }

  static isFileSystemAPISupported() {
    const supported = 'showDirectoryPicker' in window;
    console.log(`File System API supported: ${supported}`);

    return supported;
  }

  // Добавление статистики файлов к блоку
  static async addFileStatsToBlock(block) {
    try {
      let directoryToCount = block.directory;
      const stats = await this.countFilesAndLines(directoryToCount);
      
      return {
        ...block,
        filesCount: stats.totalFiles,
        codeLines: stats.totalLines
      };
    } catch (error) {
      console.warn(`Error counting files for ${block.directory}:`, error.message);
      return {
        ...block,
        filesCount: 0,
        codeLines: 0
      };
    }
  }

  // Простой подсчет файлов и строк в директории
  static async countFilesAndLines(dirPath) {
    try {
      console.log(`Counting files in: ${dirPath}`);
      
      // Получение handle для поддиректории dirPath
      const pathParts = dirPath.split('/').filter(part => part.trim() !== '');
      let currentHandle = this.directoryHandle;
      
      //getDirectoryHandle принимает только имя вложенной директории - поэтому цикл
      for (const part of pathParts) {
        currentHandle = await currentHandle.getDirectoryHandle(part);
      }

      return await this._countFilesRecursive(currentHandle, dirPath);
    } catch (error) {
      console.warn(`Cannot access directory ${dirPath}:`, error.message);
      return { totalFiles: 0, totalLines: 0 };
    }
  }

  // Рекурсивный подсчет файлов
  static async _countFilesRecursive(dirHandle, currentPath) {
    let totalFiles = 0;
    let totalLines = 0;

    try {
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          
          if (this.isValidFileExtension(entry.name)) {
            totalFiles++;
            
            try {
              const file = await entry.getFile();
              const content = await file.text();
              const lines = content.split('\n').length;
              totalLines += lines;
            } catch (error) {
              console.warn(`Cannot read file ${entry.name}:`, error.message);
            }
          }
        } else if (entry.kind === 'directory') {
          
          if (this.isSystemDirectory(entry.name)) {
            continue;
          }
          
          // Рекуксия подсчета для вложенных директорий
          const subStats = await this._countFilesRecursive(entry, `${currentPath}/${entry.name}`);
          totalFiles += subStats.totalFiles;
          totalLines += subStats.totalLines;
        }
      }
    } catch (error) {
      console.warn(`Error reading directory ${currentPath}:`, error.message);
    }

    return { totalFiles, totalLines };
  }

  // Проверка допустимых расширений файлов
  static isValidFileExtension(filename) {
    const lowerName = filename.toLowerCase();

    const validExtensions = [
      '.cs', '.xml', '.sql', '.Config', '.json',
      '.txt', '.query', '.DomainSettings', '.csproj',
      '.ps1', '.lst', '.xaml', '.presentations', '.yml',
      '.resx', '.condition', '.bat', '.cmd', '.ts', '.SandboxSettings',
      '.tt', '.js', '.autotests', '.mpx', '.css', '.mrt', '.tsx',
      '.java', '.h', '.html', '.sh', '.sln', '.jobxml', '.psm1'
    ];

    const excludedExtensions = [
      '.dll', '.pdb', '.cache', '.ico', '.png',
      '.baml', '.resources', '.exe', '.Up2Date', '.so',
      '.svg'
    ];
    
    for (const ext of excludedExtensions) {
      if (lowerName.endsWith(ext)) {
        return false;
      }
    }
    
    for (const ext of validExtensions) {
      if (lowerName.endsWith(ext)) {
        return true;
      }
    }
    
    return false;
  }

  // Проверка системных директорий
  static isSystemDirectory(dirName) {
    const systemDirs = [
      'build', 'Build', 'bin', 'Bin', 'obj', 'Obj',
      'node_modules', 'dist', '.git', '.vscode', '.vs',
      '__pycache__', '.idea', '.cache',
      'tmp', 'temp', 'logs'
    ];
    
    return systemDirs.includes(dirName);
  }
}