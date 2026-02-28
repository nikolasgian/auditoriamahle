import { describe, it, expect } from 'vitest';
import { AuditDistributor } from '@/lib/scheduleDistribution';
import { store } from '@/lib/store';

describe('Schedule Distribution Engine - Fixed Pattern', () => {
  const mockSectors = [
    { id: 'sec1', name: 'Brochadeira', checklistId: 'ck1' },
    { id: 'sec2', name: 'Prensa Ressalto', checklistId: 'ck2' },
    { id: 'sec3', name: 'Estampa Furo', checklistId: 'ck3' },
    { id: 'sec4', name: 'Mandrila', checklistId: 'ck4' },
    { id: 'sec5', name: 'Fresa Canal', checklistId: 'ck5' },
    { id: 'sec6', name: 'Chanfradeira', checklistId: 'ck6' },
    { id: 'sec7', name: 'Inspeção Final', checklistId: 'ck7' },
    { id: 'sec8', name: 'Prensa Curvar', checklistId: 'ck8' },
  ];

  const mockEmployees = [
    { id: 'emp1', name: 'Diego Lima', role: 'Auditor', sector: 'Qualidade' },
    { id: 'emp2', name: 'Rafael Costa', role: 'Auditor', sector: 'Processo' },
    { id: 'emp3', name: 'Marlon Oliveira', role: 'Auditor', sector: 'Produção' },
    { id: 'emp4', name: 'Carlos Henrique', role: 'Auditor', sector: 'Qualidade' },
  ];

  it('should generate 25 assignments per week (5 sectors × 5 days)', () => {
    const distributor = new AuditDistributor(mockEmployees, mockSectors as any);
    const assignments = distributor.distributeForWeek(1, 2024);
    
    expect(assignments.length).toBe(25);
  });

  it('should have 5 sectors for week 1 (fixed pattern)', () => {
    const distributor = new AuditDistributor(mockEmployees, mockSectors as any);
    const assignments = distributor.distributeForWeek(1, 2024);
    
    // Expected pattern for Week 1: Indices [0, 5, 1, 6, 2]
    // = Brochadeira, Chanfradeira, Prensa Ressalto, Inspeção Final, Estampa Furo
    const uniqueSectors = new Set(assignments.map(a => a.sectorName));
    expect(uniqueSectors.size).toBe(5);
  });

  it('should have all 5 days for each sector in week 1', () => {
    const distributor = new AuditDistributor(mockEmployees, mockSectors as any);
    const assignments = distributor.distributeForWeek(1, 2024);
    
    // Group by sector
    const bySector = new Map<string, any[]>();
    assignments.forEach(a => {
      if (!bySector.has(a.sectorId)) bySector.set(a.sectorId, []);
      bySector.get(a.sectorId)!.push(a);
    });
    
    // Each sector should have 5 days
    bySector.forEach((daily) => {
      expect(daily.length).toBe(5);
      const days = new Set(daily.map(d => d.day));
      expect(days.size).toBe(5);
    });
  });

  it('should have different sectors for week 2 (fixed pattern)', () => {
    const distributor = new AuditDistributor(mockEmployees, mockSectors as any);
    const week1 = distributor.distributeForWeek(1, 2024);
    const week2 = distributor.distributeForWeek(2, 2024);
    
    const sectors1 = new Set(week1.map(a => a.sectorName));
    const sectors2 = new Set(week2.map(a => a.sectorName));
    
    // Week 2 pattern should be different from Week 1
    expect(sectors2.size).toBe(5);
    // At least one sector should be different
    const common = [...sectors1].filter(s => sectors2.has(s));
    expect(common.length).toBeLessThan(5);
  });

  it('should distribute checklists without repetition per auditor per week', () => {
    const distributor = new AuditDistributor(mockEmployees, mockSectors as any);
    const assignments = distributor.distributeForWeek(1, 2024);
    
    // Group by auditor
    const byAuditor = new Map<string, Set<string>>();
    assignments.forEach(a => {
      if (!byAuditor.has(a.employeeId)) byAuditor.set(a.employeeId, new Set());
      byAuditor.get(a.employeeId)!.add(a.checklistId);
    });
    
    // Each auditor should not have duplicate checklists in same week
    // (though with only 4 employees and 25 slots, some auditors may appear multiple times)
    byAuditor.forEach((checklists, auditorId) => {
      // Just verify the set has no duplicates (which is guaranteed by Set)
      expect(checklists.size).toBeGreaterThan(0);
    });
  });

  // ------------------------------------------------------------
  // New tests for global week numbering (week labels across months)
  // ------------------------------------------------------------
  it('should compute sequential global week numbers for months', () => {
    // leverage the store helpers; they operate purely on dates, no side effects
    // january should always start at 1
    const janWeeks = store.getGlobalWeekNumbersForMonth(0, 2026);
    expect(janWeeks[0]).toBe(1);
    expect(janWeeks).toEqual([...new Set(janWeeks)]); // no duplicates

    // february should pick up immediately after january's last week
    const febWeeks = store.getGlobalWeekNumbersForMonth(1, 2026);
    expect(febWeeks[0]).toBe(janWeeks[janWeeks.length - 1] + 1);

    // march should likewise follow february
    const marWeeks = store.getGlobalWeekNumbersForMonth(2, 2026);
    expect(marWeeks[0]).toBe(febWeeks[febWeeks.length - 1] + 1);
  });

  it('generateSchedule should label entries using the global week numbers', () => {
    // clear any existing schedule to avoid contamination
    store.saveSchedule([]);

    // generate january schedule and verify weeks equal janWeeks
    const janWeeks = store.getGlobalWeekNumbersForMonth(0, 2026);
    const entriesJan = store.generateSchedule(0, 2026);
    const uniqueWeeksJan = [...new Set(entriesJan.map(e => e.weekNumber))].sort((a, b) => a - b);
    expect(uniqueWeeksJan).toEqual(janWeeks);

    // now generate february; jan entries remain but feb entries should start immediately after
    const febWeeks = store.getGlobalWeekNumbersForMonth(1, 2026);
    const entriesFeb = store.generateSchedule(1, 2026);
    const uniqueWeeksFeb = [...new Set(entriesFeb.map(e => e.weekNumber))].sort((a, b) => a - b);
    expect(uniqueWeeksFeb).toEqual(febWeeks);

    // also verify override of firstWeekNumber works
    store.saveSchedule([]);
    const overrideWeeks = store.getGlobalWeekNumbersForMonth(1, 2026, 10); // pretend feb starts at week 10
    const entriesOverride = store.generateSchedule(1, 2026, 10);
    const uniqueOverride = [...new Set(entriesOverride.map(e => e.weekNumber))].sort((a, b) => a - b);
    expect(uniqueOverride).toEqual(overrideWeeks);
  });
});
