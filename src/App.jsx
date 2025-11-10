// src/App.jsx
import React, { useState } from 'react';
import Papa from 'papaparse';
import MapComponent from './MapComponent';
import { transformRawToLocal } from './utils/geo'; // Импорт функции трансформации
import './App.css'; 

// Функция для очистки и преобразования числового значения (замена ',' на '.')
const cleanAndParse = (value) => {
    // Если значение пустое/невалидное, вернем 0 для безопасного расчета
    if (value === null || value === undefined || String(value).trim() === '') {
        return 0;
    }
    // Замена запятой на точку и парсинг в число
    return parseFloat(String(value).replace(',', '.'));
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

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
            delimiter: ',', // Предполагаем разделитель-запятую (стандарт для CSV)
            
            complete: (results) => {
                if (results.errors.length) {
                    setError(`Ошибка парсинга CSV: ${results.errors[0].message}`);
                    setLoading(false);
                    return;
                }

                try {
                    const processedData = results.data
                        .map((item, index) => {
                            // Очистка и парсинг исходных координат
                            const rawStartX = cleanAndParse(item.RawStartPointX);
                            const rawStartY = cleanAndParse(item.RawStartPointY);
                            const rawStartZ = cleanAndParse(item.RawStartPointZ);
                            
                            const rawEndX = cleanAndParse(item.RawEndPointX);
                            const rawEndY = cleanAndParse(item.RawEndPointY);
                            const rawEndZ = cleanAndParse(item.RawEndPointZ);

                            // Применяем трансформацию Гельмерта к начальной точке (X, Y)
                            const localStartCoords = transformRawToLocal(rawStartX, rawStartY);
                            // Применяем трансформацию Гельмерта к конечной точке (X, Y)
                            const localEndCoords = transformRawToLocal(rawEndX, rawEndY);

                            return {
                                ...item,
                                id: index,
                                
                                // Локальные координаты начала (X, Y - трансформированы, Z - скопирован)
                                LocalStartPointX: localStartCoords.x.toFixed(3),
                                LocalStartPointY: localStartCoords.y.toFixed(3),
                                LocalStartPointZ: rawStartZ.toFixed(3),
                                
                                // Локальные координаты конца (X, Y - трансформированы, Z - скопирован)
                                LocalEndPointX: localEndCoords.x.toFixed(3),
                                LocalEndPointY: localEndCoords.y.toFixed(3),
                                LocalEndPointZ: rawEndZ.toFixed(3),
                            };
                        })
                        .filter(item => 
                            // Простейшая проверка: не включаем строки, где координаты стали (0,0)
                            cleanAndParse(item.RawStartPointX) !== 0 || cleanAndParse(item.RawStartPointY) !== 0
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
            },
            error: (err) => {
                setError(`Ошибка чтения файла: ${err.message}`);
                setLoading(false);
            }
        });
    };

    // --- 3. ИНТЕРФЕЙС И ОТОБРАЖЕНИЕ ---
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
                    disabled={loading}
                    id="csv-upload"
                />
                <label htmlFor="csv-upload" className="file-upload-label">
                    {loading 
                        ? 'Обработка данных...' 
                        : drillHoles.length > 0 
                            ? `Загружено ${drillHoles.length} скважин. Выбрать другой файл.`
                            : fileName ? `Файл ${fileName} загружен. Загрузить новый.` : 'Нажмите, чтобы загрузить CSV файл'}
                </label>
                
                {error && <p className="error-message">⚠️ Ошибка: {error}</p>}
            </div>
            
            {/* MapComponent ожидает данные с полями LocalStartPointX/Y/Z */}
            {drillHoles.length > 0 ? (
                <div className="map-container">
                    <MapComponent data={drillHoles} />
                </div>
            ) : (
                !loading && !error && (
                    <div className="initial-message">
                        <p>Загрузите CSV-файл с паспортами бурения для отображения плана на карте (Локальная СК).</p>
                    </div>
                )
            )}

            {/* Добавляем секцию для просмотра данных */}
            {drillHoles.length > 0 && (
                <>
                    <h2>Обработанные данные ({drillHoles.length} записей)</h2>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Имя скважины</th>
                                    <th>X (Лок.)</th>
                                    <th>Y (Лок.)</th>
                                    <th>Z (Лок.)</th>
                                    <th>X (Исходн.)</th>
                                    <th>Y (Исходн.)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Показываем только первые 50 строк для удобства */}
                                {drillHoles.slice(0, 50).map((item) => ( 
                                    <tr key={item.id}>
                                        <td>{item.HoleName || 'N/A'}</td>
                                        <td>{item.LocalStartPointX}</td>
                                        <td>{item.LocalStartPointY}</td>
                                        <td>{item.LocalStartPointZ}</td>
                                        <td>{cleanAndParse(item.RawStartPointX).toFixed(3)}</td>
                                        <td>{cleanAndParse(item.RawStartPointY).toFixed(3)}</td>
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
