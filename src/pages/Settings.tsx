import { useState, useEffect } from 'react';
import { store, Employee } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Save, Target, Users, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Goal {
  id: string;
  name: string;
  target: number;
  unit: string;
  period: string;
}

const ROLES = ['Operador', 'Técnico', 'Supervisor', 'Gestor', 'Engenheiro'];
const SECTORS = ['Produção', 'Manutenção', 'Qualidade', 'Estamparia', 'Fundição', 'Usinagem', 'Acabamento'];

function loadGoals(): Goal[] {
  try {
    const raw = localStorage.getItem('lpa_goals');
    return raw ? JSON.parse(raw) : defaultGoals;
  } catch { return defaultGoals; }
}
function saveGoals(goals: Goal[]) {
  localStorage.setItem('lpa_goals', JSON.stringify(goals));
}

const defaultGoals: Goal[] = [
  { id: '1', name: 'Taxa de Conformidade', target: 90, unit: '%', period: 'Mensal' },
  { id: '2', name: 'Auditorias por Semana', target: 15, unit: 'auditorias', period: 'Semanal' },
  { id: '3', name: 'Máx. NOK por Máquina', target: 3, unit: 'ocorrências', period: 'Mensal' },
  { id: '4', name: 'Cobertura de Máquinas', target: 100, unit: '%', period: 'Mensal' },
];

