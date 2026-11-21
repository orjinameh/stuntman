export function estimateCredits(config, personaCount) {
  return Math.ceil(personaCount * 1.5 * config.budget.estimated_credits_per_run);
}
