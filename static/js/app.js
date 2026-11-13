'use strict';

//
// Developer: Shubham
// File: app.js
// Purpose: Main JS for Employee Management System
// Last updated: May 2026
// TODO: Add more dashboard widgets, improve accessibility
//
// Personalized greeting in the sidebar profile section
function showGreeting() {
  const hour = new Date().getHours();
  let greet = 'Hello';
  if (hour < 12) greet = 'Good morning';
  else if (hour < 18) greet = 'Good afternoon';
  else greet = 'Good evening';
  const profile = document.querySelector('.profile-section span');
  if (profile) profile.textContent = greet + ', Shubham!';
}
document.addEventListener('DOMContentLoaded', showGreeting);
//
// End of developer customizations (May 2026)
//
'use strict';

// ── State ──────────────────────────────────────────────────────────────────
const S = {
  employees:   [],
  departments: [],
  projects:    [],
  dependents:  [],
  activeTab:   'dashboard',
  empEdit: null, deptEdit: null, projEdit: null, depEdit: null,
  empSort: { col: 'name', asc: true },
};

// ── Helpers ────────────────────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const inr = n  => '₹' + Number(n || 0).toLocaleString('en-IN');
const AV_COLORS = ['av-blue','av-green','av-amber','av-purple','av-red'];
const CHART_COLORS = ['#5b7cfa','#34c98b','#f5a623','#a07cf0','#f25c5c','#22d3ee','#fb923c'];

async function api(method, url, body) {
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}

function flash(id, ok, msg) {
  const el = $(id);
  el.className = 'flash ' + (ok ? 'ok' : 'err');
  el.innerHTML = `<span class="flash-dot"></span>${msg}`;
  setTimeout(() => { el.className = 'flash'; el.innerHTML = ''; }, 3200);
}

// ── Date chip ──────────────────────────────────────────────────────────────
(function setDate() {
  const d = new Date();
  const s = d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  $('topbar-date').textContent = s;
})();

// ── Navigation ─────────────────────────────────────────────────────────────
const TAB_LABELS = {
  dashboard:   'Overview',
  employees:   'Employees',
  departments: 'Departments',
  projects:    'Projects',
  dependents:  'Dependents',
};

function navigate(tab) {
  S.activeTab = tab;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  $('tab-' + tab).classList.remove('hidden');
  $('bc-current').textContent = TAB_LABELS[tab];
  $('sb-tab').textContent = TAB_LABELS[tab];
}

document.querySelectorAll('.nav-item').forEach(btn =>
  btn.addEventListener('click', () => navigate(btn.dataset.tab))
);

// ── Load all data ──────────────────────────────────────────────────────────
async function reload() {
  const [depts, emps, projs, deps] = await Promise.all([
    api('GET', '/api/departments'),
    api('GET', '/api/employees'),
    api('GET', '/api/projects'),
    api('GET', '/api/dependents'),
  ]);
  S.departments = depts;
  S.employees   = emps;
  S.projects    = projs;
  S.dependents  = deps;

  $('global-loader').classList.add('hidden');
  $('tab-dashboard').classList.remove('hidden');

  syncSelects();
  renderAll();
}

function syncSelects() {
  const dOpts = S.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  $('emp-dept').innerHTML  = '<option value="">— Select —</option>' + dOpts;
  $('proj-dept').innerHTML = '<option value="">— None —</option>' + dOpts;
  $('dep-emp').innerHTML   =
    '<option value="">— Select —</option>' +
    S.employees.map(e => `<option value="${e.id}">${e.first_name} ${e.last_name}</option>`).join('');
}

// ── Render all ─────────────────────────────────────────────────────────────
function renderAll() {
  updatePills();
  renderDashboard();
  renderEmployees();
  renderDepartments();
  renderProjects();
  renderDependents();
}

