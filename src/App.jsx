import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import MapComponent from './MapComponent';
import { transformRawToLocal, normalizeLocalCoords } from './utils/geo';
import './App.css';

const cleanAndParse = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return 0;
  return parseFloat(String(value).replace(',', '.'));
};

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

      const standardized = Object.keys(item).reduce((acc, key) => {
        for (const standardKey in mapping) {
          if (String(key).toLowerCase().includes(standardKey.toLowerCase())) {
            acc[standardKey] = item[key];
          }
        }
        return acc;
      }, {});

      const rawStartX = cleanAndParse(standardized.RawStartPointX);
      const rawStartY = cleanAndParse(standardized.RawStartPointY);
      const rawStartZ = cleanAndParse(standardized.RawStartPointZ);
      const rawEndX = cleanAndParse(standardized.RawEndPointX);
      const rawEndY = cleanAndParse(standardized.RawEndPointY);
      const rawEndZ = cleanAndParse(standardized.RawEndPointZ);

      const localStart = transformRawToLocal(rawStartX, rawStartY);
      const localEnd = transformRawToLocal(rawEndX, rawEndY);

      return {
        ...standardized,
        id: index,
        HoleName: standardized.HoleName || `Hole_${index + 1}`,
        LocalStartPointX: localStart.x.toFixed(3),
        LocalStartPointY: localStart.y.toFixed(3),
        LocalStartPointZ: rawStartZ.toFixed(3),
        LocalEndPointX: localEnd.x.toFixed(3),
        LocalEndPointY: localEnd.y.toFixed(3),
        LocalEndPointZ: rawEndZ.toFixed(3),
        RawStartPointX: rawStartX,
        RawStartPointY: rawStartY,
      };
    });

    const validData = processedData.filter(p => p.RawStartPointX !== 0 || p.RawStartPointY !== 0);

    if (validData.length === 0) {
      setError('Не найдено валидных координат.');
      return;
    }

    const normalized = normalizeLocalCoords(validData);
    setDrillHoles(normalized);

    const xs = normalized.map(d => parseFloat(d.LocalStartPointX));
    const ys = normalized.map(d => parseFloat(d.LocalStartPointY));
    const zs = normalized.map(d => parseFloat(d.LocalStartPointZ));

    setStats({
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
      minZ: Math.min(...zs),
      maxZ: Math.max(...zs),
    });

  } catch (e) {
    setError(`Ошибка обработки: ${e.message}`);
  } finally {
    setLoading(false);
  }
};

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
    const handleParsedData = (data) => processData(data, setError, setDrillHoles, setStats, setLoading);

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
      setError('Поддерживаются только CSV, XLSX, XLS.');
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header><h1>Drilling Plan Viewer (ЛСК, 2D вид сверху)</h1></header>
      <div className="controls">
        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} disabled={loading} />
        {error && <p className="error-message">⚠️ {error}</p>}
        {fileName && <p>{fileName}</p>}
      </div>

      {stats && (
        <div className="stats">
          <h3>Проверка ЛСК (контроль)</h3>
          <pre>
{`min X\t${stats.minX.toFixed(3)} м
max X\t${stats.maxX.toFixed(3)} м
min Y\t${stats.minY.toFixed(3)} м
max Y\t${stats.maxY.toFixed(3)} м
min Z\t${stats.minZ.toFixed(3)} м
max Z\t${stats.maxZ.toFixed(3)} м`}
          </pre>
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
