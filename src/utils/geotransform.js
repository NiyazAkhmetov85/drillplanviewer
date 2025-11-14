// src/utils/geotransform.js
// ИСПРАВЛЕНО: Параметры проекции (lat_0, lon_0, k, x_0, y_0) взяты из "Отчета системы координат".
// Параметры аффинного сдвига (shiftx, shifty) оставлены из исходного конфига, 
// так как x0, y0 в Отчете относятся к сложной трансформации "Один шаг".

import proj4 from 'proj4';

// ----------------------------------------------------------------------
// 1. ПАРАМЕТРЫ ПРОЕКЦИИ USLOVWGS (Transverse Mercator) - ИЗ ОТЧЕТА
// ----------------------------------------------------------------------

// Широта начала системы координат (53° 24' 47,53" C) 
const LAT_0_DECIMAL = 53.41320278;  
// Долгота начала системы координат (69° 14' 18,99" B) 
const LON_0_DECIMAL = 69.23860833;  

// Масштаб (Scale factor) (Масштаб: 1,000097549103) 
const SCALE_FACTOR = 1.000097549103; 

// Ложный восток / север (Ax, Aγ) 
const FALSE_EASTING = 4458.9140; 
const FALSE_NORTHING = 7317.3475; 

// Параметры Эллипсоида (A_MAJOR, B_MINOR) - Оставлены из исходного [local_grid]
const A_MAJOR = 6378137.0; // Большая полуось
const B_MINOR = 6356752.314; // Малая полуось

// ----------------------------------------------------------------------
// 2. ПАРАМЕТРЫ АФФИННОГО СДВИГА (Translation/Datum Shift) - ИЗ [local_grid]
// Используем shiftx/shifty, так как x0/y0 в Отчете могут относиться к сложной трансформации.
// ----------------------------------------------------------------------

const AFFINE_SHIFT_X = -427158.6119;
const AFFINE_SHIFT_Y = -5923276.8046;

// ----------------------------------------------------------------------
// 3. Определение систем координат
// ----------------------------------------------------------------------

// WGS84 (Географическая система, широта/долгота)
const WGS84 = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";

// USLOVWGS (Локальная проекция Transverse Mercator с явным эллипсоидом)
const USLOVWGS_DEF = `+proj=tmerc
                      +lat_0=${LAT_0_DECIMAL}
                      +lon_0=${LON_0_DECIMAL}
                      +k=${SCALE_FACTOR}
                      +x_0=${FALSE_EASTING}
                      +y_0=${FALSE_NORTHING} 
                      +a=${A_MAJOR}
                      +b=${B_MINOR}
                      +units=m +no_defs`;

// ----------------------------------------------------------------------
// 4. Трансформация USLOVWGS -> WGS84
// ----------------------------------------------------------------------

/**
 * Выполняет обратную геодезическую трансформацию из ЛСК USLOVWGS в WGS84,
 * предварительно отменив локальный аффинный сдвиг.
 * @param {number} easting - Координата X (Восток) в метрах (Finalized Local Coord).
 * @param {number} northing - Координата Y (Север) в метрах (Finalized Local Coord).
 * @returns {[number | null, number | null]} - Массив [Широта, Долгота] (Lat, Lng).
 */
export function transformUSLOVtoWGS84(easting, northing) {
    if (isNaN(easting) || isNaN(northing)) return [null, null];

    try {
        // ШАГ 1: Применяем ОБРАТНЫЙ АФФИННЫЙ СДВИГ (Трансляция)
        // Вычитаем AFFINE_SHIFT, чтобы получить "чистые" координаты T-Merc.
        const correctedEasting = easting - AFFINE_SHIFT_X;
        const correctedNorthing = northing - AFFINE_SHIFT_Y;

        // ШАГ 2: Выполняем T-Merc -> WGS84
        const [longitude, latitude] = proj4(
            USLOVWGS_DEF, 
            WGS84, 
            [correctedEasting, correctedNorthing] 
        );
        
        // ШАГ 3: Возвращаем [Latitude, Longitude] 
        return [latitude, longitude]; 
    } catch (error) {
        console.error("Ошибка при трансформации USLOVWGS -> WGS84:", error);
        return [null, null];
    }
}
