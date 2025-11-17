// Модели данных для блоков и графа
export const BlockType = {
  ROOT: 'root',
  BLOCK: 'block',
  PART: 'part',
};

export const BlockDefinition = {
  filePath: '',
  directory: '',
  parents: [],
  blockName: '',
  blockPart: [],
  description: '',
  aspects: '',
  ignore: false
};

export const GraphNode = {
  id: 0,
  name: '',
  path: '',
  depth: 0,
  isRoot: false,
  isBlockNode: false,
  isPartNode: false,
  blocks: [],
  x: 0,
  y: 0
};

export const GraphLink = {
  source: 0,
  target: 0
};