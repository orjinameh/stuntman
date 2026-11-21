import { StuntmanError } from './util.mjs';
import { assertSentence, refOf } from './invariant.mjs';

const STORE_AS = /store\b[^.]*\bas\s+'[^']+'/i;

/** Compile journey + persona + observations into a single plain-English Kane objective. */
export function compileObjective(config, persona) {
  if (!persona.behaviour || !String(persona.behaviour).trim()) throw new StuntmanError(`persona '${persona.id}' has no behaviour`);
  const inv = persona.invariant;
  const obs = config.observations.find((o) => o.name === inv.observation);
  if (!obs) {
    throw new StuntmanError(`persona '${persona.id}' invariant names observation '${inv.observation}' which the config does not declare (declared: ${config.observations.map((o) => o.name).join(', ')})`);
  }
  if (refOf(inv)) {
    const ref = refOf(inv);
    const declaredEq = config.observations.some((o) => o.name === ref) || (persona.captures || []).includes(ref);
    if (!declaredEq) throw new StuntmanError(`persona '${persona.id}' compares against '${ref}', which neither the config nor the persona captures`);
    if (!persona.behaviour.includes(`'${ref}'`)) throw new StuntmanError(`persona '${persona.id}' behaviour must say to store a value as '${ref}'`);
  }
  for (const o of config.observations) {
    if (!STORE_AS.test(o.instruction)) throw new StuntmanError(`observation '${o.name}' instruction lacks a "store ... as '<name>'" clause; Kane only keeps values stored that way`);
    if (!o.instruction.includes(`'${o.name}'`)) throw new StuntmanError(`observation '${o.name}' instruction must store its value as '${o.name}'`);
  }
  const base = config.app.base_url.replace(/\/$/, '');
  const start = base + config.journey.entry;
  const lines = [];
  lines.push(`Start at ${start}.`);
  lines.push('Complete this journey, in order:');
  config.journey.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  lines.push(`The journey is successful when the page shows "${config.journey.success_text || 'success'}".`);
  lines.push(`Human behaviour to perform while doing it: ${persona.behaviour}`);
  if (persona.notes) lines.push(`Detail: ${persona.notes}`);
  lines.push('When the journey and the behaviour are finished, record the observations:');
  // Observations without a url are read from the page the persona ended on, so they come first, before any navigation.
  const ordered = [...config.observations.filter((o) => !o.url), ...config.observations.filter((o) => o.url)];
  for (const o of ordered) lines.push(o.url ? `- Then open ${base}${o.url}. ${o.instruction}` : `- Without leaving or reloading the page you are on, ${o.instruction.charAt(0).toLowerCase()}${o.instruction.slice(1)}`);
  lines.push(`Then ${assertSentence(inv)}. Reason: ${inv.reason}`);
  lines.push('Do not retry anything, do not try to fix problems, and do not stop to ask questions. Stop after the assertion.');
  return lines.join('\n');
}
