// En Render, el frontend y la API están en el mismo host:
const api = '';

let cliente = null;
const $ = (s) => document.querySelector(s);
const ordenesDiv = $('#ordenes');

async function req(path, opts={}){
  const r = await fetch(path, { headers:{'Content-Type':'application/json'}, ...opts });
  const t = await r.text(); let d = {};
  try { d = t ? JSON.parse(t) : {}; } catch { d = {}; }
  if (!r.ok) throw new Error(d.error || 'Error');
  return d;
}
function nextEstado(e){ return e==='pending'?'preparing':(e==='preparing'?'delivered':null); }
function renderOrdenes(list){
  if (!list.length){ ordenesDiv.innerHTML = '<p class="msg">Sin órdenes</p>'; return; }
  ordenesDiv.innerHTML = '';
  for (const o of list){
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <div>
        <strong>${o.plato_nombre}</strong> <span class="badge">${o.estado}</span><br>
        <small>${o.notas || ''}</small>
      </div>
      <div class="actions"></div>`;
    const next = nextEstado(o.estado);
    if (next){
      const btn = document.createElement('button');
      btn.textContent = 'Avanzar → ' + next;
      btn.onclick = async ()=>{ await req(`/ordenes/${o.id}/estado`, { method:'PUT', body: JSON.stringify({ estado: next }) }); cargarOrdenes(); };
      div.querySelector('.actions').appendChild(btn);
    }
    ordenesDiv.appendChild(div);
  }
}

$('#form-register').addEventListener('submit', async (e)=>{
  e.preventDefault();
  try{
    const data = await req('/clientes/registrar', {
      method:'POST',
      body: JSON.stringify({
        nombre: $('#reg-nombre').value.trim(),
        email:  $('#reg-email').value.trim(),
        telefono: $('#reg-tel').value.trim(),
        contrasena: $('#reg-pass').value
      })
    });
    $('#reg-msg').textContent = 'Registrado: ' + data.nombre;
  }catch(err){ $('#reg-msg').textContent = err.message; }
});

$('#form-login').addEventListener('submit', async (e)=>{
  e.preventDefault();
  try{
    cliente = await req('/clientes/login', {
      method:'POST',
      body: JSON.stringify({
        email: $('#log-email').value.trim(),
        contrasena: $('#log-pass').value
      })
    });
    $('#login-msg').textContent = 'Hola, ' + cliente.nombre;
    cargarOrdenes();
  }catch(err){ $('#login-msg').textContent = err.message; }
});

$('#form-orden').addEventListener('submit', async (e)=>{
  e.preventDefault();
  if (!cliente){ $('#orden-msg').textContent = 'Primero inicia sesión'; return; }
  try{
    const data = await req('/ordenes', {
      method:'POST',
      body: JSON.stringify({
        cliente_id: cliente.id,
        plato_nombre: $('#plato').value.trim(),
        notas: $('#notas').value.trim() || null
      })
    });
    $('#orden-msg').textContent = 'Orden #' + data.id + ' creada';
    $('#plato').value=''; $('#notas').value='';
    cargarOrdenes();
  }catch(err){ $('#orden-msg').textContent = err.message; }
});

async function cargarOrdenes(){
  if (!cliente) return;
  const list = await req('/ordenes/' + cliente.id);
  renderOrdenes(list);
}
