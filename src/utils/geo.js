// src/utils/geo.js

// --- КОНСТАНТЫ ТРАНСФОРМАЦИИ (Извлечены из AltynTau_coord_sys_report.pdf) ---

// ВАЖНО: В геодезии параметры Гельмерта часто включают центральную точку
// (X_CENTER, Y_CENTER) в исходной системе, относительно которой выполняется поворот.
// Поскольку точный смысл TX/TY неясен (абсолютный сдвиг или центр), мы
// используем их как абсолютные сдвиги, но если карта пуста, попробуйте установить
// эти значения в 0 (TX = 0, TY = 0) для отладки, чтобы увидеть, где точки.

// 1. Параметры смещения (Tx и Ty). Оставлены как абсолютные сдвиги.
const TX = 0; // Сдвиг по X 
const TY = 0; // Сдвиг по Y 

// 2. Параметр поворота в гонах (grads)
const ROT_GON = 398.9098; 

// 3. Параметр масштаба (M)
const SCALE = 1.000097549103;

// Преобразование угла поворота из гон в радианы
// Угол R = (398.9098 - 400.0) гон. 
const R_RAD = (ROT_GON - 400.0) * (Math.PI / 200.0);

const COS_R = Math.cos(R_RAD);
const SIN_R = Math.sin(R_RAD);

// Факторы для упрощения расчета
const FACTOR_A = SCALE * COS_R;
const FACTOR_B = SCALE * SIN_R;


/**
 * Применяет 2D трансформацию Гельмерта (Сдвиг, Поворот, Масштаб)
 * для перевода координат из Исходной СК (Raw) в Локальную СК (Local).
 * * Стандартная формула:
 * X_local = TX + A*X_raw - B*Y_raw
 * Y_local = TY + B*X_raw + A*Y_raw
 * * @param {number} x_raw Исходная координата X
 * @param {number} y_raw Исходная координата Y
 * @returns {{x: number, y: number}} Локальные координаты
 */
export const transformRawToLocal = (x_raw, y_raw) => {
    
    // Применяем стандартную формулу 7-параметрической трансформации (2D часть)
    const X_local = TX + (FACTOR_A * x_raw) - (FACTOR_B * y_raw);
    const Y_local = TY + (FACTOR_B * x_raw) + (FACTOR_A * y_raw);
    
    return { x: X_local, y: Y_local };
};
