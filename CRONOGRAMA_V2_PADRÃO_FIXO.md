# Cronograma de Auditoria Escalonada v2.0 - Padrão Fixo

## ✅ RESUMO EXECUTIVO

Sistema de geração de cronograma com **padrão FIXO de setores** que se repete a cada 4 semanas, com **auditores rotacionando** entre posições e **checklists balanceados** sem repetição semanal.

**Mudança v2.0**: De Round-Robin contínuo (40 entradas × 8 setores) → **Padrão Fixo** (25 entradas × 5 setores)

---

## 📋 PADRÃO FIXO DE SETORES

### Ciclo de 4 Semanas (repete todo mês)

```
SEMANA 1: Brochadeira, Chanfradeira, Prensa Ressalto, Inspeção Final, Estampa Furo
SEMANA 2: Prensa Curvar, Mandrila, Fresa Canal, Brochadeira, Chanfradeira
SEMANA 3: Prensa Ressalto, Inspeção Final, Estampa Furo, Prensa Curvar, Mandrila
SEMANA 4: Fresa Canal, Brochadeira, Chanfradeira, Prensa Ressalto, Inspeção Final
SEMANA 5: (se existir) Rotação lógica evitando repetição exata de Semana 4
```

### Índices em DEFAULT_SECTORS

```
Index: 0=Brochadeira, 1=Prensa Ressalto, 2=Estampa Furo, 3=Mandrila, 
       4=Fresa Canal, 5=Chanfradeira, 6=Inspeção Final, 7=Prensa Curvar

Padrões:
  Semana 1: [0, 5, 1, 6, 2]
  Semana 2: [7, 3, 4, 0, 5]
  Semana 3: [1, 6, 2, 7, 3]
  Semana 4: [4, 0, 5, 1, 6]
```

---

## 🔄 ALGORITMO DE DISTRIBUIÇÃO

### 1. Para cada semana, obter 5 setores (pelo padrão fixo)

```typescript
getSectorsForWeek(weekNumber): 
  if weekNumber === 5:
    return getWeek5Sectors() // rotação inteligente
  else:
    return SECTOR_PATTERNS[(weekNumber - 1) % 4]
```

### 2. Para cada setor, gerar 5 entradas (um auditor por dia)

```typescript
Para i=1 a 5 (dias Seg-Sex):
  auditor = getNextAuditor(diaNum)      // rodízio por dia
  checklist = getNextChecklist(auditor) // rodízio sem repetir por auditor/semana
  criar ScheduleEntry(setor, dia, auditor, checklist)
```

### 3. Checklists (8 tipos obrigatórios)

Não podem repetir para o mesmo auditor na mesma semana:
- Qualidade
- Processo
- Produção
- Segurança
- 5S
- Setup
- Manutenção
- Documentações

---

## 📁 MUDANÇAS IMPLEMENTADAS

### ✅ `src/lib/scheduleDistribution.ts` (REESCRITO v2.0)

```typescript
// Novo: Padrão fixo 4-ciclo
const SECTOR_PATTERNS: Record<number, number[]> = {
  0: [0, 5, 1, 6, 2],
  1: [7, 3, 4, 0, 5],
  2: [1, 6, 2, 7, 3],
  3: [4, 0, 5, 1, 6],
};

export class AuditDistributor {
  distributeForWeek(weekNumber, year): AuditAssignment[]
    // Retorna 25 assignments (5 setores × 5 dias)
    
  private getSectorsForWeek(weekNumber): Sector[]
    // Usa padrão fixo + semana 5 customizada
    
  private getWeek5Sectors(): number[]
    // Rotação lógica evitando repetição exata de Semana 4
    
  private getNextAuditor(dayNumber): Employee
    // Rodízio: não repete no mesmo dia
    
  private getNextChecklist(auditorId): Checklist
    // Rodízio: não repete mesma semana por auditor
}
```

**Principais mudanças**:
- ✅ Substituiu Round-Robin global por padrão fixo
- ✅ 25 assignments por semana (não 40)
- ✅ Tracking de auditor **por dia** (não por setor)
- ✅ Tracking de checklist **por auditor/semana** (novo)
- ✅ Semana 5 inteligente com rotating logic

