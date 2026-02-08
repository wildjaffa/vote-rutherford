const RaceType = {
  city: 1,
  county: 2,
  state: 3,
  federal: 4,
} as const;

export type ExportSize = (typeof RaceType)[keyof typeof RaceType];

export default RaceType;
