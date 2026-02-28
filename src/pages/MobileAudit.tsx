import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { store, Checklist, Machine, AuditAnswer, ScheduleEntry, getWeekOfMonth } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { QrCode, Camera, CheckCircle2, XCircle, Send, ArrowLeft, Search, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

type Stage = 'scan' | 'checklist' | 'lpa_audit' | 'done';

export default function MobileAudit() {
  const [stage, setStage] = useState<Stage>('scan');
  const [machine, setMachine] = useState<Machine | null>(null);
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [answers, setAnswers] = useState<AuditAnswer[]>([]);
  const [observations, setObservations] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<any>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const currentEmpId = store.getCurrentEmployeeId();
  const allMachines = store.getMachines();
  const allSectors = store.getSectors();
  
  // Current schedule entry (loaded from URL param or manually selected)
  const [currentEntry, setCurrentEntry] = useState<any>(null);
  const [weekChecklistIds, setWeekChecklistIds] = useState<Set<string>>(new Set());
  
  // Audit selection modal state
  const [showAuditSelection, setShowAuditSelection] = useState(false);
  const [availableEntries, setAvailableEntries] = useState<ScheduleEntry[]>([]);
  const [pendingMachine, setPendingMachine] = useState<Machine | null>(null);

  // LPA Model state
  const [lpaItemStatuses, setLpaItemStatuses] = useState<Record<string, string>>({});
  const [lpaItemResponsible, setLpaItemResponsible] = useState<Record<string, string>>({});
  const [lpaItemActionImmediate, setLpaItemActionImmediate] = useState<Record<string, boolean>>({});
  const [lpaItemEscalate, setLpaItemEscalate] = useState<Record<string, boolean>>({});
  const [lpaPage, setLpaPage] = useState<'frente' | 'verso'>('frente');

  const stopScanner = async () => {
    try { const scanner = html5QrRef.current; if (scanner && scanner.isScanning) await scanner.stop(); } catch {}
    html5QrRef.current = null; setScanning(false);
  };

  useEffect(() => { return () => { const scanner = html5QrRef.current; if (scanner && scanner.isScanning) scanner.stop().catch(() => {}); }; }, []);


  // compute weekly checklist hints when machine or currentEmpId changes
  useEffect(() => {
    if (machine && currentEmpId) {
      const now = new Date();
      const localWeek = getWeekOfMonth(now);
      const globalWeek = store.getGlobalWeekNumbersForMonth(now.getMonth(), now.getFullYear())[localWeek - 1];
      const relevant = store.getSchedule().filter(e =>
        e.employeeId === currentEmpId &&
        e.weekNumber === globalWeek &&
        e.sectorId === machine.sector
      );
      setWeekChecklistIds(new Set(relevant.map(r => r.checklistId)));
    } else {
      setWeekChecklistIds(new Set());
    }
  }, [machine, currentEmpId]);

  const startScanner = async () => {
    setScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      html5QrRef.current = scanner;
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 },
        (decodedText: string) => { handleQrResult(decodedText); stopScanner(); }, () => {});
    } catch { toast.error('Não foi possível acessar a câmera.'); html5QrRef.current = null; setScanning(false); }
  };

  const handleQrResult = (text: string) => { const parts = text.split(':'); loadMachine(parts.length === 3 ? parts[2] : text); };

  const handleManualEntry = () => {
    const found = allMachines.find(m => m.id === manualCode || m.code.toLowerCase() === manualCode.toLowerCase());
    if (found) loadMachine(found.id); else toast.error('Máquina não encontrada');
  };

  const loadMachine = (machineId: string) => {
    const m = allMachines.find(x => x.id === machineId);
    if (!m) { 
      toast.error('Máquina não encontrada'); 
      return; 
    }
    
    // If no entry is set, show available audits for this machine's sector
    if (!currentEntry) {
      setPendingMachine(m);
      // Find all schedule entries for this auditor in this sector
      const sectorByName = store.getSectors().find(s => s.name === m.sector);
      const sectorId = sectorByName?.id || m.sector;
      
      const entries = store.getSchedule().filter(e =>
        e.employeeId === currentEmpId &&
        e.sectorId === sectorId
      );
      
      if (entries.length === 0) {
        toast.error(`Nenhuma auditoria disponível para o setor ${m.sector}`);
        return;
      }
      
      setAvailableEntries(entries);
      setShowAuditSelection(true);
      return;
    }
    
    // If entry is set, machine's sector must match entry's sectorId
    const entrySchedule = store.getSchedule().find(s => s.id === currentEntry.id);
    if (!entrySchedule) {
      toast.error('Entrada de cronograma não encontrada');
      return;
    }
    
    if (m.sector !== entrySchedule.sectorId) {
      // Try to find sector by name
      const sectorByName = store.getSectors().find(s => s.name === m.sector);
      const actualSectorId = sectorByName?.id || m.sector;
      const expectedSector = store.getSectors().find(s => s.id === entrySchedule.sectorId);
      
      if (actualSectorId !== entrySchedule.sectorId) {
        toast.error(`Essa máquina é do setor ${m.sector}, mas você precisa fazer auditoria no setor ${expectedSector?.name || entrySchedule.sectorId}`);
        return;
      }
    }
    
    setMachine(m);
    const ck = store.getChecklists().find(c => c.id === entrySchedule.checklistId);
    if (ck) { 
      setChecklist(ck);
      
      // Initialize LPA states with empty values
      const statusMap: Record<string, string> = {};
      const respMap: Record<string, string> = {};
      const immMap: Record<string, boolean> = {};
      const escMap: Record<string, boolean> = {};
      
      ck.items.forEach(item => {
        statusMap[item.id] = 'pending';
        respMap[item.id] = '';
        immMap[item.id] = false;
        escMap[item.id] = false;
      });
      
      setLpaItemStatuses(statusMap);
      setLpaItemResponsible(respMap);
      setLpaItemActionImmediate(immMap);
      setLpaItemEscalate(escMap);
      setStage('lpa_audit');
    }
    else toast.error('Nenhum checklist disponível');
  };

  const selectAudit = (entry: ScheduleEntry) => {
    setShowAuditSelection(false);
    if (pendingMachine) {
      setCurrentEntry(entry);
      const m = pendingMachine;
      const ck = store.getChecklists().find(c => c.id === entry.checklistId);
      
      setMachine(m);
      setChecklist(ck || null);
      
      // Initialize LPA states with empty values
      if (ck) {
        const statusMap: Record<string, string> = {};
        const respMap: Record<string, string> = {};
        const immMap: Record<string, boolean> = {};
        const escMap: Record<string, boolean> = {};
        
        ck.items.forEach(item => {
          statusMap[item.id] = 'pending';
          respMap[item.id] = '';
          immMap[item.id] = false;
          escMap[item.id] = false;
        });
        
        setLpaItemStatuses(statusMap);
        setLpaItemResponsible(respMap);
        setLpaItemActionImmediate(immMap);
        setLpaItemEscalate(escMap);
        setStage('lpa_audit');
      }
      
      setPendingMachine(null);
      setAvailableEntries([]);
    }
  };

  // if URL has an entry query param, pre-load it
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const entryId = params.get('entry');
    if (entryId) {
      const entry = store.getSchedule().find(s => s.id === entryId);
      if (entry) {
        setCurrentEntry(entry);
      }
      // clear param so back button works normally
      navigate(location.pathname, { replace: true });
    }
  }, [location.search]);

  // compute weekly checklist hints when machine or currentEmpId changes
  useEffect(() => {
    if (machine && currentEmpId) {
      const now = new Date();
      const localWeek = getWeekOfMonth(now);
      const globalWeek = store.getGlobalWeekNumbersForMonth(now.getMonth(), now.getFullYear())[localWeek - 1];
      const relevant = store.getSchedule().filter(e =>
        e.employeeId === currentEmpId &&
        e.weekNumber === globalWeek &&
        e.sectorId === machine.sector
      );
      setWeekChecklistIds(new Set(relevant.map(r => r.checklistId)));
    } else {
      setWeekChecklistIds(new Set());
    }
  }, [machine, currentEmpId]);

  const updateAnswer = (idx: number, field: string, value: string) => setAnswers(answers.map((a, i) => i === idx ? { ...a, [field]: value } : a));

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return;
    Array.from(files).forEach(file => { const reader = new FileReader(); reader.onloadend = () => setPhotos(prev => [...prev, reader.result as string]); reader.readAsDataURL(file); });
  };

  const handleSubmit = () => {
    if (!machine || !checklist) return;
    const allOk = answers.every(a => a.conformity === 'ok');
    const anyNok = answers.some(a => a.conformity === 'nok');
    store.addAudit({ 
      scheduleEntryId: currentEntry?.id || '', 
      employeeId: currentEntry?.employeeId || store.getCurrentEmployeeId() || 'emp1', 
      machineId: machine.id, 
      checklistId: checklist.id, 
      date: new Date().toISOString(), 
      answers, 
      observations, 
      photos, 
      status: allOk ? 'conforme' : anyNok ? 'nao_conforme' : 'parcial' 
    });
    toast.success('Auditoria registrada com sucesso!'); 
    setStage('done');
  };

  const handleLpaSubmit = () => {
    if (!machine || !checklist) return;
    
    // Calculate answers from LPA states
    const lpaAnswers = checklist.items.map(item => ({
      checklistItemId: item.id,
      answer: lpaItemStatuses[item.id] || 'pending',
      conformity: lpaItemStatuses[item.id] === 'conforme' ? 'ok' : lpaItemStatuses[item.id] === 'nao_conforme' ? 'nok' : 'ok'
    }));
    
    const allOk = Object.values(lpaItemStatuses).every(s => s === 'conforme');
    const anyNok = Object.values(lpaItemStatuses).some(s => s === 'nao_conforme');
    
    store.addAudit({ 
      scheduleEntryId: currentEntry?.id || '', 
      employeeId: currentEntry?.employeeId || store.getCurrentEmployeeId() || 'emp1', 
      machineId: machine.id, 
      checklistId: checklist.id, 
      date: new Date().toISOString(), 
      answers: lpaAnswers, 
      observations, 
      photos, 
      status: allOk ? 'conforme' : anyNok ? 'nao_conforme' : 'parcial' 
    });
    toast.success('Auditoria LPA registrada com sucesso!');
    setStage('done');
  };

  const reset = () => { 
    setStage('scan'); 
    setMachine(null); 
    setChecklist(null); 
    setAnswers([]); 
    setObservations(''); 
    setPhotos([]); 
    setManualCode(''); 
    setCurrentEntry(null); 
    setShowAuditSelection(false);
    setPendingMachine(null);
    setAvailableEntries([]);
    setLpaPage('frente');
  };

  // Audit selection modal
  if (showAuditSelection && pendingMachine) {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return (
      <Dialog open={showAuditSelection} onOpenChange={() => {
        setShowAuditSelection(false);
        setPendingMachine(null);
        setAvailableEntries([]);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Auditoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Máquina: <strong>{pendingMachine.name}</strong> ({pendingMachine.code})</p>
            <p className="text-sm text-muted-foreground">Setor: <strong>{pendingMachine.sector}</strong></p>
            <p className="text-sm font-semibold mt-4">Auditorias disponíveis:</p>
            
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {availableEntries.map(entry => {
                const ck = store.getChecklists().find(c => c.id === entry.checklistId);
                const period = `Semana ${entry.weekNumber} • ${monthNames[entry.month]}/${entry.year}`;
                const statusColor = entry.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
                
                return (
                  <Button
                    key={entry.id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3"
                    onClick={() => selectAudit(entry)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{ck?.name || 'Checklist'}</p>
                      <p className="text-xs text-muted-foreground mt-1">{period}</p>
                      <Badge className={`mt-2 ${statusColor}`}>{entry.status === 'completed' ? 'Concluída' : 'Pendente'}</Badge>
                    </div>
                  </Button>
                );
              })}
            </div>

            <Button variant="outline" className="w-full" onClick={() => {
              setShowAuditSelection(false);
              setPendingMachine(null);
              setAvailableEntries([]);
            }}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Recent machines for quick access
  const recentMachines = allMachines.slice(0, 5);

  // LPA Audit Stage - Full Model View (Frente/Verso)
  if (stage === 'lpa_audit' && machine && checklist && currentEntry) {
    const sideColor = '#1e40af';
    const sideLabel = machine.sector.toUpperCase();
    const title = `LPA ${currentEntry.weekNumber ? `Semana ${currentEntry.weekNumber}` : ''} – ${checklist.name.toUpperCase()}`;
    const currentEmp = store.getCurrentEmployee();

    const statusColor = (s: string) => {
      if (s === 'conforme') return { bg: '#16a34a', text: 'white', label: 'A' };
      if (s === 'nao_conforme') return { bg: '#dc2626', text: 'white', label: 'R' };
      if (s === 'na') return { bg: '#a3a3a3', text: 'white', label: 'NA' };
      return { bg: '#e5e5e5', text: '#888', label: '–' };
    };

    return (
      <div className="min-h-screen bg-gray-100 text-black pb-4">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-white border-b-2 border-black/40 px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={reset}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
          <span className="text-sm font-semibold">
            {lpaPage === 'frente' ? '📄 FRENTE' : '📋 VERSO'}
          </span>
          <div className="w-20"></div>
        </div>

        {/* ====== FRENTE ====== */}
        {lpaPage === 'frente' && (
          <div className="border-2 border-foreground/30 rounded-sm overflow-hidden relative max-w-4xl mx-auto bg-white text-black mt-3 mb-3">
            {/* Side label */}
            <div className="absolute right-0 top-0 bottom-0 w-9 flex items-center justify-center font-bold text-xs text-white z-10" style={{ background: sideColor, writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '2px' }}>
              {sideLabel}
            </div>

            {/* Title bar */}
            <div className="pr-11 text-center py-2.5 font-bold text-base text-white" style={{ background: sideColor }}>
              {title}
            </div>

            {/* Header fields */}
            <div className="pr-11 px-3 py-1.5 text-xs border-b border-black/20">
              <div className="mb-1"><strong>NOME AUDITOR:</strong> {currentEmp?.name || '___________________'}</div>
              <div className="mb-1"><strong>DATA:</strong> {new Date().toLocaleDateString('pt-BR')} &nbsp;&nbsp;&nbsp; <strong>LOCAL:</strong> {machine.name}</div>
              <div><strong>TURNO:</strong> <span className="ml-2">1 ☐ &nbsp;&nbsp; 2 ☐ &nbsp;&nbsp; 3 ☐</span></div>
            </div>

            {/* Column headers */}
            <div className="grid pr-11 font-bold text-[11px] border-b-2 border-black/40 bg-neutral-200" style={{ gridTemplateColumns: '70px 1fr 1fr' }}>
              <div className="p-1.5 border-r border-black/30 text-center">ITEM</div>
              <div className="p-1.5 border-r border-black/30 text-center">PERGUNTAS</div>
              <div className="p-1.5 text-center">EXPLICAÇÃO</div>
            </div>

            {/* Items */}
            {checklist.items.map((item, idx) => (
              <div key={item.id} className="grid border-b border-black/20" style={{ gridTemplateColumns: '70px 1fr 1fr', paddingRight: '2.75rem', minHeight: '80px' }}>
                <div className="border-r border-black/20 flex items-center justify-center font-bold text-[11px] bg-neutral-100">{idx + 1}</div>
                <div className="border-r border-black/20 p-2"><p className="text-xs font-semibold">{item.question}</p></div>
                <div className="p-2"><p className="text-xs text-neutral-600">{item.explanation || '(sem explicação)'}</p></div>
              </div>
            ))}

            {/* Footer */}
            <div className="flex justify-between pr-11 px-3 py-1.5 bg-neutral-200 text-[10px] font-medium">
              <span>{sideLabel}</span>
              <span>FORM PD319.3 (v05)</span>
            </div>
          </div>
        )}

        {/* ====== VERSO ====== */}
        {lpaPage === 'verso' && (
          <div className="border-2 border-foreground/30 rounded-sm overflow-hidden relative max-w-4xl mx-auto bg-white text-black mt-3 mb-3">
            {/* Side label */}
            <div className="absolute right-0 top-0 bottom-0 w-9 flex items-center justify-center font-bold text-xs text-white z-10" style={{ background: sideColor, writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '2px' }}>
              {sideLabel}
            </div>

            {/* Title */}
            <div className="pr-11 text-center py-2 font-bold text-sm text-white" style={{ background: sideColor }}>
              {title}
            </div>

            {/* Header */}
            <div className="pr-11 px-3 py-1 text-xs border-b border-black/20">
              <span><strong>NOME AUDITOR:</strong> {currentEmp?.name || '___________________'}</span>
            </div>

            {/* Column headers */}
            <div className="grid pr-11 font-bold text-[10px] border-b-2 border-black/40 bg-neutral-200" style={{ gridTemplateColumns: '70px 50px 1fr' }}>
              <div className="p-1 border-r border-black/30 text-center">ITEM</div>
              <div className="p-1 border-r border-black/30 text-center">STATUS</div>
              <div className="p-1 text-center">AÇÃO SE REPROVADO / RESPONSÁVEL</div>
            </div>

            {/* Items verso */}
            {checklist.items.map((item, idx) => (
              <div key={`v-${item.id}`} className="grid border-b border-black/20" style={{ gridTemplateColumns: '70px 50px 1fr', paddingRight: '2.75rem' }}>
                {/* Item number */}
                <div className="border-r border-black/20 flex items-center justify-center font-bold text-[10px] bg-neutral-100" style={{ minHeight: '90px' }}>
                  {idx + 1}
                </div>

                {/* Status button */}
                <div className="border-r border-black/20 flex items-center justify-center p-1">
                  <button
                    onClick={() => {
                      const order = ['pending', 'conforme', 'nao_conforme', 'na'];
                      const current = lpaItemStatuses[item.id] || 'pending';
                      const next = order[(order.indexOf(current) + 1) % order.length];
                      setLpaItemStatuses(prev => ({ ...prev, [item.id]: next }));
                    }}
                    className="w-10 h-8 rounded font-bold text-xs border-2 transition-all hover:scale-110"
                    style={{
                      background: statusColor(lpaItemStatuses[item.id] || 'pending').bg,
                      color: statusColor(lpaItemStatuses[item.id] || 'pending').text,
                      borderColor: statusColor(lpaItemStatuses[item.id] || 'pending').bg === '#e5e5e5' ? '#bbb' : statusColor(lpaItemStatuses[item.id] || 'pending').bg
                    }}
                  >
                    {statusColor(lpaItemStatuses[item.id] || 'pending').label}
                  </button>
                </div>

                {/* Actions and Responsible */}
                <div className="p-2 text-[10px] space-y-1">
                  <div className="font-bold">Ação Imediata:</div>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lpaItemActionImmediate[item.id] || false}
                      onChange={e => setLpaItemActionImmediate(prev => ({ ...prev, [item.id]: e.target.checked }))}
                      className="w-3 h-3"
                    />
                    <span>Acionar mestre e instruir colaborador</span>
                  </label>
                  
                  <div className="font-bold mt-2">Escalonar:</div>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lpaItemEscalate[item.id] || false}
                      onChange={e => setLpaItemEscalate(prev => ({ ...prev, [item.id]: e.target.checked }))}
                      className="w-3 h-3"
                    />
                    <span>via SFM</span>
                  </label>

                  <div className="font-bold mt-2">Resp.:</div>
                  <input
                    type="text"
                    value={lpaItemResponsible[item.id] || ''}
                    onChange={e => setLpaItemResponsible(prev => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="____________________"
                    className="w-full border-b border-dashed border-black/40 bg-transparent outline-none text-[10px]"
                  />
                </div>
              </div>
            ))}

            {/* Legend */}
            <div className="pr-11 px-3 py-1 text-[9px] text-neutral-600 border-b border-black/10">
              Utilizar na coluna status: R. (reprovado); A. (aprovado); NA (não aplicável).
            </div>

            {/* Footer */}
            <div className="flex justify-between pr-11 px-3 py-1.5 bg-neutral-200 text-[10px] font-medium">
              <span>{sideLabel}</span>
              <span>FORM PD319.3 (v05)</span>
            </div>
          </div>
        )}

        {/* Bottom - Observations and Actions */}
        {lpaPage === 'verso' && (
          <div className="max-w-4xl mx-auto px-4 py-4 space-y-3 bg-white rounded-sm mt-3 mb-3 border border-black/20">
            <div>
              <label className="text-xs font-semibold text-gray-900 mb-1 block">Observações</label>
              <Textarea
                value={observations}
                onChange={e => setObservations(e.target.value)}
                placeholder="Digite observações se necessário..."
                rows={2}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-900 mb-1 block">Fotos</label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-2 hover:border-blue-500 hover:bg-blue-50 transition-colors">
                <Camera className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-600">Anexar fotos</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} capture="environment" />
              </label>
              {photos.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {photos.map((p, i) => <img key={i} src={p} alt={`Foto ${i + 1}`} className="h-12 w-12 rounded-lg object-cover border border-gray-300" />)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="max-w-4xl mx-auto px-4 flex gap-3">
          {lpaPage === 'verso' && (
            <Button variant="outline" className="flex-1" onClick={() => setLpaPage('frente')}>
              <ChevronLeft className="mr-2 h-4 w-4" />FRENTE
            </Button>
          )}
          
          {lpaPage === 'frente' && (
            <Button variant="outline" className="flex-1" onClick={() => setLpaPage('verso')}>
              VERSO<ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {lpaPage === 'verso' && (
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleLpaSubmit}>
              <Send className="mr-2 h-4 w-4" />Enviar Auditoria
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (stage === 'done') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold">Auditoria Concluída!</h2>
          <p className="text-muted-foreground">Os dados foram salvos com sucesso.</p>
          <Button onClick={reset} size="lg" className="w-full">Nova Auditoria</Button>
        </div>
      </div>
    );
  }

  if (stage === 'checklist' && machine && checklist) {
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const periodInfo = currentEntry ? `Semana ${currentEntry.weekNumber} • ${monthNames[currentEntry.month]}/${currentEntry.year}` : null;

    return (
      <div className="min-h-screen bg-white text-black pb-8">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-black/20">
          <Button variant="ghost" size="sm" onClick={reset} className="m-2"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
        </div>

        {/* Title and Info */}
        <div className="border-b-2 border-black/40 px-4 py-3 bg-blue-50">
          <h2 className="text-lg font-bold text-blue-900">{checklist.name}</h2>
          <p className="text-xs text-gray-700 mt-1">Máquina: {machine.name} ({machine.code})</p>
          {periodInfo && (
            <p className="text-xs font-semibold text-blue-700 mt-1">📅 {periodInfo}</p>
          )}
        </div>

        {/* Items - LPA Style Grid */}
        <div className="space-y-0">
          {checklist.items.map((item, idx) => (
            <div key={item.id} className="border-b border-black/20 px-4 py-4 bg-white hover:bg-slate-50 transition-colors">
              {/* Item number and question */}
              <div className="flex gap-3 mb-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{item.question}</p>
                </div>
              </div>

              {/* Answer section */}
              <div className="ml-9 space-y-2">
                {item.type === 'ok_nok' ? (
                  <div className="flex gap-2">
                    <Button
                      variant={answers[idx]?.conformity === 'ok' ? 'default' : 'outline'}
                      size="sm"
                      className={`flex-1 ${answers[idx]?.conformity === 'ok' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-green-300'}`}
                      onClick={() => updateAnswer(idx, 'conformity', 'ok')}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />OK
                    </Button>
                    <Button
                      variant={answers[idx]?.conformity === 'nok' ? 'default' : 'outline'}
                      size="sm"
                      className={`flex-1 ${answers[idx]?.conformity === 'nok' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-red-300'}`}
                      onClick={() => updateAnswer(idx, 'conformity', 'nok')}
                    >
                      <XCircle className="mr-1 h-4 w-4" />NOK
                    </Button>
                  </div>
                ) : item.type === 'text' ? (
                  <Input
                    placeholder="Digite sua resposta..."
                    value={answers[idx]?.answer || ''}
                    onChange={e => updateAnswer(idx, 'answer', e.target.value)}
                    className="text-sm"
                  />
                ) : (
                  <Input
                    type="number"
                    placeholder="Digite o valor..."
                    value={answers[idx]?.answer || ''}
                    onChange={e => updateAnswer(idx, 'answer', e.target.value)}
                    className="text-sm"
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Observations and Photos */}
        <div className="px-4 py-4 space-y-4 border-t-2 border-black/40">
          <div>
            <label className="text-sm font-semibold text-gray-900 mb-2 block">Observações Adicionais</label>
            <Textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              placeholder="Digite observações se necessário..."
              rows={3}
              className="text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-900 mb-2 block">Fotos</label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors">
              <Camera className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-600">Anexar fotos</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} capture="environment" />
            </label>
            {photos.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {photos.map((p, i) => <img key={i} src={p} alt={`Foto ${i + 1}`} className="h-16 w-16 rounded-lg object-cover border border-gray-300" />)}
              </div>
            )}
          </div>

          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base py-6" onClick={handleSubmit}>
            <Send className="mr-2 h-5 w-5" />Enviar Auditoria
          </Button>
        </div>
      </div>
    );
  }

  // ---- SCAN STAGE — Beautiful like example 3 ----
  return (
    <div className="min-h-[80vh] flex flex-col items-center px-4">
      {/* Header */}
      <div className="w-full max-w-md text-center pt-8 pb-6 space-y-3">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
          <QrCode className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-primary">LPA Mobile</h1>
        <p className="text-sm text-muted-foreground">Modo Auditor</p>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-6 space-y-5">
          <h2 className="text-lg font-bold text-center">Escanear Ativo</h2>
          
          {/* Manual Input */}
          <div className="space-y-3">
            <Input
              placeholder="Digite o código (ex: CFB-001)"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualEntry()}
              className="h-12 text-center"
            />
            <Button className="w-full h-12 text-base" onClick={handleManualEntry}>
              <Search className="mr-2 h-5 w-5" />Buscar Ativo
            </Button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center">
            <div className="flex-1 border-t" />
            <span className="mx-4 text-xs text-muted-foreground bg-card px-2">ou</span>
            <div className="flex-1 border-t" />
          </div>

          {/* Scanner */}
          <div id="qr-reader" ref={scannerRef} className={scanning ? 'block rounded-lg overflow-hidden' : 'hidden'} />
          {!scanning ? (
            <Button variant="outline" className="w-full h-12 text-base" onClick={startScanner}>
              <Camera className="mr-2 h-5 w-5" />Usar Câmera
            </Button>
          ) : (
            <Button variant="outline" className="w-full" onClick={stopScanner}>Parar Scanner</Button>
          )}
        </CardContent>
      </Card>

      {/* Quick Access */}
      {recentMachines.length > 0 && (
        <div className="w-full max-w-md mt-6 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acesso Rápido</p>
          <div className="space-y-2">
            {recentMachines.map(m => (
              <button
                key={m.id}
                onClick={() => loadMachine(m.id)}
                className="w-full flex items-center gap-3 rounded-lg border bg-card p-3 text-left hover:bg-accent/50 transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <QrCode className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.code}-{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.sector}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
