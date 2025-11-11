import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import MapComponent from './MapComponent';
import { normalizeLocalCoords } from './utils/geo';
import './App.css';

// --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ---
// Очистка и парсинг числового значения
const cleanAndParse = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return 0;
  return parseFloat(String(value).replace(',', '.'));
};

// --- ОСНОВНАЯ ОБРАБОТКА ДАННЫХ ---
const processData = (rawData, setError, setDrillHoles, setStats, setLoading) => {
  try {
    const processedData = rawData.map((item, index) => {
      const mapping = {
        HoleName: 'HoleName',
        RawStartPointX: 'RawStartPointX',
        RawStartPointY: 'RawStartPointY',
        RawStartPointZ: 'RawStartPointZ',
        RawEndPointX: 'RawEndPointX',
        RawEndPointY: 'RawEndPointY',
        RawEndPointZ: 'RawEndPointZ',
      };

      // Приведение ключей к стандартному виду (XLSX часто меняет регистр)
      const standardized = Object.keys(item).reduce((acc, key) => {
        for (const standardKey in mapping) {
          if (String(key).toLowerCase().includes(standardKey.toLowerCase())) {
            acc[standardKey] = item[key];
          }
        }
        return acc;
      }, {});

      // Читаем координаты — уже в локальной СК
      const startX = cleanAndParse(standardized.RawStartPointX);
      const startY = cleanAndParse(standardized.RawStartPointY);
      const startZ = cleanAndParse(standardized.RawStartPointZ);
      const endX = cleanAndParse(standardized.RawEndPointX);
      const endY = cleanAndParse(standardized.RawEndPointY);
      const endZ = cleanAndParse(standardized.RawEndPointZ);

      return {
        id: index,
        HoleName: standardized.HoleName || `Hole_${index + 1}`,
        LocalStartPointX: startX.toFixed(3),
        LocalStartPointY: startY.toFixed(3),
        LocalStartPointZ: startZ.toFixed(3),
        LocalEndPointX: endX.toFixed(3),
        LocalEndPointY: endY.toFixed(3),
        LocalEndPointZ: endZ.toFixed(3),
      };
    });

    // Фильтрация пустых строк
    const validData = processedData.filter(p => p.LocalStartPointX !== 0 || p.LocalStartPointY !== 0);
    if (validData.length === 0) {
      setError('Файл не содержит валидных координат скважин.');
      return;
    }

    // Нормализация под Leaflet CRS.Simple
    const normalized = normalizeLocalCoords(validData);
    setDrillHoles(normalized);

    // Контроль ЛСК
    const xs = normalized.map(d => parseFloat(d.LocalStartPointX));
    const ys = normalized.map(d => parseFloat(d.LocalStartPointY));
    const zs = normalized.map(d => parseFloat(d.LocalStartPointZ));

    setStats({
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      spanX: Math.max(...xs) - Math.min(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
      spanY: Math.max(...ys) - Math.min(...ys),
      minZ: Math.min(...zs),
      maxZ: Math.max(...zs),
      centerX: (Math.max(...xs) + Math.min(...xs)) / 2,
      centerY: (Math.max(...ys) + Math.min(...ys)) / 2,
      centerZ: (Math.max(...zs) + Math.min(...zs)) / 2,
    });

  } catch (e) {
    setError(`Ошибка обработки данных: ${e.message}`);
  } finally {
    setLoading(false);
  }
};

// --- ОСНОВНОЙ КОМПОНЕНТ ---
function App() {
  const [drillHoles, setDrillHoles] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [stats, setStats] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setFileName(file.name);
    setDrillHoles([]);

    const ext = file.name.split('.').pop().toLowerCase();
    const handleParsedData = (data) =>
      processData(data, setError, setDrillHoles, setStats, setLoading);

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => handleParsedData(results.data),
        error: (err) => setError(`Ошибка чтения CSV: ${err.message}`),
      });
    } else if (['xlsx', 'xls'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        handleParsedData(json);
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError('Поддерживаются только CSV, XLSX и XLS.');
      setLoading(false);
    }
  };

  // --- ИНТЕРФЕЙС ---
  return (
    <div className="app-container">
      <header>
        <h1>Drilling Plan Viewer — Локальная СК (2D вид сверху)</h1>
      </header>

      <div className="controls">
        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} disabled={loading} />
        {fileName && <p>Загружен файл: <strong>{fileName}</strong></p>}
        {error && <p className="error-message">⚠️ {error}</p>}
      </div>

      {stats && (
        <div className="stats">
          <h3>Проверка ЛСК (контроль)</h3>
          <pre>
{`min X\t${stats.minX.toFixed(3)} м
max X\t${stats.maxX.toFixed(3)} м
span X\t${stats.spanX.toFixed(3)} м
min Y\t${stats.minY.toFixed(3)} м
max Y\t${stats.maxY.toFixed(3)} м
span Y\t${stats.spanY.toFixed(3)} м
min Z\t${stats.minZ.toFixed(3)} м
max Z\t${stats.maxZ.toFixed(3)} м
center X,Y,Z\t${stats.centerX.toFixed(1)}, ${stats.centerY.toFixed(1)}, ${stats.centerZ.toFixed(1)}`}
          </pre>
          <p className="control-note">
            Ожидаемый диапазон координат: X ≈ 4000–10000 м, Y ≈ 3000–7000 м.
            <br />Если значения выходят за диапазон — проверьте столбцы координат.
          </p>
        </div>
      )}

      {drillHoles.length > 0 && (
        <div className="map-container">
          <MapComponent data={drillHoles} />
        </div>
      )}
    </div>
  );
}

export default App;
