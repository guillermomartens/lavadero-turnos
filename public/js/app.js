const API = '/api';

const state = {
  step: 1,
  totalSteps: 5,
  telefono: '',
  clienteExiste: false,
  nombre: '', apellido: '', email: '',
  vehiculoTipo: '', vehiculoMarca: '', vehiculoPatente: '',
  categorias: [], categoriaId: null,
  servicios: [], servicioId: null,
  sectores: [], sectorId: null,
  fecha: '', slots: [], horaInicio: '',
  turnoCreado: null
};

const STEP_LABELS = ['Datos', 'Vehículo', 'Servicio', 'Turno', 'Confirmar'];
const TIPOS_VEHICULO = [
  { v: 'Auto', e: '🚗' }, { v: 'Camioneta', e: '🛻' }, { v: 'SUV', e: '🚙' },
  { v: 'Utilitario', e: '🚐' }, { v: 'Moto', e: '🏍️' },
  { v: 'Cuatriciclo', e: '🛺' }, { v: 'Bicicleta', e: '🚲' }
];

function $(sel) { return document.querySelector(sel); }
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  children.flat().forEach(c => {
    if (typeof c === 'string') node.appendChild(document.createTextNode(c));
    else if (c) node.appendChild(c);
  });
  return node;
}

function showError(msg) {
  const box = $('#errorBox');
  box.innerHTML = '';
  if (msg) box.appendChild(el('div', { class: 'error-msg' }, msg));
}

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de conexión.');
  return data;
}

// ---------------- Progress bar ----------------
function renderProgress() {
  const track = $('#waveTrack');
  const labels = $('#waveLabels');
  track.innerHTML = '';
  labels.innerHTML = '';
  for (let i = 1; i <= state.totalSteps; i++) {
    const cls = i < state.step ? 'done' : i === state.step ? 'active' : '';
    track.appendChild(el('div', { class: `wave-step ${cls}` }, el('div', { class: 'fill' })));
  }
  const label = STEP_LABELS[state.step - 1];
  labels.appendChild(el('span', { class: 'current' }, `Paso ${state.step} de ${state.totalSteps}: ${label}`));
}

