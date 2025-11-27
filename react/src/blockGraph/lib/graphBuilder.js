import { NodeType } from '../model/types.js';

export class GraphBuilder {
  static buildGraph(projectData, hideParts = false) {
    const { scopes, blocks } = projectData;
    const nodes = [];
    const links = [];
    const nodeMap = new Map();
    let nodeId = 0;

    if (!scopes || !blocks) {
      console.error('Missing scopes or blocks in project data');
      return { nodes, links };
    }

    // Сначала создаем узлы для областей (.scopes-catalog)
    const createScopeNodes = (scope, parentPath = '', depth = 0) => {
      const scopePath = scope.path;
      
      if (!nodeMap.has(scopePath)) {
        const node = {
          id: nodeId++,
          name: scope.name,
          path: scopePath,
          depth: depth,
          type: NodeType.SCOPE,
          description: scope.description,
          blocks: [],
          x: 0,
          y: 0
        };
        
        nodeMap.set(scopePath, node);
        nodes.push(node);
      }

      // Рекурсивно создаем дочерние области
      if (scope.children && scope.children.length > 0) {
        scope.children.forEach(childScope => {
          createScopeNodes(childScope, scopePath, depth + 1);
          
          // Создаем связь между родительской и дочерней областью
          const sourceNode = nodeMap.get(scopePath);
          const targetNode = nodeMap.get(childScope.path);
          
          if (sourceNode && targetNode) {
            const linkExists = links.some(link => 
              link.source === sourceNode.id && link.target === targetNode.id
            );
            
            if (!linkExists) {
              links.push({
                source: sourceNode.id,
                target: targetNode.id
              });
            }
          }
        });
      }
    };

    // Создаем все узлы областей
    scopes.forEach(scope => createScopeNodes(scope));

    // Затем создаем узлы для блоков и их частей (.block-definition файлы)
    blocks.forEach(block => {
      if (!block.scope) {
        console.log(`Skip block-definition of ${block.blockName} with undefined scope.`);
        return;
      }

      const scopePath = block.scope;
      const scopeNode = nodeMap.get(scopePath);
      
      if (!scopeNode) {
        console.warn(`Scope not found for block: ${block.blockName} (scope: ${scopePath})`);
        return; // Пропускаем блоки без соответствующей области. 
        // TODO: проверить и возможно всё равно рисовать их как было раньше
      }

      // Создание узла блока
      const blockPath = `${scopePath}/${block.blockName}`;
      if (!nodeMap.has(blockPath)) {
        const blockNode = {
          id: nodeId++,
          name: block.blockName,
          path: blockPath,
          depth: scopeNode.depth + 1,
          type: NodeType.BLOCK,
          blocks: [block],
          x: 0,
          y: 0
        };
        
        nodeMap.set(blockPath, blockNode);
        nodes.push(blockNode);
        
        // Создаем связь от области к блоку
        links.push({
          source: scopeNode.id,
          target: blockNode.id
        });
      } else {
        // Обновляем существующий узел блока
        const existingNode = nodeMap.get(blockPath);
        // Если для блока есть несколько определений - все будут отображены +
        // Для удобства отображения информации о определениях частей блока
        existingNode.blocks.push(block);
      }

      // Создаем узлы для частей блока (если не скрыты)
      if (!hideParts && block.blockPart && block.blockPart.length > 0) {
        const blockNode = nodeMap.get(blockPath);
        let currentPath = blockPath;
        
        block.blockPart.forEach((partName, index) => {
          const partPath = `${currentPath}/${partName}`;
          
          const existingPartNode = nodeMap.get(partPath);

          if (!existingPartNode) {
            const partNode = {
              id: nodeId++,
              name: partName,
              path: partPath,
              depth: blockNode.depth + index + 1,
              type: NodeType.PART,
              blocks: index === block.blockPart.length - 1 ? [block] : [],
              x: 0,
              y: 0
            };
            
            nodeMap.set(partPath, partNode);
            nodes.push(partNode);
            
            // Создаем связь
            const sourceNode = nodeMap.get(currentPath);
            if (sourceNode) {
              links.push({
                source: sourceNode.id,
                target: partNode.id
              });
            }
            // index === block.blockPart.length - 1:
            // Добавляем информации о определении части блока в узел только если
            // полный blockPart совпадает с полным путем узла начиная от узла блока не включая его
            // например 
            // в .block-definition.yml blockPart: /BlobStorageProvider/Dal
            // добавляем block в blocks узла только если путь узла /BlobStorageProvider/Dal
          } else if (index === block.blockPart.length - 1) {
            // Т.к. нет гарантии, что узел для данной части блока еще не построен,
            // то при существовании узла добавляем в него инфу о определении части блока
            existingPartNode.blocks.push(block);
          }
          
          currentPath = partPath;
        });
      }
    });

    console.log('Graph built successfully:', {
      nodes: nodes.length,
      links: links.length,
      nodeTypes: {
        scopes: nodes.filter(n => n.type === NodeType.SCOPE).length,
        blocks: nodes.filter(n => n.type === NodeType.BLOCK).length,
        parts: nodes.filter(n => n.type === NodeType.PART).length
      }
    });

    return { nodes, links };
  }

