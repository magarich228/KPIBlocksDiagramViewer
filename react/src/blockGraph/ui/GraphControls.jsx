import React, { useState } from 'react';
import { BlockDataService } from '../api/blockDataService.js';
import './styles.css';

const GraphControls = ({
  onResetZoom, 
  onDownloadSVG, 
  onToggleParts,
  stats,
  onToggleHeader,
  onDataLoaded
}) => {
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [fileSystemAvailable, setFileSystemAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [partsHidden, setPartsHidden] = useState(false);

  React.useEffect(() => {
    // Проверка доступности File System API при монтировании
    setFileSystemAvailable(BlockDataService.isFileSystemAPISupported());
  }, []);

  const handleToggleHeader = () => {
    const newState = !isHeaderCollapsed;
    setIsHeaderCollapsed(newState);
    onToggleHeader(newState);
  };

  const handleToggleParts = () => {
    const newState = !partsHidden;
    setPartsHidden(newState);
    onToggleParts(newState);
  };

  const handleSelectDirectory = async () => {
    if (!fileSystemAvailable) return;
    
    try {
      setLoading(true);
      const data = await BlockDataService.getBlockDefinitions();
      onDataLoaded(data); // Передача загруженных данных обратно в App
    } catch (error) {
      console.error('Error loading directory:', error);
      // TODO: Уведомление об ошибке
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`header ${isHeaderCollapsed ? 'collapsed' : ''}`}>
      <div className="header-content" style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 className="header-title">Блоки КПИ</h1>

        <div className="legend" style={{ 
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#2ecc71' }}></div>
            <span>Корневой узел</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#4a90e2' }}></div>
            <span>Блок</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ff6b35' }}></div>
            <span>Часть блока</span>
          </div>
        </div>

        <div className="controls">
          {fileSystemAvailable && (
            <button 
              onClick={handleSelectDirectory}
              disabled={loading}
              style={{
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '⏳ Загрузка...' : '📁 Загрузить проект'}
            </button>
          )}
          <button onClick={onResetZoom}>🔍 Сбросить масштаб</button>
          <button onClick={onDownloadSVG}>📥 Скачать SVG</button>
          <button onClick={handleToggleParts}>
            {partsHidden ? '👁️ Показать части' : '👁️ Скрыть части'}
          </button>
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