// viewer-app/src/App.jsx

import React, { useState, useEffect } from 'react';
import './App.css'; 
import { applyTransformation } from './utils/geo'; // Импортируем функцию трансформации

function App() {
  const [data, setData] = useState([]);
  const [passports, setPassports] = useState([]);
  const [selectedPassport, setSelectedPassport] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- 1. ЗАГРУЗКА И ОБРАБОТКА ДАННЫХ ---
  useEffect(() => {
    // Предполагаем, что вы консолидировали данные в public/data.json
    fetch('/data.json') 
      .then(res => res.json())
      .then(raw_data => {
        // Очистка и трансформация данных
        const processedData = raw_data.map(item => {
          // Замена запятых на точки и преобразование в число
          const rawX = parseFloat(String(item.RawStartPointX).replace(',', '.'));
          const rawY = parseFloat(String(item.RawStartPointY).replace(',', '.'));
          
          // Применение трансформации
          const localCoords = applyTransformation(rawX, rawY);

          return {
            ...item,
            // Новые поля
            LocalStartPointX: localCoords.x.toFixed(3), // Округляем до 3 знаков
            LocalStartPointY: localCoords.y.toFixed(3),
            // Z-координаты просто копируем
            LocalStartPointZ: parseFloat(String(item.RawStartPointZ).replace(',', '.')).toFixed(3),
            
            // Прочие поля
            RawStartPointX: rawX.toFixed(3),
            PassportName: item.HoleName.split('-').pop() // Извлекаем имя паспорта
          };
        });
        
        setData(processedData);
        // Получаем уникальные имена паспортов для фильтра
        const uniquePassports = [...new Set(processedData.map(p => p.PassportName))].sort();
        setPassports(uniquePassports);
        setSelectedPassport(uniquePassports[0] || null);
        setLoading(false);
      })
      .catch(error => {
        console.error("Ошибка загрузки данных:", error);
        setLoading(false);
      });
  }, []);

  // --- 2. ФИЛЬТРАЦИЯ И ОТОБРАЖЕНИЕ ---
  const filteredData = data.filter(item => 
    !selectedPassport || item.PassportName === selectedPassport
  );

  if (loading) return <h1>Загрузка данных...</h1>;
  if (!data.length) return <h1>Нет данных для отображения. Проверьте data.json.</h1>;

  return (
    <div className="container">
      <h1>Паспорта Бурения (ЛСК)</h1>
      
      <div className="controls">
        <label htmlFor="passport-select">Выберите Паспорт:</label>
        <select
          id="passport-select"
          value={selectedPassport || ''}
          onChange={(e) => setSelectedPassport(e.target.value)}
        >
          {passports.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <h2>{selectedPassport ? `Паспорт: ${selectedPassport}` : 'Все Паспорта'}</h2>
      
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>HoleName</th>
              <th>X (Лок.)</th>
              <th>Y (Лок.)</th>
              <th>Z (Лок.)</th>
              {/* Добавьте остальные важные столбцы здесь */}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, index) => (
              <tr key={index}>
                <td>{item.HoleId}</td>
                <td>{item.HoleName}</td>
                <td>{item.LocalStartPointX}</td>
                <td>{item.LocalStartPointY}</td>
                <td>{item.LocalStartPointZ}</td>
                {/* Добавьте остальные данные */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Здесь можно добавить карту с React-Leaflet */}
      {/* <div className="map-container">
          <MapComponent data={filteredData} />
      </div>
      */}

    </div>
  );
}

export default App;
