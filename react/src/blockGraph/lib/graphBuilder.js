import * as d3 from 'd3';
import { BlockDataService } from '../api/blockDataService.js';

export class GraphBuilder {
  static buildGraph(blocks, hideParts = false) {
    const nodes = [];
    const links = [];
    const nodeMap = new Map();
    let nodeId = 0;

    const blockEndPaths = new Set();
    const allBlockPaths = new Set();

    blocks.forEach(block => {
      if (block.ignore) return;
      
      // Фильтруем blockPart если нужно скрыть части
      const effectiveBlockPart = hideParts ? [] : block.blockPart;
      
      const fullBlockPath = [...block.parents, block.blockName];
      
      const blockEndPath = [...block.parents, block.blockName, ...effectiveBlockPart];
      const blockEndPathStr = blockEndPath.join(' → ');
      
      blockEndPaths.add(blockEndPathStr);
      
      for (let i = 0; i < fullBlockPath.length; i++) {
        const segmentPath = fullBlockPath.slice(0, i + 1).join(' → ');
        allBlockPaths.add(segmentPath);
      }
      
      for (let i = 0; i < blockEndPath.length; i++) {
        const segmentPath = blockEndPath.slice(0, i + 1).join(' → ');
        allBlockPaths.add(segmentPath);
      }
    });

    blocks.forEach(block => {
      if (block.ignore) return;

      // Фильтруем blockPart если нужно скрыть части
      const effectiveBlockPart = hideParts ? [] : block.blockPart;
      const fullPath = [...block.parents, block.blockName, ...effectiveBlockPart];
      
      for (let i = 0; i < fullPath.length; i++) {
        const segmentPath = fullPath.slice(0, i + 1).join(' → ');
        const segmentName = fullPath[i];
        
        if (!nodeMap.has(segmentPath)) {
          const isRoot = i === 0;
          const isBlockNode = allBlockPaths.has(segmentPath);
          const isPartNode = isBlockNode && !isRoot && i >= block.parents.length + 1;
          
          const node = {
            id: nodeId++,
            name: segmentName,
            path: segmentPath,
            depth: i,
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

        if (i === fullPath.length - 1) {
          const node = nodeMap.get(segmentPath);
          node.blocks.push({
            name: block.blockName,
            description: block.description,
            aspects: block.aspects,
            directory: block.directory,
            parents: block.parents,
            blockPart: block.blockPart,
            based: block.based,
            extend: block.extend
          });
        }
      }

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

    nodes.forEach(node => {
      if ((node.isBlockNode || !node.isPartNode) && node.blocks.length === 0) {
        const catalogData = BlockDataService.getCatalogDataForBlock(node.name);
        if (catalogData) {
          node.blocks.push({
            name: node.name,
            description: catalogData.description || catalogData.ruFullName || '',
            aspects: '',
            directory: node.path,
            parents: [],
            blockPart: [],
            catalogData: catalogData
          });
        }
      }
    });

    return { nodes, links };
  }

  static createHierarchy(nodes, links) {
    if (!nodes || nodes.length === 0) {
      return null;
    }

    const rootNode = nodes.find(node => node.isRoot);
    if (!rootNode) {
      return null;
    }

    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    
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
          : null
      };
    };

    return buildHierarchy(rootNode);
  }

  static getNodeColor(node) {
    if (node.isRoot) return '#2ecc71';
    if (node.isPartNode) return '#ff6b35';
    if (node.isBlockNode) return '#4a90e2';
    return '#87ceeb';
  }

  static getNodeRadius(node) {
    if (node.isRoot) return 7;
    if (node.isPartNode) return 3;
    if (node.isBlockNode) return 5;
    return 3;
  }

  static getNodeStrokeWidth(node) {
    if (node.isRoot) return 2;
    if (node.isBlockNode) return 1.5;
    return 1;
  }
}