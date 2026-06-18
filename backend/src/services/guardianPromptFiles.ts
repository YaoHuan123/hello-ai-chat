import { loadPromptFile } from "./promptLoader";

export function loadGuardianProactiveSystemTemplate(): string {
  return loadPromptFile("guardian-proactive-system.txt");
}

export function loadGuardianProactiveUserTemplate(): string {
  return loadPromptFile("guardian-proactive-user.txt");
}
