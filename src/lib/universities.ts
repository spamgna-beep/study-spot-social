export interface University {
  name: string;
  shortName: string;
  center: [number, number]; // [lng, lat]
}

export const UNIVERSITIES: University[] = [
  { name: 'University of Sheffield', shortName: 'Sheffield', center: [-1.4886, 53.3811] },
  { name: 'Sheffield Hallam University', shortName: 'Hallam', center: [-1.4661, 53.3784] },
  { name: 'University of Leeds', shortName: 'Leeds', center: [-1.5551, 53.8067] },
  { name: 'University of Manchester', shortName: 'Manchester', center: [-2.2330, 53.4668] },
  { name: 'University of Nottingham', shortName: 'Nottingham', center: [-1.1896, 52.9388] },
  { name: 'University of Birmingham', shortName: 'Birmingham', center: [-1.9304, 52.4508] },
  { name: 'University of York', shortName: 'York', center: [-1.0534, 53.9466] },
  { name: 'University College London', shortName: 'UCL', center: [-0.1340, 51.5246] },
  { name: 'University of Oxford', shortName: 'Oxford', center: [-1.2577, 51.7548] },
  { name: 'University of Cambridge', shortName: 'Cambridge', center: [0.1149, 52.2043] },
  { name: 'University of Edinburgh', shortName: 'Edinburgh', center: [-3.1883, 55.9445] },
  { name: 'University of Bristol', shortName: 'Bristol', center: [-2.6027, 51.4590] },
  { name: 'University of Warwick', shortName: 'Warwick', center: [-1.5608, 52.3793] },
  { name: 'University of Liverpool', shortName: 'Liverpool', center: [-2.9670, 53.4065] },
  { name: 'King\'s College London', shortName: 'KCL', center: [-0.1161, 51.5115] },
  { name: 'Imperial College London', shortName: 'Imperial', center: [-0.1749, 51.4988] },
  { name: 'University of Glasgow', shortName: 'Glasgow', center: [-4.2882, 55.8724] },
  { name: 'Newcastle University', shortName: 'Newcastle', center: [-1.6168, 54.9783] },
  { name: 'University of Bath', shortName: 'Bath', center: [-2.3263, 51.3797] },
  { name: 'University of Exeter', shortName: 'Exeter', center: [-3.5350, 50.7358] },
];

export function findUniversity(name: string | null | undefined): University | undefined {
  if (!name) return undefined;
  return UNIVERSITIES.find((u) => u.name === name);
}