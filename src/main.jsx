// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Общие стили для всего приложения (если есть)

import 'leaflet/dist/leaflet.css'; // Импорт базовых стилей Leaflet

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
