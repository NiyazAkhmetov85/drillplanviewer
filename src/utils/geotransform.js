// src/utils/geotransform.js
import proj4 from 'proj4';

// ----------------------------------------------------------------------
// 1. ПАРАМЕТРЫ СИСТЕМЫ USLOVWGS
// ----------------------------------------------------------------------

// Начало системы координат в десятичных градусах
const LAT_0_DECIMAL = 53.41320278;
const LON_0_DECIMAL = 69.23860833;

// Масштаб (Scale factor)
const SCALE_FACTOR = 1.000097549103;

// Ложный восток / север (False Easting / Northing)
const FALSE_EASTING = 4458.9140;
const FALSE_NORTHING = 7317.3475;

// ----------------------------------------------------------------------
// 2. Определение систем координат
// ----------------------------------------------------------------------

// WGS84 (Географическая система, широта/долгота)
const WGS84 = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";

// USLOVWGS (Локальная проекция Transverse Mercator)
const USLOVWGS_DEF = `+proj=tmerc
                      +lat_0=${LAT_0_DECIMAL}
                      +lon_0=${LON_0_DECIMAL}
                      +k=${SCALE_FACTOR}
                      +x_0=${FALSE_EASTING}
                      +y_0=${FALSE_NORTHING}
                      +ellps=WGS84 +units=m +no_defs`;

// ----------------------------------------------------------------------
// 3. Трансформация USLOVWGS -> WGS84
// ----------------------------------------------------------------------

/**
 * Выполняет обратную геодезическую трансформацию из ЛСК USLOVWGS в WGS84.
 * @param {number} easting - Координата X (Восток) в метрах.
 * @param {number} northing - Координата Y (Север) в метрах.
 * @returns {[number | null, number | null]} - Массив [Широта, Долгота] (Lat, Lng).
 */
export function transformUSLOVtoWGS84(easting, northing) {
    if (isNaN(easting) || isNaN(northing)) return [null, null];

    try {
        // ИСПРАВЛЕНО: Входной порядок для proj4: [Easting, Northing] (X, Y)
        const [longitude, latitude] = proj4(USLOVWGS_DEF, WGS84, [easting, northing]);
        
        // Возвращаем в порядке, принятом Leaflet: [Latitude, Longitude] (Lat, Lng)
        return [latitude, longitude]; 
    } catch (error) {
        console.error("Ошибка при трансформации USLOVWGS -> WGS84:", error);
        return [null, null];
    }
}
