# Cronograma de Auditorias com Distribuição Automática

## 🎯 Objetivo

Implementar um sistema inteligente de cronograma de auditorias com distribuição automática e rotação de auditores, garantindo rotatividade, imparcialidade e cobertura completa dos setores.

## ✅ Mudanças Implementadas

### 1. **Estrutura de Dados - Setores**

Substituição do modelo de "máquinas" por "setores" específicos:

- **Brochadeira**
- **Prensa Ressalto**
- **Estampa Furo**
- **Mandrila**
- **Fresa Canal**
- **Chanfradeira**
- **Inspeção Final**
- **Prensa Curvar**

Cada setor tem um checklist específico e dedicado.

### 2. **Arquivos Criados**

#### `src/lib/scheduleDistribution.ts`
Engine de distribuição de auditorias com regras inteligentes:
- **Classe `AuditDistributor`**: Controla a rotação de auditores
- **Algoritmo de distribuição**: 
  - Um auditor não pode auditar o mesmo setor 2x na mesma semana
  - Um auditor não pode usar o mesmo checklist 2x na mesma semana
  - Prioriza setores não auditados recentemente
  - Distribui evenly entre auditores
  - Garante cobertura de todos os setores

#### `src/lib/sectorChecklists.ts`
Checklists específicos para cada setor:
- Brochadeira
- Prensa Ressalto
- Estampa Furo
- Mandrila
- Fresa Canal
- Chanfradeira
- Inspeção Final
- Prensa Curvar

Cada checklist com 5 itens específicos + campo de observações.

### 3. **Atualizar `src/lib/store.ts`**

Adicionadas funções para gerenciar setores:
```typescript
// Funções novas
getSectors(): Sector[]
saveSectors(data: Sector[]): void
addSector(s: Omit<Sector, 'id'>): Sector
updateSector(id: string, s: Partial<Sector>): void
deleteSector(id: string): void
```

**Nova lógica de geração de cronograma:**
- Usa `AuditDistributor` para distribuição automática
- Cria 5 setores por semana
- Alterna os setores a cada semana (ciclo de 8 setores)
- Distribui auditores automaticamente sem repetição no mesmo ciclo

**Semana global e numeração contínua**

O campo `weekNumber` nas entradas de cronograma deixou de ser apenas a
semana dentro do mês (1‑5) e agora representa uma sequência contínua ao longo
do ano. Ao gerar um cronograma para um mês, o sistema calcula quantas
"semanas" cada mês anterior já consumiu e atribui rótulos sequenciais.

- Janeiro sempre começa em `1` e costuma terminar em `5`.
- Fevereiro inicia imediatamente após o último número de janeiro (por exemplo
  `6` se janeiro teve cinco semanas).
- Março segue fevereiro, e assim por diante.

É possível sobrescrever manualmente o valor inicial para um mês usando o
parâmetro opcional `firstWeekNumber` (informado pela UI como **Primeira
Semana**). Esse procedimento é útil ao importar ou alinhar cronogramas de
anos anteriores.

Os helpers expostos auxiliam na verificação e exibição dessas sequências:

```ts
store.countWeeksInMonth(year, month)           // quantas semanas o mês possui
store.getGlobalWeekNumbersForMonth(month, year, /*override?*/)
```
### 4. **Atualizar `src/pages/Schedule.tsx`**

Adaptações para trabalhar com setores:

**Mudanças:**
- ✅ Mudança de `machines` para `sectors`
- ✅ Função `groupByWeekSector` em vez de `groupByWeekMachine`
- ✅ Renderização mostra **nome do checklist embaixo de "Quem"**
- ✅ Análise de setores perdidos (em vez de máquinas)
- ✅ Interface atual mostra:
  ```
  Quem: [Nome do Auditor]
  [Nome do Checklist]
  Status: [Status da Auditoria]
  ```

## 📊 Cronograma - Distribuição de Setores

### Por semana (5 setores a cada semana):

```
Semana 1: Setores 1, 2, 3, 4, 5
Semana 2: Setores 6, 7, 8, 1, 2  (ciclo continua)
Semana 3: Setores 3, 4, 5, 6, 7
Semana 4: Setores 8, 1, 2, 3, 4
...
```

### Por dia:

```
Segunda:  Setor 1
Terça:    Setor 2
Quarta:   Setor 3
Quinta:   Setor 4
Sexta:    Setor 5
```

## 🔁 Regras de Distribuição de Auditores

### ✅ 1. Rotação Obrigatória

- **Mesma semana**: Um auditor não pode auditar o mesmo setor 2x
- **Mesma semana**: Um auditor não pode usar o mesmo checklist 2x
- **Prioridade**: Setores não auditados recentemente vão primeiro

### ✅ 2. Cobertura Total

- **Garantido**: Todos os setores são auditados cada semana
- **Balance**: Distribuição equilibrada entre auditores
- **Contingência**: Se necessário, permite repetição (quando houver poucos auditores)

### ✅ 3. Novo Ciclo

- **Reset**: A distribuição reinicia a cada mês
- **Histórico**: Sistema mantém registro de auditorias
- **Preferência**: Localidades não auditadas há mais tempo recebem prioridade

