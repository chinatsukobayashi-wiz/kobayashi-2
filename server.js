require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Busboy = require('busboy');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client (service role for full access)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(cors());

// ==================== FILE UPLOAD (before static & json parser) ====================

app.post('/api/upload', (req, res) => {
  const bb = Busboy({ headers: req.headers, limits: { fileSize: 50 * 1024 * 1024 } });
  let fileData = null;

  bb.on('file', (fieldname, stream, info) => {
    const { filename, mimeType } = info;
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => {
      const buf = Buffer.concat(chunks);
      fileData = {
        buffer: buf,
        originalname: filename,
        mimetype: mimeType,
        size: buf.length,
      };
    });
  });

  bb.on('finish', async () => {
    if (!fileData) return res.status(400).json({ error: 'No file provided' });

    const ext = path.extname(fileData.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = `messages/${fileName}`;

    const { error } = await supabase.storage
      .from('uploads')
      .upload(filePath, fileData.buffer, {
        contentType: fileData.mimetype,
        upsert: false,
      });

    if (error) return res.status(500).json({ error: error.message });

    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);

    res.json({
      file_url: urlData.publicUrl,
      file_name: fileData.originalname,
      file_type: fileData.mimetype,
      file_size: fileData.size,
    });
  });

  bb.on('error', (err) => res.status(500).json({ error: err.message }));
  req.pipe(bb);
});

// Static files & JSON parser for all other routes
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// ==================== AUTH ====================

// Simple login (find or create user by email)
app.post('/api/auth/login', async (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  // Check if user exists
  let { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (!user) {
    // Create new user
    const colors = ['#e01e5a', '#2bac76', '#ecb22e', '#1264a3', '#e06b1e', '#8e44ad', '#16a085'];
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        name: name || email.split('@')[0],
        avatar_color: colors[Math.floor(Math.random() * colors.length)]
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    user = data;

    // Auto-join general and random
    const { data: defaultChannels } = await supabase
      .from('channels')
      .select('id')
      .in('name', ['general', 'random']);

    if (defaultChannels) {
      await supabase.from('channel_members').insert(
        defaultChannels.map(ch => ({ channel_id: ch.id, user_id: user.id }))
      );
    }
  }

  // Update status to online
  await supabase.from('users').update({ status: 'online' }).eq('id', user.id);

  res.json({ user });
});

// Admin login with password
app.post('/api/auth/admin-login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'メールアドレスとパスワードが必要です' });

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (!user) return res.status(401).json({ error: 'アカウントが見つかりません' });
  if (user.role !== 'admin' && user.role !== 'owner') return res.status(403).json({ error: 'このアカウントには管理者権限がありません' });
  if (user.status === 'suspended') return res.status(403).json({ error: 'このアカウントは停止されています' });
  if (user.password_hash !== password) return res.status(401).json({ error: 'パスワードが正しくありません' });

  await supabase.from('users').update({ status: 'online' }).eq('id', user.id);
  res.json({ user });
});

// ==================== USERS ====================

