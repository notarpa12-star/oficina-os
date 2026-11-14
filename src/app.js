import { icon } from './icons.js';
import { areas, people, statuses, priorities, dateInput, overdue, readOrders, persist, saveOrder } from './store.js';
import { mountMap } from './map.js';

const pages = {
  painel: ['Visão geral', 'Acompanhe as ordens de serviço e a situação de cada área.'],
  ordens: ['Ordens de serviço', 'Pesquise ocorrências, responsáveis e prazos.'],
  quadro: ['Quadro de trabalho', 'Acompanhe a execução das ordens por situação.'],
  mapa: ['Mapa 3D', 'Explore as áreas e acompanhe as ordens em cada setor.']
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const view = document.querySelector('#view');
const dialog = document.querySelector('#order-dialog');
const toast = document.querySelector('#toast');
let orders = readOrders();
let angle = 37;
let activeArea = areas[0];
let filters = { query: '', status: '', area: '', priority: '', late: false };
let cleanupMap;
let toastTimer;
let editing;
let lastTrigger;

document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
const page = () => Object.hasOwn(pages,location.hash.slice(1)) ? location.hash.slice(1) : 'painel';
const id = order => 'OS-' + String(order.number).padStart(4,'0');
const when = value => new Intl.DateTimeFormat('pt-BR').format(new Date(value+'T12:00:00'));
const statusTone = status => ({'Aberta':'amber','Em andamento':'blue','Concluída':'green'}[status]);
const priorityTone = priority => ({'Alta':'red','Média':'amber','Baixa':'muted'}[priority]);
const badge = (label,tone) => `<span class="badge ${tone || 'muted'}"><i></i>${esc(label)}</span>`;
const button = (action,label,glyph,attrs='') => `<button class="secondary" data-action="${action}" ${attrs}>${glyph ? icon(glyph) : ''}${label}</button>`;
const options = (list,selected) => list.map(value=>`<option${value===selected?' selected':''}>${esc(value)}</option>`).join('');

function notify(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(()=>toast.hidden=true,3600);
}

function table(items) {
  if (!items.length) return '<div class="empty">Nenhuma ordem encontrada.</div>';
  return `<div class="table-scroll"><table><thead><tr><th>Ordem de serviço</th><th>Área</th><th>Prioridade</th><th>Situação</th><th>Prazo</th></tr></thead><tbody>${items.map(o=>`<tr><td><button class="order-link" data-action="open" data-id="${o.number}"><strong>${esc(o.title)}</strong><small>${id(o)} · ${esc(o.assignee || 'Sem responsável')}</small></button></td><td>${esc(o.area)}</td><td>${badge(o.priority,priorityTone(o.priority))}</td><td>${badge(o.status,statusTone(o.status))}</td><td class="${overdue(o)?'late':''}">${when(o.due)}</td></tr>`).join('')}</tbody></table></div>`;
}

function metrics() {
  const values = [
    ['Ordens abertas',orders.filter(o=>o.status==='Aberta').length,'clipboard','lime','Aberta'],
    ['Em andamento',orders.filter(o=>o.status==='Em andamento').length,'activity','blue','Em andamento'],
    ['Fora do prazo',orders.filter(overdue).length,'alert','red','late'],
    ['Concluídas',orders.filter(o=>o.status==='Concluída').length,'check','green','Concluída']
  ];
  return `<div class="metrics">${values.map(([label,value,glyph,tone,filter])=>`<button data-action="metric" data-filter="${filter}" class="metric"><span class="metric-top"><span class="metric-icon ${tone}">${icon(glyph)}</span><span class="metric-arrow">${icon('arrow')}</span></span><strong>${value}</strong><span>${label}</span></button>`).join('')}</div>`;
}

function mapPanel() {
  return `<section class="panel map-panel"><div class="panel-head"><div><h2>Mapa de áreas</h2><p>Ordens em aberto por setor</p></div><div class="map-controls"><button class="icon-button" data-action="rotate-left" aria-label="Girar mapa à esquerda">${icon('left')}</button><button class="icon-button" data-action="reset-map" aria-label="Restaurar ângulo do mapa">${icon('reset')}</button><button class="icon-button" data-action="rotate-right" aria-label="Girar mapa à direita">${icon('right')}</button></div></div><div class="map-stage"><canvas id="floor-plan" aria-label="Maquete 3D das áreas de manutenção"></canvas><span class="map-key"><i></i> Ordens ativas</span></div><div class="area-options" aria-label="Áreas do mapa">${areas.map((area,i)=>`<button class="area-option" data-action="area" data-area="${esc(area)}" aria-pressed="${area===activeArea}"><i class="area-color area-${i}"></i>${esc(area)}</button>`).join('')}</div></section>`;
}

function areaPanel() {
  const items = orders.filter(o=>o.area===activeArea && o.status!=='Concluída');
  return `<section class="panel area-panel"><div class="panel-head"><div><h2>${esc(activeArea)}</h2><p>${items.length} ordem(ns) ativa(s)</p></div><span class="metric-icon lime">${icon('pin')}</span></div><div class="area-orders">${items.length?items.map(o=>`<button data-action="open" data-id="${o.number}" class="area-order"><span class="area-order-title"><small>${id(o)}</small><strong>${esc(o.title)}</strong></span>${badge(o.priority,priorityTone(o.priority))}</button>`).join(''):'<div class="empty">Nenhuma ordem ativa nesta área.</div>'}</div><button class="text-button" data-action="area-orders">Ver ordens da área ${icon('arrow')}</button></section>`;
}

function filterResults() {
  const query = filters.query.trim().toLocaleLowerCase('pt-BR');
  const items = orders.filter(o=>(!query || [id(o),o.title,o.description,o.assignee,o.area].join(' ').toLocaleLowerCase('pt-BR').includes(query)) && (!filters.status || o.status===filters.status) && (!filters.area || o.area===filters.area) && (!filters.priority || o.priority===filters.priority) && (!filters.late || overdue(o)));
  document.querySelector('#results').innerHTML = table(items);
  document.querySelector('#result-count').textContent = `${items.length} ordem(ns)`;
  return items;
}

function ordersPanel() {
  return `<section class="panel"><div class="filter-bar"><label class="search-field">${icon('search')}<input aria-label="Buscar ordem" name="query" placeholder="Buscar por ordem ou responsável" value="${esc(filters.query)}"></label><label><span>Situação</span><select name="status"><option value="">Todas</option>${options(statuses,filters.status)}</select></label><label><span>Área</span><select name="area"><option value="">Todas</option>${options(areas,filters.area)}</select></label><label><span>Prioridade</span><select name="priority"><option value="">Todas</option>${options(priorities,filters.priority)}</select></label><label class="check-filter"><input type="checkbox" name="late"${filters.late?' checked':''}> Atrasadas</label></div><div class="list-head"><span id="result-count"></span>${button('export','Exportar CSV','download')}</div><div id="results"></div></section>`;
}

function render() {
  cleanupMap?.();
  const key = page();
  const [title,description] = pages[key];
  document.querySelector('#breadcrumb').textContent = title;
  document.querySelector('#page-title').textContent = title;
  document.querySelector('#page-description').textContent = description;
  document.querySelectorAll('[data-page]').forEach(a=>a.dataset.page===key?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
  if (key === 'painel' || key === 'mapa') {
    view.innerHTML = `${key==='painel'?metrics():''}<div class="overview-grid">${mapPanel()}${areaPanel()}</div>${key==='painel'?`<section class="panel recent"><div class="panel-head"><div><h2>Ordens recentes</h2><p>Últimos registros da operação</p></div>${button('all','Ver todas','arrow')}</div>${table(orders.slice(0,5))}</section>`:''}`;
    cleanupMap = mountMap(document.querySelector('#floor-plan'),angle,activeArea,orders,selectArea);
  } else if (key === 'ordens') {
    view.innerHTML = ordersPanel();
    filterResults();
  } else {
    view.innerHTML = `<div class="board">${statuses.map(status=>{const items=orders.filter(o=>o.status===status);return `<section class="board-column"><h2>${badge(status,statusTone(status))} <span>${items.length}</span></h2>${items.map(o=>`<button class="board-card" data-action="open" data-id="${o.number}"><small>${id(o)} · ${esc(o.area)}</small><strong>${esc(o.title)}</strong><span>${badge(o.priority,priorityTone(o.priority))}<small>${esc(o.assignee||'Sem responsável')}</small></span></button>`).join('')||'<div class="empty">Sem ordens nesta situação.</div>'}</section>`;}).join('')}</div>`;
  }
}

function selectArea(area) {
  activeArea = area;
  render();
}

function goOrders(next = {}, focus = false) {
  filters = { query:'',status:'',area:'',priority:'',late:false,...next };
  if (page() !== 'ordens') location.hash = 'ordens';
  else render();
  if (focus) requestAnimationFrame(()=>requestAnimationFrame(()=>view.querySelector('[name=query]')?.focus()));
}

function openOrder(order, trigger) {
  editing = order;
  lastTrigger = trigger;
  const o = order || {title:'',description:'',area:activeArea,assignee:'',priority:'Média',status:'Aberta',due:dateInput(new Date())};
  document.querySelector('#dialog-content').innerHTML = `<div class="dialog-head"><div><small>${order?id(order):'MANUTENÇÃO'}</small><h2 id="dialog-title">${order?'Editar ordem':'Nova ordem de serviço'}</h2></div><button class="icon-button" data-action="close" aria-label="Fechar">${icon('close')}</button></div><form id="order-form"><label>Título<input name="title" value="${esc(o.title)}" required maxlength="110" autofocus></label><label>Descrição<textarea name="description" required maxlength="1200" rows="3">${esc(o.description)}</textarea></label><div class="form-grid"><label>Área<select name="area">${options(areas,o.area)}</select></label><label>Responsável<select name="assignee"><option value="">Sem responsável</option>${options(people,o.assignee)}</select></label><label>Prioridade<select name="priority">${options(priorities,o.priority)}</select></label><label>Situação<select name="status">${options(statuses,o.status)}</select></label><label>Prazo<input type="date" name="due" required value="${esc(o.due)}"></label></div><label>O que foi feito<textarea name="note" maxlength="1200" rows="2" placeholder="Acrescente uma nota ao histórico"></textarea></label><p id="form-error" role="alert"></p><div class="dialog-actions">${button('close','Cancelar',null,'type="button"')}<button class="primary" type="submit">Salvar ordem</button></div></form>${order?`<section class="history"><h3>Histórico</h3>${[...order.history].reverse().map(h=>`<div><time>${new Date(h.at).toLocaleString('pt-BR')}</time><p>${esc(h.text)}</p></div>`).join('')}</section>`:''}`;
  dialog.showModal();
}

function download() {
  const cell = x => {
    let value = String(x ?? '');
    if (/^\s*[=+\-@]/.test(value)) value = "'" + value;
    return '"' + value.replaceAll('"','""') + '"';
  };
  const rows = [['Ordem','Título','Área','Responsável','Prioridade','Situação','Prazo'],...filterResults().map(o=>[id(o),o.title,o.area,o.assignee,o.priority,o.status,o.due])];
  const url = URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const link = document.createElement('a');
  link.href=url; link.download='oficina-os.csv'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function closeMenu() {
  document.body.classList.remove('menu-open');
  document.querySelector('.mobile-menu').setAttribute('aria-expanded','false');
}

document.addEventListener('click', event=>{
  if (event.target.closest('.sidebar a')) closeMenu();
  const trigger=event.target.closest('[data-action]');
  if (!trigger) return;
  const a=trigger.dataset;
  switch(a.action) {
    case 'new': openOrder(undefined,trigger); break;
    case 'open': openOrder(orders.find(o=>o.number===Number(a.id)),trigger); break;
    case 'close': dialog.close(); break;
    case 'menu': trigger.setAttribute('aria-expanded',String(document.body.classList.toggle('menu-open'))); break;
    case 'search': goOrders({},true); break;
    case 'all': goOrders(); break;
    case 'metric': goOrders(a.filter==='late'?{late:true}:{status:a.filter}); break;
    case 'area': selectArea(a.area); break;
    case 'area-orders': goOrders({area:activeArea}); break;
    case 'rotate-left': angle-=15; render(); document.querySelector('[data-action=rotate-left]').focus(); break;
    case 'rotate-right': angle+=15; render(); document.querySelector('[data-action=rotate-right]').focus(); break;
    case 'reset-map': angle=37; render(); document.querySelector('[data-action=reset-map]').focus(); break;
    case 'export': download(); break;
  }
});
view.addEventListener('input',event=>{
  const input=event.target;
  if (page()!=='ordens' || !Object.hasOwn(filters,input.name)) return;
  filters[input.name]=input.type==='checkbox'?input.checked:input.value;
  filterResults();
});
dialog.addEventListener('submit',event=>{
  event.preventDefault();
  try {
    const next = saveOrder(orders,Object.fromEntries(new FormData(event.target)),editing);
    persist(next);
    orders=next;
    dialog.close();
    render();
    notify(editing?'Ordem atualizada.':'Ordem registrada.');
  } catch(error) {
    document.querySelector('#form-error').textContent = error.message;
  }
});
dialog.addEventListener('close',()=>{if(lastTrigger?.isConnected)lastTrigger.focus();else document.querySelector('[data-action=new]').focus();});
window.addEventListener('hashchange',()=>{
  closeMenu();
  render();
  window.scrollTo(0,0);
});
render();
