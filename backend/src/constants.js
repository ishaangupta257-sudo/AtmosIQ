// Shared constants — locations mirror ml-engine/config.py (same slugs), and the
// construction-site seed is shaped exactly like a real /api/construction feed
// (geocoded DPCC dust-control registry import). See README + data-sourcing note.
export const LOCATIONS = [
  { id: 'anand-vihar', name: 'Anand Vihar', lat: 28.6469, lon: 77.3161 },
  { id: 'rk-puram', name: 'R.K. Puram', lat: 28.5637, lon: 77.1745 },
  { id: 'dwarka', name: 'Dwarka', lat: 28.5921, lon: 77.0460 },
  { id: 'noida-62', name: 'Noida Sec-62', lat: 28.6270, lon: 77.3720 },
  { id: 'gurugram', name: 'Gurugram', lat: 28.4595, lon: 77.0266 },
  { id: 'rohini', name: 'Rohini', lat: 28.7410, lon: 77.0670 },
  { id: 'faridabad', name: 'Faridabad', lat: 28.4089, lon: 77.3178 },
  { id: 'ito', name: 'ITO', lat: 28.6289, lon: 77.2410 },
];
export const LOCATION_BY_ID = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));

export const CONSTRUCTION_SEED = [
  { id: 'c1', siteId: 'DPCC-2024-1187', name: 'Dwarka Expressway Ext.', agency: 'NHAI',
    lat: 28.567, lon: 77.045, status: 'Active', note: 'Heavy earthwork — high dust load. Water sprinkling mandated.',
    completion: 'Mar 2027' },
  { id: 'c2', siteId: 'DPCC-2024-0932', name: 'Metro Phase-4 (Janakpuri)', agency: 'DMRC',
    lat: 28.621, lon: 77.087, status: 'Active', note: 'Tunnel boring & muck transport. Anti-smog gun on site.',
    completion: 'Dec 2026' },
  { id: 'c3', siteId: 'DPCC-2024-1450', name: 'Noida Link Road Widening', agency: 'PWD',
    lat: 28.618, lon: 77.360, status: 'Active', note: 'Aggregate stockpiling — cover tarpaulins required.',
    completion: 'Aug 2026' },
];