function updatePills() {
  $('pill-employees').textContent   = S.employees.length;
  $('pill-departments').textContent = S.departments.length;
  $('pill-projects').textContent    = S.projects.length;
  $('sb-records').textContent = `${S.employees.length} emp · ${S.departments.length} dept · ${S.projects.length} proj`;
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
function renderDashboard() {
  const payroll = S.employees.reduce((s, e) => s + Number(e.salary), 0);
  const active  = S.projects.filter(p => p.status === 'active').length;

  $('kpi-emp').textContent  = S.employees.length;
  $('kpi-dept').textContent = S.departments.length;
  $('kpi-proj').textContent = active;
  // compact payroll e.g. ₹7.2L
  const lakh = payroll / 1e5;
  $('kpi-sal').textContent  = lakh >= 100
    ? '₹' + (payroll / 1e7).toFixed(1) + 'Cr'
    : '₹' + lakh.toFixed(1) + 'L';

  drawDonut();
  drawBar();
  drawRecent();
}

function drawDonut() {
  const canvas = $('donut-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const outer = 60, inner = 36;

  ctx.clearRect(0, 0, W, H);

  const segments = S.departments.map((d, i) => ({
    name:  d.name,
    count: S.employees.filter(e => e.department_id === d.id).length,
    color: CHART_COLORS[i % CHART_COLORS.length],
  })).filter(s => s.count > 0);

  const total = segments.reduce((s, x) => s + x.count, 0);
  if (!total) return;

  let angle = -Math.PI / 2;
  segments.forEach(seg => {
    const sweep = (seg.count / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outer, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    angle += sweep;
  });

  // gap lines
  angle = -Math.PI / 2;
  segments.forEach(seg => {
    const sweep = (seg.count / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outer + 2, angle, angle + sweep);
    ctx.strokeStyle = '#1a1d26';
    ctx.lineWidth = 2;
    ctx.stroke();
    angle += sweep;
  });

  // inner hole
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1d26';
  ctx.fill();

  // center label
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e4e8f4';
  ctx.font = "bold 18px 'DM Sans', sans-serif";
  ctx.fillText(total, cx, cy - 5);
  ctx.fillStyle = '#4e5470';
  ctx.font = "9px 'DM Sans', sans-serif";
  ctx.fillText('staff', cx, cy + 9);

  // legend with bar
  const legend = $('donut-legend');
  legend.innerHTML = segments.map(seg => `
    <div class="leg-item">
      <span class="leg-name">${seg.name.split(' ')[0]}</span>
      <div class="leg-bar-track">
        <div class="leg-bar-fill" style="width:${(seg.count/total*100).toFixed(0)}%;background:${seg.color}"></div>
      </div>
      <span class="leg-count">${seg.count}</span>
    </div>`
  ).join('');
}

function drawBar() {
  const canvas = $('bar-canvas');
  // make canvas fill its container
  const parent = canvas.parentElement;
  canvas.width  = parent.clientWidth || 400;
  canvas.height = 190;

  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const projs = S.projects.slice(0, 7);
  if (!projs.length) return;

  const pad = { t: 10, r: 10, b: 44, l: 10 };
  const cW  = W - pad.l - pad.r;
  const cH  = H - pad.t - pad.b;
  const max = Math.max(...projs.map(p => p.budget), 1);
  const bw  = cW / projs.length;
  const gap = bw * 0.28;

  // subtle grid lines
  ctx.strokeStyle = '#2e3347';
  ctx.lineWidth   = 1;
  [0.25, 0.5, 0.75, 1].forEach(frac => {
    const y = pad.t + cH - frac * cH;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
    ctx.stroke();
  });

  projs.forEach((p, i) => {
    const barH = (p.budget / max) * cH;
    const x    = pad.l + i * bw + gap / 2;
    const y    = pad.t + cH - barH;
    const w    = bw - gap;
    const col  = CHART_COLORS[i % CHART_COLORS.length];

    // ghost bar
    ctx.fillStyle = col + '18';
    ctx.fillRect(x, pad.t, w, cH);

    // actual bar with rounded top
    const r = Math.min(4, w / 2, barH);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + barH);
    ctx.lineTo(x, y + barH);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();

    // label
    const label = p.name.length > 10 ? p.name.slice(0, 9) + '…' : p.name;
    ctx.fillStyle = '#4e5470';
    ctx.font = "10px 'DM Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, H - pad.b + 14);

    // value
    if (barH > 20) {
      const val = p.budget >= 1e6
        ? '₹' + (p.budget / 1e5).toFixed(0) + 'L'
        : '₹' + (p.budget / 1e3).toFixed(0) + 'K';
      ctx.fillStyle = '#a8afc7';
      ctx.font = "9px 'DM Mono', monospace";
      ctx.fillText(val, x + w / 2, y - 4);
    }
  });
}

function drawRecent() {
  const ul = $('recent-list');
  ul.innerHTML = S.employees.slice(0, 6).map((e, i) => {
    const init = (e.first_name[0] + e.last_name[0]).toUpperCase();
    const dept = e.department?.name ?? 'No dept';
    const cls  = AV_COLORS[i % AV_COLORS.length];
    return `
      <li class="recent-row">
        <div class="avatar ${cls}">${init}</div>
        <div class="recent-info">
          <div class="recent-name">${e.first_name} ${e.last_name}</div>
          <div class="recent-dept">${dept}</div>
        </div>
        <div class="recent-sal">${inr(e.salary)}</div>
      </li>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
// EMPLOYEES
// ═══════════════════════════════════════════════════════════════
function sortedEmps() {
  const { col, asc } = S.empSort;
  return [...S.employees].sort((a, b) => {
    let va, vb;
    switch (col) {
      case 'name':   va = `${a.first_name} ${a.last_name}`; vb = `${b.first_name} ${b.last_name}`; break;
      case 'email':  va = a.email;  vb = b.email;  break;
      case 'phone':  va = a.phone;  vb = b.phone;  break;
      case 'dept':   va = a.department?.name ?? ''; vb = b.department?.name ?? ''; break;
      case 'salary': return asc ? a.salary - b.salary : b.salary - a.salary;
      default:       va = ''; vb = '';
    }
    return asc ? (va||'').localeCompare(vb||'') : (vb||'').localeCompare(va||'');
  });
}

function renderEmployees() {
  const rows  = sortedEmps();
  const tbody = $('emp-tbody');
  $('emp-count').textContent    = rows.length + ' records';
  $('emp-foot-info').textContent = rows.length
    ? `Showing ${rows.length} employee${rows.length > 1 ? 's' : ''}`
    : '—';

  if (!rows.length) {
    tbody.innerHTML = `<tr><td class="empty-cell" colspan="6">No employee records found</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(e => {
    const dept = e.department?.name ?? '—';
    const sel  = S.empEdit?.id === e.id;
    const init = (e.first_name[0] + e.last_name[0]).toUpperCase();
    const avCls = AV_COLORS[Math.abs(e.id.charCodeAt(0) - 97) % AV_COLORS.length];
    return `
      <tr class="${sel ? 'row-selected' : ''}" data-id="${e.id}">
        <td>
          <div style="display:flex;align-items:center;gap:9px">
            <div class="avatar ${avCls}" style="width:26px;height:26px;font-size:10px;border-radius:6px">${init}</div>
            <div>
              <div class="td-name">${e.first_name} ${e.last_name}</div>
              <div class="td-id">…${e.id.slice(-6)}</div>
            </div>
          </div>
        </td>
        <td>${e.email}</td>
        <td class="td-mono" style="font-size:12px">${e.phone || '—'}</td>
        <td><span class="badge badge-dept">${dept}</span></td>
        <td class="td-right td-mono td-green">${inr(e.salary)}</td>
        <td class="td-right">
          <div class="row-acts" id="era-${e.id}">
            <button class="icon-btn" data-del="${e.id}" title="Delete record">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');

  // sort header state
  document.querySelectorAll('#tab-employees th.sortable').forEach(th => {
    th.classList.remove('asc', 'desc');
    if (th.dataset.col === S.empSort.col)
      th.classList.add(S.empSort.asc ? 'asc' : 'desc');
  });

  // double-click to edit
  tbody.querySelectorAll('tr[data-id]').forEach(row =>
    row.addEventListener('dblclick', () => {
      const emp = S.employees.find(e => e.id === row.dataset.id);
      if (emp) beginEditEmp(emp);
    })
  );

  // delete with inline confirm
  tbody.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      const id  = btn.dataset.del;
      const box = $('era-' + id);
      box.innerHTML = `
        <span class="confirm-row">
          <span>Delete?</span>
          <button class="btn btn-danger btn-sm" data-yes="${id}">Yes</button>
          <button class="btn btn-ghost btn-sm" data-no>No</button>
        </span>`;
      box.querySelector('[data-yes]').onclick  = () => deleteEmp(id);
      box.querySelector('[data-no]').onclick   = () => renderEmployees();
    })
  );
}

// sort clicks
document.querySelectorAll('#tab-employees th.sortable').forEach(th =>
  th.addEventListener('click', () => {
    S.empSort.asc = S.empSort.col === th.dataset.col ? !S.empSort.asc : true;
    S.empSort.col = th.dataset.col;
    renderEmployees();
  })
);

function clearEmpForm() {
  ['emp-fname','emp-lname','emp-email','emp-phone','emp-salary'].forEach(id => $(id).value = '');
  $('emp-dept').value = '';
  S.empEdit = null;
  $('emp-add-btn').classList.remove('hidden');
  $('emp-upd-btn').classList.add('hidden');
  $('emp-cancel').classList.add('hidden');
  $('emp-mode-badge').textContent = 'New';
  $('emp-mode-badge').classList.remove('edit-mode');
}

function beginEditEmp(e) {
  S.empEdit = e;
  $('emp-fname').value  = e.first_name;
  $('emp-lname').value  = e.last_name;
  $('emp-email').value  = e.email;
  $('emp-phone').value  = e.phone || '';
  $('emp-salary').value = e.salary;
  $('emp-dept').value   = e.department_id || '';
  $('emp-add-btn').classList.add('hidden');
  $('emp-upd-btn').classList.remove('hidden');
  $('emp-cancel').classList.remove('hidden');
  $('emp-mode-badge').textContent = 'Editing';
  $('emp-mode-badge').classList.add('edit-mode');
  renderEmployees();
  $('emp-fname').focus();
}

$('emp-cancel').onclick = () => { clearEmpForm(); renderEmployees(); };

$('emp-add-btn').onclick = async () => {
  const fn = $('emp-fname').value.trim();
  const ln = $('emp-lname').value.trim();
  const em = $('emp-email').value.trim();
  if (!fn || !ln || !em) { flash('emp-flash', false, 'First name, last name and email are required'); return; }
  const res = await api('POST', '/api/employees', {
    first_name: fn, last_name: ln, email: em,
    phone: $('emp-phone').value.trim(),
    salary: Number($('emp-salary').value) || 0,
    department_id: $('emp-dept').value || null,
  });
  if (res.error) { flash('emp-flash', false, res.error); return; }
  flash('emp-flash', true, 'Employee added successfully');
  clearEmpForm();
  await reload();
};

$('emp-upd-btn').onclick = async () => {
  if (!S.empEdit) return;
  const res = await api('PUT', `/api/employees/${S.empEdit.id}`, {
    first_name: $('emp-fname').value.trim(),
    last_name:  $('emp-lname').value.trim(),
    email:      $('emp-email').value.trim(),
    phone:      $('emp-phone').value.trim(),
    salary:     Number($('emp-salary').value) || 0,
    department_id: $('emp-dept').value || null,
  });
  if (res.error) { flash('emp-flash', false, res.error); return; }
  flash('emp-flash', true, 'Record updated');
  clearEmpForm();
  await reload();
};

async function deleteEmp(id) {
  await api('DELETE', `/api/employees/${id}`);
  if (S.empEdit?.id === id) clearEmpForm();
  await reload();
}

// ═══════════════════════════════════════════════════════════════
// DEPARTMENTS
// ═══════════════════════════════════════════════════════════════
function renderDepartments() {
  const tbody = $('dept-tbody');
  $('dept-count').textContent    = S.departments.length + ' records';
  $('dept-foot-info').textContent = `${S.departments.length} department${S.departments.length !== 1 ? 's' : ''}`;

  if (!S.departments.length) {
    tbody.innerHTML = `<tr><td class="empty-cell" colspan="4">No departments found</td></tr>`;
    return;
  }

  tbody.innerHTML = S.departments.map(d => {
    const ec = S.employees.filter(e => e.department_id === d.id).length;
    const sel = S.deptEdit?.id === d.id;
    return `
      <tr class="${sel ? 'row-selected' : ''}" data-id="${d.id}">
        <td>
          <div class="td-name">${d.name}</div>
          <div class="td-id">…${d.id.slice(-6)}</div>
        </td>
        <td class="td-right td-mono td-green">${inr(d.budget)}</td>
        <td><span class="badge badge-dept">${ec} employee${ec !== 1 ? 's' : ''}</span></td>
        <td class="td-right">
          <div class="row-acts" id="dra-${d.id}">
            <button class="btn btn-ghost btn-sm" data-edit="${d.id}">Edit</button>
            <button class="icon-btn" data-del="${d.id}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-edit]').forEach(btn =>
    btn.onclick = () => {
      const d = S.departments.find(x => x.id === btn.dataset.edit);
      if (d) beginEditDept(d);
    }
  );

  tbody.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      const id  = btn.dataset.del;
      const box = $('dra-' + id);
      box.innerHTML = `
        <span class="confirm-row">
          <span>Delete?</span>
          <button class="btn btn-danger btn-sm" data-yes="${id}">Yes</button>
          <button class="btn btn-ghost btn-sm" data-no>No</button>
        </span>`;
      box.querySelector('[data-yes]').onclick = () => deleteDept(id);
      box.querySelector('[data-no]').onclick  = () => renderDepartments();
    })
  );
}

function clearDeptForm() {
  $('dept-name').value = ''; $('dept-budget').value = '';
  S.deptEdit = null;
  $('dept-add-btn').classList.remove('hidden');
  $('dept-upd-btn').classList.add('hidden');
  $('dept-cancel').classList.add('hidden');
  $('dept-mode-badge').textContent = 'New';
  $('dept-mode-badge').classList.remove('edit-mode');
}

function beginEditDept(d) {
  S.deptEdit = d;
  $('dept-name').value   = d.name;
  $('dept-budget').value = d.budget;
  $('dept-add-btn').classList.add('hidden');
  $('dept-upd-btn').classList.remove('hidden');
  $('dept-cancel').classList.remove('hidden');
  $('dept-mode-badge').textContent = 'Editing';
  $('dept-mode-badge').classList.add('edit-mode');
  renderDepartments();
  $('dept-name').focus();
}

$('dept-cancel').onclick = () => { clearDeptForm(); renderDepartments(); };

$('dept-add-btn').onclick = async () => {
  const name = $('dept-name').value.trim();
  if (!name) { flash('dept-flash', false, 'Department name is required'); return; }
  const res = await api('POST', '/api/departments', { name, budget: Number($('dept-budget').value) || 0 });
  if (res.error) { flash('dept-flash', false, res.error); return; }
  flash('dept-flash', true, 'Department added');
  clearDeptForm();
  await reload();
};

$('dept-upd-btn').onclick = async () => {
  if (!S.deptEdit) return;
  await api('PUT', `/api/departments/${S.deptEdit.id}`, {
    name:   $('dept-name').value.trim(),
    budget: Number($('dept-budget').value) || 0,
  });
  flash('dept-flash', true, 'Record updated');
  clearDeptForm();
  await reload();
};

async function deleteDept(id) {
  await api('DELETE', `/api/departments/${id}`);
  if (S.deptEdit?.id === id) clearDeptForm();
  await reload();
}

// ═══════════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════════
function renderProjects() {
  const tbody = $('proj-tbody');
  $('proj-count').textContent    = S.projects.length + ' records';
  $('proj-foot-info').textContent = `${S.projects.length} project${S.projects.length !== 1 ? 's' : ''}`;

  if (!S.projects.length) {
    tbody.innerHTML = `<tr><td class="empty-cell" colspan="6">No projects found</td></tr>`;
    return;
  }

  tbody.innerHTML = S.projects.map(p => {
    const sel = S.projEdit?.id === p.id;
    return `
      <tr class="${sel ? 'row-selected' : ''}" data-id="${p.id}">
        <td>
          <div class="td-name">${p.name}</div>
          <div class="td-id">…${p.id.slice(-6)}</div>
        </td>
        <td class="td-right td-mono td-green">${inr(p.budget)}</td>
        <td><span class="badge badge-${p.status}">${p.status.replace('_', ' ')}</span></td>
        <td>${p.department?.name ?? '—'}</td>
        <td class="td-mono" style="font-size:12px">${p.start_date ?? '—'}</td>
        <td class="td-right">
          <div class="row-acts" id="pra-${p.id}">
            <button class="btn btn-ghost btn-sm" data-edit="${p.id}">Edit</button>
            <button class="icon-btn" data-del="${p.id}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-edit]').forEach(btn =>
    btn.onclick = () => {
      const p = S.projects.find(x => x.id === btn.dataset.edit);
      if (p) beginEditProj(p);
    }
  );

  tbody.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      const id  = btn.dataset.del;
      const box = $('pra-' + id);
      box.innerHTML = `
        <span class="confirm-row">
          <span>Delete?</span>
          <button class="btn btn-danger btn-sm" data-yes="${id}">Yes</button>
          <button class="btn btn-ghost btn-sm" data-no>No</button>
        </span>`;
      box.querySelector('[data-yes]').onclick = () => deleteProj(id);
      box.querySelector('[data-no]').onclick  = () => renderProjects();
    })
  );
}

function clearProjForm() {
  ['proj-name','proj-budget','proj-start','proj-end'].forEach(id => $(id).value = '');
  $('proj-status').value = 'active'; $('proj-dept').value = '';
  S.projEdit = null;
  $('proj-add-btn').classList.remove('hidden');
  $('proj-upd-btn').classList.add('hidden');
  $('proj-cancel').classList.add('hidden');
  $('proj-mode-badge').textContent = 'New';
  $('proj-mode-badge').classList.remove('edit-mode');
}

function beginEditProj(p) {
  S.projEdit = p;
  $('proj-name').value   = p.name;
  $('proj-budget').value = p.budget;
  $('proj-status').value = p.status;
  $('proj-dept').value   = p.department_id || '';
  $('proj-start').value  = p.start_date || '';
  $('proj-end').value    = p.end_date   || '';
  $('proj-add-btn').classList.add('hidden');
  $('proj-upd-btn').classList.remove('hidden');
  $('proj-cancel').classList.remove('hidden');
  $('proj-mode-badge').textContent = 'Editing';
  $('proj-mode-badge').classList.add('edit-mode');
  renderProjects();
  $('proj-name').focus();
}

$('proj-cancel').onclick = () => { clearProjForm(); renderProjects(); };

$('proj-add-btn').onclick = async () => {
  const name = $('proj-name').value.trim();
  if (!name) { flash('proj-flash', false, 'Project name is required'); return; }
  const res = await api('POST', '/api/projects', {
    name,
    budget: Number($('proj-budget').value) || 0,
    status: $('proj-status').value,
    department_id: $('proj-dept').value || null,
    start_date:    $('proj-start').value || null,
    end_date:      $('proj-end').value   || null,
  });
  if (res.error) { flash('proj-flash', false, res.error); return; }
  flash('proj-flash', true, 'Project added');
  clearProjForm();
  await reload();
};

$('proj-upd-btn').onclick = async () => {
  if (!S.projEdit) return;
  await api('PUT', `/api/projects/${S.projEdit.id}`, {
    name:          $('proj-name').value.trim(),
    budget:        Number($('proj-budget').value) || 0,
    status:        $('proj-status').value,
    department_id: $('proj-dept').value || null,
    start_date:    $('proj-start').value || null,
    end_date:      $('proj-end').value   || null,
  });
  flash('proj-flash', true, 'Record updated');
  clearProjForm();
  await reload();
};

async function deleteProj(id) {
  await api('DELETE', `/api/projects/${id}`);
  if (S.projEdit?.id === id) clearProjForm();
  await reload();
}

// ═══════════════════════════════════════════════════════════════
// DEPENDENTS
// ═══════════════════════════════════════════════════════════════
function renderDependents() {
  const tbody = $('dep-tbody');
  $('dep-count').textContent    = S.dependents.length + ' records';
  $('dep-foot-info').textContent = `${S.dependents.length} dependent${S.dependents.length !== 1 ? 's' : ''}`;

  if (!S.dependents.length) {
    tbody.innerHTML = `<tr><td class="empty-cell" colspan="5">No dependent records found</td></tr>`;
    return;
  }

  tbody.innerHTML = S.dependents.map(d => {
    const sel = S.depEdit?.id === d.id;
    return `
      <tr class="${sel ? 'row-selected' : ''}" data-id="${d.id}">
        <td class="td-name">${d.name}</td>
        <td>${d.emp_name}</td>
        <td><span class="badge badge-rel">${d.relationship}</span></td>
        <td class="td-mono" style="font-size:12px">${d.date_of_birth}</td>
        <td class="td-right">
          <div class="row-acts" id="depa-${d.id}">
            <button class="btn btn-ghost btn-sm" data-edit="${d.id}">Edit</button>
            <button class="icon-btn" data-del="${d.id}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-edit]').forEach(btn =>
    btn.onclick = () => {
      const d = S.dependents.find(x => x.id === btn.dataset.edit);
      if (d) beginEditDep(d);
    }
  );

  tbody.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      const id  = btn.dataset.del;
      const box = $('depa-' + id);
      box.innerHTML = `
        <span class="confirm-row">
          <span>Delete?</span>
          <button class="btn btn-danger btn-sm" data-yes="${id}">Yes</button>
          <button class="btn btn-ghost btn-sm" data-no>No</button>
        </span>`;
      box.querySelector('[data-yes]').onclick = () => deleteDep(id);
      box.querySelector('[data-no]').onclick  = () => renderDependents();
    })
  );
}

