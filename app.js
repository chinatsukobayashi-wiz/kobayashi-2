// ==================== API CLIENT ====================

const API = {
  async get(path) {
    const res = await fetch(`/api${path}`);
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
    return res.json();
  },
  async patch(path, body) {
    const res = await fetch(`/api${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
    return res.json();
  },
};

// ==================== STATE ====================

let pendingFiles = []; // files queued for upload
let users = [];
let channels = [];
let currentUser = null;
let activeChannel = null;
let activeNav = 'home';
let currentMessages = [];
let currentThreadMsg = null;

const emojis = [
  '😀','😂','🤣','😊','😍','🥰','😎','🤔','😅','😭',
  '🥺','😤','🔥','💯','❤️','💪','👍','👎','👏','🙌',
  '🎉','🎊','✅','❌','⭐','🚀','💡','📌','🔔','💬',
  '👀','🙏','🤝','✨','🌟','💻','📱','🎨','🎯','📝',
  '☕','🍕','🍣','🎬','🎵','🌙','🐛','🔧','📢','🏆',
];

// ==================== DOM REFS ====================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const channelListEl = $('#channelList');
const dmListEl = $('#dmList');
const dmListFullEl = $('#dmListFull');
const messagesEl = $('#messages');
const messagesContainer = $('#messagesContainer');
const messageInput = $('#messageInput');
const sendBtn = $('#sendBtn');
const channelNameEl = $('#channelName');
const channelTopicEl = $('#channelTopic');
const typingIndicator = $('#typingIndicator');
const threadPanel = $('#threadPanel');
const threadMessagesEl = $('#threadMessages');
const threadInput = $('#threadInput');
const threadSendBtn = $('#threadSendBtn');
const emojiPicker = $('#emojiPicker');
const emojiGrid = $('#emojiGrid');
const emojiSearch = $('#emojiSearch');
const addChannelModal = $('#addChannelModal');
const mentionPopup = $('#mentionPopup');
const themeToggle = $('#themeToggle');
const themeDropdown = $('#themeDropdown');
const sidebarThemeBtn = $('#sidebarThemeBtn');

// ==================== UTILITY ====================

function getUserById(id) {
  return users.find(u => u.id === id);
}

function formatTime(date) {
  if (!(date instanceof Date)) date = new Date(date);
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
  if (!(date instanceof Date)) date = new Date(date);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return '今日';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return '昨日';
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ==================== INIT (BOOT FROM API) ====================

async function init() {
  try {
    // Auto-login as 田中 太郎
    const { user } = await API.post('/auth/login', {
      email: 'tanaka@example.com',
      name: '田中 太郎'
    });
    currentUser = user;

    // Load users & channels from API
    users = await API.get('/users');
    channels = (await API.get('/channels')).map(ch => ({ ...ch, unread: 0 }));

    // Set initial active channel
    const general = channels.find(c => c.name === 'general');
    activeChannel = general ? general.id : channels[0]?.id;

    // Show admin gear if admin
    if (currentUser.role === 'admin' || currentUser.role === 'owner') {
      const adminLink = document.getElementById('adminLink');
      if (adminLink) adminLink.classList.remove('hidden');
    }

    // Render everything
    initGlobalNav();
    renderChannels();
    renderDMs();
    await loadAndRenderMessages();
    renderEmojiPicker();
    initEventListeners();
    initSectionCollapse();

    // Setup realtime
    setupRealtime();
  } catch (err) {
    console.error('Init failed:', err);
    messagesEl.innerHTML = `<div style="padding:40px;text-align:center;color:var(--main-text-secondary)">
      サーバーに接続できません。<br><code>npm start</code> でサーバーを起動してください。
    </div>`;
  }
}

// ==================== REALTIME ====================

async function setupRealtime() {
  try {
    const config = await API.get('/realtime-config');
    // Poll for new messages every 3 seconds as a simple realtime substitute
    setInterval(async () => {
      if (!activeChannel) return;
      const msgs = await API.get(`/channels/${activeChannel}/messages`);
      if (msgs.length !== currentMessages.length) {
        currentMessages = msgs;
        renderMessages(true);
      }
    }, 3000);
  } catch (e) {
    console.warn('Realtime setup skipped:', e.message);
  }
}

// ==================== GLOBAL NAV ====================

function initGlobalNav() {
  $$('.global-nav-item').forEach(item => {
    item.addEventListener('click', () => switchNav(item.dataset.nav));
  });
}

function switchNav(nav) {
  activeNav = nav;
  $$('.global-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.nav === nav);
  });
  $$('.sidebar-view').forEach(view => view.classList.add('hidden'));

  const viewMap = { home: 'viewHome', dm: 'viewDm', activity: 'viewActivity', later: 'viewLater', more: 'viewMore' };
  const targetView = $(`.sidebar-view#${viewMap[nav]}`);
  if (targetView) {
    targetView.classList.remove('hidden');
    targetView.style.animation = 'none';
    targetView.offsetHeight;
    targetView.style.animation = '';
  }

  if (nav === 'dm') renderDMsFull();
  if (nav === 'activity') renderActivityList();
}

// ==================== SKELETON ====================

function showSkeleton() {
  messagesEl.innerHTML = `
    <div class="skeleton-container">
      ${Array.from({ length: 5 }, (_, i) => `
        <div class="skeleton-message" style="animation-delay:${i * 0.1}s">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-content">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line ${['medium', 'long', 'medium'][i % 3]}"></div>
            ${i % 2 === 0 ? '<div class="skeleton-line short"></div>' : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ==================== RENDER ====================

function renderChannels() {
  channelListEl.innerHTML = channels.map(ch => `
    <div class="channel-item ${ch.id === activeChannel ? 'active' : ''} ${ch.unread > 0 ? 'unread' : ''}"
         data-channel="${ch.id}">
      <span class="channel-prefix">#</span>
      <span>${ch.name}</span>
      ${ch.unread > 0 ? `<span class="badge">${ch.unread}</span>` : ''}
    </div>
  `).join('');

  channelListEl.querySelectorAll('.channel-item').forEach(el => {
    el.addEventListener('click', () => switchChannel(el.dataset.channel));
  });
}

function renderDMs() {
  const otherUsers = users.filter(u => u.id !== currentUser.id);
  dmListEl.innerHTML = otherUsers.map(user => `
    <div class="dm-item" data-user="${user.id}">
      <div class="dm-avatar" style="background:${user.avatar_color}">${user.name[0]}</div>
      <div class="dm-status ${user.status}"></div>
      <span>${user.name}</span>
    </div>
  `).join('');
}

function renderDMsFull() {
  if (!dmListFullEl) return;
  const otherUsers = users.filter(u => u.id !== currentUser.id);
  dmListFullEl.innerHTML = otherUsers.map(user => `
    <div class="dm-item" data-user="${user.id}">
      <div class="dm-avatar" style="background:${user.avatar_color}">${user.name[0]}</div>
      <div class="dm-status ${user.status}"></div>
      <span>${user.name}</span>
    </div>
  `).join('');
}

async function renderActivityList() {
  const list = $('#activityList');
  if (!list) return;

  // Fetch recent reactions and thread replies from the API as activity
  // For now, build from current messages data
  const activities = [];
  for (const ch of channels) {
    try {
      const msgs = await API.get(`/channels/${ch.id}/messages`);
      msgs.forEach(msg => {
        if (msg.reactions) {
          msg.reactions.forEach(r => {
            r.users.forEach(uid => {
              if (uid !== currentUser.id) {
                const u = getUserById(uid);
                if (u) {
                  activities.push({
                    user: u,
                    text: `${r.emoji} でリアクションしました`,
                    preview: msg.text.substring(0, 30) + '...',
                    time: formatTime(msg.created_at),
                  });
                }
              }
            });
          });
        }
      });
    } catch (e) { /* skip */ }
  }

  list.innerHTML = activities.slice(0, 10).map(act => `
    <div class="activity-item">
      <div class="activity-avatar" style="background:${act.user.avatar_color}">${act.user.name[0]}</div>
      <div class="activity-info">
        <div class="activity-title">${act.user.name} ${act.text}</div>
        <div class="activity-preview">${act.preview}</div>
      </div>
      <span class="activity-time">${act.time}</span>
    </div>
  `).join('') || '<p style="padding:16px;font-size:13px;opacity:0.6">アクティビティはまだありません</p>';
}

async function loadAndRenderMessages(animate) {
  if (!activeChannel) return;
  const channel = channels.find(c => c.id === activeChannel);
  if (!channel) return;

  channelNameEl.textContent = `# ${channel.name}`;
  channelTopicEl.textContent = channel.topic || '';
  messageInput.placeholder = `#${channel.name} にメッセージを送信`;

  try {
    currentMessages = await API.get(`/channels/${activeChannel}/messages`);
    renderMessages(animate);
  } catch (err) {
    console.error('Failed to load messages:', err);
    messagesEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--main-text-secondary)">メッセージの読み込みに失敗しました</div>';
  }
}

function renderMessages(animate) {
  const msgs = currentMessages;
  let html = '';
  let lastDate = '';
  let lastUserId = '';

  msgs.forEach((msg, i) => {
    const user = msg.user || getUserById(msg.user_id);
    if (!user) return;

    const dateStr = formatDate(msg.created_at);
    const time = new Date(msg.created_at);

    if (dateStr !== lastDate) {
      html += `<div class="date-divider"><span>${dateStr}</span></div>`;
      lastDate = dateStr;
      lastUserId = '';
    }

    const prevTime = i > 0 ? new Date(msgs[i - 1].created_at) : null;
    const isGrouped = lastUserId === msg.user_id && prevTime &&
      (time - prevTime) < 5 * 60 * 1000;

    const isLast = i === msgs.length - 1;
    const color = user.avatar_color || user.color || '#1264a3';

    html += `
      <div class="message ${isGrouped ? 'grouped' : ''} ${animate && isLast ? 'message-enter' : ''}" data-msg-id="${msg.id}">
        <div class="message-avatar" style="background:${color}">${isGrouped ? '' : user.name[0]}</div>
        <div class="message-content">
          ${isGrouped ? '' : `
            <div class="message-header">
              <span class="message-author">${user.name}</span>
              <span class="message-time">${formatTime(msg.created_at)}</span>
            </div>
          `}
          <div class="message-text">${msg.text ? formatMessageText(msg.text) : ''}</div>
          ${renderFileAttachment(msg)}
          ${renderReactions(msg)}
          ${msg.thread_count > 0 ? `
            <div class="message-thread-link" data-msg-id="${msg.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="opacity:0.7"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              ${msg.thread_count}件の返信
            </div>
          ` : ''}
        </div>
        <div class="message-actions">
          <button class="message-action-btn" data-action="react" data-msg-id="${msg.id}" title="リアクション">😀</button>
          <button class="message-action-btn" data-action="thread" data-msg-id="${msg.id}" title="スレッドで返信">💬</button>
          <button class="message-action-btn" data-action="bookmark" data-msg-id="${msg.id}" title="ブックマーク">🔖</button>
          <button class="message-action-btn" data-action="more" data-msg-id="${msg.id}" title="その他">⋯</button>
        </div>
      </div>
    `;

    lastUserId = msg.user_id;
  });

  messagesEl.innerHTML = html;
  scrollToBottom();
  bindMessageEvents();
}

function formatMessageText(text) {
  text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
  text = text.replace(/@([^\s@]+(?:\s[^\s@]+)?)/g, (match, name) => {
    const user = users.find(u => u.name === name);
    if (user) return `<span class="mention" data-user-id="${user.id}">@${name}</span>`;
    return match;
  });
  text = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" style="color:var(--accent)">$1</a>');
  return text;
}

function renderFileAttachment(msg) {
  if (!msg.file_url) return '';
  const type = msg.file_type || '';
  const name = msg.file_name || 'file';
  const size = msg.file_size ? formatFileSize(msg.file_size) : '';

  if (type.startsWith('image/')) {
    return `
      <div class="message-attachment">
        <img src="${msg.file_url}" alt="${name}" loading="lazy"
             onclick="openLightbox('${msg.file_url}', 'image')" />
      </div>`;
  }

  if (type.startsWith('video/')) {
    return `
      <div class="message-attachment">
        <video src="${msg.file_url}" controls preload="metadata"></video>
      </div>`;
  }

  return `
    <div class="message-attachment">
      <div class="message-attachment-file">
        <div class="attachment-file-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="attachment-file-info">
          <a class="attachment-file-name" href="${msg.file_url}" target="_blank">${name}</a>
          <div class="attachment-file-meta">${size}</div>
        </div>
      </div>
    </div>`;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderReactions(msg) {
  if (!msg.reactions || msg.reactions.length === 0) return '';
  return `
    <div class="message-reactions">
      ${msg.reactions.map(r => `
        <span class="reaction ${r.users.includes(currentUser.id) ? 'active' : ''}"
              data-msg-id="${msg.id}" data-emoji="${r.emoji}">
          ${r.emoji} <span class="reaction-count">${r.users.length}</span>
        </span>
      `).join('')}
      <span class="reaction add-reaction" data-msg-id="${msg.id}" data-action="add-reaction">+</span>
    </div>
  `;
}

async function renderThread(msgId) {
  try {
    const { parent, replies } = await API.get(`/messages/${msgId}/thread`);
    const user = parent.user || getUserById(parent.user_id);
    const color = user.avatar_color || user.color || '#1264a3';

    let html = `
      <div class="message" style="padding:8px 20px;margin:0">
        <div class="message-avatar" style="background:${color}">${user.name[0]}</div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-author">${user.name}</span>
            <span class="message-time" style="opacity:1">${formatTime(parent.created_at)}</span>
          </div>
          <div class="message-text">${formatMessageText(parent.text)}</div>
          ${renderReactions(parent)}
        </div>
      </div>
      <div style="border-bottom:1px solid var(--border-color);margin:8px 0;font-size:12px;color:var(--main-text-secondary);padding:0 0 8px 0">
        ${replies.length}件の返信
      </div>
    `;

    replies.forEach((reply, i) => {
      const rUser = reply.user || getUserById(reply.user_id);
      const rColor = rUser.avatar_color || rUser.color || '#1264a3';
      html += `
        <div class="message message-enter" style="padding:6px 20px;margin:0;animation-delay:${i * 0.05}s">
          <div class="message-avatar" style="background:${rColor};width:28px;height:28px;font-size:11px">${rUser.name[0]}</div>
          <div class="message-content">
            <div class="message-header">
              <span class="message-author" style="font-size:14px">${rUser.name}</span>
              <span class="message-time" style="opacity:1">${formatTime(reply.created_at)}</span>
            </div>
            <div class="message-text">${formatMessageText(reply.text)}</div>
          </div>
        </div>
      `;
    });

    threadMessagesEl.innerHTML = html;
    currentThreadMsg = { id: msgId, channel_id: parent.channel_id };
  } catch (err) {
    console.error('Failed to load thread:', err);
  }
}

function renderEmojiPicker() {
  emojiGrid.innerHTML = emojis.map(e =>
    `<div class="emoji-item" data-emoji="${e}">${e}</div>`
  ).join('');
}

// ==================== MENTION POPUP ====================

let mentionSelectedIndex = 0;
let mentionFilteredUsers = [];
let mentionActive = false;

function showMentionPopup(filter) {
  mentionFilteredUsers = users.filter(u =>
    u.id !== currentUser.id &&
    (filter === '' || u.name.toLowerCase().includes(filter.toLowerCase()))
  );

  if (mentionFilteredUsers.length === 0) { hideMentionPopup(); return; }

  mentionSelectedIndex = 0;
  mentionActive = true;

  mentionPopup.innerHTML = mentionFilteredUsers.map((u, i) => `
    <div class="mention-popup-item ${i === 0 ? 'selected' : ''}" data-user-id="${u.id}">
      <div class="mention-popup-avatar" style="background:${u.avatar_color}">${u.name[0]}</div>
      <span class="mention-popup-name">${u.name}</span>
      <span class="mention-popup-status">${u.status === 'online' ? '🟢' : '🔘'}</span>
    </div>
  `).join('');

  mentionPopup.classList.add('open');
  mentionPopup.querySelectorAll('.mention-popup-item').forEach(el => {
    el.addEventListener('click', () => insertMention(el.dataset.userId));
  });
}

function hideMentionPopup() {
  mentionPopup.classList.remove('open');
  mentionActive = false;
}

function insertMention(userId) {
  const user = getUserById(userId);
  const val = messageInput.value;
  const atIndex = val.lastIndexOf('@');
  if (atIndex >= 0) {
    messageInput.value = val.substring(0, atIndex) + `@${user.name} `;
  }
  hideMentionPopup();
  messageInput.focus();
  sendBtn.classList.toggle('active', messageInput.value.trim().length > 0);
}

function updateMentionSelection(dir) {
  mentionSelectedIndex = (mentionSelectedIndex + dir + mentionFilteredUsers.length) % mentionFilteredUsers.length;
  mentionPopup.querySelectorAll('.mention-popup-item').forEach((el, i) => {
    el.classList.toggle('selected', i === mentionSelectedIndex);
  });
}

// ==================== ACTIONS (ALL VIA API) ====================

async function switchChannel(channelId) {
  activeChannel = channelId;
  const ch = channels.find(c => c.id === channelId);
  if (ch) ch.unread = 0;
  renderChannels();
  showSkeleton();
  closeThread();
  await loadAndRenderMessages();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

async function sendMessage() {
  const text = messageInput.value.trim();
  const hasFiles = pendingFiles.length > 0;
  if (!text && !hasFiles) return;
  if (!activeChannel) return;

  messageInput.value = '';
  messageInput.style.height = 'auto';
  sendBtn.classList.remove('active');

  try {
    if (hasFiles) {
      // Upload each file and send as separate messages
      for (const file of pendingFiles) {
        const uploaded = await uploadFile(file);
        await API.post(`/channels/${activeChannel}/messages`, {
          user_id: currentUser.id,
          text: text || '',
          file_url: uploaded.file_url,
          file_name: uploaded.file_name,
          file_type: uploaded.file_type,
          file_size: uploaded.file_size,
        });
        // Only attach text to the first file message
        if (text) text = '';
      }
      clearPendingFiles();
    } else {
      await API.post(`/channels/${activeChannel}/messages`, {
        user_id: currentUser.id,
        text,
      });
    }
    await loadAndRenderMessages(true);
  } catch (err) {
    console.error('Failed to send message:', err);
  }
}

async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

async function sendThreadReply() {
  const text = threadInput.value.trim();
  if (!text || !currentThreadMsg) return;

  threadInput.value = '';

  try {
    await API.post(`/channels/${currentThreadMsg.channel_id}/messages`, {
      user_id: currentUser.id,
      text,
      thread_id: currentThreadMsg.id,
    });
    await renderThread(currentThreadMsg.id);
    await loadAndRenderMessages(true);
  } catch (err) {
    console.error('Failed to send thread reply:', err);
  }
}

async function toggleReaction(msgId, emoji) {
  try {
    await API.post(`/messages/${msgId}/reactions`, {
      user_id: currentUser.id,
      emoji,
    });
    await loadAndRenderMessages();
  } catch (err) {
    console.error('Failed to toggle reaction:', err);
  }
}

async function openThread(msgId) {
  await renderThread(msgId);
  threadPanel.classList.add('open');
}

function closeThread() {
  threadPanel.classList.remove('open');
  currentThreadMsg = null;
}

async function createChannel() {
  const name = $('#newChannelName').value.trim().toLowerCase().replace(/\s+/g, '-');
  const topic = $('#newChannelTopic').value.trim();
  if (!name) return;

  try {
    const newChannel = await API.post('/channels', {
      name,
      topic,
      created_by: currentUser.id,
    });

    channels.push({ ...newChannel, unread: 0 });
    addChannelModal.classList.remove('open');
    $('#newChannelName').value = '';
    $('#newChannelTopic').value = '';
    renderChannels();
    await switchChannel(newChannel.id);
  } catch (err) {
    console.error('Failed to create channel:', err);
    alert('チャンネルの作成に失敗しました。同名のチャンネルが既に存在する可能性があります。');
  }
}

// ==================== MESSAGE EVENT BINDING ====================

function bindMessageEvents() {
  document.querySelectorAll('.message-thread-link').forEach(el => {
    el.addEventListener('click', () => openThread(el.dataset.msgId));
  });

  document.querySelectorAll('.message-action-btn').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el.dataset.action === 'thread') openThread(el.dataset.msgId);
      if (el.dataset.action === 'react') toggleEmojiPickerForMsg(el.dataset.msgId, el);
    });
  });

  document.querySelectorAll('.reaction:not(.add-reaction)').forEach(el => {
    el.addEventListener('click', () => {
      el.classList.add('pop');
      setTimeout(() => el.classList.remove('pop'), 400);
      toggleReaction(el.dataset.msgId, el.dataset.emoji);
    });
  });

  document.querySelectorAll('.reaction.add-reaction').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleEmojiPickerForMsg(el.dataset.msgId, el);
    });
  });
}

