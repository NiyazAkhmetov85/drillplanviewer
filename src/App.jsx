## 3. 🖥️ `src/App.jsx`

Этот файл управляет пользовательским интерфейсом и переключением карт.

```jsx
// src/App.jsx
import React, { useState } from "react";
import * as XLSX from "xlsx";
import MapComponent from "./MapComponent";
import GlobalMapComponent from "./GlobalMapComponent"; // Импортируем компонент глобальной карты
import "./App.css";

function App() {
  const [data, setData] = useState([]);
  const [fileName, setFileName] = useState(null);
  const [stats, setStats] = useState(null);
  // Новый стейт для управления режимом карты: 'local' или 'global'
  const [mapMode, setMapMode] = useState('local'); // По умолчанию — локальная

  // === Вспомогательная функция для безопасного парсинга чисел ===
  // Корректно обрабатывает десятичные разделители (запятую или точку)
  const safeParseFloat = (value) => {
    if (value === null || value === undefined || value === "") {
      return NaN;
    }

    // Преобразуем в строку, чтобы гарантировать возможность замены запятой
    // и удаляем начальные/конечные пробелы.
    let strValue = String(value).trim();

    // Заменяем запятую на точку перед парсингом
    strValue = strValue.replace(",", ".");
    
    return parseFloat(strValue);
  };

  // === Обработка импорта файлов Excel/CSV ===
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet);

      console.log("📘 Импортировано строк:", json.length);

      // === Проверка наличия ключевых колонок ===
      const requiredFields = [
        "HoleName",
        "RawStartPointX",
        "RawStartPointY",
      ];

      const validHeaders = requiredFields.every((key) => key in (json[0] || {}));

      if (!validHeaders) {
        console.error(
          "❌ Ошибка: файл не содержит необходимых столбцов. Требуются: " +
          requiredFields.join(", ")
        );
        setData([]);
        setFileName(null);
        return;
      }

      // === Преобразуем данные, используя безопасный парсинг ===
      const processed = json.map((row) => ({
        WellName: row.HoleName || "N/A",
        // X соответствует Востоку (Easting), Y — Северу (Northing) в USLOVWGS
        DisplayX: safeParseFloat(row.RawStartPointX), 
        DisplayY: safeParseFloat(row.RawStartPointY),
      }));


      // === Проверка и фильтрация NaN ===
      const validData = processed.filter(
        (p) => !isNaN(p.DisplayX) && !isNaN(p.DisplayY)
      );

      console.log("✅ Обработано валидных записей:", validData.length);

      // === Контроль диапазонов координат (Только X и Y) ===
      const xs = validData.map((d) => d.DisplayX);
      const ys = validData.map((d) => d.DisplayY);

      if (xs.length === 0) {
        setStats(null);
        setData([]);
        return;
      }

      const stats = {
        minX: Math.min(...xs).toFixed(3),
        maxX: Math.max(...xs).toFixed(3),
        spanX: (Math.max(...xs) - Math.min(...xs)).toFixed(3),
        minY: Math.min(...ys).toFixed(3),
        maxY: Math.max(...ys).toFixed(3),
        spanY: (Math.max(...ys) - Math.min(...ys)).toFixed(3),
        centerX: (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1),
        centerY: (ys.reduce((a, b) => a + b, 0) / ys.length).toFixed(1),
      };

      setStats(stats);
      setData(validData);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleClear = () => {
    setData([]);
    setFileName(null);
    setStats(null);
    setMapMode('local'); // Сброс режима карты
  };
  
  const toggleMapMode = (mode) => {
      setMapMode(mode);
  };

  return (
    <div className="App p-6 bg-gray-50 min-h-screen font-sans">
      <header className="mb-6 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">
            ⛏️ Drill Plan Viewer (USLOVWGS)
        </h1>
        <p className="text-sm text-gray-500">
            Отображение паспортов бурения в локальной системе координат USLOVWGS (Восток, Север)
        </p>
      </header>

      <section className="controls bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {fileName && (
              <div className="text-sm text-gray-600 flex items-center gap-4">
                Загружен файл: <b className="text-indigo-600">{fileName}</b> ({data.length} скважин)
                <button 
                    onClick={handleClear} 
                    className="ml-4 py-1 px-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                >
                    Сброс
                </button>
              </div>
            )}
        </div>
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
                // Отображаем локальную карту
                <MapComponent data={data} />
            ) : (
                // Отображаем глобальную карту с подложкой
                <GlobalMapComponent data={data} />
            )}
          </>
        ) : (
          <div className="placeholder bg-white p-12 rounded-lg shadow-md text-center text-gray-500 h-[85vh] flex items-center justify-center">
            Загрузите файл Excel/CSV с паспортами бурения для отображения карты.
          </div>
        )}
      </section>
    </div>
  );
}

export default App;


Эти чистые файлы должны устранить ошибку `cite_start is not defined` и обеспечить корректную работу приложения.
