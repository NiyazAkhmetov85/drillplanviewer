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

    // Инициализация карты
    const map = L.map(mapRef.current, {
      crs: L.CRS.EPSG3857, 
      // Приблизительный центр месторождения
      center: [53.4132, 69.2386], 
      zoom: 12,
      zoomControl: data && data.length > 0,
    });

    // 1. Добавление подложки (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
        // ДОБАВЛЕНА ОПЦИЯ, ЕСЛИ КАРТА ЗЕРКАЛЬНАЯ:
        // tms: true, // Использовать только если OSM был перевернут специально.
        // Для OSM это обычно не требуется. Проверим, что Leaflet правильно
        // обрабатывает оси Z/X/Y.
        // В данном случае, проблема может быть в настройке CRS, но она стандартна (EPSG3857).

        // Если карта перевернута, попробуйте tms: true (Tile Map Service)
        tms: true 
    }).addTo(map);

    // 2. Трансформация и отрисовка данных скважин
    const wellMarkers = [];
    
    // Переопределение иконки маркера по умолчанию (требуется для Leaflet в React/Vite)
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    data.forEach((d) => {
      // Исходные координаты USLOVWGS
      const easting = parseFloat(d.DisplayX); // Восток (X)
      const northing = parseFloat(d.DisplayY); // Север (Y)
      
      // *** Главный шаг: Трансформация ***
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
    return () => {
        if (map) {
            map.remove();
        }
    };
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