let activeEmojiMsgId = null;
let emojiTarget = 'input';

function toggleEmojiPickerForMsg(msgId, btnEl) {
  activeEmojiMsgId = msgId;
  emojiTarget = 'msg';
  const rect = btnEl.getBoundingClientRect();
  emojiPicker.style.top = (rect.bottom + 4) + 'px';
  emojiPicker.style.left = Math.min(rect.left, window.innerWidth - 350) + 'px';
  emojiPicker.classList.toggle('open');
}

// ==================== THEME ====================

let isDark = false;

themeToggle.addEventListener('click', () => {
  isDark = !isDark;
  document.body.setAttribute('data-theme', isDark ? 'dark' : '');
  if (!isDark) document.body.removeAttribute('data-theme');
  themeToggle.textContent = isDark ? '☀️' : '🌙';
});

sidebarThemeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  themeDropdown.classList.toggle('open');
});

themeDropdown.querySelectorAll('.theme-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.documentElement.setAttribute('data-sidebar-theme', opt.dataset.sidebarTheme);
    themeDropdown.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    themeDropdown.classList.remove('open');
  });
});

// ==================== EVENT LISTENERS ====================

function initEventListeners() {
  sendBtn.addEventListener('click', sendMessage);

  messageInput.addEventListener('keydown', (e) => {
    if (mentionActive) {
      if (e.key === 'ArrowDown') { e.preventDefault(); updateMentionSelection(1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); updateMentionSelection(-1); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        insertMention(mentionFilteredUsers[mentionSelectedIndex].id);
        return;
      }
      if (e.key === 'Escape') { hideMentionPopup(); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
    sendBtn.classList.toggle('active', messageInput.value.trim().length > 0);

    const val = messageInput.value;
    const cursorPos = messageInput.selectionStart;
    const textBefore = val.substring(0, cursorPos);
    const atMatch = textBefore.match(/@([^\s@]*)$/);
    atMatch ? showMentionPopup(atMatch[1]) : hideMentionPopup();
  });

  $('#closeThread').addEventListener('click', closeThread);
  threadSendBtn.addEventListener('click', sendThreadReply);
  threadInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendThreadReply(); }
  });

  $('#emojiBtn').addEventListener('click', (e) => {
    emojiTarget = 'input';
    const rect = e.currentTarget.getBoundingClientRect();
    emojiPicker.style.top = (rect.top - 390) + 'px';
    emojiPicker.style.left = rect.left + 'px';
    emojiPicker.classList.toggle('open');
  });

  emojiGrid.addEventListener('click', (e) => {
    const item = e.target.closest('.emoji-item');
    if (!item) return;
    const emoji = item.dataset.emoji;
    if (emojiTarget === 'input') {
      messageInput.value += emoji;
      messageInput.focus();
      sendBtn.classList.add('active');
    } else if (emojiTarget === 'msg' && activeEmojiMsgId) {
      toggleReaction(activeEmojiMsgId, emoji);
    }
    emojiPicker.classList.remove('open');
  });

  emojiSearch.addEventListener('input', () => { if (!emojiSearch.value) renderEmojiPicker(); });

  document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && !e.target.closest('.emoji-btn') && !e.target.closest('.message-action-btn') && !e.target.closest('.add-reaction')) {
      emojiPicker.classList.remove('open');
    }
    if (!mentionPopup.contains(e.target)) hideMentionPopup();
    if (!themeDropdown.contains(e.target) && e.target !== sidebarThemeBtn) themeDropdown.classList.remove('open');
  });

  $('#addChannel').addEventListener('click', () => {
    addChannelModal.classList.add('open');
    $('#newChannelName').focus();
  });

  $('#closeAddChannel').addEventListener('click', () => addChannelModal.classList.remove('open'));
  $('#cancelAddChannel').addEventListener('click', () => addChannelModal.classList.remove('open'));
  $('#confirmAddChannel').addEventListener('click', createChannel);

  // Search
  $('#searchInput').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (!query) { renderChannels(); return; }
    const filtered = channels.filter(ch => ch.name.includes(query));
    channelListEl.innerHTML = filtered.map(ch => `
      <div class="channel-item ${ch.id === activeChannel ? 'active' : ''}" data-channel="${ch.id}">
        <span class="channel-prefix">#</span>
        <span>${ch.name}</span>
      </div>
    `).join('');
    channelListEl.querySelectorAll('.channel-item').forEach(el => {
      el.addEventListener('click', () => switchChannel(el.dataset.channel));
    });
  });

  // Mention button
  $('#mentionBtn').addEventListener('click', () => {
    messageInput.value += '@';
    messageInput.focus();
    showMentionPopup('');
  });

  // ===== FILE UPLOAD =====
  const fileInput = $('#fileInput');
  const filePreview = $('#filePreview');
  const filePreviewInner = $('#filePreviewInner');
  const dropOverlay = $('#dropOverlay');

  // Attach button opens file picker
  $('#attachBtn').addEventListener('click', () => fileInput.click());

  // File input change
  fileInput.addEventListener('change', () => {
    addFiles(Array.from(fileInput.files));
    fileInput.value = '';
  });

  // Drag & Drop
  const mainArea = messagesContainer;
  let dragCounter = 0;

  mainArea.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    dropOverlay.classList.add('active');
  });

  mainArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) { dropOverlay.classList.remove('active'); dragCounter = 0; }
  });

  mainArea.addEventListener('dragover', (e) => e.preventDefault());

  mainArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropOverlay.classList.remove('active');
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    if (files.length) addFiles(files);
  });

  // Paste image
  messageInput.addEventListener('paste', (e) => {
    const items = Array.from(e.clipboardData.items);
    const files = items
      .filter(i => i.kind === 'file' && (i.type.startsWith('image/') || i.type.startsWith('video/')))
      .map(i => i.getAsFile())
      .filter(Boolean);
    if (files.length) addFiles(files);
  });

  // Lightbox
  const lightbox = $('#lightbox');
  const lightboxContent = $('#lightboxContent');
  $('#lightboxClose').addEventListener('click', () => lightbox.classList.remove('open'));
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.classList.remove('open');
  });
}

