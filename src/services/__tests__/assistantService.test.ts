import { expect, it } from 'vitest';
import { INITIAL_APP_STATE } from '../../../tests/fixtures/recruitmentData.ts';
import { buildAssistantContext } from '../assistantService.ts';

it('limita el contexto a la convocatoria activa y comparte nombres solo al activarlo', () => {
  const job = INITIAL_APP_STATE.jobPostings.find((item) => item.id === INITIAL_APP_STATE.activeJobPostingId)!;
  const apps = INITIAL_APP_STATE.applications.filter((app) => app.jobPostingId === job.id);
  const aggregated = buildAssistantContext(INITIAL_APP_STATE, job);
  expect(aggregated.metrics.totalProcessed).toBe(apps.length);
  expect(aggregated.candidateSummaries).toEqual([]);
  expect(JSON.stringify(aggregated)).not.toContain(INITIAL_APP_STATE.candidates[0].email);
  const included = buildAssistantContext(INITIAL_APP_STATE, job, true);
  expect(included.candidateSummaries.length).toBe(Math.min(50, apps.length));
  const validNames = apps.map((app) => INITIAL_APP_STATE.candidates.find((candidate) => candidate.id === app.candidateId)?.name);
  expect(included.candidateSummaries.every((candidate) => validNames.includes(candidate.name))).toBe(true);
  expect(JSON.stringify(included)).not.toMatch(/rawCvText|importedProfile|phone|email|talentPoolNotes/);
});
