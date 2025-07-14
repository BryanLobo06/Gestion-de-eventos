// --- Configuración ---
const API_URL = 'http://localhost:3000';
const app = document.getElementById('app');

// --- Estado global ---
let currentUser = JSON.parse(localStorage.getItem('user')) || null;

// --- Utilidades ---
function setUser(user) {
  currentUser = user;
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
  updateNav();
}

function updateNav() {
  document.getElementById('nav-login').style.display = currentUser ? 'none' : '';
  document.getElementById('nav-logout').style.display = currentUser ? '' : 'none';
  document.getElementById('nav-admin').style.display = (currentUser && currentUser.role === 'admin') ? '' : 'none';
  document.getElementById('nav-asistentes').style.display = (currentUser && currentUser.role === 'admin') ? '' : 'none';
  document.getElementById('nav-lugares').style.display = (currentUser && currentUser.role === 'admin') ? '' : 'none';
}

// --- Rutas SPA ---
const routes = {
  '/': renderHome,
  '/login': renderLogin,
  '/logout': renderLogout,
  '/eventos': renderEventos,
  '/admin': renderAdmin,
  '/asistentes': renderAsistentes,
  '/lugares': renderLugares,
  '/registro': renderRegistro
};

function router() {
  const hash = location.hash.replace('#', '') || '/';
  const route = routes[hash.split('?')[0]] || renderNotFound;
  route();
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
  updateNav();
  router();
});

// --- Vistas ---
function renderHome() {
  app.innerHTML = `<h1>Welcome to Event Management</h1>
  <p>Check out and register for available events.</p>`;
}

function renderNotFound() {
  app.innerHTML = '<h2>Page not found</h2>';
}

function renderLogin() {
  if (currentUser) {
    location.hash = '/';
    return;
  }
  app.innerHTML = `
    <h2>Login</h2>
    <form id="login-form">
      <input type="text" name="username" placeholder="Username" required />
      <input type="password" name="password" placeholder="password" required />
      <button type="submit">Submit</button>
    </form>
    <div id="login-error" style="color:red;"></div>
    <p>Don't have an account? <a href="#/registro">Register here</a></p>
  `;
  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    const res = await fetch(`${API_URL}/users?username=${username}&password=${password}`);
    const users = await res.json();
    if (users.length) {
      if (users[0].role === 'visitor') {
        // Verificar si está registrado como asistente
        const asistRes = await fetch(`${API_URL}/attendees?id=${users[0].id}`);
        const asist = await asistRes.json();
        if (!asist.length) {
          document.getElementById('login-error').textContent = 'You must register as an attendee before logging in.';
          return;
        }
      }
      setUser(users[0]);
      location.hash = '/';
    } else {
      document.getElementById('login-error').textContent = 'Incorrect credentials';
    }
  };
}

function renderLogout() {
  setUser(null);
  location.hash = '/';
}

async function renderEventos() {
  // Obtener eventos y lugares
  const [resEventos, resLugares] = await Promise.all([
    fetch(`${API_URL}/events`),
    fetch(`${API_URL}/places`)
  ]);
  const eventos = await resEventos.json();
  const lugares = await resLugares.json();
  let html = `<h2>Available Events</h2><ul id="eventos-list">`;
  for (const ev of eventos) {
    const lugar = lugares.find(l => l.id === ev.placeId);
    html += `<li><strong>${ev.name}</strong> - ${ev.date} en ${lugar ? lugar.name + ' (ID: ' + lugar.id + ')' : 'Unknown location'}
      <div style="display:flex;align-items:center;gap:1em;">
        <button class="btn-registrar" data-id="${ev.id}">${currentUser ? 'Registrarse' : 'Sign in to register'}</button>
        <span class="msg-registrar" id="msg-registrar-${ev.id}" style="color:#f76d3c;font-weight:500;"></span>
      </div>
    </li>`;
  }
  html += '</ul>';
  app.innerHTML = html;
  // Delegación de eventos para registrar
  document.querySelectorAll('.btn-registrar').forEach(btn => {
    btn.onclick = async (e) => {
      if (!currentUser) {
        location.hash = '/login';
        return;
      }
      const eventId = Number(btn.getAttribute('data-id'));
      const msgSpan = document.getElementById(`msg-registrar-${eventId}`);
      msgSpan.textContent = '';
      btn.disabled = true;
      const result = await registerEvent(eventId);
      btn.disabled = false;
      msgSpan.textContent = result;
      setTimeout(() => { msgSpan.textContent = ''; }, 3000);
      if (result === 'You have successfully registered!') {
        setTimeout(renderEventos, 1000);
      }
    };
  });
}

