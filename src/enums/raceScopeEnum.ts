const RaceScope = {
  city: 1,
  county: 2,
  state: 3,
  federal: 4,
} as const;

export type ExportSize = (typeof RaceScope)[keyof typeof RaceScope];

export default RaceScope;
