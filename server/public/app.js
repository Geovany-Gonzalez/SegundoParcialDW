// En Render, frontend y API comparten host
const api = '';

let cliente = null;
const $ = (s) => document.querySelector(s);
const ordenesDiv = $('#ordenes');

async function req(path, opts = {}) {
  const r = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  const t = await r.text();
  let d = {};
  try { d = t ? JSON.parse(t) : {}; } catch { d = {}; }
  if (!r.ok) throw new Error(d.error || 'Error');
  return d;
}

function nextEstado(est) {
  if (est === 'pending') return 'preparing';
  if (est === 'preparing') return 'delivered';
  return null;
}

function renderOrdenes(list) {
  if (!Array.isArray(list) || list.length === 0) {
    ordenesDiv.innerHTML = '<p class="msg">Sin órdenes</p>';
    return;
  }
  ordenesDiv.innerHTML = '';
  for (const o of list) {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <div>
        <strong>${o.plato_nombre}</strong>
        <span class="badge">${o.estado}</span><br/>
        <small>${o.notas || ''}</small>
      </div>
      <div class="actions"></div>
    `;
    const actions = div.querySelector('.actions');
    const next = nextEstado(o.estado);
    if (next) {
      const btn = document.createElement('button');
      btn.className = 'btn small';
      btn.textContent = 'Avanzar → ' + next;
      btn.onclick = async () => {
        try {
          await req(`/ordenes/${o.id}/estado`, {
            method: 'PUT',
            body: JSON.stringify({ estado: next })
          });
          await cargarOrdenes();
        } catch (e) {
          alert(e.message);
        }
      };
      actions.appendChild(btn);
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
$('#form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await req('/clientes/registrar', {
      method: 'POST',
      body: JSON.stringify({
        nombre: $('#reg-nombre').value.trim(),
        email: $('#reg-email').value.trim(),
        telefono: $('#reg-tel').value.trim(),
        contrasena: $('#reg-pass').value
      })
    });
    $('#reg-msg').textContent = 'Registrado: ' + data.nombre;
  } catch (err) {
    $('#reg-msg').textContent = err.message;
  }
});

// Login
$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    cliente = await req('/clientes/login', {
      method: 'POST',
      body: JSON.stringify({
        email: $('#log-email').value.trim(),
        contrasena: $('#log-pass').value
      })
    });
    $('#login-msg').textContent = 'Hola, ' + cliente.nombre;
    await cargarOrdenes();
  } catch (err) {
    $('#login-msg').textContent = err.message;
  }
});

// Crear orden
$('#form-orden').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!cliente) { $('#orden-msg').textContent = 'Primero inicia sesión'; return; }
  try {
    const data = await req('/ordenes', {
      method: 'POST',
      body: JSON.stringify({
        cliente_id: cliente.id,
        plato_nombre: $('#plato').value.trim(),
        notas: $('#notas').value.trim() || null
      })
    });
    $('#orden-msg').textContent = 'Orden #' + data.id + ' creada';
    $('#plato').value = '';
    $('#notas').value = '';
    await cargarOrdenes();
  } catch (err) {
    $('#orden-msg').textContent = err.message;
  }
});
