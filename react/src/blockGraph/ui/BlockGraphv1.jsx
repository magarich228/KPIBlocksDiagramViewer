/*
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphBuilder } from '../lib/graphBuilder.js';
import GraphControls from './GraphControls.jsx';
import NodeTooltip from './NodeTooltip.jsx';
import InformationPanel from './InformationPanel.jsx';
import './styles.css';

const BlockGraph = ({ data, onDataLoaded }) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const [tooltip, setTooltip] = useState({ visible: false, node: null, x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [relatedNodes, setRelatedNodes] = useState({ based: [], extend: [] });
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
    if (!node || !graphData) return { based: [], extend: [] };

    const basedNodes = [];
    const extendNodes = [];

    // Проходим по всем блокам выбранного узла
    node.blocks.forEach(block => {
      if (block.based) {
        // Ищем узлы, на которые ссылается based
        graphData.nodes.forEach(graphNode => {
          graphNode.blocks.forEach(graphBlock => {
            if (graphBlock.blockName === block.based || graphBlock.name === block.based) {
              basedNodes.push(graphNode);
            }
          });
        });
      }

      if (block.extend) {
        // Ищем узлы, которые расширяются
        graphData.nodes.forEach(graphNode => {
          graphNode.blocks.forEach(graphBlock => {
            if (graphBlock.blockName === block.extend || graphBlock.name === block.extend) {
              extendNodes.push(graphNode);
            }
          });
        });
      }
    });

    return { based: basedNodes, extend: extendNodes };
  }, [graphData]);

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
      const sourceIsVisible = !partsHidden || link.source.data.type !== 'part';
      const targetIsVisible = !partsHidden || link.target.data.type !== 'part';
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
      .attr('stroke', d => {
        // Подсветка выбранного узла и связанных узлов
        if (selectedNode && d.data.data === selectedNode) {
          return '#ff3860'; // Красный для выбранного узла
        } else if (relatedNodes.based.includes(d.data.data)) {
          return '#8b5cf6'; // Фиолетовый для based узлов
        } else if (relatedNodes.extend.includes(d.data.data)) {
          return '#f59e0b'; // Оранжевый для extend узлов
        }
        return GraphBuilder.getNodeColor(d.data.data);
      })
      .attr('stroke-width', d => {
        // Увеличиваем толщину для выбранного и связанных узлов
        if (selectedNode && d.data.data === selectedNode) {
          return 3;
        } else if (relatedNodes.based.includes(d.data.data) || relatedNodes.extend.includes(d.data.data)) {
          return 2.5;
        }
        return GraphBuilder.getNodeStrokeWidth(d.data.data);
      })
      .style('cursor', 'pointer')
      .style('opacity', d => partsHidden && d.data.data.type === 'part' ? 0 : 1)
      .style('display', d => partsHidden && d.data.data.type === 'part' ? 'none' : null)
      .style('filter', d => {
        // Тень для выбранного и связанных узлов
        if (selectedNode && d.data.data === selectedNode) {
          return 'drop-shadow(0 0 8px rgba(255,56,96,0.8))';
        } else if (relatedNodes.based.includes(d.data.data)) {
          return 'drop-shadow(0 0 6px rgba(139,92,246,0.6))';
        } else if (relatedNodes.extend.includes(d.data.data)) {
          return 'drop-shadow(0 0 6px rgba(245,158,11,0.6))';
        }
        return 'none';
      });

    // Обработчики для кругов
    circles
      .on('click', function(event, d) {
        event.stopPropagation(); // Предотвращаем всплытие на SVG
        console.log('Circle clicked:', d.data.data.name);
        
        const newSelectedNode = d.data.data;
        setSelectedNode(newSelectedNode);
        
        // Находим связанные узлы
        const related = findRelatedNodes(newSelectedNode);
        setRelatedNodes(related);
      })
      .on('mouseover', function(event, d) {
        if (partsHidden && d.data.data.type === 'part') return;
        
        setTooltip({
          visible: true,
          node: d.data.data,
          x: event.pageX,
          y: event.pageY
        });

        d3.select(this)
          .style('stroke', '#ff3860')
          .style('stroke-width', 2.5)
          .style('filter', 'drop-shadow(0 0 6px rgba(255,56,96,0.6))');
      })
      .on('mousemove', function(event) {
        setTooltip(prev => ({
          ...prev,
          x: event.pageX,
          y: event.pageY
        }));
      })
      .on('mouseout', function(event, d) {
        setTooltip({ visible: false, node: null, x: 0, y: 0 });
        
        // Восстанавливаем оригинальные стили с учетом выбранного состояния
        d3.select(this)
          .attr('stroke', () => {
            if (selectedNode && d.data.data === selectedNode) {
              return '#ff3860';
            } else if (relatedNodes.based.includes(d.data.data)) {
              return '#8b5cf6';
            } else if (relatedNodes.extend.includes(d.data.data)) {
              return '#f59e0b';
            }
            return GraphBuilder.getNodeColor(d.data.data);
          })
          .attr('stroke-width', () => {
            if (selectedNode && d.data.data === selectedNode) {
              return 3;
            } else if (relatedNodes.based.includes(d.data.data) || relatedNodes.extend.includes(d.data.data)) {
              return 2.5;
            }
            return GraphBuilder.getNodeStrokeWidth(d.data.data);
          })
          .style('filter', () => {
            if (selectedNode && d.data.data === selectedNode) {
              return 'drop-shadow(0 0 8px rgba(255,56,96,0.8))';
            } else if (relatedNodes.based.includes(d.data.data)) {
              return 'drop-shadow(0 0 6px rgba(139,92,246,0.6))';
            } else if (relatedNodes.extend.includes(d.data.data)) {
              return 'drop-shadow(0 0 6px rgba(245,158,11,0.6))';
            }
            return 'none';
          });
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
      .style('opacity', d => partsHidden && d.data.data.type === 'part' ? 0 : 1)
      .style('display', d => partsHidden && d.data.data.type === 'part' ? 'none' : null)
      .clone(true)
      .lower()
      .attr('stroke', 'white')
      .attr('stroke-width', 3);

    // Обработчик клика на SVG (фон) - закрывает панель
    svg.on('click', function(event) {
      // Проверяем, был ли клик на самом SVG (не на узле)
      if (event.target === this) {
        console.log('SVG background clicked - closing panel');
        setSelectedNode(null);
        setRelatedNodes({ based: [], extend: [] });
      }
    });

    // Настройка зума
    const zoom = d3.zoom()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    
    // Восстанавливаем предыдущую трансформацию или применяем дефолтную
    if (currentTransform) {
      svg.call(zoom.transform, currentTransform);
    } else {
      svg.call(
        zoom.transform,
        d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8)
      );
    }

    svgRef.current = { svg, g, zoom, treeData };
    console.log('Radial tree visualization created successfully');
  };

  const handleResetZoom = () => {
    if (svgRef.current) {
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
      
      <NodeTooltip
        node={tooltip.node}
        x={tooltip.x}
        y={tooltip.y}
        visible={tooltip.visible}
      />
      <InformationPanel
        node={selectedNode}
        relatedNodes={relatedNodes}
        visible={!!selectedNode}
        graphData={graphData}
        onNodeSelect={setSelectedNode}
      />
    </div>
  );
};

export default BlockGraph;
*/