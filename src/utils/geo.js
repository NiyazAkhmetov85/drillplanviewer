// src/utils/geo.js

// --- КОНСТАНТЫ ТРАНСФОРМАЦИИ (Извлечены из AltynTau_coord_sys_report.pdf) ---

[cite_start]// 1. Параметры смещения (Ax и Aγ) [cite: 18]
const TX = 4458.9140; [cite_start]// Сдвиг по X (Ax) [cite: 18]
const TY = 7317.3475; [cite_start]// Сдвиг по Y (Aγ) [cite: 18]

[cite_start]// 2. Параметр поворота в гонах (grads) [cite: 18]
const ROT_GON = 398.9098; 

[cite_start]// 3. Параметр масштаба (M) [cite: 18]
const SCALE = 1.000097549103;

// Преобразование угла поворота из гон в радианы (система координат использует гоны)
// Угол R = (398.9098 - 400.0) гон, 1 гон = PI / 200 радиан.
const R_RAD = (ROT_GON - 400.0) * (Math.PI / 200.0);

const COS_R = Math.cos(R_RAD);
const SIN_R = Math.sin(R_RAD);


/**
 * Применяет 2D трансформацию Гельмерта (Сдвиг, Поворот, Масштаб)
 * для перевода координат из Исходной СК (Raw / USLOVWGS) в Локальную СК (Local / Система В).
 * * @param {number} x_raw Исходная координата X (Восток)
 * @param {number} y_raw Исходная координата Y (Север)
 * @returns {{x: number, y: number}} Локальные координаты (X_local, Y_local)
 */
export const transformRawToLocal = (x_raw, y_raw) => {
    
    // 1. Применяем вращение и масштабирование
    // X_rotated = M * (X_raw * cos(R) - Y_raw * sin(R))
    const rotatedScaledX = SCALE * (x_raw * COS_R - y_raw * SIN_R);
    // Y_rotated = M * (X_raw * sin(R) + Y_raw * cos(R))
    const rotatedScaledY = SCALE * (x_raw * SIN_R + y_raw * COS_R);

    // 2. Применяем сдвиг (Tx и Ty)
    const X_local = rotatedScaledX + TX;
    const Y_local = rotatedScaledY + TY;
    
    return { x: X_local, y: Y_local };
};
