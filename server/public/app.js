// En Render, frontend y API comparten host
const api = '';

let cliente = null;
const $ = (s) => document.querySelector(s);
const ordenesDiv = $('#ordenes');

const EST_ES = { pending: 'pendiente', preparing: 'preparando', delivered: 'entregado' };
const NEXT = {
  pending:   { value: 'preparing', label: 'Preparando' },
  preparing: { value: 'delivered', label: 'Entregado' }
};

async function req(path, opts = {}) {
  const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const t = await r.text(); let d = {};
  try { d = t ? JSON.parse(t) : {}; } catch { d = {}; }
  if (!r.ok) throw new Error(d.error || 'Error');
  return d;
}

function renderOrdenes(list) {
  if (!Array.isArray(list) || list.length === 0) {
    ordenesDiv.innerHTML = '<p class="msg">Sin órdenes</p>'; return;
  }
  ordenesDiv.innerHTML = '';
  for (const o of list) {
    const div = document.createElement('div');
    div.className = 'item';
    const estadoEs = EST_ES[o.estado] || o.estado;
    div.innerHTML = `
      <div>
        <strong>${o.plato_nombre}</strong>
        <span class="badge">${estadoEs}</span><br/>
        <small>${o.notas || ''}</small>
      </div>
      <div class="actions"></div>
    `;
    const next = NEXT[o.estado];
    if (next) {
      const btn = document.createElement('button');
      btn.className = 'btn small';
      btn.textContent = 'Avanzar → ' + next.label;
      btn.onclick = async () => {
        try {
          await req(`/ordenes/${o.id}/estado`, {
            method: 'PUT',
            body: JSON.stringify({ estado: next.value })
          });
          await cargarOrdenes();
        } catch (e) { alert(e.message); }
      };
      div.querySelector('.actions').appendChild(btn);
    }
    ordenesDiv.appendChild(div);
  }
}

async function cargarOrdenes() {
  if (!cliente) return;
  const list = await req(`/ordenes/${cliente.id}`);
  renderOrdenes(list);
}

/* === Eventos === */

// Registro
document.getElementById('form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await req('/clientes/registrar', {
      method: 'POST',
      body: JSON.stringify({
        nombre: document.getElementById('reg-nombre').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        telefono: document.getElementById('reg-tel').value.trim(),
        contrasena: document.getElementById('reg-pass').value
      })
    });
    document.getElementById('reg-msg').textContent = 'Registrado: ' + data.nombre;
  } catch (err) {
    document.getElementById('reg-msg').textContent = err.message;
  }
});

// Login
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    cliente = await req('/clientes/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('log-email').value.trim(),
        contrasena: document.getElementById('log-pass').value
      })
    });
    document.getElementById('login-msg').textContent = 'Hola, ' + cliente.nombre;
    await cargarOrdenes();
  } catch (err) {
    document.getElementById('login-msg').textContent = err.message;
  }
});

// Crear orden
document.getElementById('form-orden').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!cliente) { document.getElementById('orden-msg').textContent = 'Primero inicia sesión'; return; }
  try {
    const data = await req('/ordenes', {
      method: 'POST',
      body: JSON.stringify({
        cliente_id: cliente.id,
        plato_nombre: document.getElementById('plato').value.trim(),
        notas: document.getElementById('notas').value.trim() || null
      })
    });
    document.getElementById('orden-msg').textContent = 'Orden #' + data.id + ' creada';
    document.getElementById('plato').value = '';
    document.getElementById('notas').value = '';
    await cargarOrdenes();
  } catch (err) {
    document.getElementById('orden-msg').textContent = err.message;
  }
});
