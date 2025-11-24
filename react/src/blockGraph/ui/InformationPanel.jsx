import React, { useState } from 'react';
import { NodeType } from '../model/types.js';
import './styles.css';

const InformationPanel = ({ node, relatedNodes, visible, graphData, onNodeSelect }) => {
  if (!node || !visible) return null;

  console.log(node);
  const [showParts, setShowParts] = useState(false);

  // Находим дочерние узлы
  const childNodes = graphData.links
    .filter(link => link.source === node.id)
    .map(link => graphData.nodes.find(n => n.id === link.target))
    .filter(Boolean);

  const getNodeTypeText = (type) => {
    switch (type) {
      case NodeType.SCOPE: return 'Область';
      case NodeType.BLOCK: return 'Блок';
      case NodeType.PART: return 'Часть блока';
      default: return 'Неизвестный тип';
    }
  };

  const getNodeColor = (nodeData) => {
    switch (nodeData.type) {
      case NodeType.SCOPE:
        const scopeColors = ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd'];
        const depth = Math.min(nodeData.depth, scopeColors.length - 1);
        return scopeColors[depth];
      case NodeType.BLOCK:
        return '#10b981';
      case NodeType.PART:
        return '#86efac';
      default:
        return '#6b7280';
    }
  };

  const handleNodeClick = (clickedNode) => {
    if (onNodeSelect) {
      onNodeSelect(clickedNode);
    }
  };

  // Функция для переключения показа частей
  const toggleShowParts = () => {
    setShowParts(prev => !prev);
  };

  return (
    <div className="information-panel">
      {/* Заголовок панели */}
      <div className="panel-header">
        <h3>Информация о узле</h3>
        <button 
          className="close-button"
          onClick={() => onNodeSelect(null)}
        >
          ×
        </button>
      </div>

      {/* Основная информация о узле */}
      <div className="section">
        <div className="info-grid">
          <div className="info-item">
            <label>Название:</label>
            <span className="node-name" style={{ color: getNodeColor(node) }}>
              {node.name}
            </span>
          </div>
          <div className="info-item">
            <label>Тип:</label>
            <span>{getNodeTypeText(node.type)}</span>
          </div>
          <div className="info-item">
            <label>Путь:</label>
            <span className="node-path">{node.path}</span>
          </div>
          <div className="info-item">
            <label>Глубина:</label>
            <span>{node.depth}</span>
          </div>
        </div>
      </div>

      {/* Информация о области */}
      {node.type === NodeType.SCOPE && (
        <div className='section'>
          <h4>Информация о области</h4>
          <div className='scope-info'>
            {node.name && (
              <div className='info-item'>
                <label>Имя области</label>
                <span>{node.name}</span>
              </div>
            )}
            {node.description && (
              <div className='info-item'>
                <label>Описание</label>
                <span>{node.description}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Информация о блоках*/}
      {node.type === NodeType.BLOCK && node.blocks && node.blocks.length > 0 && (
        <div className="section">
          <h4>Информация о блоке</h4>
          {node.blocks
            .filter((block) => !block.blockPart || block.blockPart.length === 0)
            .map((block, index) => (
            <div key={index} className="block-info">
              {block.blockName && (
                <div className="info-item">
                  <label>Имя блока:</label>
                  <span>{block.blockName}</span>
                </div>
              )}
              {block.description && (
                <div className="info-item">
                  <label>Описание:</label>
                  <span>{block.description}</span>
                </div>
              )}
              {block.aspects && (
                <div className="info-item">
                  <label>Аспекты:</label>
                  <span>{block.aspects}</span>
                </div>
              )}
              {block.based && (
                <div className="info-item">
                  <label>Основан на:</label>
                  <span 
                    className="clickable-node"
                    style={{ color: '#8b5cf6' }}
                    onClick={() => {
                      const basedNode = relatedNodes.based.find(n => 
                        n.blocks.some(b => b.blockName === block.based || b.name === block.based)
                      );
                      if (basedNode) handleNodeClick(basedNode);
                    }}
                  >
                    {block.based}
                  </span>
                </div>
              )}
              {block.extend && (
                <div className="info-item">
                  <label>Расширяет:</label>
                  <span 
                    className="clickable-node"
                    style={{ color: '#f59e0b' }}
                    onClick={() => {
                      const extendNode = relatedNodes.extend.find(n => 
                        n.blocks.some(b => b.blockName === block.extend || b.name === block.extend)
                      );
                      if (extendNode) handleNodeClick(extendNode);
                    }}
                  >
                    {block.extend}
                  </span>
                </div>
              )}
              {block.directory && (
                <div className="info-item">
                  <label>Директория:</label>
                  <span>{block.directory}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Информация о частях блока */}
      {node.type === NodeType.BLOCK && node.blocks && node.blocks.some(block => block.blockPart && block.blockPart.length > 0) && (
        <div className="section">
          <h4 className="clickable-header" onClick={toggleShowParts}>
            Информация о частях блока {showParts ? '▼' : '►'}
          </h4>
          {showParts && node.blocks
            .filter((block) => block.blockPart && block.blockPart.length > 0)
            .map((block, index) => (
            <div key={index} className="part-info">
              {block.blockPart && block.blockPart.length > 0 && (
                <div className="info-item">
                  <label>Часть:</label>
                  <span>{block.blockPart.join('/')}</span>
                </div>
              )}
              {block.description && (
                <div className="info-item">
                  <label>Описание:</label>
                  <span>{block.description}</span>
                </div>
              )}
              {block.aspects && (
                <div className="info-item">
                  <label>Аспекты:</label>
                  <span>{block.aspects}</span>
                </div>
              )}
              {block.based && (
                <div className="info-item">
                  <label>Основана на:</label>
                  <span 
                    className="clickable-node"
                    style={{ color: '#8b5cf6' }}
                    onClick={() => {
                      const basedNode = relatedNodes.based.find(n => 
                        n.blocks.some(b => b.blockName === block.based || b.name === block.based)
                      );
                      if (basedNode) handleNodeClick(basedNode);
                    }}
                  >
                    {block.based}
                  </span>
                </div>
              )}
              {block.extend && (
                <div className="info-item">
                  <label>Расширяет:</label>
                  <span 
                    className="clickable-node"
                    style={{ color: '#f59e0b' }}
                    onClick={() => {
                      const extendNode = relatedNodes.extend.find(n => 
                        n.blocks.some(b => b.blockName === block.extend || b.name === block.extend)
                      );
                      if (extendNode) handleNodeClick(extendNode);
                    }}
                  >
                    {block.extend}
                  </span>
                </div>
              )}
              {block.directory && (
                <div className="info-item">
                  <label>Директория:</label>
                  <span>{block.directory}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Информация о выбранном узле части */}
      {node.type === NodeType.PART && node.blocks && node.blocks.some(block => block.blockPart && block.blockPart.length > 0) && (
        <div className="section">
          <h4>Информация о части</h4>
          {node.blocks
            .filter((block) => block.blockPart && block.blockPart.length > 0)
            .map((block, index) => (
            <div key={index} className="part-info">
              {block.blockPart && block.blockPart.length > 0 && (
                <div className="info-item">
                  <label>Часть:</label>
                  <span>{block.blockPart.join('/')}</span>
                </div>
              )}
              {block.description && (
                <div className="info-item">
                  <label>Описание:</label>
                  <span>{block.description}</span>
                </div>
              )}
              {block.aspects && (
                <div className="info-item">
                  <label>Аспекты:</label>
                  <span>{block.aspects}</span>
                </div>
              )}
              {block.based && (
                <div className="info-item">
                  <label>Основана на:</label>
                  <span 
                    className="clickable-node"
                    style={{ color: '#8b5cf6' }}
                    onClick={() => {
                      const basedNode = relatedNodes.based.find(n => 
                        n.blocks.some(b => b.blockName === block.based || b.name === block.based)
                      );
                      if (basedNode) handleNodeClick(basedNode);
                    }}
                  >
                    {block.based}
                  </span>
                </div>
              )}
              {block.extend && (
                <div className="info-item">
                  <label>Расширяет:</label>
                  <span 
                    className="clickable-node"
                    style={{ color: '#f59e0b' }}
                    onClick={() => {
                      const extendNode = relatedNodes.extend.find(n => 
                        n.blocks.some(b => b.blockName === block.extend || b.name === block.extend)
                      );
                      if (extendNode) handleNodeClick(extendNode);
                    }}
                  >
                    {block.extend}
                  </span>
                </div>
              )}
              {block.directory && (
                <div className="info-item">
                  <label>Директория:</label>
                  <span>{block.directory}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Связанные узлы */}
      {(relatedNodes.based.length > 0 || relatedNodes.extend.length > 0) && (
        <div className="section">
          <h4>Связанные узлы</h4>
          {relatedNodes.based.length > 0 && (
            <div className="related-nodes">
              <h5 style={{ color: '#8b5cf6' }}>Основаны на:</h5>
              {relatedNodes.based.map((relatedNode, index) => (
                <div 
                  key={index}
                  className="related-node clickable-node"
                  onClick={() => handleNodeClick(relatedNode)}
                >
                  <span className="node-bullet" style={{ background: '#8b5cf6' }}></span>
                  {relatedNode.name} ({getNodeTypeText(relatedNode.type)})
                </div>
              ))}
            </div>
          )}
          {relatedNodes.extend.length > 0 && (
            <div className="related-nodes">
              <h5 style={{ color: '#f59e0b' }}>Расширяют:</h5>
              {relatedNodes.extend.map((relatedNode, index) => (
                <div 
                  key={index}
                  className="related-node clickable-node"
                  onClick={() => handleNodeClick(relatedNode)}
                >
                  <span className="node-bullet" style={{ background: '#f59e0b' }}></span>
                  {relatedNode.name} ({getNodeTypeText(relatedNode.type)})
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Дочерние узлы */}
      {childNodes.length > 0 && (
        <div className="section">
          <h4>Дочерние узлы ({childNodes.length})</h4>
          <div className="child-nodes">
            {childNodes.map((child, index) => (
              <div 
                key={index}
                className="child-node clickable-node"
                onClick={() => handleNodeClick(child)}
              >
                <span 
                  className="node-bullet" 
                  style={{ background: getNodeColor(child) }}
                ></span>
                {child.name} ({getNodeTypeText(child.type)})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Легенда подсветки */}
      <div className="section legend-section">
        <h4>Легенда подсветки</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#ff3860' }}></span>
            <span>Выбранный узел</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#8b5cf6' }}></span>
            <span>Основан на (based)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#f59e0b' }}></span>
            <span>Расширяет (extend)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InformationPanel;