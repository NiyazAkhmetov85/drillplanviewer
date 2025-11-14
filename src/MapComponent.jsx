// src/MapComponent.jsx
import React, { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Параметры для настройки сетки и осей
const GRID_STEP = 10; // Шаг основной сетки (10 метров)
const LABEL_INTERVAL = 50; // Интервал для отображения чисел (каждые 50 метров)
const TICK_LENGTH = 5; // Длина засечки в метрах

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
      trackResize: true, 
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
    map.fitBounds(bounds.pad(0.1)); 

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    
    // Расширяем границы, чтобы учесть метки и засечки
    const padding = 10;
    const minY = sw.lat - padding;
    const minX = sw.lng - padding;
    const maxY = ne.lat + padding;
    const maxX = ne.lng + padding;
    
    // Снова устанавливаем границы с учетом расширения
    map.fitBounds(L.latLngBounds([ [minY, minX], [maxY, maxX] ]));

    // Выравнивание сетки
    const startX = Math.floor(minX / GRID_STEP) * GRID_STEP;
    const startY = Math.floor(minY / GRID_STEP) * GRID_STEP;

    // --- Добавляем визуализацию осей и сетки ---
    const gridLayer = L.layerGroup();
    const axisLabelsLayer = L.layerGroup();
    const axisLinesLayer = L.layerGroup(); 

    // 1. Полная сетка (10 метров)
    for (let x = startX; x <= maxX; x += GRID_STEP) { 
      const isMajor = x % LABEL_INTERVAL === 0;
      const line = L.polyline(
        [ [minY, x], [maxY, x] ],
        { 
          color: "#AAA", 
          weight: isMajor ? 0.7 : 0.3, // Толще для 50м, тоньше для 10м
          opacity: 0.4, 
          dashArray: isMajor ? '2, 2' : '1, 3' // Разный тип линии
        } 
      );
      gridLayer.addLayer(line);
    }

    for (let y = startY; y <= maxY; y += GRID_STEP) {
      const isMajor = y % LABEL_INTERVAL === 0;
      const line = L.polyline(
        [ [y, minX], [y, maxX] ],
        { 
          color: "#AAA", 
          weight: isMajor ? 0.7 : 0.3, 
          opacity: 0.4, 
          dashArray: isMajor ? '2, 2' : '1, 3'
        }
      );
      gridLayer.addLayer(line);
    }
    
    // 2. Линии осей и метки
    
    // --- Линии X (Вертикальные, Левая и Правая границы) ---
    L.polyline(
        [ [minY, minX], [maxY, minX] ], 
        { color: "#000", weight: 1.5, opacity: 0.8 }
    ).addTo(axisLinesLayer);
    L.polyline(
        [ [minY, maxX], [maxY, maxX] ], 
        { color: "#000", weight: 1.5, opacity: 0.8 }
    ).addTo(axisLinesLayer);

    // --- Линии Y (Горизонтальные, Нижняя и Верхняя границы) ---
    L.polyline(
        [ [minY, minX], [minY, maxX] ], 
        { color: "#000", weight: 1.5, opacity: 0.8 }
    ).addTo(axisLinesLayer);
    L.polyline(
        [ [maxY, minX], [maxY, maxX] ], 
        { color: "#000", weight: 1.5, opacity: 0.8 }
    ).addTo(axisLinesLayer);
    
    
    // 3. Метки и засечки (Тики) - по всем четырем сторонам
    
    for (let x = startX; x <= maxX; x += GRID_STEP) {
        const isLabeled = x % LABEL_INTERVAL === 0;
        const html = isLabeled ? Math.round(x).toString() : '';

        // Метка оси X (Восток) - внизу
        L.marker([minY, x], {
            icon: L.divIcon({
                className: 'axis-label x-axis-label font-mono text-xs text-gray-800',
                html: html,
                iconSize: [0, 0],
                iconAnchor: [0, -15] 
            })
        }).addTo(axisLabelsLayer);
        // Засечка внизу
        L.polyline([ [minY, x], [minY + TICK_LENGTH, x] ], { color: "#000", weight: 1 }).addTo(axisLabelsLayer);
        
        // Метка оси X (Восток) - вверху
        L.marker([maxY, x], {
            icon: L.divIcon({
                className: 'axis-label x-axis-label font-mono text-xs text-gray-800',
                html: html,
                iconSize: [0, 0],
                iconAnchor: [0, 10] 
            })
        }).addTo(axisLabelsLayer);
        // Засечка вверху
        L.polyline([ [maxY, x], [maxY - TICK_LENGTH, x] ], { color: "#000", weight: 1 }).addTo(axisLabelsLayer);
    }
    
    for (let y = startY; y <= maxY; y += GRID_STEP) {
        const isLabeled = y % LABEL_INTERVAL === 0;
        const html = isLabeled ? Math.round(y).toString() : '';

        // Метка оси Y (Север) - слева
        L.marker([y, minX], {
            icon: L.divIcon({
                className: 'axis-label y-axis-label font-mono text-xs text-gray-800',
                html: html,
                iconSize: [0, 0],
                iconAnchor: [15, 0] 
            })
        }).addTo(axisLabelsLayer);
        // Засечка слева
        L.polyline([ [y, minX], [y, minX + TICK_LENGTH] ], { color: "#000", weight: 1 }).addTo(axisLabelsLayer);
        
        // Метка оси Y (Север) - справа
        L.marker([y, maxX], {
            icon: L.divIcon({
                className: 'axis-label y-axis-label font-mono text-xs text-gray-800',
                html: html,
                iconSize: [0, 0],
                iconAnchor: [-15, 0] 
            })
        }).addTo(axisLabelsLayer);
        // Засечка справа
        L.polyline([ [y, maxX], [y, maxX - TICK_LENGTH] ], { color: "#000", weight: 1 }).addTo(axisLabelsLayer);
    }
    
    // 4. Добавление надписей осей X и Y
    // Надпись "Восток (X)" - внизу
    L.marker([minY, (minX + maxX) / 2], {
        icon: L.divIcon({
            className: 'axis-title font-bold text-sm text-gray-800',
            html: 'Восток (X)',
            iconSize: [0, 0],
            iconAnchor: [0, -40] // Смещение вниз
        })
    }).addTo(axisLabelsLayer);
    
    // Надпись "Север (Y)" - слева
    L.marker([(minY + maxY) / 2, minX], {
        icon: L.divIcon({
            className: 'axis-title font-bold text-sm text-gray-800',
            // Использование CSS-трансформации для поворота текста
            html: '<div style="transform: rotate(-90deg); white-space: nowrap;">Север (Y)</div>',
            iconSize: [0, 0],
            iconAnchor: [50, 0] // Смещение влево
        })
    }).addTo(axisLabelsLayer);


    gridLayer.addTo(map);
    axisLinesLayer.addTo(map);
    axisLabelsLayer.addTo(map);


    // --- Отрисовываем скважины (Устья) ---
    const wellsLayer = L.layerGroup();

    data.forEach((d) => {
      const start = [parseFloat(d.DisplayY), parseFloat(d.DisplayX)];

      // маркер устья
      const marker = L.circleMarker(start, {
        radius: 5,
        color: "#0055AA", // Темно-синий
        weight: 1.5,
        fillColor: "#0055AA",
        fillOpacity: 0.8,
      })
        // Подсказка при наведении
        .bindTooltip(
          `<b>${d.WellName || "Без имени"}</b><br/>
           Восток (X): ${d.DisplayX}<br/>
           Север (Y): ${d.DisplayY}`,
          { permanent: false, sticky: true }
        )
        .addTo(wellsLayer);

      // Метка (Label) с номером скважины (HoleName/WellName)
      L.marker(start, {
          icon: L.divIcon({
              className: 'well-label font-bold text-sm text-gray-800',
              html: `<b>${d.WellName || 'N/A'}</b>`, 
              iconAnchor: [-5, 12]
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
