// src/MapComponent.jsx
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Обязательный импорт CSS для Leaflet
import L from 'leaflet';

// --- НАСТРОЙКА LEAFLET ---
// 1. Исправление проблемы с иконками Leaflet по умолчанию в React/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// 2. Пользовательский синий маркер для конца скважины
const endMarkerIcon = new L.DivIcon({ 
    className: 'end-marker', 
    html: '<div style="background-color: blue; width: 8px; height: 8px; border-radius: 50%;"></div>',
    iconSize: [8, 8],
    iconAnchor: [4, 4] // Центрируем маркер
});

// 3. Компонент для автоматического изменения границ карты при обновлении данных
const ChangeView = ({ bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length > 1) {
            // Устанавливаем границы карты, добавляя немного отступа (padding)
            map.fitBounds(bounds, { padding: [50, 50] }); 
        }
    }, [bounds, map]);
    return null;
};

// --- ОСНОВНОЙ КОМПОНЕНТ КАРТЫ ---
const MapComponent = ({ data }) => {
    // В Leaflet [Lat, Lng] соответствует [Y, X] при использовании L.CRS.Simple
    
    // 1. Получаем все точки для определения границ карты
    const allCoords = data.flatMap(item => [
        // [Y_Local, X_Local] для начала скважины
        [parseFloat(item.LocalStartPointY), parseFloat(item.LocalStartPointX)],
        // [Y_Local, X_Local] для конца скважины
        [parseFloat(item.LocalEndPointY), parseFloat(item.LocalEndPointX)]
    ]);
    
    // Находим границы. Если данных нет, используем дефолтные границы (для пустой карты)
    const bounds = allCoords.length > 0 ? allCoords : [[7000, 4000], [7500, 4500]]; 
    
    // Вычисляем приблизительный центр (для начальной установки, если нет bounds)
    const center = bounds.length > 1 ? [
        (bounds.reduce((sum, p) => sum + p[0], 0) / bounds.length),
        (bounds.reduce((sum, p) => sum + p[1], 0) / bounds.length)
    ] : [7250, 4250];

    return (
        <MapContainer 
            center={center}
            zoom={13} 
            scrollWheelZoom={true} 
            style={{ height: '100%', width: '100%' }}
            // !!! ИСПОЛЬЗУЕМ КАРТЕЗИАНСКУЮ СИСТЕМУ КООРДИНАТ !!!
            crs={L.CRS.Simple} 
            maxZoom={20}
            minZoom={12}
        >
            {/* Этот компонент автоматически центрирует карту при загрузке новых данных */}
            <ChangeView bounds={bounds} />

            {/* Базовая подложка (можно убрать, так как CRS.Simple не отображает OSM) */}
            {/* Мы оставляем TileLayer, чтобы Vercel не ругался на отсутствие children у MapContainer */}
            <TileLayer
                attribution='Drill Plan Viewer (ЛСК)'
                url="" // Пустая строка или URL, если у вас есть своя карта в метрах
                opacity={0.0}
            />

            {data.map((item, index) => {
                // Leaflet ожидает [Y, X]
                const startPoint = [parseFloat(item.LocalStartPointY), parseFloat(item.LocalStartPointX)];
                const endPoint = [parseFloat(item.LocalEndPointY), parseFloat(item.LocalEndPointX)];
                const path = [startPoint, endPoint];
                
                return (
                    <React.Fragment key={index}>
                        {/* 1. Линия скважины (Красный цвет) */}
                        <Polyline positions={path} color="#dc3545" weight={3} opacity={0.8} />

                        {/* 2. Маркер начала скважины (Стандартный Leaflet маркер) */}
                        <Marker position={startPoint}>
                            <Popup>
                                <strong>{item.HoleName || 'N/A'}</strong> (Начало)<br/>
                                X: {item.LocalStartPointX} м<br/>
                                Y: {item.LocalStartPointY} м<br/>
                                Z: {item.LocalStartPointZ} м
                            </Popup>
                        </Marker>
                        
                        {/* 3. Маркер конца скважины (Синяя точка) */}
                        <Marker position={endPoint} icon={endMarkerIcon}>
                            <Popup>
                                <strong>{item.HoleName || 'N/A'}</strong> (Конец)<br/>
                                X: {item.LocalEndPointX} м<br/>
                                Y: {item.LocalEndPointY} м<br/>
                                Z: {item.LocalEndPointZ} м
                            </Popup>
                        </Marker>
                    </React.Fragment>
                );
            })}
        </MapContainer>
    );
};

export default MapComponent;
