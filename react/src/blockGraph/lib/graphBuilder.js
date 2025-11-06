import * as d3 from 'd3';

export class GraphBuilder {
  static buildGraph(blocks) {
    const nodes = [];
    const links = [];
    const nodeMap = new Map();
    let nodeId = 0;

    console.log('Building graph from blocks:', blocks);

    blocks.forEach(block => {
      if (block.ignore) return;

      // Строим полный путь: parents -> blockName -> blockPart
      const fullPath = [...block.parents, block.blockName, ...block.blockPart];
      
      // Создаем узлы для каждого сегмента в пути
      for (let i = 0; i < fullPath.length; i++) {
        const segmentPath = fullPath.slice(0, i + 1).join(' → ');
        const segmentName = fullPath[i];
        
        if (!nodeMap.has(segmentPath)) {
          const isLeaf = i === fullPath.length - 1;
          const isBlockNode = i === block.parents.length;
          const isPartNode = i > block.parents.length;
          const isRoot = segmentName === 'RGB' && i === 0;
          
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

        // Если это конечный узел (блок), добавляем информацию о блоке
        if (i === fullPath.length - 1) {
          const node = nodeMap.get(segmentPath);
          node.blocks.push({
            name: block.blockName,
            description: block.description,
            aspects: block.aspects,
            directory: block.directory,
            parents: block.parents,
            blockPart: block.blockPart
          });
        }
      }

      // Создаем связи между узлами
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
    const rootNode = nodes.find(node => node.isRoot);
    if (!rootNode) {
      console.error('No root node found');
      return null;
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

  static createRadialTreeLayout(hierarchy, width, height) {
    if (!hierarchy) {
      console.error('No hierarchy provided for tree layout');
      return null;
    }

    try {
      const treeLayout = d3.tree()
        .size([2 * Math.PI, Math.min(width, height) / 2 - 100])
        .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

      const root = d3.hierarchy(hierarchy);
      const treeData = treeLayout(root);
      
      console.log('Tree data:', treeData);
      return treeData;
    } catch (error) {
      console.error('Error creating tree layout:', error);
      return null;
    }
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