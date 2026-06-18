import { loadPromptFile } from "./promptLoader";

export function loadMolSuggestSystemTemplate(): string {
  return loadPromptFile("mol-suggest-system.txt");
}

export function loadMolSuggestUserTemplate(): string {
  return loadPromptFile("mol-suggest-user.txt");
}
