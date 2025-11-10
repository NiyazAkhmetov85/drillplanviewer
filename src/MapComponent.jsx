// src/MapComponent.jsx
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Обязательный импорт CSS для Leaflet
import L from 'leaflet';

// Исправление проблемы с иконками Leaflet по умолчанию в React
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Нам нужно отобразить буровые как линии на карте.
// Каждая линия - это путь от LocalStartPoint до LocalEndPoint.

const MapComponent = ({ data }) => {
    if (!data || data.length === 0) {
        // Базовые координаты (центр участка для пустого состояния)
        const defaultCenter = [8200, 7500]; 
        return (
            <MapContainer 
                center={defaultCenter} 
                zoom={14} 
                scrollWheelZoom={false} 
                style={{ height: '500px', width: '100%', border: '1px solid #ccc' }}
                crs={L.CRS.Simple} // Используем простую СК для работы с метрами
            >
                <div style={{ padding: '20px', backgroundColor: 'white', opacity: 0.8 }}>
                    Загрузите файл для отображения данных на карте.
                </div>
            </MapContainer>
        );
    }
    
    // 1. Получаем все точки для определения границ карты
    const allCoords = data.flatMap(item => [
        [parseFloat(item.LocalStartPointY), parseFloat(item.LocalStartPointX)],
        [parseFloat(item.LocalEndPointY), parseFloat(item.LocalEndPointX)]
    ]);
    
    // Если есть данные, находим центр и границы
    const bounds = allCoords.length > 0 ? allCoords : [[8200, 7500], [8300, 7600]];
    const center = [
        (bounds.reduce((sum, p) => sum + p[0], 0) / bounds.length) || 8200,
        (bounds.reduce((sum, p) => sum + p[1], 0) / bounds.length) || 7500
    ];

    return (
        <MapContainer 
            bounds={bounds} // Автоматически устанавливает зум и центр по всем точкам
            center={center}
            zoom={15} 
            scrollWheelZoom={true} 
            style={{ height: '700px', width: '100%' }}
            crs={L.CRS.Simple} // Используем простую СК для метрических данных (X, Y)
        >
            <TileLayer
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                opacity={0.0} // Скрываем стандартную карту, работаем с простой СК
            />

            {data.map((item, index) => {
                const startPoint = [parseFloat(item.LocalStartPointY), parseFloat(item.LocalStartPointX)];
                const endPoint = [parseFloat(item.LocalEndPointY), parseFloat(item.LocalEndPointX)];
                const path = [startPoint, endPoint];
                
                // Отображаем линию скважины
                return (
                    <React.Fragment key={index}>
                        <Polyline positions={path} color="red" weight={3} opacity={0.8} />

                        {/* Маркер начала скважины */}
                        <Marker position={startPoint}>
                            <Popup>
                                **{item.HoleName}** (Начало)<br/>
                                X: {item.LocalStartPointX}, Y: {item.LocalStartPointY}, Z: {item.LocalStartPointZ}
                            </Popup>
                        </Marker>
                        
                        {/* Маркер конца скважины (можно скрыть или сделать другим цветом) */}
                        <Marker position={endPoint} icon={new L.DivIcon({ className: 'end-marker', html: '<div style="background-color: blue; width: 8px; height: 8px; border-radius: 50%;"></div>' })}>
                            <Popup>
                                **{item.HoleName}** (Конец)<br/>
                                X: {item.LocalEndPointX}, Y: {item.LocalEndPointY}, Z: {item.LocalEndPointZ}
                            </Popup>
                        </Marker>
                    </React.Fragment>
                );
            })}
        </MapContainer>
    );
};

export default MapComponent;
