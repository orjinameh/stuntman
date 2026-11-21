/** Shared wording for an invariant, so the compiler, lock, brief and report never disagree. */
export const refOf = (inv) => inv.equals_observation || inv.at_most_observation || null;
export function expectedText(inv) {
  if (inv.at_most_observation) return `no more than the value you stored as '${inv.at_most_observation}'`;
  return inv.equals_observation ? `the value you stored as '${inv.equals_observation}'` : String(inv.equals);
}
export function assertSentence(inv) {
  return inv.at_most_observation ? `assert that '${inv.observation}' is ${expectedText(inv)}` : `assert that '${inv.observation}' equals ${expectedText(inv)}`;
}
export function expectedShort(inv) {
  if (inv.at_most_observation) return `<= ${inv.at_most_observation}`;
  return inv.equals_observation ? inv.equals_observation : String(inv.equals);
}
