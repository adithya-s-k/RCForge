/** Field elevation affects pressure/density; local flight coordinates remain metres AGL. */
export const sceneries = {
  club: {
    name: "Northfield club",
    description: "Mown grass, paved runway, late afternoon",
    temperatureC: 18,
    elevationM: 120,
    surface: "asphalt" as const,
    ground: "#95a078",
    strip: "#a6b58d",
    ridge: "#728576",
    fog: "#b9cad4",
    sun: [25, 60, -35] as [number, number, number],
    sunColor: "#fff4dc",
    sunIntensity: 3.2,
    treeCount: 150,
    ridgeHeight: 1,
    seed: 41,
  },
  valley: {
    name: "Alpine meadow",
    description: "Grass strip, conifer valley, cool morning",
    temperatureC: 10,
    elevationM: 1250,
    surface: "grass" as const,
    ground: "#7e967b",
    strip: "#a0b18b",
    ridge: "#657e85",
    fog: "#b7ccd5",
    sun: [-45, 34, -40] as [number, number, number],
    sunColor: "#e6efff",
    sunIntensity: 2.5,
    treeCount: 260,
    ridgeHeight: 5,
    seed: 83,
  },
  mesa: {
    name: "Desert mesa",
    description: "Dirt strip, dry scrub, warm evening",
    temperatureC: 32,
    elevationM: 650,
    surface: "dirt" as const,
    ground: "#c0a27c",
    strip: "#d5b590",
    ridge: "#ad8a72",
    fog: "#dbc4a7",
    sun: [55, 23, -25] as [number, number, number],
    sunColor: "#ffd8a3",
    sunIntensity: 3.6,
    treeCount: 45,
    ridgeHeight: 2.5,
    seed: 129,
  },
};
export type SceneryId = keyof typeof sceneries;
export type Scenery = (typeof sceneries)[SceneryId];
export function airDensity(temperatureC: number, elevationM: number) {
  const pressure = 101325 * Math.pow(1 - 2.25577e-5 * elevationM, 5.25588);
  return pressure / (287.05 * (temperatureC + 273.15));
}

/** Sutherland dry-air law, SI; kinematic viscosity = dynamic viscosity / density. */
export function airKinematicViscosity(
  temperatureC: number,
  densityKgM3: number,
) {
  const kelvin = temperatureC + 273.15;
  return (1.458e-6 * kelvin ** 1.5) / (kelvin + 110.4) / densityKgM3;
}
