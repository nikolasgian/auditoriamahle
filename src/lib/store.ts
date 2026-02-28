// LPA Audit System - In-memory store with localStorage persistence

import { AuditDistributor, DEFAULT_SECTORS } from './scheduleDistribution';
import { SECTOR_CHECKLISTS } from './sectorChecklists';

export interface Machine {
  id: string;
  name: string;
  code: string;
  sector: string;
  description: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  question: string;
  type: 'ok_nok' | 'text' | 'number';
}

export interface Checklist {
  id: string;
  name: string;
  category: string;
  level?: string; // e.g., "N1", "N2"
  items: ChecklistItem[];
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  sector: string;
}

export interface Sector {
  id: string;
  name: string;
  checklistId: string;
}


export interface ScheduleEntry {
  id: string;
  weekNumber: number;
  dayOfWeek: number; // 0-6
  month: number;
  year: number;
  employeeId: string;
  sectorId: string; // sector, not specific machine
  checklistId: string;
  status: 'pending' | 'completed' | 'missed';
}

export interface AuditAnswer {
  checklistItemId: string;
  answer: string;
  conformity: 'ok' | 'nok' | 'na';
}

export interface AuditRecord {
  id: string;
  scheduleEntryId: string;
  employeeId: string;
  machineId: string;
  checklistId: string;
  date: string;
  answers: AuditAnswer[];
  observations: string;
  photos: string[]; // base64
  status: 'conforme' | 'nao_conforme' | 'parcial';
  createdAt: string;
}

// --- Helper ---
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Ensure mandatory checklists exist
 * Creates them if missing
 */