  static createHierarchy(nodes, links) {
    console.log('Creating hierarchy...', {
      nodes: nodes.length,
      links: links.length
    });

    if (!nodes || nodes.length === 0) {
      console.error('No nodes for hierarchy');
      return null;
    }

    // Находим корневые узлы (глубина 0)
    const rootNodes = nodes.filter(node => node.depth === 0);

    if (rootNodes.length === 0) {
      console.warn('No root nodes found, trying to find minimum depth...');
      const minDepth = Math.min(...nodes.map(n => n.depth));
      const alternativeRoots = nodes.filter(node => node.depth === minDepth);
      console.log(`Using nodes with depth ${minDepth} as roots: ${alternativeRoots.length}`);
      
      if (alternativeRoots.length === 0) {
        console.error('No suitable root nodes found');
        return null;
      }

      rootNodes.push(...alternativeRoots);
    }

    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    
    // Строим children для каждого узла
    nodes.forEach(node => {
      node.children = links
        .filter(link => link.source === node.id)
        .map(link => nodeMap.get(link.target))
        .filter(child => child !== undefined);
    });

    const buildHierarchy = (node) => {
      return {
        data: node,
        children: node.children && node.children.length > 0 
          ? node.children.map(child => buildHierarchy(child))
          : []
      };
    };

    // Если несколько корневых узлов, создаем виртуальный корень
    let hierarchy;
    if (rootNodes.length > 1) {
      console.log('Multiple root nodes, creating virtual root');

      const virtualRoot = {
        id: -1,
        name: 'Root',
        path: '',
        depth: -1,
        type: NodeType.SCOPE,
        blocks: [],
        children: rootNodes
      };
      hierarchy = buildHierarchy(virtualRoot);
    } else {
      hierarchy = buildHierarchy(rootNodes[0]);
    }

    console.log('Hierarchy created successfully');

    return hierarchy;
  }

  static getNodeColor(node) {
    switch (node.type) {
      case NodeType.SCOPE:
        const scopeColors = ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd'];
        const depth = Math.min(node.depth, scopeColors.length - 1);
        return scopeColors[depth];
      
      case NodeType.BLOCK:
        return '#10b981'; // Зеленый
        
      case NodeType.PART:
        return '#86efac'; // Светло-зеленый
        
      default:
        return '#6b7280';
    }
  }

  static getNodeRadius(node) {
    switch (node.type) {
      case NodeType.SCOPE:
        return 6;
      case NodeType.BLOCK:
        return 5;
      case NodeType.PART:
        return 3;
      default:
        return 3;
    }
  }

  static getNodeStrokeWidth(node) {
    switch (node.type) {
      case NodeType.SCOPE:
        return 2;
      case NodeType.BLOCK:
        return 1.5;
      case NodeType.PART:
        return 1;
      default:
        return 1;
    }
  }
}