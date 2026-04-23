let adminUser = null;
let confirmCallback = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const API = {
  headers() {
    return { 'Content-Type': 'application/json', 'X-User-Id': adminUser ? adminUser.id : '' };
  },
  async get(p) { const r = await fetch(`/api${p}`, { headers: this.headers() }); if (r.status === 403) { showAccessDenied(); throw new Error('Forbidden'); } if (!r.ok) throw new Error(r.status); return r.json(); },
  async post(p, b) { const r = await fetch(`/api${p}`, { method: 'POST', headers: this.headers(), body: JSON.stringify(b) }); if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.status); } return r.json(); },
  async patch(p, b) { const r = await fetch(`/api${p}`, { method: 'PATCH', headers: this.headers(), body: JSON.stringify(b) }); if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.status); } return r.json(); },
  async del(p) { const r = await fetch(`/api${p}`, { method: 'DELETE', headers: this.headers() }); if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.status); } return r.json(); },
};

// ==================== AUTO-LOGIN FROM SESSION ====================

(async function checkSession() {
  const saved = sessionStorage.getItem('adminUser');
  if (!saved) return;
  try {
    const user = JSON.parse(saved);
    const { is_admin } = await API.get(`/admin/check?user_id=${user.id}`);
    if (is_admin) {
      adminUser = user;
      enterDashboard(user, true);
    } else {
      sessionStorage.removeItem('adminUser');
    }
  } catch {
    sessionStorage.removeItem('adminUser');
  }
})();

// ==================== AUTH (2-step: Email → Password) ====================

let pendingEmail = '';

function showAuthStep(num) {
  $$('.auth-step').forEach(s => s.classList.add('hidden'));
  $(`#authStep${num}`).classList.remove('hidden');
  $(`#authStep${num}`).style.animation = 'none';
  $(`#authStep${num}`).offsetHeight;
  $(`#authStep${num}`).style.animation = '';
}

// Step 1: Email
$('#emailForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#authEmail').value.trim();
  const errEl = $('#emailError');
  const btn = $('#emailBtn');
  errEl.textContent = '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.textContent = '有効なメールアドレスを入力してください';
    $('#authEmail').classList.add('error');
    return;
  }

  btn.classList.add('loading');
  btn.disabled = true;

  // Validate email exists and is admin (via check endpoint)
  try {
    const { user } = await API.post('/auth/login', { email });
    const { is_admin } = await API.get(`/admin/check?user_id=${user.id}`);
    if (!is_admin) {
      errEl.textContent = 'このアカウントには管理者権限がありません';
      btn.classList.remove('loading');
      btn.disabled = false;
      return;
    }
    pendingEmail = email;
    $('#emailBadge').textContent = email;
    btn.classList.remove('loading');
    btn.disabled = false;
    showAuthStep(2);
    $('#authPassword').focus();
  } catch (err) {
    errEl.textContent = 'アカウントが見つかりません';
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

$('#authEmail').addEventListener('input', () => {
  $('#authEmail').classList.remove('error');
  $('#emailError').textContent = '';
});

// Step 2: Password
$('#passwordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = $('#authPassword').value;
  const errEl = $('#passwordError');
  const btn = $('#passwordBtn');
  errEl.textContent = '';

  if (!password) {
    errEl.textContent = 'パスワードを入力してください';
    return;
  }

  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const { user } = await API.post('/auth/admin-login', { email: pendingEmail, password });
    adminUser = user;
    enterDashboard(user);
  } catch (err) {
    errEl.textContent = err.message || 'パスワードが正しくありません';
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

// Password visibility toggle
$('#passwordEye').addEventListener('click', () => {
  const input = $('#authPassword');
  const btn = $('#passwordEye');
  if (input.type === 'password') {
    input.type = 'text';
    btn.classList.add('active');
  } else {
    input.type = 'password';
    btn.classList.remove('active');
  }
});

// Back to email
$('#backToEmail').addEventListener('click', () => {
  showAuthStep(1);
  $('#authEmail').focus();
  $('#authPassword').value = '';
  $('#passwordError').textContent = '';
});

// Escape to go back
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#authStep2').classList.contains('hidden')) {
    showAuthStep(1);
    $('#authEmail').focus();
  }
});

