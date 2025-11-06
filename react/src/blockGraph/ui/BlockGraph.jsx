import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphBuilder } from '../lib/graphBuilder.js';
import GraphControls from './GraphControls.jsx';
import NodeTooltip from './NodeTooltip.jsx';
import './styles.css';

const BlockGraph = ({ data }) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const [tooltip, setTooltip] = useState({ visible: false, node: null, x: 0, y: 0 });
  const [graphData, setGraphData] = useState(null);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [dimensions, setDimensions] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });

  const updateDimensions = useCallback(() => {
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight
    });
  }, []);

  useEffect(() => {
    if (data && data.length > 0) {
      const graph = GraphBuilder.buildGraph(data);
      setGraphData(graph);
    }
  }, [data]);

  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [updateDimensions]);

  useEffect(() => {
    if (graphData && dimensions.width > 0 && dimensions.height > 0) {
      createRadialTree();
    }
  }, [graphData, dimensions]);

  const createRadialTree = () => {
    if (!graphData || !containerRef.current) return;

    const { width, height } = dimensions;

    d3.select(containerRef.current).selectAll('*').remove();

    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const hierarchy = GraphBuilder.createHierarchy(graphData.nodes, graphData.links);
    if (!hierarchy) return;

    const root = d3.hierarchy(hierarchy);
    const treeLayout = d3.tree()
      .size([2 * Math.PI, Math.min(width, height) / 2 - 100])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

    const treeData = treeLayout(root);

    g.append('g')
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 1.5)
      .selectAll('path')
      .data(treeData.links())
      .join('path')
      .attr('d', d3.linkRadial()
        .angle(d => d.x)
        .radius(d => d.y)
      );

    const node = g.append('g')
      .selectAll('g')
      .data(treeData.descendants())
      .join('g')
      .attr('transform', d => `
        rotate(${d.x * 180 / Math.PI - 90})
        translate(${d.y},0)
      `);

    node.append('circle')
      .attr('r', d => GraphBuilder.getNodeRadius(d.data.data))
      .attr('fill', '#fff')
      .attr('stroke', d => GraphBuilder.getNodeColor(d.data.data))
      .attr('stroke-width', d => GraphBuilder.getNodeStrokeWidth(d.data.data))
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        setTooltip({
          visible: true,
          node: d.data.data,
          x: event.pageX,
          y: event.pageY
        });

        d3.select(this)
          .style('stroke', '#ff3860')
          .style('stroke-width', 4)
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
        
        d3.select(this)
          .style('stroke', GraphBuilder.getNodeColor(d.data.data))
          .style('stroke-width', GraphBuilder.getNodeStrokeWidth(d.data.data))
          .style('filter', 'none');
      });

    node.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => d.x < Math.PI === !d.children ? 6 : -6)
      .attr('text-anchor', d => d.x < Math.PI === !d.children ? 'start' : 'end')
      .attr('transform', d => d.x >= Math.PI ? 'rotate(180)' : null)
      .text(d => d.data.data.name)
      .style('font-size', d => {
        if (d.data.data.isRoot) return '14px';
        if (d.depth <= 1) return '12px';
        return '10px';
      })
      .style('font-weight', d => d.depth <= 1 || d.data.data.isBlockNode ? 'bold' : 'normal')
      .style('fill', '#000000')
      .clone(true)
      .lower()
      .attr('stroke', 'white')
      .attr('stroke-width', 3);

    const zoom = d3.zoom()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8)
    );

    svgRef.current = { svg, g, zoom, treeData };
  };

  const handleSearch = (searchTerm) => {
    console.log('Search:', searchTerm);
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
    }
  };

  const handleDownloadSVG = () => {
    console.log('Download SVG');
  };

  const handleToggleHeader = (collapsed) => {
    setIsHeaderCollapsed(collapsed);
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
        Построение графа...
      </div>
    );
  }

  return (
    <div className="block-graph-container">
      <GraphControls
        onSearch={handleSearch}
        onResetZoom={handleResetZoom}
        onDownloadSVG={handleDownloadSVG}
        onToggleHeader={handleToggleHeader}
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
    </div>
  );
};

export default BlockGraph;