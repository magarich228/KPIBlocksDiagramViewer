import React, { useState, useEffect } from 'react';
import BlockGraph, { BlockDataService } from './blockGraph';
import './blockGraph/ui/styles.css';

function App() {
  const [blockData, setBlockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileSystemAvailable, setFileSystemAvailable] = useState(false);

  useEffect(() => {
    // Проверяем доступность File System API
    setFileSystemAvailable(BlockDataService.isFileSystemAPISupported());
    
    // Автоматически загружаем mock-данные при старте
    loadMockData();
  }, []);

  const loadMockData = () => {
    setLoading(true);
    const mockData = BlockDataService.getMockBlocks();
    setBlockData(mockData);
    setLoading(false);
  };

  const handleSelectDirectory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await BlockDataService.getBlockDefinitions();
      setBlockData(data);
    } catch (err) {
      console.error('Error loading directory:', err);
      setError('Не удалось загрузить данные из файловой системы. Используются демо-данные.');
      // В случае ошибки загружаем mock-данные
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Загрузка данных...
      </div>
    );
  }

  return (
    <div className="App">
      {/* Панель выбора директории */}
      {fileSystemAvailable && (
        <div style={{
          position: 'fixed',
          top: '50px',
          right: '10px',
          zIndex: 10000,
          background: 'white',
          padding: '10px',
          borderRadius: '5px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          border: '1px solid #ddd'
        }}>
          <button 
            onClick={handleSelectDirectory}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#4a90e2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📁 Выбрать директорию
          </button>
          {error && (
            <div style={{ 
              marginTop: '10px', 
              color: '#e74c3c', 
              fontSize: '12px',
              maxWidth: '200px'
            }}>
              {error}
            </div>
          )}
        </div>
      )}
      
      <BlockGraph data={blockData} />
    </div>
  );
}

export default App;