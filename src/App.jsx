// src/App.jsx
import React, { useState } from 'react';
import Papa from 'papaparse'; // Импорт парсера
import { applyTransformation } from './utils/geo';
import MapComponent from './MapComponent';
import './App.css'; 

// Заголовки координат из вашего CSV, которые нужно обработать
const COORD_FIELDS = ['RawStartPointX', 'RawStartPointY', 'RawStartPointZ', 
                      'RawEndPointX', 'RawEndPointY', 'RawEndPointZ'];

// Функция для очистки и преобразования числового значения
const cleanAndParse = (value) => {
    // 1. Замена запятой на точку
    // 2. Преобразование строки в число с плавающей точкой
    // 3. Если значение null/undefined/пустая строка, вернуть 0
    return parseFloat(String(value || '0').replace(',', '.'));
};

function App() {
    const [data, setData] = useState([]);
    const [fileName, setFileName] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- 1. ОБРАБОТКА ЗАГРУЗКИ ФАЙЛА ---
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setLoading(true);
        setError(null);
        setFileName(file.name);
        setData([]);

        // Используем PapaParse для чтения и парсинга CSV-файла
        Papa.parse(file, {
            header: true,             // Преобразовать первую строку в заголовки полей
            skipEmptyLines: true,     // Пропускать пустые строки
            dynamicTyping: false,     // Не пытаться преобразовать в числа автоматически (нам нужно сначала очистить запятые)
            delimiter: ',',           // Разделитель полей - запятая
            
            complete: (results) => {
                if (results.errors.length) {
                    setError(`Ошибка парсинга: ${results.errors[0].message}`);
                    setLoading(false);
                    return;
                }
                
                // --- 2. ОЧИСТКА И ТРАНСФОРМАЦИЯ ДАННЫХ ---
                const processedData = results.data.map((item, index) => {
                    
                    // Очистка и парсинг всех числовых координат
                    const rawStartX = cleanAndParse(item.RawStartPointX);
                    const rawStartY = cleanAndParse(item.RawStartPointY);
                    
                    const rawEndX = cleanAndParse(item.RawEndPointX);
                    const rawEndY = cleanAndParse(item.RawEndPointY);
                    
                    // Применение трансформации Гельмерта
                    const localStartCoords = applyTransformation(rawStartX, rawStartY);
                    const localEndCoords = applyTransformation(rawEndX, rawEndY);

                    return {
                        ...item,
                        id: index, // Добавляем уникальный ID для React
                        
                        // Локальные координаты начала
                        LocalStartPointX: localStartCoords.x.toFixed(3),
                        LocalStartPointY: localStartCoords.y.toFixed(3),
                        LocalStartPointZ: cleanAndParse(item.RawStartPointZ).toFixed(3),
                        
                        // Локальные координаты конца
                        LocalEndPointX: localEndCoords.x.toFixed(3),
                        LocalEndPointY: localEndCoords.y.toFixed(3),
                        LocalEndPointZ: cleanAndParse(item.RawEndPointZ).toFixed(3),
                    };
                });

                setData(processedData);
                setLoading(false);
            },
            error: (err) => {
                setError(`Ошибка чтения файла: ${err.message}`);
                setLoading(false);
            }
        });
    };

    // --- 3. ИНТЕРФЕЙС И ОТОБРАЖЕНИЕ ---
    return (
        <div className="container">
            <h1>Паспорта Бурения (ЛСК)</h1>
            
            <div className="controls">
                <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileUpload} 
                    disabled={loading}
                />
                {fileName && <p>Загружен файл: **{fileName}**</p>}
                {loading && <p>Обработка данных...</p>}
                {error && <p style={{ color: 'red' }}>Ошибка: {error}</p>}
            </div>

            <hr/>
            
            <h2>Карта (Локальная Система Координат)</h2>
            <p>На карте отображаются буровые скважины (от начальной до конечной точки), пересчитанные в ЛСК.</p>
            <MapComponent data={data} />

            <hr/>

            {data.length > 0 && (
                <>
                    <h2>Обработанные данные ({data.length} записей)</h2>
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
                                {data.slice(0, 100).map((item) => ( // Показываем только первые 100 строк для удобства
                                    <tr key={item.id}>
                                        <td>{item.HoleName || 'N/A'}</td>
                                        <td>{item.LocalStartPointX}</td>
                                        <td>{item.LocalStartPointY}</td>
                                        <td>{item.LocalStartPointZ}</td>
                                        <td>{item.RawStartPointX}</td>
                                        <td>{item.RawStartPointY}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {data.length > 100 && <p>Показаны первые 100 записей.</p>}
                    </div>
                </>
            )}
        </div>
    );
}

export default App;
