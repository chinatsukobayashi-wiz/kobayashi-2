-- ==================== USERS ====================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_color TEXT DEFAULT '#1264a3',
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'away', 'dnd', 'offline')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== CHANNELS ====================
CREATE TABLE IF NOT EXISTS channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  topic TEXT DEFAULT '',
  is_private BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== CHANNEL MEMBERS ====================
CREATE TABLE IF NOT EXISTS channel_members (
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

-- ==================== MESSAGES ====================
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  thread_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_channel ON messages(channel_id, created_at);
CREATE INDEX idx_messages_thread ON messages(thread_id);

-- ==================== REACTIONS ====================
CREATE TABLE IF NOT EXISTS reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- ==================== DIRECT MESSAGES ====================
CREATE TABLE IF NOT EXISTS dm_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dm_channel_id UUID REFERENCES dm_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== SEED DATA ====================
INSERT INTO users (id, email, name, avatar_color, status) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'tanaka@example.com', '田中 太郎', '#e01e5a', 'online'),
  ('a2222222-2222-2222-2222-222222222222', 'sato@example.com', '佐藤 花子', '#2bac76', 'online'),
  ('a3333333-3333-3333-3333-333333333333', 'suzuki@example.com', '鈴木 一郎', '#ecb22e', 'away'),
  ('a4444444-4444-4444-4444-444444444444', 'takahashi@example.com', '高橋 美咲', '#1264a3', 'online'),
  ('a5555555-5555-5555-5555-555555555555', 'yamada@example.com', '山田 健太', '#e06b1e', 'away')
ON CONFLICT (id) DO NOTHING;

INSERT INTO channels (id, name, topic, created_by) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'general', 'チームの全般的な会話', 'a1111111-1111-1111-1111-111111111111'),
  ('b2222222-2222-2222-2222-222222222222', 'random', '雑談チャンネル', 'a1111111-1111-1111-1111-111111111111'),
  ('b3333333-3333-3333-3333-333333333333', 'dev', '開発に関する議論', 'a1111111-1111-1111-1111-111111111111'),
  ('b4444444-4444-4444-4444-444444444444', 'design', 'デザインレビュー', 'a4444444-4444-4444-4444-444444444444'),
  ('b5555555-5555-5555-5555-555555555555', 'announcements', 'お知らせ', 'a1111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Add all users to general and random
INSERT INTO channel_members (channel_id, user_id)
SELECT c.id, u.id FROM channels c CROSS JOIN users u
WHERE c.name IN ('general', 'random')
ON CONFLICT DO NOTHING;

-- Seed messages in general
INSERT INTO messages (id, channel_id, user_id, text, created_at) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'おはようございます！今日のスタンドアップミーティングは10時からですね。', '2026-04-23 09:00:00+09'),
  ('c2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'a3333333-3333-3333-3333-333333333333', 'API仕様書を更新しました。確認お願いします。', '2026-04-23 09:15:00+09'),
  ('c3333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111', 'a4444444-4444-4444-4444-444444444444', '新しいデザインシステムのコンポーネントをFigmaに追加しました。フィードバックお待ちしています！', '2026-04-23 10:30:00+09'),
  ('c4444444-4444-4444-4444-444444444444', 'b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'CI/CDパイプラインの修正が完了しました。', '2026-04-23 11:00:00+09'),
  ('c5555555-5555-5555-5555-555555555555', 'b1111111-1111-1111-1111-111111111111', 'a5555555-5555-5555-5555-555555555555', '来週の金曜日にチームランチを予定しています。参加できる方はリアクションしてください！🍕', '2026-04-23 12:00:00+09')
ON CONFLICT (id) DO NOTHING;

-- Thread replies
INSERT INTO messages (channel_id, user_id, text, thread_id, created_at) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'はい、Zoomリンクは同じですか？', 'c1111111-1111-1111-1111-111111111111', '2026-04-23 09:05:00+09'),
  ('b1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'はい、いつものリンクです！', 'c1111111-1111-1111-1111-111111111111', '2026-04-23 09:07:00+09')
ON CONFLICT DO NOTHING;

-- Reactions
INSERT INTO reactions (message_id, user_id, emoji) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '👍'),
  ('c1111111-1111-1111-1111-111111111111', 'a3333333-3333-3333-3333-333333333333', '👍'),
  ('c4444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222', '🎉'),
  ('c4444444-4444-4444-4444-444444444444', 'a3333333-3333-3333-3333-333333333333', '🎉'),
  ('c5555555-5555-5555-5555-555555555555', 'a1111111-1111-1111-1111-111111111111', '🍕'),
  ('c5555555-5555-5555-5555-555555555555', 'a2222222-2222-2222-2222-222222222222', '🍕')
ON CONFLICT DO NOTHING;

-- ==================== RLS POLICIES ====================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;

-- Allow read access for all authenticated users
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Channels are viewable by everyone" ON channels FOR SELECT USING (true);
CREATE POLICY "Channel members are viewable by everyone" ON channel_members FOR SELECT USING (true);
CREATE POLICY "Messages are viewable by everyone" ON messages FOR SELECT USING (true);
CREATE POLICY "Reactions are viewable by everyone" ON reactions FOR SELECT USING (true);

-- Allow insert for service role (our backend)
CREATE POLICY "Service can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert channels" ON channels FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert members" ON channel_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert reactions" ON reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can delete reactions" ON reactions FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
