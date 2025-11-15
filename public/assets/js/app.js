async function api(url, opt = {}) {
  opt.headers = opt.headers || {};
  if (opt.body && typeof opt.body !== 'string') {
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(opt.body);
  }
  if (['POST','PUT','PATCH','DELETE'].includes((opt.method||'GET').toUpperCase())) {
    try {
      if (!window.__CSRF) {
        window.__CSRF = (await fetch('/csrf').then(r=>r.json())).token;
      }
      opt.headers['x-csrf-token'] = window.__CSRF || '';
    } catch {}
  }
  const r = await fetch(url, opt);
  if (!r.ok) {
    let msg;
    try { msg = await r.json(); } catch { msg = { error: await r.text() }; }
    const err = new Error(msg && msg.error ? msg.error : (r.status + ''));
    err.status = r.status;
    throw err;
  }
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('application/json')) return r.json();
  return r.text();
}

// Formato de fecha para la tabla (DD-MM-YYYY [HH:MM])
function formatDateForTable(value, withTime = false) {
  if (!value) return '';
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth()+1).padStart(2, '0');
    const yy = d.getFullYear();
    if (withTime) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      if (hh !== '00' || mi !== '00') {
        return `${dd}-${mm}-${yy} ${hh}:${mi}`;
      }
    }
    return `${dd}-${mm}-${yy}`;
  }
  // fallback: si no se puede parsear, devolvemos lo que venga
  return String(value);
}

// Estado global para saber si estamos editando algo
window.__editing = { scope: null, id: null };

function setEditing(scope, id) {
  window.__editing = { scope, id };
}

function clearEditing() {
  window.__editing = { scope: null, id: null };
}

// Rellena el formulario correspondiente con los datos del registro
function fillForm(scope, record) {
  const form = document.querySelector(`form[data-form="${scope}"]`);
  if (!form) return;

  if (scope === 'recepciones') {
    if (form.fecha) form.fecha.value = record.fecha || '';
    if (form.tipo) form.tipo.value = record.tipo || '';
    if (form.cantidad) form.cantidad.value = record.cantidad || '';
    if (form.unidad) form.unidad.value = record.unidad || '';
  }

  if (scope === 'produccion') {
    if (form.fecha_ini) form.fecha_ini.value = record.fecha_ini || '';
    if (form.tipo) form.tipo.value = record.tipo || '';
    if (form.cantidad) form.cantidad.value = record.cantidad || '';
    if (form.unidad) form.unidad.value = record.unidad || '';
  }

  if (scope === 'defectuosos') {
    if (form.fecha) form.fecha.value = record.fecha || '';
    if (form.tipo) form.tipo.value = record.tipo || '';
    if (form.cantidad) form.cantidad.value = record.cantidad || '';
    if (form.unidad) form.unidad.value = record.unidad || '';
    if (form.razon) form.razon.value = record.razon || '';
  }

  if (scope === 'envios') {
    if (form.fecha) form.fecha.value = record.fecha || '';
    if (form.cliente) form.cliente.value = record.cliente || '';
    if (form.tipo) form.tipo.value = record.tipo || '';
    if (form.descripcion) form.descripcion.value = record.descripcion || '';
    if (form.cantidad) form.cantidad.value = record.cantidad || '';
    if (form.unidad) form.unidad.value = record.unidad || '';
  }
}

function hookForm(scope) {
  const form = document.querySelector(`form[data-form="${scope}"]`);
  if (!form) return;

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (window.__ROLE === 'operario') {
      alert('Solo visualización para Operario.');
      return;
    }

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    // En producción, si no mandamos fecha_fin, el backend usará fecha_ini
    const editing = window.__editing && window.__editing.scope === scope && window.__editing.id;

    try {
      if (editing) {
        await api(`/api/${scope}/${window.__editing.id}`, {
          method: 'PUT',
          body: payload
        });
      } else {
        await api(`/api/${scope}`, {
          method: 'POST',
          body: payload
        });
      }
      form.reset();
      clearEditing();
      await renderTable(scope);
    } catch (err) {
      console.error(err);
      alert('Error guardando datos');
    }
  });
}

