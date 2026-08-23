const ServiciosPage = {
  tab: 'servicios',
  categorias: [],
  servicios: [],

  async render() {
    const main = $('#mainArea');
    main.innerHTML = '';
    main.appendChild(el('div', { class: 'page-header' },
      el('div', {},
        el('h1', {}, 'Servicios y categorías'),
        el('div', { class: 'sub' }, 'Definí qué se ofrece y a qué precio.')
      ),
      el('button', {
        class: 'btn btn-primary',
        onclick: () => this.tab === 'servicios' ? this.openServicioForm() : this.openCategoriaForm()
      }, this.tab === 'servicios' ? '+ Nuevo servicio' : '+ Nueva categoría')
    ));

    const tabs = el('div', { class: 'tabs' },
      el('div', { class: `tab ${this.tab === 'servicios' ? 'active' : ''}`, onclick: () => { this.tab = 'servicios'; this.render(); } }, 'Servicios'),
      el('div', { class: `tab ${this.tab === 'categorias' ? 'active' : ''}`, onclick: () => { this.tab = 'categorias'; this.render(); } }, 'Categorías')
    );
    main.appendChild(tabs);

    const card = el('div', { class: 'card', id: 'servPageCard' }, 'Cargando...');
    main.appendChild(card);

    this.categorias = await api('/admin/catalogo/categorias');
    if (this.tab === 'servicios') {
      this.servicios = await api('/admin/catalogo/servicios');
      this.renderServicios();
    } else {
      this.renderCategorias();
    }
  },

  renderServicios() {
    const card = $('#servPageCard');
    card.innerHTML = '';
    if (this.servicios.length === 0) {
      card.appendChild(el('div', { class: 'empty-state' }, 'No hay servicios cargados todavía.'));
      return;
    }
    const table = el('table', {},
      el('thead', {}, el('tr', {},
        el('th', {}, 'Servicio'), el('th', {}, 'Categoría'), el('th', {}, 'Duración'),
        el('th', {}, 'Precio'), el('th', {}, 'Estado'), el('th', {}, '')
      ))
    );
    const tbody = el('tbody');
    this.servicios.forEach(s => {
      tbody.appendChild(el('tr', {},
        el('td', {}, el('strong', {}, s.nombre), el('div', { style: 'font-size:.76rem;color:#6C8C8C' }, s.descripcion || '')),
        el('td', {}, s.categoria_nombre),
        el('td', {}, `${s.duracion_min} min`),
        el('td', {}, money(s.precio)),
        el('td', {}, s.activo ? el('span', { class: 'badge confirmado' }, 'Activo') : el('span', { class: 'badge cancelado' }, 'Inactivo')),
        el('td', {},
          el('button', { class: 'btn btn-secondary btn-sm', style: 'margin-right:6px', onclick: () => this.openServicioForm(s) }, 'Editar'),
          el('button', { class: 'btn btn-danger btn-sm', onclick: () => this.eliminarServicio(s.id) }, 'Eliminar')
        )
      ));
    });
    table.appendChild(tbody);
    card.appendChild(table);
  },

  renderCategorias() {
    const card = $('#servPageCard');
    card.innerHTML = '';
    if (this.categorias.length === 0) {
      card.appendChild(el('div', { class: 'empty-state' }, 'No hay categorías cargadas todavía.'));
      return;
    }
    const table = el('table', {},
      el('thead', {}, el('tr', {}, el('th', {}, 'Nombre'), el('th', {}, 'Orden'), el('th', {}, 'Estado'), el('th', {}, '')))
    );
    const tbody = el('tbody');
    this.categorias.forEach(c => {
      tbody.appendChild(el('tr', {},
        el('td', {}, c.nombre),
        el('td', {}, c.orden),
        el('td', {}, c.activo ? el('span', { class: 'badge confirmado' }, 'Activa') : el('span', { class: 'badge cancelado' }, 'Inactiva')),
        el('td', {},
          el('button', { class: 'btn btn-secondary btn-sm', style: 'margin-right:6px', onclick: () => this.openCategoriaForm(c) }, 'Editar'),
          el('button', { class: 'btn btn-danger btn-sm', onclick: () => this.eliminarCategoria(c.id) }, 'Eliminar')
        )
      ));
    });
    table.appendChild(tbody);
    card.appendChild(table);
  },

  openServicioForm(s = null) {
    const form = el('div', {},
      el('h3', {}, s ? 'Editar servicio' : 'Nuevo servicio'),
      el('div', { class: 'field' }, el('label', {}, 'Nombre'), el('input', { id: 'svNombre', value: s ? s.nombre : '' })),
      el('div', { class: 'field' }, el('label', {}, 'Descripción'), el('input', { id: 'svDesc', value: s ? (s.descripcion || '') : '' })),
      el('div', { class: 'field' }, el('label', {}, 'Categoría'),
        el('select', { id: 'svCategoria' },
          ...this.categorias.map(c => el('option', { value: c.id, ...(s && s.categoria_id == c.id ? { selected: 'selected' } : {}) }, c.nombre))
        )),
      el('div', { class: 'field-row' },
        el('div', { class: 'field' }, el('label', {}, 'Duración (min)'), el('input', { type: 'number', id: 'svDuracion', value: s ? s.duracion_min : 30 })),
        el('div', { class: 'field' }, el('label', {}, 'Precio ($)'), el('input', { type: 'number', id: 'svPrecio', value: s ? s.precio : 0 }))
      ),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
        el('button', {
          class: 'btn btn-primary', onclick: async () => {
            const payload = {
              nombre: $('#svNombre').value, descripcion: $('#svDesc').value,
              categoria_id: $('#svCategoria').value, duracion_min: Number($('#svDuracion').value),
              precio: Number($('#svPrecio').value)
            };
            try {
              if (s) await api(`/admin/catalogo/servicios/${s.id}`, { method: 'PUT', body: JSON.stringify(payload) });
              else await api('/admin/catalogo/servicios', { method: 'POST', body: JSON.stringify(payload) });
              toast('Servicio guardado.');
              closeModal();
              this.render();
            } catch (e) { toast(e.message, true); }
          }
        }, 'Guardar')
      )
    );
    openModal(form);
  },

  async eliminarServicio(id) {
    if (!confirm('¿Eliminar este servicio?')) return;
    try { await api(`/admin/catalogo/servicios/${id}`, { method: 'DELETE' }); toast('Servicio eliminado.'); this.render(); }
    catch (e) { toast(e.message, true); }
  },

  openCategoriaForm(c = null) {
    const form = el('div', {},
      el('h3', {}, c ? 'Editar categoría' : 'Nueva categoría'),
      el('div', { class: 'field' }, el('label', {}, 'Nombre'), el('input', { id: 'catNombre', value: c ? c.nombre : '' })),
      el('div', { class: 'field' }, el('label', {}, 'Orden'), el('input', { type: 'number', id: 'catOrden', value: c ? c.orden : 0 })),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
        el('button', {
          class: 'btn btn-primary', onclick: async () => {
            const payload = { nombre: $('#catNombre').value, orden: Number($('#catOrden').value) };
            try {
              if (c) await api(`/admin/catalogo/categorias/${c.id}`, { method: 'PUT', body: JSON.stringify(payload) });
              else await api('/admin/catalogo/categorias', { method: 'POST', body: JSON.stringify(payload) });
              toast('Categoría guardada.');
              closeModal();
              this.render();
            } catch (e) { toast(e.message, true); }
          }
        }, 'Guardar')
      )
    );
    openModal(form);
  },

  async eliminarCategoria(id) {
    if (!confirm('¿Eliminar esta categoría? También se eliminarán sus servicios.')) return;
    try { await api(`/admin/catalogo/categorias/${id}`, { method: 'DELETE' }); toast('Categoría eliminada.'); this.render(); }
    catch (e) { toast(e.message, true); }
  }
};
