/* ==========================================================
   EduHelp Iperó — lógica da aplicação
   Dados salvos no localStorage do navegador.
   ========================================================== */
(() => {
  'use strict';

  const STORAGE_KEY = 'eduhelp-ipero:v1';

  const TITULOS = {
    dashboard: 'Dashboard',
    chamados: 'Chamados',
    'novo-chamado': 'Novo chamado',
    estoque: 'Estoque',
    saida: 'Saída de material',
    escolas: 'Escolas',
    cadastros: 'Cadastros',
    relatorios: 'Relatórios',
    faq: 'FAQ',
    configuracoes: 'Configurações',
    perfil: 'Perfil'
  };

  /* ------------------------------------------------------
     Utilitários
  ------------------------------------------------------ */
  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

  const esc = (valor) =>
    String(valor ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

  const fmtData = (iso) => new Date(iso).toLocaleDateString('pt-BR');
  const fmtDataHora = (iso) =>
    new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  const slug = (txt) =>
    txt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '');

  let toastTimer;
  function toast(msg, tipo = '') {
    const el = $('#toast');
    el.textContent = msg;
    el.className = `toast show ${tipo}`.trim();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
  }

  /* ------------------------------------------------------
     Estado e persistência
  ------------------------------------------------------ */
  function dadosIniciais() {
    return {
      perfil: { nome: 'Administrador TI', email: '', cargo: 'Administrador de TI' },
      escolas: [
        { id: 1, nome: 'Sede - Secretaria Municipal de Educação', endereco: 'Polo Cultural - Rua Luiz Rossi, nº 107, Jardim Irene', telefone: '(15) 3459-8020', pcs: 15, impressoras: 4 },
        { id: 2, nome: 'EMEF Prof. Benedito Ferreira Lopes', endereco: 'Rua das Flores, 200 - Centro', telefone: '(15) 3266-1234', pcs: 25, impressoras: 3 },
        { id: 3, nome: 'EMEF Prof. José Ermírio de Moraes', endereco: 'Av. Brasil, 450 - Jardim Irene', telefone: '(15) 3266-2345', pcs: 30, impressoras: 4 },
        { id: 4, nome: 'EMEF Prof. Maria Helena Alves', endereco: '', telefone: '', pcs: 0, impressoras: 0 },
        { id: 5, nome: 'EMEI Jardim das Crianças', endereco: '', telefone: '', pcs: 0, impressoras: 0 }
      ],
      chamados: [
        { id: 101, titulo: 'Internet caindo frequentemente no Lab de Informática', categoria: 'Rede', escolaId: 3, solicitante: 'Carlos Pereira', email: '', patrimonio: 'Lab Informática', descricao: '', prioridade: 'Urgente', status: 'Em Andamento', criadoEm: '2026-05-28T09:00:00', resolvidoEm: null },
        { id: 102, titulo: 'Impressora não imprime - papel enroscado / troca de toner', categoria: 'Impressora', escolaId: 5, solicitante: 'Ana Oliveira', email: '', patrimonio: 'PAT-00310', descricao: '', prioridade: 'Média', status: 'Aberto', criadoEm: '2026-05-28T10:30:00', resolvidoEm: null },
        { id: 103, titulo: 'E-mail institucional bloqueado', categoria: 'E-mail / Contas', escolaId: 1, solicitante: 'Fernanda Costa', email: '', patrimonio: 'Administrativo', descricao: '', prioridade: 'Alta', status: 'Resolvido', criadoEm: '2026-05-28T08:15:00', resolvidoEm: '2026-05-28T15:00:00' }
      ],
      estoque: [
        { id: 1, nome: 'Toner 258x', categoria: 'Toner', quantidade: 10, minimo: 3, local: 'Sala TI, Prateleira 4' },
        { id: 2, nome: 'Mouse óptico USB', categoria: 'Periférico', quantidade: 15, minimo: 5, local: 'Sala TI, Armário 2' },
        { id: 3, nome: 'Switch Gigabit 8 portas', categoria: 'Rede', quantidade: 4, minimo: 2, local: 'Sala TI, Prateleira 1' }
      ],
      movimentacoes: [
        { tipo: 'saida', protocolo: 'DOC-2026-001', itemId: 1, item: 'Toner 258x', qtd: 1, chamadoId: 102, tecnico: 'Equipe TI', dataHora: '2026-11-04T14:20:00' }
      ],
      faq: [
        { q: 'Como abro um chamado?', a: 'Acesse "Novo chamado", escolha a escola, a categoria e a prioridade, descreva o problema e clique em "Registrar chamado". O número do chamado aparece na lista assim que ele é criado.' },
        { q: 'Qual a diferença entre as prioridades?', a: 'Urgente: o problema impede o trabalho de toda a unidade (ex.: sem internet). Alta: afeta um setor ou várias pessoas. Média: afeta uma pessoa ou tem solução alternativa.' },
        { q: 'Como peço troca de toner?', a: 'Abra um chamado na categoria "Impressora / Toner" informando o modelo da impressora. O técnico dará baixa do toner no estoque vinculando a saída ao seu chamado.' },
        { q: 'A internet da escola está lenta ou caindo. O que faço?', a: 'Antes de abrir o chamado, reinicie o roteador da unidade por 30 segundos. Se o problema continuar, abra um chamado na categoria "Rede / Internet" e informe horário e local afetado.' },
        { q: 'Esqueci a senha do e-mail institucional.', a: 'Abra um chamado na categoria "E-mail / Contas" com seu nome completo e cargo. A equipe de TI fará a redefinição e informará a senha provisória.' }
      ]
    };
  }

  let estado = carregar();

  function carregar() {
    try {
      const bruto = localStorage.getItem(STORAGE_KEY);
      if (bruto) {
        const dados = JSON.parse(bruto);
        if (dadosValidos(dados)) return dados;
      }
    } catch (e) { /* segue com os dados iniciais */ }
    return dadosIniciais();
  }

  function dadosValidos(d) {
    return d && typeof d === 'object' && d.perfil && typeof d.perfil === 'object' &&
      ['escolas', 'chamados', 'estoque', 'movimentacoes', 'faq'].every((k) => Array.isArray(d[k]));
  }

  function salvar() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
    } catch (e) {
      toast('Não foi possível salvar os dados neste navegador.', 'erro');
    }
  }

  /* ------------------------------------------------------
     Consultas auxiliares
  ------------------------------------------------------ */
  const nomeEscola = (id) => (estado.escolas.find((e) => e.id === id) || {}).nome || 'Escola removida';
  const ativos = () => estado.chamados.filter((c) => c.status !== 'Resolvido');
  const estoqueBaixo = () => estado.estoque.filter((i) => i.quantidade <= i.minimo);
  const proximoId = (lista, inicio = 1) =>
    lista.length ? Math.max(...lista.map((x) => x.id)) + 1 : inicio;

  const classePrioridade = (p) => `badge-${slug(p)}`;
  const classeStatus = (s) =>
    s === 'Resolvido' ? 'badge-resolvido' : s === 'Em Andamento' ? 'badge-andamento' : 'badge-aberto';

  function gerarProtocolo(prefixo) {
    const ano = new Date().getFullYear();
    const usados = estado.movimentacoes
      .filter((m) => m.protocolo.startsWith(`${prefixo}-${ano}-`))
      .map((m) => Number(m.protocolo.split('-')[2]) || 0);
    const n = (usados.length ? Math.max(...usados) : 0) + 1;
    return `${prefixo}-${ano}-${String(n).padStart(3, '0')}`;
  }

  function preencherSelect(el, opcoes, vazio = '') {
    const atual = el.value;
    el.innerHTML = opcoes.length
      ? opcoes.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')
      : `<option value="">${esc(vazio)}</option>`;
    if (opcoes.some((o) => String(o.value) === atual)) el.value = atual;
  }

  /* ------------------------------------------------------
     Renderização
  ------------------------------------------------------ */
  function htmlChamado(c, comAcoes) {
    let acoes = '';
    if (comAcoes) {
      if (c.status === 'Aberto') {
        acoes = `<button type="button" class="btn btn-sm" data-action="status" data-id="${c.id}" data-novo="Em Andamento">Iniciar</button>`;
      }
      if (c.status !== 'Resolvido') {
        acoes += `<button type="button" class="btn btn-sm btn-success" data-action="status" data-id="${c.id}" data-novo="Resolvido">Concluir</button>`;
      } else {
        acoes = `<button type="button" class="btn btn-sm btn-outline" data-action="status" data-id="${c.id}" data-novo="Aberto">Reabrir</button>`;
      }
    }
    return `
      <article class="ticket-item">
        <div class="ticket-info">
          <h4>#${c.id} - ${esc(c.titulo)}</h4>
          <div class="ticket-meta">
            🏫 ${esc(nomeEscola(c.escolaId))} | 👤 ${esc(c.solicitante)} | 🏷️ ${esc(c.patrimonio)} | 🗂️ ${esc(c.categoria)} | 📅 ${fmtData(c.criadoEm)}
          </div>
          ${c.descricao ? `<p class="ticket-desc">${esc(c.descricao)}</p>` : ''}
        </div>
        <div class="badges">
          <span class="badge ${classePrioridade(c.prioridade)}">${esc(c.prioridade)}</span>
          <span class="badge ${classeStatus(c.status)}">${esc(c.status)}</span>
          ${acoes}
        </div>
      </article>`;
  }

  function renderDashboard() {
    $('#kpi-abertos').textContent = ativos().length;
    $('#kpi-resolvidos').textContent = estado.chamados.length - ativos().length;
    $('#kpi-escolas').textContent = estado.escolas.length;
    $('#kpi-estoque').textContent = estado.estoque.reduce((s, i) => s + i.quantidade, 0);
    $('#kpi-faq').textContent = estado.faq.length;

    const recentes = [...estado.chamados].sort((a, b) => b.id - a.id).slice(0, 5);
    $('#dash-recentes').innerHTML = recentes.length
      ? recentes.map((c) => htmlChamado(c, false)).join('')
      : '<p class="vazio">Nenhum chamado registrado ainda.</p>';

    const urgentes = ativos().filter((c) => c.prioridade === 'Urgente');
    const baixos = estoqueBaixo();
    const linhas = [
      ...urgentes.map((c) => `
        <div class="ticket-item">
          <div class="ticket-info"><h4>🚨 Chamado urgente #${c.id}</h4>
          <div class="ticket-meta">${esc(c.titulo)} — ${esc(nomeEscola(c.escolaId))}</div></div>
          <span class="badge ${classeStatus(c.status)}">${esc(c.status)}</span>
        </div>`),
      ...baixos.map((i) => `
        <div class="ticket-item">
          <div class="ticket-info"><h4>📉 Estoque baixo: ${esc(i.nome)}</h4>
          <div class="ticket-meta">Saldo ${i.quantidade} un. (mínimo ${i.minimo})</div></div>
          <span class="badge badge-baixo">Repor</span>
        </div>`)
    ];
    $('#painel-alertas').hidden = linhas.length === 0;
    $('#lista-alertas').innerHTML = linhas.join('');

    const total = urgentes.length + baixos.length;
    const badge = $('#alert-badge');
    badge.textContent = total ? `🔔 ${total} ${total === 1 ? 'alerta' : 'alertas'}` : '🔔 Sem alertas';
    badge.classList.toggle('has-alerts', total > 0);
  }

  function renderChamados() {
    const termo = $('#busca-chamado').value.trim().toLowerCase();
    const status = $('#filtro-status').value;
    const prioridade = $('#filtro-prioridade').value;

    const lista = estado.chamados
      .filter((c) => {
        if (status === 'ativos' && c.status === 'Resolvido') return false;
        if (status && status !== 'ativos' && c.status !== status) return false;
        if (prioridade && c.prioridade !== prioridade) return false;
        if (!termo) return true;
        return [c.titulo, nomeEscola(c.escolaId), c.solicitante, c.patrimonio, String(c.id)]
          .some((t) => t.toLowerCase().includes(termo));
      })
      .sort((a, b) => b.id - a.id);

    $('#lista-chamados').innerHTML = lista.length
      ? lista.map((c) => htmlChamado(c, true)).join('')
      : '<p class="vazio">Nenhum chamado encontrado com esses filtros.</p>';
  }

  function renderSelects() {
    preencherSelect($('#ch-escola'),
      estado.escolas.map((e) => ({ value: e.id, label: e.nome })), 'Cadastre uma escola primeiro');

    const itens = estado.estoque.map((i) => ({ value: i.id, label: `${i.nome} (saldo: ${i.quantidade})` }));
    preencherSelect($('#mov-item'), itens, 'Cadastre um item primeiro');
    preencherSelect($('#ent-item'), itens, 'Cadastre um item primeiro');

    const chamados = [...estado.chamados]
      .sort((a, b) => (a.status === 'Resolvido') - (b.status === 'Resolvido') || b.id - a.id)
      .map((c) => ({ value: c.id, label: `#${c.id} - ${c.titulo} (${nomeEscola(c.escolaId)})` }));
    preencherSelect($('#mov-chamado'), chamados, 'Nenhum chamado registrado');

    $('#lista-categorias').innerHTML = [...new Set(estado.estoque.map((i) => i.categoria))]
      .map((c) => `<option value="${esc(c)}"></option>`).join('');
  }

  function renderEstoque() {
    $('#lista-estoque').innerHTML = estado.estoque.length
      ? estado.estoque.map((i) => `
        <div class="ticket-item">
          <div class="ticket-info">
            <h4>${esc(i.nome)} <span class="badge badge-media">${esc(i.categoria)}</span></h4>
            <div class="ticket-meta">📍 ${esc(i.local || 'Local não informado')} | Mínimo: ${i.minimo} un.</div>
          </div>
          <div class="badges">
            ${i.quantidade <= i.minimo ? '<span class="badge badge-baixo">Estoque baixo</span>' : ''}
            <strong>Saldo: ${i.quantidade} un.</strong>
          </div>
        </div>`).join('')
      : '<p class="vazio">Nenhum item cadastrado. Use a página Cadastros para incluir o primeiro.</p>';
  }

  function renderHistorico() {
    const lista = [...estado.movimentacoes].sort((a, b) => b.dataHora.localeCompare(a.dataHora));
    $('#historico-movimentacoes').innerHTML = lista.length
      ? lista.map((m) => {
        const saida = m.tipo !== 'entrada';
        const chamado = saida && estado.chamados.find((c) => c.id === m.chamadoId);
        return `
        <div class="ticket-item">
          <div class="ticket-info">
            <h4>${saida ? '📄 Comprovante' : '📥 Entrada'} ${esc(m.protocolo)}: ${saida ? 'saída' : 'reposição'} de ${m.qtd}x ${esc(m.item)}</h4>
            <div class="ticket-meta">
              ${saida ? `🔗 Chamado #${m.chamadoId}${chamado ? ' - ' + esc(chamado.titulo) : ''} | 👨‍🔧 ${esc(m.tecnico)} | ` : ''}🕒 ${fmtDataHora(m.dataHora)}
            </div>
          </div>
          <div class="badges">
            <span class="badge badge-resolvido">Registrado</span>
            ${saida ? `<button type="button" class="btn btn-sm btn-outline" data-action="comprovante" data-protocolo="${esc(m.protocolo)}">Imprimir</button>` : ''}
          </div>
        </div>`;
      }).join('')
      : '<p class="vazio">Nenhuma movimentação registrada.</p>';
  }

  function renderEscolas() {
    $('#lista-escolas').innerHTML = estado.escolas.length
      ? estado.escolas.map((e) => {
        const abertos = ativos().filter((c) => c.escolaId === e.id).length;
        return `
        <div class="ticket-item">
          <div class="ticket-info">
            <h4>${esc(e.nome)}</h4>
            <div class="ticket-meta">
              ${esc(e.endereco || 'Endereço não informado')} | Tel: ${esc(e.telefone || 'não informado')} | ${e.pcs} PCs / ${e.impressoras} impressoras
            </div>
          </div>
          <span class="badge ${abertos ? 'badge-andamento' : 'badge-resolvido'}">
            ${abertos} ${abertos === 1 ? 'chamado ativo' : 'chamados ativos'}
          </span>
        </div>`;
      }).join('')
      : '<p class="vazio">Nenhuma escola cadastrada.</p>';
  }

  function renderFaq() {
    $('#lista-faq').innerHTML = estado.faq
      .map((f) => `<details class="faq-item"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
      .join('');
  }

  function renderPerfil() {
    $('#user-nome').textContent = estado.perfil.nome;
    $('#user-avatar').textContent = (estado.perfil.nome.trim()[0] || '?').toUpperCase();
    $('#pf-nome').value = estado.perfil.nome;
    $('#pf-email').value = estado.perfil.email;
    $('#pf-cargo').value = estado.perfil.cargo;
  }

  /* ---------- Relatórios ---------- */
  function barras(mapa, vazio = 'Sem dados no período.') {
    const entradas = Object.entries(mapa).sort((a, b) => b[1] - a[1]);
    if (!entradas.length) return `<p class="vazio">${vazio}</p>`;
    const max = Math.max(...entradas.map(([, v]) => v));
    return entradas.map(([nome, valor]) => `
      <div class="bar-row">
        <span class="bar-label">${esc(nome)}</span>
        <span class="bar-track"><span class="bar-fill" style="display:block;width:${(valor / max) * 100}%"></span></span>
        <span class="bar-value">${valor}</span>
      </div>`).join('');
  }

  const contar = (lista, fn) =>
    lista.reduce((acc, x) => { const k = fn(x); acc[k] = (acc[k] || 0) + 1; return acc; }, {});

  function dadosDoPeriodo() {
    const dias = Number($('#rel-periodo').value);
    const corte = dias ? Date.now() - dias * 86400000 : 0;
    return {
      chamados: estado.chamados.filter((c) => new Date(c.criadoEm).getTime() >= corte),
      movs: estado.movimentacoes.filter((m) => new Date(m.dataHora).getTime() >= corte)
    };
  }

  function renderRelatorios() {
    const { chamados, movs } = dadosDoPeriodo();
    const resolvidos = chamados.filter((c) => c.status === 'Resolvido');
    const taxa = chamados.length ? Math.round((resolvidos.length / chamados.length) * 100) : 0;

    const tempos = resolvidos.filter((c) => c.resolvidoEm)
      .map((c) => (new Date(c.resolvidoEm) - new Date(c.criadoEm)) / 86400000);
    const medio = tempos.length
      ? `${(tempos.reduce((s, t) => s + t, 0) / tempos.length).toFixed(1).replace('.', ',')} d`
      : '—';

    const saidas = movs.filter((m) => m.tipo !== 'entrada');
    const pecas = saidas.reduce((s, m) => s + m.qtd, 0);

    $('#rel-kpis').innerHTML = `
      <div class="kpi-card bg-blue"><h3>${chamados.length}</h3><p>Chamados no período</p></div>
      <div class="kpi-card bg-green"><h3>${taxa}%</h3><p>Taxa de resolução</p></div>
      <div class="kpi-card bg-orange"><h3>${medio}</h3><p>Tempo médio de resolução</p></div>
      <div class="kpi-card bg-purple"><h3>${pecas}</h3><p>Itens retirados do estoque</p></div>`;

    $('#rel-status').innerHTML = barras(contar(chamados, (c) => c.status));
    $('#rel-prioridade').innerHTML = barras(contar(chamados, (c) => c.prioridade));
    $('#rel-categoria').innerHTML = barras(contar(chamados, (c) => c.categoria));
    $('#rel-escola').innerHTML = barras(contar(chamados, (c) => nomeEscola(c.escolaId)));

    const porItem = saidas.reduce((acc, m) => { acc[m.item] = (acc[m.item] || 0) + m.qtd; return acc; }, {});
    $('#rel-materiais').innerHTML = barras(porItem, 'Nenhuma saída de material no período.');
  }

  function renderTudo() {
    renderDashboard();
    renderChamados();
    renderSelects();
    renderEstoque();
    renderHistorico();
    renderEscolas();
    renderFaq();
    renderRelatorios();
    renderPerfil();
  }

  /* ------------------------------------------------------
     Navegação (hash)
  ------------------------------------------------------ */
  let primeiraCarga = true;

  function navegar() {
    const id = location.hash.slice(1);
    const pagina = TITULOS[id] ? id : 'dashboard';

    $$('.content-section').forEach((s) => s.classList.toggle('active', s.id === pagina));
    $$('.sidebar nav a').forEach((a) => {
      if (a.dataset.page === pagina) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    $('#page-title').textContent = TITULOS[pagina];
    document.title = `${TITULOS[pagina]} | EduHelp Iperó`;
    renderTudo();

    window.scrollTo(0, 0);
    if (!primeiraCarga) $('#conteudo').focus({ preventScroll: true });
    primeiraCarga = false;
  }

  /* ------------------------------------------------------
     Ações
  ------------------------------------------------------ */
  function mudarStatus(id, novo) {
    const c = estado.chamados.find((x) => x.id === id);
    if (!c) return;
    c.status = novo;
    c.resolvidoEm = novo === 'Resolvido' ? new Date().toISOString() : null;
    salvar();
    renderTudo();
    toast(`Chamado #${id}: ${novo}.`);
  }

  function salvarChamado(e) {
    e.preventDefault();
    const titulo = $('#ch-titulo').value.trim();
    const solicitante = $('#ch-solicitante').value.trim();
    const escolaId = Number($('#ch-escola').value);
    if (!titulo || !solicitante || !escolaId) {
      toast('Preencha título, escola e solicitante.', 'erro');
      return;
    }
    const id = proximoId(estado.chamados, 101);
    estado.chamados.push({
      id,
      titulo,
      categoria: $('#ch-categoria').value,
      prioridade: $('#ch-prioridade').value,
      escolaId,
      solicitante,
      email: $('#ch-email').value.trim(),
      patrimonio: $('#ch-patrimonio').value.trim() || 'Não informado',
      descricao: $('#ch-descricao').value.trim(),
      status: 'Aberto',
      criadoEm: new Date().toISOString(),
      resolvidoEm: null
    });
    salvar();
    e.target.reset();
    $('#filtro-status').value = '';
    location.hash = '#chamados';
    renderTudo();
    toast(`Chamado #${id} registrado.`);
  }

  function registrarSaida(e) {
    e.preventDefault();
    const item = estado.estoque.find((i) => i.id === Number($('#mov-item').value));
    const chamado = estado.chamados.find((c) => c.id === Number($('#mov-chamado').value));
    const qtd = Math.floor(Number($('#mov-qtd').value));
    const tecnico = $('#mov-tecnico').value.trim();

    if (!item || !chamado || !tecnico || qtd < 1) {
      toast('Preencha item, quantidade, chamado e técnico.', 'erro');
      return;
    }
    if (item.quantidade < qtd) {
      toast(`Saldo insuficiente: ${item.nome} tem ${item.quantidade} un.`, 'erro');
      return;
    }

    item.quantidade -= qtd;
    const protocolo = gerarProtocolo('DOC');
    estado.movimentacoes.push({
      tipo: 'saida', protocolo, itemId: item.id, item: item.nome, qtd,
      chamadoId: chamado.id, tecnico, dataHora: new Date().toISOString()
    });
    salvar();
    e.target.reset();
    renderTudo();
    toast(`Baixa registrada. Comprovante ${protocolo}.`);
  }

  function registrarEntrada(e) {
    e.preventDefault();
    const item = estado.estoque.find((i) => i.id === Number($('#ent-item').value));
    const qtd = Math.floor(Number($('#ent-qtd').value));
    if (!item || qtd < 1) {
      toast('Escolha o item e uma quantidade válida.', 'erro');
      return;
    }
    item.quantidade += qtd;
    estado.movimentacoes.push({
      tipo: 'entrada', protocolo: gerarProtocolo('ENT'), itemId: item.id, item: item.nome, qtd,
      chamadoId: null, tecnico: '', dataHora: new Date().toISOString()
    });
    salvar();
    e.target.reset();
    renderTudo();
    toast(`Entrada de ${qtd}x ${item.nome} registrada.`);
  }

  function cadastrarEscola(e) {
    e.preventDefault();
    const nome = $('#esc-nome').value.trim();
    if (!nome) return;
    if (estado.escolas.some((x) => x.nome.toLowerCase() === nome.toLowerCase())) {
      toast('Já existe uma unidade com esse nome.', 'erro');
      return;
    }
    estado.escolas.push({
      id: proximoId(estado.escolas),
      nome,
      endereco: $('#esc-endereco').value.trim(),
      telefone: $('#esc-telefone').value.trim(),
      pcs: Math.max(0, Math.floor(Number($('#esc-pcs').value)) || 0),
      impressoras: Math.max(0, Math.floor(Number($('#esc-imp').value)) || 0)
    });
    salvar();
    e.target.reset();
    renderTudo();
    toast(`${nome} cadastrada.`);
  }

  function cadastrarItem(e) {
    e.preventDefault();
    const nome = $('#it-nome').value.trim();
    const categoria = $('#it-categoria').value.trim();
    if (!nome || !categoria) return;
    if (estado.estoque.some((x) => x.nome.toLowerCase() === nome.toLowerCase())) {
      toast('Já existe um item com esse nome.', 'erro');
      return;
    }
    estado.estoque.push({
      id: proximoId(estado.estoque),
      nome,
      categoria,
      quantidade: Math.max(0, Math.floor(Number($('#it-qtd').value)) || 0),
      minimo: Math.max(0, Math.floor(Number($('#it-minimo').value)) || 0),
      local: $('#it-local').value.trim()
    });
    salvar();
    e.target.reset();
    renderTudo();
    toast(`${nome} adicionado ao estoque.`);
  }

  function salvarPerfil(e) {
    e.preventDefault();
    const nome = $('#pf-nome').value.trim();
    if (!nome) return;
    estado.perfil = { nome, email: $('#pf-email').value.trim(), cargo: $('#pf-cargo').value.trim() };
    salvar();
    renderPerfil();
    toast('Perfil salvo.');
  }

  /* ---------- Comprovante, CSV e backup ---------- */
  function imprimirComprovante(protocolo) {
    const m = estado.movimentacoes.find((x) => x.protocolo === protocolo);
    if (!m) return;
    const chamado = estado.chamados.find((c) => c.id === m.chamadoId);
    const w = window.open('', '_blank', 'width=720,height=800');
    if (!w) {
      toast('Permita pop-ups neste site para imprimir o comprovante.', 'erro');
      return;
    }
    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>Comprovante ${esc(m.protocolo)}</title>
      <style>
        body{font-family:'Segoe UI',Tahoma,sans-serif;max-width:640px;margin:32px auto;padding:0 20px;color:#2c3e50}
        h1{font-size:1.3rem;margin-bottom:4px} p.sub{color:#5f6f7a;margin-bottom:24px}
        table{width:100%;border-collapse:collapse} td{padding:10px 8px;border-bottom:1px solid #e1e8ed;vertical-align:top}
        td:first-child{font-weight:600;width:34%} .ass{margin-top:64px;display:flex;gap:40px}
        .ass div{flex:1;border-top:1px solid #2c3e50;padding-top:6px;font-size:.85rem;text-align:center}
      </style></head><body>
      <h1>Comprovante de saída de material</h1>
      <p class="sub">Secretaria Municipal de Educação de Iperó — Almoxarifado de TI</p>
      <table>
        <tr><td>Protocolo</td><td>${esc(m.protocolo)}</td></tr>
        <tr><td>Data e hora</td><td>${fmtDataHora(m.dataHora)}</td></tr>
        <tr><td>Item</td><td>${esc(m.item)}</td></tr>
        <tr><td>Quantidade</td><td>${m.qtd} un.</td></tr>
        <tr><td>Chamado</td><td>#${m.chamadoId}${chamado ? ' - ' + esc(chamado.titulo) : ''}</td></tr>
        <tr><td>Unidade</td><td>${chamado ? esc(nomeEscola(chamado.escolaId)) : '—'}</td></tr>
        <tr><td>Técnico responsável</td><td>${esc(m.tecnico)}</td></tr>
      </table>
      <div class="ass"><div>Técnico de TI</div><div>Recebido por</div></div>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  function baixarArquivo(nome, conteudo, tipo) {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csv(linhas) {
    const celula = (v) => {
      let s = String(v ?? '');
      if (/^[=+\-@]/.test(s)) s = `'${s}`; // evita execução de fórmulas no Excel
      return `"${s.replace(/"/g, '""')}"`;
    };
    return '\uFEFF' + linhas.map((l) => l.map(celula).join(';')).join('\r\n');
  }

  function exportarChamados() {
    const { chamados } = dadosDoPeriodo();
    const linhas = [['ID', 'Título', 'Categoria', 'Prioridade', 'Status', 'Escola', 'Solicitante', 'Patrimônio', 'Criado em', 'Resolvido em']];
    chamados.forEach((c) => linhas.push([
      c.id, c.titulo, c.categoria, c.prioridade, c.status, nomeEscola(c.escolaId), c.solicitante,
      c.patrimonio, fmtDataHora(c.criadoEm), c.resolvidoEm ? fmtDataHora(c.resolvidoEm) : ''
    ]));
    baixarArquivo('chamados.csv', csv(linhas), 'text/csv;charset=utf-8');
  }

  function exportarMovimentacoes() {
    const { movs } = dadosDoPeriodo();
    const linhas = [['Protocolo', 'Tipo', 'Item', 'Quantidade', 'Chamado', 'Técnico', 'Data e hora']];
    movs.forEach((m) => linhas.push([
      m.protocolo, m.tipo === 'entrada' ? 'Entrada' : 'Saída', m.item, m.qtd,
      m.chamadoId ? `#${m.chamadoId}` : '', m.tecnico, fmtDataHora(m.dataHora)
    ]));
    baixarArquivo('movimentacoes.csv', csv(linhas), 'text/csv;charset=utf-8');
  }

  function exportarBackup() {
    const data = new Date().toISOString().slice(0, 10);
    baixarArquivo(`eduhelp-backup-${data}.json`, JSON.stringify(estado, null, 2), 'application/json');
  }

  function importarBackup(arquivo) {
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      try {
        const dados = JSON.parse(leitor.result);
        if (!dadosValidos(dados)) throw new Error('formato');
        if (!confirm('Substituir todos os dados atuais pelo conteúdo deste backup?')) return;
        estado = dados;
        salvar();
        renderTudo();
        toast('Backup restaurado.');
      } catch (err) {
        toast('Arquivo inválido. Use um backup gerado pelo EduHelp.', 'erro');
      }
    };
    leitor.readAsText(arquivo);
  }

  function resetar() {
    if (!confirm('Apagar todos os dados deste navegador e voltar ao exemplo inicial?')) return;
    estado = dadosIniciais();
    salvar();
    renderTudo();
    toast('Dados de exemplo restaurados.');
  }

  /* ------------------------------------------------------
     Eventos
  ------------------------------------------------------ */
  document.addEventListener('click', (ev) => {
    // Cartões do dashboard que já abrem a lista de chamados filtrada
    const kpi = ev.target.closest('a[data-status]');
    if (kpi) {
      $('#filtro-status').value = kpi.dataset.status;
      $('#busca-chamado').value = '';
      $('#filtro-prioridade').value = '';
    }

    const btn = ev.target.closest('[data-action]');
    if (!btn) return;
    const { action } = btn.dataset;

    if (action === 'status') mudarStatus(Number(btn.dataset.id), btn.dataset.novo);
    else if (action === 'comprovante') imprimirComprovante(btn.dataset.protocolo);
    else if (action === 'csv-chamados') exportarChamados();
    else if (action === 'csv-movimentacoes') exportarMovimentacoes();
    else if (action === 'imprimir') window.print();
    else if (action === 'backup-exportar') exportarBackup();
    else if (action === 'resetar') resetar();
  });

  $('#busca-chamado').addEventListener('input', renderChamados);
  $('#filtro-status').addEventListener('change', renderChamados);
  $('#filtro-prioridade').addEventListener('change', renderChamados);
  $('#rel-periodo').addEventListener('change', renderRelatorios);
  $('#backup-arquivo').addEventListener('change', (ev) => {
    importarBackup(ev.target.files[0]);
    ev.target.value = '';
  });

  $('#form-chamado').addEventListener('submit', salvarChamado);
  $('#form-saida').addEventListener('submit', registrarSaida);
  $('#form-entrada').addEventListener('submit', registrarEntrada);
  $('#form-escola').addEventListener('submit', cadastrarEscola);
  $('#form-item').addEventListener('submit', cadastrarItem);
  $('#form-perfil').addEventListener('submit', salvarPerfil);

  window.addEventListener('hashchange', navegar);

  navegar();
})();
