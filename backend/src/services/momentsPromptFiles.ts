import { loadPromptFile } from "./promptLoader";

export function loadMomentsExploreSystemTemplate(): string {
  return loadPromptFile("moments-explore-system.txt");
}

export function loadMomentsExploreUserTemplate(): string {
  return loadPromptFile("moments-explore-user.txt");
}
