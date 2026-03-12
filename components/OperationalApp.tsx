'use client';

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';

type Order = {
  id: string;
  emissionDate: string;
  owner: string;
  client: string;
  status: string;
  type: string;
  payment: string;
  pieceWithdrawn: string;
  technician: string;
  doneAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type Tab = 'base' | 'kanban' | 'config';

const STORAGE_KEY = 'attec-operacional-vercel-v1';
const UNASSIGNED = 'Sem técnico';
const DEFAULT_TECHNICIANS = ['Amilton', 'Douglas', 'Henrique', UNASSIGNED];

const SAMPLE_ORDERS: Order[] = [
  {
    id: 'W45348', emissionDate: '2026-03-12', owner: 'Loja Central', client: 'Masaaki Shirona', status: 'Agendado', type: 'Assistência', payment: 'Cartão', pieceWithdrawn: 'Não', technician: 'Amilton', doneAt: '', notes: '', createdAt: '2026-03-12T08:00:00', updatedAt: '2026-03-12T08:00:00',
  },
  {
    id: 'W45349', emissionDate: '2026-03-12', owner: 'Loja Norte', client: 'Conceição Aparecida Furlanetti Pereira', status: 'Agendado', type: 'Visita técnica', payment: 'PIX', pieceWithdrawn: 'Sim', technician: 'Douglas', doneAt: '', notes: '', createdAt: '2026-03-12T08:10:00', updatedAt: '2026-03-12T08:10:00',
  },
  {
    id: 'W45350', emissionDate: '2026-03-12', owner: 'Loja Sul', client: 'Luiz Rodrigues', status: 'Agendado', type: 'Instalação', payment: 'Boleto', pieceWithdrawn: 'Não', technician: 'Henrique', doneAt: '', notes: '', createdAt: '2026-03-12T08:15:00', updatedAt: '2026-03-12T08:15:00',
  },
  {
    id: 'W45351', emissionDate: '2026-03-12', owner: 'Loja Oeste', client: 'Julia Tomboli Vizentim', status: 'Pendente de escala', type: 'Assistência', payment: 'Cartão', pieceWithdrawn: 'Não', technician: UNASSIGNED, doneAt: '', notes: '', createdAt: '2026-03-12T08:20:00', updatedAt: '2026-03-12T08:20:00',
  },
];

function nowIso() {
  return new Date().toISOString();
}

function formatDateFull(value: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function parseExcelDate(value: unknown) {
  if (!value) return '';
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return '';
    return `${String(date.y).padStart(4, '0')}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [d, m, y] = text.split('/');
    return `${y}-${m}-${d}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function createOrderFromRow(row: Record<string, unknown>): Order | null {
  const map: Record<string, unknown> = {};
  Object.keys(row).forEach((key) => {
    map[normalizeHeader(key)] = row[key];
  });

  const id = String(map['numero do pedido'] || map['numero pedido'] || map['pedido'] || map['id'] || '').trim();
  if (!id) return null;

  return {
    id,
    emissionDate: parseExcelDate(map['data de emissao'] || map['data'] || map['data atendimento']) || new Date().toISOString().slice(0, 10),
    owner: String(map['proprietario'] || map['loja'] || '').trim(),
    client: String(map['nome do cliente'] || map['cliente'] || '').trim(),
    status: String(map['status'] || 'Agendado').trim() || 'Agendado',
    type: String(map['tipo'] || '').trim(),
    payment: String(map['pagamento'] || '').trim(),
    pieceWithdrawn: String(map['peca ja retirada no ato da compra?'] || map['peca retirada'] || '').trim(),
    technician: String(map['tecnico'] || '').trim() || UNASSIGNED,
    doneAt: String(map['feito em'] || map['feito'] || '').trim(),
    notes: String(map['observacoes'] || map['obs'] || '').trim(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function exportWorkbook(data: Order[], technicians: string[], selectedDate: string) {
  const workbook = XLSX.utils.book_new();
  const baseRows = data.map((order) => ({
    'DATA DE EMISSÃO': order.emissionDate,
    PROPRIETÁRIO: order.owner,
    'NUMERO DO PEDIDO': order.id,
    'NOME DO CLIENTE': order.client,
    STATUS: order.status,
    TIPO: order.type,
    PAGAMENTO: order.payment,
    'PEÇA JÁ RETIRADA NO ATO DA COMPRA?': order.pieceWithdrawn,
    TÉCNICO: order.technician,
    'FEITO EM': order.doneAt ? formatDateTime(order.doneAt) : '',
    OBSERVAÇÕES: order.notes,
  }));

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(baseRows), 'Base Operacional');

  const agendaRows: Array<Record<string, string>> = [];
  technicians.forEach((tech) => {
    agendaRows.push({ TÉCNICO: tech, DATA: selectedDate, PEDIDO: '', CLIENTE: '', STATUS: '' });
    data.filter((item) => item.technician === tech).forEach((order) => {
      agendaRows.push({
        TÉCNICO: '',
        DATA: order.emissionDate,
        PEDIDO: order.id,
        CLIENTE: order.client,
        STATUS: order.doneAt ? 'Concluído' : order.status,
      });
    });
    agendaRows.push({ TÉCNICO: '', DATA: '', PEDIDO: '', CLIENTE: '', STATUS: '' });
  });

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(agendaRows), 'Agenda do Dia');
  XLSX.writeFile(workbook, `agenda-operacional-${selectedDate || 'geral'}.xlsx`);
}

function StatusBadge({ order }: { order: Order }) {
  const cls = order.doneAt ? 'badge done' : order.technician === UNASSIGNED ? 'badge unassigned' : 'badge pending';
  const label = order.doneAt ? 'Concluído' : order.status || 'Agendado';
  return <span className={cls}>{label}</span>;
}

function OrderCard({
  order,
  isFirst,
  isLast,
  onToggleDone,
  onMoveLeft,
  onMoveRight,
  onOpenNotes,
  onDragStart,
}: {
  order: Order;
  isFirst: boolean;
  isLast: boolean;
  onToggleDone: (id: string) => void;
  onMoveLeft: (id: string) => void;
  onMoveRight: (id: string) => void;
  onOpenNotes: (order: Order) => void;
  onDragStart: (id: string) => void;
}) {
  return (
    <div className="order-card" draggable onDragStart={() => onDragStart(order.id)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }}>
        <div>
          <h4>Pedido {order.id}</h4>
          <p>{order.client || 'Sem cliente informado'}</p>
        </div>
        <StatusBadge order={order} />
      </div>
      <div className="order-meta">
        <div><strong>Tipo:</strong> {order.type || '-'}</div>
        <div><strong>Pagamento:</strong> {order.payment || '-'}</div>
        <div><strong>Feito em:</strong> {order.doneAt ? formatDateTime(order.doneAt) : 'Ainda não concluído'}</div>
        {order.notes ? <div><strong>Obs:</strong> {order.notes}</div> : null}
      </div>
      <div className="order-actions">
        <button className="btn btn-primary btn-small" onClick={() => onToggleDone(order.id)}>{order.doneAt ? 'Reabrir' : 'Marcar feito'}</button>
        <button className="btn btn-secondary btn-small" onClick={() => onOpenNotes(order)}>Observações</button>
        <button className="btn btn-secondary btn-small" onClick={() => onMoveLeft(order.id)} disabled={isFirst}>← Mover</button>
        <button className="btn btn-secondary btn-small" onClick={() => onMoveRight(order.id)} disabled={isLast}>Mover →</button>
      </div>
    </div>
  );
}

export default function OperationalApp() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('base');
  const [orders, setOrders] = useState<Order[]>(SAMPLE_ORDERS);
  const [technicians, setTechnicians] = useState<string[]>(DEFAULT_TECHNICIANS);
  const [selectedDate, setSelectedDate] = useState('2026-03-12');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [techFilter, setTechFilter] = useState('todos');
  const [draggedId, setDraggedId] = useState('');
  const [newTechnician, setNewTechnician] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { orders: Order[]; technicians: string[] };
      if (Array.isArray(parsed.orders) && Array.isArray(parsed.technicians)) {
        setOrders(parsed.orders);
        setTechnicians(parsed.technicians.includes(UNASSIGNED) ? parsed.technicians : [...parsed.technicians, UNASSIGNED]);
        const firstDate = parsed.orders.map((item) => item.emissionDate).filter(Boolean).sort()[0];
        if (firstDate) setSelectedDate(firstDate);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ orders, technicians }));
  }, [orders, technicians]);

  const availableDates = useMemo(() => [...new Set(orders.map((item) => item.emissionDate).filter(Boolean))].sort(), [orders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesDate = !selectedDate || order.emissionDate === selectedDate;
      const matchesSearch = !q || [order.id, order.client, order.technician, order.owner].join(' ').toLowerCase().includes(q);
      const derivedStatus = order.doneAt ? 'concluido' : 'pendente';
      const matchesStatus = statusFilter === 'todos' || statusFilter === derivedStatus;
      const matchesTech = techFilter === 'todos' || order.technician === techFilter;
      return matchesDate && matchesSearch && matchesStatus && matchesTech;
    });
  }, [orders, search, selectedDate, statusFilter, techFilter]);

  const grouped = useMemo(() => technicians.reduce<Record<string, Order[]>>((acc, tech) => {
    acc[tech] = filteredOrders.filter((order) => order.technician === tech);
    return acc;
  }, {}), [filteredOrders, technicians]);

  const stats = useMemo(() => ({
    total: filteredOrders.length,
    done: filteredOrders.filter((item) => item.doneAt).length,
    pending: filteredOrders.filter((item) => !item.doneAt).length,
    unassigned: filteredOrders.filter((item) => item.technician === UNASSIGNED).length,
  }), [filteredOrders]);

  function patchOrder(id: string, patch: Partial<Order>) {
    setOrders((prev) => prev.map((item) => item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item));
  }

  function handleToggleDone(id: string) {
    const order = orders.find((item) => item.id === id);
    if (!order) return;
    patchOrder(id, {
      doneAt: order.doneAt ? '' : nowIso(),
      status: order.doneAt ? 'Agendado' : 'Concluído',
    });
  }

  function moveColumn(id: string, step: number) {
    const order = orders.find((item) => item.id === id);
    if (!order) return;
    const currentIndex = technicians.indexOf(order.technician);
    const nextIndex = currentIndex + step;
    if (nextIndex < 0 || nextIndex >= technicians.length) return;
    patchOrder(id, { technician: technicians[nextIndex] });
  }

  function handleDrop(technician: string) {
    if (!draggedId) return;
    patchOrder(draggedId, { technician });
    setDraggedId('');
  }

  function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (!result) return;
      const workbook = XLSX.read(new Uint8Array(result as ArrayBuffer), { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
      const imported = rows.map(createOrderFromRow).filter(Boolean) as Order[];
      if (!imported.length) {
        alert('Nenhum pedido válido foi encontrado na planilha.');
        return;
      }
      const foundTechnicians = imported.map((item) => item.technician).filter(Boolean);
      const mergedTechs = [...new Set([...DEFAULT_TECHNICIANS, ...foundTechnicians])];
      setOrders(imported);
      setTechnicians(mergedTechs.includes(UNASSIGNED) ? mergedTechs : [...mergedTechs, UNASSIGNED]);
      const firstDate = imported.map((item) => item.emissionDate).filter(Boolean).sort()[0];
      if (firstDate) setSelectedDate(firstDate);
      setTechFilter('todos');
      setStatusFilter('todos');
      setSearch('');
      event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  }

  function handleExport() {
    exportWorkbook(filteredOrders, technicians, selectedDate);
  }

  function handleReset() {
    if (!window.confirm('Deseja resetar os dados locais e voltar ao exemplo inicial?')) return;
    setOrders(SAMPLE_ORDERS);
    setTechnicians(DEFAULT_TECHNICIANS);
    setSelectedDate('2026-03-12');
    setSearch('');
    setStatusFilter('todos');
    setTechFilter('todos');
    localStorage.removeItem(STORAGE_KEY);
  }

  function handleAddTechnician() {
    const name = newTechnician.trim();
    if (!name) return;
    if (technicians.includes(name)) {
      alert('Esse técnico já existe na lista.');
      return;
    }
    setTechnicians((prev) => [...prev.filter((item) => item !== UNASSIGNED), name, UNASSIGNED]);
    setNewTechnician('');
  }

  function openNotes(order: Order) {
    setSelectedOrder(order);
    setNotesDraft(order.notes || '');
    setNotesOpen(true);
  }

  function saveNotes() {
    if (!selectedOrder) return;
    patchOrder(selectedOrder.id, { notes: notesDraft });
    setNotesOpen(false);
  }

  return (
    <div className="page">
      <div className="container">
        <section className="hero">
          <div>
            <div className="hero-tag">Calendário operacional</div>
            <h1>Escala de atendimentos técnicos</h1>
            <p>
              Sistema web pronto para deploy no Vercel com importação de Excel, distribuição de pedidos por técnico,
              visão kanban, drag and drop entre colunas, marcação automática de “feito em” e exportação da agenda.
            </p>
          </div>
          <div className="stats">
            <div className="stat-card"><div className="label">Pedidos do dia</div><div className="value">{stats.total}</div></div>
            <div className="stat-card"><div className="label">Concluídos</div><div className="value">{stats.done}</div></div>
            <div className="stat-card"><div className="label">Pendentes</div><div className="value">{stats.pending}</div></div>
            <div className="stat-card"><div className="label">Sem técnico</div><div className="value">{stats.unassigned}</div></div>
          </div>
        </section>

        <section className="panel toolbar">
          <div className="field">
            <label>Data</label>
            <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
              {availableDates.map((date) => <option key={date} value={date}>{date}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Buscar</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pedido, cliente, técnico ou loja" />
          </div>

          <div className="field">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="concluido">Concluídos</option>
            </select>
          </div>

          <div className="field">
            <label>Técnico</label>
            <select value={techFilter} onChange={(e) => setTechFilter(e.target.value)}>
              <option value="todos">Todos</option>
              {technicians.map((tech) => <option key={tech} value={tech}>{tech}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Ações</label>
            <div className="actions">
              <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>Importar Excel</button>
              <button className="btn btn-secondary" onClick={handleExport}>Exportar</button>
              <button className="btn btn-danger" onClick={handleReset}>Resetar</button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleImportFile} />
            </div>
          </div>
        </section>

        <div className="tabs">
          <button className={`tab ${tab === 'base' ? 'active' : ''}`} onClick={() => setTab('base')}>Base operacional</button>
          <button className={`tab ${tab === 'kanban' ? 'active' : ''}`} onClick={() => setTab('kanban')}>Kanban por técnico</button>
          <button className={`tab ${tab === 'config' ? 'active' : ''}`} onClick={() => setTab('config')}>Técnicos e apoio</button>
        </div>

        {tab === 'base' && (
          <section className="panel content">
            <h2 className="section-title">Base de distribuição de pedidos</h2>
            <p className="section-subtitle">Escolha o técnico, marque como feito e registre observações operacionais.</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Loja</th>
                    <th>Status</th>
                    <th>Técnico</th>
                    <th>Feito em</th>
                    <th>Observações</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td><strong>{order.id}</strong></td>
                      <td>
                        <div><strong>{order.client || '-'}</strong></div>
                        <div className="cell-note">{order.type || 'Sem tipo informado'}</div>
                      </td>
                      <td>{order.owner || '-'}</td>
                      <td><StatusBadge order={order} /></td>
                      <td>
                        <select value={order.technician} onChange={(e) => patchOrder(order.id, { technician: e.target.value })}>
                          {technicians.map((tech) => <option key={tech} value={tech}>{tech}</option>)}
                        </select>
                      </td>
                      <td>{order.doneAt ? formatDateTime(order.doneAt) : '-'}</td>
                      <td>
                        {order.notes ? <div className="note-preview">{order.notes}</div> : <span className="cell-note">Sem observação</span>}
                      </td>
                      <td>
                        <div className="actions">
                          <button className="btn btn-primary btn-small" onClick={() => handleToggleDone(order.id)}>{order.doneAt ? 'Reabrir' : 'Feito'}</button>
                          <button className="btn btn-secondary btn-small" onClick={() => openNotes(order)}>Obs</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'kanban' && (
          <section className="panel content">
            <h2 className="section-title">Agenda visual — {formatDateFull(selectedDate)}</h2>
            <p className="section-subtitle">Arraste entre colunas ou use os botões de mover quando houver troca de técnico.</p>
            <div className="kanban">
              {technicians.map((technician, index) => (
                <div
                  key={technician}
                  className="kanban-column"
                  onDragOver={(e: DragEvent<HTMLDivElement>) => e.preventDefault()}
                  onDrop={() => handleDrop(technician)}
                >
                  <div className="column-header">
                    <div>
                      <div className="column-title">{technician}</div>
                      <div className="column-count">{grouped[technician]?.length || 0} atendimento(s)</div>
                    </div>
                  </div>
                  <div className="card-list">
                    {grouped[technician]?.length ? grouped[technician].map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        isFirst={index === 0}
                        isLast={index === technicians.length - 1}
                        onToggleDone={handleToggleDone}
                        onMoveLeft={(id) => moveColumn(id, -1)}
                        onMoveRight={(id) => moveColumn(id, 1)}
                        onOpenNotes={openNotes}
                        onDragStart={(id) => setDraggedId(id)}
                      />
                    )) : <div className="drop-empty">Arraste pedidos para esta coluna</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'config' && (
          <section className="config-grid">
            <div className="panel content">
              <h2 className="section-title">Cadastro rápido de técnicos</h2>
              <div className="inline-row" style={{ marginBottom: 14 }}>
                <input value={newTechnician} onChange={(e) => setNewTechnician(e.target.value)} placeholder="Nome do técnico" />
                <button className="btn btn-primary" onClick={handleAddTechnician}>Adicionar</button>
              </div>
              <div className="tech-list">
                {technicians.map((tech) => <div key={tech} className="tech-item">{tech}</div>)}
              </div>
            </div>
            <div className="panel content">
              <h2 className="section-title">Regras da operação</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                <div className="rule-item">1. Importe a planilha Excel diária com a base de pedidos.</div>
                <div className="rule-item">2. Defina o técnico em cada pedido na base operacional.</div>
                <div className="rule-item">3. Use o kanban para remanejar rapidamente entre colunas.</div>
                <div className="rule-item">4. Clique em “Feito” para gravar data e hora automaticamente no campo correspondente.</div>
                <div className="rule-item">5. Exporte o Excel ao fim do dia para compartilhar a agenda ou consolidar o fechamento.</div>
              </div>
            </div>
          </section>
        )}

        {notesOpen && (
          <div className="modal-backdrop" onClick={() => setNotesOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Observações do pedido {selectedOrder?.id}</h3>
              <div className="field">
                <label>Anotações operacionais</label>
                <textarea rows={7} value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} placeholder="Ex.: cliente pediu contato antes da visita, endereço confirmado, validar peça..." />
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setNotesOpen(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={saveNotes}>Salvar observação</button>
              </div>
            </div>
          </div>
        )}

        <div className="footer-note">Persistência local no navegador. Para multiusuário e histórico centralizado, conecte um banco como Supabase em uma próxima etapa.</div>
      </div>
    </div>
  );
}
