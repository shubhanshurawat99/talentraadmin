// ── CONFIG ──
const API_BASE = 'http://localhost:5000/api';

// ── AUTH GUARD ──
function getToken() { return localStorage.getItem('td_token'); }

function logout() {
  localStorage.removeItem('td_token');
  localStorage.removeItem('td_admin');
  window.location.href = '/login.html';
}

// Redirect to login if not authenticated
(function authCheck() {
  const token = getToken();
  if (!token) { window.location.href = '/login.html'; return; }
  // Populate header user info
  try {
    const admin = JSON.parse(localStorage.getItem('td_admin') || '{}');
    const name = admin.displayName || admin.username || 'Admin';
    document.getElementById('headerUsername').textContent = name;
    document.getElementById('headerAvatar').textContent = name.charAt(0).toUpperCase();
  } catch(e) {}
})();

// ── API SERVICE ──
const api = {
  async request(method, path, body) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();
    if (res.status === 401) {
      logout(); // Token expired or invalid
      return;
    }
    if (!data.success && res.status >= 400) throw new Error(data.error || 'Request failed');
    return data;
  },
  get: (path) => api.request('GET', path),
  post: (path, body) => api.request('POST', path, body),
  put: (path, body) => api.request('PUT', path, body),
  patch: (path, body) => api.request('PATCH', path, body),
  delete: (path) => api.request('DELETE', path),
};

// ── TOAST ──
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = '', 3200);
}

// ── BADGE ──
function badge(status) {
  return `<span class="badge badge-${status}">${status}</span>`;
}

// ── SKILLS ──
function skillTags(skills = []) {
  if (!skills.length) return '<span style="color:var(--text-faint)">—</span>';
  return `<div class="skills-wrap">${skills.slice(0,4).map(s => `<span class="skill-tag">${s}</span>`).join('')}${skills.length > 4 ? `<span class="skill-tag">+${skills.length - 4}</span>` : ''}</div>`;
}

// ── FORMAT DATE ──
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── MODAL HELPERS ──
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// ══════════════════════════════════════════
//  CANDIDATES
// ══════════════════════════════════════════
let candidateEditId = null;

async function loadCandidates() {
  const tbody = document.getElementById('candidatesTbody');
  const search = document.getElementById('cSearch').value;
  const status = document.getElementById('cStatusFilter').value;
  const exp = document.getElementById('cExpFilter').value;
  tbody.innerHTML = `<tr><td colspan="8"><div class="loading"><div class="spinner"></div> Loading candidates…</div></td></tr>`;
  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (exp) params.set('experience', exp);
    const res = await api.get(`/candidates?${params}`);
    document.getElementById('cCount').textContent = `${res.count} record${res.count !== 1 ? 's' : ''}`;
    if (!res.data.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><p>No candidates found.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = res.data.map(c => `
      <tr onclick="viewCandidate('${c._id}')">
        <td><div class="td-name">${c.name}</div><div class="td-email">${c.email}</div></td>
        <td class="td-mono">${c.phone}</td>
        <td>${c.location}</td>
        <td>${c.currentCompany}</td>
        <td><span style="color:var(--amber)">${c.experience} yrs</span></td>
        <td>${skillTags(c.skills)}</td>
        <td>${badge(c.status)}</td>
        <td onclick="event.stopPropagation()">
          <div class="action-row">
            <button class="btn btn-ghost btn-sm btn-icon" onclick="editCandidate('${c._id}')" title="Edit">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteCandidate('${c._id}')" title="Delete">🗑</button>
          </div>
        </td>
      </tr>`).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:var(--red);padding:20px 12px">${e.message}</td></tr>`;
  }
}

async function loadCandidateStats() {
  try {
    const res = await api.get('/candidates/stats');
    const d = res.data;
    document.getElementById('cTotal').textContent = d.total;
    const statusMap = Object.fromEntries(d.byStatus.map(s => [s._id, s.count]));
    document.getElementById('cPending').textContent = statusMap.pending || 0;
    document.getElementById('cShortlisted').textContent = statusMap.shortlisted || 0;
    document.getElementById('cRejected').textContent = statusMap.rejected || 0;
  } catch(e) {}
}

