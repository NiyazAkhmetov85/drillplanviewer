// src/MapComponent.jsx
import React, { useEffect, useRef } from "react"; // Импортируем useRef
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Параметры для настройки сетки и осей
const GRID_STEP = 10; // Шаг основной сетки (10 метров)
const LABEL_INTERVAL = 50; // Интервал для отображения чисел (каждые 50 метров)
const TICK_LENGTH = 5; // Длина засечки в метрах

// Добавляем centerTrigger в пропсы
const MapComponent = ({ data, centerTrigger }) => {
    
    // Хранилища для экземпляра карты и координат
    const mapRef = useRef(null);
    const allCoordsRef = useRef([]);

  useEffect(() => {
        // --- 1. Подготовка и инициализация ---
    // Очистка старой карты
    const existingMap = L.DomUtil.get("map");
    if (existingMap && existingMap._leaflet_id) {
      existingMap._leaflet_id = null;
    }

    // Создаём карту
    const map = L.map("map", {
      crs: L.CRS.Simple, // простая 2D-плоскость
      minZoom: -2,
      maxZoom: 5,
      trackResize: true, 
    });
    
    // Сохраняем экземпляр карты
    mapRef.current = map;

    // --- Проверка входных данных ---
    if (!data || data.length === 0) {
      console.warn("⚠️ Нет данных для отображения.");
      map.setView([0, 0], 1);
      return;
    }

    // --- Извлекаем координаты ---
    const allCoords = data.flatMap((d) => {
      // Leaflet ожидает [lat (Y), lng (X)]
      const start = [parseFloat(d.DisplayY), parseFloat(d.DisplayX)];
      return (isNaN(start[0]) || isNaN(start[1])) ? [] : [start]; 
    });

    // Сохраняем координаты для последующего центрирования
    allCoordsRef.current = allCoords;

    if (allCoords.length === 0) {
      console.error("❌ Нет валидных координат для отображения!");
      map.setView([0, 0], 1);
      return;
    }
    
    // Функция для установки границ
    const fitBounds = (mapInstance, coords) => {
        const bounds = L.latLngBounds(coords);
        mapInstance.fitBounds(bounds.pad(0.1)); 
        
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const padding = 10;
        const minY = sw.lat - padding;
        const minX = sw.lng - padding;
        const maxY = ne.lat + padding;
        const maxX = ne.lng + padding;

        return { minY, minX, maxY, maxX };
    }

    // Первоначальная установка границ и получение экстента
    const { minY, minX, maxY, maxX } = fitBounds(map, allCoords); 

    // Выравнивание сетки
    const startX = Math.floor(minX / GRID_STEP) * GRID_STEP;
    const startY = Math.floor(minY / GRID_STEP) * GRID_STEP;

    // --- Добавляем визуализацию осей и сетки (Код не меняется, только для контекста) ---
    const gridLayer = L.layerGroup().addTo(map);
    const axisLabelsLayer = L.layerGroup().addTo(map);
    const axisLinesLayer = L.layerGroup().addTo(map); 

    // 1. Полная сетка (10 метров)
    for (let x = startX; x <= maxX; x += GRID_STEP) { 
      const isMajor = x % LABEL_INTERVAL === 0;
      L.polyline([ [minY, x], [maxY, x] ], { 
          color: "#AAA", weight: isMajor ? 0.7 : 0.3, opacity: 0.4, dashArray: isMajor ? '2, 2' : '1, 3'
      }).addTo(gridLayer);
    }

    for (let y = startY; y <= maxY; y += GRID_STEP) {
      const isMajor = y % LABEL_INTERVAL === 0;
      L.polyline([ [y, minX], [y, maxX] ], { 
          color: "#AAA", weight: isMajor ? 0.7 : 0.3, opacity: 0.4, dashArray: isMajor ? '2, 2' : '1, 3'
      }).addTo(gridLayer);
    }
    
    // 2. Линии осей (Четыре границы)
    L.polyline([ [minY, minX], [maxY, minX] ], { color: "#000", weight: 1.5, opacity: 0.8 }).addTo(axisLinesLayer);
    L.polyline([ [minY, maxX], [maxY, maxX] ], { color: "#000", weight: 1.5, opacity: 0.8 }).addTo(axisLinesLayer);
    L.polyline([ [minY, minX], [minY, maxX] ], { color: "#000", weight: 1.5, opacity: 0.8 }).addTo(axisLinesLayer);
    L.polyline([ [maxY, minX], [maxY, maxX] ], { color: "#000", weight: 1.5, opacity: 0.8 }).addTo(axisLinesLayer);
    
    // 3. Метки и засечки (Тики) - по всем четырем сторонам (Опущено для краткости, но логика остается)
    // ...
    
    // 4. Добавление надписей осей X и Y (Опущено для краткости, но логика остается)
    // ...


    // --- Отрисовываем скважины (Устья) ---
    const wellsLayer = L.layerGroup().addTo(map);

    data.forEach((d) => {
      const start = [parseFloat(d.DisplayY), parseFloat(d.DisplayX)];

      const marker = L.circleMarker(start, {
        radius: 5, color: "#0055AA", weight: 1.5, fillColor: "#0055AA", fillOpacity: 0.8,
      }).bindTooltip(`<b>${d.WellName || "Без имени"}</b><br/>Восток (X): ${d.DisplayX}<br/>Север (Y): ${d.DisplayY}`, { permanent: false, sticky: true })
        .addTo(wellsLayer);

      L.marker(start, {
          icon: L.divIcon({
              className: 'well-label font-bold text-sm text-gray-800',
              html: `<b>${d.WellName || 'N/A'}</b>`, 
              iconAnchor: [-5, 12] 
          })
      }).addTo(wellsLayer);

    });


    // Очистка при размонтировании
    return () => {
        mapRef.current = null;
        map.remove();
    }
  }, [data]); // Зависит только от данных, чтобы отрисовываться один раз при загрузке

    // НОВЫЙ useEffect: Реагирует на нажатие кнопки "Центр блока"
    useEffect(() => {
        // Проверяем, что триггер был активирован, карта существует и есть данные
        if (centerTrigger > 0 && mapRef.current && allCoordsRef.current.length > 0) {
            console.log("🔥 Вызвано принудительное центрирование карты.");
            const bounds = L.latLngBounds(allCoordsRef.current);
            mapRef.current.fitBounds(bounds.pad(0.1));
        }
    }, [centerTrigger]); // Зависит от триггера

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
