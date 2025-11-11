import React, { useState, useEffect, useMemo, useRef } from "react";
// Ошибка: Cannot resolve external imports.
// XLSX и Three.js (для MapComponent) будут загружаться через <script> теги.
// import * as XLSX from "xlsx"; // Удаляем импорт
// import MapComponent from "./MapComponent"; // Компонент будет определен ниже
// import "./App.css"; // Удаляем импорт, используем Tailwind CSS

// Компонент для отображения плана бурения
// Используем SVG для простой 2D-визуализации
const MapComponent = ({ data, stats }) => {
  const svgRef = useRef(null);
  
  if (data.length === 0 || !stats) {
    return <div className="text-gray-500 p-4">Нет данных для отображения.</div>;
  }

  // Размеры SVG-контейнера
  const width = 800;
  const height = 600;

  // Расчет масштабирования и смещения (Padding 10% от меньшего размера span)
  const paddingX = stats.spanX * 0.1;
  const paddingY = stats.spanY * 0.1;

  const effectiveSpanX = stats.spanX + paddingX * 2;
  const effectiveSpanY = stats.spanY + paddingY * 2;
  
  const scaleX = width / effectiveSpanX;
  const scaleY = height / effectiveSpanY;
  
  const scale = Math.min(scaleX, scaleY);
  
  // Расчет смещения для центрирования
  const offsetX = (width - effectiveSpanX * scale) / 2 + (stats.minX - paddingX) * scale;
  const offsetY = (height - effectiveSpanY * scale) / 2 + (stats.minY - paddingY) * scale;


  // Функция преобразования координат (из геологических в экранные)
  const toScreenX = (x) => (x - (stats.minX - paddingX)) * scale;
  // Обратная ось Y для 2D-плана
  const toScreenY = (y) => height - (y - (stats.minY - paddingY)) * scale;

  return (
    <div className="flex flex-col items-center p-4">
        <div className="text-sm text-gray-600 mb-2">
            2D План (X-Y) | Масштаб: {scale.toFixed(2)} px/м
        </div>
        <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
            <svg ref={svgRef} width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="bg-gray-50 border border-dashed border-gray-300">
                {/* Сетка - Упрощенная */}
                <line x1={toScreenX(stats.centerX)} y1={0} x2={toScreenX(stats.centerX)} y2={height} stroke="#ccc" strokeDasharray="4 2" />
                <line x1={0} y1={toScreenY(stats.centerY)} x2={width} y2={toScreenY(stats.centerY)} stroke="#ccc" strokeDasharray="4 2" />
                
                {/* Скважины */}
                {data.map((hole, index) => {
                    const startX = toScreenX(hole.DisplayX);
                    const startY = toScreenY(hole.DisplayY);
                    const endX = toScreenX(hole.DisplayEndX);
                    const endY = toScreenY(hole.DisplayEndY);

                    // Расчет длины для цвета (упрощенно)
                    const length = Math.sqrt(
                        Math.pow(hole.DisplayEndX - hole.DisplayX, 2) +
                        Math.pow(hole.DisplayEndY - hole.DisplayY, 2) +
                        Math.pow(hole.DisplayEndZ - hole.DisplayZ, 2)
                    );
                    
                    const colorIntensity = Math.min(1, length / 10); // 10m max intensity
                    const color = `hsl(${240 * (1 - colorIntensity)}, 70%, 50%)`; // Blue to Purple based on length

                    return (
                        <g key={index} className="hover:opacity-75 transition duration-150 cursor-pointer">
                            {/* Линия скважины */}
                            <line 
                                x1={startX} 
                                y1={startY} 
                                x2={endX} 
                                y2={endY} 
                                stroke={color} 
                                strokeWidth="2" 
                                strokeLinecap="round"
                            />
                            {/* Точка начала (устье) */}
                            <circle 
                                cx={startX} 
                                cy={startY} 
                                r="3" 
                                fill="white" 
                                stroke={color} 
                                strokeWidth="1.5" 
                                title={`Устье ${hole.WellName}: X=${hole.DisplayX.toFixed(1)}, Y=${hole.DisplayY.toFixed(1)}`}
                            />
                            {/* Текст (Номер скважины) */}
                            <text 
                                x={startX} 
                                y={startY - 5} 
                                fontSize="10" 
                                fill="#333" 
                                textAnchor="middle"
                            >
                                {hole.WellName}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    </div>
  );
};


function App() {
  const [data, setData] = useState([]);
  const [fileName, setFileName] = useState(null);
  const [stats, setStats] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Определение глобальной переменной XLSX (при условии, что она загружена через <script>)
  const XLSX = window.XLSX;

  // === Функция для безопасного парсинга координат ===
  const parseCoordinate = (value) => {
    if (value === undefined || value === null) return NaN;
    if (typeof value === 'string') {
      // Заменяем запятую на точку для корректного parseFloat
      const cleanedValue = value.replace(',', '.');
      return parseFloat(cleanedValue);
    }
    return parseFloat(value);
  };

  // === Обработка импорта файлов Excel/CSV ===
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setErrorMessage(null); // Сброс ошибки
    if (!file) return;

    if (!XLSX) {
      setErrorMessage("Библиотека XLSX не загружена. Пожалуйста, убедитесь, что скрипт XLSX доступен.");
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target.result;
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);

        console.log("📘 Импортировано строк:", json.length);
        console.log("Пример данных:", json[0]);

        // === Обновленные требуемые колонки ===
        const requiredFields = [
          "RawStartPointX",
          "RawStartPointY",
          "RawStartPointZ",
          "RawEndPointX",
          "RawEndPointY",
          "RawEndPointZ",
          "HoleName", // Также проверим наличие имени скважины
        ];
        
        // Проверяем наличие всех ключевых колонок в первой строке
        const firstRow = json[0] || {};
        const missingFields = requiredFields.filter(key => !(key in firstRow));

        if (missingFields.length > 0) {
          throw new Error(
            "❌ Ошибка: файл не содержит необходимых столбцов. Отсутствуют: " +
            missingFields.join(", ")
          );
        }

        // === Преобразуем и фильтруем данные с использованием Raw... колонок ===
        const processed = json.map((row) => ({
          WellName: String(row.HoleName || row.WellName || "N/A"), // Приводим к строке
          DisplayX: parseCoordinate(row.RawStartPointX),
          DisplayY: parseCoordinate(row.RawStartPointY),
          DisplayZ: parseCoordinate(row.RawStartPointZ),
          DisplayEndX: parseCoordinate(row.RawEndPointX),
          DisplayEndY: parseCoordinate(row.RawEndPointY),
          DisplayEndZ: parseCoordinate(row.RawEndPointZ),
        }));

        // === Проверка и фильтрация NaN ===
        const validData = processed.filter(
          (p) =>
            !isNaN(p.DisplayX) &&
            !isNaN(p.DisplayY) &&
            !isNaN(p.DisplayEndX) &&
            !isNaN(p.DisplayEndY)
        );

        if (validData.length === 0) {
            throw new Error("Не удалось обработать координаты ни для одной скважины. Проверьте формат чисел (запятые).");
        }

        console.log("✅ Обработано записей:", validData.length);

        // === Контроль диапазонов координат ===
        const xs = validData.flatMap((d) => [d.DisplayX, d.DisplayEndX]);
        const ys = validData.flatMap((d) => [d.DisplayY, d.DisplayEndY]);
        const zs = validData.flatMap((d) => [d.DisplayZ, d.DisplayEndZ]);

        const stats = {
          minX: Math.min(...xs),
          maxX: Math.max(...xs),
          spanX: Math.max(...xs) - Math.min(...xs),
          minY: Math.min(...ys),
          maxY: Math.max(...ys),
          spanY: Math.max(...ys) - Math.min(...ys),
          minZ: Math.min(...zs),
          maxZ: Math.max(...zs),
          spanZ: Math.max(...zs) - Math.min(...zs),
          centerX: (xs.reduce((a, b) => a + b, 0) / xs.length),
          centerY: (ys.reduce((a, b) => a + b, 0) / ys.length),
          centerZ: (zs.reduce((a, b) => a + b, 0) / zs.length),
        };

        setStats(stats);
        setData(validData);

      } catch (error) {
        console.error("Ошибка обработки файла:", error);
        setErrorMessage(error.message);
        setData([]);
        setStats(null);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleClear = () => {
    setData([]);
    setFileName(null);
    setStats(null);
    setErrorMessage(null);
  };
  
  // Компонент для загрузки внешних библиотек
  const ExternalScripts = () => (
    <>
      {/* Загрузка XLSX: необходима, так как 'import * as XLSX from "xlsx"' не работает в этой среде */}
      <script src="https://unpkg.com/xlsx/dist/xlsx.full.min.js"></script>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans antialiased">
      {/* Скрипты для внешних библиотек */}
      <ExternalScripts />
      
      {/* Основной контейнер */}
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl p-6">
        <header className="border-b pb-4 mb-6">
          <h1 className="text-3xl font-extrabold text-blue-600 flex items-center">
            <span className="mr-3">🛠</span> Drill Plan Viewer (2D, Local CS)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Инструмент визуализации плана бурения из файла Excel/CSV.
          </p>
        </header>

        {/* Секция управления */}
        <section className="controls mb-6 flex items-center space-x-4">
          <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out">
            Загрузить файл (.xlsx, .csv)
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          
          {fileName && (
            <div className="flex items-center space-x-3 text-gray-700">
              <span className="font-medium truncate max-w-xs">
                Загружен: <b>{fileName}</b>
              </span>
              <span className="text-sm">
                 ({data.length} скважин)
              </span>
              <button 
                onClick={handleClear} 
                className="text-red-500 hover:text-red-700 text-sm p-1 rounded-md transition duration-150"
              >
                Очистить
              </button>
            </div>
          )}
        </section>

        {/* Модальное окно ошибки (замена alert) */}
        {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold mr-2">Ошибка при загрузке:</strong>
                <span className="block sm:inline">{errorMessage}</span>
                <button 
                    onClick={() => setErrorMessage(null)} 
                    className="absolute top-0 bottom-0 right-0 px-4 py-3 text-red-500 hover:text-red-800"
                >
                    <svg className="fill-current h-6 w-6" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                </button>
            </div>
        )}

        {/* Контроль координат */}
        {stats && (
          <section className="stats bg-gray-50 p-4 rounded-lg shadow-inner mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-3 border-b pb-2">
                Проверка ЛСК (Контроль координат)
            </h3>
            <div className="grid grid-cols-3 gap-y-2 text-sm text-gray-700">
              {/* X */}
              <StatItem label="min X" value={stats.minX.toFixed(3)} unit="м" />
              <StatItem label="max X" value={stats.maxX.toFixed(3)} unit="м" />
              <StatItem label="span X" value={stats.spanX.toFixed(3)} unit="м" isBold />
              {/* Y */}
              <StatItem label="min Y" value={stats.minY.toFixed(3)} unit="м" />
              <StatItem label="max Y" value={stats.maxY.toFixed(3)} unit="м" />
              <StatItem label="span Y" value={stats.spanY.toFixed(3)} unit="м" isBold />
              {/* Z */}
              <StatItem label="min Z" value={stats.minZ.toFixed(3)} unit="м" />
              <StatItem label="max Z" value={stats.maxZ.toFixed(3)} unit="м" />
              <StatItem label="span Z" value={stats.spanZ.toFixed(3)} unit="м" isBold />
            </div>
            
            <p className="mt-4 pt-2 border-t font-mono text-xs text-gray-600">
              Center (X, Y, Z): ({stats.centerX.toFixed(1)}, {stats.centerY.toFixed(1)}, {stats.centerZ.toFixed(1)})
            </p>
            <p className="text-xs text-gray-500 mt-2">
                Ожидаемый диапазон координат: X ~ 4000–10000 м, Y ~ 3000–7000 м. Если span X/Y ≪ 1 → проверьте масштаб/поворот.
            </p>
          </section>
        )}

        {/* Секция карты */}
        <section className="map-section min-h-[650px] flex justify-center items-center">
          {data.length > 0 ? (
            <MapComponent data={data} stats={stats} />
          ) : (
            <div className="p-12 text-center text-gray-500 border-4 border-dashed border-gray-300 rounded-xl">
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <p className="text-lg font-medium">Загрузите файл для отображения карты</p>
              <p className="text-sm">Формат: CSV/XLSX с колонками RawStartPointX/Y/Z и RawEndPointX/Y/Z.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// Вспомогательный компонент для отображения статистики
const StatItem = ({ label, value, unit, isBold = false }) => (
    <div className={`flex justify-between ${isBold ? 'font-bold' : ''}`}>
        <span className="text-gray-600">{label}:</span>
        <span className="font-mono text-right text-gray-900">
            {value} <span className="text-xs font-sans text-gray-500">{unit}</span>
        </span>
    </div>
);

export default App;
