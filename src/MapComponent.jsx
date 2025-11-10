// src/MapComponent.jsx
import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

// Маленькие параметры
const SPHERE_RADIUS = 30;
const END_SPHERE_RADIUS = 10;
const LINE_RADIUS = 4;

function HolesScene({ data }) {
  const groupRef = useRef();

  // Получаем bbox и центр
  const { bbox, center } = useMemo(() => {
    if (!data || data.length === 0) return { bbox: null, center: [0, 0, 0] };
    const xs = [], ys = [], zs = [];
    data.forEach(d => {
      xs.push(d.LocalStartPointX, d.LocalEndPointX);
      ys.push(d.LocalStartPointY, d.LocalEndPointY);
      zs.push(d.LocalStartPointZ, d.LocalEndPointZ);
    });
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const minZ = Math.min(...zs), maxZ = Math.max(...zs);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    return { bbox: { minX, maxX, minY, maxY, minZ, maxZ }, center: [centerX, centerY, centerZ] };
  }, [data]);

  // небольшой анимационный поворот группы (можно удалить)
  useFrame(() => {
    //groupRef.current.rotation.y += 0.000; // по необходимости
  });

  if (!data || data.length === 0) {
    return (
      <mesh>
        <Html center>
          <div style={{ padding: 12, background: 'rgba(255,255,255,0.9)', borderRadius: 6 }}>Загрузите файл для отображения 3D сцены</div>
        </Html>
      </mesh>
    );
  }

  return (
    <group ref={groupRef}>
      {/* Сетка: размер — чуть больше чем span, деление — 1000 м */}
      <gridHelper
        args={[
          Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY) + 2000, // size
          Math.ceil((Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY) + 2000) / 1000), // divisions
        ]}
        position={[center[0], center[1], center[2]]}
      />

      {/* Оси для наглядности */}
      <axesHelper args={[2000]} position={[center[0], center[1], center[2]]} />

      {/* Отрисовка каждой скважины: линия + два маркера */}
      {data.map((item, idx) => {
        const start = new THREE.Vector3(item.LocalStartPointX, item.LocalStartPointY, item.LocalStartPointZ);
        const end = new THREE.Vector3(item.LocalEndPointX, item.LocalEndPointY, item.LocalEndPointZ);

        // линия как BufferGeometry
        const lineGeom = new THREE.BufferGeometry().setFromPoints([start, end]);

        return (
          <group key={idx}>
            {/* линия */}
            <line geometry={lineGeom} position={[0,0,0]}>
              <lineBasicMaterial attach="material" color="#ff4d4f" linewidth={2} />
            </line>

            {/* стартовая точка — большая сфера */}
            <mesh position={[start.x, start.y, start.z]}>
              <sphereGeometry args={[SPHERE_RADIUS, 12, 12]} />
              <meshStandardMaterial metalness={0.1} roughness={0.7} color="#007bff" />
              <Html distanceFactor={10} position={[0, 0, SPHERE_RADIUS + 10]}>
                <div style={{ background: 'rgba(255,255,255,0.9)', padding: '4px 6px', borderRadius: 4, fontSize: 12 }}>
                  {item.HoleName || `H${idx}`}<br />
                  X:{item.LocalStartPointX.toFixed(1)}<br/>
                  Y:{item.LocalStartPointY.toFixed(1)}<br/>
                  Z:{item.LocalStartPointZ.toFixed(1)}
                </div>
              </Html>
            </mesh>

            {/* конечная точка — маленькая синяя */}
            <mesh position={[end.x, end.y, end.z]}>
              <sphereGeometry args={[END_SPHERE_RADIUS, 8, 8]} />
              <meshStandardMaterial color="#1e88e5" />
              <Html distanceFactor={10} position={[0, 0, END_SPHERE_RADIUS + 6]}>
                <div style={{ background: 'rgba(255,255,255,0.9)', padding: '3px 5px', borderRadius: 4, fontSize: 11 }}>
                  End
                </div>
              </Html>
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export default function MapComponent({ data }) {
  // центр сцены определяется по bbox в HolesScene
  const { center } = useMemo(() => {
    if (!data || data.length === 0) return { center: [0,0,0] };
    const xs = [], ys = [], zs = [];
    data.forEach(d => {
      xs.push(d.LocalStartPointX, d.LocalEndPointX);
      ys.push(d.LocalStartPointY, d.LocalEndPointY);
      zs.push(d.Local
