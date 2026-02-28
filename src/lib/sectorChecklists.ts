// Sector-specific checklists

import { Checklist } from './store';

export const SECTOR_CHECKLISTS: Checklist[] = [
  {
    id: 'ck-broch',
    name: 'Auditoria Brochadeira',
    category: 'Processo',
    createdAt: '2024-01-10',
    items: [
      { id: 'broch-1', question: 'Proteções de segurança instaladas?', type: 'ok_nok' },
      { id: 'broch-2', question: 'Fluido de corte adequado?', type: 'ok_nok' },
      { id: 'broch-3', question: 'Tolerância dimensional conforme?', type: 'ok_nok' },
      { id: 'broch-4', question: 'Máquina sem ruídos anormais?', type: 'ok_nok' },
      { id: 'broch-5', question: 'Observações', type: 'text' },
    ]
  },
  {
    id: 'ck-prensa',
    name: 'Auditoria Prensa Ressalto',
    category: 'Processo',
    createdAt: '2024-01-10',
    items: [
      { id: 'prensa-1', question: 'Pressão hidráulica correta?', type: 'ok_nok' },
      { id: 'prensa-2', question: 'Cilindros funcionando?', type: 'ok_nok' },
      { id: 'prensa-3', question: 'Peças conformes?', type: 'ok_nok' },
      { id: 'prensa-4', question: 'Sensores operacionais?', type: 'ok_nok' },
      { id: 'prensa-5', question: 'Observações', type: 'text' },
    ]
  },
  {
    id: 'ck-estampa',
    name: 'Auditoria Estampa Furo',
    category: 'Processo',
    createdAt: '2024-01-10',
    items: [
      { id: 'estampa-1', question: 'Localização dos furos exata?', type: 'ok_nok' },
      { id: 'estampa-2', question: 'Rebarbas dentro do limite?', type: 'ok_nok' },
      { id: 'estampa-3', question: 'Diâmetro conforme especificação?', type: 'ok_nok' },
      { id: 'estampa-4', question: 'Ferramenta sem desgaste excessivo?', type: 'ok_nok' },
      { id: 'estampa-5', question: 'Observações', type: 'text' },
    ]
  },
  {
    id: 'ck-mandrila',
    name: 'Auditoria Mandrila',
    category: 'Processo',
    createdAt: '2024-01-10',
    items: [
      { id: 'mandrila-1', question: 'Mandril centrado corretamente?', type: 'ok_nok' },
      { id: 'mandrila-2', question: 'Força de aperto uniforme?', type: 'ok_nok' },
      { id: 'mandrila-3', question: 'Peça sem defeitos no acabamento?', type: 'ok_nok' },
      { id: 'mandrila-4', question: 'Máquina bem lubrificada?', type: 'ok_nok' },
      { id: 'mandrila-5', question: 'Observações', type: 'text' },
    ]
  },
  {
    id: 'ck-fresa',
    name: 'Auditoria Fresa Canal',
    category: 'Processo',
    createdAt: '2024-01-10',
    items: [
      { id: 'fresa-1', question: 'Profundidade do canal correta?', type: 'ok_nok' },
      { id: 'fresa-2', question: 'Largura do canal dentro da tolerância?', type: 'ok_nok' },
      { id: 'fresa-3', question: 'Fresa sem desgaste visível?', type: 'ok_nok' },
      { id: 'fresa-4', question: 'RPM adequado?', type: 'ok_nok' },
      { id: 'fresa-5', question: 'Observações', type: 'text' },
    ]
  },
  {
    id: 'ck-chanfra',
    name: 'Auditoria Chanfradeira',
    category: 'Processo',
    createdAt: '2024-01-10',
    items: [
      { id: 'chanfra-1', question: 'Ângulo do chanfro conforme?', type: 'ok_nok' },
      { id: 'chanfra-2', question: 'Profundidade uniforme?', type: 'ok_nok' },
      { id: 'chanfra-3', question: 'Sem rebarbas ou defeitos?', type: 'ok_nok' },
      { id: 'chanfra-4', question: 'Ferramenta em bom estado?', type: 'ok_nok' },
      { id: 'chanfra-5', question: 'Observações', type: 'text' },
    ]
  },
  {
    id: 'ck-inspecao',
    name: 'Auditoria Inspeção Final',
    category: 'Qualidade',
    createdAt: '2024-01-10',
    items: [
      { id: 'inspecao-1', question: 'Dimensional conforme desenho?', type: 'ok_nok' },
      { id: 'inspecao-2', question: 'Acabamento superficial ok?', type: 'ok_nok' },
      { id: 'inspecao-3', question: 'Sem defeitos monitorados?', type: 'ok_nok' },
      { id: 'inspecao-4', question: 'Rótulo/Rastreabilidade ok?', type: 'ok_nok' },
      { id: 'inspecao-5', question: 'Observações', type: 'text' },
    ]
  },
  {
    id: 'ck-curvar',
    name: 'Auditoria Prensa Curvar',
    category: 'Processo',
    createdAt: '2024-01-10',
    items: [
      { id: 'curvar-1', question: 'Ângulo de curvatura correto?', type: 'ok_nok' },
      { id: 'curvar-2', question: 'Força de curvatura adequada?', type: 'ok_nok' },
      { id: 'curvar-3', question: 'Peça sem trincas ou defeitos?', type: 'ok_nok' },
      { id: 'curvar-4', question: 'Matriz/Punção em bom estado?', type: 'ok_nok' },
      { id: 'curvar-5', question: 'Observações', type: 'text' },
    ]
  },
];
