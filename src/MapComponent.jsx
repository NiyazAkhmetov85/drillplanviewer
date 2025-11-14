// src/MapComponent.jsx
import React, { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Параметры для настройки сетки, взятые из конфигурации
const GRID_STEP = 50; // Шаг сетки в метрах (соответствует старому gridSize)
const MAP_ORG_X = 6500; // map_orgx
const MAP_ORG_Y = 4500; // map_orgy
// const CELL_SIZE = 2.0; // Может использоваться для более мелкой, вспомогательной сетки, но для минимальных правок мы оставим GRID_STEP = 50.

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
    map.fitBounds(bounds.pad(0.1)); // Уменьшим паддинг для более плотного вида

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    
    const minY = sw.lat;
    const minX = sw.lng;
    const maxY = ne.lat;
    const maxX = ne.lng;

    // --- Добавляем визуальную сетку (Разделители) ---
    const gridSize = GRID_STEP; // используем нашу константу
    const gridLayer = L.layerGroup();
    const axisLabelsLayer = L.layerGroup();
    
    // Начинаем сетку с ближайшего кратного GRID_STEP, чтобы избежать "обрезанных" линий
    const startX = Math.floor(minX / gridSize) * gridSize;
    const startY = Math.floor(minY / gridSize) * gridSize;

    // Сетка по X и Y
    for (let x = startX; x <= maxX; x += gridSize) { // Используем startX
      const line = L.polyline(
        [ [minY, x], [maxY, x] ],
        { color: "#888", weight: 0.5, opacity: 0.5, dashArray: '5, 5' } // Более тонкая, серая, пунктирная
      );
      gridLayer.addLayer(line);
      
      // Метка оси X внизу
      L.marker([minY, x], {
          icon: L.divIcon({
              // Улучшенный стиль: моноширинный шрифт, темный цвет
              className: 'axis-label x-axis-label text-xs font-mono text-gray-700', 
              html: Math.round(x).toString(), 
              iconSize: [0, 0],
              iconAnchor: [0, -10] // Смещение, чтобы метки не налезали на карту
          })
      }).addTo(axisLabelsLayer);
    }

    for (let y = startY; y <= maxY; y += gridSize) { // Используем startY
      const line = L.polyline(
        [ [y, minX], [y, maxX] ],
        { color: "#888", weight: 0.5, opacity: 0.5, dashArray: '5, 5' } // Более тонкая, серая, пунктирная
      );
      gridLayer.addLayer(line);

      // Метка оси Y слева
      L.marker([y, minX], {
          icon: L.divIcon({
              // Улучшенный стиль: моноширинный шрифт, темный цвет
              className: 'axis-label y-axis-label text-xs font-mono text-gray-700',
              html: Math.round(y).toString(),
              iconSize: [0, 0],
              iconAnchor: [10, 0] // Смещение, чтобы метки не налезали на карту
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
        radius: 5, // Немного увеличенный маркер
        color: "#3333FF", // Синий цвет (типичный для планируемых скважин)
        weight: 1.5,
        fillColor: "#3333FF",
        fillOpacity: 0.8,
      })
        // Подсказка при наведении
        .bindTooltip(
          `<b>${d.WellName || "Без имени"}</b><br/>
           Восток (X): ${d.DisplayX}<br/>
           Север (Y): ${d.DisplayY}`, // Уточнение осей в подсказке
          { permanent: false, sticky: true }
        )
        .addTo(wellsLayer);

      // Метка (Label) с номером скважины (HoleName/WellName)
      L.marker(start, {
          icon: L.divIcon({
              // Улучшенный стиль: жирный шрифт
              className: 'well-label font-bold text-sm text-gray-800',
              html: `<b>${d.WellName || 'N/A'}</b>`, 
              iconAnchor: [-5, 12] // Смещение, чтобы метка была рядом с маркером
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
