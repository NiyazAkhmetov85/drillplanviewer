// src/App.jsx
import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import MapComponent from './MapComponent';
import { toViewerCoords } from './utils/localTransform';
import './App.css';

const cleanAndParse = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return 0;
  return parseFloat(String(value).replace(',', '.'));
};

const computeChecks = (transformed) => {
  if (!transformed.length) return null;
  const xs = [];
  const ys = [];
  const zs = [];
  transformed.forEach(item => {
    xs.push(item.LocalStartPointX, item.LocalEndPointX);
    ys.push(item.LocalStartPointY, item.LocalEndPointY);
    zs.push(item.LocalStartPointZ, item.LocalEndPointZ);
  });
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;

  return { minX, maxX, minY, maxY, minZ, maxZ, centerX, centerY, centerZ, spanX: maxX-minX, spanY: maxY-minY, spanZ: maxZ-minZ };
};

const processData = (rawData, setError, setDrillHoles, setLoading) => {
  try {
    const processedData = rawData
      .map((item, index) => {
        const standardizedItem = Object.keys(item).reduce((acc, key) => {
          const mapping = {
            'HoleName': 'HoleName',
            'RawStartPointX': 'RawStartPointX',
            'RawStartPointY': 'RawStartPointY',
            'RawStartPointZ': 'RawStartPointZ',
            'RawEndPointX': 'RawEndPointX',
            'RawEndPointY': 'RawEndPointY',
            'RawEndPointZ': 'RawEndPointZ',
          };
          for (const standardKey in mapping) {
            if (String(key).toLowerCase().includes(standardKey.toLowerCase())) {
              acc[standardKey] = item[key];
            }
          }
          return acc;
        }, {});

        const rawStartX = cleanAndParse(standardizedItem.RawStartPointX);
        const rawStartY = cleanAndParse(standardizedItem.RawStartPointY);
        const rawStartZ = cleanAndParse(standardizedItem.RawStartPointZ);

        const rawEndX = cleanAndParse(standardizedItem.RawEndPointX);
        const rawEndY = cleanAndParse(standardizedItem.RawEndPointY);
        const rawEndZ = cleanAndParse(standardizedItem.RawEndPointZ);

        // Преобразуем все координаты на уровне App — используем toViewerCoords
        const startViewer = toViewerCoords({ e: rawStartX, n: rawStartY, h: rawStartZ });
        const endViewer = toViewerCoords({ e: rawEndX, n: rawEndY, h: rawEndZ });

        return {
          ...standardizedItem,
          id: index,
          HoleName: standardizedItem.HoleName || `Hole-${index}`,

          // Важно: сохраняем числовые значения (не строки) для three.js
          LocalStartPointX: Number(startViewer.x),
          LocalStartPointY: Number(startViewer.y),
          LocalStartPointZ: Number(startViewer.z),

          LocalEndPointX: Number(endViewer.x),
          LocalEndPointY: Number(endViewer.y),
          LocalEndPointZ: Number(endViewer.z),

          RawStartPointX: rawStartX,
          RawStartPointY: rawStartY,
          RawStartPointZ: rawStartZ,
          RawEndPointX: rawEndX,
          RawEndPointY: rawEndY,
          RawEndPointZ: rawEndZ,
        };
      })
      .filter(item =>
        // Убираем явно пустые строки
        !(item.RawStartPointX === 0 && item.RawStartPointY === 0 && item.RawEndPointX === 0 && item.RawEndPointY === 0)
      );

    if (processedData.length === 0) {
      setError('Не найдено валидных данных с координатами для отображения.');
      setDrillHoles([]);
    } else {
      setDrillHoles(processedData);
    }

  } catch (e) {
    setError(`Ошибка обработки данных или трансформации координат: ${e.message}`);
    console.error("Processing Error:", e);
  } finally {
    setLoading(false);
  }
};