function clearDepForm() {
  $('dep-emp').value = ''; $('dep-name').value = '';
  $('dep-rel').value = ''; $('dep-dob').value   = '';
  S.depEdit = null;
  $('dep-add-btn').classList.remove('hidden');
  $('dep-upd-btn').classList.add('hidden');
  $('dep-cancel').classList.add('hidden');
  $('dep-mode-badge').textContent = 'New';
  $('dep-mode-badge').classList.remove('edit-mode');
}

function beginEditDep(d) {
  S.depEdit = d;
  $('dep-emp').value  = d.employee_id;
  $('dep-name').value = d.name;
  $('dep-rel').value  = d.relationship;
  $('dep-dob').value  = d.date_of_birth;
  $('dep-add-btn').classList.add('hidden');
  $('dep-upd-btn').classList.remove('hidden');
  $('dep-cancel').classList.remove('hidden');
  $('dep-mode-badge').textContent = 'Editing';
  $('dep-mode-badge').classList.add('edit-mode');
  renderDependents();
  $('dep-name').focus();
}

$('dep-cancel').onclick = () => { clearDepForm(); renderDependents(); };

$('dep-add-btn').onclick = async () => {
  const empId = $('dep-emp').value;
  const name  = $('dep-name').value.trim();
  const rel   = $('dep-rel').value;
  const dob   = $('dep-dob').value;
  if (!empId || !name || !rel || !dob) { flash('dep-flash', false, 'All fields are required'); return; }
  const res = await api('POST', '/api/dependents', { employee_id: empId, name, relationship: rel, date_of_birth: dob });
  if (res.error) { flash('dep-flash', false, res.error); return; }
  flash('dep-flash', true, 'Dependent added');
  clearDepForm();
  await reload();
};

$('dep-upd-btn').onclick = async () => {
  if (!S.depEdit) return;
  await api('PUT', `/api/dependents/${S.depEdit.id}`, {
    employee_id:   $('dep-emp').value,
    name:          $('dep-name').value.trim(),
    relationship:  $('dep-rel').value,
    date_of_birth: $('dep-dob').value,
  });
  flash('dep-flash', true, 'Record updated');
  clearDepForm();
  await reload();
};

async function deleteDep(id) {
  await api('DELETE', `/api/dependents/${id}`);
  if (S.depEdit?.id === id) clearDepForm();
  await reload();
}

// ── Boot ───────────────────────────────────────────────────────────────────
navigate('dashboard');
reload();
