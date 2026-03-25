/**
 * Marker utilities for creating realistic car SVG markers
 */

export const MARKER_COLORS = {
  ONLINE_IDLE: '#22C55E',    // Verde - șofer disponibil
  ON_TRIP: '#D4AF37',        // Auriu - cursă în desfășurare
  OFFLINE: '#9CA3AF',        // Gri - offline
} as const;

export const SCALE_BY_TYPE = {
  exec: 1,      // Toate la fel
  lux: 1,       // Toate la fel
  suv: 1,       // Toate la fel
  van: 1,       // Toate la fel
} as const;

export function getRealisticCarSVG(color: string, uid: string): string {
  return `
    <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="sh_${uid}" x="-25%" y="-15%" width="150%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="rgba(0,0,0,0.45)"/>
        </filter>
        <filter id="gw_${uid}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="bd_${uid}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#e8e8e8"/>
          <stop offset="50%" stop-color="#f5f5f5"/>
          <stop offset="100%" stop-color="#d4d4d4"/>
        </linearGradient>
        <linearGradient id="gl_${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1a3a4a"/>
          <stop offset="100%" stop-color="#2d5a6a"/>
        </linearGradient>
      </defs>
      <g filter="url(#sh_${uid})" transform="translate(0, 10)">
        <!-- Body - mai scurt -->
        <path d="M38 25 Q38 20 42 18 L50 16 L58 18 Q62 20 62 25 L64 60 Q64 68 58 70 L50 72 L42 70 Q36 68 36 60 Z" 
              fill="url(#bd_${uid})" stroke="#b0b0b0" stroke-width="0.8"/>
        
        <!-- Front Windshield -->
        <path d="M40 28 Q40 25 42 23 L50 21 L58 23 Q60 25 60 28 L60 35 L40 35 Z" 
              fill="url(#gl_${uid})" stroke="#8ab4c4" stroke-width="0.5" opacity="0.9"/>
        
        <!-- Side windows (doar 2 perechi) -->
        <path d="M37 36 L39 36 L39 48 L37 48 Z" fill="url(#gl_${uid})" opacity="0.8"/>
        <path d="M61 36 L63 36 L63 48 L61 48 Z" fill="url(#gl_${uid})" opacity="0.8"/>
        
        <path d="M37 50 L39 50 L39 58 L37 58 Z" fill="url(#gl_${uid})" opacity="0.8"/>
        <path d="M61 50 L63 50 L63 58 L61 58 Z" fill="url(#gl_${uid})" opacity="0.8"/>
        
        <!-- Taillights -->
        <rect x="38" y="64" width="7" height="2.5" rx="1.2" fill="#ef4444" opacity="0.9"/>
        <rect x="55" y="64" width="7" height="2.5" rx="1.2" fill="#ef4444" opacity="0.9"/>
        
        <!-- Status indicator dot - centrat -->
        <circle cx="50" cy="76" r="5" fill="${color}" opacity="0.9" filter="url(#gw_${uid})"/>
        <circle cx="50" cy="76" r="2.5" fill="white" opacity="0.5"/>
      </g>
    </svg>
  `;
}

export function createPremiumCarMarker(color: string, rotation: number, scale: number): HTMLDivElement {
  const uid = `car_${Math.random().toString(36).substr(2, 9)}`;
  const carEl = document.createElement('div');
  carEl.innerHTML = getRealisticCarSVG(color, uid);
  carEl.style.transform = `rotate(${rotation}deg) scale(${scale})`;
  carEl.style.transition = 'transform 0.3s ease-out';
  return carEl;
}

export function createDriverMarkerContainer(opts: {
  driverName: string;
  color: string;
  rotation: number;
  vehicleScale: number;
  licensePlate?: string;
}): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'driver-marker-container';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'center';
  container.style.cursor = 'pointer';

  // Name label
  const nameLabel = document.createElement('div');
  nameLabel.className = 'driver-name';
  nameLabel.textContent = opts.driverName;
  nameLabel.style.fontSize = '11px';
  nameLabel.style.background = 'rgba(0,0,0,0.6)';
  nameLabel.style.color = 'white';
  nameLabel.style.borderRadius = '6px';
  nameLabel.style.padding = '2px 6px';
  nameLabel.style.fontWeight = '600';
  nameLabel.style.whiteSpace = 'nowrap';
  nameLabel.style.marginBottom = '2px';
  container.appendChild(nameLabel);

  // Premium car SVG
  const carEl = createPremiumCarMarker(opts.color, opts.rotation, opts.vehicleScale);
  container.appendChild(carEl);

  // License plate
  if (opts.licensePlate) {
    const plate = document.createElement('div');
    plate.className = 'plate';
    plate.textContent = opts.licensePlate;
    plate.style.fontSize = '10px';
    plate.style.background = 'white';
    plate.style.color = 'black';
    plate.style.borderRadius = '4px';
    plate.style.padding = '1px 4px';
    plate.style.fontWeight = '700';
    plate.style.marginTop = '2px';
    container.appendChild(plate);
  }

  return container;
}

export function getDriverColor(status: string): string {
  return MARKER_COLORS[status as keyof typeof MARKER_COLORS] || MARKER_COLORS.OFFLINE;
}

export function getVehicleScale(category?: string): number {
  if (!category) return SCALE_BY_TYPE.exec;
  const cat = category.toLowerCase();
  if (cat.includes('lux')) return SCALE_BY_TYPE.lux;
  if (cat.includes('suv')) return SCALE_BY_TYPE.suv;
  if (cat.includes('van')) return SCALE_BY_TYPE.van;
  return SCALE_BY_TYPE.exec;
}
