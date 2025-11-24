import * as yaml from 'js-yaml';

export class BlockDataService {
  static directoryHandle = null;

  // Основной метод получения всех данных проекта
  static async getProjectData() {
    console.log('Starting project data loading...');
    
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
      const [scopes, blocks, catalog] = await Promise.all([
        this.loadScopesCatalog(),
        this.loadBlockDefinitions(),
        this.loadBlockCatalog()
      ]);

      console.log('Project data loaded:', {
        scopesCount: scopes.length,
        blocksCount: blocks.length,
        catalog: catalog ? 'present' : 'missing'
      });

      return { scopes, blocks, catalog };
    } catch (error) {
      console.error('Error loading project data:', error);
      throw new Error('Ошибка при чтении файлов: ' + error.message);
    }
  }

  // Загрузка каталога областей
  static async loadScopesCatalog() {
    try {
      console.log('Looking for .scopes-catalog.yml...');
      const scopesFile = await this.findScopesCatalogFile(this.directoryHandle);
      if (scopesFile) {
        console.log('Found scopes catalog:', scopesFile.path);
        const scopes = await this.parseScopesCatalog(scopesFile.handle, scopesFile.path);
        console.log('Parsed scopes:', scopes.length);
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
        
        if (entry.kind === 'directory') {
          const catalog = await this.findScopesCatalogFile(entry, entryPath);
          if (catalog) return catalog;
        } else if (entry.kind === 'file' && entry.name === '.scopes-catalog.yml') {
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
  static async parseScopesCatalog(fileHandle, filePath) {
    try {
      const file = await fileHandle.getFile();
      const content = await file.text();
      const data = yaml.load(content);
      
      console.log('Parsing scopes catalog structure...');
      
      const parseScopes = (scopesData, currentPath = '') => {
        const scopes = [];
        
        for (const [key, value] of Object.entries(scopesData)) {
          // Убираем начальный слэш если есть
          const cleanKey = key.replace(/^\//, '');
          const scopePath = currentPath ? `${currentPath}/${cleanKey}` : `/${cleanKey}`;
          
          const scope = {
            path: scopePath,
            name: cleanKey,
            description: value.description || '',
            children: []
          };
          
          // Рекурсивно парсим дочерние области
          if (value && typeof value === 'object') {
            // Ищем дочерние элементы (исключаем стандартные поля)
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
        
        if (entry.kind === 'directory') {
          const catalog = await this.findBlockCatalogFile(entry, entryPath);
          if (catalog) return catalog;
        } else if (entry.kind === 'file' && entry.name === '.block-catalog.yml') {
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
        const entryPath = path ? `${path}/${entry.name}` : entry.name;
        
        if (entry.kind === 'directory') {
          const subFiles = await this.findBlockDefinitionFiles(entry, entryPath);
          files.push(...subFiles);
        } else if (entry.kind === 'file' && entry.name === '.block-definition.yml') {
          files.push({
            handle: entry,
            path: entryPath
          });
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

      return {
        filePath: fullPath,
        directory: directory,
        scope: data.scope || '',
        blockName: data.blockName || 'Unknown',
        blockPart: blockPart,
        description: data.description || '',
        aspects: data.aspects || '',
        ignore: data.ignore || false,
        extend: data.extend || '',
        based: data.based || ''
      };
    } catch (error) {
      console.warn(`Error parsing file ${filePath}:`, error.message);
      return null;
    }
  }

  // Mock-данные для тестирования
  static getMockProjectData() {
    console.log('Using mock project data');

    const mockData = {
      scopes: [
        {
          path: '/RGB',
          name: 'RGB',
          description: 'Платформа КПИ',
          children: [
            {
              path: '/RGB/UP',
              name: 'UP',
              description: 'Universal Platform - Универсальная часть платформы',
              children: [
                {
                  path: '/RGB/UP/Core',
                  name: 'Core',
                  description: 'Core - Основная часть платформы, набор базовых блоков',
                  children: []
                },
                {
                  path: '/RGB/UP/Cluster',
                  name: 'Cluster',
                  description: 'Cluster - Блоки организации кластеров',
                  children: []
                }
              ]
            },
            {
              path: '/RGB/CSC',
              name: 'CSC',
              description: 'Common System Components - Общесистемные компоненты',
              children: [
                {
                  path: '/RGB/CSC/Core',
                  name: 'Core',
                  description: 'Core - Основная часть платформы, набор базовых блоков',
                  children: [
                    {
                      path: '/RGB/CSC/Core/GenericPlatform',
                      name: 'GenericPlatform',
                      description: 'Generic Platform - Обобщенная часть платформы',
                      children: [
                        {
                          path: '/RGB/CSC/Core/GenericPlatform/EntitiesInfrastructure',
                          name: 'EntitiesInfrastructure',
                          description: 'Entities Infrastructure - инфраструктура сущностей',
                          children: []
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      blocks: [
        {
          filePath: 'RGB\\CSC\\Core\\BS\\.block-definition.yml',
          directory: 'RGB\\CSC\\Core',
          scope: '/RGB/CSC/Core',
          blockName: 'BS',
          blockPart: ['AdminPack', 'Contract'],
          description: 'Внутренние контракты администрирования провайдеров хранилищ бинарных данных',
          aspects: 'Client, Internal',
          ignore: false,
          extend: 'DFTS',
          based: ''
        },
        {
          filePath: 'RGB\\UP\\Core\\DFTS\\.block-definition.yml',
          directory: 'RGB\\UP\\Core',
          scope: '/RGB/UP/Core',
          blockName: 'DFTS',
          blockPart: [],
          description: 'Документарно транзитное хранилище',
          aspects: 'Core, Infrastructure',
          ignore: false,
          extend: '',
          based: ''
        },
        {
          filePath: 'RGB\\CSC\\Core\\Test\\.block-definition.yml',
          directory: 'RGB\\CSC\\Core\\GenericPlatform\\EntitiesInfrastructure',
          scope: '/RGB/CSC/Core/GenericPlatform/EntitiesInfrastructure',
          blockName: 'TestBlock',
          blockPart: [ ],
          description: 'Тестовый блок',
          aspects: 'Tests',
          ignore: false,
          extend: '',
          based: ''
        },
        {
          filePath: 'RGB\\CSC\\Core\\Test\\Part\\.block-definition.yml',
          directory: 'RGB\\CSC\\Core\\GenericPlatform\\EntitiesInfrastructure',
          scope: '/RGB/CSC/Core/GenericPlatform/EntitiesInfrastructure',
          blockName: 'TestBlock',
          blockPart: [ 'TestPart1' ],
          description: 'Тестовый парт блока',
          aspects: 'Tests',
          ignore: false,
          extend: '',
          based: 'BS'
        },
        {
          filePath: 'RGB\\CSC\\Core\\Test\\Part\\sub\\.block-definition.yml',
          directory: 'RGB\\CSC\\Core\\GenericPlatform\\EntitiesInfrastructure',
          scope: '/RGB/CSC/Core/GenericPlatform/EntitiesInfrastructure',
          blockName: 'TestBlock',
          blockPart: [ 'TestPart1', 'TestSubPart1' ],
          description: 'Тестовый подпарт блока 1',
          aspects: 'Internal',
          ignore: false,
          extend: '',
          based: ''
        },
        {
          filePath: 'RGB\\CSC\\Core\\Test\\Part\\sub\\.block-definition.yml',
          directory: 'RGB\\CSC\\Core\\GenericPlatform\\EntitiesInfrastructure',
          scope: '/RGB/CSC/Core/GenericPlatform/EntitiesInfrastructure',
          blockName: 'TestBlock',
          blockPart: [ 'TestPart1', 'TestSubPart2' ],
          description: 'Тестовый подпарт блока 2',
          aspects: 'Internal',
          ignore: false,
          extend: '',
          based: ''
        }
      ],
      catalog: null
    };
    
    return mockData;
  }

  static isFileSystemAPISupported() {
    const supported = 'showDirectoryPicker' in window;
    console.log(`File System API supported: ${supported}`);

    return supported;
  }
}