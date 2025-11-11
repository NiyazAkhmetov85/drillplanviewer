// src/MapComponent.jsx
import React, { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Добавляем поддержку меток (labels) для Leaflet, если они используются
// Хотя Leaflet.label не подключен, мы будем использовать стандартный L.tooltip 
// для отображения номеров скважин и L.marker для меток осей.
// Для простоты используем стандартные возможности Leaflet.

const MapComponent = ({ data }) => {
  useEffect(() => {
    // Очистка старой карты
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

      if (isNaN(start[0]) || isNaN(start[1])) {
        // Предупреждение о некорректных координатах (срабатывать не должно)
        return [];
      }

      return [start]; 
    });

    if (allCoords.length === 0) {
      console.error("❌ Нет валидных координат для отображения!");
      map.setView([0, 0], 1);
      return;
    }

    // --- Определяем границы ---
    const bounds = L.latLngBounds(allCoords);
    map.fitBounds(bounds.pad(0.15)); // чуть больше границ

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    
    const minY = sw.lat;
    const minX = sw.lng;
    const maxY = ne.lat;
    const maxX = ne.lng;

    // --- Добавляем визуальную сетку (Разделители) ---
    const gridSize = 50; // шаг сетки в метрах
    const gridLayer = L.layerGroup();
    const axisLabelsLayer = L.layerGroup();

    // Сетка по X и Y
    for (let x = minX; x <= maxX; x += gridSize) {
      const line = L.polyline(
        [ [minY, x], [maxY, x] ],
        { color: "#ccc", weight: 1, opacity: 0.3 }
      );
      gridLayer.addLayer(line);
      
      // Метка оси X внизу
      L.marker([minY, x], { // Используем маркер для позиционирования метки
          icon: L.divIcon({
              className: 'axis-label x-axis-label',
              html: Math.round(x).toString(), // Номер разделителя
              iconSize: [0, 0]
          })
      }).addTo(axisLabelsLayer);
    }

    for (let y = minY; y <= maxY; y += gridSize) {
      const line = L.polyline(
        [ [y, minX], [y, maxX] ],
        { color: "#ccc", weight: 1, opacity: 0.3 }
      );
      gridLayer.addLayer(line);

      // Метка оси Y слева
      L.marker([y, minX], {
          icon: L.divIcon({
              className: 'axis-label y-axis-label',
              html: Math.round(y).toString(), // Номер разделителя
              iconSize: [0, 0]
          })
      }).addTo(axisLabelsLayer);
    }

    gridLayer.addTo(map);
    axisLabelsLayer.addTo(map);


    // --- Отрисовываем скважины (Устья) ---
    const wellsLayer = L.layerGroup();

    data.forEach((d) => {
      const start = [parseFloat(d.DisplayY), parseFloat(d.DisplayX)];

      // маркер устья
      const marker = L.circleMarker(start, {
        radius: 4,
        color: "#FF0000",
        fillColor: "#FF0000",
        fillOpacity: 1,
      })
        // Подсказка при наведении
        .bindTooltip(
          `<b>${d.WellName || "Без имени"}</b><br/>
           X: ${d.DisplayX}<br/>
           Y: ${d.DisplayY}`,
          { permanent: false, sticky: true }
        )
        .addTo(wellsLayer);

      // Метка (Label) с номером скважины (HoleName/WellName)
      L.marker(start, {
          icon: L.divIcon({
              className: 'well-label',
              html: `<b>${d.WellName || 'N/A'}</b>`, // Номер скважины
              iconAnchor: [-5, 10] // Смещение, чтобы метка была рядом с маркером
          })
      }).addTo(wellsLayer);

    });

    wellsLayer.addTo(map);

    // --- Контроль ЛСК (консоль) ---
    const xs = allCoords.map((p) => p[1]);
    const ys = allCoords.map((p) => p[0]);

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
