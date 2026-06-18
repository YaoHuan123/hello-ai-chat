import { loadPromptFile } from "./promptLoader";

export function loadYiyiOwnerSystemTemplate(): string {
  return loadPromptFile("yiyi-owner-system.txt");
}

export function loadYiyiOwnerUserTemplate(): string {
  return loadPromptFile("yiyi-owner-user.txt");
}

export function loadYiyiTopicsSystemTemplate(): string {
  return loadPromptFile("yiyi-topics-system.txt");
}

export function loadYiyiTopicsUserTemplate(): string {
  return loadPromptFile("yiyi-topics-user.txt");
}

export function loadYiyiBridgeSystemTemplate(): string {
  return loadPromptFile("yiyi-bridge-system.txt");
}

export function loadYiyiBridgeUserTemplate(): string {
  return loadPromptFile("yiyi-bridge-user.txt");
}
