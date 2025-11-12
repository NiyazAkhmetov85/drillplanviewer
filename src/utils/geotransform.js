// utils/geotransform.js

import proj4 from 'proj4';

// ----------------------------------------------------------------------
// 1. ПАРАМЕТРЫ СИСТЕМЫ USLOVWGS (Из Отчета AltynTau_coord_sys_report.pdf)
// ----------------------------------------------------------------------

// Начало системы координат в Десятичных градусах (DMS -> DD)
// Широта: 53° 24' 47,53" C 
const LAT_0_DECIMAL = 53.41320278; 
// Долгота: 69° 14' 18,99" B 
const LON_0_DECIMAL = 69.23860833; 

// Параметры трансформации (используются как параметры проекции Transverse Mercator)
const SCALE_FACTOR = 1.000097549103; [cite_start]// Масштаб [cite: 18]
[cite_start]// Ax = 4 458,9140 м (Ложный Восток) [cite: 18]
const FALSE_EASTING = 4458.9140;      
[cite_start]// Aγ = 7 317,3475 м (Ложный Север) [cite: 18]
const FALSE_NORTHING = 7317.3475;     

// ----------------------------------------------------------------------
// 2. ОПРЕДЕЛЕНИЕ СИСТЕМ КООРДИНАТ (Proj4 Definitions)
// ----------------------------------------------------------------------

// A. WGS 84 (EPSG:4326) - Глобальная географическая система (Широта, Долгота)
const WGS84 = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";

// B. USLOVWGS - Локальная система, аппроксимированная Поперечным Меркатором (Transverse Mercator)
const USLOVWGS_DEF = `+proj=tmerc 
                      +lat_0=${LAT_0_DECIMAL} 
                      +lon_0=${LON_0_DECIMAL} 
                      +k=${SCALE_FACTOR} 
                      +x_0=${FALSE_EASTING} 
                      +y_0=${FALSE_NORTHING} 
                      +ellps=WGS84 +units=m +no_defs`;

// ----------------------------------------------------------------------
// 3. ФУНКЦИЯ ТРАНСФОРМАЦИИ (USLOVWGS -> WGS 84)
// ----------------------------------------------------------------------

/**
 * Выполняет обратную трансформацию из USLOVWGS (Восток, Север) в WGS 84 (Широта, Долгота).
 *
 * @param {number} easting Координата Восток (X) в USLOVWGS.
 * @param {number} northing Координата Север (Y) в USLOVWGS.
 * @returns {number[]} Массив [широта, долгота] в WGS 84.
 */
export function transformUSLOVtoWGS84(easting, northing) {
    if (isNaN(easting) || isNaN(northing)) {
        return [null, null];
    }
    
    try {
        // !!! КОРРЕКТИРОВКА: Инвертируем оси. Передаем [northing, easting] (Y, X) 
        // вместо [easting, northing] (X, Y) для Proj4js, так как оси в локальной TM-системе 
        // часто инвертированы по отношению к стандартному Proj4.
        const [longitude, latitude] = proj4(USLOVWGS_DEF, WGS84, [northing, easting]);
        
        // Leaflet/JS ожидает формат [Широта, Долгота]
        return [latitude, longitude]; 
    } catch (error) {
        console.error("Ошибка при трансформации USLOVWGS -> WGS84:", error);
        // Возвращаем null при ошибке, чтобы избежать падения Leaflet
        return [null, null];
    }
}