### ✅ `src/lib/store.ts` (AUTO-CRIAÇÃO DE CHECKLISTS)

```typescript
// Novo: auto-criar 8 checklists obrigatórios se faltarem
function ensureMandatoryChecklists(existing: Checklist[]): Checklist[]

generateSchedule: (month, year) => {
  // Chama ensureMandatoryChecklists primeiro
  // Cria 25 ScheduleEntry por semana
}
```

### ✅ `src/test/schedule-generation.test.ts` (NOVO)

```
✓ should generate 25 assignments per week (5 sectors × 5 days)
✓ should have 5 sectors for week 1 (fixed pattern)
✓ should have all 5 days for each sector in week 1
✓ should have different sectors for week 2 (fixed pattern)
✓ should distribute checklists without repetition per auditor per week

Resultado: 5/5 passing ✅
```

---

## ✨ VALIDAÇÃO DE REQUISITOS

| Requisito | Status | Detalhe |
|-----------|--------|---------|
| Padrão fixo 4-ciclo | ✅ | SECTOR_PATTERNS com índices |
| 5 setores por semana | ✅ | Não 8, apenas os selecionados |
| 25 entradas por semana | ✅ | 5 setores × 5 dias |
| Semana 5 customizada | ✅ | getWeek5Sectors() com lógica |
| Auditores balanceados | ✅ | getNextAuditor() rodízio por dia |
| Checklists sem repetição | ✅ | getNextChecklist() por auditor |
| 8 tipos obrigatórios | ✅ | ensureMandatoryChecklists() |
| Auto-criar se faltam | ✅ | Na primeira geração |
| Mock auditores | ✅ | 8 nomes se sem registros |
| Layout tabela (5 linhas) | ✅ | Renderiza 5 setores/semana |

---

## 🚀 USO PRÁTICO

### Gerar Cronograma

```
UI → Schedule → Selecione Mês/Ano → [Gerar Cronograma do Mês]
```

**Automático**:
- ✅ Detecta semanas do mês (1-4 ou 1-5)
- ✅ Aplica padrão fixo
- ✅ Se semana 5: calcula setores com rotação inteligente
- ✅ Auto-cria 8 checklists obrigatórios
- ✅ Distribui 25 auditores/checklist sem conflitos
- ✅ Persiste em localStorage
- ✅ Exibe em tabela

### Exemplo: Semana 1 de Janeiro

```
SEMANA | ONDE              | SEG      | TER      | QUA      | QUI      | SEX      
1      | Brochadeira       | Diego    | Rafael   | Marlon   | Carlos   | Aurélio
       |                   | Qualid.  | Processo | Produç.  | Seg.     | 5S
1      | Chanfradeira      | Samuel   | Ronaldo  | Mateus   | Diego    | Rafael
       |                   | Manutenç | Qualid.  | Processo | Produç.  | Seg.
... (3 setores mais)
```

---

## 🧪 TESTES & BUILD

```bash
# Testes
npm test -- schedule-generation
# Resultado: 5/5 passing ✅

# Build
npm run build
# Status: ✅ 20.84s, 4174 modules, 0 errors

# Dev
npm run dev
# URL: http://localhost:8081
```

---

## 📊 DIFERENÇAS V1 → V2

| Aspecto | v1.0 (Round-Robin) | v2.0 (Padrão Fixo) |
|---------|-------------------|-------------------|
| Setores/semana | 8 (todos) | 5 (selecionados) |
| Entradas/semana | 40 | 25 |
| Padrão | Random com offset | Fixo 4-ciclo |
| Semana 5 | Offset=4 | Rotação lógica |
| Auditores tracking | Global (weekOffset) | Por dia |
| Checklists | 4 tipos | 8 tipos obrigatórios |

---

## ✅ STATUS FINAL

- ✅ Padrão fixo implementado e testado
- ✅ 25 entradas por semana (5 × 5)
- ✅ Auditores rodam sem desequilíbrio
- ✅ Checklists balanceados sem repetição
- ✅ Semana 5 inteligente
- ✅ 8 checklists auto-criados
- ✅ 5 testes passando
- ✅ Build sem erros
- ✅ Pronto para produção

**Versão**: 2.0  
**Status**: COMPLETO
