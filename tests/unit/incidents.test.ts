import { describe, expect, it } from 'vitest';
import { buildIncident, LEVELS, runTests, type IncidentLevel } from '../../src/content/incidents';
import { TEMPLATES } from '../../src/sim/templates';

describe('generator awarii', () => {
  it('ten sam numer zgłoszenia daje tę samą awarię', () => {
    const a = buildIncident(4242, 2);
    const b = buildIncident(4242, 2);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  for (const { level, faults: wanted } of LEVELS) {
    it(`poziom ${level}: każda awaria psuje sieć, a zdrowa sieć przechodzi wszystkie testy`, () => {
      const counts: number[] = [];
      for (let seed = 1; seed <= 12; seed++) {
        const incident = buildIncident(seed * 101, level as IncidentLevel);
        expect(incident.tests.length).toBeGreaterThanOrEqual(3);
        expect(incident.faults.length).toBeGreaterThanOrEqual(1);
        counts.push(incident.faults.length);
        const broken = runTests(incident.net, incident.tests);
        expect(Object.values(broken).some((ok) => !ok)).toBe(true);
        const healthy = runTests(TEMPLATES.find((t) => t.id === incident.scenario)!.build(), incident.tests);
        expect(Object.values(healthy).every(Boolean)).toBe(true);
      }
      expect(counts.filter((c) => c === wanted).length).toBeGreaterThanOrEqual(10);
    });
  }

  it('usterki siedzą tylko na urządzeniach wskazanych w rozwiązaniu', () => {
    for (const level of [1, 2, 3] as IncidentLevel[]) {
      for (let seed = 1; seed <= 10; seed++) {
        const incident = buildIncident(seed * 37, level);
        const healthy = TEMPLATES.find((t) => t.id === incident.scenario)!.build();
        const fixed = structuredClone(incident.net);
        const faulty = new Set(incident.faults.map((f) => f.device));
        fixed.devices = fixed.devices.map((device) => (faulty.has(device.name) ? structuredClone(healthy.devices.find((d) => d.name === device.name)!) : device));
        const results = runTests(fixed, incident.tests);
        expect(Object.entries(results).filter(([, ok]) => !ok).map(([id]) => `${level}/${seed}: ${id}`)).toEqual([]);
      }
    }
  });
});
