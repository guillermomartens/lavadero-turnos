const AgendaPage = {
  fecha: todayISO(),
  estadoFiltro: '',
  sectorFiltro: '',
  sectores: [],
  turnos: [],

  async render() {
    const main = $('#mainArea');
    main.innerHTML = '';

    main.appendChild(el('div', { class: 'page-header' },
      el('div', {},
        el('h1', {}, 'Agenda de turnos'),
        el('div', { class: 'sub' }, 'Visualizá y gestioná los turnos del día.')
      ),
      el('button', { class: 'btn btn-primary', onclick: () => this.openNuevoTurno() }, '+ Nuevo turno')
    ));

    if (this.sectores.length === 0) {
      try { this.sectores = await api('/admin/catalogo/sectores'); } catch (e) { /* noop */ }
    }

    const toolbar = el('div', { class: 'toolbar' },
      el('input', {
        type: 'date', value: this.fecha,
        onchange: (e) => { this.fecha = e.target.value; this.load(); }
      }),
      el('select', { onchange: (e) => { this.estadoFiltro = e.target.value; this.load(); } },
        el('option', { value: '' }, 'Todos los estados'),
        ...Object.entries(ESTADO_LABELS).map(([k, v]) => el('option', { value: k }, v))
      ),
      el('select', { onchange: (e) => { this.sectorFiltro = e.target.value; this.load(); } },
        el('option', { value: '' }, 'Todos los sectores'),
        ...this.sectores.map(s => el('option', { value: s.id }, s.nombre))
      ),
      el('button', { class: 'btn btn-secondary btn-sm', onclick: () => this.load() }, '↻ Actualizar')
    );
    main.appendChild(toolbar);

    const tableCard = el('div', { class: 'card', id: 'agendaTableCard' }, 'Cargando...');
    main.appendChild(tableCard);

    await this.load();
  },

  async load() {
    const card = $('#agendaTableCard');
    if (!card) return;
    try {
      let query = `?fecha=${this.fecha}`;
      if (this.estadoFiltro) query += `&estado=${this.estadoFiltro}`;
      if (this.sectorFiltro) query += `&sector_id=${this.sectorFiltro}`;
      this.turnos = await api('/admin/turnos' + query);
      this.renderTable();
    } catch (e) {
      card.innerHTML = '';
      card.appendChild(el('div', { class: 'empty-state' }, 'Error al cargar la agenda.'));
    }
  },

  renderTable() {
    const card = $('#agendaTableCard');
    card.innerHTML = '';
    if (this.turnos.length === 0) {
      card.appendChild(el('div', { class: 'empty-state' }, 'No hay turnos para los filtros seleccionados.'));
      return;
    }

    const table = el('table', {},
      el('thead', {}, el('tr', {},
        el('th', {}, 'Hora'), el('th', {}, 'Cliente'), el('th', {}, 'Vehículo'),
        el('th', {}, 'Servicio'), el('th', {}, 'Sector'), el('th', {}, 'Precio'),
        el('th', {}, 'Pago'), el('th', {}, 'Estado'), el('th', {}, '')
      ))
    );
    const tbody = el('tbody');

    this.turnos.forEach(t => {
      const estadoSelect = el('select', {
        class: 'estado-select',
        onchange: async (e) => {
          try {
            await api(`/admin/turnos/${t.id}`, { method: 'PUT', body: JSON.stringify({ estado: e.target.value }) });
            toast('Estado actualizado.');
            this.load();
          } catch (err) { toast(err.message, true); }
        }
      }, ...Object.entries(ESTADO_LABELS).map(([k, v]) =>
        el('option', { value: k, ...(t.estado === k ? { selected: 'selected' } : {}) }, v)
      ));

      const pagoBadge = t.estado_pago === 'pagado'
        ? el('span', { class: 'badge pagado' }, 'Pagado')
        : el('button', {
            class: 'btn btn-secondary btn-sm', onclick: async () => {
              try {
                await api(`/admin/turnos/${t.id}`, { method: 'PUT', body: JSON.stringify({ estado_pago: 'pagado' }) });
                toast('Marcado como pagado.');
                this.load();
              } catch (err) { toast(err.message, true); }
            }
          }, 'Marcar pagado');

      tbody.appendChild(el('tr', {},
        el('td', {}, `${t.hora_inicio}–${t.hora_fin}`),
        el('td', {}, `${t.cliente_nombre} ${t.cliente_apellido}`, el('div', { style: 'font-size:.76rem;color:#6C8C8C' }, t.cliente_telefono)),
        el('td', {}, t.vehiculo_tipo ? `${t.vehiculo_tipo}${t.vehiculo_marca ? ' - ' + t.vehiculo_marca : ''}` : '—'),
        el('td', {}, t.servicio_nombre),
        el('td', {}, t.sector_nombre),
        el('td', {}, money(t.precio)),
        el('td', {}, pagoBadge),
        el('td', {}, estadoSelect),
        el('td', {}, el('button', { class: 'btn btn-danger btn-sm', onclick: () => this.eliminarTurno(t.id) }, 'Eliminar'))
      ));
    });

    table.appendChild(tbody);
    card.appendChild(table);
  },

  async eliminarTurno(id) {
    if (!confirm('¿Eliminar este turno definitivamente?')) return;
    try {
      await api(`/admin/turnos/${id}`, { method: 'DELETE' });
      toast('Turno eliminado.');
      this.load();
    } catch (e) { toast(e.message, true); }
  },

  async openNuevoTurno() {
    const categorias = await api('/admin/catalogo/categorias');
    const servicios = await api('/admin/catalogo/servicios');
    const sectores = await api('/admin/catalogo/sectores');

    const form = el('div', {},
      el('h3', {}, 'Nuevo turno'),
      el('div', { class: 'field-row' },
        el('div', { class: 'field' }, el('label', {}, 'Nombre'), el('input', { id: 'ntNombre' })),
        el('div', { class: 'field' }, el('label', {}, 'Apellido'), el('input', { id: 'ntApellido' }))
      ),
      el('div', { class: 'field-row' },
        el('div', { class: 'field' }, el('label', {}, 'Teléfono'), el('input', { id: 'ntTelefono' })),
        el('div', { class: 'field' }, el('label', {}, 'E-mail'), el('input', { id: 'ntEmail' }))
      ),
      el('div', { class: 'field-row' },
        el('div', { class: 'field' }, el('label', {}, 'Tipo vehículo'),
          el('select', { id: 'ntVehiculoTipo' },
            ...['Auto', 'Camioneta', 'SUV', 'Utilitario', 'Moto', 'Cuatriciclo', 'Bicicleta'].map(v => el('option', { value: v }, v))
          )),
        el('div', { class: 'field' }, el('label', {}, 'Marca'), el('input', { id: 'ntMarca' }))
      ),
      el('div', { class: 'field' }, el('label', {}, 'Servicio'),
        el('select', { id: 'ntServicio' },
          el('option', { value: '' }, 'Seleccione...'),
          ...servicios.map(s => el('option', { value: s.id }, `${s.nombre} (${s.categoria_nombre}) - ${money(s.precio)}`))
        )),
      el('div', { class: 'field' }, el('label', {}, 'Sector'),
        el('select', { id: 'ntSector' },
          el('option', { value: '' }, 'Seleccione...'),
          ...sectores.map(s => el('option', { value: s.id }, s.nombre))
        )),
      el('div', { class: 'field-row' },
        el('div', { class: 'field' }, el('label', {}, 'Fecha'), el('input', { type: 'date', id: 'ntFecha', value: this.fecha })),
        el('div', { class: 'field' }, el('label', {}, 'Hora'), el('input', { type: 'time', id: 'ntHora' }))
      ),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
        el('button', {
          class: 'btn btn-primary', onclick: async () => {
            try {
              await api('/admin/turnos', {
                method: 'POST',
                body: JSON.stringify({
                  nombre: $('#ntNombre').value, apellido: $('#ntApellido').value,
                  telefono: $('#ntTelefono').value, email: $('#ntEmail').value || null,
                  vehiculo: { tipo: $('#ntVehiculoTipo').value, marca: $('#ntMarca').value },
                  servicio_id: $('#ntServicio').value, sector_id: $('#ntSector').value,
                  fecha: $('#ntFecha').value, hora_inicio: $('#ntHora').value
                })
              });
              toast('Turno creado.');
              closeModal();
              this.load();
            } catch (e) { toast(e.message, true); }
          }
        }, 'Guardar turno')
      )
    );
    openModal(form);
  }
};
