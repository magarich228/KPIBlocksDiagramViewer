// Модели данных для блоков и графа
export const NodeType = {
  SCOPE: 'scope',
  BLOCK: 'block',
  PART: 'part',
};

export const BlockDefinition = {
  filePath: '',
  directory: '',
  scope: '',
  blockName: '',
  blockPart: [],
  description: '',
  aspects: '',
  ignore: false,
  extend: '',
  based: '',
  filesCount: null,
  codeLines: null
};

export const ScopeDefinition = {
  path: '',
  name: '',
  description: '',
  filesCount: null,
  codeLines: null,
  children: []
};

export const GraphNode = {
  id: 0,
  name: '',
  path: '',
  depth: 0,
  type: NodeType.BLOCK,
  blocks: [],
  x: 0,
  y: 0
};

export const GraphLink = {
  source: 0,
  target: 0
};

export const ProjectData = {
  scopes: [],
  blocks: [],
  catalog: null
};