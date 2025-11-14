// src/utils/geotransform.js
// ИСПРАВЛЕНО: Добавлены параметры эллипсоида и реализован ОБРАТНЫЙ АФФИННЫЙ СДВИГ
// на основе значений shiftx и shifty из конфигурации [local_grid] для корректного позиционирования.

import proj4 from 'proj4';

// ----------------------------------------------------------------------
// 1. ПАРАМЕТРЫ ПРОЕКЦИИ USLOVWGS (Transverse Mercator)
// Параметры взяты из секции [local_grid] конфигурационного файла.
// ----------------------------------------------------------------------

// Широта центральной точки (оставлена старая, так как отсутствует в конфиге [local_grid])
const LAT_0_DECIMAL = 53.41320278; 
// Долгота центрального меридиана (из [local_grid] cmeridian=69)
const LON_0_DECIMAL = 69; 

// Масштаб (Scale factor) (из [local_grid] cm_scalef=0.99960)
const SCALE_FACTOR = 0.99960; 

// Ложный восток / север (Fictional origin for T-Merc projection)
const FALSE_EASTING = 500000.0; // из [local_grid] false_east=500000.0
const FALSE_NORTHING = 7317.3475; // оставлена старая

// Параметры Эллипсоида (из [local_grid] a_major, b_minor)
const A_MAJOR = 6378137.0; // Большая полуось
const B_MINOR = 6356752.314; // Малая полуось

// ----------------------------------------------------------------------
// 2. ПАРАМЕТРЫ АФФИННОГО СДВИГА (Translation/Datum Shift)
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
              _       +k=${SCALE_FACTOR}
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
        // Входной порядок для proj4: [Easting, Northing] (X, Y)
        const [longitude, latitude] = proj4(
            USLOVWGS_DEF, 
            WGS84, 
            [correctedEasting, correctedNorthing] // Используем скорректированные координаты
        );
        
        // ШАГ 3: Возвращаем в порядке, принятом Leaflet: [Latitude, Longitude] (Lat, Lng)
        return [latitude, longitude]; 
    } catch (error) {
        console.error("Ошибка при трансформации USLOVWGS -> WGS84:", error);
        return [null, null];
    }
}