async function viewCandidate(id) {
  try {
    const res = await api.get(`/candidates/${id}`);
    const c = res.data;
    document.getElementById('detailModalTitle').textContent = c.name;
    document.getElementById('detailContent').innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${c.email}</div></div>
        <div class="detail-item"><div class="detail-label">Phone</div><div class="detail-value">${c.phone}</div></div>
        <div class="detail-item"><div class="detail-label">Location</div><div class="detail-value">${c.location}</div></div>
        <div class="detail-item"><div class="detail-label">Current Company</div><div class="detail-value">${c.currentCompany}</div></div>
        <div class="detail-item"><div class="detail-label">Current CTC</div><div class="detail-value" style="color:var(--amber)">${c.currentCTC}</div></div>
        <div class="detail-item"><div class="detail-label">Experience</div><div class="detail-value">${c.experience} years</div></div>
        <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value">${badge(c.status)}</div></div>
        <div class="detail-item"><div class="detail-label">Applied On</div><div class="detail-value">${fmtDate(c.createdAt)}</div></div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">Skills</div>
        <div class="skills-wrap">${c.skills.map(s => `<span class="skill-tag">${s}</span>`).join('') || '—'}</div>
      </div>
      ${c.resumeLink ? `<div class="detail-section"><div class="detail-section-title">Resume</div><a href="${c.resumeLink}" target="_blank" style="color:var(--amber)">${c.resumeLink}</a></div>` : ''}
      <div class="detail-section">
        <div class="detail-section-title">Linked Recruiters (${c.recruiters?.length || 0})</div>
        <div class="linked-list">
          ${c.recruiters?.length ? c.recruiters.map(r => `
            <div class="linked-item">
              <div>
                <div class="linked-item-name">${r.company}</div>
                <div class="linked-item-meta">${r.contactPerson} · ${r.email}</div>
              </div>
              ${badge(r.status || 'pending')}
            </div>`).join('') : '<div style="color:var(--text-faint);font-size:0.82rem">No recruiters linked yet.</div>'}
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">Update Status</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${['pending','reviewed','shortlisted','rejected'].map(s =>
            `<button class="btn btn-ghost btn-sm" onclick="updateCandidateStatus('${c._id}','${s}')" style="${c.status===s?'border-color:var(--amber);color:var(--amber)':''}">${s}</button>`
          ).join('')}
        </div>
      </div>`;
    openModal('detailModal');
  } catch(e) { toast(e.message, 'error'); }
}

async function updateCandidateStatus(id, status) {
  try {
    await api.patch(`/candidates/${id}/status`, { status });
    toast(`Status updated to ${status}`);
    closeModal('detailModal');
    loadCandidates(); loadCandidateStats();
  } catch(e) { toast(e.message, 'error'); }
}

function openAddCandidateModal() {
  candidateEditId = null;
  document.getElementById('cFormTitle').textContent = 'Add Candidate';
  document.getElementById('cForm').reset();
  openModal('cFormModal');
}

async function editCandidate(id) {
  try {
    const res = await api.get(`/candidates/${id}`);
    const c = res.data;
    candidateEditId = id;
    document.getElementById('cFormTitle').textContent = 'Edit Candidate';
    document.getElementById('cName').value = c.name;
    document.getElementById('cEmail').value = c.email;
    document.getElementById('cPhone').value = c.phone;
    document.getElementById('cLocation').value = c.location;
    document.getElementById('cCompany').value = c.currentCompany;
    document.getElementById('cCTC').value = c.currentCTC;
    document.getElementById('cSkills').value = c.skills.join(', ');
    document.getElementById('cExperience').value = c.experience;
    document.getElementById('cResumeLink').value = c.resumeLink || '';
    openModal('cFormModal');
  } catch(e) { toast(e.message, 'error'); }
}

async function saveCandidateForm() {
  const body = {
    name: document.getElementById('cName').value.trim(),
    email: document.getElementById('cEmail').value.trim(),
    phone: document.getElementById('cPhone').value.trim(),
    location: document.getElementById('cLocation').value.trim(),
    currentCompany: document.getElementById('cCompany').value.trim(),
    currentCTC: document.getElementById('cCTC').value.trim(),
    skills: document.getElementById('cSkills').value.trim(),
    experience: document.getElementById('cExperience').value,
    resumeLink: document.getElementById('cResumeLink').value.trim(),
  };
  try {
    if (candidateEditId) {
      await api.put(`/candidates/${candidateEditId}`, body);
      toast('Candidate updated');
    } else {
      await api.post('/candidates', body);
      toast('Candidate added');
    }
    closeModal('cFormModal');
    loadCandidates(); loadCandidateStats();
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteCandidate(id) {
  if (!confirm('Delete this candidate?')) return;
  try {
    await api.delete(`/candidates/${id}`);
    toast('Candidate deleted');
    loadCandidates(); loadCandidateStats();
  } catch(e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════
//  RECRUITERS
// ══════════════════════════════════════════
let recruiterEditId = null;

async function loadRecruiters() {
  const tbody = document.getElementById('recruitersTbody');
  const search = document.getElementById('rSearch').value;
  const status = document.getElementById('rStatusFilter').value;
  tbody.innerHTML = `<tr><td colspan="7"><div class="loading"><div class="spinner"></div> Loading recruiters…</div></td></tr>`;
  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const res = await api.get(`/recruiters?${params}`);
    document.getElementById('rCount').textContent = `${res.count} record${res.count !== 1 ? 's' : ''}`;
    if (!res.data.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>No recruiters found.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = res.data.map(r => `
      <tr onclick="viewRecruiter('${r._id}')">
        <td><div class="td-name">${r.company}</div></td>
        <td><div>${r.contactPerson}</div><div class="td-email">${r.email}</div></td>
        <td class="td-mono">${r.phone}</td>
        <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-dim)">${r.message}</td>
        <td style="text-align:center"><span style="color:var(--amber);font-family:'Syne',sans-serif;font-weight:700">${r.candidates?.length || 0}</span></td>
        <td>${badge(r.status)}</td>
        <td onclick="event.stopPropagation()">
          <div class="action-row">
            <button class="btn btn-ghost btn-sm btn-icon" onclick="editRecruiter('${r._id}')" title="Edit">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteRecruiter('${r._id}')" title="Delete">🗑</button>
          </div>
        </td>
      </tr>`).join('');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--red);padding:20px 12px">${e.message}</td></tr>`;
  }
}

