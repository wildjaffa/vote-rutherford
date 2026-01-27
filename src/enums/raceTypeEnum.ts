const RaceType = {
  city: 0,
  county: 1,
  state: 2,
  federal: 3,
} as const;

export type ExportSize = (typeof RaceType)[keyof typeof RaceType];

export default RaceType;
