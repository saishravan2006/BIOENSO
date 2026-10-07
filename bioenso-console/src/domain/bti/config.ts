export const BTI_WEIGHTS = {
  CLIMATE_CONTEXT: 0.15,
  FARM_EXPOSURE: 0.30,
  BIOLOGICAL_RESPONSE: 0.40,
  PERSISTENCE: 0.15
};

export const PERSISTENCE_WINDOW_MINUTES = 20;

export const HEAT_BIOLOGICAL_FEATURES = [
  { key: "shadeSeeking", weight: 0.20, adverseDirection: "INCREASE" as const },
  { key: "waterDemand", weight: 0.20, adverseDirection: "INCREASE" as const },
  { key: "movement", weight: 0.15, adverseDirection: "DECREASE" as const },
  { key: "grazing", weight: 0.15, adverseDirection: "DECREASE" as const },
  { key: "rumination", weight: 0.15, adverseDirection: "DECREASE" as const },
  { key: "thermalResponse", weight: 0.15, adverseDirection: "INCREASE" as const }
];

export const FLOOD_BIOLOGICAL_FEATURES = [
  { key: "movement", weight: 0.40, adverseDirection: "INCREASE" as const },
  { key: "grazing", weight: 0.30, adverseDirection: "DECREASE" as const },
  { key: "rumination", weight: 0.30, adverseDirection: "DECREASE" as const }
];
