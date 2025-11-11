// src/utils/geo.js

// --- КОНСТАНТЫ ТРАНСФОРМАЦИИ (Из AltynTau_coord_sys_report.pdf) ---
const TX = 0; // Сдвиг по X 
const TY = 0; // Сдвиг по Y 
const ROT_GON = 398.9098; 
const SCALE = 1.000097549103;

// Преобразование угла поворота из гонов в радианы
const R_RAD = (ROT_GON - 400.0) * (Math.PI / 200.0);
const COS_R = Math.cos(R_RAD);
const SIN_R = Math.sin(R_RAD);

// Предвычисленные коэффициенты
const FACTOR_A = SCALE * COS_R;
const FACTOR_B = SCALE * SIN_R;

/**
 * Применяет 2D-трансформацию Гельмерта
 * для перевода координат из Исходной СК в Локальную СК.
 */
export const transformRawToLocal = (x_raw, y_raw) => {
  const X_local = TX + (FACTOR_A * x_raw) - (FACTOR_B * y_raw);
  const Y_local = TY + (FACTOR_B * x_raw) + (FACTOR_A * y_raw);
  return { x: X_local, y: Y_local };
};

/**
 * Нормализует координаты ЛСК для корректного отображения в Leaflet CRS.Simple.
 * Смещает минимальные X/Y в ноль (Leaflet не любит отрицательные Y).
 */
export const normalizeLocalCoords = (data) => {
  if (!data.length) return [];

  const minX = Math.min(...data.map(d => parseFloat(d.LocalStartPointX)));
  const minY = Math.min(...data.map(d => parseFloat(d.LocalStartPointY)));

  return data.map(d => ({
    ...d,
    DisplayX: parseFloat(d.LocalStartPointX) - minX,
    DisplayY: parseFloat(d.LocalStartPointY) - minY,
    DisplayEndX: parseFloat(d.LocalEndPointX) - minX,
    DisplayEndY: parseFloat(d.LocalEndPointY) - minY,
  }));
};
