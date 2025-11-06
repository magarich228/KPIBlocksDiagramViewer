const mockBlocks = [
  {
    filePath: 'C:\\Users\\k.groshev\\source\\repos\\rgb3\\RGB\\.block-definition.yml',
    directory: '.\\RGB',
    parents: [],
    blockName: 'RGB',
    blockPart: [],
    description: 'Корневой блок системы RGB',
    aspects: 'core, system',
    ignore: false
  },
  {
    filePath: 'C:\\Users\\k.groshev\\source\\repos\\rgb3\\RGB\\UI\\.block-definition.yml',
    directory: '.\\RGB\\UI',
    parents: ['RGB'],
    blockName: 'UI',
    blockPart: [],
    description: 'Пользовательский интерфейс системы',
    aspects: 'ui, frontend, react',
    ignore: false
  },
  {
    filePath: 'C:\\Users\\k.groshev\\source\\repos\\rgb3\\RGB\\UI\\Components\\.block-definition.yml',
    directory: '.\\RGB\\UI\\Components',
    parents: ['RGB', 'UI'],
    blockName: 'Components',
    blockPart: [],
    description: 'Библиотека React компонентов',
    aspects: 'components, react, ui',
    ignore: false
  },
  {
    filePath: 'C:\\Users\\k.groshev\\source\\repos\\rgb3\\RGB\\UI\\Components\\Button\\.block-definition.yml',
    directory: '.\\RGB\\UI\\Components\\Button',
    parents: ['RGB', 'UI', 'Components'],
    blockName: 'Button',
    blockPart: [],
    description: 'Базовый компонент кнопки',
    aspects: 'button, component, ui',
    ignore: false
  },
  {
    filePath: 'C:\\Users\\k.groshev\\source\\repos\\rgb3\\RGB\\API\\.block-definition.yml',
    directory: '.\\RGB\\API',
    parents: ['RGB'],
    blockName: 'API',
    blockPart: [],
    description: 'Backend API системы',
    aspects: 'api, backend, rest',
    ignore: false
  },
  {
    filePath: 'C:\\Users\\k.groshev\\source\\repos\\rgb3\\RGB\\API\\Auth\\.block-definition.yml',
    directory: '.\\RGB\\API\\Auth',
    parents: ['RGB', 'API'],
    blockName: 'Auth',
    blockPart: [],
    description: 'Аутентификация и авторизация',
    aspects: 'auth, security, jwt',
    ignore: false
  },
  {
    filePath: 'C:\\Users\\k.groshev\\source\\repos\\rgb3\\RGB\\API\\Database\\.block-definition.yml',
    directory: '.\\RGB\\API\\Database',
    parents: ['RGB', 'API'],
    blockName: 'Database',
    blockPart: [],
    description: 'Управление базой данных',
    aspects: 'database, postgresql, orm',
    ignore: false
  },
  {
    filePath: 'C:\\Users\\k.groshev\\source\\repos\\rgb3\\RGB\\API\\Database\\Migrations\\.block-definition.yml',
    directory: '.\\RGB\\API\\Database\\Migrations',
    parents: ['RGB', 'API'],
    blockName: 'Database',
    blockPart: [ 'Migrations' ],
    description: 'Миграции базы данных',
    aspects: 'migrations, database',
    ignore: false
  }
];

export class BlockDataService {
  static async getBlockDefinitions() {
    // Имитация загрузки данных
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Returning mock blocks:', mockBlocks);
        resolve(mockBlocks);
      }, 100);
    });
  }

  static async searchBlocks(searchTerm) {
    const blocks = await this.getBlockDefinitions();
    return blocks.filter(block => 
      block.blockName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      block.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      block.aspects.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
}