// ===== FILE HELPERS =====

function addFiles(files) {
  const filePreview = $('#filePreview');
  const filePreviewInner = $('#filePreviewInner');

  files.forEach(file => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;
    pendingFiles.push(file);
  });

  renderFilePreview();
  sendBtn.classList.toggle('active', pendingFiles.length > 0 || messageInput.value.trim().length > 0);
}

function renderFilePreview() {
  const filePreview = $('#filePreview');
  const filePreviewInner = $('#filePreviewInner');

  if (pendingFiles.length === 0) {
    filePreview.style.display = 'none';
    return;
  }

  filePreview.style.display = 'flex';
  filePreviewInner.innerHTML = pendingFiles.map((file, i) => {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith('image/')) {
      return `
        <div class="file-preview-item">
          <img src="${url}" alt="${file.name}">
          <button class="file-preview-remove" data-index="${i}">&times;</button>
        </div>`;
    }
    if (file.type.startsWith('video/')) {
      return `
        <div class="file-preview-item">
          <video src="${url}" muted></video>
          <button class="file-preview-remove" data-index="${i}">&times;</button>
        </div>`;
    }
    return '';
  }).join('');

  // Remove buttons
  filePreviewInner.querySelectorAll('.file-preview-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      pendingFiles.splice(idx, 1);
      renderFilePreview();
      sendBtn.classList.toggle('active', pendingFiles.length > 0 || messageInput.value.trim().length > 0);
    });
  });
}

function clearPendingFiles() {
  pendingFiles = [];
  renderFilePreview();
}

function openLightbox(url, type) {
  const lightbox = $('#lightbox');
  const lightboxContent = $('#lightboxContent');
  if (type === 'image') {
    lightboxContent.innerHTML = `<img src="${url}" alt="">`;
  } else {
    lightboxContent.innerHTML = `<video src="${url}" controls autoplay></video>`;
  }
  lightbox.classList.add('open');
}

function initSectionCollapse() {
  document.querySelectorAll('.section-header').forEach(el => {
    el.classList.add('open');
    el.addEventListener('click', () => {
      el.classList.toggle('open');
      const items = el.nextElementSibling;
      const addItem = items ? items.nextElementSibling : null;
      if (el.classList.contains('open')) {
        if (items) items.style.display = '';
        if (addItem && addItem.classList.contains('add-item')) addItem.style.display = '';
      } else {
        if (items) items.style.display = 'none';
        if (addItem && addItem.classList.contains('add-item')) addItem.style.display = 'none';
      }
    });
  });
}

// ==================== BOOT ====================

init();
