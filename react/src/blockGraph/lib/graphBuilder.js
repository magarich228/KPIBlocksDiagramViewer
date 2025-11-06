import * as d3 from 'd3';

export class GraphBuilder {
  static buildGraph(blocks) {
    const nodes = [];
    const links = [];
    const nodeMap = new Map();
    let nodeId = 0;

    console.log('Building graph from blocks:', blocks);

    // Сначала находим все уникальные пути
    const allPaths = [];
    
    blocks.forEach(block => {
      if (block.ignore) return;
      const fullPath = [...block.parents, block.blockName, ...block.blockPart];
      allPaths.push(fullPath);

      for (let i = 0; i < fullPath.length; i++) {
        const segmentPath = fullPath.slice(0, i + 1).join(' → ');
        const segmentName = fullPath[i];
        
        // узлы
        if (!nodeMap.has(segmentPath)) {
          const isLeaf = i === fullPath.length - 1;
          const isBlockNode = i >= (fullPath.length - block.blockPart.length - 1);
          const isPartNode = i > (fullPath.length - block.blockPart.length - 1);
          const isRoot = i === 0;
          
          const node = {
            id: nodeId++,
            name: segmentName,
            path: segmentPath,
            depth: i,
            isLeaf,
            isRoot,
            isBlockNode,
            isPartNode,
            blocks: [],
            x: 0,
            y: 0
          };
          
          nodeMap.set(segmentPath, node);
          nodes.push(node);
        }
      }
    });

    blocks.forEach(block => {
      if (block.ignore) return;
      const fullPath = [...block.parents, block.blockName, ...block.blockPart];
      const segmentPath = fullPath.join(' → ');
      const node = nodeMap.get(segmentPath);
      
      if (node) {
        node.blocks.push({
          name: block.blockName,
          description: block.description,
          aspects: block.aspects,
          directory: block.directory,
          parents: block.parents,
          blockPart: block.blockPart
        });
      }
    });

    // Создаем связи между узлами
    allPaths.forEach(fullPath => {
      for (let i = 1; i < fullPath.length; i++) {
        const sourcePath = fullPath.slice(0, i).join(' → ');
        const targetPath = fullPath.slice(0, i + 1).join(' → ');
        
        const sourceNode = nodeMap.get(sourcePath);
        const targetNode = nodeMap.get(targetPath);
        
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
      }
    });

    console.log('Built graph:', { nodes, links });
    return { nodes, links };
  }

  static createHierarchy(nodes, links) {
    console.log('Creating hierarchy from:', { nodes, links });
    
    if (!nodes || nodes.length === 0) {
      console.error('No nodes provided for hierarchy');
      return null;
    }

    // Находим корневой узел
    const rootNodes = nodes.filter(node => node.isRoot);
    if (rootNodes.length === 0) {
      console.error('No root node found');
      return null;
    }

    // Если несколько корневых узлов, создаем искусственный корень
    let rootNode;
    if (rootNodes.length > 1) {
      rootNode = {
        id: -1,
        name: 'Root',
        path: 'Root',
        depth: -1,
        isLeaf: false,
        isRoot: true,
        isBlockNode: false,
        isPartNode: false,
        blocks: [],
        x: 0,
        y: 0,
        children: rootNodes
      };
    } else {
      rootNode = rootNodes[0];
    }

    // Создаем map для быстрого доступа к узлам по ID
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    
    // Строим children для каждого узла
    nodes.forEach(node => {
      node.children = links
        .filter(link => link.source === node.id)
        .map(link => nodeMap.get(link.target))
        .filter(child => child !== undefined);
    });

    // Создаем иерархию начиная с корня
    const buildHierarchy = (node) => {
      return {
        data: node,
        children: node.children && node.children.length > 0 
          ? node.children.map(child => buildHierarchy(child))
          : null
      };
    };

    const hierarchy = buildHierarchy(rootNode);
    console.log('Built hierarchy:', hierarchy);
    return hierarchy;
  }

  static getNodeColor(node) {
    if (node.isRoot) return '#2ecc71';
    if (node.isPartNode) return '#ff6b35';
    if (node.isBlockNode) return '#4a90e2';
    return '#87ceeb';
  }

  static getNodeRadius(node) {
    if (node.isRoot) return 10;
    if (node.isBlockNode) return 7;
    if (node.isPartNode) return 5;
    return 4;
  }
}