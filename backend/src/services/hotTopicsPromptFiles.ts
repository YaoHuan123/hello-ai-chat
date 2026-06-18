import { loadPromptFile } from "./promptLoader";

export function loadHotTopicsSystemTemplate(): string {
  return loadPromptFile("hot-topics-system.txt");
}

export function loadHotTopicsUserTemplate(): string {
  return loadPromptFile("hot-topics-user.txt");
}
