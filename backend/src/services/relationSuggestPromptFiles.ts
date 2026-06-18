import { loadPromptFile } from "./promptLoader";

export function loadRelationSuggestSystemTemplate(): string {
  return loadPromptFile("relation-suggest-system.txt");
}

export function loadRelationSuggestUserTemplate(): string {
  return loadPromptFile("relation-suggest-user.txt");
}
