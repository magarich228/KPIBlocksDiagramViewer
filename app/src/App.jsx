import React, { useState, useEffect } from 'react';
import BlockGraph, { BlockDataService } from './blockGraph';
import './blockGraph/ui/styles.css';

const SECRET_KEY = 'kpi2025';

function App() {
  const [projectData, setProjectData] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [inputKey, setInputKey] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    // Пока что аутентификация происходит при каждом входе
    setShowAuthModal(true);
  }, []);

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setAuthError('');
    
    if (inputKey.trim() === SECRET_KEY) {
      setShowAuthModal(false);
      loadMockData();
    } else {
      setAuthError('Неверный ключ доступа');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAuthSubmit(e);
    }
  };

  const loadMockData = () => {
    const mockData = BlockDataService.getMockProjectData();
    setProjectData(mockData);
  };

  // Callback для обработки загруженных данных
  const handleDataLoaded = (data) => {
    console.log('Received data:', data);
    setProjectData(data);
  };

  if (showAuthModal) {
    return (
      <div className="auth-overlay">
        <div className="auth-modal">
          <h2>Блоки КПИ</h2>
          <p className="auth-description">Для работы с системой требуется ключ доступа</p>
          
          <form onSubmit={handleAuthSubmit} className="auth-form">
            <div className="auth-input-group">
              <label htmlFor="secretKey">Секретный ключ:</label>
              <input
                id="secretKey"
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Введите ключ доступа..."
                autoFocus
                className="auth-input"
              />
            </div>
            
            {authError && <div className="auth-error">{authError}</div>}
            
            <button type="submit" className="auth-submit">
              Войти
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Если не загружены данные
  if (!projectData) {
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

  // Данные загружены
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