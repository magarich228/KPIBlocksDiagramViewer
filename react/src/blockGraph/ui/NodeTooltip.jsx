import React from 'react';

const NodeTooltip = ({ node, x, y, visible }) => {
  if (!visible || !node) return null;

  const getNodeType = (node) => {
    if (node.isRoot) return 'Корневой узел';
    if (node.isBlockNode) return 'Блок';
    if (node.isPartNode) return 'Часть блока';
    return 'Группа блоков';
  };

  const getNodeColor = (node) => {
    if (node.isRoot) return '#2ecc71';
    if (node.isPartNode) return '#ff6b35';
    if (node.isBlockNode) return '#4a90e2';
    return '#87ceeb';
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
      <div style={{ borderLeft: `3px solid ${getNodeColor(node)}`, paddingLeft: '8px' }}>
        <strong style={{ color: '#333', fontSize: '13px' }}>{node.name}</strong>
        <br />
        <div style={{ color: '#666', fontSize: '11px', margin: '5px 0' }}>
          Путь: {node.path}<br />
          Глубина: {node.depth}<br />
          Тип: {getNodeType(node)}<br />
          Дочерних узлов: {node.children ? node.children.length : 0}
        </div>
        
        <div style={{ marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
          <strong>Информация о блоке:</strong>
          {node.blocks && node.blocks.length > 0 ? (
            node.blocks.map((block, index) => (
              <div 
                key={index}
                style={{ 
                  margin: '8px 0', 
                  padding: '8px', 
                  background: '#f8f9fa', 
                  borderRadius: '4px',
                  borderLeft: `3px solid ${getNodeColor(node)}`
                }}
              >
                <strong style={{ color: '#333', fontSize: '12px' }}>{block.name}</strong>
                <br />
                <span style={{ color: '#666', fontSize: '11px' }}>{block.description}</span>
                
                {block.parents && block.parents.length > 0 && (
                  <div style={{ marginTop: '5px' }}>
                    <strong>Родители:</strong> {block.parents.join(' → ')}
                  </div>
                )}
                
                {block.blockPart && block.blockPart.length > 0 && (
                  <div style={{ marginTop: '5px' }}>
                    <strong>Часть:</strong> /{block.blockPart.join('/')}
                  </div>
                )}
                
                {block.aspects && (
                  <div style={{ marginTop: '5px' }}>
                    <strong>Аспекты:</strong> {block.aspects}
                  </div>
                )}
                
                <div style={{ marginTop: '5px' }}>
                  <small style={{ color: '#999' }}>{block.directory}</small>
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: '#999', fontStyle: 'italic', padding: '8px' }}>
              Нет информации о блоках
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeTooltip;