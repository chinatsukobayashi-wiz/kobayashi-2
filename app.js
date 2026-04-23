// ==================== DATA ====================

const users = [
  { id: 'u1', name: '田中 太郎', color: '#e01e5a', status: 'online' },
  { id: 'u2', name: '佐藤 花子', color: '#2bac76', status: 'online' },
  { id: 'u3', name: '鈴木 一郎', color: '#ecb22e', status: 'away' },
  { id: 'u4', name: '高橋 美咲', color: '#1264a3', status: 'online' },
  { id: 'u5', name: '山田 健太', color: '#e06b1e', status: 'away' },
];

const currentUser = users[0];

const channels = [
  { id: 'ch1', name: 'general', topic: 'チームの全般的な会話', unread: 0 },
  { id: 'ch2', name: 'random', topic: '雑談チャンネル', unread: 3 },
  { id: 'ch3', name: 'dev', topic: '開発に関する議論', unread: 0 },
  { id: 'ch4', name: 'design', topic: 'デザインレビュー', unread: 0 },
  { id: 'ch5', name: 'announcements', topic: 'お知らせ', unread: 1 },
];

let activeChannel = 'ch1';
let activeNav = 'home';

const allMessages = {
  ch1: [
    {
      id: 'm1', userId: 'u2', text: 'おはようございます！今日のスタンドアップミーティングは10時からですね。',
      time: new Date(2026, 3, 23, 9, 0), reactions: [{ emoji: '👍', users: ['u1', 'u3'] }],
      thread: [
        { id: 't1', userId: 'u1', text: 'はい、Zoomリンクは同じですか？', time: new Date(2026, 3, 23, 9, 5) },
        { id: 't2', userId: 'u2', text: 'はい、いつものリンクです！', time: new Date(2026, 3, 23, 9, 7) },
      ]
    },
    {
      id: 'm2', userId: 'u3', text: 'API仕様書を更新しました。確認お願いします。\nhttps://docs.example.com/api/v2',
      time: new Date(2026, 3, 23, 9, 15), reactions: [{ emoji: '👀', users: ['u2'] }, { emoji: '🙏', users: ['u1', 'u4'] }],
      thread: []
    },
    {
      id: 'm3', userId: 'u4', text: '新しいデザインシステムのコンポーネントをFigmaに追加しました。フィードバックお待ちしています！',
      time: new Date(2026, 3, 23, 10, 30), reactions: [],
      thread: [
        { id: 't3', userId: 'u1', text: 'ボタンのホバーエフェクトがいい感じですね！', time: new Date(2026, 3, 23, 10, 45) },
      ]
    },
    {
      id: 'm4', userId: 'u1', text: 'CI/CDパイプラインの修正が完了しました。\n```\nnpm run build\nnpm run test\nnpm run deploy\n```\nこれでデプロイが自動化されます。',
      time: new Date(2026, 3, 23, 11, 0), reactions: [{ emoji: '🎉', users: ['u2', 'u3', 'u4', 'u5'] }],
      thread: []
    },
    {
      id: 'm5', userId: 'u5', text: '来週の金曜日にチームランチを予定しています。参加できる方はリアクションしてください！🍕',
      time: new Date(2026, 3, 23, 12, 0), reactions: [{ emoji: '🍕', users: ['u1', 'u2', 'u3'] }, { emoji: '🙌', users: ['u4'] }],
      thread: []
    },
    {
      id: 'm6', userId: 'u2', text: '@田中 太郎 データベースのマイグレーションスクリプトをレビューしてもらえますか？\nPR #234 です。',
      time: new Date(2026, 3, 23, 14, 20), reactions: [],
      thread: [
        { id: 't4', userId: 'u3', text: '見てみます！', time: new Date(2026, 3, 23, 14, 25) },
        { id: 't5', userId: 'u3', text: 'LGTMです。インデックスの追加も忘れずに。', time: new Date(2026, 3, 23, 14, 50) },
        { id: 't6', userId: 'u2', text: 'ありがとうございます！修正しました。', time: new Date(2026, 3, 23, 15, 10) },
      ]
    },
  ],
  ch2: [
    {
      id: 'm7', userId: 'u5', text: '昨日見た映画がめちゃくちゃ面白かった！おすすめです。',
      time: new Date(2026, 3, 23, 10, 0), reactions: [{ emoji: '🎬', users: ['u2'] }],
      thread: []
    },
    {
      id: 'm8', userId: 'u3', text: 'オフィスの自販機に新しいコーヒーが入ったらしい ☕',
      time: new Date(2026, 3, 23, 11, 30), reactions: [{ emoji: '☕', users: ['u1', 'u4', 'u5'] }],
      thread: []
    },
    {
      id: 'm9', userId: 'u4', text: '今週末、ハッカソンに参加する人いますか？',
      time: new Date(2026, 3, 23, 13, 0), reactions: [],
      thread: [
        { id: 't7', userId: 'u1', text: '参加します！テーマは何ですか？', time: new Date(2026, 3, 23, 13, 15) },
        { id: 't8', userId: 'u4', text: 'AIアプリケーションがテーマです', time: new Date(2026, 3, 23, 13, 20) },
      ]
    },
  ],
  ch3: [
    {
      id: 'm10', userId: 'u1', text: 'TypeScript 5.5 がリリースされましたね。新しい機能をチェックしましょう。',
      time: new Date(2026, 3, 23, 9, 30), reactions: [{ emoji: '🚀', users: ['u3', 'u4'] }],
      thread: []
    },
    {
      id: 'm11', userId: 'u3', text: 'パフォーマンスの最適化について調査しています。\n`React.memo` と `useMemo` の使い分けについてまとめました。',
      time: new Date(2026, 3, 23, 11, 0), reactions: [],
      thread: []
    },
    {
      id: 'm12', userId: 'u2', text: 'E2Eテストの結果、3件のflakyテストを発見しました。修正PR出します。',
      time: new Date(2026, 3, 23, 15, 0), reactions: [{ emoji: '🐛', users: ['u1'] }],
      thread: []
    },
  ],
  ch4: [
    {
      id: 'm13', userId: 'u4', text: 'ダークモードのカラーパレットを更新しました。確認お願いします！',
      time: new Date(2026, 3, 23, 10, 0), reactions: [{ emoji: '🌙', users: ['u1', 'u2'] }],
      thread: []
    },
  ],
  ch5: [
    {
      id: 'm14', userId: 'u1', text: '📢 来月からリモートワークのポリシーが変更になります。詳細はHRのページを確認してください。',
      time: new Date(2026, 3, 23, 8, 0), reactions: [{ emoji: '👀', users: ['u2', 'u3', 'u4', 'u5'] }],
      thread: []
    },
  ],
};

const dmUsers = [
  { userId: 'u2', unread: 2 },
  { userId: 'u3', unread: 0 },
  { userId: 'u4', unread: 1 },
  { userId: 'u5', unread: 0 },
];

const activityData = [
  { userId: 'u2', type: 'mention', text: '@田中 太郎 をメンションしました', preview: 'データベースのマイグレーション...', time: '14:20' },
  { userId: 'u3', type: 'reaction', text: '👀 でリアクションしました', preview: 'API仕様書を更新しました。', time: '9:16' },
  { userId: 'u4', type: 'thread', text: 'スレッドに返信しました', preview: 'ボタンのホバーエフェクトが...', time: '10:45' },
  { userId: 'u5', type: 'reaction', text: '🍕 でリアクションしました', preview: '来週の金曜日にチームランチ...', time: '12:05' },
];

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
const threadMessages = $('#threadMessages');
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
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return '今日';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return '昨日';
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ==================== GLOBAL NAV ====================

function initGlobalNav() {
  const navItems = $$('.global-nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const nav = item.dataset.nav;
      switchNav(nav);
    });
  });
}

function switchNav(nav) {
  activeNav = nav;

  // Update active state
  $$('.global-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.nav === nav);
  });

  // Switch sidebar views
  $$('.sidebar-view').forEach(view => view.classList.add('hidden'));

  const viewMap = {
    home: 'viewHome',
    dm: 'viewDm',
    activity: 'viewActivity',
    later: 'viewLater',
    more: 'viewMore',
  };

  const targetView = $(`.sidebar-view#${viewMap[nav]}`);
  if (targetView) {
    targetView.classList.remove('hidden');
    // Re-trigger animation
    targetView.style.animation = 'none';
    targetView.offsetHeight;
    targetView.style.animation = '';
  }

  // Populate DM full list
  if (nav === 'dm') {
    renderDMsFull();
  }

  // Populate activity list
  if (nav === 'activity') {
    renderActivityList();
  }
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
  dmListEl.innerHTML = dmUsers.map(dm => {
    const user = getUserById(dm.userId);
    return `
      <div class="dm-item ${dm.unread > 0 ? 'unread' : ''}" data-user="${dm.userId}">
        <div class="dm-avatar" style="background:${user.color}">${user.name[0]}</div>
        <div class="dm-status ${user.status}"></div>
        <span>${user.name}</span>
        ${dm.unread > 0 ? `<span class="badge">${dm.unread}</span>` : ''}
      </div>
    `;
  }).join('');
}

function renderDMsFull() {
  if (!dmListFullEl) return;
  dmListFullEl.innerHTML = users.filter(u => u.id !== currentUser.id).map(user => {
    const dm = dmUsers.find(d => d.userId === user.id);
    const unread = dm ? dm.unread : 0;
    return `
      <div class="dm-item ${unread > 0 ? 'unread' : ''}" data-user="${user.id}">
        <div class="dm-avatar" style="background:${user.color}">${user.name[0]}</div>
        <div class="dm-status ${user.status}"></div>
        <span>${user.name}</span>
        ${unread > 0 ? `<span class="badge">${unread}</span>` : ''}
      </div>
    `;
  }).join('');
}

function renderActivityList() {
  const list = $('#activityList');
  if (!list) return;
  list.innerHTML = activityData.map(act => {
    const user = getUserById(act.userId);
    return `
      <div class="activity-item">
        <div class="activity-avatar" style="background:${user.color}">${user.name[0]}</div>
        <div class="activity-info">
          <div class="activity-title">${user.name} ${act.text}</div>
          <div class="activity-preview">${act.preview}</div>
        </div>
        <span class="activity-time">${act.time}</span>
      </div>
    `;
  }).join('');
}

function renderMessages(animate) {
  const msgs = allMessages[activeChannel] || [];
  const channel = channels.find(c => c.id === activeChannel);

  channelNameEl.textContent = `# ${channel.name}`;
  channelTopicEl.textContent = channel.topic;
  messageInput.placeholder = `#${channel.name} にメッセージを送信`;

  let html = '';
  let lastDate = '';
  let lastUserId = '';

  msgs.forEach((msg, i) => {
    const user = getUserById(msg.userId);
    const dateStr = formatDate(msg.time);

    if (dateStr !== lastDate) {
      html += `<div class="date-divider"><span>${dateStr}</span></div>`;
      lastDate = dateStr;
      lastUserId = '';
    }

    const isGrouped = lastUserId === msg.userId && i > 0 &&
      (msg.time - msgs[i - 1].time) < 5 * 60 * 1000;

    const isLast = i === msgs.length - 1;

    html += `
      <div class="message ${isGrouped ? 'grouped' : ''} ${animate && isLast ? 'message-enter' : ''}" data-msg-id="${msg.id}">
        <div class="message-avatar" style="background:${user.color}">${isGrouped ? '' : user.name[0]}</div>
        <div class="message-content">
          ${isGrouped ? '' : `
            <div class="message-header">
              <span class="message-author">${user.name}</span>
              <span class="message-time">${formatTime(msg.time)}</span>
            </div>
          `}
          <div class="message-text">${formatMessageText(msg.text)}</div>
          ${renderReactions(msg)}
          ${msg.thread && msg.thread.length > 0 ? `
            <div class="message-thread-link" data-msg-id="${msg.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="opacity:0.7"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              ${msg.thread.length}件の返信
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

    lastUserId = msg.userId;
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
    if (user) {
      return `<span class="mention" data-user-id="${user.id}">@${name}</span>`;
    }
    return match;
  });
  text = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" style="color:var(--accent)">$1</a>');
  return text;
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

function renderThread(msg) {
  const user = getUserById(msg.userId);
  let html = `
    <div class="message" style="padding:8px 20px;margin:0">
      <div class="message-avatar" style="background:${user.color}">${user.name[0]}</div>
      <div class="message-content">
        <div class="message-header">
          <span class="message-author">${user.name}</span>
          <span class="message-time" style="opacity:1">${formatTime(msg.time)}</span>
        </div>
        <div class="message-text">${formatMessageText(msg.text)}</div>
        ${renderReactions(msg)}
      </div>
    </div>
    <div style="border-bottom:1px solid var(--border-color);margin:8px 0;font-size:12px;color:var(--main-text-secondary);padding:0 0 8px 0">
      ${msg.thread.length}件の返信
    </div>
  `;

  msg.thread.forEach((reply, i) => {
    const rUser = getUserById(reply.userId);
    html += `
      <div class="message message-enter" style="padding:6px 20px;margin:0;animation-delay:${i * 0.05}s">
        <div class="message-avatar" style="background:${rUser.color};width:28px;height:28px;font-size:11px">${rUser.name[0]}</div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-author" style="font-size:14px">${rUser.name}</span>
            <span class="message-time" style="opacity:1">${formatTime(reply.time)}</span>
          </div>
          <div class="message-text">${formatMessageText(reply.text)}</div>
        </div>
      </div>
    `;
  });

  threadMessages.innerHTML = html;
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

  if (mentionFilteredUsers.length === 0) {
    hideMentionPopup();
    return;
  }

  mentionSelectedIndex = 0;
  mentionActive = true;

  mentionPopup.innerHTML = mentionFilteredUsers.map((u, i) => `
    <div class="mention-popup-item ${i === 0 ? 'selected' : ''}" data-user-id="${u.id}">
      <div class="mention-popup-avatar" style="background:${u.color}">${u.name[0]}</div>
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

// ==================== EVENTS ====================

function switchChannel(channelId) {
  activeChannel = channelId;
  const ch = channels.find(c => c.id === channelId);
  if (ch) ch.unread = 0;
  renderChannels();
  showSkeleton();
  setTimeout(() => renderMessages(), 400 + Math.random() * 300);
  closeThread();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  if (!allMessages[activeChannel]) allMessages[activeChannel] = [];
  allMessages[activeChannel].push({
    id: 'm' + Date.now(),
    userId: currentUser.id,
    text,
    time: new Date(),
    reactions: [],
    thread: [],
  });

  messageInput.value = '';
  messageInput.style.height = 'auto';
  sendBtn.classList.remove('active');
  renderMessages(true);
  simulateReply();
}

function simulateReply() {
  const replies = [
    'なるほど、ありがとうございます！',
    'いいですね！👍',
    '確認しました。',
    '了解です！',
    'それは面白いですね。',
    '対応します！',
    'ありがとうございます！後で確認しますね。',
    'LGTM 🚀',
  ];

  const otherUsers = users.filter(u => u.id !== currentUser.id);
  const randomUser = otherUsers[Math.floor(Math.random() * otherUsers.length)];

  typingIndicator.innerHTML = `
    <div class="typing-dots"><span></span><span></span><span></span></div>
    ${randomUser.name}が入力しています...
  `;

  setTimeout(() => {
    typingIndicator.innerHTML = '';
    allMessages[activeChannel].push({
      id: 'm' + Date.now(),
      userId: randomUser.id,
      text: replies[Math.floor(Math.random() * replies.length)],
      time: new Date(),
      reactions: [],
      thread: [],
    });
    renderMessages(true);
  }, 1500 + Math.random() * 2000);
}

function bindMessageEvents() {
  document.querySelectorAll('.message-thread-link').forEach(el => {
    el.addEventListener('click', () => openThread(el.dataset.msgId));
  });

  document.querySelectorAll('.message-action-btn').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = el.dataset.action;
      const msgId = el.dataset.msgId;
      if (action === 'thread') openThread(msgId);
      if (action === 'react') toggleEmojiPickerForMsg(msgId, el);
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

function openThread(msgId) {
  const msgs = allMessages[activeChannel] || [];
  const msg = msgs.find(m => m.id === msgId);
  if (!msg) return;
  currentThreadMsg = msg;
  renderThread(msg);
  threadPanel.classList.add('open');
}

let currentThreadMsg = null;

function closeThread() {
  threadPanel.classList.remove('open');
  currentThreadMsg = null;
}

function sendThreadReply() {
  const text = threadInput.value.trim();
  if (!text || !currentThreadMsg) return;
  currentThreadMsg.thread.push({
    id: 't' + Date.now(),
    userId: currentUser.id,
    text,
    time: new Date(),
  });
  threadInput.value = '';
  renderThread(currentThreadMsg);
  renderMessages(true);
}

function toggleReaction(msgId, emoji) {
  const msgs = allMessages[activeChannel] || [];
  const msg = msgs.find(m => m.id === msgId);
  if (!msg) return;

  let reaction = msg.reactions.find(r => r.emoji === emoji);
  if (reaction) {
    const idx = reaction.users.indexOf(currentUser.id);
    if (idx >= 0) {
      reaction.users.splice(idx, 1);
      if (reaction.users.length === 0) {
        msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
      }
    } else {
      reaction.users.push(currentUser.id);
    }
  } else {
    msg.reactions.push({ emoji, users: [currentUser.id] });
  }

  renderMessages();
}

// ==================== THEME ====================

let isDark = false;

themeToggle.addEventListener('click', () => {
  isDark = !isDark;
  if (isDark) {
    document.body.setAttribute('data-theme', 'dark');
    themeToggle.textContent = '☀️';
  } else {
    document.body.removeAttribute('data-theme');
    themeToggle.textContent = '🌙';
  }
});

sidebarThemeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  themeDropdown.classList.toggle('open');
});

themeDropdown.querySelectorAll('.theme-option').forEach(opt => {
  opt.addEventListener('click', () => {
    const theme = opt.dataset.sidebarTheme;
    document.documentElement.setAttribute('data-sidebar-theme', theme);
    themeDropdown.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    themeDropdown.classList.remove('open');
  });
});

document.addEventListener('click', (e) => {
  if (!themeDropdown.contains(e.target) && e.target !== sidebarThemeBtn) {
    themeDropdown.classList.remove('open');
  }
});

// ==================== EVENT LISTENERS ====================

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

  if (atMatch) {
    showMentionPopup(atMatch[1]);
  } else {
    hideMentionPopup();
  }
});

$('#closeThread').addEventListener('click', closeThread);
threadSendBtn.addEventListener('click', sendThreadReply);
threadInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendThreadReply();
  }
});

$('#emojiBtn').addEventListener('click', (e) => {
  emojiTarget = 'input';
  const rect = e.currentTarget.getBoundingClientRect();
  emojiPicker.style.top = (rect.top - 390) + 'px';
  emojiPicker.style.left = rect.left + 'px';
  emojiPicker.classList.toggle('open');
});

renderEmojiPicker();

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

emojiSearch.addEventListener('input', () => {
  if (!emojiSearch.value) renderEmojiPicker();
});

document.addEventListener('click', (e) => {
  if (!emojiPicker.contains(e.target) && !e.target.closest('.emoji-btn') && !e.target.closest('.message-action-btn') && !e.target.closest('.add-reaction')) {
    emojiPicker.classList.remove('open');
  }
  if (!mentionPopup.contains(e.target)) {
    hideMentionPopup();
  }
});

$('#addChannel').addEventListener('click', () => {
  addChannelModal.classList.add('open');
  $('#newChannelName').focus();
});

$('#closeAddChannel').addEventListener('click', () => addChannelModal.classList.remove('open'));
$('#cancelAddChannel').addEventListener('click', () => addChannelModal.classList.remove('open'));

$('#confirmAddChannel').addEventListener('click', () => {
  const name = $('#newChannelName').value.trim().toLowerCase().replace(/\s+/g, '-');
  const topic = $('#newChannelTopic').value.trim();
  if (!name) return;

  const id = 'ch' + Date.now();
  channels.push({ id, name, topic: topic || '', unread: 0 });
  allMessages[id] = [];
  addChannelModal.classList.remove('open');
  $('#newChannelName').value = '';
  $('#newChannelTopic').value = '';
  renderChannels();
  switchChannel(id);
});

// Section collapse
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

// Search
$('#searchInput').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  if (!query) {
    renderChannels();
    return;
  }
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

// ==================== INIT ====================

initGlobalNav();
renderChannels();
renderDMs();
renderMessages();