function enterDashboard(user, silent) {
  sessionStorage.setItem('adminUser', JSON.stringify(user));
  $('#authGate').classList.add('hidden');
  $('#adminApp').classList.remove('hidden');
  $('#adminUserInfo').innerHTML = `
    <div class="admin-user-avatar" style="background:${user.avatar_color}">${user.name[0]}</div>
    <div class="admin-user-detail">
      <div class="admin-user-name">${user.name}</div>
      <div class="admin-user-role">${roleLabel(user.role)}</div>
    </div>`;
  loadDashboard();
  if (!silent) showToast('ログインしました', 'success');
}

function showAccessDenied() {
  sessionStorage.removeItem('adminUser');
  adminUser = null;
  $('#adminApp').classList.add('hidden');
  $('#authGate').classList.remove('hidden');
  showAuthStep(1);
  $('#emailError').textContent = 'セッションが無効です。再度サインインしてください。';
}

// ==================== NAV ====================
$$('.admin-nav-item').forEach(item => {
  item.addEventListener('click', () => {
    $$('.admin-nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    $$('.admin-page').forEach(p => p.classList.add('hidden'));
    const page = item.dataset.page;
    const map = { dashboard:'pageDashboard', users:'pageUsers', channels:'pageChannels', broadcast:'pageBroadcast', settings:'pageSettings', messages:'pageMessages' };
    const el = $(`#${map[page]}`);
    el.classList.remove('hidden');
    el.style.animation = 'none'; el.offsetHeight; el.style.animation = '';
    ({ dashboard: loadDashboard, users: loadUsers, channels: loadChannels, broadcast: loadBroadcasts, settings: loadSettings, messages: loadMessages })[page]();
  });
});

// ==================== DASHBOARD ====================
async function loadDashboard() {
  try {
    const s = await API.get('/admin/stats');
    const cards = [
      { label: 'メンバー', value: s.total_users, icon: 'users', bg: 'var(--accent-light)', color: 'var(--accent)' },
      { label: 'オンライン', value: s.online_users, icon: 'online', bg: 'var(--green-light)', color: 'var(--green)' },
      { label: '停止中', value: s.suspended_users, icon: 'suspended', bg: 'var(--red-light)', color: 'var(--red)' },
      { label: 'チャンネル', value: s.total_channels, icon: 'channels', bg: 'var(--yellow-light)', color: 'var(--yellow)' },
      { label: 'メッセージ', value: s.total_messages, icon: 'messages', bg: 'var(--purple-light)', color: 'var(--purple)' },
      { label: 'ファイル', value: s.total_files, icon: 'files', bg: 'var(--red-light)', color: 'var(--red)' },
    ];
    const icons = {
      users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
      online: '<circle cx="12" cy="12" r="5"/>',
      suspended: '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
      channels: '<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>',
      messages: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
      files: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    };
    $('#statsGrid').innerHTML = cards.map(c => `
      <div class="stat-card">
        <div class="stat-icon" style="background:${c.bg};color:${c.color}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">${icons[c.icon]}</svg>
        </div>
        <div class="stat-value">${c.value}</div>
        <div class="stat-label">${c.label}</div>
      </div>
    `).join('');

    const max = Math.max(...s.channel_stats.map(c => c.count), 1);
    $('#channelBars').innerHTML = s.channel_stats.sort((a, b) => b.count - a.count).map(ch => `
      <div class="channel-bar-item">
        <span class="channel-bar-name">${ch.is_archived ? '🗄 ' : '#'} ${ch.name}</span>
        <div class="channel-bar-track">
          <div class="channel-bar-fill" style="width:${Math.max((ch.count / max) * 100, 3)}%">${ch.count}</div>
        </div>
      </div>
    `).join('');
  } catch (e) { console.error(e); }
}
$('#refreshStats').addEventListener('click', () => { loadDashboard(); showToast('更新しました'); });

// ==================== USERS ====================
async function loadUsers() {
  const users = await API.get('/admin/users');
  $('#usersTableBody').innerHTML = users.map(u => {
    const isSelf = u.id === adminUser.id;
    const isSuspended = u.status === 'suspended';
    return `<tr${isSuspended ? ' style="opacity:0.6"' : ''}>
      <td><div class="user-cell"><div class="user-cell-avatar" style="background:${u.avatar_color}">${u.name[0]}</div><span class="user-cell-name">${u.name}${isSelf ? ' <span style="color:var(--accent);font-size:11px">(自分)</span>' : ''}</span></div></td>
      <td style="color:var(--text-secondary)">${u.email}</td>
      <td>${isSuspended
        ? '<span class="suspended-badge">停止中</span>'
        : `<span class="status-dot ${u.status}"></span><span class="status-text">${statusLabel(u.status)}</span>`
      }</td>
      <td>
        ${isSelf ? `<span class="role-badge ${u.role}">${roleLabel(u.role)}</span>` :
          `<select class="role-select" data-user-id="${u.id}" onchange="changeRole(this)">
            <option value="member" ${u.role==='member'?'selected':''}>メンバー</option>
            <option value="admin" ${u.role==='admin'?'selected':''}>管理者</option>
            <option value="owner" ${u.role==='owner'?'selected':''}>オーナー</option>
          </select>`}
      </td>
      <td style="color:var(--text-secondary);font-size:13px">${formatDate(u.created_at)}</td>
      <td><div class="action-btns">
        ${isSelf ? '' : (isSuspended
          ? `<button class="btn-icon" onclick="unsuspendUser('${u.id}','${u.name}')" title="停止解除"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></button>`
          : `<button class="btn-icon danger" onclick="suspendUser('${u.id}','${u.name}')" title="アカウント停止"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></button>`
        )}
        ${isSelf ? '' : `<button class="btn-icon danger" onclick="deleteUser('${u.id}','${u.name}')" title="削除"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`}
      </div></td>
    </tr>`;
  }).join('');
}

async function changeRole(sel) {
  try { await API.patch(`/admin/users/${sel.dataset.userId}/role`, { role: sel.value }); showToast(`ロールを${roleLabel(sel.value)}に変更`, 'success'); }
  catch (e) { showToast(e.message, 'error'); loadUsers(); }
}

function suspendUser(id, name) {
  showConfirm(`「${name}」のアカウントを停止しますか？`, 'このユーザーは即座にログアウトされ、以降ログインできなくなります。', async () => {
    try { await API.post(`/admin/users/${id}/suspend`); showToast(`${name} を停止しました`, 'success'); loadUsers(); } catch (e) { showToast(e.message, 'error'); }
  }, '停止する');
}

function unsuspendUser(id, name) {
  showConfirm(`「${name}」の停止を解除しますか？`, 'このユーザーは再びログインできるようになります。', async () => {
    try { await API.post(`/admin/users/${id}/unsuspend`); showToast(`${name} の停止を解除しました`, 'success'); loadUsers(); } catch (e) { showToast(e.message, 'error'); }
  }, '解除する');
}

function deleteUser(id, name) {
  showConfirm(`「${name}」を完全に削除しますか？`, 'この操作は取り消せません。このユーザーに関連する全てのデータが影響を受けます。', async () => {
    try { await API.del(`/admin/users/${id}`); showToast(`${name} を削除しました`, 'success'); loadUsers(); } catch (e) { showToast(e.message, 'error'); }
  }, '削除する');
}

// ==================== CHANNELS ====================
async function loadChannels() {
  const channels = await API.get('/channels');
  $('#channelsTableBody').innerHTML = channels.map(ch => {
    const archived = ch.is_archived;
    return `<tr${archived ? ' style="opacity:0.6"' : ''}>
      <td><div class="channel-name-cell"><span class="channel-hash">#</span><span>${ch.name}</span></div></td>
      <td style="color:var(--text-secondary)">${ch.topic || '-'}</td>
      <td>${ch.channel_members ? ch.channel_members.length : 0}人</td>
      <td>${archived ? '<span class="archived-badge">アーカイブ</span>' : '<span class="active-badge">アクティブ</span>'}</td>
      <td style="color:var(--text-secondary);font-size:13px">${formatDate(ch.created_at)}</td>
      <td><div class="action-btns">
        ${archived
          ? `<button class="btn-icon" onclick="unarchiveChannel('${ch.id}','${ch.name}')" title="復元"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>`
          : `<button class="btn-icon" onclick="archiveChannel('${ch.id}','${ch.name}')" title="アーカイブ"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/></svg></button>`
        }
        <button class="btn-icon danger" onclick="deleteChannel('${ch.id}','${ch.name}')" title="完全削除"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      </div></td>
    </tr>`;
  }).join('');
}

function archiveChannel(id, name) {
  showConfirm(`#${name} をアーカイブしますか？`, 'チャンネルは読み取り専用になります。後で復元できます。', async () => {
    try { await API.post(`/admin/channels/${id}/archive`); showToast(`#${name} をアーカイブしました`, 'success'); loadChannels(); } catch (e) { showToast(e.message, 'error'); }
  }, 'アーカイブ');
}

function unarchiveChannel(id, name) {
  showConfirm(`#${name} を復元しますか？`, 'チャンネルが再びアクティブになります。', async () => {
    try { await API.post(`/admin/channels/${id}/unarchive`); showToast(`#${name} を復元しました`, 'success'); loadChannels(); } catch (e) { showToast(e.message, 'error'); }
  }, '復元する');
}

function deleteChannel(id, name) {
  showConfirm(`#${name} を完全に削除しますか？`, 'この操作は取り消せません。チャンネル内の全メッセージ・ファイルが削除されます。', async () => {
    try { await API.del(`/admin/channels/${id}`); showToast(`#${name} を削除しました`, 'success'); loadChannels(); } catch (e) { showToast(e.message, 'error'); }
  }, '削除する');
}

// ==================== BROADCAST ====================
const broadcastText = $('#broadcastText');
const sendBroadcastBtn = $('#sendBroadcast');

broadcastText.addEventListener('input', () => { sendBroadcastBtn.disabled = !broadcastText.value.trim(); });

sendBroadcastBtn.addEventListener('click', async () => {
  const text = broadcastText.value.trim();
  if (!text) return;
  sendBroadcastBtn.disabled = true;
  sendBroadcastBtn.innerHTML = '送信中...';
  try {
    await API.post('/admin/broadcast', { text });
    broadcastText.value = '';
    showToast('一斉通知を送信しました', 'success');
    loadBroadcasts();
  } catch (e) { showToast('送信に失敗しました', 'error'); }
  sendBroadcastBtn.disabled = true;
  sendBroadcastBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg> 送信する';
});

async function loadBroadcasts() {
  try {
    const bcs = await API.get('/admin/broadcasts');
    const hist = $('#broadcastHistory');
    if (!bcs.length) { hist.innerHTML = '<div class="broadcast-empty">送信履歴はまだありません</div>'; return; }
    hist.innerHTML = bcs.map(bc => `
      <div class="broadcast-item">
        <div class="broadcast-avatar" style="background:${bc.sender?.avatar_color || '#999'}">${bc.sender?.name?.[0] || '?'}</div>
        <div class="broadcast-content">
          <span class="broadcast-sender">${bc.sender?.name || '不明'}</span>
          <span class="broadcast-time">${formatDateTime(bc.created_at)}</span>
          <div class="broadcast-text">${bc.text}</div>
        </div>
      </div>
    `).join('');
  } catch (e) { console.error(e); }
}

// ==================== SETTINGS ====================
async function loadSettings() {
  try {
    const ws = await API.get('/admin/workspace');
    $('#wsName').value = ws.name || '';
    $('#wsLogo').value = ws.logo_url || '';
    updateLogoPreview(ws.logo_url);
  } catch (e) { console.error(e); }
}

$('#wsLogo').addEventListener('input', (e) => updateLogoPreview(e.target.value));

function updateLogoPreview(url) {
  $('#logoPreview').innerHTML = url ? `<img src="${url}" alt="Logo" onerror="this.style.display='none'">` : '';
}

$('#wsSave').addEventListener('click', async () => {
  try {
    await API.patch('/admin/workspace', { name: $('#wsName').value.trim(), logo_url: $('#wsLogo').value.trim() });
    showToast('ワークスペース設定を保存しました', 'success');
  } catch (e) { showToast('保存に失敗しました', 'error'); }
});

$('#wsReset').addEventListener('click', () => loadSettings());

// ==================== MESSAGES ====================
let searchTimeout = null;
async function loadMessages(search) {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  const msgs = await API.get(`/admin/messages${q}`);
  $('#messagesTableBody').innerHTML = msgs.length ? msgs.map(m => `<tr>
    <td>${m.user ? `<div class="user-cell"><div class="user-cell-avatar" style="background:${m.user.avatar_color};width:24px;height:24px;font-size:10px">${m.user.name[0]}</div><span style="font-size:13px">${m.user.name}</span></div>` : '-'}</td>
    <td>${m.channel ? `<span style="color:var(--text-secondary)">#</span> ${m.channel.name}` : '-'}</td>
    <td><span class="msg-preview">${m.text || '<em style="color:#ccc">ファイルのみ</em>'}</span></td>
    <td>${m.file_url ? `<span class="file-badge">📎 ${(m.file_type||'').split('/')[1]||'file'}</span>` : '-'}</td>
    <td style="color:var(--text-secondary);font-size:12px;white-space:nowrap">${formatDateTime(m.created_at)}</td>
    <td><div class="action-btns">
      ${m.file_url ? `<a href="${m.file_url}" target="_blank" class="btn-icon" title="開く"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>` : ''}
      <button class="btn-icon danger" onclick="deleteMessage('${m.id}')" title="削除"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
    </div></td>
  </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;padding:40px;color:#ccc">メッセージが見つかりません</td></tr>';
}

$('#messageSearch').addEventListener('input', (e) => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => loadMessages(e.target.value), 300); });

