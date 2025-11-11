// src/App.jsx
import React, { useState } from "react";
import * as XLSX from "xlsx";
import MapComponent from "./MapComponent";
import "./App.css";

function App() {
  const [data, setData] = useState([]);
  const [fileName, setFileName] = useState(null);
  const [stats, setStats] = useState(null);

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

      // === Проверяем наличие ключевых колонок ===
      const requiredFields = [
        "RawStartPointX",
        "RawStartPointY",
        "RawStartPointZ",
        "RawEndPointX",
        "RawEndPointY",
        "RawEndPointZ",
      ];

      const valid = json.every((row) =>
        requiredFields.every((key) => key in row)
      );

      if (!valid) {
        alert(
          "❌ Ошибка: файл не содержит необходимых столбцов.\n" +
            requiredFields.join(", ")
        );
        setData([]);
        return;
      }

      // === Преобразуем и фильтруем данные ===
      const processed = json.map((row) => ({
        WellName: row.HoleName || row.WellName || "N/A",
        DisplayX: parseFloat(row.LocalStartPointX),
        DisplayY: parseFloat(row.LocalStartPointY),
        DisplayZ: parseFloat(row.LocalStartPointZ),
        DisplayEndX: parseFloat(row.LocalEndPointX),
        DisplayEndY: parseFloat(row.LocalEndPointY),
        DisplayEndZ: parseFloat(row.LocalEndPointZ),
      }));

      // === Проверка и фильтрация NaN ===
      const validData = processed.filter(
        (p) =>
          !isNaN(p.DisplayX) &&
          !isNaN(p.DisplayY) &&
          !isNaN(p.DisplayEndX) &&
          !isNaN(p.DisplayEndY)
      );

      console.log("✅ Обработано записей:", validData.length);

      // === Контроль диапазонов координат ===
      const xs = validData.flatMap((d) => [d.DisplayX, d.DisplayEndX]);
      const ys = validData.flatMap((d) => [d.DisplayY, d.DisplayEndY]);
      const zs = validData.flatMap((d) => [d.DisplayZ, d.DisplayEndZ]);

      const stats = {
        minX: Math.min(...xs).toFixed(3),
        maxX: Math.max(...xs).toFixed(3),
        spanX: (Math.max(...xs) - Math.min(...xs)).toFixed(3),
        minY: Math.min(...ys).toFixed(3),
        maxY: Math.max(...ys).toFixed(3),
        spanY: (Math.max(...ys) - Math.min(...ys)).toFixed(3),
        minZ: Math.min(...zs).toFixed(3),
        maxZ: Math.max(...zs).toFixed(3),
        spanZ: (Math.max(...zs) - Math.min(...zs)).toFixed(3),
        centerX: (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1),
        centerY: (ys.reduce((a, b) => a + b, 0) / ys.length).toFixed(1),
        centerZ: (zs.reduce((a, b) => a + b, 0) / zs.length).toFixed(1),
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

      {/* Контроль координат */}
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
                <td>min Z</td>
                <td>{stats.minZ} м</td>
                <td>max Z</td>
                <td>{stats.maxZ} м</td>
                <td>span Z</td>
                <td>{stats.spanZ} м</td>
              </tr>
              <tr>
                <td colSpan="6">
                  center X,Y,Z → {stats.centerX}, {stats.centerY}, {stats.centerZ}
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
