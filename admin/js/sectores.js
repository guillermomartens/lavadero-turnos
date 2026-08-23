const SectoresPage = {
  sectores: [],
  categorias: [],
  horarios: [],
  sectorSeleccionado: null,

  async render() {
    const main = $('#mainArea');
    main.innerHTML = '';
    main.appendChild(el('div', { class: 'page-header' },
      el('div', {},
        el('h1', {}, 'Sectores y horarios'),
        el('div', { class: 'sub' }, 'Boxes, bahías y su disponibilidad semanal.')
      ),
      el('button', { class: 'btn btn-primary', onclick: () => this.openSectorForm() }, '+ Nuevo sector')
    ));

    this.categorias = await api('/admin/catalogo/categorias');
    this.sectores = await api('/admin/catalogo/sectores');

    const twoCol = el('div', { class: 'two-col' });

    const listCard = el('div', { class: 'card' });
    if (this.sectores.length === 0) {
      listCard.appendChild(el('div', { class: 'empty-state' }, 'No hay sectores cargados.'));
    } else {
      const table = el('table', {},
        el('thead', {}, el('tr', {}, el('th', {}, 'Sector'), el('th', {}, 'Categoría'), el('th', {}, 'Capacidad'), el('th', {}, '')))
      );
      const tbody = el('tbody');
      this.sectores.forEach(s => {
        const row = el('tr', {
          style: `cursor:pointer;${this.sectorSeleccionado === s.id ? 'background:var(--foam-dim)' : ''}`,
          onclick: () => { this.sectorSeleccionado = s.id; this.render(); }
        },
          el('td', {}, s.nombre),
          el('td', {}, s.categoria_nombre || '—'),
          el('td', {}, s.capacidad),
          el('td', {},
            el('button', { class: 'btn btn-secondary btn-sm', style: 'margin-right:6px', onclick: (e) => { e.stopPropagation(); this.openSectorForm(s); } }, 'Editar'),
            el('button', { class: 'btn btn-danger btn-sm', onclick: (e) => { e.stopPropagation(); this.eliminarSector(s.id); } }, 'Eliminar')
          )
        );
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      listCard.appendChild(table);
    }
    twoCol.appendChild(listCard);

    const horarioCard = el('div', { class: 'card', id: 'horarioCard' }, 'Seleccioná un sector para ver sus horarios.');
    twoCol.appendChild(horarioCard);

    main.appendChild(twoCol);

    if (this.sectorSeleccionado && this.sectores.find(s => s.id === this.sectorSeleccionado)) {
      await this.renderHorarios();
    } else if (this.sectores.length > 0 && !this.sectorSeleccionado) {
      this.sectorSeleccionado = this.sectores[0].id;
      await this.renderHorarios();
    }
  },

  async renderHorarios() {
    const card = $('#horarioCard');
    const sector = this.sectores.find(s => s.id === this.sectorSeleccionado);
    if (!card || !sector) return;

    this.horarios = await api(`/admin/catalogo/horarios?sector_id=${this.sectorSeleccionado}`);

    card.innerHTML = '';
    card.appendChild(el('h3', { style: 'margin-bottom:12px' }, `Horarios · ${sector.nombre}`));

    DIAS.forEach((dia, i) => {
      const delDia = this.horarios.filter(h => h.dia_semana === i);
      const row = el('div', { class: 'list-row' },
        el('span', {}, el('strong', {}, dia)),
        el('span', {},
          ...delDia.map(h => el('span', { class: 'day-pill' }, `${h.hora_inicio}–${h.hora_fin}`,
            el('button', { onclick: async () => { await api(`/admin/catalogo/horarios/${h.id}`, { method: 'DELETE' }); this.renderHorarios(); } }, '✕')
          )),
          el('button', { class: 'btn btn-secondary btn-sm', onclick: () => this.openHorarioForm(i) }, '+ Agregar')
        )
      );
      card.appendChild(row);
    });
  },

  openHorarioForm(dia) {
    const form = el('div', {},
      el('h3', {}, `Agregar horario · ${DIAS[dia]}`),
      el('div', { class: 'field-row' },
        el('div', { class: 'field' }, el('label', {}, 'Desde'), el('input', { type: 'time', id: 'hIni', value: '08:00' })),
        el('div', { class: 'field' }, el('label', {}, 'Hasta'), el('input', { type: 'time', id: 'hFin', value: '18:00' }))
      ),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
        el('button', {
          class: 'btn btn-primary', onclick: async () => {
            try {
              await api('/admin/catalogo/horarios', {
                method: 'POST',
                body: JSON.stringify({ sector_id: this.sectorSeleccionado, dia_semana: dia, hora_inicio: $('#hIni').value, hora_fin: $('#hFin').value })
              });
              toast('Horario agregado.');
              closeModal();
              this.renderHorarios();
            } catch (e) { toast(e.message, true); }
          }
        }, 'Guardar')
      )
    );
    openModal(form);
  },

  openSectorForm(s = null) {
    const form = el('div', {},
      el('h3', {}, s ? 'Editar sector' : 'Nuevo sector'),
      el('div', { class: 'field' }, el('label', {}, 'Nombre'), el('input', { id: 'secNombre', value: s ? s.nombre : '' })),
      el('div', { class: 'field' }, el('label', {}, 'Categoría'),
        el('select', { id: 'secCategoria' },
          el('option', { value: '' }, 'Sin categoría'),
          ...this.categorias.map(c => el('option', { value: c.id, ...(s && s.categoria_id == c.id ? { selected: 'selected' } : {}) }, c.nombre))
        )),
      el('div', { class: 'field' }, el('label', {}, 'Capacidad (turnos simultáneos)'), el('input', { type: 'number', id: 'secCapacidad', value: s ? s.capacidad : 1 })),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
        el('button', {
          class: 'btn btn-primary', onclick: async () => {
            const payload = { nombre: $('#secNombre').value, categoria_id: $('#secCategoria').value || null, capacidad: Number($('#secCapacidad').value) };
            try {
              if (s) await api(`/admin/catalogo/sectores/${s.id}`, { method: 'PUT', body: JSON.stringify(payload) });
              else await api('/admin/catalogo/sectores', { method: 'POST', body: JSON.stringify(payload) });
              toast('Sector guardado.');
              closeModal();
              this.render();
            } catch (e) { toast(e.message, true); }
          }
        }, 'Guardar')
      )
    );
    openModal(form);
  },

  async eliminarSector(id) {
    if (!confirm('¿Eliminar este sector y sus horarios asociados?')) return;
    try {
      await api(`/admin/catalogo/sectores/${id}`, { method: 'DELETE' });
      if (this.sectorSeleccionado === id) this.sectorSeleccionado = null;
      toast('Sector eliminado.');
      this.render();
    } catch (e) { toast(e.message, true); }
  }
};
