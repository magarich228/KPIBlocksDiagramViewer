import React from 'react';
import { NodeType } from '../model/types.js';

const NodeTooltip = ({ node, x, y, visible }) => {
  if (!visible || !node) return null;

  const nodeData = node;
  const childrenCount = nodeData.children ? nodeData.children.length : 0;

  const getNodeType = (data) => {
    switch (data.type) {
      case NodeType.SCOPE:
        return 'Область';
      case NodeType.BLOCK:
        return 'Блок';
      case NodeType.PART:
        return 'Часть блока';
      default:
        return 'Неизвестный тип';
    }
  };

  const getNodeColor = (data) => {
    switch (data.type) {
      case NodeType.SCOPE:
        const scopeColors = ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd'];
        const depth = Math.min(data.depth, scopeColors.length - 1);
        return scopeColors[depth];
      case NodeType.BLOCK:
        return '#10b981';
      case NodeType.PART:
        return '#86efac';
      default:
        return '#6b7280';
    }
  };

  const renderBlockInfo = (block, index) => {
    const hasCatalogData = block.catalogData;
    
    return (
      <div 
        key={index}
        style={{ 
          margin: '8px 0', 
          padding: '8px', 
          background: hasCatalogData ? '#fff3cd' : '#f8f9fa', 
          borderRadius: '4px',
          borderLeft: `3px solid ${getNodeColor(nodeData)}`
        }}
      >
        <strong style={{ color: '#333', fontSize: '12px' }}>{block.name}</strong>
        <br />
        
        {/* Описание из каталога или из блока */}
        {(block.description || (hasCatalogData && block.catalogData.description)) && (
          <span style={{ color: '#666', fontSize: '11px' }}>
            {block.description || block.catalogData.description}
          </span>
        )}
        
        {block.scope && (
          <div style={{ marginTop: '5px', fontSize: '11px' }}>
            <strong>Область:</strong> {block.scope}
          </div>
        )}
        
        {block.blockPart && block.blockPart.length > 0 && (
          <div style={{ marginTop: '5px', fontSize: '11px' }}>
            <strong>Часть:</strong> /{block.blockPart.join('/')}
          </div>
        )}
        
        {block.aspects && (
          <div style={{ marginTop: '5px', fontSize: '11px' }}>
            <strong>Аспекты:</strong> {block.aspects}
          </div>
        )}
        
        {block.based && (
          <div style={{ marginTop: '5px', fontSize: '11px'}}>
            <strong>Основан на:</strong> {block.based}
          </div>
        )}

        {block.extend && (
          <div style={{ marginTop: '5px', fontSize: '11px'}}>
            <strong>Расширяет:</strong> {block.extend}
          </div>
        )}
        <div style={{ marginTop: '5px' }}>
          <small style={{ 
            color: hasCatalogData ? '#856404' : '#999', 
            fontSize: '10px',
            fontStyle: hasCatalogData ? 'italic' : 'normal'
          }}>
            {hasCatalogData ? '📚 Данные из глоссария' : block.directory}
          </small>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="tooltip"
      style={{
        left: x + 15,
        top: y - 15,
        opacity: visible ? 1 : 0
      }}
    >
      <div style={{ borderLeft: `3px solid ${getNodeColor(nodeData)}`, paddingLeft: '8px' }}>
        <strong style={{ color: '#333', fontSize: '13px' }}>{nodeData.name}</strong>
        <br />
        <div style={{ color: '#666', fontSize: '11px', margin: '5px 0' }}>
          Путь: {nodeData.path}<br />
          Глубина: {nodeData.depth}<br />
          Тип: {getNodeType(nodeData)}<br />
          Дочерних узлов: {childrenCount}
        </div>
        
        {nodeData.description && (
          <div style={{ marginTop: '5px', fontSize: '11px' }}>
            <strong>Описание:</strong> {nodeData.description}
          </div>
        )}
        
        <div style={{ marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
          <strong>Информация о блоке:</strong>
          {nodeData.blocks && nodeData.blocks.length > 0 ? (
            nodeData.blocks.map((block, index) => renderBlockInfo(block, index))
          ) : (
            <div style={{ color: '#999', fontStyle: 'italic', padding: '8px', fontSize: '11px' }}>
              Нет информации о блоках
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeTooltip;