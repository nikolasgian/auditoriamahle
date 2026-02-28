import { useState, useMemo } from 'react';
import { store, ScheduleEntry, AuditRecord } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wand2, Printer, Pencil, Trash2, Save, History, AlertTriangle, UserX, Cpu } from 'lucide-react';
import { toast } from 'sonner';

// week numbers are now global; month names no longer needed for filtering
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEK_DAYS = [
  { key: 1, label: 'Segunda' },
  { key: 2, label: 'Terça' },
  { key: 3, label: 'Quarta' },
  { key: 4, label: 'Quinta' },
  { key: 5, label: 'Sexta' },
  { key: 6, label: 'Sábado' },
];

function getStatusColor(entry: ScheduleEntry, audits: AuditRecord[]): string {
  if (entry.status === 'missed') return 'bg-red-500/20 border-red-500/40 text-red-700 dark:text-red-400';
  if (entry.status === 'pending') return 'bg-muted/30 border-border';
  const audit = audits.find(a => a.scheduleEntryId === entry.id);
  if (!audit) return 'bg-green-500/20 border-green-500/40 text-green-700 dark:text-green-400';
  if (audit.status === 'conforme') return 'bg-green-500/20 border-green-500/40 text-green-700 dark:text-green-400';
  if (audit.status === 'nao_conforme') return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-700 dark:text-yellow-400';
  return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-700 dark:text-yellow-400';
}

function getStatusLabel(entry: ScheduleEntry, audits: AuditRecord[]): string {
  if (entry.status === 'missed') return 'Não realizada';
  if (entry.status === 'pending') return 'Pendente';
  const audit = audits.find(a => a.scheduleEntryId === entry.id);
  if (!audit) return 'Realizada';
  if (audit.status === 'conforme') return 'Conforme';
  if (audit.status === 'nao_conforme') return 'Não conforme';
  return 'Parcial';
}

