declare module 'leaflet.heat' {
  import * as L from 'leaflet';

  namespace HeatLayer {
    interface HeatLayerOptions {
      minOpacity?: number;
      maxZoom?: number;
      max?: number;
      radius?: number;
      blur?: number;
      gradient?: { [key: number]: string };
    }
  }

  class HeatLayer extends L.Layer {
    constructor(latlngs: [number, number, number?][], options?: HeatLayer.HeatLayerOptions);
    setLatLngs(latlngs: [number, number, number?][]): this;
    addLatLng(latlng: [number, number, number?]): this;
    setOptions(options: HeatLayer.HeatLayerOptions): this;
    redraw(): this;
  }

  export = HeatLayer;
}

declare namespace L {
  function heat(
    latlngs: [number, number, number?][],
    options?: {
      minOpacity?: number;
      maxZoom?: number;
      max?: number;
      radius?: number;
      blur?: number;
      gradient?: { [key: number]: string };
    }
  ): L.Layer;
}
