export const areas = ['Produção', 'Utilidades', 'Expedição', 'Oficina'];
export const people = ['Ana Ribeiro', 'Bruno Lima', 'Camila Rocha', 'Diego Martins'];
export const statuses = ['Aberta', 'Em andamento', 'Concluída'];
export const priorities = ['Alta', 'Média', 'Baixa'];
const storageKey = 'oficina-os-v1';

export function dateInput(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function demoDate(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return dateInput(date);
}

function seed() {
  const entries = [
    [108, 'Esteira transportadora parada', 'Produção', 'Alta', 'Aberta', 'Ana Ribeiro', -1],
    [107, 'Inspeção do compressor principal', 'Utilidades', 'Média', 'Em andamento', 'Bruno Lima', 1],
    [106, 'Portão do galpão travando', 'Expedição', 'Alta', 'Em andamento', 'Camila Rocha', 0],
    [105, 'Troca de iluminação da bancada', 'Oficina', 'Baixa', 'Aberta', 'Diego Martins', 4],
    [104, 'Vazamento no circuito hidráulico', 'Produção', 'Alta', 'Aberta', 'Ana Ribeiro', 2],
    [103, 'Calibração do painel elétrico', 'Utilidades', 'Média', 'Concluída', 'Bruno Lima', -2],
    [102, 'Revisão da empilhadeira', 'Expedição', 'Média', 'Concluída', 'Camila Rocha', -3],
    [101, 'Limpeza do filtro de ventilação', 'Oficina', 'Baixa', 'Concluída', 'Diego Martins', -4]
  ];
  return entries.map(([number, title, area, priority, status, assignee, offset]) => ({
    number, title, area, priority, status, assignee, due: demoDate(offset),
    description: 'Ordem fictícia para demonstrar o acompanhamento das atividades de manutenção.',
    history: [
      { at: new Date(Date.now() - 86400000 * 5).toISOString(), text: 'Ordem aberta para avaliação.' },
      ...(status === 'Concluída' ? [{ at: new Date(Date.now() - 86400000).toISOString(), text: 'Serviço concluído e equipamento liberado.' }] : [])
    ]
  }));
}

export function readOrders() {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every(order => Number.isInteger(order.number) && Array.isArray(order.history))) return parsed;
    }
  } catch {}
  return seed();
}

export function persist(orders) {
  localStorage.setItem(storageKey, JSON.stringify(orders));
}

export function overdue(order) {
  return order.status !== 'Concluída' && order.due < dateInput(new Date());
}

export function saveOrder(orders, values, original) {
  const title = values.title.trim();
  const description = values.description.trim();
  const note = values.note.trim();
  if (!title || !description) throw new Error('Preencha o título e a descrição.');
  if (!areas.includes(values.area) || !priorities.includes(values.priority) || !statuses.includes(values.status)) throw new Error('Confira a área, a prioridade e a situação.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.due)) throw new Error('Informe uma data de prazo.');
  const changes = original && original.status !== values.status ? `Situação alterada para ${values.status.toLowerCase()}.` : '';
  if (values.status === 'Concluída' && original?.status !== 'Concluída' && !note) throw new Error('Descreva o serviço realizado antes de concluir.');
  const at = new Date().toISOString();
  const history = original ? [...original.history] : [{ at, text: 'Ordem registrada.' }];
  if (original) history.push({ at, text: changes || 'Dados da ordem revisados.' });
  if (note) history.push({ at, text: note });
  const order = {
    number: original?.number ?? Math.max(100, ...orders.map(item => item.number)) + 1,
    title, description, area: values.area, assignee: values.assignee, due: values.due,
    priority: values.priority, status: values.status, history
  };
  return original ? orders.map(item => item.number === original.number ? order : item) : [order, ...orders];
}
