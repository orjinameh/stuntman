import fs from 'node:fs';
import path from 'node:path';
import { StuntmanError, writeJson, safeJoin } from './util.mjs';
import { observedText } from './report.mjs';
import { expectedShort } from './invariant.mjs';

export function reproCommand(report, persona) {
  return report.mode === 'live'
    ? `node bin/stuntman.mjs audit --live --persona ${persona}`
    : `node bin/stuntman.mjs audit --fixture-state ${report.fixture_state || 'broken'} --persona ${persona}`;
}

export function findFinding(report, id) {
  const lane = report.personas.find((l) => l.finding_id === id);
  if (!lane) {
    const ids = report.personas.filter((l) => l.finding_id).map((l) => l.finding_id);
    throw new StuntmanError(`finding '${id}' is not confirmed in this report${ids.length ? ` (confirmed: ${ids.join(', ')})` : ''}. Suspected hazards never produce a brief.`);
  }
  return lane;
}

export function buildBrief(report, lane, project) {
  const inv = lane.invariant;
  const persona = project ? project.personas.find((p) => p.id === lane.id) : null;
  const behaviour = persona ? persona.behaviour : lane.name;
  const suspects = (report.app && report.app.suspects) || ['the request handler that performs the final submit (checkout / payment)', 'the form that submits it'];
  const first = lane.runs[0];
  const evidence = lane.runs.map((r) => ({ run: r.index, exit_code: r.exit_code, status: r.status, values: r.values, raw: r.raw_path, session_dir: r.session_dir }));
  const acceptance = [
    `${inv.observation} equals ${expectedShort(inv)} after the "${lane.id}" behaviour (${observedText(lane)} was observed before the fix).`,
    'The normal single-click journey still completes and shows the success page.',
    'The repro command above reports this persona as clean on two consecutive runs.',
    'The locked test (tests/stuntman-' + lane.id + '_test.md) passes.',
  ];
  const doNot = [
    'Do not edit stuntman.json, any file in personas/, stuntman.lock, or tests/stuntman-*_test.md.',
    'Do not relax the invariant, change the expected value, or remove the persona.',
    'Do not special-case the audit (user agents, headers, timing) to make it pass.',
    'Fix the application so that the human behaviour is handled, not the observation.',
  ];
  return {
    schema: 'stuntman.brief/1', finding_id: lane.finding_id, persona: lane.id, severity: lane.severity,
    title: `${lane.name}: ${inv.reason}`,
    behaviour, invariant: { observation: inv.observation, equals: inv.equals, equals_observation: inv.equals_observation, at_most_observation: inv.at_most_observation, reason: inv.reason },
    observed: { text: observedText(lane), values: first.values, basis: lane.basis },
    evidence, reproduce: reproCommand(report, lane.id), acceptance, suspects, do_not: doNot,
  };
}

export function briefMarkdown(b) {
  return `# Repair brief ${b.finding_id} — ${b.title}

You are a coding agent. A real-browser audit proved a hazard in this application. Fix the application code.

## Human behaviour
${b.behaviour}

## Invariant that must hold
\`${b.invariant.observation} = ${b.invariant.at_most_observation ? '<= ' + b.invariant.at_most_observation : (b.invariant.equals_observation || b.invariant.equals)}\` — ${b.invariant.reason}

## Expected vs observed
- Expected: \`${b.invariant.observation} = ${b.invariant.at_most_observation ? '<= ' + b.invariant.at_most_observation : (b.invariant.equals_observation || b.invariant.equals)}\`
- Observed: **${b.observed.text}** (${b.observed.basis})
- Severity: ${b.severity}

## Evidence
${b.evidence.map((e) => `- run ${e.run}: exit ${e.exit_code} (${e.status}), values \`${JSON.stringify(e.values)}\`, transcript \`${e.raw || 'n/a'}\`, session \`${e.session_dir || 'n/a'}\``).join('\n')}

## Reproduce
\`\`\`
${b.reproduce}
\`\`\`

## Done when
${b.acceptance.map((a) => `- [ ] ${a}`).join('\n')}

## Files most likely involved
${b.suspects.map((s) => `- ${s}`).join('\n')}

## Do not
${b.do_not.map((s) => `- ${s}`).join('\n')}
`;
}

export function writeBrief(report, id, project) {
  const lane = findFinding(report, id);
  const b = buildBrief(report, lane, project);
  const dir = path.join(report.run_dir_abs, 'briefs');
  fs.mkdirSync(dir, { recursive: true });
  const md = safeJoin(dir, `${id}.md`); const js = safeJoin(dir, `${id}.json`);
  fs.writeFileSync(md, briefMarkdown(b));
  writeJson(js, b);
  return { md, json: js, brief: b };
}
