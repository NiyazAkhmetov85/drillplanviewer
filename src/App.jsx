// src/App.jsx
import React, { useState } from "react";
import * as XLSX from "xlsx";
import MapComponent from "./MapComponent";
import "./App.css";

function App() {
  const [data, setData] = useState([]);
  const [fileName, setFileName] = useState(null);
  const [stats, setStats] = useState(null);

  // === Вспомогательная функция для безопасного парсинга чисел ===
  // Корректно обрабатывает десятичные разделители (запятую или точку)
  const safeParseFloat = (value) => {
    if (typeof value === "string") {
      // Заменяем запятую на точку перед парсингом, если она присутствует
      const cleanedValue = value.replace(",", ".");
      return parseFloat(cleanedValue);
    }
    // Если это уже число, или null/undefined, просто пытаемся парсить
    return parseFloat(value);
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
      console.log("Пример данных:", json[0]);

      // === Проверка наличия ключевых колонок (HoleName, RawStartPointX, RawStartPointY) ===
      const requiredFields = [
        "HoleName",
        "RawStartPointX",
        "RawStartPointY",
      ];

      // Проверяем, что каждое требуемое поле есть в заголовках
      const validHeaders = requiredFields.every((key) => key in (json[0] || {}));

      if (!validHeaders) {
        alert(
          "❌ Ошибка: файл не содержит необходимых столбцов.\n" +
            "Требуются: " +
            requiredFields.join(", ")
        );
        setData([]);
        return;
      }

      // === Преобразуем данные, используя безопасный парсинг ===
      const processed = json.map((row) => ({
        WellName: row.HoleName || "N/A",
        // Используем safeParseFloat для корректной обработки десятичных разделителей
        DisplayX: safeParseFloat(row.RawStartPointX),
        DisplayY: safeParseFloat(row.RawStartPointY),
      }));

      // === Проверка и фильтрация NaN ===
      const validData = processed.filter(
        (p) => !isNaN(p.DisplayX) && !isNaN(p.DisplayY)
      );

      console.log("✅ Обработано записей:", validData.length);
      // Если log с предупреждением о пропущенных записях исчезнет или их количество уменьшится, 
      // значит, проблема с разделителями была устранена.

      // === Контроль диапазонов координат (Только X и Y) ===
      const xs = validData.map((d) => d.DisplayX);
      const ys = validData.map((d) => d.DisplayY);

      // Проверка на пустой массив для предотвращения ошибки Math.min/max на пустых массивах
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
  };

  return (
    <div className="App">
      <header>
        <h1>🛠 Drill Plan Viewer (2D, Local CS)</h1>
      </header>

      <section className="controls">
        <input
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileUpload}
        />
        {fileName && (
          <div>
            Загружен блок: <b>{fileName}</b> ({data.length} скважин){" "}
            <button onClick={handleClear}>Выбрать другой файл</button>
          </div>
        )}
      </section>

      {/* Контроль координат (Только X и Y) */}
      {stats && (
        <section className="stats">
          <h3>Проверка ЛСК (контроль)</h3>
          <table>
            <tbody>
              <tr>
                <td>min X</td>
                <td>{stats.minX} м</td>
                <td>max X</td>
                <td>{stats.maxX} м</td>
                <td>span X</td>
                <td>{stats.spanX} м</td>
              </tr>
              <tr>
                <td>min Y</td>
                <td>{stats.minY} м</td>
                <td>max Y</td>
                <td>{stats.maxY} м</td>
                <td>span Y</td>
                <td>{stats.spanY} м</td>
              </tr>
              <tr>
                <td colSpan="6">
                  center X,Y → {stats.centerX}, {stats.centerY}
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ fontSize: "0.9em", color: "#555" }}>
            Ожидаемый диапазон координат: X ~ 4000–10000 м, Y ~ 3000–7000 м.
            Если span X/Y ≪ 1 → проверьте масштаб/поворот.
          </p>
        </section>
      )}

      <section className="map-section">
        {data.length > 0 ? (
          <MapComponent data={data} />
        ) : (
          <div className="placeholder">Загрузите файл для отображения карты</div>
        )}
      </section>
    </div>
  );
}

export default App;
