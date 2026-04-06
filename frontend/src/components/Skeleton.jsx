import { useEffect } from 'react';
import { C } from '../theme';

let injected = false;
function injectKeyframes() {
  if (injected) return;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes skeleton-shimmer {
      0% { background-position: -200px 0; }
      100% { background-position: calc(200px + 100%) 0; }
    }
  `;
  document.head.appendChild(style);
  injected = true;
}

const base = {
  background: `linear-gradient(90deg, ${C.surface2} 0px, ${C.surface3} 40px, ${C.surface2} 80px)`,
  backgroundSize: '200px 100%',
  animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
  borderRadius: 8,
};

export function SkeletonLine({ width = '100%', height = 14, style }) {
  useEffect(injectKeyframes, []);
  return <div style={{ ...base, width, height, marginBottom: 8, ...style }} />;
}

export function SkeletonCard({ height = 68, style }) {
  useEffect(injectKeyframes, []);
  return <div style={{ ...base, height, borderRadius: 12, marginBottom: 8, ...style }} />;
}

export function SkeletonCircle({ size = 40, style }) {
  useEffect(injectKeyframes, []);
  return <div style={{ ...base, width: size, height: size, borderRadius: '50%', ...style }} />;
}
