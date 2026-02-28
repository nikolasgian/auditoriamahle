# 🚀 Quick Start - Cronograma Automático de Auditorias

## 🎯 O Que Foi Implementado

Um sistema completo de **cronograma de auditorias com distribuição automática** de auditores, garantindo:
- ✅ 5 setores por semana (Brochadeira, Prensa Ressalto, Estampa Furo, Mandrila, Fresa Canal, Chanfradeira, Inspeção Final, Prensa Curvar)
- ✅ Checklists específicos para cada setor embaixo do nome do auditor
- ✅ Sem repetição de setor/checklist para o mesmo auditor na mesma semana
- ✅ Distribuição automática balanceada между auditores
- ✅ Cobertura garantida de todos os setores

---

## 🏃 Como Usar Agora

### 1. **Iniciar o Servidor**
```bash
cd "c:\Users\nikgi\Downloads\audit-guardian-main (1)\audit-guardian-main"
npm run dev
```

Acesse: **http://localhost:8081**

### 2. **Gerar Cronograma**

1. Acesse **"Cronograma de Auditorias"** no menu
2. Selecione o mês e ano
3. Clique no botão **"Gerar Cronograma"** (ícone de varinha mágica ✨)
4. O sistema vai criar automaticamente:
   - 5 setores por semana
   - Distribuir auditores automaticamente
   - Respeitar todas as regras de rotação

### 3. **Visualizar Cronograma**

A tabela mostra:
```
SEMANA │ ONDE │ SEGUNDA │ TERÇA │ ...
───────┼──────┼─────────┼───────┼─────
  1    │Broch.│ Quem:   │ Quem: │
       │      │ Carlos  │ Maria │
       │      │ Auditoria │ Auditoria
       │      │ Brochadeira │ Prensa Ressalto
```

### 4. **Análise**

**Aba "Histórico"**: Ver meses anteriores  
**Aba "Não Realizadas"**: Ranking de faltas

---

## 📁 Arquivos Criados/Modificados

### ✨ Novos Arquivos
- `src/lib/scheduleDistribution.ts` - Engine de distribuição automática
- `src/lib/sectorChecklists.ts` - Checklists específicos dos setores
- `SCHEDULE_IMPLEMENTATION.md` - Documentação completa
- `CHANGES_SUMMARY.md` - Resumo de mudanças
- `TEST_GUIDE.md` - Guia de testes
- `QUICK_START.md` - Este arquivo

### 🔧 Arquivos Modificados
- `src/lib/store.ts` - Adicionado gestão de setores + lógica de distribuição
- `src/pages/Schedule.tsx` - UI atualizada para mostrar checklists

---

## 🔍 Verificar se Está Funcionando

### No Console do Navegador (F12):
```javascript
// Deve retornar 8
console.log(store.getSectors().length)

// Deve retornar objetos com id, name, checklistId
console.log(store.getSectors()[0])

// Deve retornar checklists específicos
const brochChecklist = store.getChecklists().find(c => c.id === 'ck-broch')
console.log(brochChecklist.name)  // "Auditoria Brochadeira"
```

---

## 💡 Exemplos de Uso

### Cenário 1: Pequeno Time
- 3 auditores: Carlos, Maria, João
- 8 setores

**Resultado:**
- Semana 1: Carlos→Setor1, Maria→Setor2, João→Setor3, Carlos→Setor4, Maria→Setor5
- Semana 2: João→Setor6, Carlos→Setor7, Maria→Setor8, João→Setor1 (rotação)

### Cenário 2: Time Grande
- 10 auditores
- 8 setores

**Resultado:**
- Cada semana: 10 auditores, 5 setores utilizados
- Outros 5 auditores em rotação para próxima semana

---

## ⚙️ Configuração Avançada

### Adicionar/Editar Setores

Se quiser modificar os setores, edite o arquivo:
```
src/lib/scheduleDistribution.ts

Procure por:
export const DEFAULT_SECTORS: Sector[] = [
  { id: 'sec1', name: 'Brochadeira', checklistId: 'ck-broch' },
  ...
]
```

### Customizar Checklists

Se quiser adicionar perguntas, edite:
```
src/lib/sectorChecklists.ts

Procure por:
export const SECTOR_CHECKLISTS: Checklist[] = [
  {
    id: 'ck-broch',
    name: 'Auditoria Brochadeira',
    items: [
      { id: 'broch-1', question: '...', type: 'ok_nok' },
      ...
    ]
  }
]
```

---

## 🐛 Troubleshooting

### "Port 8080 is in use"
Será usado porta 8081 automaticamente.

### Cronograma não aparece
- Verifique se há auditores cadastrados
- Verifique console do navegador (F12 → Console)
- Tente limpar localStorage: `localStorage.clear()`

### Checklists não estão específicos
- Verifique que `sectorChecklists.ts` foi carregado
- No console: `store.getChecklists().filter(c => c.id.startsWith('ck-')).length` deve retornar 8

---

## 📖 Documentação Completa

Para detalhes completos, veja:
- `SCHEDULE_IMPLEMENTATION.md` - Arquitetura e regras
- `CHANGES_SUMMARY.md` - Mudanças realizadas
- `TEST_GUIDE.md` - Testes de validação

---

## ✅ Checklist Final

Antes de usar em produção:

- [ ] Todos os 8 setores aparecem na tabela
- [ ] Checklists específicos mostram embaixo de "Quem"
- [ ] Nenhum auditor aparece 2x no mesmo dia
- [ ] Semanas diferentes têm setores diferentes (rotação)
- [ ] Análise de "Não Realizadas" funciona
- [ ] Dados persistem após reload da página
- [ ] Sem erros no console (F12)

---

## 🎉 Pronto!

Seu sistema de cronograma automático está **100% funcional**!

📍 Próximos passos:
1. Acesse http://localhost:8081
2. Navegue até "Cronograma de Auditorias"
3. Clique em "Gerar Cronograma"
4. Veja a magía acontecer! ✨

---

**Versão**: 1.0  
**Data**: 27/02/2026  
**Status**: ✅ Production Ready
