-- Migration: Insert Bern's preferences from hardcoded data
-- NOTE: Run this after finding Bern's user_id from the users table
-- Replace 'BERN_USER_ID' with the actual UUID from: SELECT id FROM users WHERE email = 'bernadette@ailo.io';

-- Step 1: Find Bern's user ID (run this first to get the ID)
-- SELECT id FROM users WHERE email ILIKE '%bernadette%' OR name ILIKE '%bernadette%';

-- Step 2: Insert Bern's preferences
-- Replace BERN_USER_ID with the actual UUID from step 1
/*
INSERT INTO user_preferences (
  user_id,
  photo_url,
  hero_images,
  quotes,
  walkon_song_url,
  walkon_button_label,
  interests
) VALUES (
  'BERN_USER_ID'::uuid,
  '/team-images/bernadette-coutis.png',
  '[
    "/user-images/bernadette/hero/tigers.2.png",
    "/user-images/bernadette/hero/swans.2.png",
    "/user-images/bernadette/hero/brady.2.png",
    "/user-images/bernadette/hero/bolt.2.1.png",
    "/user-images/bernadette/hero/bolt.2.3.png",
    "/user-images/bernadette/hero/ACDC.2.png",
    "/user-images/bernadette/hero/INXS.2.png",
    "/user-images/bernadette/hero/suits.2.png",
    "/user-images/bernadette/hero/Goodes.2.png"
  ]'::jsonb,
  '[
    {"content": "This too shall pass"},
    {"content": "A winner is a loser who tried one more time"},
    {"content": "Yesterday''s home runs don''t win today''s games"},
    {"content": "Worrying gets you nowhere. If you turn up worrying about how you''re going to perform, you''ve already lost.", "attribution": "Usain Bolt"},
    {"content": "There are better starters than me, but I''m a strong finisher.", "attribution": "Usain Bolt"},
    {"content": "A lot of legends, a lot of people, have come before me. But this is my time.", "attribution": "Usain Bolt"},
    {"content": "I don''t think limits.", "attribution": "Usain Bolt"},
    {"content": "You have to set yourself goals so you can push yourself harder. Desire is the key to success.", "attribution": "Usain Bolt"},
    {"content": "I know what I can do, so I never doubt myself.", "attribution": "Usain Bolt"},
    {"content": "I stopped worrying about the start. The end is what''s important.", "attribution": "Usain Bolt"},
    {"content": "I work hard, and I do good, and I''m going to enjoy myself. I''m not going to let you restrict me.", "attribution": "Usain Bolt"},
    {"content": "Working hard for something we don''t care about is called stress. Working hard for something we love is called passion.", "attribution": "Simon Sinek"},
    {"content": "People don''t buy what you do; they buy why you do it.", "attribution": "Simon Sinek"},
    {"content": "Dream big. Start small. But most of all, start.", "attribution": "Simon Sinek"},
    {"content": "The goal is not to be perfect by the end. The goal is to be better today.", "attribution": "Simon Sinek"},
    {"content": "Leadership is not a license to do less. Leadership is a responsibility to do more.", "attribution": "Simon Sinek"},
    {"content": "A team is not a group of people that work together. A team is a group of people that trust each other.", "attribution": "Simon Sinek"},
    {"content": "The biggest adventure you can take is to live the life of your dreams.", "attribution": "Oprah Winfrey"},
    {"content": "Think like a queen. A queen is not afraid to fail. Failure is another stepping stone to greatness.", "attribution": "Oprah Winfrey"},
    {"content": "The more you praise and celebrate your life, the more there is in life to celebrate.", "attribution": "Oprah Winfrey"},
    {"content": "Surround yourself with only people who are going to lift you higher.", "attribution": "Oprah Winfrey"},
    {"content": "Turn your wounds into wisdom.", "attribution": "Oprah Winfrey"},
    {"content": "Where there is no struggle, there is no strength.", "attribution": "Oprah Winfrey"},
    {"content": "I don''t have dreams. I have goals.", "attribution": "Harvey Specter"},
    {"content": "Winners don''t make excuses when the other side plays the game.", "attribution": "Harvey Specter"},
    {"content": "When you''re backed against the wall, break the goddamn thing down.", "attribution": "Harvey Specter"},
    {"content": "Loyalty is a two-way street. If I''m asking for it from you, then you''re getting it from me.", "attribution": "Harvey Specter"},
    {"content": "The only time success comes before work is in the dictionary.", "attribution": "Harvey Specter"},
    {"content": "I''m against having emotions, not against using them.", "attribution": "Harvey Specter"}
  ]'::jsonb,
  'https://www.youtube.com/watch?v=rlMq4JA-q2Q',
  'Get fired up',
  '{
    "sports_teams": ["Richmond Tigers", "Sydney Swans"],
    "music_artists": ["AC/DC", "INXS"],
    "tv_shows": ["Suits"]
  }'::jsonb
)
ON CONFLICT (user_id) DO UPDATE SET
  photo_url = EXCLUDED.photo_url,
  hero_images = EXCLUDED.hero_images,
  quotes = EXCLUDED.quotes,
  walkon_song_url = EXCLUDED.walkon_song_url,
  walkon_button_label = EXCLUDED.walkon_button_label,
  interests = EXCLUDED.interests,
  updated_at = NOW();
*/
