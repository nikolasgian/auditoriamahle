// Schedule Distribution Engine - Fixed Sector Pattern with Auditor Rotation

import { Employee, Sector } from './store';

export interface AuditAssignment {
  sectorId: string;
  employeeId: string;
  checklistId: string;
  checklistName?: string;
  sectorName?: string;
  employeeName?: string;
  day?: number; // 1-5 (Mon-Fri)
}

/**
 * FIXED SECTOR PATTERN
 * 
 * Each week has exactly 5 sectors (not 8).
 * The pattern repeats every 4 weeks.
 * 
 * Padrão fixo conforme folha modelo:
 * - Semana 1 (ciclo): Brochadeira, Chanfradeira, Prensa Ressalto, Inspeção Final, Estampa Furo
 * - Semana 2 (ciclo): Prensa Curvar, Mandrila, Fresa Canal, Brochadeira, Chanfradeira
 * - Semana 3 (ciclo): Prensa Ressalto, Inspeção Final, Estampa Furo, Prensa Curvar, Mandrila
 * - Semana 4 (ciclo): Fresa Canal, Brochadeira, Chanfradeira, Prensa Ressalto, Inspeção Final
 * - Semana 5 (if exists): 5 setores selecionados com lógica de rotação
 */

// Mapa de padrão fixo: (semanaNoMês % 4) -> índices dos setores em ordem
// Baseado em DEFAULT_SECTORS: [Brochadeira, Prensa Ressalto, Estampa Furo, Mandrila, Fresa Canal, Chanfradeira, Inspeção Final, Prensa Curvar]
// Índices: 0=Brochadeira, 1=Prensa Ressalto, 2=Estampa Furo, 3=Mandrila, 4=Fresa Canal, 5=Chanfradeira, 6=Inspeção Final, 7=Prensa Curvar
const SECTOR_PATTERNS: Record<number, number[]> = {
  0: [0, 5, 1, 6, 2],    // Semana 1: Brochadeira, Chanfradeira, Prensa Ressalto, Inspeção Final, Estampa Furo
  1: [7, 3, 4, 0, 5],    // Semana 2: Prensa Curvar, Mandrila, Fresa Canal, Brochadeira, Chanfradeira
  2: [1, 6, 2, 7, 3],    // Semana 3: Prensa Ressalto, Inspeção Final, Estampa Furo, Prensa Curvar, Mandrila
  3: [4, 0, 5, 1, 6],    // Semana 4: Fresa Canal, Brochadeira, Chanfradeira, Prensa Ressalto, Inspeção Final
};

// Nomes de setores em ordem fixa (apenas para referência)
const SECTOR_NAMES = [
  'Brochadeira',           // 0
  'Prensa Ressalto',       // 1
  'Estampa Furo',          // 2
  'Mandrila',              // 3
  'Fresa Canal',           // 4
  'Chanfradeira',          // 5
  'Inspeção Final',        // 6
  'Prensa Curvar',         // 7
];

// Tipos de checklist obrigatórios (conforme solicitado pelo usuário)
const CHECKLIST_TYPES = [
  'Processo',
  'Qualidade',
  'PCP & Produção',
  'MAN & MC',
  'Gestão de Pessoas',
  'IF',
];

export class AuditDistributor {
  private employees: Employee[];
  private sectors: Sector[];
  private weeklyAuditorUsage: Map<number, Set<string>> = new Map(); // day -> auditor IDs used
  private weeklyChecklistUsage: Map<string, Set<string>> = new Map(); // auditorId -> checklist types used

  constructor(employees: Employee[], sectors: Sector[]) {
    this.employees = employees.length > 0 ? employees : this.getMockEmployees();
    this.sectors = sectors;
  }

  /**
   * Get sectors for a specific week following the fixed pattern
   * 
   * @param weekNumber - Week number in month (1-4 or 1-5)
   * @returns Array of 5 sector objects
   */
  private getSectorsForWeek(weekNumber: number): Sector[] {
    const patternKey = (weekNumber - 1) % 4;
    const sectorIndices = weekNumber === 5 
      ? this.getWeek5Sectors()
      : SECTOR_PATTERNS[patternKey];
    
    return sectorIndices
      .map(idx => this.sectors.find(s => s.name === SECTOR_NAMES[idx]))
      .filter(s => s !== undefined) as Sector[];
  }

  /**
   * Calculate Week 5 sectors based on rotation logic
   * Avoid exact repetition of Week 4, prioritize less-used sectors
   */
  private getWeek5Sectors(): number[] {
    // Week 4 pattern (last week)
    const week4Pattern = SECTOR_PATTERNS[3]; // [7, 0, 5, 2, 3]
    
    // All 8 sectors
    const allIndices = [0, 1, 2, 3, 4, 5, 6, 7];
    
    // Sector count (how many times appeared in weeks 1-4)
    const sectorCount: Record<number, number> = {};
    allIndices.forEach(i => sectorCount[i] = 0);
    
    Object.values(SECTOR_PATTERNS).forEach(pattern => {
      pattern.forEach(idx => {
        sectorCount[idx]++;
      });
    });
    
    // Sort by least used, then pick 5 avoiding exact week 4 repetition
    const candidates = allIndices
      .filter(idx => !week4Pattern.includes(idx))
      .sort((a, b) => sectorCount[a] - sectorCount[b]);
    
    // If not enough candidates, add some from week 4 (but in different order)
    let week5 = candidates.slice(0, 5);
    if (week5.length < 5) {
      const remaining = week4Pattern.filter(idx => !week5.includes(idx));
      week5 = week5.concat(remaining).slice(0, 5);
    }
    
    return week5;
  }