function goToStep(n) {
  state.step = n;
  showError('');
  renderProgress();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------------- Step 1: Datos ----------------
let phoneDebounce = null;
function renderStep1() {
  const container = el('div');

  const card = el('div', { class: 'card' },
    el('div', { class: 'step-eyebrow' }, 'Tus datos'),
    el('div', { class: 'step-title' }, '¿Cuál es tu teléfono?')
  );

  const field = el('div', { class: 'field' },
    el('label', { class: 'field-label' }, 'Teléfono celular'),
    el('div', { class: 'phone-row' },
      el('div', { class: 'phone-code' }, '+54'),
      el('input', {
        type: 'tel', id: 'inputTelefono', placeholder: '2611234567',
        value: state.telefono
      })
    ),
    el('div', { class: 'hint' }, 'Sin 0 ni 15. Ingresá sólo números.')
  );
  card.appendChild(field);

  const banner = el('div', { id: 'welcomeBanner' });
  card.appendChild(banner);

  const nombreField = el('div', { class: 'grid-2' },
    el('div', { class: 'field' },
      el('label', { class: 'field-label' }, 'Nombre'),
      el('input', { type: 'text', id: 'inputNombre', value: state.nombre })
    ),
    el('div', { class: 'field' },
      el('label', { class: 'field-label' }, 'Apellido'),
      el('input', { type: 'text', id: 'inputApellido', value: state.apellido })
    )
  );
  card.appendChild(nombreField);

  const emailField = el('div', { class: 'field' },
    el('label', { class: 'field-label' }, 'E-mail'),
    el('input', { type: 'email', id: 'inputEmail', value: state.email, placeholder: 'para enviarte notificaciones de tus turnos' })
  );
  card.appendChild(emailField);

  container.appendChild(card);
  container.appendChild(
    el('div', { class: 'nav-row' },
      el('button', {
        class: 'btn btn-primary', onclick: () => {
          state.telefono = $('#inputTelefono').value.trim();
          state.nombre = $('#inputNombre').value.trim();
          state.apellido = $('#inputApellido').value.trim();
          state.email = $('#inputEmail').value.trim();
          if (!/^\d{6,12}$/.test(state.telefono)) return showError('Ingresá un teléfono válido (sólo números).');
          if (!state.nombre || !state.apellido) return showError('Completá nombre y apellido.');
          showError('');
          goToStep(2);
        }
      }, 'Continuar')
    )
  );

  $('#stepsContainer').innerHTML = '';
  $('#stepsContainer').appendChild(container);

  $('#inputTelefono').addEventListener('input', (e) => {
    const tel = e.target.value.trim();
    clearTimeout(phoneDebounce);
    if (!/^\d{6,12}$/.test(tel)) { $('#welcomeBanner').innerHTML = ''; return; }
    phoneDebounce = setTimeout(async () => {
      try {
        const data = await api(`/clientes/buscar?telefono=${tel}`);
        if (data.existe) {
          state.clienteExiste = true;
          $('#inputNombre').value = data.cliente.nombre;
          $('#inputApellido').value = data.cliente.apellido;
          $('#inputEmail').value = data.cliente.email || '';
          $('#welcomeBanner').innerHTML = '';
          $('#welcomeBanner').appendChild(el('div', { class: 'welcome-banner' }, `👋 Bienvenida/o de vuelta, ${data.cliente.nombre}!`));
        }
      } catch (e) { /* silencioso */ }
    }, 450);
  });
}

// ---------------- Step 2: Vehiculo ----------------
function renderStep2() {
  const card = el('div', { class: 'card' },
    el('div', { class: 'step-eyebrow' }, 'Tu vehículo'),
    el('div', { class: 'step-title' }, '¿Qué vas a lavar hoy?')
  );

  const grid = el('div', { class: 'option-grid' });
  TIPOS_VEHICULO.forEach(t => {
    const chip = el('div', {
      class: `option-chip ${state.vehiculoTipo === t.v ? 'selected' : ''}`,
      onclick: () => { state.vehiculoTipo = t.v; renderStep2(); }
    }, el('span', { class: 'emoji' }, t.e), t.v);
    grid.appendChild(chip);
  });
  card.appendChild(grid);

  card.appendChild(el('div', { class: 'grid-2', style: 'margin-top:16px' },
    el('div', { class: 'field' },
      el('label', { class: 'field-label' }, 'Marca (opcional)'),
      el('input', { type: 'text', id: 'inputMarca', value: state.vehiculoMarca })
    ),
    el('div', { class: 'field' },
      el('label', { class: 'field-label' }, 'Patente (opcional)'),
      el('input', { type: 'text', id: 'inputPatente', value: state.vehiculoPatente })
    )
  ));

  const container = el('div', {}, card,
    el('div', { class: 'nav-row' },
      el('button', { class: 'btn btn-secondary', onclick: () => goToStep(1) }, 'Atrás'),
      el('button', {
        class: 'btn btn-primary', onclick: () => {
          if (!state.vehiculoTipo) return showError('Elegí el tipo de vehículo.');
          state.vehiculoMarca = $('#inputMarca').value.trim();
          state.vehiculoPatente = $('#inputPatente').value.trim();
          showError('');
          loadCategorias().then(() => goToStep(3));
        }
      }, 'Continuar')
    )
  );

  $('#stepsContainer').innerHTML = '';
  $('#stepsContainer').appendChild(container);
}

// ---------------- Step 3: Categoria + Servicio + Sector ----------------
async function loadCategorias() {
  if (state.categorias.length) return;
  state.categorias = await api('/categorias');
  if (state.categorias.length === 1) state.categoriaId = state.categorias[0].id;
}

async function loadServiciosYSectores() {
  const [servicios, sectores] = await Promise.all([
    api(`/servicios?categoria_id=${state.categoriaId}`),
    api(`/sectores?categoria_id=${state.categoriaId}`)
  ]);
  state.servicios = servicios;
  state.sectores = sectores;
  if (state.sectores.length === 1) state.sectorId = state.sectores[0].id;
}

function serviciosAplicables() {
  return state.servicios.filter(s => {
    if (!s.aplica_tipo_vehiculo) return true;
    try {
      const arr = JSON.parse(s.aplica_tipo_vehiculo);
      return arr.includes(state.vehiculoTipo);
    } catch { return true; }
  });
}

async function renderStep3() {
  $('#stepsContainer').innerHTML = '<div class="card">Cargando servicios...</div>';

  const catCard = el('div', { class: 'card' },
    el('div', { class: 'step-eyebrow' }, 'Reserva'),
    el('div', { class: 'step-title' }, 'Elegí categoría y servicio')
  );

  if (state.categorias.length > 1) {
    const selectCat = el('select', { id: 'selectCategoria' },
      el('option', { value: '' }, 'Seleccione...'),
      ...state.categorias.map(c => el('option', { value: c.id, ...(state.categoriaId == c.id ? { selected: 'selected' } : {}) }, c.nombre))
    );
    catCard.appendChild(el('div', { class: 'field' },
      el('label', { class: 'field-label' }, 'Categoría'),
      selectCat
    ));
  }

  const serviciosBox = el('div', { id: 'serviciosBox' });
  const sectoresBox = el('div', { id: 'sectoresBox' });
  catCard.appendChild(serviciosBox);
  catCard.appendChild(sectoresBox);

  const container = el('div', {}, catCard,
    el('div', { class: 'nav-row' },
      el('button', { class: 'btn btn-secondary', onclick: () => goToStep(2) }, 'Atrás'),
      el('button', {
        class: 'btn btn-primary', id: 'btnStep3Next', onclick: () => {
          if (!state.categoriaId) return showError('Elegí una categoría.');
          if (!state.servicioId) return showError('Elegí un servicio.');
          if (!state.sectorId) return showError('Elegí un sector.');
          showError('');
          goToStep(4);
        }
      }, 'Continuar')
    )
  );

  $('#stepsContainer').innerHTML = '';
  $('#stepsContainer').appendChild(container);

  if (state.categorias.length > 1) {
    $('#selectCategoria').addEventListener('change', async (e) => {
      state.categoriaId = e.target.value || null;
      state.servicioId = null; state.sectorId = null;
      if (state.categoriaId) {
        await loadServiciosYSectores();
      } else {
        state.servicios = []; state.sectores = [];
      }
      renderServiciosYSectores();
    });
  }

  if (state.categoriaId) {
    await loadServiciosYSectores();
  }
  renderServiciosYSectores();
}

function renderServiciosYSectores() {
  const serviciosBox = $('#serviciosBox');
  const sectoresBox = $('#sectoresBox');
  if (!serviciosBox) return;
  serviciosBox.innerHTML = '';
  sectoresBox.innerHTML = '';

  if (!state.categoriaId) return;

  const label = el('label', { class: 'field-label', style: 'margin-top:14px;display:block' }, 'Servicio');
  serviciosBox.appendChild(label);

  const aplicables = serviciosAplicables();
  if (aplicables.length === 0) {
    serviciosBox.appendChild(el('div', { class: 'empty-note' }, 'No hay servicios disponibles para este tipo de vehículo en esta categoría.'));
  }
  aplicables.forEach(s => {
    const card = el('div', {
      class: `service-card ${state.servicioId == s.id ? 'selected' : ''}`,
      onclick: () => { state.servicioId = s.id; renderServiciosYSectores(); }
    },
      el('div', {},
        el('h4', {}, s.nombre),
        el('p', {}, s.descripcion || ''),
        el('div', { class: 'service-meta' }, `⏱ ${s.duracion_min} min`)
      ),
      el('div', { class: 'service-price' }, `$${Number(s.precio).toLocaleString('es-AR')}`)
    );
    serviciosBox.appendChild(card);
  });

  if (state.sectores.length > 1) {
    sectoresBox.appendChild(el('label', { class: 'field-label', style: 'margin-top:14px;display:block' }, 'Sector'));
    const grid = el('div', { class: 'option-grid' });
    state.sectores.forEach(s => {
      grid.appendChild(el('div', {
        class: `option-chip ${state.sectorId == s.id ? 'selected' : ''}`,
        onclick: () => { state.sectorId = s.id; renderServiciosYSectores(); }
      }, s.nombre));
    });
    sectoresBox.appendChild(grid);
  }
}

// ---------------- Step 4: Fecha y Hora ----------------
function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

async function renderStep4() {
  const card = el('div', { class: 'card' },
    el('div', { class: 'step-eyebrow' }, 'Turno'),
    el('div', { class: 'step-title' }, 'Elegí fecha y hora')
  );

  const fechaField = el('div', { class: 'field' },
    el('label', { class: 'field-label' }, 'Fecha'),
    el('input', { type: 'date', id: 'inputFecha', min: todayISO(), value: state.fecha })
  );
  card.appendChild(fechaField);

  const slotsBox = el('div', { id: 'slotsBox' });
  card.appendChild(el('label', { class: 'field-label' }, 'Hora'));
  card.appendChild(slotsBox);
  if (!state.fecha) slotsBox.appendChild(el('div', { class: 'empty-note' }, 'Seleccioná una fecha para ver los horarios disponibles.'));

  const container = el('div', {}, card,
    el('div', { class: 'nav-row' },
      el('button', { class: 'btn btn-secondary', onclick: () => goToStep(3) }, 'Atrás'),
      el('button', {
        class: 'btn btn-primary', onclick: () => {
          if (!state.fecha || !state.horaInicio) return showError('Elegí fecha y hora.');
          showError('');
          goToStep(5);
        }
      }, 'Continuar')
    )
  );

  $('#stepsContainer').innerHTML = '';
  $('#stepsContainer').appendChild(container);

  $('#inputFecha').addEventListener('change', async (e) => {
    state.fecha = e.target.value;
    state.horaInicio = '';
    await loadSlots();
  });

  if (state.fecha) await loadSlots();
}

async function loadSlots() {
  const slotsBox = $('#slotsBox');
  slotsBox.innerHTML = '<div class="empty-note">Buscando horarios...</div>';
  try {
    const slots = await api(`/disponibilidad?sector_id=${state.sectorId}&servicio_id=${state.servicioId}&fecha=${state.fecha}`);
    state.slots = slots;
    slotsBox.innerHTML = '';
    if (slots.length === 0) {
      slotsBox.appendChild(el('div', { class: 'empty-note' }, 'No hay horarios disponibles ese día. Probá con otra fecha.'));
      return;
    }
    const grid = el('div', { class: 'slot-grid' });
    slots.forEach(s => {
      grid.appendChild(el('div', {
        class: `slot-chip ${state.horaInicio === s.hora_inicio ? 'selected' : ''}`,
        onclick: () => { state.horaInicio = s.hora_inicio; loadSlotsRenderOnly(); }
      }, s.hora_inicio));
    });
    slotsBox.appendChild(grid);
  } catch (e) {
    slotsBox.innerHTML = '';
    slotsBox.appendChild(el('div', { class: 'empty-note' }, 'Error al buscar horarios.'));
  }
}
function loadSlotsRenderOnly() {
  const slotsBox = $('#slotsBox');
  slotsBox.innerHTML = '';
  const grid = el('div', { class: 'slot-grid' });
  state.slots.forEach(s => {
    grid.appendChild(el('div', {
      class: `slot-chip ${state.horaInicio === s.hora_inicio ? 'selected' : ''}`,
      onclick: () => { state.horaInicio = s.hora_inicio; loadSlotsRenderOnly(); }
    }, s.hora_inicio));
  });
  slotsBox.appendChild(grid);
}

// ---------------- Step 5: Resumen y confirmar ----------------
function renderStep5() {
  const servicio = state.servicios.find(s => s.id == state.servicioId);
  const sector = state.sectores.find(s => s.id == state.sectorId);
  const categoria = state.categorias.find(c => c.id == state.categoriaId);

  const card = el('div', { class: 'card' },
    el('div', { class: 'step-eyebrow' }, 'Confirmación'),
    el('div', { class: 'step-title' }, 'Revisá tu turno'),
    el('div', { class: 'summary-row' }, el('span', { class: 'label' }, 'Cliente'), el('span', { class: 'value' }, `${state.nombre} ${state.apellido}`)),
    el('div', { class: 'summary-row' }, el('span', { class: 'label' }, 'Teléfono'), el('span', { class: 'value' }, `+54 ${state.telefono}`)),
    el('div', { class: 'summary-row' }, el('span', { class: 'label' }, 'Vehículo'), el('span', { class: 'value' }, `${state.vehiculoTipo}${state.vehiculoMarca ? ' - ' + state.vehiculoMarca : ''}`)),
    el('div', { class: 'summary-row' }, el('span', { class: 'label' }, 'Categoría'), el('span', { class: 'value' }, categoria ? categoria.nombre : '')),
    el('div', { class: 'summary-row' }, el('span', { class: 'label' }, 'Servicio'), el('span', { class: 'value' }, servicio ? servicio.nombre : '')),
    el('div', { class: 'summary-row' }, el('span', { class: 'label' }, 'Sector'), el('span', { class: 'value' }, sector ? sector.nombre : '')),
    el('div', { class: 'summary-row' }, el('span', { class: 'label' }, 'Fecha'), el('span', { class: 'value' }, state.fecha)),
    el('div', { class: 'summary-row' }, el('span', { class: 'label' }, 'Hora'), el('span', { class: 'value' }, state.horaInicio)),
    el('div', { class: 'summary-total' }, el('span', {}, 'Total'), el('span', {}, `$${servicio ? Number(servicio.precio).toLocaleString('es-AR') : '0'}`))
  );

  const payCard = el('div', { class: 'card' },
    el('div', { class: 'step-eyebrow' }, 'Pago'),
    el('div', { class: 'pay-option' }, '💳 Pagar después — abonás en el lavadero al finalizar el servicio.')
  );

  const container = el('div', {}, card, payCard,
    el('div', { class: 'nav-row' },
      el('button', { class: 'btn btn-secondary', onclick: () => goToStep(4) }, 'Atrás'),
      el('button', { class: 'btn btn-primary', id: 'btnConfirmar', onclick: confirmarTurno }, 'Agendar turno')
    )
  );

  $('#stepsContainer').innerHTML = '';
  $('#stepsContainer').appendChild(container);
}

async function confirmarTurno() {
  const btn = $('#btnConfirmar');
  btn.disabled = true;
  btn.textContent = 'Agendando...';
  showError('');
  try {
    const turno = await api('/turnos', {
      method: 'POST',
      body: JSON.stringify({
        telefono: state.telefono,
        nombre: state.nombre,
        apellido: state.apellido,
        email: state.email || null,
        vehiculo: { tipo: state.vehiculoTipo, marca: state.vehiculoMarca, patente: state.vehiculoPatente },
        servicio_id: state.servicioId,
        sector_id: state.sectorId,
        fecha: state.fecha,
        hora_inicio: state.horaInicio
      })
    });
    state.turnoCreado = turno;
    renderSuccess();
  } catch (e) {
    showError(e.message);
    btn.disabled = false;
    btn.textContent = 'Agendar turno';
  }
}

function renderSuccess() {
  $('#heroTitle').textContent = '¡Todo listo!';
  $('#heroSubtitle').textContent = 'Tu turno fue agendado con éxito.';
  $('.wave-progress').style.display = 'none';

  const t = state.turnoCreado;
  const container = el('div', { class: 'card success-screen' },
    el('div', { class: 'success-check' }, '✓'),
    el('h2', {}, 'Turno confirmado'),
    el('p', {}, `${t.servicio_nombre} · ${t.fecha} a las ${t.hora_inicio}hs · ${t.sector_nombre}`),
    el('button', { class: 'btn btn-primary', onclick: () => location.reload() }, 'Agendar otro turno')
  );
  $('#stepsContainer').innerHTML = '';
  $('#stepsContainer').appendChild(container);
}

function render() {
  if (state.step === 1) renderStep1();
  else if (state.step === 2) renderStep2();
  else if (state.step === 3) renderStep3();
  else if (state.step === 4) renderStep4();
  else if (state.step === 5) renderStep5();
}

// ---------------- Mis turnos (modal) ----------------
function badgeLabel(estado) {
  const map = {
    pendiente: 'Pendiente', confirmado: 'Confirmado', en_proceso: 'En proceso',
    completado: 'Completado', cancelado: 'Cancelado', no_show: 'No asistió'
  };
  return map[estado] || estado;
}

function openMisTurnos() {
  const overlay = el('div', { class: 'modal-overlay', onclick: (e) => { if (e.target === overlay) closeMisTurnos(); } });
  const box = el('div', { class: 'modal-box' },
    el('div', { class: 'modal-header' },
      el('h3', {}, 'Mis turnos'),
      el('button', { class: 'modal-close', onclick: closeMisTurnos }, '✕')
    )
  );

  const searchField = el('div', { class: 'field' },
    el('label', { class: 'field-label' }, 'Ingresá tu teléfono para ver tus turnos'),
    el('div', { class: 'phone-row' },
      el('div', { class: 'phone-code' }, '+54'),
      el('input', { type: 'tel', id: 'misTurnosTelefono', placeholder: '2611234567', value: state.telefono })
    )
  );
  box.appendChild(searchField);
  box.appendChild(el('button', { class: 'btn btn-primary', style: 'width:100%;margin-bottom:14px', onclick: buscarMisTurnos }, 'Buscar'));

  const resultsBox = el('div', { id: 'misTurnosResults' });
  box.appendChild(resultsBox);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  $('#modalMisTurnos').appendChild(overlay);

  if (state.telefono) buscarMisTurnos();
}

function closeMisTurnos() {
  $('#modalMisTurnos').innerHTML = '';
}

async function buscarMisTurnos() {
  const tel = $('#misTurnosTelefono').value.trim();
  const resultsBox = $('#misTurnosResults');
  if (!/^\d{6,12}$/.test(tel)) {
    resultsBox.innerHTML = '';
    resultsBox.appendChild(el('div', { class: 'empty-note' }, 'Ingresá un teléfono válido.'));
    return;
  }
  resultsBox.innerHTML = '<div class="empty-note">Buscando...</div>';
  try {
    const turnos = await api(`/turnos/cliente/${tel}`);
    resultsBox.innerHTML = '';
    if (turnos.length === 0) {
      resultsBox.appendChild(el('div', { class: 'empty-state' }, 'No encontramos turnos para este teléfono.'));
      return;
    }
    turnos.forEach(t => {
      const canCancel = !['completado', 'cancelado', 'no_show'].includes(t.estado);
      const item = el('div', { class: 'turno-item' },
        el('div', { class: 'turno-item-top' },
          el('div', {},
            el('h4', {}, t.servicio_nombre),
            el('div', { class: 'fecha-hora' }, `${t.fecha} · ${t.hora_inicio}hs · ${t.sector_nombre}`)
          ),
          el('span', { class: `badge ${t.estado}` }, badgeLabel(t.estado))
        )
      );
      if (canCancel) {
        item.appendChild(el('button', {
          class: 'btn-cancel-turno', onclick: async () => {
            if (!confirm('¿Confirmás que querés cancelar este turno?')) return;
            try {
              await api(`/turnos/${t.id}/cancelar`, { method: 'PUT', body: JSON.stringify({ telefono: tel }) });
              buscarMisTurnos();
            } catch (e) { alert(e.message); }
          }
        }, 'Cancelar turno'));
      }
      resultsBox.appendChild(item);
    });
  } catch (e) {
    resultsBox.innerHTML = '';
    resultsBox.appendChild(el('div', { class: 'empty-note' }, 'Error al buscar turnos.'));
  }
}

$('#btnMisTurnos').addEventListener('click', openMisTurnos);

// ---------------- Init ----------------
renderProgress();
render();
