import { useState, useEffect } from 'react';
import { store, ScheduleEntry } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function MyAudits() {
  const now = new Date();
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [myId, setMyId] = useState<string | null>(store.getCurrentEmployeeId());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString());
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const navigate = useNavigate();

  // Clean old schedule entries on mount
  useEffect(() => {
    store.cleanOldScheduleEntries();
  }, []);

  // auto-select first employee if none selected
  useEffect(() => {
    let currentId = store.getCurrentEmployeeId();
    if (!currentId) {
      const employees = store.getEmployees();
      if (employees.length > 0) {
        currentId = employees[0].id;
        store.setCurrentEmployeeId(currentId);
      }
    }
    setMyId(currentId);
  }, []);

  useEffect(() => {
    if (myId) {
      const filterMonth = parseInt(selectedMonth);
      const filterYear = parseInt(selectedYear);
      
      // Show schedule entries for selected month/year
      let all = store.getSchedule().filter(e => 
        e.employeeId === myId &&
        e.year === filterYear &&
        e.month === filterMonth
      );
      
      // Also filter by week if selected (ignore when 'all')
      if (selectedWeek !== null && selectedWeek !== 'all') {
        const filterWeek = parseInt(selectedWeek);
        all = all.filter(e => e.weekNumber === filterWeek);
      }
      
      setEntries(all);
    } else {
      setEntries([]);
    }
  }, [myId, selectedMonth, selectedYear, selectedWeek]);

  const goToMobile = (entry: ScheduleEntry) => {
    navigate(`/mobile-audit?entry=${entry.id}`);
  };

  const currentEmp = store.getCurrentEmployee();
  const filterMonth = parseInt(selectedMonth);
  const filterYear = parseInt(selectedYear);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Get available weeks for the selected month/year
  const availableWeeks = Array.from(
    new Set(
      store.getSchedule()
        .filter(e => 
          e.employeeId === myId &&
          e.year === filterYear &&
          e.month === filterMonth
        )
        .map(e => e.weekNumber)
    )
  ).sort((a, b) => a - b);
  
  // Pending: not completed
  const pending = entries.filter(e => e.status === 'pending');
  
  // Completed: any status completed
  const completed = entries.filter(e => e.status === 'completed');
  
  // Delayed: for this month, shows if it's in the past
  const isMonthInPast = filterYear < currentYear || (filterYear === currentYear && filterMonth < currentMonth);
  const delayed = isMonthInPast ? pending : [];

  const renderTable = (data: ScheduleEntry[], emptyMsg: string) => {
    if (data.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-4">
          {emptyMsg}
        </p>
      );
    }

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Período</TableHead>
            <TableHead>Setor</TableHead>
            <TableHead>Checklist</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(e => {
            const sector = store.getSectors().find(s => s.id === e.sectorId);
            const ck = store.getChecklists().find(c => c.id === e.checklistId);
            const monthName = monthNames[e.month] || '?';
            const periodLabel = `Semana ${e.weekNumber} • ${monthName}/${e.year}`;
            return (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{periodLabel}</TableCell>
                <TableCell>{sector?.name || '-'}</TableCell>
                <TableCell>{ck?.name || '-'}</TableCell>
                <TableCell className="text-right">
                  {e.status === 'pending' && (
                    <Button size="sm" onClick={() => goToMobile(e)}>
                      Abrir
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minhas Auditorias</h1>
        {currentEmp && (
          <p className="text-sm text-muted-foreground mt-1">
            Auditor: <span className="font-semibold text-foreground">{currentEmp.name}</span> ({currentEmp.role})
          </p>
        )}
      </div>

      {/* Month/Year Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[150px]">
          <label className="text-sm font-medium mb-2 block">Mês</label>
          <Select value={selectedMonth} onValueChange={(val) => {
            setSelectedMonth(val);
            setSelectedWeek(null); // Reset week when changing month
          }}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Janeiro</SelectItem>
              <SelectItem value="1">Fevereiro</SelectItem>
              <SelectItem value="2">Março</SelectItem>
              <SelectItem value="3">Abril</SelectItem>
              <SelectItem value="4">Maio</SelectItem>
              <SelectItem value="5">Junho</SelectItem>
              <SelectItem value="6">Julho</SelectItem>
              <SelectItem value="7">Agosto</SelectItem>
              <SelectItem value="8">Setembro</SelectItem>
              <SelectItem value="9">Outubro</SelectItem>
              <SelectItem value="10">Novembro</SelectItem>
              <SelectItem value="11">Dezembro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="text-sm font-medium mb-2 block">Ano</label>
          <Select value={selectedYear} onValueChange={(val) => {
            setSelectedYear(val);
            setSelectedWeek(null); // Reset week when changing year
          }}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
              <SelectItem value="2028">2028</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="text-sm font-medium mb-2 block">Semana</label>
          <Select
            value={selectedWeek || ''}
            onValueChange={(val) => setSelectedWeek(val === 'all' ? null : val || null)}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {availableWeeks.map(week => (
                <SelectItem key={week} value={week.toString()}>
                  Semana {week}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            A Fazer ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Concluídas ({completed.length})
          </TabsTrigger>
          <TabsTrigger value="delayed" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Atrasadas ({delayed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {renderTable(pending, 'Nenhuma auditoria pendente')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {renderTable(completed, 'Nenhuma auditoria concluída')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delayed" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {renderTable(delayed, 'Nenhuma auditoria atrasada')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
