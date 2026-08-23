function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  children.flat().forEach(c => {
    if (c === null || c === undefined) return;
    if (typeof c === 'string' || typeof c === 'number') node.appendChild(document.createTextNode(String(c)));
    else node.appendChild(c);
  });
  return node;
}

function money(n) {
  return '$' + Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

const ESTADO_LABELS = {
  pendiente: 'Pendiente', confirmado: 'Confirmado', en_proceso: 'En proceso',
  completado: 'Completado', cancelado: 'Cancelado', no_show: 'No asistió'
};
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_ABR = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function badge(estado) {
  return el('span', { class: `badge ${estado}` }, ESTADO_LABELS[estado] || estado);
}

function openModal(contentNode) {
  const overlay = el('div', {
    class: 'modal-overlay',
    onclick: (e) => { if (e.target === overlay) closeModal(); }
  }, el('div', { class: 'modal-box' }, contentNode));
  $('#modalRoot').innerHTML = '';
  $('#modalRoot').appendChild(overlay);
}
function closeModal() { $('#modalRoot').innerHTML = ''; }

function toast(msg, isError = false) {
  const t = el('div', {
    style: `position:fixed;bottom:20px;right:20px;background:${isError ? '#B3311F' : '#0D3B3E'};color:white;
    padding:12px 18px;border-radius:10px;font-size:.85rem;font-weight:600;z-index:200;box-shadow:0 8px 20px rgba(0,0,0,0.2);`
  }, msg);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
