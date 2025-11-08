declare global {
  // UMD globals from CDN scripts
  const React: typeof import('react');
  const ReactDOM: typeof import('react-dom/client');
  const htm: typeof import('htm');
  const maplibregl: typeof import('maplibre-gl');

  interface Window {
    confetti?: (options?: unknown) => void;
    tailwind?: Record<string, unknown>;
    maplibregl?: typeof import('maplibre-gl');
  }
}

export {};

