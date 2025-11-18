import React, { useState, useEffect } from 'react';
import BlockGraph, { BlockDataService } from './blockGraph';
import './blockGraph/ui/styles.css';

function App() {
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Автоматическая загрузка mock-данных при старте
    loadMockData();
  }, []);

  const loadMockData = () => {
    setLoading(true);
    const mockData = BlockDataService.getMockProjectData();
    setProjectData(mockData);
    setLoading(false);
  };

  // Callback для обработки загруженных данных
  const handleDataLoaded = (data) => {
    console.log('Received data:', data);
    setProjectData(data);
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
        ⏳ Загрузка данных...
      </div>
    );
  }

  return (
    <div className="App">
      <BlockGraph 
        data={projectData} 
        onDataLoaded={handleDataLoaded}
      />
    </div>
  );
}

export default App;