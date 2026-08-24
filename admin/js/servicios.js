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
        el('th', {}, 'Servicio'), el('th', {}, 'Categorías y precios'), el('th', {}, 'Duración'),
        el('th', {}, 'Estado'), el('th', {}, '')
      ))
    );
    const tbody = el('tbody');
    this.servicios.forEach(s => {
      const catChips = (s.categorias || []).length > 0
        ? el('div', { style: 'display:flex;flex-wrap:wrap;gap:5px' },
            ...s.categorias.map(c => el('span', { class: 'badge confirmado' }, `${c.categoria_nombre}: ${money(c.precio)}`))
          )
        : el('span', { style: 'color:#B3311F;font-size:.78rem;font-weight:600' }, '⚠ Sin categorías asignadas');
      tbody.appendChild(el('tr', {},
        el('td', {}, el('strong', {}, s.nombre), el('div', { style: 'font-size:.76rem;color:#6C8C8C' }, s.descripcion || '')),
        el('td', {}, catChips),
        el('td', {}, `${s.duracion_min} min`),
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
    // Mapa rápido: categoria_id -> precio actual (si el servicio ya está asociado a ella)
    const preciosActuales = {};
    if (s && s.categorias) {
      s.categorias.forEach(c => { preciosActuales[c.categoria_id] = { precio: c.precio, asociacionId: c.id }; });
    }

    const filasCategorias = this.categorias.map(c => {
      const yaAsociada = preciosActuales[c.id];
      const checkboxId = `svCat_${c.id}`;
      const precioId = `svCatPrecio_${c.id}`;
      const check = el('input', {
        type: 'checkbox', id: checkboxId, ...(yaAsociada ? { checked: 'checked' } : {}),
        onchange: (e) => { $(`#${precioId}`).disabled = !e.target.checked; }
      });
      const precioInput = el('input', {
        type: 'number', id: precioId, placeholder: 'Precio',
        value: yaAsociada ? yaAsociada.precio : '', ...(yaAsociada ? {} : { disabled: 'disabled' })
      });
      return el('div', { class: 'field-row', style: 'align-items:center;margin-bottom:8px' },
        el('label', { style: 'display:flex;align-items:center;gap:8px;margin:0' }, check, c.nombre),
        precioInput
      );
    });

    const form = el('div', {},
      el('h3', {}, s ? 'Editar servicio' : 'Nuevo servicio'),
      el('div', { class: 'field' }, el('label', {}, 'Nombre'), el('input', { id: 'svNombre', value: s ? s.nombre : '' })),
      el('div', { class: 'field' }, el('label', {}, 'Descripción'), el('input', { id: 'svDesc', value: s ? (s.descripcion || '') : '' })),
      el('div', { class: 'field' }, el('label', {}, 'Duración (min)'), el('input', { type: 'number', id: 'svDuracion', value: s ? s.duracion_min : 30 })),
      el('div', { class: 'field' },
        el('label', {}, 'Categorías donde se ofrece (con su precio)'),
        el('div', { style: 'font-size:.76rem;color:#6C8C8C;margin-bottom:8px' }, 'Marcá en qué categorías está disponible este servicio. Podés ponerle un precio distinto en cada una.'),
        ...filasCategorias
      ),
      el('div', { id: 'svError' }),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
        el('button', {
          class: 'btn btn-primary', onclick: async () => {
            const errBox = $('#svError');
            errBox.innerHTML = '';

            const categoriasSeleccionadas = this.categorias
              .filter(c => $(`#svCat_${c.id}`).checked)
              .map(c => ({
                categoria_id: c.id,
                precio: Number($(`#svCatPrecio_${c.id}`).value) || 0,
                asociacionId: preciosActuales[c.id] ? preciosActuales[c.id].asociacionId : null
              }));

            if (categoriasSeleccionadas.length === 0) {
              errBox.appendChild(el('div', { class: 'login-error' }, 'Marcá al menos una categoría para este servicio.'));
              return;
            }

            const datosServicio = {
              nombre: $('#svNombre').value,
              descripcion: $('#svDesc').value,
              duracion_min: Number($('#svDuracion').value)
            };

            try {
              let servicioId;
              if (s) {
                servicioId = s.id;
                await api(`/admin/catalogo/servicios/${s.id}`, { method: 'PUT', body: JSON.stringify(datosServicio) });

                // Actualizar asociaciones: crear nuevas, actualizar precios, borrar las que se desmarcaron
                const idsSeleccionados = categoriasSeleccionadas.map(c => c.categoria_id);
                const asociacionesABorrar = (s.categorias || []).filter(c => !idsSeleccionados.includes(c.categoria_id));
                for (const a of asociacionesABorrar) {
                  await api(`/admin/catalogo/servicio-categorias/${a.id}`, { method: 'DELETE' });
                }
                for (const c of categoriasSeleccionadas) {
                  if (c.asociacionId) {
                    await api(`/admin/catalogo/servicio-categorias/${c.asociacionId}`, { method: 'PUT', body: JSON.stringify({ precio: c.precio }) });
                  } else {
                    await api('/admin/catalogo/servicio-categorias', {
                      method: 'POST',
                      body: JSON.stringify({ servicio_id: servicioId, categoria_id: c.categoria_id, precio: c.precio })
                    });
                  }
                }
              } else {
                const nuevo = await api('/admin/catalogo/servicios', {
                  method: 'POST',
                  body: JSON.stringify({
                    ...datosServicio,
                    categorias: categoriasSeleccionadas.map(c => ({ categoria_id: c.categoria_id, precio: c.precio }))
                  })
                });
                servicioId = nuevo.id;
              }
              toast('Servicio guardado.');
              closeModal();
              this.render();
            } catch (e) { errBox.innerHTML = ''; errBox.appendChild(el('div', { class: 'login-error' }, e.message)); }
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
