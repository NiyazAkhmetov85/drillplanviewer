import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
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

// --- ОСНОВНАЯ ФУНКЦИЯ ОБРАБОТКИ И ТРАНСФОРМАЦИИ ДАННЫХ ---
const processData = (rawData, setError, setDrillHoles, setLoading) => {
    try {
        const processedData = rawData
            .map((item, index) => {
                // Приводим все ключи к стандартизированному виду для надежности 
                // (актуально для XLSX, где регистр может быть разным)
                const standardizedItem = Object.keys(item).reduce((acc, key) => {
                    // Используем строгие имена полей (XLSX может вернуть разные ключи)
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
                        // Поиск совпадения ключа независимо от регистра
                        if (String(key).toLowerCase().includes(standardKey.toLowerCase())) {
                            acc[standardKey] = item[key];
                        }
                    }
                    return acc;
                }, {});

                // Очистка и парсинг исходных координат
                const rawStartX = cleanAndParse(standardizedItem.RawStartPointX);
                const rawStartY = cleanAndParse(standardizedItem.RawStartPointY);
                const rawStartZ = cleanAndParse(standardizedItem.RawStartPointZ);

                const rawEndX = cleanAndParse(standardizedItem.RawEndPointX);
                const rawEndY = cleanAndParse(standardizedItem.RawEndPointY);
                const rawEndZ = cleanAndParse(standardizedItem.RawEndPointZ);

                // Применяем трансформацию Гельмерта к начальной точке (X, Y)
                const localStartCoords = transformRawToLocal(rawStartX, rawStartY);
                // Применяем трансформацию Гельмерта к конечной точке (X, Y)
                const localEndCoords = transformRawToLocal(rawEndX, rawEndY);

                return {
                    ...standardizedItem,
                    id: index,
                    // Добавляем HoleName обратно, так как он используется в таблице
                    HoleName: standardizedItem.HoleName || 'N/A', 
                    
                    // Локальные координаты начала (X, Y - трансформированы, Z - скопирован)
                    LocalStartPointX: localStartCoords.x.toFixed(3),
                    LocalStartPointY: localStartCoords.y.toFixed(3),
                    LocalStartPointZ: rawStartZ.toFixed(3),

                    // Локальные координаты конца (X, Y - трансформированы, Z - скопирован)
                    LocalEndPointX: localEndCoords.x.toFixed(3),
                    LocalEndPointY: localEndCoords.y.toFixed(3),
                    LocalEndPointZ: rawEndZ.toFixed(3),
                    // Сохраняем исходные паршенные значения для отображения в таблице
                    RawStartPointX: rawStartX,
                    RawStartPointY: rawStartY,
                };
            })
            .filter(item =>
                // Простейшая проверка: не включаем строки, где координаты стали (0,0)
                item.RawStartPointX !== 0 || item.RawStartPointY !== 0
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
            // --- CSV PARSING LOGIC (using PapaParse) ---
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: false,
                // Предполагаем разделитель-запятую, но PapaParse умеет авто-детектировать, если не указано
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
            // --- XLSX/XLS PARSING LOGIC (using XLSX) ---
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    // Читаем рабочий лист
                    const workbook = XLSX.read(data, { type: 'array' });
                    // Получаем имя первой вкладки
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    
                    // Используем header: 1 для получения массива массивов: [ [header1, header2], [data1, data2], ... ]
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); 

                    // Предполагаем, что первая строка содержит заголовки, а остальное — данные.
                    if (jsonData.length === 0) {
                        setError('Файл Excel пуст или не содержит корректных данных.');
                        setLoading(false);
                        return;
                    }
                    
                    // Преобразуем массив массивов обратно в массив объектов с заголовками
                    const headers = jsonData[0];
                    const dataRows = jsonData.slice(1);

                    const dataObjects = dataRows.map(row => {
                        const obj = {};
                        headers.forEach((header, index) => {
                            // Очищаем ключи от лишних пробелов, если они есть
                            obj[String(header).trim()] = row[index];
                        });
                        return obj;
                    }).filter(obj => Object.keys(obj).length > 0); // Удаляем пустые строки

                    if (dataObjects.length === 0) {
                        setError('Файл Excel содержит только заголовки или не содержит данных.');
                        setLoading(false);
                        return;
                    }

                    processData(dataObjects, setError, setDrillHoles, setLoading);

                } catch (e) {
                    setError(`Ошибка парсинга Excel: ${e.message}. Убедитесь, что заголовки находятся в первой строке.`);
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
             setError(`Неподдерживаемый формат файла: ${fileExtension}. Поддерживаются только CSV, XLSX и XLS.`);
             setLoading(false);
        }
    };

    // --- ИНТЕРФЕЙС И ОТОБРАЖЕНИЕ ---
    return (
        <div className="app-container">
            <header>
                <h1>Drilling Plan Viewer (ЛСК)</h1>
            </header>
            
            <div className="controls">
                <input 
                    type="file" 
                    accept=".csv,.xlsx,.xls" // Добавили XLSX/XLS
                    onChange={handleFileUpload} 
                    disabled={loading}
                    id="file-upload"
                />
                <label htmlFor="file-upload" className="file-upload-label">
                    {loading 
                        ? 'Обработка данных...' 
                        : drillHoles.length > 0 
                            ? `Загружено ${drillHoles.length} скважин. Выбрать другой файл.`
                            : fileName ? `Файл ${fileName} загружен. Загрузить новый.` : 'Нажмите, чтобы загрузить CSV, XLSX или XLS файл'}
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
                        <p>Загрузите CSV/XLSX/XLS-файл с паспортами бурения для отображения плана на карте (Локальная СК).</p>
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
