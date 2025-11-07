import * as yaml from 'js-yaml';

export class BlockDataService {
  static directoryHandle = null;

  // Запрос разрешения на доступ к директории
  static async requestDirectoryAccess() {
    try {
      // Пытаемся получить доступ к ранее выбранной директории
      if ('showDirectoryPicker' in window) {
        this.directoryHandle = await window.showDirectoryPicker();
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Ошибка при выборе директории:', error);
      return false;
    }
  }

  // Рекурсивный поиск всех .block-definition.yml файлов
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
      console.warn(`Не удалось прочитать директорию: ${path}`, error.message);
    }
    
    return files;
  }

  // Чтение и парсинг YAML файла
  static async parseBlockDefinition(fileHandle, filePath) {
    try {
      const file = await fileHandle.getFile();
      const content = await file.text();
      const data = yaml.load(content);
      
      // Извлекаем путь к директории из полного пути файла
      const fullPath = filePath.replace(/\//g, '\\');
      const directory = filePath.split('/').slice(0, -1).join('/');
      
      // Обрабатываем parents - разделяем по запятой и обрезаем пробелы
      const parents = typeof data.parents === 'string' 
        ? data.parents.split(',').map(p => p.trim()).filter(p => p)
        : data.parents || [];

      // Обрабатываем blockPart - разделяем по / и фильтруем пустые элементы
      const blockPart = typeof data.blockPart === 'string' && data.blockPart.trim() !== ''
        ? data.blockPart.split('/').filter(part => part.trim() !== '')
        : [];

      return {
        filePath: fullPath,
        directory: directory,
        parents: parents,
        blockName: data.blockName || 'Unknown',
        blockPart: blockPart,
        description: data.description || '',
        aspects: data.aspects || '',
        ignore: data.ignore || false,
        extend: data.extend || '',
        based: data.based || ''
      };
    } catch (error) {
      console.warn(`Ошибка парсинга файла ${filePath}:`, error.message);
      return null;
    }
  }

  // Основной метод получения определений блоков
  static async getBlockDefinitions() {
    if (!this.isFileSystemAPISupported()) {
      throw new Error('File System API не поддерживается в этом браузере');
    }

    const accessGranted = await this.requestDirectoryAccess();
    if (!accessGranted) {
      throw new Error('Доступ к файловой системе не предоставлен');
    }

    try {
      // Ищем все файлы определений блоков
      const definitionFiles = await this.findBlockDefinitionFiles(this.directoryHandle);
      console.log(`Найдено файлов: ${definitionFiles.length}`);

      // Читаем и парсим каждый файл
      const blocks = [];
      for (const fileInfo of definitionFiles) {
        const block = await this.parseBlockDefinition(fileInfo.handle, fileInfo.path);
        if (block && !block.ignore) {
          blocks.push(block);
        }
      }

      console.log('Загружено блоков:', blocks.length);
      return blocks;

    } catch (error) {
      console.error('Ошибка загрузки блоков:', error);
      throw new Error('Ошибка при чтении файлов: ' + error.message);
    }
  }

  // Mock-данные на случай если File System API недоступен
  static getMockBlocks() {
    return [
      {
        filePath: 'RGB\\.block-definition.yml',
        directory: 'RGB',
        parents: [],
        blockName: 'RGB',
        blockPart: [],
        description: 'Платформа КПИ (Компоненты прикладной инфраструктуры, КПИ, RGB)',
        aspects: '',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'RGB\\UI\\.block-definition.yml',
        directory: 'RGB\\UI',
        parents: ['RGB'],
        blockName: 'UI',
        blockPart: [],
        description: 'Пользовательский интерфейс системы',
        aspects: 'ui, frontend, react',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'RGB\\UI\\Components\\.block-definition.yml',
        directory: 'RGB\\UI\\Components',
        parents: ['RGB', 'UI'],
        blockName: 'Components',
        blockPart: [],
        description: 'Библиотека React компонентов',
        aspects: 'components, react, ui',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'RGB\\UI\\Components\\Button\\.block-definition.yml',
        directory: 'RGB\\UI\\Components\\Button',
        parents: ['RGB', 'UI', 'Components'],
        blockName: 'Button',
        blockPart: [],
        description: 'Базовый компонент кнопки',
        aspects: 'button, component, ui',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'RGB\\API\\.block-definition.yml',
        directory: 'RGB\\API',
        parents: ['RGB'],
        blockName: 'API',
        blockPart: [],
        description: 'Backend API системы',
        aspects: 'api, backend, rest',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'RGB\\API\\Auth\\.block-definition.yml',
        directory: 'RGB\\API\\Auth',
        parents: ['RGB', 'API'],
        blockName: 'Auth',
        blockPart: [],
        description: 'Аутентификация и авторизация',
        aspects: 'auth, security, jwt',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'RGB\\API\\Database\\.block-definition.yml',
        directory: 'RGB\\API\\Database',
        parents: ['RGB', 'API'],
        blockName: 'Database',
        blockPart: [],
        description: 'Управление базой данных',
        aspects: 'database, postgresql, orm',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'RGB\\API\\Database\\Migrations\\.block-definition.yml',
        directory: 'RGB\\API\\Database\\Migrations',
        parents: ['RGB', 'API'],
        blockName: 'Database',
        blockPart: ['Migrations'],
        description: 'Миграции базы данных',
        aspects: 'migrations, database',
        ignore: false,
        extend: '',
        based: ''
      }
    ];
  }

  static async searchBlocks(searchTerm) {
    const blocks = await this.getBlockDefinitions();
    return blocks.filter(block => 
      block.blockName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      block.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      block.aspects.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Метод для проверки доступности File System API
  static isFileSystemAPISupported() {
    return 'showDirectoryPicker' in window;
  }
}