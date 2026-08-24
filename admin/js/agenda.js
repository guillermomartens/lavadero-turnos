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
        el('th', {}, 'Categoría'), el('th', {}, 'Servicio'), el('th', {}, 'Sector'), el('th', {}, 'Precio'),
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
        el('td', {}, t.categoria_nombre || '—'),
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
    const sectoresTodos = await api('/admin/catalogo/sectores');
    const serviciosTodos = await api('/admin/catalogo/servicios'); // cada uno con .categorias[]

    const servicioBox = el('div', { id: 'ntServicioBox' },
      el('div', { class: 'empty-note', style: 'color:#6C8C8C;font-size:.85rem' }, 'Elegí primero una categoría.')
    );
    const sectorBox = el('div', { id: 'ntSectorBox' });

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
      el('div', { class: 'field' }, el('label', {}, 'Categoría'),
        el('select', {
          id: 'ntCategoria',
          onchange: (e) => this.actualizarServiciosYSectoresNuevoTurno(e.target.value, serviciosTodos, sectoresTodos)
        },
          el('option', { value: '' }, 'Seleccione...'),
          ...categorias.map(c => el('option', { value: c.id }, c.nombre))
        )),
      el('div', { class: 'field' }, el('label', {}, 'Servicio'), servicioBox),
      el('div', { class: 'field' }, el('label', {}, 'Sector'), sectorBox),
      el('div', { class: 'field-row' },
        el('div', { class: 'field' }, el('label', {}, 'Fecha'), el('input', { type: 'date', id: 'ntFecha', value: this.fecha })),
        el('div', { class: 'field' }, el('label', {}, 'Hora'), el('input', { type: 'time', id: 'ntHora' }))
      ),
      el('div', { id: 'ntError' }),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
        el('button', {
          class: 'btn btn-primary', onclick: async () => {
            const errBox = $('#ntError');
            errBox.innerHTML = '';
            const categoriaId = $('#ntCategoria').value;
            const servicioSelect = $('#ntServicioSelect');
            const sectorSelect = $('#ntSectorSelect');
            if (!categoriaId || !servicioSelect || !servicioSelect.value || !sectorSelect || !sectorSelect.value) {
              errBox.appendChild(el('div', { class: 'login-error' }, 'Completá categoría, servicio y sector.'));
              return;
            }
            try {
              await api('/admin/turnos', {
                method: 'POST',
                body: JSON.stringify({
                  nombre: $('#ntNombre').value, apellido: $('#ntApellido').value,
                  telefono: $('#ntTelefono').value, email: $('#ntEmail').value || null,
                  vehiculo: { tipo: $('#ntVehiculoTipo').value, marca: $('#ntMarca').value },
                  servicio_id: servicioSelect.value, categoria_id: categoriaId, sector_id: sectorSelect.value,
                  fecha: $('#ntFecha').value, hora_inicio: $('#ntHora').value
                })
              });
              toast('Turno creado.');
              closeModal();
              this.load();
            } catch (e) { errBox.innerHTML = ''; errBox.appendChild(el('div', { class: 'login-error' }, e.message)); }
          }
        }, 'Guardar turno')
      )
    );
    openModal(form);
  },

  actualizarServiciosYSectoresNuevoTurno(categoriaId, serviciosTodos, sectoresTodos) {
    const servicioBox = $('#ntServicioBox');
    const sectorBox = $('#ntSectorBox');
    servicioBox.innerHTML = '';
    sectorBox.innerHTML = '';

    if (!categoriaId) {
      servicioBox.appendChild(el('div', { class: 'empty-note', style: 'color:#6C8C8C;font-size:.85rem' }, 'Elegí primero una categoría.'));
      return;
    }

    // Servicios que tienen precio asignado para esta categoría
    const serviciosDeCategoria = serviciosTodos
      .map(s => {
        const asociacion = (s.categorias || []).find(c => String(c.categoria_id) === String(categoriaId));
        return asociacion ? { id: s.id, nombre: s.nombre, precio: asociacion.precio } : null;
      })
      .filter(Boolean);

    servicioBox.appendChild(
      el('select', { id: 'ntServicioSelect' },
        el('option', { value: '' }, 'Seleccione...'),
        ...serviciosDeCategoria.map(s => el('option', { value: s.id }, `${s.nombre} - ${money(s.precio)}`))
      )
    );

    const sectoresDeCategoria = sectoresTodos.filter(s => String(s.categoria_id) === String(categoriaId));
    sectorBox.appendChild(
      el('select', { id: 'ntSectorSelect' },
        el('option', { value: '' }, 'Seleccione...'),
        ...sectoresDeCategoria.map(s => el('option', { value: s.id }, s.nombre))
      )
    );
  }
};
