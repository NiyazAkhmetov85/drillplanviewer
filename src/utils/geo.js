// viewer-app/src/utils/geo.js

// --- КОНСТАНТЫ ТРАНСФОРМАЦИИ ---
const TX = 4458.9140; // Сдвиг по X
const TY = 7317.3475; // Сдвиг по Y
const ROT_GON = 398.9098; // Поворот в гонах

// Преобразование гон в радианы
const R_RAD = (ROT_GON - 400.0) * (Math.PI / 200.0);
const COS_R = Math.cos(R_RAD);
const SIN_R = Math.sin(R_RAD);

/**
 * Применяет 2D трансформацию Гельмерта к точке
 * @param {number} x_raw Исходная координата X
 * @param {number} y_raw Исходная координата Y
 * @returns {{x: number, y: number}} Локальные координаты
 */
export const applyTransformation = (x_raw, y_raw) => {
    // Формула: X_local = X_raw * cos(R) - Y_raw * sin(R) + Tx
    const X_local = (x_raw * COS_R - y_raw * SIN_R) + TX;
    // Формула: Y_local = X_raw * sin(R) + Y_raw * cos(R) + Ty
    const Y_local = (x_raw * SIN_R + y_raw * COS_R) + TY;
    
    return { x: X_local, y: Y_local };
};
