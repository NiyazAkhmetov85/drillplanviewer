// src/App.jsx
import React, { useState } from "react";
// import * as XLSX from "xlsx"; // Удален, так как перемещен в useDrillData
import { useDrillData } from './hooks/useDrillData'; // Импорт нового хука
import MapComponent from "./MapComponent";
import GlobalMapComponent from "./GlobalMapComponent";
import "./App.css";

function App() {
  // Используем кастомный хук для всей логики данных и состояния
  const { 
    data, 
    fileName, 
    stats, 
    isLoading, // <-- Новое состояние
    error,     // <-- Новое состояние
    handleFileUpload, 
    handleClear 
  } = useDrillData();

  // Стейт для управления режимом карты оставлен здесь, так как это логика UI
  const [mapMode, setMapMode] = useState('local'); 

  // Сброс режима карты при очистке данных
  const handleClearWithModeReset = () => {
    handleClear();
    setMapMode('local');
  };
  
  const toggleMapMode = (mode) => {
    setMapMode(mode);
  };

  return (
    <div className="App p-6 bg-gray-50 min-h-screen font-sans">
      <header className="mb-6 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">
          Drill Plan Viewer
        </h1>
        <p className="text-sm text-gray-500">
          Отображение паспортов бурения
        </p>
      </header>

      <section className="controls bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            // Отключаем ввод файла во время загрузки
            disabled={isLoading} 
            className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          
          {/* Индикатор загрузки */}
          {isLoading && (
            <div className="flex items-center text-indigo-600 font-medium">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Обработка данных...
            </div>
          )}

          {fileName && !isLoading && (
            <div className="text-sm text-gray-600 flex items-center gap-4">
              Загружен файл: <b className="text-indigo-600">{fileName}</b> ({data.length} скважин)
              <button 
                onClick={handleClearWithModeReset} 
                className="ml-4 py-1 px-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
              >
                Сброс
              </button>
            </div>
          )}
        </div>
        
        {/* Отображение ошибки */}
        {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg" role="alert">
                <p className="font-semibold">Произошла ошибка:</p>
                <p className="text-sm">{error}</p>
            </div>
        )}
      </section>

      {/* Контроль координат */}
      {stats && (
        <section className="stats bg-white p-4 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-2 text-gray-700">Проверка ЛСК (USLOVWGS)</h3>
          <table className="min-w-full divide-y divide-gray-200">
            <tbody className="bg-white divide-y divide-gray-200">
              <tr className="text-sm">
                <td className="px-2 py-1 text-gray-500">min X (Восток)</td>
                <td className="px-2 py-1 font-mono text-gray-800">{stats.minX} м</td>
                <td className="px-2 py-1 text-gray-500">max X (Восток)</td>
                <td className="px-2 py-1 font-mono text-gray-800">{stats.maxX} м</td>
                <td className="px-2 py-1 text-gray-500">Span X</td>
                <td className="px-2 py-1 font-mono text-gray-800">{stats.spanX} м</td>
              </tr>
              <tr className="text-sm">
                <td className="px-2 py-1 text-gray-500">min Y (Север)</td>
                <td className="px-2 py-1 font-mono text-gray-800">{stats.minY} м</td>
                <td className="px-2 py-1 text-gray-500">max Y (Север)</td>
                <td className="px-2 py-1 font-mono text-gray-800">{stats.maxY} м</td>
                <td className="px-2 py-1 text-gray-500">Span Y</td>
                <td className="px-2 py-1 font-mono text-gray-800">{stats.spanY} м</td>
              </tr>
              <tr>
                <td colSpan="6" className="text-center py-2 text-sm text-gray-600">
                  Центр: X={stats.centerX}, Y={stats.centerY}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs mt-2 text-gray-500">
            X (Восток) и Y (Север) соответствуют локальной системе USLOVWGS.
          </p>
        </section>
      )}

      {/* Секция карты */}
      <section className="map-section">
        {data.length > 0 ? (
          <>
            <div className="flex justify-center mb-4 gap-4">
              <button 
                onClick={() => toggleMapMode('local')}
                className={`py-2 px-6 rounded-lg font-medium transition ${mapMode === 'local' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Локальная Карта (USLOVWGS)
              </button>
              <button 
                onClick={() => toggleMapMode('global')}
                className={`py-2 px-6 rounded-lg font-medium transition ${mapMode === 'global' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Глобальная Подложка (WGS 84)
              </button>
            </div>
            {mapMode === 'local' ? (
              <MapComponent data={data} />
            ) : (
              <GlobalMapComponent data={data} />
            )}
          </>
        ) : (
          <div className="placeholder bg-white p-12 rounded-lg shadow-md text-center text-gray-500 h-[85vh] flex items-center justify-center">
            {isLoading ? (
                // Этот блок не должен быть виден, т.к. isLoading обрабатывается выше, но оставлен для полноты.
                <div className="text-lg">Обработка данных...</div>
            ) : (
                <div className="text-lg">Загрузите файл Excel/CSV с паспортами бурения для отображения карты.</div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