  /**
   * Distribute assignments for a single week
   * Returns 5 sectors × 5 days = 25 assignments
   */
  distributeForWeek(weekNumber: number, year: number): AuditAssignment[] {
    const assignments: AuditAssignment[] = [];
    
    // Reset weekly tracking
    this.weeklyAuditorUsage.clear();
    this.weeklyChecklistUsage.clear();
    this.employees.forEach(e => this.weeklyChecklistUsage.set(e.id, new Set()));
    
    // Initialize day counters for auditor rotation
    for (let d = 1; d <= 5; d++) {
      this.weeklyAuditorUsage.set(d, new Set());
    }
    
    // Get sectors for this week
    const weekSectors = this.getSectorsForWeek(weekNumber);
    
    // For each sector, assign auditors for each day
    weekSectors.forEach((sector, sectorIdx) => {
      for (let dayNum = 1; dayNum <= 5; dayNum++) {
        // Get next auditor (rotate, don't repeat same day)
        const auditor = this.getNextAuditor(dayNum);
        
        // Get next checklist (rotate, don't repeat per auditor per week)
        const checklist = this.getNextChecklist(auditor.id);
        
        assignments.push({
          sectorId: sector.id,
          employeeId: auditor.id,
          checklistId: checklist.id,
          checklistName: checklist.name,
          sectorName: sector.name,
          employeeName: auditor.name,
          day: dayNum,
        });
      }
    });
    
    return assignments;
  }

  /**
   * Get next auditor for a day, ensuring no repeats on same day
   * Rotates through auditor list continuously
   */
  private getNextAuditor(dayNumber: number): Employee {
    const usedOnThisDay = this.weeklyAuditorUsage.get(dayNumber) || new Set();
    
    // Find first auditor not used this day
    const available = this.employees.filter(e => !usedOnThisDay.has(e.id));
    
    if (available.length === 0) {
      // Fallback: cycle back
      usedOnThisDay.clear();
      const selected = this.employees[0];
      usedOnThisDay.add(selected.id);
      this.weeklyAuditorUsage.set(dayNumber, usedOnThisDay);
      return selected;
    }
    
    // Round-robin: pick next in sequence
    const selected = available[usedOnThisDay.size % available.length];
    usedOnThisDay.add(selected.id);
    this.weeklyAuditorUsage.set(dayNumber, usedOnThisDay);
    return selected;
  }

  /**
   * Get next checklist for auditor, ensuring no repeats in same week
   */
  // normalize a checklist type string into the same id format used elsewhere in the app
  // the original helper in store.ts replaces whitespace with '-' so we must match exactly
  private normalizeChecklistId(type: string): string {
    // lower case, replace spaces with hyphens, then strip any non-alphanumeric/hyphen
    const base = type
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return `ck-${base}`;
  }

  private getNextChecklist(auditorId: string): { id: string; name: string } {
    const usedThisWeek = this.weeklyChecklistUsage.get(auditorId) || new Set();
    
    // Find next available type
    const available = CHECKLIST_TYPES.filter(t => !usedThisWeek.has(t));
    
    if (available.length === 0) {
      // Fallback: cycle back
      usedThisWeek.clear();
      const type = CHECKLIST_TYPES[0];
      usedThisWeek.add(type);
      this.weeklyChecklistUsage.set(auditorId, usedThisWeek);
      return { id: this.normalizeChecklistId(type), name: `Auditoria ${type}` };
    }
    
    // Pick next
    const type = available[usedThisWeek.size % available.length];
    usedThisWeek.add(type);
    this.weeklyChecklistUsage.set(auditorId, usedThisWeek);
    return { id: this.normalizeChecklistId(type), name: `Auditoria ${type}` };
  }

  /**
   * Mock employees for testing
   */
  private getMockEmployees(): Employee[] {
    return [
      { id: 'emp-mock-1', name: 'Diego Lima', role: 'Auditor', sector: 'Qualidade' },
      { id: 'emp-mock-2', name: 'Rafael Costa', role: 'Auditor', sector: 'Processo' },
      { id: 'emp-mock-3', name: 'Marlon Oliveira', role: 'Auditor', sector: 'Produção' },
      { id: 'emp-mock-4', name: 'Carlos Henrique', role: 'Auditor', sector: 'Qualidade' },
      { id: 'emp-mock-5', name: 'Aurélio Sousa', role: 'Auditor', sector: 'Qualidade' },
      { id: 'emp-mock-6', name: 'Samuel Mendes', role: 'Auditor', sector: 'Manutenção' },
      { id: 'emp-mock-7', name: 'Ronaldo Freitas', role: 'Auditor', sector: 'Estamparia' },
      { id: 'emp-mock-8', name: 'Mateus Costa', role: 'Auditor', sector: 'Qualidade' },
    ];
  }

  getEmployees(): Employee[] {
    return this.employees;
  }

  reset(): void {
    this.weeklyAuditorUsage.clear();
    this.weeklyChecklistUsage.clear();
  }
}

// Default sectors
export const DEFAULT_SECTORS: Sector[] = [
  { id: 'sec1', name: 'Brochadeira', checklistId: 'ck-broch' },
  { id: 'sec2', name: 'Prensa Ressalto', checklistId: 'ck-prensa' },
  { id: 'sec3', name: 'Estampa Furo', checklistId: 'ck-estampa' },
  { id: 'sec4', name: 'Mandrila', checklistId: 'ck-mandrila' },
  { id: 'sec5', name: 'Fresa Canal', checklistId: 'ck-fresa' },
  { id: 'sec6', name: 'Chanfradeira', checklistId: 'ck-chanfra' },
  { id: 'sec7', name: 'Inspeção Final', checklistId: 'ck-inspecao' },
  { id: 'sec8', name: 'Prensa Curvar', checklistId: 'ck-curvar' },
];
