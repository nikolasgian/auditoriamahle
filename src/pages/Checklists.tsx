import { useState, useMemo } from 'react';
import { store, Checklist, ChecklistItem } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Pencil, Eye, Search, Printer, Filter, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Checklists() {
  const navigate = useNavigate();
  const [checklists, setChecklists] = useState<Checklist[]>(store.getChecklists());
  const [formOpen, setFormOpen] = useState(false);
  const [viewChecklist, setViewChecklist] = useState<Checklist | null>(null);
  const [editing, setEditing] = useState<Checklist | null>(null);
  
  // Form fields
  const [fullText, setFullText] = useState(''); // e.g., "LPA N1- Processo"
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const categories = useMemo(() => [...new Set(checklists.map(c => c.category).filter(Boolean))], [checklists]);

  // Parse input like "LPA N1- Processo" -> name: "Processo", level: "N1", category: "Processo"
  const parseChecklistInput = (text: string) => {
    const match = text.match(/^LPA\s+(N\d+)\s*-\s*(.+)$/i);
    if (match) {
      const parsedLevel = match[1].toUpperCase();
      const parsedName = match[2].trim();
      setLevel(parsedLevel);
      setName(parsedName);
      setCategory(parsedName); // Category = name by default
      setFullText(text);
    }
  };

  const filteredChecklists = useMemo(() => {
    let result = checklists;
    if (filterCategory !== 'all') result = result.filter(c => c.category === filterCategory);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(term) || c.category.toLowerCase().includes(term));
    }
    return result;
  }, [checklists, searchTerm, filterCategory]);

  const resetForm = () => { setFullText(''); setName(''); setLevel(''); setCategory(''); setItems([]); setEditing(null); };
  const addItem = () => setItems([...items, { id: Math.random().toString(36).substr(2, 9), question: '', type: 'ok_nok' }]);
  const updateItem = (idx: number, field: string, value: string) => setItems(items.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const handleSave = () => {
    if (!name || items.length === 0) { toast.error('Nome e pelo menos um item são obrigatórios'); return; }
    if (editing) { 
      store.updateChecklist(editing.id, { name, level, category, items }); 
      toast.success('Checklist atualizado'); 
    }
    else { 
      store.addChecklist({ name, level, category, items }); 
      toast.success('Checklist criado'); 
    }
    setChecklists(store.getChecklists()); setFormOpen(false); resetForm();
  };

  const handleEdit = (c: Checklist) => {
    navigate('/checklist-template', { state: { checklistId: c.id } });
  };
  const handleDelete = (id: string) => { store.deleteChecklist(id); setChecklists(store.getChecklists()); toast.success('Checklist removido'); };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Checklists</title><style>
      body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%;margin-bottom:30px}
      th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:12px}th{background:#f0f0f0}
      h1{font-size:18px}h2{font-size:15px;margin-top:25px;border-bottom:1px solid #ccc;padding-bottom:5px}
      .badge{background:#e0e0e0;padding:2px 8px;border-radius:10px;font-size:10px}
    </style></head><body><h1>Checklists de Auditoria (${filteredChecklists.length})</h1>`);
    filteredChecklists.forEach(c => {
      win.document.write(`<h2>${c.name} <span class="badge">${c.category}</span></h2><table><tr><th>#</th><th>Pergunta</th><th>Tipo</th></tr>`);
      c.items.forEach((item, i) => win.document.write(`<tr><td>${i + 1}</td><td>${item.question}</td><td>${item.type.replace('_', '/')}</td></tr>`));
      win.document.write('</table>');
    });
    win.document.write('</body></html>');
    win.document.close(); win.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Checklists</h1>
          <p className="text-sm text-muted-foreground">Gerencie os checklists de auditoria · {checklists.length} registros</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
          <Button size="sm" onClick={() => navigate('/checklist-template')}><Plus className="mr-2 h-4 w-4" />Novo Checklist</Button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Buscar checklist..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44"><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChecklists.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum checklist encontrado</TableCell></TableRow>
              ) : filteredChecklists.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                  <TableCell>{c.items.length} perguntas</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewChecklist(c)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Checklist' : 'Novo Checklist'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Full text input (auto-parser) */}
            <div className="space-y-2">
              <Label>Formato Padrão (ex: "LPA N1- Processo")</Label>
              <Input
                placeholder="LPA N1- Processo"
                value={fullText}
                onChange={(e) => {
                  setFullText(e.target.value);
                  parseChecklistInput(e.target.value);
                }}
              />
              <p className="text-xs text-muted-foreground">Campo de parsing automático • Extrai nível e nome</p>
            </div>

            {/* Level */}
            <div className="space-y-2">
              <Label>Nível (extraído)</Label>
              <Input placeholder="N1, N2, N3..." value={level} onChange={(e) => setLevel(e.target.value)} />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label>Nome (extraído)</Label>
              <Input placeholder="Processo, Qualidade..." value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input placeholder="Processo, Qualidade..." value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Perguntas do Checklist</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Adicionar Pergunta</Button>
              </div>
              
              {items.map((item, idx) => (
                <div key={item.id} className="flex gap-2 p-3 border rounded-md">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Pergunta"
                      value={item.question}
                      onChange={(e) => updateItem(idx, 'question', e.target.value)}
                    />
                    <Select value={item.type} onValueChange={(v) => updateItem(idx, 'type', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ok_nok">OK/NOK</SelectItem>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="number">Número</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}

              {items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma pergunta adicionada</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setFormOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Atualizar' : 'Criar'} Checklist</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewChecklist} onOpenChange={() => setViewChecklist(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewChecklist?.name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {viewChecklist?.items.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 rounded-md border p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{i + 1}</span>
                <div>
                  <p className="text-sm">{item.question}</p>
                  <p className="text-xs text-muted-foreground capitalize">{item.type.replace('_', '/')}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