async function registerEvent(eventId) {
  if (!currentUser) return '';
  const res = await fetch(`${API_URL}/events/${eventId}`);
  const evento = await res.json();
  if (!evento.attendees.includes(currentUser.id)) {
    evento.attendees.push(currentUser.id);
    await fetch(`${API_URL}/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendees: evento.attendees })
    });
    return 'You have successfully registered!';
  } else {
    return 'You are already registered for this event.';
  }
}

function requireAdmin() {
  if (!currentUser || currentUser.role !== 'admin') {
    app.innerHTML = '<h2>Restricted access</h2>';
    return false;
  }
  return true;
}

async function renderAdmin() {
  if (!requireAdmin()) return;
  // Obtener eventos, lugares y asistentes
  const [resEventos, resLugares, resAsistentes] = await Promise.all([
    fetch(`${API_URL}/events`),
    fetch(`${API_URL}/places`),
    fetch(`${API_URL}/attendees`)
  ]);
  const eventos = await resEventos.json();
  const lugares = await resLugares.json();
  const asistentes = await resAsistentes.json();
  app.innerHTML = `<h2>Administration Panel</h2>
    <button id="btn-crear-evento">Create Event</button>
    <div id="admin-msg" style="color:#f76d3c;font-weight:500;margin-bottom:1em;"></div>
    <ul id="admin-eventos-list">${eventos.map(ev => {
      const lugar = lugares.find(l => l.id === ev.placeId);
      const asistentesEvento = (ev.attendees || []).map(id => asistentes.find(a => a.id === id)).filter(Boolean);
      return `<li><strong>${ev.name}</strong> - ${ev.date} en ${lugar ? lugar.name + ' (ID: ' + lugar.id + ')' : 'Unknown Place'}
        <button class="btn-editar-evento" data-id="${ev.id}">Edit</button>
        <button class="btn-eliminar-evento" data-id="${ev.id}">Delete</button>
        <div style="margin-top:0.7em;"><b>Registered attendees:</b>
          <ul style="margin:0.3em 0 0 1em;">${asistentesEvento.length ? asistentesEvento.map(a => `<li>${a.name} (${a.email})</li>`).join('') : '<li><i>No one registered</i></li>'}</ul>
        </div>
      </li>`;
    }).join('')}</ul>
    <div id="admin-form"></div>
  `;
  document.getElementById('btn-crear-evento').onclick = showCreateEvent;
  document.querySelectorAll('.btn-editar-evento').forEach(btn => {
    btn.onclick = async () => {
      await editEvent(Number(btn.getAttribute('data-id')));
    };
  });
  document.querySelectorAll('.btn-eliminar-evento').forEach(btn => {
    btn.onclick = async () => {
      const id = Number(btn.getAttribute('data-id'));
      const msgDiv = document.getElementById('admin-msg');
      msgDiv.textContent = '';
      const ok = await deleteEvent(id);
      if (ok) {
        msgDiv.textContent = 'Event successfully deleted.';
        setTimeout(() => { msgDiv.textContent = ''; }, 2000);
      } else {
        msgDiv.textContent = 'Error deleting event.';
      }
    };
  });
}

function showCreateEvent() {
  document.getElementById('admin-form').innerHTML = `
    <h3>New Event</h3>
    <form id="create-event-form">
      <input type="text" name="name" placeholder="Nombre del evento" required />
      <input type="date" name="date" required />
      <input type="number" name="placeId" placeholder="ID del lugar" required />
      <button type="submit">Create</button>
    </form>
  `;
  document.getElementById('create-event-form').onsubmit = async (e) => {
    e.preventDefault();
    // Obtener el siguiente ID secuencial
    const res = await fetch(`${API_URL}/events`);
    const eventos = await res.json();
    const nextId = eventos.length ? Math.max(...eventos.map(ev => ev.id)) + 1 : 1;
    const data = {
      id: nextId,
      name: e.target.name.value,
      date: e.target.date.value,
      placeId: Number(e.target.placeId.value),
      attendees: []
    };
    await fetch(`${API_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    renderAdmin();
  };
}

async function editEvent(id) {
  const res = await fetch(`${API_URL}/events/${id}`);
  const ev = await res.json();
  document.getElementById('admin-form').innerHTML = `
    <h3>Edit Event</h3>
    <form id="edit-event-form">
      <input type="text" name="name" value="${ev.name}" required />
      <input type="date" name="date" value="${ev.date}" required />
      <input type="number" name="placeId" value="${ev.placeId}" required />
      <button type="submit">save</button>
    </form>
  `;
  document.getElementById('edit-event-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: e.target.name.value,
      date: e.target.date.value,
      placeId: Number(e.target.placeId.value)
    };
    await fetch(`${API_URL}/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    renderAdmin();
  };
}

async function deleteEvent(id) {
  if (confirm('Delete this event?')) {
    const res = await fetch(`${API_URL}/events/${id}`, { method: 'DELETE' });
    if (res.ok) {
      renderAdmin();
      return true;
    } else {
      return false;
    }
  }
  return false;
}

// --- Gestión de Asistentes (Admin) ---
async function renderAsistentes() {
  if (!requireAdmin()) return;
  const res = await fetch(`${API_URL}/attendees`);
  const asistentes = await res.json();
  app.innerHTML = `<h2>Assistant Management</h2>
    <button id="btn-crear-asistente">New Assistant</button>
    <div id="asistente-msg" style="color:#f76d3c;font-weight:500;margin-bottom:1em;"></div>
    <ul>${asistentes.map(a => `<li><strong>${a.name}</strong> (ID: ${a.id}, ${a.email}) <button class="btn-editar-asistente" data-id="${a.id}">Edit</button> <button class="btn-eliminar-asistente" data-id="${a.id}">Eliminar</button></li>`).join('')}</ul>
    <div id="asistente-form"></div>
  `;
  document.getElementById('btn-crear-asistente').onclick = showCreateAsistente;
  document.querySelectorAll('.btn-editar-asistente').forEach(btn => {
    btn.onclick = async () => {
      await editAsistente(Number(btn.getAttribute('data-id')));
    };
  });
  document.querySelectorAll('.btn-eliminar-asistente').forEach(btn => {
    btn.onclick = async () => {
      const id = Number(btn.getAttribute('data-id'));
      const msgDiv = document.getElementById('asistente-msg');
      msgDiv.textContent = '';
      const ok = await deleteAsistente(id);
      if (ok) {
        msgDiv.textContent = 'Wizard successfully removed.';
        setTimeout(() => { msgDiv.textContent = ''; }, 2000);
      } else {
        msgDiv.textContent = 'Error deleting wizard.';
      }
    };
  });
}
function showCreateAsistente() {
  document.getElementById('asistente-form').innerHTML = `
    <h3>New Assistant</h3>
    <form id="create-asistente-form">
      <input type="text" name="name" placeholder="Nombre" required />
      <input type="email" name="email" placeholder="Correo" required />
      <button type="submit">Create</button>
    </form>
  `;
  document.getElementById('create-asistente-form').onsubmit = async (e) => {
    e.preventDefault();
    // Obtener el siguiente ID secuencial
    const res = await fetch(`${API_URL}/attendees`);
    const asistentes = await res.json();
    const nextId = asistentes.length ? Math.max(...asistentes.map(a => a.id)) + 1 : 1;
    const data = {
      id: nextId,
      name: e.target.name.value,
      email: e.target.email.value
    };
    await fetch(`${API_URL}/attendees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    renderAsistentes();
  };
}
async function editAsistente(id) {
  const res = await fetch(`${API_URL}/attendees/${id}`);
  const a = await res.json();
  document.getElementById('asistente-form').innerHTML = `
    <h3>Edit Assistant</h3>
    <form id="edit-asistente-form">
      <input type="text" name="name" value="${a.name}" required />
      <input type="email" name="email" value="${a.email}" required />
      <button type="submit">Save</button>
    </form>
  `;
  document.getElementById('edit-asistente-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: e.target.name.value,
      email: e.target.email.value
    };
    await fetch(`${API_URL}/attendees/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    renderAsistentes();
  };
}
async function deleteAsistente(id) {
  if (confirm('Delete this wizard?')) {
    const res = await fetch(`${API_URL}/attendees/${id}`, { method: 'DELETE' });
    if (res.ok) {
      renderAsistentes();
      return true;
    } else {
      return false;
    }
  }
  return false;
}
// --- Gestión de Lugares (Admin) ---
async function renderLugares() {
  if (!requireAdmin()) return;
  const res = await fetch(`${API_URL}/places`);
  const lugares = await res.json();
  app.innerHTML = `<h2>Place Management</h2>
    <button id="btn-crear-lugar">New Place</button>
    <ul>${lugares.map(l => `<li><strong>${l.name}</strong> (ID: ${l.id}, Ability: ${l.capacity}) <button class="btn-editar-lugar" data-id="${l.id}">Edit</button> <button class="btn-eliminar-lugar" data-id="${l.id}">Eliminar</button></li>`).join('')}</ul>
    <div id="lugar-form"></div>
  `;
  document.getElementById('btn-crear-lugar').onclick = showCreateLugar;
  document.querySelectorAll('.btn-editar-lugar').forEach(btn => {
    btn.onclick = async () => {
      await editLugar(Number(btn.getAttribute('data-id')));
    };
  });
  document.querySelectorAll('.btn-eliminar-lugar').forEach(btn => {
    btn.onclick = async () => {
      await deleteLugar(Number(btn.getAttribute('data-id')));
    };
  });
}
function showCreateLugar() {
  document.getElementById('lugar-form').innerHTML = `
    <h3>New Place</h3>
    <form id="create-lugar-form">
      <input type="text" name="name" placeholder="Place name" required />
      <input type="number" name="capacity" placeholder="Ability:" required />
      <button type="submit">Create</button>
    </form>
  `;
  document.getElementById('create-lugar-form').onsubmit = async (e) => {
    e.preventDefault();
    // Obtener el siguiente ID secuencial
    const res = await fetch(`${API_URL}/places`);
    const lugares = await res.json();
    const nextId = lugares.length ? Math.max(...lugares.map(l => l.id)) + 1 : 1;
    const data = {
      id: nextId,
      name: e.target.name.value,
      capacity: Number(e.target.capacity.value)
    };
    await fetch(`${API_URL}/places`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    renderLugares();
  };
}
async function editLugar(id) {
  const res = await fetch(`${API_URL}/places/${id}`);
  const l = await res.json();
  document.getElementById('lugar-form').innerHTML = `
    <h3>Edit place</h3>
    <form id="edit-lugar-form">
      <input type="text" name="name" value="${l.name}" required />
      <input type="number" name="capacity" value="${l.capacity}" required />
      <button type="submit">Save</button>
    </form>
  `;
  document.getElementById('edit-lugar-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: e.target.name.value,
      capacity: Number(e.target.capacity.value)
    };
    await fetch(`${API_URL}/places/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    renderLugares();
  };
}
async function deleteLugar(id) {
  if (confirm('Delete this place?')) {
    await fetch(`${API_URL}/places/${id}`, { method: 'DELETE' });
    renderLugares();
  }
}

function renderRegistro() {
  app.innerHTML = `
    <h2>Visitor Registration</h2>
    <form id="registro-form">
      <input type="text" name="username" placeholder="Username" required />
      <input type="password" name="password" placeholder="password" required />
      <input type="text" name="name" placeholder="Full name" required />
      <input type="email" name="email" placeholder="Email" required />
      <button type="submit">Register</button>
    </form>
    <div id="registro-error" style="color:red;"></div>
    <div id="registro-exito" style="color:#388e3c;font-weight:500;margin-top:0.5em;"></div>
  `;
  document.getElementById('registro-form').onsubmit = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    const name = e.target.name.value;
    const email = e.target.email.value;
    // Verificar si el usuario ya existe
    const res = await fetch(`${API_URL}/users?username=${username}`);
    const users = await res.json();
    if (users.length) {
      document.getElementById('registro-error').textContent = 'The user already exists.';
      document.getElementById('registro-exito').textContent = '';
      return;
    }
    // Crear usuario visitante
    const userRes = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role: 'visitor' })
    });
    const newUser = await userRes.json();
    // Crear asistente con el mismo ID que el usuario
    await fetch(`${API_URL}/attendees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: newUser.id, name, email })
    });
    document.getElementById('registro-error').textContent = '';
    document.getElementById('registro-exito').textContent = 'Registration successful! You can now log in.';
    setTimeout(() => { location.hash = '/login'; }, 2000);
  };
}