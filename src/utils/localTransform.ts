// utils/localTransform.ts
export interface LocalCoord {
  e: number; // Easting
  n: number; // Northing
  h?: number; // Elevation
}

export interface GlobalCoord {
  x: number;
  y: number;
  z?: number;
}

const DEG_TO_RAD = Math.PI / 180;

// Параметры из отчета AltynTau_coord_sys_report.pdf
const params = {
  dX: 4458.9140, // Исходное смещение (Translation X) — НЕ ИСПОЛЬЗУЕМ В ЛСК
  dY: 7317.3475, // Исходное смещение (Translation Y) — НЕ ИСПОЛЬЗУЕМ В ЛСК
  thetaDeg: 359.01882,
  scale: 1.000097549103,
  x0: 0.3710,
  y0: -0.3175,
  c: 25.3999, // Elevation shift
};

export function toViewerCoords(p: LocalCoord): GlobalCoord {
  const theta = params.thetaDeg * DEG_TO_RAD;

  // 1. Применяем минимальные смещения и масштаб к сырым координатам
  // Это делает координаты "локальными" относительно их области, а не глобального 0.
  const e_prime = (p.e - params.x0) * params.scale;
  const n_prime = (p.n - params.y0) * params.scale;

  // 2. Применяем вращение только к горизонтальной плоскости (E, N)
  // Мы ИГНОРИРУЕМ params.dX и params.dY, чтобы сохранить координаты близко к (0,0)
  // для точности 3D-рендеринга.
  const x_rotated = e_prime * Math.cos(theta) - n_prime * Math.sin(theta);
  const z_rotated = e_prime * Math.sin(theta) + n_prime * Math.cos(theta); // Northing -> Z (Depth)

  // 3. Присваиваем осям 3D-вьювера:
  // X (Восток) -> X (Горизонталь)
  // Y (Высота) -> Y (Вертикаль — Three.js Y-up)
  // N (Север) -> Z (Глубина/даль)
  
  const x = x_rotated;
  const y = (p.h ?? 0) + params.c; // Elevation (H) -> Y (Vertical, Up)
  const z = z_rotated; // Northing (N) -> Z (Depth/Forward)

  return { x, y, z };
}
