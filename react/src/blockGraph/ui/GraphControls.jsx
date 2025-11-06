import React, { useState } from 'react';
import './styles.css';

const GraphControls = ({ 
  onSearch, 
  onResetZoom, 
  onDownloadSVG, 
  stats,
  onToggleHeader 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  const handleSearch = () => {
    onSearch(searchTerm);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleToggleHeader = () => {
    const newState = !isHeaderCollapsed;
    setIsHeaderCollapsed(newState);
    onToggleHeader(newState);
  };

  return (
    <div className={`header ${isHeaderCollapsed ? 'collapsed' : ''}`}>
      <div className="header-content">
        <h1 className="header-title">Блоки КПИ</h1>
        
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Поиск по имени блока..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button onClick={handleSearch}>🔍 Найти</button>
        </div>

        <div className="legend">
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#2ecc71' }}></div>
            <span>Корневой узел</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#4a90e2' }}></div>
            <span>Блок</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#87ceeb' }}></div>
            <span>Группа блоков без описания</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ff6b35' }}></div>
            <span>Часть блока</span>
          </div>
        </div>

        <div className="controls">
          <button onClick={onResetZoom}>🔍 Сбросить масштаб</button>
          <button onClick={onDownloadSVG}>📥 Скачать SVG</button>
          <div className="stats" id="stats">
            Узлы: {stats.nodes}, Связи: {stats.links}
          </div>
        </div>
      </div>
      
      <div className="header-toggle" onClick={handleToggleHeader}>
        <span className="toggle-icon">▲</span>
      </div>
    </div>
  );
};

export default GraphControls;