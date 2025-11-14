// src/hooks/useDrillData.js
import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

// === Вспомогательная функция для безопасного парсинга чисел ===
// Корректно обрабатывает десятичные разделители (запятую или точку)
const safeParseFloat = (value) => {
  if (typeof value === 'number') {
    return value;
  }
  if (value === null || value === undefined || value === "") {
    return NaN;
  }

  // Преобразуем в строку, чтобы гарантировать возможность замены запятой
  let strValue = String(value).trim();

  // Заменяем запятую на точку перед парсингом
  strValue = strValue.replace(",", ".");
  
  return parseFloat(strValue);
};

export const useDrillData = () => {
  const [data, setData] = useState([]);
  const [fileName, setFileName] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Новое состояние загрузки
  const [error, setError] = useState(null); // Новое состояние ошибки

  const handleClear = useCallback(() => {
    setData([]);
    setFileName(null);
    setStats(null);
    setError(null);
    setIsLoading(false);
  }, []);

  // === Обработка импорта файлов Excel/CSV ===
  const handleFileUpload = useCallback((event) => {
    handleClear(); // Сброс предыдущего состояния
    const file = event.target.files[0];
    if (!file) return;
    
    setIsLoading(true);
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

        // === Проверка наличия ключевых колонок ===
        const requiredFields = [
          "HoleName",
          "RawStartPointX",
          "RawStartPointY",
        ];

        const validHeaders = requiredFields.every((key) => key in (json[0] || {}));

        if (!validHeaders) {
          const errorMessage = "❌ Ошибка: файл не содержит необходимых столбцов. Требуются: " + requiredFields.join(", ");
          console.error(errorMessage);
          setError(errorMessage);
          setData([]);
          setFileName(null);
          setIsLoading(false);
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

        if (validData.length === 0) {
            setError("⚠️ Предупреждение: Не найдено валидных координат (X, Y) для отображения.");
            setStats(null);
            setData([]);
            setIsLoading(false);
            return;
        }

        // === Расчет статистики ===
        const xs = validData.map((d) => d.DisplayX);
        const ys = validData.map((d) => d.DisplayY);

        const calculatedStats = {
          minX: Math.min(...xs).toFixed(3),
          maxX: Math.max(...xs).toFixed(3),
          spanX: (Math.max(...xs) - Math.min(...xs)).toFixed(3),
          minY: Math.min(...ys).toFixed(3),
          maxY: Math.max(...ys).toFixed(3),
          spanY: (Math.max(...ys) - Math.min(...ys)).toFixed(3),
          centerX: (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1),
          centerY: (ys.reduce((a, b) => a + b, 0) / ys.length).toFixed(1),
        };

        setStats(calculatedStats);
        setData(validData);
        setError(null);

      } catch (e) {
        const errorMessage = `❌ Ошибка парсинга файла: ${e.message}`;
        console.error(errorMessage, e);
        setError(errorMessage);
        setData([]);
        setFileName(null);
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  }, [handleClear]);

  return {
    data,
    fileName,
    stats,
    isLoading,
    error,
    handleFileUpload,
    handleClear,
  };
};