export default function Schedule() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [firstWeekNumber, setFirstWeekNumber] = useState<number | undefined>(undefined);
  const [histMonth, setHistMonth] = useState(now.getMonth() === 0 ? 11 : now.getMonth() - 1);
  const [histYear, setHistYear] = useState(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(store.getSchedule());
  const [editEntry, setEditEntry] = useState<ScheduleEntry | null>(null);
  const [editForm, setEditForm] = useState({ employeeId: '', sectorId: '', checklistId: '', dayOfWeek: 1 });

  const employees = store.getEmployees();
  const sectors = store.getSectors();
  const checklists = store.getChecklists();
  const audits = store.getAudits();

  const filtered = useMemo(() =>
    schedule.filter(s => s.month === month && s.year === year).sort((a, b) => a.weekNumber - b.weekNumber || a.dayOfWeek - b.dayOfWeek),
    [schedule, month, year]
  );

  const histFiltered = useMemo(() =>
    schedule.filter(s => s.month === histMonth && s.year === histYear).sort((a, b) => a.weekNumber - b.weekNumber || a.dayOfWeek - b.dayOfWeek),
    [schedule, histMonth, histYear]
  );

  const missedAnalysis = useMemo(() => {
    const allMissed = schedule.filter(s => s.status === 'missed');
    const byAuditor = new Map<string, number>();
    allMissed.forEach(m => byAuditor.set(m.employeeId, (byAuditor.get(m.employeeId) || 0) + 1));
    const auditorRanking = [...byAuditor.entries()].map(([id, count]) => ({ employee: employees.find(e => e.id === id), count })).filter(r => r.employee).sort((a, b) => b.count - a.count);
    const bySector = new Map<string, number>();
    allMissed.forEach(m => bySector.set(m.sectorId, (bySector.get(m.sectorId) || 0) + 1));
    const sectorRanking = [...bySector.entries()].map(([id, count]) => ({ sector: sectors.find(s => s.id === id), count })).filter(r => r.sector).sort((a, b) => b.count - a.count);
    return { total: allMissed.length, allMissed, auditorRanking, sectorRanking };
  }, [schedule, employees, sectors]);

  const handleGenerate = () => {
    if (sectors.length === 0 || checklists.length === 0 || employees.length === 0) { toast.error('Cadastre setores, checklists e funcionários antes de gerar'); return; }
    store.generateSchedule(month, year, firstWeekNumber);
    setSchedule(store.getSchedule());
    toast.success(`Cronograma de ${MONTHS[month]} gerado com sucesso!`);
  };

  const handleEditOpen = (entry: ScheduleEntry) => {
    setEditEntry(entry); setEditForm({ employeeId: entry.employeeId, sectorId: entry.sectorId, checklistId: entry.checklistId, dayOfWeek: entry.dayOfWeek });
  };

  const handleCreateOpen = (weekNumber: number, sectorId: string, dayOfWeek: number) => {
    const newEntry = {
      id: '',
      weekNumber,
      dayOfWeek,
      month,
      year,
      employeeId: '',
      sectorId: sectorId,
      checklistId: '',
      status: 'pending' as const,
    } as ScheduleEntry;
    setEditEntry(newEntry);
    setEditForm({ employeeId: '', sectorId: sectorId, checklistId: '', dayOfWeek });
  };

  const handleEditSave = () => {
    if (!editEntry) return;
    // if entry has empty id => create new
    if (!editEntry.id) {
      const created = store.addScheduleEntry({
        weekNumber: editEntry.weekNumber,
        dayOfWeek: editForm.dayOfWeek,
        month: editEntry.month ?? month,
        year: editEntry.year ?? year,
        employeeId: editForm.employeeId,
        sectorId: editForm.sectorId || editEntry.sectorId,
        checklistId: editForm.checklistId,
        status: 'pending',
      });
      setSchedule(store.getSchedule());
      setEditEntry(null);
      toast.success('Entrada criada');
      return;
    }

    store.updateScheduleEntry(editEntry.id, editForm);
    setSchedule(store.getSchedule());
    setEditEntry(null);
    toast.success('Entrada atualizada');
  };

  const handleDelete = (id: string) => { store.deleteScheduleEntry(id); setSchedule(store.getSchedule()); toast.success('Entrada removida'); };
  const handlePrint = () => window.print();

  // Group entries by week -> sector
  const groupByWeekSector = (entries: ScheduleEntry[]) => {
    const weeks = [...new Set(entries.map(e => e.weekNumber))].sort((a, b) => a - b);
    return weeks.map(weekNum => {
      const weekEntries = entries.filter(e => e.weekNumber === weekNum);
      const sectorIds = [...new Set(weekEntries.map(e => e.sectorId))];
      const sectorRows = sectorIds.map(sectorId => {
        const sector = sectors.find(s => s.id === sectorId);
        const byDay: Record<number, ScheduleEntry | undefined> = {};
        WEEK_DAYS.forEach(d => {
          byDay[d.key] = weekEntries.find(e => e.sectorId === sectorId && e.dayOfWeek === d.key);
        });
        return { sectorId: sectorId, sectorName: sector?.name || 'N/A', byDay };
      });
      return { weekNum, sectorRows };
    });
  };

  const grouped = useMemo(() => groupByWeekSector(filtered), [filtered, sectors]);
  const histGrouped = useMemo(() => groupByWeekSector(histFiltered), [histFiltered, sectors]);

  const renderCell = (entry: ScheduleEntry | undefined, isHistory: boolean, weekNum?: number, sectorId?: string) => {
    if (!entry) {
      if (isHistory) return null;
      // clickable empty cell: allow creating a new schedule entry
      return (
        <div className="p-2 text-center">
          <button onClick={() => weekNum !== undefined && sectorId && handleCreateOpen(weekNum, sectorId,  (WEEK_DAYS[0].key))} className="text-xs text-blue-600 hover:underline">Adicionar</button>
        </div>
      );
    }
    const emp = employees.find(e => e.id === entry.employeeId);
    const ck = checklists.find(c => c.id === entry.checklistId);
    const empName = emp?.name || 'N/A';
    const checklistName = ck ? (ck.level ? `${ck.level} - ${ck.name}` : ck.name) : '';

    let statusText = 'STATUS';
    let cellBg = '';
    if (isHistory) {
      if (entry.status === 'missed') { statusText = 'NÃO REALIZADA'; cellBg = 'bg-red-50 dark:bg-red-950/30'; }
      else if (entry.status === 'completed') {
        const audit = audits.find(a => a.scheduleEntryId === entry.id);
        if (audit?.status === 'conforme') { statusText = 'CONFORME'; cellBg = 'bg-green-50 dark:bg-green-950/30'; }
        else if (audit?.status === 'nao_conforme') { statusText = 'NÃO CONFORME'; cellBg = 'bg-yellow-50 dark:bg-yellow-950/30'; }
        else { statusText = 'PARCIAL'; cellBg = 'bg-yellow-50 dark:bg-yellow-950/30'; }
      } else { statusText = 'PENDENTE'; }
    }

    return (
      <div className={`group relative px-1.5 py-1 ${cellBg} ${!isHistory ? 'hover:bg-accent/10' : ''}`}>
        <div className="flex items-baseline gap-1">
          <span className="text-[9px] text-muted-foreground/60 uppercase">Quem</span>
          <span className="font-bold text-[11px] leading-tight">{empName}</span>
        </div>
        <div className="text-[9px] text-muted-foreground leading-tight pl-0.5">{checklistName}</div>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-[9px] text-muted-foreground/60 uppercase">Status</span>
          <span className="text-[9px] text-muted-foreground">{statusText}</span>
        </div>
        {!isHistory && (
          <div className="absolute top-0 right-0 hidden group-hover:flex gap-0.5 no-print">
            <button onClick={() => handleEditOpen(entry)} className="p-0.5 rounded hover:bg-accent/20"><Pencil className="h-2.5 w-2.5 text-muted-foreground" /></button>
            <button onClick={() => handleDelete(entry.id)} className="p-0.5 rounded hover:bg-destructive/20"><Trash2 className="h-2.5 w-2.5 text-destructive" /></button>
          </div>
        )}
      </div>
    );
  };

  const renderScheduleMatrix = (weekGroups: { weekNum: number; sectorRows: { sectorId: string; sectorName: string; byDay: Record<number, ScheduleEntry | undefined> }[] }[], isHistory: boolean) => {
    if (weekGroups.length === 0) return (
      <Card><CardContent className="py-12 text-center">
        <p className="text-muted-foreground">Nenhum cronograma para este período.</p>
        {!isHistory && <Button className="mt-4" onClick={handleGenerate}><Wand2 className="mr-2 h-4 w-4" />Gerar Cronograma</Button>}
      </CardContent></Card>
    );

    return (
      <Card className="overflow-hidden">
        {/* Blue title bar */}
        <div className="bg-blue-700 text-white text-center py-2 px-4">
          <h2 className="text-sm font-bold tracking-wide uppercase">Cronograma Auditoria Escalonada</h2>
        </div>
        {isHistory && (
          <div className="flex items-center gap-3 p-2 border-b flex-wrap bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground">Legenda:</span>
            <span className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded bg-green-100 border border-green-400 dark:bg-green-900" /> Conforme</span>
            <span className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-400 dark:bg-yellow-900" /> Não Conforme</span>
            <span className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded bg-red-100 border border-red-400 dark:bg-red-900" /> Não Realizada</span>
          </div>
        )}
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-bold text-center w-14">SEMANA</th>
                <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-bold text-left min-w-[110px]">ONDE</th>
                {WEEK_DAYS.map(d => (
                  <th key={d.key} className="border border-blue-600 px-1 py-1.5 text-[10px] font-bold text-center min-w-[120px] uppercase">{d.label}</th>
                ))}
                <th className="border border-blue-600 px-1 py-1.5 text-[10px] font-bold text-center min-w-[100px]">NÍVEL 02<br/>SEMANAL</th>
                <th className="border border-blue-600 px-1 py-1.5 text-[10px] font-bold text-center min-w-[100px]">DEMAIS<br/>NÍVEIS</th>
              </tr>
            </thead>
            <tbody>
              {weekGroups.map(({ weekNum, sectorRows }) =>
                sectorRows.map((row, rIdx) => (
                  <tr key={`${weekNum}-${row.sectorId}`} className={`border-b ${rIdx === sectorRows.length - 1 ? 'border-b-2 border-foreground/20' : 'border-border'}`}>
                    {rIdx === 0 && (
                      <td rowSpan={sectorRows.length} className="border border-border px-2 py-1 text-center font-bold text-sm align-middle bg-muted/20">
                        {weekNum}
                      </td>
                    )}
                    <td className="border border-border px-2 py-1 font-semibold text-[11px] bg-muted/10 whitespace-nowrap">
                      {row.sectorName}
                    </td>
                    {WEEK_DAYS.map(day => (
                                      <td key={day.key} className="border border-border p-0 align-top min-h-[40px]">
                                        {renderCell(row.byDay[day.key], isHistory, weekNum, row.sectorId)}
                                      </td>
                                    ))}
                    {/* Nível 02 Semanal */}
                    <td className="border border-border p-0 align-top">
                      {rIdx === 0 && row.byDay[WEEK_DAYS[0].key] ? (() => {
                        const entry = row.byDay[WEEK_DAYS[0].key]!;
                        const emp = employees.find(e => e.id === entry.employeeId);
                        return (
                          <div className="px-1.5 py-1">
                            <div className="font-bold text-[11px]">{emp?.name || 'N/A'}</div>
                            <div className="text-[10px] text-muted-foreground">{emp?.sector || ''}</div>
                          </div>
                        );
                      })() : null}
                    </td>
                    {/* Demais Níveis */}
                    <td className="border border-border p-0 align-top">
                      {rIdx === 0 && row.byDay[WEEK_DAYS[5]?.key] ? (() => {
                        const entry = row.byDay[WEEK_DAYS[5].key]!;
                        const emp = employees.find(e => e.id === entry.employeeId);
                        return (
                          <div className="px-1.5 py-1">
                            <div className="font-bold text-[11px]">{emp?.name || 'N/A'}</div>
                            <div className="text-[10px] text-muted-foreground">{emp?.sector || ''}</div>
                          </div>
                        );
                      })() : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Legend */}
          <div className="border-t p-3">
            <table className="text-[10px]">
              <tbody>
                <tr><td className="font-bold border border-border px-2 py-0.5 bg-muted/30">ONDE</td><td className="border border-border px-2 py-0.5">Local a ser auditado</td></tr>
                <tr><td className="font-bold border border-border px-2 py-0.5 bg-muted/30">MOTIVO</td><td className="border border-border px-2 py-0.5">Por que será auditado</td></tr>
                <tr><td className="font-bold border border-border px-2 py-0.5 bg-muted/30">QUEM</td><td className="border border-border px-2 py-0.5">Auditor responsável por realizar</td></tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cronograma de Auditorias</h1>
          <p className="text-sm text-muted-foreground">Planejamento, histórico e análise</p>
        </div>
      </div>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Cronograma Atual</TabsTrigger>
          <TabsTrigger value="history"><History className="mr-1.5 h-4 w-4" />Histórico</TabsTrigger>
          <TabsTrigger value="missed"><AlertTriangle className="mr-1.5 h-4 w-4" />Não Realizadas</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <div className="flex flex-wrap gap-2 no-print">
            <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-muted-foreground">Primeira Semana</label>
              <input type="number" min={1} value={firstWeekNumber ?? ''} onChange={e => setFirstWeekNumber(e.target.value ? Number(e.target.value) : undefined)} className="w-20 px-2 py-1 border rounded" placeholder="e.g. 6" />
            </div>
            <Button variant="outline" onClick={handleGenerate}><Wand2 className="mr-2 h-4 w-4" />Gerar Automático</Button>
            <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
          </div>
          {renderScheduleMatrix(grouped, false)}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="flex flex-wrap gap-2 no-print">
            <Select value={String(histMonth)} onValueChange={v => setHistMonth(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(histYear)} onValueChange={v => setHistYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
          </div>
          {renderScheduleMatrix(histGrouped, true)}
        </TabsContent>

        <TabsContent value="missed" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Total Não Realizadas</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-destructive">{missedAnalysis.total}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><UserX className="h-4 w-4 text-destructive" /> Auditor com Mais Faltas</CardTitle></CardHeader>
              <CardContent>
                {missedAnalysis.auditorRanking[0] ? (<><p className="text-lg font-bold">{missedAnalysis.auditorRanking[0].employee?.name}</p><p className="text-sm text-muted-foreground">{missedAnalysis.auditorRanking[0].count} não realizada(s)</p></>) : <p className="text-muted-foreground">Nenhuma</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Cpu className="h-4 w-4 text-destructive" /> Setor Mais Afetado</CardTitle></CardHeader>
              <CardContent>
                {missedAnalysis.sectorRanking[0] ? (<><p className="text-lg font-bold">{missedAnalysis.sectorRanking[0].sector?.name}</p><p className="text-sm text-muted-foreground">{missedAnalysis.sectorRanking[0].count} perdida(s)</p></>) : <p className="text-muted-foreground">Nenhuma</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Ranking Auditores — Não Realizadas</CardTitle></CardHeader>
              <CardContent>
                {missedAnalysis.auditorRanking.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Auditor</TableHead><TableHead>Setor</TableHead><TableHead className="text-right">Qtd</TableHead></TableRow></TableHeader>
                    <TableBody>{missedAnalysis.auditorRanking.map((r, i) => (
                      <TableRow key={r.employee!.id}><TableCell className="font-medium">{i + 1}</TableCell><TableCell>{r.employee!.name}</TableCell><TableCell className="text-muted-foreground">{r.employee!.sector}</TableCell><TableCell className="text-right"><Badge variant="destructive">{r.count}</Badge></TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Ranking Setores — Perdidas</CardTitle></CardHeader>
              <CardContent>
                {missedAnalysis.sectorRanking.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Setor</TableHead><TableHead className="text-right">Qtd</TableHead></TableRow></TableHeader>
                    <TableBody>{missedAnalysis.sectorRanking.map((r, i) => (
                      <TableRow key={r.sector!.id}><TableCell className="font-medium">{i + 1}</TableCell><TableCell>{r.sector!.name}</TableCell><TableCell className="text-right"><Badge variant="destructive">{r.count}</Badge></TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Lista Completa — Não Realizadas</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {missedAnalysis.allMissed.length === 0 ? <p className="p-6 text-center text-muted-foreground">Nenhuma auditoria não realizada.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Mês/Ano</TableHead><TableHead>Semana</TableHead><TableHead>Dia</TableHead><TableHead>Auditor</TableHead><TableHead>Setor</TableHead><TableHead>Checklist</TableHead></TableRow></TableHeader>
                  <TableBody>{missedAnalysis.allMissed.map(entry => {
                    const emp = employees.find(e => e.id === entry.employeeId);
                    const setor = sectors.find(s => s.id === entry.sectorId);
                    const ck = checklists.find(c => c.id === entry.checklistId);
                    return (<TableRow key={entry.id}><TableCell>{MONTHS[entry.month]} {entry.year}</TableCell><TableCell>{entry.weekNumber}</TableCell><TableCell>{WEEK_DAYS.find(d => d.key === entry.dayOfWeek)?.label || '—'}</TableCell><TableCell>{emp?.name || 'N/A'}</TableCell><TableCell>{setor?.name || 'N/A'}</TableCell><TableCell>{ck?.name || 'N/A'}</TableCell></TableRow>);
                  })}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editEntry} onOpenChange={() => setEditEntry(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Entrada</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Dia da Semana</Label>
              <Select value={String(editForm.dayOfWeek)} onValueChange={v => setEditForm(f => ({ ...f, dayOfWeek: Number(v) }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{WEEK_DAYS.map(d => <SelectItem key={d.key} value={String(d.key)}>{d.label}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Funcionário</Label>
              <Select value={editForm.employeeId} onValueChange={v => setEditForm(f => ({ ...f, employeeId: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Setor</Label>
              <Select value={editForm.sectorId} onValueChange={v => setEditForm(f => ({ ...f, sectorId: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sectors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Checklist</Label>
              <Select value={editForm.checklistId} onValueChange={v => setEditForm(f => ({ ...f, checklistId: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{checklists.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <Button className="w-full" onClick={handleEditSave}><Save className="mr-2 h-4 w-4" />Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
