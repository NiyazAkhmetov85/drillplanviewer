// src/App.jsx
import React, { useState } from 'react';
import Papa from 'papaparse';
import MapComponent from './MapComponent'; // Будет создан на следующем шаге
import { toWgs84 } from './utils/geo'; // Будет создан на следующем шаге
import './App.css'; 

function App() {
  const [drillHoles, setDrillHoles] = useState([]);
  const [mapCenter, setMapCenter] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      delimiter: ',', // Учитываем, что разделителем может быть запятая
      complete: (results) => {
        if (results.errors.length) {
          setError('Ошибка парсинга CSV: ' + results.errors[0].message);
          console.error("CSV Errors:", results.errors);
          return;
        }

        try {
          const transformedHoles = results.data
            .map(row => {
              // Используем RawEndPointX и RawEndPointY для координат 
              const X = row.RawEndPointX;
              const Y = row.RawEndPointY;

              if (X === null || Y === null || X === undefined || Y === undefined) {
                  return null; // Пропускаем строки без координат
              }
              
              // Переводим локальные координаты (X, Y) в географические (Lat, Lng)
              const wgs84 = toWgs84(X, Y); 
              
              return {
                id: row.HoleId,
                name: row.HoleName,
                // Записываем сначала широту (Lat), потом долготу (Lng) - так требует Leaflet
                latlng: [wgs84.lat, wgs84.lng], 
                start: [row.RawStartPointX, row.RawStartPointY, row.RawStartPointZ],
                end: [X, Y, row.RawEndPointZ]
              };
            })
            .filter(hole => hole !== null); // Удаляем пропущенные (невалидные) точки
            
          if (transformedHoles.length === 0) {
            setError('Не найдено валидных данных с координатами для отображения.');
            setDrillHoles([]);
            setMapCenter(null);
            return;
          }

          setDrillHoles(transformedHoles);
          
          // Вычисляем среднюю точку для центрирования карты
          const avgLat = transformedHoles.reduce((sum, hole) => sum + hole.latlng[0], 0) / transformedHoles.length;
          const avgLng = transformedHoles.reduce((sum, hole) => sum + hole.latlng[1], 0) / transformedHoles.length;
          setMapCenter([avgLat, avgLng]);

        } catch (e) {
            setError('Ошибка обработки данных или трансформации координат: ' + e.message);
            console.error("Processing Error:", e);
        }
      }
    });
  };

  return (
    <div className="app-container">
      <header>
        <h1>Drilling Plan Viewer (ЛСК)</h1>
      </header>
      
      <div className="controls">
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileUpload} 
          id="csv-upload"
        />
        <label htmlFor="csv-upload" className="file-upload-label">
          {drillHoles.length > 0 
            ? `Загружено скважин: ${drillHoles.length}. Выбрать другой файл.`
            : 'Нажмите, чтобы загрузить CSV файл'}
        </label>
        
        {error && <p className="error-message">⚠️ Ошибка: {error}</p>}
      </div>
      
      {drillHoles.length > 0 && mapCenter ? (
        <MapComponent 
          holes={drillHoles} 
          center={mapCenter}
        />
      ) : (
        <div className="initial-message">
          <p>Загрузите CSV-файл для отображения плана бурения на карте.</p>
        </div>
      )}
    </div>
  );
}

export default App;