async function loadRecruiterStats() {
  try {
    const res = await api.get('/recruiters/stats');
    const d = res.data;
    document.getElementById('rTotal').textContent = d.total;
    const statusMap = Object.fromEntries(d.byStatus.map(s => [s._id, s.count]));
    document.getElementById('rPending').textContent = statusMap.pending || 0;
    document.getElementById('rContacted').textContent = statusMap.contacted || 0;
    document.getElementById('rClosed').textContent = statusMap.closed || 0;
  } catch(e) {}
}

async function viewRecruiter(id) {
  try {
    const res = await api.get(`/recruiters/${id}`);
    const r = res.data;
    document.getElementById('detailModalTitle').textContent = r.company;
    document.getElementById('detailContent').innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Contact Person</div><div class="detail-value">${r.contactPerson}</div></div>
        <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${r.email}</div></div>
        <div class="detail-item"><div class="detail-label">Phone</div><div class="detail-value">${r.phone}</div></div>
        <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value">${badge(r.status)}</div></div>
        <div class="detail-item" style="grid-column:1/-1"><div class="detail-label">Message</div><div class="detail-value" style="white-space:pre-wrap;line-height:1.5">${r.message}</div></div>
        <div class="detail-item"><div class="detail-label">Registered On</div><div class="detail-value">${fmtDate(r.createdAt)}</div></div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">Linked Candidates (${r.candidates?.length || 0})</div>
        <div class="linked-list">
          ${r.candidates?.length ? r.candidates.map(c => `
            <div class="linked-item">
              <div>
                <div class="linked-item-name">${c.name}</div>
                <div class="linked-item-meta">${c.email} · ${c.experience} yrs · ${c.currentCompany}</div>
              </div>
              ${badge(c.status)}
            </div>`).join('') : '<div style="color:var(--text-faint);font-size:0.82rem">No candidates linked yet.</div>'}
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">Update Status</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${['pending','contacted','closed'].map(s =>
            `<button class="btn btn-ghost btn-sm" onclick="updateRecruiterStatus('${r._id}','${s}')" style="${r.status===s?'border-color:var(--amber);color:var(--amber)':''}">${s}</button>`
          ).join('')}
        </div>
      </div>`;
    openModal('detailModal');
  } catch(e) { toast(e.message, 'error'); }
}

async function updateRecruiterStatus(id, status) {
  try {
    await api.patch(`/recruiters/${id}/status`, { status });
    toast(`Status updated to ${status}`);
    closeModal('detailModal');
    loadRecruiters(); loadRecruiterStats();
  } catch(e) { toast(e.message, 'error'); }
}

function openAddRecruiterModal() {
  recruiterEditId = null;
  document.getElementById('rFormTitle').textContent = 'Add Recruiter';
  document.getElementById('rForm').reset();
  openModal('rFormModal');
}

async function editRecruiter(id) {
  try {
    const res = await api.get(`/recruiters/${id}`);
    const r = res.data;
    recruiterEditId = id;
    document.getElementById('rFormTitle').textContent = 'Edit Recruiter';
    document.getElementById('rCompany').value = r.company;
    document.getElementById('rContactPerson').value = r.contactPerson;
    document.getElementById('rEmail').value = r.email;
    document.getElementById('rPhone').value = r.phone;
    document.getElementById('rMessage').value = r.message;
    openModal('rFormModal');
  } catch(e) { toast(e.message, 'error'); }
}

async function saveRecruiterForm() {
  const body = {
    company: document.getElementById('rCompany').value.trim(),
    contactPerson: document.getElementById('rContactPerson').value.trim(),
    email: document.getElementById('rEmail').value.trim(),
    phone: document.getElementById('rPhone').value.trim(),
    message: document.getElementById('rMessage').value.trim(),
  };
  try {
    if (recruiterEditId) {
      await api.put(`/recruiters/${recruiterEditId}`, body);
      toast('Recruiter updated');
    } else {
      await api.post('/recruiters', body);
      toast('Recruiter added');
    }
    closeModal('rFormModal');
    loadRecruiters(); loadRecruiterStats();
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteRecruiter(id) {
  if (!confirm('Delete this recruiter?')) return;
  try {
    await api.delete(`/recruiters/${id}`);
    toast('Recruiter deleted');
    loadRecruiters(); loadRecruiterStats();
  } catch(e) { toast(e.message, 'error'); }
}

// ── VIEW SWITCH ──
function switchView(view) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`page-${view}`).classList.add('active');
  document.getElementById(`toggle-${view}`).classList.add('active');
  if (view === 'candidates') { loadCandidates(); loadCandidateStats(); }
  if (view === 'recruiters') { loadRecruiters(); loadRecruiterStats(); }
}

// ── SEARCH DEBOUNCE ──
let _st;
function debounce(fn) {
  clearTimeout(_st);
  _st = setTimeout(fn, 350);
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  switchView('candidates');
  document.getElementById('cSearch').addEventListener('input', () => debounce(loadCandidates));
  document.getElementById('rSearch').addEventListener('input', () => debounce(loadRecruiters));
});