function App() {
  const [drillHoles, setDrillHoles] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setFileName(file.name);
    setDrillHoles([]);

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          if (results.errors.length) {
            setError(`Ошибка парсинга CSV: ${results.errors[0].message}`);
            setLoading(false);
            return;
          }
          processData(results.data, setError, setDrillHoles, setLoading);
        },
        error: (err) => {
          setError(`Ошибка чтения файла: ${err.message}`);
          setLoading(false);
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          if (jsonData.length === 0) {
            setError('Файл Excel пуст или не содержит корректных данных.');
            setLoading(false);
            return;
          }
          const headers = jsonData[0];
          const dataRows = jsonData.slice(1);
          const dataObjects = dataRows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[String(header).trim()] = row[index];
            });
            return obj;
          }).filter(obj => Object.keys(obj).length > 0);
          if (dataObjects.length === 0) {
            setError('Файл Excel содержит только заголовки или не содержит данных.');
            setLoading(false);
            return;
          }
          processData(dataObjects, setError, setDrillHoles, setLoading);
        } catch (e) {
          setError(`Ошибка парсинга Excel: ${e.message}.`);
          setLoading(false);
          console.error("XLSX Parsing Error:", e);
        }
      };
      reader.onerror = (e) => {
        setError(`Ошибка чтения файла (FileReader): ${e.target.error.message}`);
        setLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError(`Неподдерживаемый формат файла: ${fileExtension}. Поддерживаются CSV, XLSX и XLS.`);
      setLoading(false);
    }
  };

  const checks = computeChecks(drillHoles);

  return (
    <div className="app-container">
      <header>
        <h1>Drilling Plan Viewer — 3D (ЛСК)</h1>
      </header>

      <div className="controls">
        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} disabled={loading} id="file-upload" />
        <label htmlFor="file-upload" className="file-upload-label">
          {loading
            ? 'Обработка данных...'
            : drillHoles.length > 0
              ? `Загружено ${drillHoles.length} скважин. Выбрать другой файл.`
              : fileName ? `Файл ${fileName} загружен. Загрузить новый.` : 'Нажмите, чтобы загрузить CSV/XLSX/XLS'}
        </label>
        {error && <p className="error-message">⚠️ Ошибка: {error}</p>}
      </div>

      <div className="viewer-and-panel" style={{ display: 'flex', gap: '16px', height: '70vh' }}>
        <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden' }}>
          <MapComponent data={drillHoles} />
        </div>

        <div style={{ width: 360, padding: 12, boxSizing: 'border-box', border: '1px solid #eee', borderRadius: 6 }}>
          <h3>Проверка ЛСК (контроль)</h3>
          {!checks && <p>Нет загруженных данных.</p>}
          {checks && (
            <>
              <table className="checks-table">
                <tbody>
                  <tr><td>min X</td><td>{checks.minX.toFixed(3)} м</td></tr>
                  <tr><td>max X</td><td>{checks.maxX.toFixed(3)} м</td></tr>
                  <tr><td>span X</td><td>{checks.spanX.toFixed(3)} м</td></tr>
                  <tr><td>min Y</td><td>{checks.minY.toFixed(3)} м</td></tr>
                  <tr><td>max Y</td><td>{checks.maxY.toFixed(3)} м</td></tr>
                  <tr><td>span Y</td><td>{checks.spanY.toFixed(3)} м</td></tr>
                  <tr><td>min Z</td><td>{checks.minZ.toFixed(3)} м</td></tr>
                  <tr><td>max Z</td><td>{checks.maxZ.toFixed(3)} м</td></tr>
                  <tr><td>center X,Y,Z</td><td>{checks.centerX.toFixed(1)}, {checks.centerY.toFixed(1)}, {checks.centerZ.toFixed(1)}</td></tr>
                </tbody>
              </table>
              <hr />
              <h4>Контрольные рекомендации</h4>
              <ul>
                <li>Ожидаемый диапазон координат (пример): X ~ 4k–10k м, Y ~ 3k–7k м — сверить с результатом.</li>
                <li>Если span X/Y ≪ 1 — проверьте, не пропущен масштаб/поворот.</li>
                <li>Если координаты сильно за пределами ожидаемых — проверьте исходные Raw координаты (столбцы)</li>
              </ul>
            </>
          )}
        </div>
      </div>

      {drillHoles.length > 0 && (
        <>
          <h2>Обработанные данные ({drillHoles.length} записей)</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Имя</th><th>X (ЛСК)</th><th>Y (ЛСК)</th><th>Z (ЛСК)</th><th>X (Исх)</th><th>Y (Исх)</th>
                </tr>
              </thead>
              <tbody>
                {drillHoles.slice(0, 50).map((item) => (
                  <tr key={item.id}>
                    <td>{item.HoleName}</td>
                    <td>{item.LocalStartPointX.toFixed(3)}</td>
                    <td>{item.LocalStartPointY.toFixed(3)}</td>
                    <td>{item.LocalStartPointZ.toFixed(3)}</td>
                    <td>{item.RawStartPointX.toFixed(3)}</td>
                    <td>{item.RawStartPointY.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {drillHoles.length > 50 && <p>Показаны первые 50 записей.</p>}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