app.get('/api/users', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.patch('/api/users/:id/status', async (req, res) => {
  const { status } = req.body;
  const { data, error } = await supabase
    .from('users')
    .update({ status })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ==================== CHANNELS ====================

app.get('/api/channels', async (req, res) => {
  const { data, error } = await supabase
    .from('channels')
    .select('*, channel_members(user_id)')
    .order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/channels', async (req, res) => {
  const { name, topic, created_by } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const { data: channel, error } = await supabase
    .from('channels')
    .insert({ name: name.toLowerCase().replace(/\s+/g, '-'), topic, created_by })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Add creator as member
  if (created_by) {
    await supabase.from('channel_members').insert({
      channel_id: channel.id,
      user_id: created_by
    });
  }

  res.status(201).json(channel);
});

app.get('/api/channels/:id/members', async (req, res) => {
  const { data, error } = await supabase
    .from('channel_members')
    .select('user_id, users(*)')
    .eq('channel_id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(m => m.users));
});

app.post('/api/channels/:id/join', async (req, res) => {
  const { user_id } = req.body;
  const { error } = await supabase
    .from('channel_members')
    .insert({ channel_id: req.params.id, user_id });
  if (error && error.code !== '23505') return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ==================== MESSAGES ====================

app.get('/api/channels/:channelId/messages', async (req, res) => {
  const { limit = 50, before } = req.query;

  let query = supabase
    .from('messages')
    .select(`
      *,
      user:users(*),
      reactions(*, user:users(id, name)),
      thread_replies:messages!thread_id(id)
    `)
    .eq('channel_id', req.params.channelId)
    .is('thread_id', null)
    .order('created_at', { ascending: true })
    .limit(parseInt(limit));

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Group reactions
  const messages = data.map(msg => ({
    ...msg,
    reactions: groupReactions(msg.reactions),
    thread_count: msg.thread_replies ? msg.thread_replies.length : 0,
    thread_replies: undefined,
  }));

  res.json(messages);
});

app.post('/api/channels/:channelId/messages', async (req, res) => {
  const { user_id, text, thread_id, file_url, file_name, file_type, file_size } = req.body;
  if (!text && !file_url) return res.status(400).json({ error: 'text or file is required' });

  const { data, error } = await supabase
    .from('messages')
    .insert({
      channel_id: req.params.channelId,
      user_id,
      text: text || '',
      thread_id: thread_id || null,
      file_url: file_url || null,
      file_name: file_name || null,
      file_type: file_type || null,
      file_size: file_size || null,
    })
    .select('*, user:users(*)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ ...data, reactions: [], thread_count: 0 });
});

// ==================== THREADS ====================

app.get('/api/messages/:messageId/thread', async (req, res) => {
  // Get parent message
  const { data: parent, error: parentErr } = await supabase
    .from('messages')
    .select('*, user:users(*), reactions(*,user:users(id,name))')
    .eq('id', req.params.messageId)
    .single();

  if (parentErr) return res.status(500).json({ error: parentErr.message });

  // Get replies
  const { data: replies, error: repliesErr } = await supabase
    .from('messages')
    .select('*, user:users(*)')
    .eq('thread_id', req.params.messageId)
    .order('created_at', { ascending: true });

  if (repliesErr) return res.status(500).json({ error: repliesErr.message });

  res.json({
    parent: { ...parent, reactions: groupReactions(parent.reactions) },
    replies
  });
});

// ==================== REACTIONS ====================

app.post('/api/messages/:messageId/reactions', async (req, res) => {
  const { user_id, emoji } = req.body;
  if (!emoji) return res.status(400).json({ error: 'emoji is required' });

  // Toggle: check if reaction exists
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('message_id', req.params.messageId)
    .eq('user_id', user_id)
    .eq('emoji', emoji)
    .single();

  if (existing) {
    // Remove reaction
    await supabase.from('reactions').delete().eq('id', existing.id);
    res.json({ action: 'removed' });
  } else {
    // Add reaction
    const { error } = await supabase.from('reactions').insert({
      message_id: req.params.messageId,
      user_id,
      emoji
    });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ action: 'added' });
  }
});

// ==================== DMs ====================

app.get('/api/users/:userId/dms', async (req, res) => {
  const userId = req.params.userId;

  const { data, error } = await supabase
    .from('dm_channels')
    .select(`
      *,
      user1:users!dm_channels_user1_id_fkey(*),
      user2:users!dm_channels_user2_id_fkey(*)
    `)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/dms', async (req, res) => {
  const { user1_id, user2_id } = req.body;

  // Check existing
  const { data: existing } = await supabase
    .from('dm_channels')
    .select('*')
    .or(`and(user1_id.eq.${user1_id},user2_id.eq.${user2_id}),and(user1_id.eq.${user2_id},user2_id.eq.${user1_id})`)
    .single();

  if (existing) return res.json(existing);

  const { data, error } = await supabase
    .from('dm_channels')
    .insert({ user1_id, user2_id })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.get('/api/dms/:dmId/messages', async (req, res) => {
  const { data, error } = await supabase
    .from('dm_messages')
    .select('*, user:users(*)')
    .eq('dm_channel_id', req.params.dmId)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/dms/:dmId/messages', async (req, res) => {
  const { user_id, text } = req.body;
  const { data, error } = await supabase
    .from('dm_messages')
    .insert({ dm_channel_id: req.params.dmId, user_id, text })
    .select('*, user:users(*)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ==================== ADMIN ====================

// Middleware: check admin
async function requireAdmin(req, res, next) {
  const userId = req.headers['x-user-id'] || req.query.user_id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', userId)
    .single();

  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  req.adminUser = user;
  next();
}

// Admin: check
app.get('/api/admin/check', async (req, res) => {
  const userId = req.headers['x-user-id'] || req.query.user_id;
  if (!userId) return res.json({ is_admin: false });
  const { data: user } = await supabase.from('users').select('id, role').eq('id', userId).single();
  res.json({ is_admin: user && (user.role === 'admin' || user.role === 'owner') });
});

// --- Stats ---
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  const [usersRes, channelsRes, messagesRes, filesRes, suspendedRes] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('channels').select('id', { count: 'exact', head: true }).eq('is_archived', false),
    supabase.from('messages').select('id', { count: 'exact', head: true }),
    supabase.from('messages').select('id', { count: 'exact', head: true }).not('file_url', 'is', null),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'suspended'),
  ]);
  const { data: onlineUsers } = await supabase.from('users').select('id').eq('status', 'online');
  const { data: channelStats } = await supabase.from('channels').select('id, name, is_archived');
  const channelMsgCounts = [];
  if (channelStats) {
    for (const ch of channelStats) {
      const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('channel_id', ch.id);
      channelMsgCounts.push({ name: ch.name, count: count || 0, is_archived: ch.is_archived });
    }
  }
  const { data: recentBroadcasts } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(5);
  res.json({
    total_users: usersRes.count || 0,
    total_channels: channelsRes.count || 0,
    total_messages: messagesRes.count || 0,
    total_files: filesRes.count || 0,
    online_users: onlineUsers ? onlineUsers.length : 0,
    suspended_users: suspendedRes.count || 0,
    channel_stats: channelMsgCounts,
    recent_broadcasts: recentBroadcasts || [],
  });
});

// --- Users ---
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.patch('/api/admin/users/:id/role', requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['member', 'admin', 'owner'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  // Self-protection: cannot demote yourself
  if (req.params.id === req.adminUser.id) return res.status(400).json({ error: '自分自身のロールは変更できません' });
  const { data, error } = await supabase.from('users').update({ role }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Suspend user
app.post('/api/admin/users/:id/suspend', requireAdmin, async (req, res) => {
  // Self-protection
  if (req.params.id === req.adminUser.id) return res.status(400).json({ error: '自分自身を停止することはできません' });
  const { data, error } = await supabase.from('users')
    .update({ status: 'suspended', suspended_at: new Date().toISOString(), suspended_by: req.adminUser.id })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Unsuspend user
app.post('/api/admin/users/:id/unsuspend', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('users')
    .update({ status: 'offline', suspended_at: null, suspended_by: null })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Delete user
app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  if (req.params.id === req.adminUser.id) return res.status(400).json({ error: '自分自身を削除することはできません' });
  const { error } = await supabase.from('users').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// --- Channels ---
app.post('/api/admin/channels/:id/archive', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('channels')
    .update({ is_archived: true, archived_at: new Date().toISOString(), archived_by: req.adminUser.id })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/admin/channels/:id/unarchive', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('channels')
    .update({ is_archived: false, archived_at: null, archived_by: null })
    .eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/admin/channels/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase.from('channels').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// --- Messages ---
app.get('/api/admin/messages', requireAdmin, async (req, res) => {
  const { search, channel_id, limit = 50 } = req.query;
  let query = supabase.from('messages')
    .select('*, user:users(id, name, email, avatar_color), channel:channels(id, name)')
    .order('created_at', { ascending: false }).limit(parseInt(limit));
  if (channel_id) query = query.eq('channel_id', channel_id);
  if (search) query = query.ilike('text', `%${search}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/admin/messages/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase.from('messages').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// --- Broadcast ---
app.post('/api/admin/broadcast', requireAdmin, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  // Save broadcast record
  const { data: bc, error: bcErr } = await supabase.from('broadcasts')
    .insert({ text, sent_by: req.adminUser.id }).select('*').single();
  if (bcErr) return res.status(500).json({ error: bcErr.message });
  // Post to #announcements (or first channel) as system message
  const { data: annCh } = await supabase.from('channels').select('id').eq('name', 'announcements').single();
  const targetChannel = annCh ? annCh.id : null;
  if (targetChannel) {
    await supabase.from('messages').insert({
      channel_id: targetChannel, user_id: req.adminUser.id,
      text: `📢 **一斉通知**: ${text}`,
    });
  }
  res.json(bc);
});

app.get('/api/admin/broadcasts', requireAdmin, async (req, res) => {
  const { data: bcs, error } = await supabase.from('broadcasts')
    .select('*').order('created_at', { ascending: false }).limit(20);
  if (error) return res.status(500).json({ error: error.message });
  // Manually attach sender info
  const userIds = [...new Set(bcs.map(b => b.sent_by).filter(Boolean))];
  const { data: senders } = userIds.length
    ? await supabase.from('users').select('id, name, avatar_color').in('id', userIds)
    : { data: [] };
  const senderMap = Object.fromEntries((senders || []).map(u => [u.id, u]));
  res.json(bcs.map(b => ({ ...b, sender: senderMap[b.sent_by] || null })));
});

// --- Workspace Settings ---
app.get('/api/admin/workspace', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('workspace_settings').select('*').eq('id', 'default').single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.patch('/api/admin/workspace', requireAdmin, async (req, res) => {
  const { name, logo_url } = req.body;
  const updates = { updated_at: new Date().toISOString(), updated_by: req.adminUser.id };
  if (name !== undefined) updates.name = name;
  if (logo_url !== undefined) updates.logo_url = logo_url;
  const { data, error } = await supabase.from('workspace_settings').update(updates).eq('id', 'default').select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ==================== REALTIME CONFIG ====================

app.get('/api/realtime-config', (req, res) => {
  res.json({
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
  });
});

// ==================== HELPERS ====================

function groupReactions(reactions) {
  if (!reactions || reactions.length === 0) return [];
  const grouped = {};
  reactions.forEach(r => {
    if (!grouped[r.emoji]) {
      grouped[r.emoji] = { emoji: r.emoji, users: [] };
    }
    grouped[r.emoji].users.push(r.user_id);
  });
  return Object.values(grouped);
}

// ==================== START ====================

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Supabase connected: ${process.env.SUPABASE_URL}`);
});
