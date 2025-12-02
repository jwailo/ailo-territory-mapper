'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { CompanyData } from '../types';

interface HeatMapLayerProps {
  companies: CompanyData[];
  visible: boolean;
  intensity?: number;
  radius?: number;
  blur?: number;
}

// Simple canvas-based heat map implementation
class SimpleHeatLayer extends L.Layer {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _data: [number, number, number][] = [];
  private _radius: number;
  private _blur: number;
  private _max: number;
  private _gradient: HTMLCanvasElement | null = null;

  constructor(
    data: [number, number, number][],
    options: { radius?: number; blur?: number; max?: number } = {}
  ) {
    super();
    this._data = data;
    this._radius = options.radius ?? 25;
    this._blur = options.blur ?? 15;
    this._max = options.max ?? 5;
    this._canvas = document.createElement('canvas');
    this._canvas.style.position = 'absolute';
    this._canvas.style.pointerEvents = 'none';
  }

  onAdd(map: L.Map): this {
    const pane = map.getPane('overlayPane');
    if (pane) {
      pane.appendChild(this._canvas);
    }
    this._ctx = this._canvas.getContext('2d');
    this._createGradient();

    map.on('moveend', this._redraw, this);
    map.on('zoomend', this._redraw, this);
    map.on('resize', this._resize, this);

    this._resize();
    this._redraw();
    return this;
  }

  onRemove(map: L.Map): this {
    map.off('moveend', this._redraw, this);
    map.off('zoomend', this._redraw, this);
    map.off('resize', this._resize, this);

    if (this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }
    return this;
  }

  private _resize(): void {
    const map = this._map;
    if (!map) return;

    const size = map.getSize();
    this._canvas.width = size.x;
    this._canvas.height = size.y;
  }

  private _createGradient(): void {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1;
    canvas.height = 256;

    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0.0, 'rgba(0, 0, 255, 1)');
    gradient.addColorStop(0.25, 'rgba(0, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 0, 1)');
    gradient.addColorStop(0.75, 'rgba(255, 255, 0, 1)');
    gradient.addColorStop(1.0, 'rgba(255, 0, 0, 1)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, 256);

    this._gradient = canvas;
  }

  private _redraw(): void {
    const map = this._map;
    if (!map || !this._ctx) return;

    const ctx = this._ctx;
    const size = map.getSize();
    const bounds = map.getBounds();
    const topLeft = map.latLngToContainerPoint(bounds.getNorthWest());

    // Position canvas
    L.DomUtil.setPosition(this._canvas, topLeft);

    // Clear canvas
    ctx.clearRect(0, 0, size.x, size.y);

    // Draw heat points
    const r = this._radius + this._blur;

    // Create shadow canvas for intensity
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = size.x;
    shadowCanvas.height = size.y;
    const shadowCtx = shadowCanvas.getContext('2d');
    if (!shadowCtx) return;

    // Draw circles with intensity
    for (const [lat, lng, intensity] of this._data) {
      const point = map.latLngToContainerPoint([lat, lng]);
      const x = point.x - topLeft.x;
      const y = point.y - topLeft.y;

      // Skip points outside visible area (with buffer)
      if (x < -r || x > size.x + r || y < -r || y > size.y + r) continue;

      // Normalized intensity
      const alpha = Math.min(intensity / this._max, 1);

      // Draw radial gradient
      const gradient = shadowCtx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      shadowCtx.beginPath();
      shadowCtx.arc(x, y, r, 0, Math.PI * 2);
      shadowCtx.fillStyle = gradient;
      shadowCtx.fill();
    }

    // Colorize based on intensity
    if (this._gradient) {
      const imageData = shadowCtx.getImageData(0, 0, size.x, size.y);
      const gradientData = this._gradient.getContext('2d')?.getImageData(0, 0, 1, 256).data;

      if (gradientData) {
        const pixels = imageData.data;
        for (let i = 0; i < pixels.length; i += 4) {
          const alpha = pixels[i + 3];
          if (alpha > 0) {
            const gradientIndex = Math.min(255, Math.floor((alpha / 255) * 255)) * 4;
            pixels[i] = gradientData[gradientIndex];
            pixels[i + 1] = gradientData[gradientIndex + 1];
            pixels[i + 2] = gradientData[gradientIndex + 2];
            pixels[i + 3] = alpha > 20 ? Math.min(200, alpha * 1.5) : 0; // Threshold and opacity
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }
    }
  }

  setData(data: [number, number, number][]): this {
    this._data = data;
    this._redraw();
    return this;
  }
}

export default function HeatMapLayer({
  companies,
  visible,
  intensity = 1,
  radius = 25,
  blur = 15,
}: HeatMapLayerProps) {
  const map = useMap();
  const heatLayerRef = useRef<SimpleHeatLayer | null>(null);

  useEffect(() => {
    if (!visible) {
      // Remove heat layer if not visible
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      return;
    }

    // Generate heat data from companies with PUM weighting
    const heatData: [number, number, number][] = companies
      .filter((c) => c.lat !== null && c.long !== null && c.pum > 0)
      .map((c) => {
        // Normalize PUM for heat intensity (log scale for better visualization)
        const normalizedPUM = Math.log10(c.pum + 1) * intensity;
        return [c.lat!, c.long!, normalizedPUM];
      });

    console.log('Heat map data:', heatData.length, 'points');

    // Remove existing layer if any
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    // Create new heat layer
    if (heatData.length > 0) {
      try {
        const heatLayer = new SimpleHeatLayer(heatData, {
          radius,
          blur,
          max: 5,
        });

        heatLayer.addTo(map);
        heatLayerRef.current = heatLayer;
        console.log('Heat layer added to map');
      } catch (err) {
        console.error('Error creating heat layer:', err);
      }
    }

    // Cleanup on unmount
    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, companies, visible, intensity, radius, blur]);

  return null;
}