export default function Settings() {
  const [employees, setEmployees] = useState<Employee[]>(store.getEmployees());
  const [goals, setGoals] = useState<Goal[]>(loadGoals());

  // pre-select first employee
  const [currentEmpId, setCurrentEmpId] = useState<string | null>(() => {
    let id = store.getCurrentEmployeeId();
    if (!id && employees.length > 0) {
      id = employees[0].id;
    }
    return id;
  });

  // whenever selection changes persist
  useEffect(() => {
    store.setCurrentEmployeeId(currentEmpId);
  }, [currentEmpId]);


  // Employee form
  const [empDialog, setEmpDialog] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({ name: '', role: '', sector: '' });

  // Goal form
  const [goalDialog, setGoalDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalForm, setGoalForm] = useState({ name: '', target: '', unit: '', period: 'Mensal' });

  // --- Employee handlers ---
  const openNewEmp = () => {
    setEditingEmp(null);
    setEmpForm({ name: '', role: '', sector: '' });
    setEmpDialog(true);
  };
  const openEditEmp = (emp: Employee) => {
    setEditingEmp(emp);
    setEmpForm({ name: emp.name, role: emp.role, sector: emp.sector });
    setEmpDialog(true);
  };
  const saveEmp = () => {
    if (!empForm.name || !empForm.role || !empForm.sector) {
      toast.error('Preencha todos os campos');
      return;
    }
    let updated: Employee[];
    if (editingEmp) {
      updated = employees.map(e => e.id === editingEmp.id ? { ...e, ...empForm } : e);
    } else {
      const newEmp: Employee = { id: Math.random().toString(36).substring(2, 11), ...empForm };
      updated = [...employees, newEmp];
    }
    store.saveEmployees(updated);
    setEmployees(updated);
    setEmpDialog(false);
    toast.success(editingEmp ? 'Usuário atualizado' : 'Usuário adicionado');
  };
  const deleteEmp = (id: string) => {
    const updated = employees.filter(e => e.id !== id);
    store.saveEmployees(updated);
    setEmployees(updated);
    toast.success('Usuário removido');
  };

  // --- Goal handlers ---
  const openNewGoal = () => {
    setEditingGoal(null);
    setGoalForm({ name: '', target: '', unit: '', period: 'Mensal' });
    setGoalDialog(true);
  };
  const openEditGoal = (g: Goal) => {
    setEditingGoal(g);
    setGoalForm({ name: g.name, target: String(g.target), unit: g.unit, period: g.period });
    setGoalDialog(true);
  };
  const saveGoal = () => {
    if (!goalForm.name || !goalForm.target || !goalForm.unit) {
      toast.error('Preencha todos os campos');
      return;
    }
    let updated: Goal[];
    if (editingGoal) {
      updated = goals.map(g => g.id === editingGoal.id ? { ...g, name: goalForm.name, target: Number(goalForm.target), unit: goalForm.unit, period: goalForm.period } : g);
    } else {
      updated = [...goals, { id: Math.random().toString(36).substring(2, 11), name: goalForm.name, target: Number(goalForm.target), unit: goalForm.unit, period: goalForm.period }];
    }
    saveGoals(updated);
    setGoals(updated);
    setGoalDialog(false);
    toast.success(editingGoal ? 'Meta atualizada' : 'Meta adicionada');
  };
  const deleteGoal = (id: string) => {
    const updated = goals.filter(g => g.id !== id);
    saveGoals(updated);
    setGoals(updated);
    toast.success('Meta removida');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><SettingsIcon className="h-6 w-6" /> Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie metas e usuários do sistema</p>
      </div>

      <Tabs defaultValue="goals">
        <TabsList>
          <TabsTrigger value="goals" className="gap-2"><Target className="h-4 w-4" />Metas</TabsTrigger>
          <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" />Usuários</TabsTrigger>
        </TabsList>

        {/* add current user selector above tab contents */}
        <div className="mt-4 mb-6">
          <Label htmlFor="current-user" className="block text-sm font-medium">
            Auditor atual
          </Label>
          <Select
            value={currentEmpId || ''}
            onValueChange={val => setCurrentEmpId(val || null)}
          >
            <SelectTrigger id="current-user">
              <SelectValue placeholder="Nenhum selecionado" />
            </SelectTrigger>
            <SelectContent>
              {employees.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name} ({e.role})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* METAS */}
        <TabsContent value="goals" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Metas de Auditoria</h2>
            <Button onClick={openNewGoal}><Plus className="mr-2 h-4 w-4" />Nova Meta</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {goals.map(g => (
              <Card key={g.id}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">{g.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{g.period}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditGoal(g)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteGoal(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{g.target} <span className="text-sm font-normal text-muted-foreground">{g.unit}</span></p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* USUÁRIOS */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Auditores e Funcionários</h2>
            <Button onClick={openNewEmp}><Plus className="mr-2 h-4 w-4" />Novo Usuário</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{emp.role}</TableCell>
                      <TableCell>{emp.sector}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditEmp(emp)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteEmp(emp.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Employee Dialog */}
      <Dialog open={empDialog} onOpenChange={setEmpDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingEmp ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={empForm.name} onChange={e => setEmpForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div>
              <Label>Cargo</Label>
              <Select value={empForm.role} onValueChange={v => setEmpForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Setor</Label>
              <Select value={empForm.sector} onValueChange={v => setEmpForm(f => ({ ...f, sector: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={saveEmp}><Save className="mr-2 h-4 w-4" />Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Goal Dialog */}
      <Dialog open={goalDialog} onOpenChange={setGoalDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingGoal ? 'Editar Meta' : 'Nova Meta'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome da Meta</Label><Input value={goalForm.name} onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Valor Alvo</Label><Input type="number" value={goalForm.target} onChange={e => setGoalForm(f => ({ ...f, target: e.target.value }))} /></div>
            <div><Label>Unidade</Label><Input value={goalForm.unit} onChange={e => setGoalForm(f => ({ ...f, unit: e.target.value }))} placeholder="%, auditorias, ocorrências" /></div>
            <div>
              <Label>Período</Label>
              <Select value={goalForm.period} onValueChange={v => setGoalForm(f => ({ ...f, period: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semanal">Semanal</SelectItem>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                  <SelectItem value="Trimestral">Trimestral</SelectItem>
                  <SelectItem value="Anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={saveGoal}><Save className="mr-2 h-4 w-4" />Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
