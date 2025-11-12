// src/GlobalMapComponent.jsx
import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Внешняя функция для выполнения обратной трансформации
import { transformUSLOVtoWGS84 } from "./utils/geotransform"; 

const GlobalMapComponent = ({ data }) => {
  const mapRef = useRef(null);

  useEffect(() => {
    // Используем стандартную CRS для географических координат
    const map = L.map(mapRef.current, {
      crs: L.CRS.EPSG3857, // Web Mercator (стандарт Google Maps)
      center: [53.4132, 69.2386], // Приблизительный центр месторождения
      zoom: 12,
    });

    // 1. Добавление подложки Google Maps (через прокси-сервис или плагин)
    // Внимание: Google Maps API требует ключа и плагина, 
    // поэтому используем OSM (OpenStreetMap) как легальный аналог для примера:
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 2. Трансформация и отрисовка данных скважин
    const wellMarkers = [];
    
    data.forEach((d) => {
      // Исходные координаты USLOVWGS
      const easting = parseFloat(d.DisplayX);
      const northing = parseFloat(d.DisplayY);
      
      // *** Главный шаг: Трансформация ***
      // Получаем [широта, долгота]
      const [lat, lng] = transformUSLOVtoWGS84(easting, northing); 
      
      if (lat && lng) {
        // Добавляем маркер на глобальной карте
        const marker = L.marker([lat, lng])
          .bindTooltip(`Скважина: ${d.WellName} (WGS84)`, { permanent: false, sticky: true })
          .addTo(map);
          
        wellMarkers.push(marker);
      }
    });

    // Определение границ для масштабирования карты
    if (wellMarkers.length > 0) {
      const bounds = L.featureGroup(wellMarkers).getBounds();
      map.fitBounds(bounds.pad(0.15));
    }

    return () => map.remove();
  }, [data]);

  return <div id="global-map" ref={mapRef} style={{ height: "85vh", width: "100%" }} />;
};

export default GlobalMapComponent;
