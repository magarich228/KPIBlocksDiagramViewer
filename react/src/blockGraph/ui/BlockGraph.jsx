import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphBuilder } from '../lib/graphBuilder.js';
import GraphControls from './GraphControls.jsx';
import InformationPanel from './InformationPanel.jsx';
import './styles.css';
import { NodeType } from '../model/types.js';

const BlockGraph = ({ data, onDataLoaded }) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const [selectedNode, setSelectedNode] = useState(null);
  const [relatedNodes, setRelatedNodes] = useState({ based: [], extend: [], other: [] });
  const [graphData, setGraphData] = useState(null);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [dimensions, setDimensions] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });
  const [partsHidden, setPartsHidden] = useState(false);
  const [currentTransform, setCurrentTransform] = useState(null);

  const updateDimensions = useCallback(() => {
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight
    });
  }, []);

  // Функция для поиска связанных узлов
  const findRelatedNodes = useCallback((node) => {
    if (!node || !graphData) return { based: [], extend: [], other: [] };

    const basedNodes = [];
    const extendNodes = [];
    const otherBlockNodes = [];

    // Проходим по всем блокам выбранного узла
    node.blocks.forEach(block => {
      let basedNodeNames = block.based ? block.based.split(',').map(b => b.trim()) : null;
      let extendNodeNames = block.extend ? block.extend.split(',').map(b => b.trim()) : null;

      graphData.nodes.forEach(graphNode => {
        if (basedNodeNames && basedNodeNames.some(n => graphNode.name === n)) {
          basedNodes.push(graphNode);
        }

        if (extendNodeNames && extendNodeNames.some(n => graphNode.name === n)) {
          extendNodes.push(graphNode);
        }

        if (graphNode.type === NodeType.BLOCK && graphNode.name === node.name && graphNode != node)
        {
          otherBlockNodes.push(graphNode);
        }
      });
    });

    return { 
      based: [...new Set(basedNodes)], 
      extend: [...new Set(extendNodes)], 
      other: [...new Set(otherBlockNodes)] 
    };
  }, [graphData]);

  // Функция для получения стилей узла
  const getNodeStyles = useCallback((nodeData) => {
    if (!nodeData) return {};
    
    const isSelected = selectedNode && nodeData.path === selectedNode.path;
    const isBased = relatedNodes.based.some(n => n.path === nodeData.path);
    const isExtend = relatedNodes.extend.some(n => n.path === nodeData.path);
    const isOther = relatedNodes.other.some(n => n.path === nodeData.path);
    
    return {
      stroke: isSelected ? '#ff2e57ff' : 
              isBased ? '#8b5cf6' : 
              isExtend ? '#f59e0b' : 
              isOther ? '#ff57a8' :
              GraphBuilder.getNodeColor(nodeData),
      strokeWidth: isSelected ? 3 : 
                  (isBased || isExtend || isOther) ? 2.5 : 
                  GraphBuilder.getNodeStrokeWidth(nodeData),
      filter: isSelected ? 'drop-shadow(0 0 8px rgba(255,56,96,0.8))' : 
              isBased ? 'drop-shadow(0 0 6px rgba(139,92,246,0.6))' : 
              isExtend ? 'drop-shadow(0 0 6px rgba(245,158,11,0.6))' : 
              isOther ? 'drop-shadow(0 0 6px rgba(255, 87, 168, 0.6))' :
              'none'
    };
  }, [selectedNode, relatedNodes]);

  // Обновление стилей узлов при изменении выделения
  const updateNodeStyles = useCallback(() => {
    if (!svgRef.current || !svgRef.current.circles) return;

    svgRef.current.circles
      .attr('stroke', d => getNodeStyles(d.data.data).stroke)
      .attr('stroke-width', d => getNodeStyles(d.data.data).strokeWidth)
      .style('filter', d => getNodeStyles(d.data.data).filter);
  }, [getNodeStyles]);

  // Функция для получения всех узлов в ветви (от корня до узла и частей)
  const getBranchNodes = useCallback((node, treeData) => {
    if (!node || !treeData) return new Set();
    
    const branchNodes = new Set();
    
    const allNodes = treeData.descendants();
    const d3Node = allNodes.find(d => d.data.data.id === node.id);
    
    if (d3Node) {
      // Родители узла
      d3Node.ancestors().forEach(ancestor => {
        branchNodes.add(ancestor.data.data.id);
      });
      
      // Узел
      branchNodes.add(node.id);

      const traverseChildren = (currentNode) => {
        if (!currentNode.children || currentNode.children.length === 0) {
          return;
        }
        
        currentNode.children.forEach(child => {
          branchNodes.add(child.data.data.id);
          
          traverseChildren(child);
        });
      };

      // Добавляем все части блока если выбранный узел типа блок
      if (node.type === NodeType.BLOCK) {
        traverseChildren(d3Node);
      }
    }
    
    return branchNodes;
  }, []);

  // Функция для обновления прозрачности элементов графа
  const updateGraphTransparency = useCallback(() => {
    if (!svgRef.current || !selectedNode) {

      if (svgRef.current) {
        svgRef.current.svg.selectAll('circle, text, path')
          .style('opacity', 1);
      }
      return;
    }

    const { treeData } = svgRef.current;
    if (!treeData) return;

    // Собираем все ID узлов, которые должны остаться непрозрачными
    const visibleNodeIds = new Set();

    const selectedBranch = getBranchNodes(selectedNode, treeData);
    selectedBranch.forEach(id => visibleNodeIds.add(id));

    const allRelatedNodes = [
      ...relatedNodes.based,
      ...relatedNodes.extend,
      ...relatedNodes.other
    ];

    allRelatedNodes.forEach(relatedNode => {
      const relatedBranch = getBranchNodes(relatedNode, treeData);
      relatedBranch.forEach(id => visibleNodeIds.add(id));
    });

    allRelatedNodes.forEach(node => {
      visibleNodeIds.add(node.id);
    });

    const allNodes = treeData.descendants();
    
    const allNodeIds = allNodes.map(d => d.data.data.id);
    const transparentNodeIds = allNodeIds.filter(id => !visibleNodeIds.has(id));

    const allLinks = treeData.links();
    
    // Связь должна стать прозрачной, если один из её узлов прозрачный
    const transparentLinks = allLinks.filter(link => {
      const sourceId = link.source.data.data.id;
      const targetId = link.target.data.data.id;
      
      // Если один из узлов прозрачный - связь прозрачная
      return transparentNodeIds.includes(sourceId) || transparentNodeIds.includes(targetId);
    });

    svgRef.current.svg.selectAll('circle')
      .style('opacity', d => {
        const nodeId = d.data.data.id;
        return visibleNodeIds.has(nodeId) ? 1 : 0.2;
      });

    svgRef.current.svg.selectAll('text')
      .style('opacity', d => {
        const nodeId = d.data.data.id;
        return visibleNodeIds.has(nodeId) ? 1 : 0.2;
      });

    svgRef.current.svg.selectAll('path')
      .style('opacity', d => {
        const sourceId = d.source.data.data.id;
        const targetId = d.target.data.data.id;
        
        // Если связь в списке прозрачных - делаем прозрачной
        const isTransparentLink = transparentLinks.some(link => 
          link.source.data.data.id === sourceId && 
          link.target.data.data.id === targetId
        );
        
        return isTransparentLink ? 0.2 : 1;
      });

  }, [selectedNode, relatedNodes, getBranchNodes]);

  useEffect(() => {
    console.log('BlockGraph: data changed', data);

    if (data && data.blocks && data.blocks.length > 0) {
      const graph = GraphBuilder.buildGraph(data, partsHidden);
      setGraphData(graph);
    } else {
      console.warn('BlockGraph: No valid data received');
      setGraphData(null);
    }
  }, [data, partsHidden]);

  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [updateDimensions]);

  useEffect(() => {
    console.log('BlockGraph: graphData or dimensions changed', {
      hasGraphData: !!graphData,
      nodes: graphData?.nodes?.length || 0,
      dimensions
    });
    
    if (graphData && dimensions.width > 0 && dimensions.height > 0) {
      createRadialTree();
    }
  }, [graphData, dimensions]);

  // Обновляем стили при изменении выделения
  useEffect(() => {
    updateNodeStyles();
  }, [selectedNode, relatedNodes, updateNodeStyles]);

  // Обновляем useEffect для вызова функции прозрачности
  useEffect(() => {
    updateGraphTransparency();
  }, [selectedNode, relatedNodes, updateGraphTransparency]);

  // Обновляем createRadialTree для сохранения treeData в svgRef
  const createRadialTree = () => {
    console.log('Creating radial d3 visualization...');
    
    if (!graphData || !containerRef.current) {
      console.error('Cannot create radial tree: no graphData or container');
      return;
    }

    const { width, height } = dimensions;

    // Очищаем предыдущий граф
    d3.select(containerRef.current).selectAll('*').remove();

    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const hierarchy = GraphBuilder.createHierarchy(graphData.nodes, graphData.links);
    if (!hierarchy) {
      console.error('Cannot create radial tree: hierarchy is null');
      return;
    }

    const root = d3.hierarchy(hierarchy);
    
    const treeLayout = d3.tree()
      .size([2 * Math.PI, Math.min(width, height) / 2 * 0.9])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

    const treeData = treeLayout(root);

    // Фильтруем ссылки для скрытых частей
    const visibleLinks = treeData.links().filter(link => {
      const sourceIsVisible = !partsHidden || link.source.data.type !== NodeType.PART;
      const targetIsVisible = !partsHidden || link.target.data.type !== NodeType.PART;
      return sourceIsVisible && targetIsVisible;
    });

    // Рисуем связи
    g.append('g')
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 1.5)
      .selectAll('path')
      .data(visibleLinks)
      .join('path')
      .attr('d', d3.linkRadial()
        .angle(d => d.x)
        .radius(d => d.y)
      );

    // Фильтруем узлы для скрытых частей
    const visibleNodes = treeData.descendants().filter(d => 
      !partsHidden || d.data.data.type !== 'part'
    );

    // Рисуем узлы
    const node = g.append('g')
      .selectAll('g')
      .data(visibleNodes)
      .join('g')
      .attr('transform', d => `
        rotate(${d.x * 180 / Math.PI - 90})
        translate(${d.y},0)
      `);

    // Круги узлов
    const circles = node.append('circle')
      .attr('r', d => GraphBuilder.getNodeRadius(d.data.data))
      .attr('fill', '#fff')
      .attr('stroke', d => getNodeStyles(d.data.data).stroke)
      .attr('stroke-width', d => getNodeStyles(d.data.data).strokeWidth)
      .style('cursor', 'pointer')
      .style('filter', d => getNodeStyles(d.data.data).filter);

    // Сохраняем circles и svg для последующих обновлений
    svgRef.current = { 
      ...svgRef.current, 
      svg, 
      g, 
      zoom: null, 
      treeData, 
      circles 
    };

    // Обработчики для кругов
    circles
      .on('click', function(event, d) {
        event.stopPropagation();
        console.log('Node circle clicked:', d.data.data.name);
        
        handleNodeSelect(d.data.data);
      });

    // Тексты узлов
    node.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => d.x < Math.PI === !d.children ? 6 : -6)
      .attr('text-anchor', d => d.x < Math.PI === !d.children ? 'start' : 'end')
      .attr('transform', d => d.x >= Math.PI ? 'rotate(180)' : null)
      .text(d => d.data.data.name)
      .style('font-size', d => {
        if (d.data.data.type === 'scope') return '10px';
        return '8px';
      })
      .style('font-weight', d => d.depth <= 1 || d.data.data.type === 'block' ? 'normal' : 'normal')
      .style('fill', '#000000')
      .clone(true)
      .lower()
      .attr('stroke', 'white')
      .attr('stroke-width', 3);

    // Обработчик клика на SVG (фон) - закрывает панель и сбрасывает прозрачность
    svg.on('click', function(event) {
      // Проверяем, был ли клик на самом SVG (не на узле)
      if (event.target === this) {
        console.log('SVG background clicked - closing panel and resetting transparency');
        setSelectedNode(null);
        setRelatedNodes({ based: [], extend: [], other: [] });
        // Прозрачность сбросится в updateGraphTransparency
      }
    });

    // Настройка зума
    const zoom = d3.zoom()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    svgRef.current.zoom = zoom;
    
    // Восстанавливаем предыдущую трансформацию или применяем дефолтную
    if (currentTransform) {
      svg.call(zoom.transform, currentTransform);
    } else {
      svg.call(
        zoom.transform,
        d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8)
      );
    }

    console.log('Radial tree visualization created successfully');
    
    // Обновляем прозрачность если есть выбранный узел
    if (selectedNode) {
      setTimeout(() => {
        updateGraphTransparency();
      }, 100);
    }
  };

  // Обновляем handleNodeSelect для вызова updateGraphTransparency
  const handleNodeSelect = (newSelectedNode) => {
    console.log("New node selected:");
    console.log(newSelectedNode);
    setSelectedNode(newSelectedNode);
        
    // Находим связанные узлы
    const related = findRelatedNodes(newSelectedNode);
    setRelatedNodes(related);
    // Прозрачность обновится автоматически в useEffect
  };

  const handleResetZoom = () => {
    if (svgRef.current && svgRef.current.svg) {
      const { svg, zoom } = svgRef.current;
      const { width, height } = dimensions;
      
      svg.transition()
        .duration(750)
        .call(
          zoom.transform,
          d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8)
        );
      
      // Сбрасываем сохраненную трансформацию
      setCurrentTransform(null);
    }
  };

  const handleDownloadSVG = () => {
    if (!svgRef.current) return;

    const { width, height } = dimensions;
    
    const newSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    newSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    newSvg.setAttribute('viewBox', `0 0 ${width * 2} ${height * 2}`);
    newSvg.setAttribute('width', width * 2);
    newSvg.setAttribute('height', height * 2);

    const graphGroup = svgRef.current.g.node().cloneNode(true);
    
    graphGroup.setAttribute('transform', `translate(${width},${height})`);
    
    newSvg.appendChild(graphGroup);

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(newSvg);
    svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `block-graph-${Date.now()}.svg`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const handleToggleHeader = (collapsed) => {
    setIsHeaderCollapsed(collapsed);
  };

  const handleToggleParts = (hidden) => {
    console.log(`Toggling parts visibility: ${hidden ? 'hidden' : 'visible'}`);

    // Сохраняем текущую трансформацию перед изменением состояния
    if (svgRef.current && svgRef.current.svg) {
      const currentZoom = d3.zoomTransform(svgRef.current.svg.node());
      setCurrentTransform(currentZoom);
    }
    
    setPartsHidden(hidden);
  };

  if (!graphData) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        📊 Построение графа...
      </div>
    );
  }

  return (
    <div className="block-graph-container">
      <GraphControls
        onResetZoom={handleResetZoom}
        onDownloadSVG={handleDownloadSVG}
        onToggleParts={handleToggleParts}
        onToggleHeader={handleToggleHeader}
        onDataLoaded={onDataLoaded}
        stats={{
          nodes: graphData.nodes.length,
          links: graphData.links.length
        }}
      />
      
      <div 
        ref={containerRef}
        className="graph-container"
      />
      
      <InformationPanel
        node={selectedNode}
        relatedNodes={relatedNodes}
        visible={!!selectedNode}
        graphData={graphData}
        onNodeSelect={handleNodeSelect}
      />
    </div>
  );
};

export default BlockGraph;