async function renderTable(scope) {
  const tbl = document.querySelector(`table[data-table="${scope}"]`);
  if (!tbl) return;
  const data = await api(`/api/${scope}`);
  const tbody = tbl.querySelector('tbody');
  tbody.innerHTML = '';

  data.items.forEach(r => {
    const tr = document.createElement('tr');

    if (scope === 'recepciones') {
      const fechaText = formatDateForTable(r.fecha, true);
      tr.innerHTML = `
        <td>${fechaText}</td>
        <td>${r.tipo}</td>
        <td>${r.cantidad}</td>
        <td>${r.unidad || ''}</td>
        <td class="actions-row">
          <button type="button" class="btn-small btn-edit" data-id="${r.id}">Editar</button>
          <button type="button" class="btn-small btn-del" data-id="${r.id}">Eliminar</button>
        </td>
      `;
    }

    if (scope === 'produccion') {
      const fechaText = formatDateForTable(r.fecha_ini, true);
      tr.innerHTML = `
        <td>${fechaText}</td>
        <td>${r.tipo || ''}</td>
        <td>${r.cantidad}</td>
        <td>${r.unidad || ''}</td>
        <td class="actions-row">
          <button type="button" class="btn-small btn-edit" data-id="${r.id}">Editar</button>
          <button type="button" class="btn-small btn-del" data-id="${r.id}">Eliminar</button>
        </td>
      `;
    }

    if (scope === 'defectuosos') {
      const fechaText = formatDateForTable(r.fecha, false);
      tr.innerHTML = `
        <td>${fechaText}</td>
        <td>${r.tipo}</td>
        <td>${r.cantidad}</td>
        <td>${r.unidad || ''}</td>
        <td>${r.razon || ''}</td>
        <td class="actions-row">
          <button type="button" class="btn-small btn-edit" data-id="${r.id}">Editar</button>
          <button type="button" class="btn-small btn-del" data-id="${r.id}">Eliminar</button>
        </td>
      `;
    }

    if (scope === 'envios') {
      const fechaText = formatDateForTable(r.fecha, false);
      tr.innerHTML = `
        <td>${fechaText}</td>
        <td>${r.cliente}</td>
        <td>${r.tipo}</td>
        <td>${r.descripcion || ''}</td>
        <td>${r.cantidad}</td>
        <td>${r.unidad || ''}</td>
        <td class="actions-row">
          <button type="button" class="btn-small btn-edit" data-id="${r.id}">Editar</button>
          <button type="button" class="btn-small btn-del" data-id="${r.id}">Eliminar</button>
        </td>
      `;
    }

    tbody.appendChild(tr);
  });

  // Botones editar / eliminar
  tbody.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', async ()=>{
      if (window.__ROLE === 'operario') {
        alert('Solo visualización para Operario.');
        return;
      }
      if (!confirm('¿Eliminar registro?')) return;
      const id = btn.dataset.id;
      try {
        await api(`/api/${scope}/${id}`, { method:'DELETE' });
        await renderTable(scope);
      } catch (err) {
        console.error(err);
        alert('Error eliminando registro');
      }
    });
  });

  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', ()=>{
      if (window.__ROLE === 'operario') {
        alert('Solo visualización para Operario.');
        return;
      }
      const id = btn.dataset.id;
      const rec = data.items.find(x => String(x.id) === String(id));
      if (!rec) return;
      setEditing(scope, id);
      fillForm(scope, rec);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

async function renderUsers() {
  const tbl = document.getElementById('usersTable'); if (!tbl) return;
  const data = await api('/api/users');
  const tbody = tbl.querySelector('tbody'); tbody.innerHTML='';
  for (const u of data.items){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${u.username}</td>
      <td><select data-id="${u.id}" class="input inline-edit roleSel">
        <option ${u.role==='operario'?'selected':''}>operario</option>
        <option ${u.role==='supervisor'?'selected':''}>supervisor</option>
        <option ${u.role==='administrador'?'selected':''}>administrador</option>
      </select></td>
      <td class="actions-row">
        <button class="btn-small reset" data-id="${u.id}">Reset Pass</button>
        <button class="btn-small del" data-id="${u.id}">Eliminar</button>
      </td>`;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll('.roleSel').forEach(sel=>{
    sel.addEventListener('change', async ()=>{
      await api('/api/users/'+sel.dataset.id, { method:'PUT', body:{ role: sel.value } });
      alert('Rol actualizado');
    });
  });
  tbody.querySelectorAll('.del').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if (!confirm('¿Eliminar usuario?')) return;
      await api('/api/users/'+btn.dataset.id, { method:'DELETE' });
      renderUsers();
    });
  });
  tbody.querySelectorAll('.reset').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const p = prompt('Nueva contraseña','admin'); if (!p) return;
      await api('/api/users/'+btn.dataset.id+'/password', { method:'PATCH', body:{ password: p } });
      alert('Contraseña cambiada');
    });
  });
}

async function initPanel() {
  const me = await api('/me'); if (!me.user){ location.href='/'; return; }
  document.getElementById('whoami').textContent = me.user.username + ' (' + me.user.role + ')';
  window.__ROLE = me.user.role;
  if (me.user.role === 'operario'){ document.body.classList.add('readonly'); }
  if (me.user.role === 'supervisor'){ document.querySelectorAll('.only-supervisor').forEach(e=>e.style.display='block'); }

  ['recepciones','produccion','defectuosos','envios'].forEach(scope=>{
    hookForm(scope);
    renderTable(scope);
  });

  // Botones PDF
  document.querySelectorAll('[data-pdf]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const type = btn.dataset.pdf;
      window.open(`/api/${type}.pdf`,'_blank');
    });
  });

  // Users
  const add = document.getElementById('addUser');
  if (add){
    add.addEventListener('click', async ()=>{
      const uname = document.getElementById('nu_user').value.trim();
      const role = document.getElementById('nu_role').value;
      const pass = document.getElementById('nu_pass').value;
      await api('/api/users', { method:'POST', body:{ username: uname, role, password: pass } });
      document.getElementById('nu_user').value='';
      await renderUsers();
    });
    await renderUsers();
  }

  const lo = document.getElementById('logoutBtn');
  if (lo){
    lo.addEventListener('click', async()=>{
      await api('/api/auth/logout', { method:'POST' });
      location.href='/';
    });
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  if (location.pathname === '/panel.html') initPanel();
});
