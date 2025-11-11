import React from 'react';

const NodeTooltip = ({ node, x, y, visible }) => {
  if (!visible || !node) return null;

  const nodeData = node;
  const childrenCount = nodeData.children ? nodeData.children.length : 0;

  const getNodeType = (data) => {
    if (data.isRoot) return 'Корневой узел';
    if (data.isBlockNode) return 'Блок';
    if (data.isPartNode) return 'Часть блока';
    return 'Группа блоков';
  };

  const getNodeColor = (data) => {
    if (data.isRoot) return '#2ecc71';
    if (data.isPartNode) return '#ff6b35';
    if (data.isBlockNode) return '#4a90e2';
    return '#87ceeb';
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
        
        {/* Русское название из каталога */}
        {hasCatalogData && block.catalogData.ruFullName && (
          <div style={{ marginTop: '5px', fontSize: '11px' }}>
            <strong>Русское название:</strong> {block.catalogData.ruFullName}
          </div>
        )}
        
        {/* Полное название из каталога */}
        {hasCatalogData && block.catalogData.fullName && (
          <div style={{ marginTop: '5px', fontSize: '11px' }}>
            <strong>Полное название:</strong> {block.catalogData.fullName}
          </div>
        )}
        
        {block.parents && block.parents.length > 0 && (
          <div style={{ marginTop: '5px', fontSize: '11px' }}>
            <strong>Родители:</strong> {block.parents.join(' → ')}
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