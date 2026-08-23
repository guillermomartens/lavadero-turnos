const ReportesPage = {
  desde: '',
  hasta: '',

  async render() {
    const hoy = new Date();
    const hace30 = new Date(hoy); hace30.setDate(hace30.getDate() - 29);
    if (!this.hasta) this.hasta = hoy.toISOString().slice(0, 10);
    if (!this.desde) this.desde = hace30.toISOString().slice(0, 10);

    const main = $('#mainArea');
    main.innerHTML = '';
    main.appendChild(el('div', { class: 'page-header' },
      el('div', {},
        el('h1', {}, 'Reportes'),
        el('div', { class: 'sub' }, 'Desempeño del lavadero en el período seleccionado.')
      )
    ));

    main.appendChild(el('div', { class: 'toolbar' },
      el('label', { style: 'font-size:.82rem;font-weight:600' }, 'Desde'),
      el('input', { type: 'date', value: this.desde, onchange: (e) => { this.desde = e.target.value; this.load(); } }),
      el('label', { style: 'font-size:.82rem;font-weight:600' }, 'Hasta'),
      el('input', { type: 'date', value: this.hasta, onchange: (e) => { this.hasta = e.target.value; this.load(); } })
    ));

    main.appendChild(el('div', { id: 'reportesBody' }, 'Cargando...'));
    await this.load();
  },

  async load() {
    const body = $('#reportesBody');
    if (!body) return;
    try {
      const data = await api(`/admin/reportes/resumen?desde=${this.desde}&hasta=${this.hasta}`);
      this.renderData(data);
    } catch (e) {
      body.innerHTML = '';
      body.appendChild(el('div', { class: 'empty-state' }, 'Error al cargar reportes.'));
    }
  },

  renderData(data) {
    const body = $('#reportesBody');
    body.innerHTML = '';

    const kpis = el('div', { class: 'kpi-grid' },
      this.kpi('Turnos totales', data.totales.total_turnos || 0),
      this.kpi('Completados', data.totales.completados || 0),
      this.kpi('Cancelados', data.totales.cancelados || 0),
      this.kpi('Ingresos cobrados', money(data.totales.ingresos_confirmados)),
      this.kpi('Ingresos potenciales', money(data.totales.ingresos_potenciales))
    );
    body.appendChild(kpis);

    const twoCol = el('div', { class: 'two-col' });

    // Grafico por dia
    const diaCard = el('div', { class: 'card' }, el('h3', { style: 'margin-bottom:6px' }, 'Turnos por día'));
    if (data.porDia.length === 0) {
      diaCard.appendChild(el('div', { class: 'empty-state' }, 'Sin datos en este período.'));
    } else {
      const max = Math.max(...data.porDia.map(d => d.cantidad), 1);
      const bars = el('div', { class: 'chart-bars' });
      data.porDia.forEach(d => {
        const h = Math.max((d.cantidad / max) * 130, 4);
        bars.appendChild(el('div', { class: 'chart-bar-col' },
          el('div', { class: 'chart-bar', style: `height:${h}px`, title: `${d.cantidad} turnos` }),
          el('div', { class: 'chart-bar-label' }, d.fecha.slice(5))
        ));
      });
      diaCard.appendChild(bars);
    }
    twoCol.appendChild(diaCard);

    // Por servicio
    const servCard = el('div', { class: 'card' }, el('h3', { style: 'margin-bottom:10px' }, 'Por servicio'));
    if (data.porServicio.length === 0) {
      servCard.appendChild(el('div', { class: 'empty-state' }, 'Sin datos.'));
    } else {
      data.porServicio.forEach(s => {
        servCard.appendChild(el('div', { class: 'list-row' },
          el('span', {}, s.servicio),
          el('span', {}, el('strong', {}, s.cantidad), ` · ${money(s.ingresos)}`)
        ));
      });
    }
    twoCol.appendChild(servCard);

    body.appendChild(twoCol);

    const twoCol2 = el('div', { class: 'two-col', style: 'margin-top:16px' });

    const sectorCard = el('div', { class: 'card' }, el('h3', { style: 'margin-bottom:10px' }, 'Por sector'));
    if (data.porSector.length === 0) {
      sectorCard.appendChild(el('div', { class: 'empty-state' }, 'Sin datos.'));
    } else {
      data.porSector.forEach(s => {
        sectorCard.appendChild(el('div', { class: 'list-row' }, el('span', {}, s.sector), el('strong', {}, s.cantidad)));
      });
    }
    twoCol2.appendChild(sectorCard);

    const clientesCard = el('div', { class: 'card' }, el('h3', { style: 'margin-bottom:10px' }, 'Mejores clientes'));
    if (data.clientesTop.length === 0) {
      clientesCard.appendChild(el('div', { class: 'empty-state' }, 'Sin datos.'));
    } else {
      data.clientesTop.forEach(c => {
        clientesCard.appendChild(el('div', { class: 'list-row' },
          el('span', {}, `${c.nombre} ${c.apellido}`),
          el('span', {}, el('strong', {}, `${c.visitas} visitas`), ` · ${money(c.gastado)}`)
        ));
      });
    }
    twoCol2.appendChild(clientesCard);

    body.appendChild(twoCol2);
  },

  kpi(label, value) {
    return el('div', { class: 'kpi-card' },
      el('div', { class: 'kpi-label' }, label),
      el('div', { class: 'kpi-value accent' }, String(value))
    );
  }
};
