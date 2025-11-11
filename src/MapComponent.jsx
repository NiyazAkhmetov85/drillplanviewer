// src/MapComponent.jsx
import React, { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MapComponent = ({ data }) => {
  useEffect(() => {
    // Очистка старой карты, если компонент перерисовывается
    const existingMap = L.DomUtil.get("map");
    if (existingMap && existingMap._leaflet_id) {
      existingMap._leaflet_id = null;
    }

    // Создаём карту в локальных координатах (метры)
    const map = L.map("map", {
      crs: L.CRS.Simple, // простая 2D-плоскость
      minZoom: -2,
      maxZoom: 5,
    });

    // --- Проверка входных данных ---
    if (!data || data.length === 0) {
      console.warn("⚠️ Нет данных для отображения.");
      map.setView([0, 0], 1);
      return;
    }

    // --- Извлекаем координаты (только стартовые точки) ---
    const allCoords = data.flatMap((d) => {
      // Leaflet ожидает [lat (Y), lng (X)]
      const start = [parseFloat(d.DisplayY), parseFloat(d.DisplayX)];

      // Проверка корректности: должна сработать только если App.jsx пропустил NaN
      if (isNaN(start[0]) || isNaN(start[1])) {
        // ЭТО ПРЕДУПРЕЖДЕНИЕ БОЛЬШЕ НЕ ДОЛЖНО СРАБАТЫВАТЬ
        console.warn("⚠️ Пропущена запись с некорректными координатами:", d);
        return [];
      }

      return [start]; // Возвращаем только стартовую точку
    });

    // Если координаты невалидны — выходим
    if (allCoords.length === 0) {
      console.error("❌ Нет валидных координат для отображения!");
      map.setView([0, 0], 1);
      return;
    }

    // --- Определяем границы ---
    const bounds = L.latLngBounds(allCoords);
    const center = bounds.getCenter();

    // --- Устанавливаем вид ---
    map.fitBounds(bounds.pad(0.2)); // чуть больше границ

    // --- Добавляем визуальную сетку для контроля ЛСК ---
    const gridSize = 50; // шаг сетки в метрах
    const gridLayer = L.layerGroup();

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    
    const minY = sw.lat;
    const minX = sw.lng;
    const maxY = ne.lat;
    const maxX = ne.lng;


    for (let x = minX; x <= maxX; x += gridSize) {
      const line = L.polyline(
        [
          [minY, x],
          [maxY, x],
        ],
        { color: "#ccc", weight: 1, opacity: 0.3 }
      );
      gridLayer.addLayer(line);
    }

    for (let y = minY; y <= maxY; y += gridSize) {
      const line = L.polyline(
        [
          [y, minX],
          [y, maxX],
        ],
        { color: "#ccc", weight: 1, opacity: 0.3 }
      );
      gridLayer.addLayer(line);
    }

    gridLayer.addTo(map);

    // --- Отрисовываем скважины (только устья) ---
    const wellsLayer = L.layerGroup();

    data.forEach((d) => {
      const start = [parseFloat(d.DisplayY), parseFloat(d.DisplayX)];

      // Отрисовываем только маркер устья
      const marker = L.circleMarker(start, {
        radius: 4,
        color: "#FF0000",
        fillColor: "#FF0000",
        fillOpacity: 1,
      })
        .bindTooltip(
          `<b>${d.WellName || "Без имени"}</b><br/>
           X: ${d.DisplayX}<br/>
           Y: ${d.DisplayY}` // Удалена координата Z
        )
        .addTo(wellsLayer);
    });

    wellsLayer.addTo(map);

    // --- Контроль ЛСК (консоль) ---
    const xs = allCoords.map((p) => p[1]);
    const ys = allCoords.map((p) => p[0]);
    // Удалены расчеты Z

    console.log("✅ Проверка ЛСК (контроль)");
    console.table({
      "min X": Math.min(...xs),
      "max X": Math.max(...xs),
      "span X": Math.max(...xs) - Math.min(...xs),
      "min Y": Math.min(...ys),
      "max Y": Math.max(...ys),
      "span Y": Math.max(...ys) - Math.min(...ys),
    });

    // Очистка при размонтировании
    return () => map.remove();
  }, [data]);

  return (
    <div
      id="map"
      style={{
        height: "85vh",
        width: "100%",
        border: "1px solid #999",
        borderRadius: "8px",
      }}
    />
  );
};

export default MapComponent;