function deleteMessage(id) {
  showConfirm('メッセージを削除しますか？', 'この操作は取り消せません。', async () => {
    try { await API.del(`/admin/messages/${id}`); showToast('削除しました', 'success'); loadMessages($('#messageSearch').value); } catch (e) { showToast(e.message, 'error'); }
  }, '削除する');
}

// ==================== CONFIRM MODAL ====================
function showConfirm(title, text, cb, btnLabel) {
  $('#confirmTitle').textContent = title;
  $('#confirmText').textContent = text;
  $('#confirmOk').textContent = btnLabel || '実行する';
  confirmCallback = cb;
  $('#confirmModal').classList.add('open');
}

$('#confirmCancel').addEventListener('click', () => { $('#confirmModal').classList.remove('open'); confirmCallback = null; });
$('#confirmOk').addEventListener('click', async () => {
  $('#confirmModal').classList.remove('open');
  if (confirmCallback) { try { await confirmCallback(); } catch (e) { showToast('操作に失敗しました', 'error'); } confirmCallback = null; }
});
$('#confirmModal').addEventListener('click', (e) => { if (e.target === $('#confirmModal')) { $('#confirmModal').classList.remove('open'); confirmCallback = null; } });

// ==================== TOAST ====================
function showToast(msg, type) {
  const old = document.querySelector('.admin-toast'); if (old) old.remove();
  const t = document.createElement('div'); t.className = `admin-toast ${type||''}`; t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
}

// ==================== HELPERS ====================
function statusLabel(s) { return { online:'オンライン', away:'離席中', dnd:'取り込み中', offline:'オフライン', suspended:'停止中' }[s] || s; }
function roleLabel(r) { return { member:'メンバー', admin:'管理者', owner:'オーナー' }[r] || r; }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('ja-JP',{year:'numeric',month:'short',day:'numeric'}) : '-'; }
function formatDateTime(d) { if (!d) return '-'; const dt = new Date(d); return dt.toLocaleDateString('ja-JP',{month:'short',day:'numeric'})+' '+dt.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}); }
