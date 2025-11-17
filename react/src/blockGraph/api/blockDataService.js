import * as yaml from 'js-yaml';

export class BlockDataService {
  static directoryHandle = null;
  static catalogData = null;

  // Запрос разрешения на доступ к директории
  static async requestDirectoryAccess() {
    try {
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

  // Поиск .block-catalog.yml файла
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
      console.warn(`Не удалось прочитать директорию: ${path}`, error.message);
    }
    
    return null;
  }

  // Парсинг .block-catalog.yml файла
  static async parseBlockCatalog(fileHandle, filePath) {
    try {
      const file = await fileHandle.getFile();
      const content = await file.text();
      const data = yaml.load(content);
      
      console.log('Loaded catalog data:', data);
      return data;
    } catch (error) {
      console.warn(`Ошибка парсинга catalog файла ${filePath}:`, error.message);
      return null;
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
      // Сначала ищем catalog файл
      const catalogFile = await this.findBlockCatalogFile(this.directoryHandle);
      if (catalogFile) {
        this.catalogData = await this.parseBlockCatalog(catalogFile.handle, catalogFile.path);
        console.log('Catalog data loaded:', this.catalogData);
      } else {
        console.log('Catalog file not found');
        this.catalogData = null;
      }

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

  // Получение данных из каталога для блока
  static getCatalogDataForBlock(blockName) {
    if (!this.catalogData || !blockName) return null;
    return this.catalogData[blockName] || null;
  }

  // Mock-данные на случай если File System API недоступен
  static getMockBlocks() {
    return [
      {
        filePath: 'SmartHomeExample\\.block-definition.yml',
        directory: 'SmartHomeExample',
        parents: [],
        blockName: 'SmartHomeExample',
        blockPart: [],
        description: 'Ядро системы управления умным домом',
        aspects: 'iot, automation, core',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Core\\.block-definition.yml',
        directory: 'SmartHomeExample\\Core',
        parents: ['SmartHomeExample'],
        blockName: 'Core',
        blockPart: [],
        description: 'Базовые сервисы и конфигурация системы',
        aspects: 'configuration, services, foundation',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Core\\DeviceManager\\.block-definition.yml',
        directory: 'SmartHomeExample\\Core\\DeviceManager',
        parents: ['SmartHomeExample', 'Core'],
        blockName: 'DeviceManager',
        blockPart: [],
        description: 'Управление подключенными устройствами и их состоянием',
        aspects: 'devices, registry, state',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Core\\DeviceManager\\Discovery\\.block-definition.yml',
        directory: 'SmartHomeExample\\Core\\DeviceManager\\Discovery',
        parents: ['SmartHomeExample', 'Core', 'DeviceManager'],
        blockName: 'DeviceManager',
        blockPart: ['Discovery'],
        description: 'Автоматическое обнаружение новых устройств в сети',
        aspects: 'discovery, network, zeroconf',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Core\\EventBus\\.block-definition.yml',
        directory: 'SmartHomeExample\\Core\\EventBus',
        parents: ['SmartHomeExample', 'Core'],
        blockName: 'EventBus',
        blockPart: [],
        description: 'Шина событий для межмодульного взаимодействия',
        aspects: 'events, messaging, pubsub',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Automation\\.block-definition.yml',
        directory: 'SmartHomeExample\\Automation',
        parents: ['SmartHomeExample'],
        blockName: 'Automation',
        blockPart: [],
        description: 'Движок автоматизации и сценариев',
        aspects: 'automation, rules, triggers',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Automation\\RuleEngine\\.block-definition.yml',
        directory: 'SmartHomeExample\\Automation\\RuleEngine',
        parents: ['SmartHomeExample', 'Automation'],
        blockName: 'RuleEngine',
        blockPart: [],
        description: 'Обработка правил и условий автоматизации',
        aspects: 'rules, conditions, evaluation',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Automation\\SceneManager\\.block-definition.yml',
        directory: 'SmartHomeExample\\Automation\\SceneManager',
        parents: ['SmartHomeExample', 'Automation'],
        blockName: 'SceneManager',
        blockPart: [],
        description: 'Управление сценариями и пресетами устройств',
        aspects: 'scenes, presets, profiles',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Devices\\.block-definition.yml',
        directory: 'SmartHomeExample\\Devices',
        parents: ['SmartHomeExample'],
        blockName: 'Devices',
        blockPart: [],
        description: 'Интеграции с конкретными типами устройств',
        aspects: 'devices, integrations, protocols',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Devices\\Lighting\\.block-definition.yml',
        directory: 'SmartHomeExample\\Devices\\Lighting',
        parents: ['SmartHomeExample', 'Devices'],
        blockName: 'Lighting',
        blockPart: [],
        description: 'Управление освещением и световыми сценами',
        aspects: 'lights, dimmers, rgb',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Devices\\Lighting\\PhilipsHue\\.block-definition.yml',
        directory: 'SmartHomeExample\\Devices\\Lighting\\PhilipsHue',
        parents: ['SmartHomeExample', 'Devices', 'Lighting'],
        blockName: 'PhilipsHue',
        blockPart: [],
        description: 'Интеграция с экосистемой Philips Hue',
        aspects: 'hue, zigbee, bridges',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Devices\\Climate\\.block-definition.yml',
        directory: 'SmartHomeExample\\Devices\\Climate',
        parents: ['SmartHomeExample', 'Devices'],
        blockName: 'Climate',
        blockPart: [],
        description: 'Контроль климата и температуры',
        aspects: 'climate, temperature, humidity',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Devices\\Climate\\Nest\\.block-definition.yml',
        directory: 'SmartHomeExample\\Devices\\Climate\\Nest',
        parents: ['SmartHomeExample', 'Devices', 'Climate'],
        blockName: 'Nest',
        blockPart: [],
        description: 'Интеграция с термостатами Nest',
        aspects: 'thermostats, learning, schedules',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Devices\\Security\\.block-definition.yml',
        directory: 'SmartHomeExample\\Devices\\Security',
        parents: ['SmartHomeExample', 'Devices'],
        blockName: 'Security',
        blockPart: [],
        description: 'Системы безопасности и мониторинга',
        aspects: 'security, cameras, sensors',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Devices\\Security\\Cameras\\.block-definition.yml',
        directory: 'SmartHomeExample\\Devices\\Security\\Cameras',
        parents: ['SmartHomeExample', 'Devices', 'Security'],
        blockName: 'Cameras',
        blockPart: [],
        description: 'Управление камерами наблюдения',
        aspects: 'cameras, surveillance, streaming',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Devices\\Security\\Sensors\\.block-definition.yml',
        directory: 'SmartHomeExample\\Devices\\Security\\Sensors',
        parents: ['SmartHomeExample', 'Devices', 'Security'],
        blockName: 'Sensors',
        blockPart: [],
        description: 'Обработка данных с датчиков движения и открытия',
        aspects: 'sensors, motion, contact',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Integrations\\.block-definition.yml',
        directory: 'SmartHomeExample\\Integrations',
        parents: ['SmartHomeExample'],
        blockName: 'Integrations',
        blockPart: [],
        description: 'Внешние интеграции и сервисы',
        aspects: 'integrations, api, cloud',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Integrations\\VoiceAssistants\\.block-definition.yml',
        directory: 'SmartHomeExample\\Integrations\\VoiceAssistants',
        parents: ['SmartHomeExample', 'Integrations'],
        blockName: 'VoiceAssistants',
        blockPart: [],
        description: 'Поддержка голосовых помощников',
        aspects: 'voice, alexa, google-assistant',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Integrations\\VoiceAssistants\\Alexa\\.block-definition.yml',
        directory: 'SmartHomeExample\\Integrations\\VoiceAssistants\\Alexa',
        parents: ['SmartHomeExample', 'Integrations', 'VoiceAssistants'],
        blockName: 'Alexa',
        blockPart: [],
        description: 'Интеграция с Amazon Alexa',
        aspects: 'alexa, skills, voice-control',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Integrations\\MobileApp\\.block-definition.yml',
        directory: 'SmartHomeExample\\Integrations\\MobileApp',
        parents: ['SmartHomeExample', 'Integrations'],
        blockName: 'MobileApp',
        blockPart: [],
        description: 'Мобильное приложение для управления системой',
        aspects: 'mobile, react-native, push',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Analytics\\.block-definition.yml',
        directory: 'SmartHomeExample\\Analytics',
        parents: ['SmartHomeExample'],
        blockName: 'Analytics',
        blockPart: [],
        description: 'Сбор и анализ данных об использовании системы',
        aspects: 'analytics, metrics, reporting',
        ignore: false,
        extend: '',
        based: ''
      },
      {
        filePath: 'SmartHomeExample\\Analytics\\EnergyMonitoring\\.block-definition.yml',
        directory: 'SmartHomeExample\\Analytics\\EnergyMonitoring',
        parents: ['SmartHomeExample', 'Analytics'],
        blockName: 'EnergyMonitoring',
        blockPart: [],
        description: 'Мониторинг энергопотребления устройств',
        aspects: 'energy, consumption, efficiency',
        ignore: false,
        extend: '',
        based: ''
      }
    ];
  }

  // Метод для проверки доступности File System API
  static isFileSystemAPISupported() {
    return 'showDirectoryPicker' in window;
  }
}