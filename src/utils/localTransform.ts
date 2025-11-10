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
  dX: 4458.9140,
  dY: 7317.3475,
  thetaDeg: 359.01882,
  scale: 1.000097549103,
  x0: 0.3710,
  y0: -0.3175,
  c: 25.3999,
};

export function toViewerCoords(p: LocalCoord): GlobalCoord {
  const theta = params.thetaDeg * DEG_TO_RAD;
  const e = (p.e - params.x0) * params.scale;
  const n = (p.n - params.y0) * params.scale;

  const x = params.dX + e * Math.cos(theta) - n * Math.sin(theta);
  const y = params.dY + e * Math.sin(theta) + n * Math.cos(theta);
  const z = (p.h ?? 0) + params.c;
  return { x, y, z };
}
