import React, { useState, useEffect } from 'react';
import BlockGraph, { BlockDataService } from './blockGraph';
import './blockGraph/ui/styles.css';

function App() {
  const [blockData, setBlockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('App: Loading block data...');
        const data = await BlockDataService.getBlockDefinitions();
        console.log('App: Received data:', data);
        setBlockData(data);
      } catch (err) {
        console.error('App: Error loading data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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
        Загрузка данных блоков...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#e74c3c'
      }}>
        Ошибка загрузки данных: {error}
      </div>
    );
  }

  console.log('App: Rendering BlockGraph with data:', blockData);

  return (
    <div className="App">
      <BlockGraph data={blockData} />
    </div>
  );
}

export default App;