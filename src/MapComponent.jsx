// src/MapComponent.jsx
import React, { useEffect } from 'react';
import { MapContainer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const endMarkerIcon = new L.DivIcon({
  className: 'end-marker',
  html: '<div style="background-color: blue; width: 8px; height: 8px; border-radius: 50%;"></div>',
  iconSize: [8, 8],
  iconAnchor: [4, 4],
});

const ChangeView = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds?.length > 1) map.fitBounds(bounds, { padding: [100, 100] });
  }, [bounds, map]);
  return null;
};

const GridOverlay = ({ bounds, step = 5 }) => {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    const [[yMin, xMin], [yMax, xMax]] = bounds;
    for (let x = xMin; x <= xMax; x += step)
      L.polyline([[yMin, x], [yMax, x]], { color: 'gray', weight: 0.3, opacity: 0.5 }).addTo(map);
    for (let y = yMin; y <= yMax; y += step)
      L.polyline([[y, xMin], [y, xMax]], { color: 'gray', weight: 0.3, opacity: 0.5 }).addTo(map);
  }, [bounds, map]);
  return null;
};

const MapComponent = ({ data }) => {
  if (!data?.length) return null;

  const allCoords = data.flatMap(d => [
    [parseFloat(d.DisplayY), parseFloat(d.DisplayX)],
    [parseFloat(d.DisplayEndY), parseFloat(d.DisplayEndX)],
  ]);

  const bounds = L.latLngBounds(allCoords);
  const center = bounds.getCenter();

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={18}
      crs={L.CRS.Simple}
      minZoom={0}
      maxZoom={30}
      scrollWheelZoom={true}
      style={{ height: '600px', width: '100%' }}
    >
      <ChangeView bounds={bounds} />
      <GridOverlay bounds={bounds} step={5} />
      {data.map((item, index) => {
        const start = [parseFloat(item.DisplayY), parseFloat(item.DisplayX)];
        const end = [parseFloat(item.DisplayEndY), parseFloat(item.DisplayEndX)];
        return (
          <React.Fragment key={index}>
            <Polyline positions={[start, end]} color="#dc3545" weight={2} />
            <Marker position={start}>
              <Popup>
                <strong>{item.HoleName}</strong><br />
                X: {item.LocalStartPointX}<br />
                Y: {item.LocalStartPointY}
              </Popup>
            </Marker>
            <Marker position={end} icon={endMarkerIcon}>
              <Popup>
                <strong>{item.HoleName}</strong> (конец)<br />
                X: {item.LocalEndPointX}<br />
                Y: {item.LocalEndPointY}
              </Popup>
            </Marker>
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
};

export default MapComponent;