### ✅ 4. Exceções

- Permite repetição quando não há outro auditor disponível
- Suporta auditorias extraordinárias
- Administrador pode autorizar exceções

## 📋 Formato da Tabela (Cronograma)

```
┌──────┬────────────┬──────────┬───────┬──────┬─────┬───────────┐
│SEMANA│    ONDE    │SEGUNDA   │TERÇA  │QUARTA│QUINTA│SEXTA...  │
├──────┼────────────┼──────────┼───────┼──────┼─────┼───────────┤
│  1   │Brochadeira │ Quem:    │Quem:  │Quem: │...  │...        │
│      │            │ [Audit.] │[Audit]│[Aud.]│     │           │
│      │            │          │       │      │     │           │
│      │Prensa Rest.│ Quem:    │Quem:  │Quem: │...  │...        │
│      │            │ [Audit.] │[Audit]│[Aud.]│     │           │
│      │            │          │       │      │     │           │
└──────┴────────────┴──────────┴───────┴──────┴─────┴───────────┘
```

Embaixo de cada "Quem" aparece o nome do checklist a ser realizado.

## 🚀 Como Usar

### Gerar Cronograma Automaticamente

1. Acesse a página "Cronograma de Auditorias"
2. Selecione o mês e ano desejados
3. Clique em "Gerar Cronograma"
4. O sistema vai:
   - Criais entradas para 5 setores por semana
   - Distribuir auditores automaticamente
   - Respeitar todas as regras de rotação
   - Exibir na tabela formatada

### Visualizar Histórico

- Mude para a aba "Histórico"
- Veja cronogramas de meses anteriores
- Veja status de cada auditoria (Conforme, Não Conforme, Não Realizada)

### Analisar Não Realizadas

- Acesse a aba "Não Realizadas"
- Veja rank de auditores com mais faltas
- Veja rank de setores mais afetados
- Veja lista completa

## 🛠️ Arquitetura

```
┌─────────────────────────────────────────────────┐
│         Schedule.tsx (UI Component)              │
│  - Exibe cronograma em tabela                    │
│  - Gerencia UI/UX                                │
│  - Chama funções do store                        │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
     ┌─────────────────────────────┐
     │      store.ts (Data Layer)  │
     │  - getSectors()             │
     │  - generateSchedule()       │
     │  - getChecklists()          │
     │  - getEmployees()           │
     └────────────┬────────────────┘
                  │
                  ▼
      ┌──────────────────────────────────────┐
      │ scheduleDistribution.ts (Logic)      │
      │ AuditDistributor class               │
      │  - distributeForWeek()               │
      │  - getWeekSectors()                  │
      │  - Rotation rules enforcement        │
      └──────────────────────────────────────┘
                  │
                  ▼
      ┌──────────────────────────────────────┐
      │ sectorChecklists.ts (Data)           │
      │ - SECTOR_CHECKLISTS array            │
      │ - Specific questions for each sector │
      └──────────────────────────────────────┘
```

## 📝 Exemplo de Execução

### Entrada
- 8 setores diferentes
- 5 auditores disponíveis
- Gerando cronograma para Fevereiro

### Saída (Semana 1)
```
Semana 1:
- Brochadeira (Segunda):    Carlos Silva - Auditoria Brochadeira
- Prensa Ressalto (Terça):  Maria Santos - Auditoria Prensa Ressalto
- Estampa Furo (Quarta):    João Oliveira - Auditoria Estampa Furo
- Mandrila (Quinta):        Ana Costa - Auditoria Mandrila
- Fresa Canal (Sexta):      Pedro Lima - Auditoria Fresa Canal
```

### Saída (Semana 2 - rotação automática)
```
Semana 2:
- Chanfradeira (Segunda):    Fernanda Rocha - Auditoria Chanfradeira
- Inspeção Final (Terça):    Roberto Mendes - Auditoria Inspeção Final
- Prensa Curvar (Quarta):    Lucia Ferreira - Auditoria Prensa Curvar
- Brochadeira (Quinta):      Maria Santos - Auditoria Brochadeira
- Prensa Ressalto (Sexta):   João Oliveira - Auditoria Prensa Ressalto
```

**Note:** Cada auditor recebeu um setor novo (exceto alguns na semana 2 pois já completaram a primeira rotação).

## ✨ Benefícios

✅ **Automação**: Não precisa fazer distribuição manualmente  
✅ **Justiça**: Todos os auditores recebem carga equilibrada  
✅ **Cobertura**: Todos os setores são auditados regularmente  
✅ **Rastreabilidade**: Histórico completo de todas as auditorias  
✅ **Rotação**: Evita viés do mesmo auditor no mesmo setor  
✅ **Flexibilidade**: Permite exceções quando necessário  

## 🔧 Próximos Passos (Futuro)

- [ ] Suporte a semanas 1-53 do ano (ISO week)
- [ ] Dashboard de performance de auditores
- [ ] Notificações de auditorias próximas
- [ ] Export para PDF do cronograma
- [ ] Sincronização com calendário externo
- [ ] Suporte a auditorias extraordinárias
- [ ] Machine Learning para otimizar distribuição
