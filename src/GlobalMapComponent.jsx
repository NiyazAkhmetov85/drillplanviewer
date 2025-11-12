// src/GlobalMapComponent.jsx
import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Внешняя функция для выполнения обратной трансформации
import { transformUSLOVtoWGS84 } from "./utils/geotransform"; 

const GlobalMapComponent = ({ data }) => {
  // Используем useRef для доступа к DOM-элементу карты
  const mapRef = useRef(null);

  useEffect(() => {
    // Проверка, что элемент DOM доступен
    if (!mapRef.current) return;

    // Очистка старой карты, если она существует (хотя map.remove() в конце тоже работает)
    const existingMap = L.DomUtil.get(mapRef.current);
    if (existingMap && existingMap._leaflet_id) {
        existingMap._leaflet_id = null;
    }
    
    // Используем стандартную CRS для географических координат (WGS 84 / Web Mercator)
    const map = L.map(mapRef.current, {
      crs: L.CRS.EPSG3857, 
      // Приблизительный центр месторождения Алтынтау
      center: [53.4132, 69.2386], 
      zoom: 12,
      // Отключаем начальный зум, если есть данные
      zoomControl: data && data.length > 0,
    });

    // 1. Добавление подложки (OpenStreetMap как аналог Google Maps)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 2. Трансформация и отрисовка данных скважин
    const wellMarkers = [];
    
    data.forEach((d) => {
      // Исходные координаты USLOVWGS
      const easting = parseFloat(d.DisplayX); // Восток (X)
      const northing = parseFloat(d.DisplayY); // Север (Y)
      
      // *** Главный шаг: Трансформация ***
      // Получаем [широта, долгота] из USLOVWGS
      const [lat, lng] = transformUSLOVtoWGS84(easting, northing); 
      
      if (lat && lng) {
        // Добавляем маркер на глобальной карте
        const marker = L.marker([lat, lng])
          .bindTooltip(`Скважина: ${d.WellName || 'N/A'}<br/>WGS84: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 
                       { permanent: false, sticky: true })
          .addTo(map);
          
        wellMarkers.push(marker);
      }
    });

    // Определение границ для масштабирования карты
    if (wellMarkers.length > 0) {
      const bounds = L.featureGroup(wellMarkers).getBounds();
      map.fitBounds(bounds.pad(0.15));
    } else {
        console.warn("⚠️ Нет валидных координат для отображения на глобальной карте.");
    }

    // Функция очистки: удаляем карту при размонтировании компонента
    return () => map.remove();
  }, [data]);

  return (
    <div 
      id="global-map" 
      ref={mapRef} 
      style={{ 
        height: "85vh", 
        width: "100%",
        border: "1px solid #999",
        borderRadius: "8px", 
      }} 
    />
  );
};

export default GlobalMapComponent;