// normalize a checklist type/name into the canonical ID used in the system
function normalizeChecklistId(type: string): string {
  return `ck-${type.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
}

function ensureMandatoryChecklists(existing: Checklist[]): Checklist[] {
  const MANDATORY_TYPES = [
    'Processo',
    'Qualidade',
    'PCP & Produção',
    'MAN & MC',
    'Gestão de Pessoas',
    'IF',
  ];

  // Keep only mandatory existing checklists
  const filteredExisting = existing.filter(c => MANDATORY_TYPES.includes(c.name));
  const existingNames = new Set(filteredExisting.map(c => c.name));

  const toCreate = MANDATORY_TYPES.filter(type => !existingNames.has(type));
  const created = toCreate.map(type => ({
    id: normalizeChecklistId(type),
    name: type,
    category: type,
    createdAt: new Date().toISOString(),
    items: [
      { id: `ci-${generateId()}`, question: `Verificar ${type}?`, type: 'ok_nok' as const },
      { id: `ci-${generateId()}`, question: 'Observações', type: 'text' as const },
    ],
  }));

  return [...filteredExisting, ...created];
}

/**
 * Mock employees for when no real employees are registered
 */
function getMockEmployees(): Employee[] {
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

// --- Default Data ---
const defaultEmployees: Employee[] = [
  { id: 'emp1', name: 'Carlos Silva', role: 'Operador', sector: 'Produção' },
  { id: 'emp2', name: 'Maria Santos', role: 'Técnico', sector: 'Manutenção' },
  { id: 'emp3', name: 'João Oliveira', role: 'Operador', sector: 'Produção' },
  { id: 'emp4', name: 'Ana Costa', role: 'Supervisor', sector: 'Qualidade' },
  { id: 'emp5', name: 'Pedro Lima', role: 'Operador', sector: 'Produção' },
  { id: 'emp6', name: 'Fernanda Rocha', role: 'Técnico', sector: 'Manutenção' },
  { id: 'emp7', name: 'Roberto Mendes', role: 'Operador', sector: 'Estamparia' },
  { id: 'emp8', name: 'Lucia Ferreira', role: 'Supervisor', sector: 'Qualidade' },
];

const defaultMachines: Machine[] = [
  { id: 'mach1', name: 'Brochadeira #01', code: 'BRO-001', sector: 'Brochadeira', description: 'Máquina brochadeira para furações de precisão', createdAt: '2024-01-15' },
  { id: 'mach2', name: 'Chanfradeira #01', code: 'CHA-001', sector: 'Chanfradeira', description: 'Máquina chanfradeira para acabamento de arestas', createdAt: '2024-01-15' },
  { id: 'mach3', name: 'Prensa Ressalto #01', code: 'PRS-001', sector: 'Prensa Ressalto', description: 'Prensa para pressão e ressalto', createdAt: '2024-02-01' },
  { id: 'mach4', name: 'Inspeção Final #01', code: 'INS-001', sector: 'Inspeção Final', description: 'Máquina de inspeção visual e dimensional final', createdAt: '2024-02-10' },
  { id: 'mach5', name: 'Estampa Furo #01', code: 'EST-001', sector: 'Estampa Furo', description: 'Máquina de estamparia para furos', createdAt: '2024-03-01' },
  { id: 'mach6', name: 'Prensa Curvar #01', code: 'PCU-001', sector: 'Prensa Curvar', description: 'Prensa para curvagem de peças', createdAt: '2024-03-15' },
  { id: 'mach7', name: 'Mandrila #01', code: 'MAN-001', sector: 'Mandrila', description: 'Máquina mandrila para acabamento', createdAt: '2024-03-20' },
  { id: 'mach8', name: 'Fresa Canal #01', code: 'FRE-001', sector: 'Fresa Canal', description: 'Máquina fresadora para abertura de canais', createdAt: '2024-04-01' },
];

const defaultChecklists: Checklist[] = [
  ...SECTOR_CHECKLISTS,
  {
    id: 'ck1', name: 'Segurança da Máquina', category: 'Segurança', createdAt: '2024-01-10',
    items: [
      { id: 'ci1', question: 'Proteções de segurança estão instaladas?', type: 'ok_nok' },
      { id: 'ci2', question: 'Botão de emergência está funcional?', type: 'ok_nok' },
      { id: 'ci3', question: 'EPIs estão sendo utilizados?', type: 'ok_nok' },
      { id: 'ci4', question: 'Observações adicionais', type: 'text' },
    ]
  },
  {
    id: 'ck2', name: '5S - Organização', category: '5S', createdAt: '2024-01-10',
    items: [
      { id: 'ci5', question: 'Área de trabalho está limpa?', type: 'ok_nok' },
      { id: 'ci6', question: 'Ferramentas estão organizadas?', type: 'ok_nok' },
      { id: 'ci7', question: 'Materiais identificados corretamente?', type: 'ok_nok' },
    ]
  },
  {
    id: 'ck3', name: 'Qualidade do Processo', category: 'Qualidade', createdAt: '2024-01-15',
    items: [
      { id: 'ci8', question: 'Parâmetros de processo estão corretos?', type: 'ok_nok' },
      { id: 'ci9', question: 'Peça conforme especificação?', type: 'ok_nok' },
      { id: 'ci10', question: 'Registro de controle atualizado?', type: 'ok_nok' },
      { id: 'ci11', question: 'Temperatura do processo (°C)', type: 'number' },
    ]
  },
  {
    id: 'ck4', name: 'Manutenção Preventiva', category: 'Manutenção', createdAt: '2024-02-01',
    items: [
      { id: 'ci12', question: 'Lubrificação em dia?', type: 'ok_nok' },
      { id: 'ci13', question: 'Ruídos anormais detectados?', type: 'ok_nok' },
      { id: 'ci14', question: 'Nível de óleo adequado?', type: 'ok_nok' },
      { id: 'ci15', question: 'Filtros limpos?', type: 'ok_nok' },
    ]
  },
];

// --- Mock Audit Data Generator ---
function generateMockData() {
  const employees = defaultEmployees;
  const machines = defaultMachines;
  const checklists = defaultChecklists;

  const scheduleEntries: ScheduleEntry[] = [];
  const auditRecords: AuditRecord[] = [];
  
  const statuses: AuditRecord['status'][] = ['conforme', 'nao_conforme', 'parcial'];
  // Weight: 55% conforme, 25% nao_conforme, 20% parcial
  const statusWeights = [0.55, 0.80, 1.0];
  
  const observations = [
    'Tudo em ordem, sem observações.',
    'Proteção lateral solta, necessita manutenção.',
    'Vazamento de óleo detectado na base da máquina.',
    'EPIs incompletos - falta óculos de proteção.',
    'Área limpa, organização exemplar.',
    'Ferramentas fora do local designado.',
    'Temperatura acima do especificado, ajuste necessário.',
    'Filtro de ar saturado, trocar urgente.',
    'Ruído anormal no eixo principal.',
    'Lubrificação atrasada em 3 dias.',
    'Botão de emergência com defeito, interditar.',
    'Peça com rebarbas acima do tolerável.',
    '',
    '',
    '',
  ];

  // Generate data for last 6 months
  const now = new Date();
  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const month = d.getMonth();
    const year = d.getFullYear();

    for (let week = 1; week <= 4; week++) {
      // 3-5 audits per week
      const auditsThisWeek = 3 + Math.floor(Math.random() * 3);
      for (let a = 0; a < auditsThisWeek; a++) {
        const emp = employees[Math.floor(Math.random() * employees.length)];
        const mach = machines[Math.floor(Math.random() * machines.length)];
        const ck = checklists[Math.floor(Math.random() * checklists.length)];
        const dayOfWeek = 1 + Math.floor(Math.random() * 5);

        const schedId = generateId();
        const roll = Math.random();
        const status: AuditRecord['status'] = roll < statusWeights[0] ? 'conforme' : roll < statusWeights[1] ? 'nao_conforme' : 'parcial';

        scheduleEntries.push({
          id: schedId,
          weekNumber: week,
          dayOfWeek,
          month,
          year,
          employeeId: emp.id,
          sectorId: mach.sector, // use machine sector name as fallback
          checklistId: ck.id,
          status: 'completed',
        });

        const answers: AuditAnswer[] = ck.items.map(item => {
          if (item.type === 'ok_nok') {
            const conf = status === 'conforme' ? 'ok' : status === 'nao_conforme' ? (Math.random() > 0.4 ? 'nok' : 'ok') : (Math.random() > 0.5 ? 'ok' : 'nok');
            return { checklistItemId: item.id, answer: conf === 'ok' ? 'OK' : 'NOK', conformity: conf as 'ok' | 'nok' };
          }
          if (item.type === 'number') {
            return { checklistItemId: item.id, answer: String(150 + Math.floor(Math.random() * 50)), conformity: 'ok' as const };
          }
          return { checklistItemId: item.id, answer: 'Verificado', conformity: 'ok' as const };
        });

        const auditDay = Math.min(7 * (week - 1) + dayOfWeek, 28);
        const auditDate = new Date(year, month, auditDay);
        
        auditRecords.push({
          id: generateId(),
          scheduleEntryId: schedId,
          employeeId: emp.id,
          machineId: mach.id,
          checklistId: ck.id,
          date: auditDate.toISOString().split('T')[0],
          answers,
          observations: observations[Math.floor(Math.random() * observations.length)],
          photos: [],
          status,
          createdAt: auditDate.toISOString(),
        });
      }
    }
  }

  // Add some missed schedules in past months
  for (let monthOffset = 5; monthOffset >= 1; monthOffset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const missedCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < missedCount; i++) {
      const emp = employees[Math.floor(Math.random() * employees.length)];
      const mach = machines[Math.floor(Math.random() * machines.length)];
      const ck = checklists[Math.floor(Math.random() * checklists.length)];
      scheduleEntries.push({
        id: generateId(),
        weekNumber: 1 + Math.floor(Math.random() * 4),
        dayOfWeek: 1 + Math.floor(Math.random() * 5),
        month: d.getMonth(),
        year: d.getFullYear(),
        employeeId: emp.id,
        sectorId: mach.sector,
        checklistId: ck.id,
        status: 'missed',
      });
    }
  }

  // Add some pending schedules for current month
  for (let i = 0; i < 8; i++) {
    const emp = employees[Math.floor(Math.random() * employees.length)];
    const mach = machines[Math.floor(Math.random() * machines.length)];
    const ck = checklists[Math.floor(Math.random() * checklists.length)];
    scheduleEntries.push({
      id: generateId(),
      weekNumber: 3 + Math.floor(Math.random() * 2),
      dayOfWeek: 1 + Math.floor(Math.random() * 5),
      month: now.getMonth(),
      year: now.getFullYear(),
      employeeId: emp.id,
      sectorId: mach.sector,
      checklistId: ck.id,
      status: 'pending',
    });
  }

  return { scheduleEntries, auditRecords };
}

// Seed mock data on first load
function seedIfEmpty() {
  const audits = load<AuditRecord[]>('lpa_audits', []);
  if (audits.length === 0) {
    const mock = generateMockData();
    save('lpa_schedule', mock.scheduleEntries);
    save('lpa_audits', mock.auditRecords);
  }
}

seedIfEmpty();

// --- Store API ---
export const store = {
  // Employees
  getEmployees: (): Employee[] => load('lpa_employees', defaultEmployees),
  saveEmployees: (data: Employee[]) => save('lpa_employees', data),

  // Sectors
  getSectors: (): Sector[] => load('lpa_sectors', DEFAULT_SECTORS),
  saveSectors: (data: Sector[]) => save('lpa_sectors', data),
  addSector: (s: Omit<Sector, 'id'>): Sector => {
    const sectors = store.getSectors();
    const newSector: Sector = { ...s, id: generateId() };
    sectors.push(newSector);
    store.saveSectors(sectors);
    return newSector;
  },
  updateSector: (id: string, s: Partial<Sector>) => {
    const sectors = store.getSectors().map(x => x.id === id ? { ...x, ...s } : x);
    store.saveSectors(sectors);
  },
  deleteSector: (id: string) => {
    store.saveSectors(store.getSectors().filter(x => x.id !== id));
  },

  // Machines
  getMachines: (): Machine[] => load('lpa_machines', defaultMachines),
  saveMachines: (data: Machine[]) => save('lpa_machines', data),
  addMachine: (m: Omit<Machine, 'id' | 'createdAt'>): Machine => {
    const machines = store.getMachines();
    const newMachine: Machine = { ...m, id: generateId(), createdAt: new Date().toISOString().split('T')[0] };
    machines.push(newMachine);
    store.saveMachines(machines);
    return newMachine;
  },
  updateMachine: (id: string, m: Partial<Machine>) => {
    const machines = store.getMachines().map(x => x.id === id ? { ...x, ...m } : x);
    store.saveMachines(machines);
  },
  deleteMachine: (id: string) => {
    store.saveMachines(store.getMachines().filter(x => x.id !== id));
  },

  // Checklists
  getChecklists: (): Checklist[] => load('lpa_checklists', defaultChecklists),
  saveChecklists: (data: Checklist[]) => save('lpa_checklists', data),
  addChecklist: (c: Omit<Checklist, 'id' | 'createdAt'>): Checklist => {
    const checklists = store.getChecklists();
    const newChecklist: Checklist = { ...c, id: generateId(), createdAt: new Date().toISOString().split('T')[0] };
    checklists.push(newChecklist);
    store.saveChecklists(checklists);
    return newChecklist;
  },
  updateChecklist: (id: string, c: Partial<Checklist>) => {
    const checklists = store.getChecklists().map(x => x.id === id ? { ...x, ...c } : x);
    store.saveChecklists(checklists);
  },
  deleteChecklist: (id: string) => {
    store.saveChecklists(store.getChecklists().filter(x => x.id !== id));
  },

  // Schedule
  getSchedule: (): ScheduleEntry[] => load('lpa_schedule', []),
  saveSchedule: (data: ScheduleEntry[]) => save('lpa_schedule', data),

  // Current logged-in employee (auditor) helpers
  getCurrentEmployeeId: (): string | null => load('lpa_current_employee', null),
  setCurrentEmployeeId: (id: string | null) => {
    if (id) save('lpa_current_employee', id);
    else localStorage.removeItem('lpa_current_employee');
  },
  getCurrentEmployee: (): Employee | null => {
    const id = store.getCurrentEmployeeId();
    if (!id) return null;
    return store.getEmployees().find(e => e.id === id) || null;
  },

  // Utility: count how many "weeks" (as defined by getWeekOfMonth) occur in a given month
  // this is used to compute offsets for global week numbering.
  
  // exported for tests
  countWeeksInMonth: (year: number, month: number): number => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const weeks = new Set<number>();
    const temp = new Date(firstDay);
    while (temp <= lastDay) {
      weeks.add(getWeekOfMonth(temp));
      temp.setDate(temp.getDate() + 1);
    }
    return weeks.size;
  },

  /**
   * compute global week numbers for a month/year. When firstWeekOverride is
   * provided it will be used as the value for the first week of that month;
   * otherwise we add up the number of weeks in all preceding months of the
   * same year and start counting from there. The result is an ascending array
   * of numbers that may be displayed in the "SEMANA" column.
   */
  getGlobalWeekNumbersForMonth: (month: number, year: number, firstWeekOverride?: number): number[] => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let baseWeek: number;
    if (firstWeekOverride !== undefined) {
      baseWeek = firstWeekOverride;
    } else {
      let offset = 0;
      for (let m = 0; m < month; m++) {
        offset += store.countWeeksInMonth(year, m);
      }
      baseWeek = offset + 1;
    }

    const global: number[] = [];
    const temp = new Date(firstDay);
    while (temp <= lastDay) {
      const localWeek = getWeekOfMonth(temp);
      const globalWeek = baseWeek + (localWeek - 1);
      if (!global.includes(globalWeek)) global.push(globalWeek);
      temp.setDate(temp.getDate() + 1);
    }
    return global;
  },

  generateSchedule: (month: number, year: number, firstWeekNumber?: number): ScheduleEntry[] => {
    // Ensure mandatory checklists exist
    const existingChecklists = store.getChecklists();
    const completeChecklists = ensureMandatoryChecklists(existingChecklists);
    if (completeChecklists.length > existingChecklists.length) {
      store.saveChecklists(completeChecklists);
    }

    const employees = store.getEmployees();
    const employees_to_use = employees.length > 0 ? employees : getMockEmployees();
    const sectors = store.getSectors();
    
    if (sectors.length === 0) return [];

    const distributor = new AuditDistributor(employees_to_use, sectors);
    const entries: ScheduleEntry[] = [];
    
    // Get all weeks in the month (local week numbers 1-5)
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const localWeeks: number[] = [];
    const tempDate = new Date(firstDay);
    while (tempDate <= lastDay) {
      const weekNum = getWeekOfMonth(tempDate);
      if (!localWeeks.includes(weekNum)) localWeeks.push(weekNum);
      tempDate.setDate(tempDate.getDate() + 1);
    }

    // compute starting label for the first local week
    let baseWeek: number;
    if (firstWeekNumber !== undefined) {
      baseWeek = firstWeekNumber;
    } else {
      // offset by weeks from earlier months in same year
      let offset = 0;
      for (let m = 0; m < month; m++) {
        offset += store.countWeeksInMonth(year, m);
      }
      baseWeek = offset + 1;
    }

    // Generate assignments for each local week, but label entries with global week
    localWeeks.forEach((localWeek) => {
      const assignments = distributor.distributeForWeek(localWeek, year);
      const globalWeek = baseWeek + (localWeek - 1);
      assignments.forEach((assignment) => {
        entries.push({
          id: generateId(),
          weekNumber: globalWeek,
          dayOfWeek: assignment.day, // 1-5 for Mon-Fri
          month,
          year,
          employeeId: assignment.employeeId,
          sectorId: assignment.sectorId,
          checklistId: assignment.checklistId,
          status: 'pending',
        });
      });
    });

    const existing = store.getSchedule().filter(e => !(e.month === month && e.year === year));
    const all = [...existing, ...entries];
    store.saveSchedule(all);
    return entries;
  },

  addScheduleEntry: (e: Omit<ScheduleEntry, 'id'>): ScheduleEntry => {
    const schedule = store.getSchedule();
    const newEntry: ScheduleEntry = { ...e, id: generateId() };
    schedule.push(newEntry);
    store.saveSchedule(schedule);
    return newEntry;
  },

  updateScheduleEntry: (id: string, data: Partial<ScheduleEntry>) => {
    const schedule = store.getSchedule().map(e => e.id === id ? { ...e, ...data } : e);
    store.saveSchedule(schedule);
  },
  deleteScheduleEntry: (id: string) => {
    store.saveSchedule(store.getSchedule().filter(e => e.id !== id));
  },

  // Audits
  getAudits: (): AuditRecord[] => load('lpa_audits', []),
  saveAudits: (data: AuditRecord[]) => save('lpa_audits', data),
  addAudit: (a: Omit<AuditRecord, 'id' | 'createdAt'>): AuditRecord => {
    const audits = store.getAudits();
    const newAudit: AuditRecord = { ...a, id: generateId(), createdAt: new Date().toISOString() };
    audits.push(newAudit);
    store.saveAudits(audits);
    store.updateScheduleEntry(a.scheduleEntryId, { status: 'completed' });
    return newAudit;
  },

  // Clean schedule entries from past months
  cleanOldScheduleEntries: () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const cleaned = store.getSchedule().filter(e => 
      e.year > currentYear || (e.year === currentYear && e.month >= currentMonth)
    );
    store.saveSchedule(cleaned);
  },

  // Reset mock data
  resetMockData: () => {
    localStorage.removeItem('lpa_audits');
    localStorage.removeItem('lpa_schedule');
    const mock = generateMockData();
    save('lpa_schedule', mock.scheduleEntries);
    save('lpa_audits', mock.auditRecords);
  },

  // Reset machines to default
  resetMachines: () => {
    localStorage.removeItem('lpa_machines');
    store.saveMachines(defaultMachines);
  },
};

function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  return Math.ceil((date.getDate() + firstDay.getDay()) / 7);
}

export { getWeekOfMonth };
