import { DummyRacingDataProvider } from "./dummy-provider";
import type { RacingDataProvider } from "./types";

let singleton: RacingDataProvider | null = null;

export function getRacingDataProvider(): RacingDataProvider {
  if (!singleton) {
    singleton = new DummyRacingDataProvider();
  }
  return singleton;
}

export function setRacingDataProvider(p: RacingDataProvider) {
  singleton = p;
}

export type { RacingDataProvider } from "./types";
export { DummyRacingDataProvider } from "./dummy-provider";
export { ApiRacingDataProvider } from "./api-provider";
