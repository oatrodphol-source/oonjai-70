-- SQL Schema for Supabase (PostgreSQL)

-- 1. Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS (Row Level Security) - assuming admin access only
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for public read (if needed) or authenticated read/write
CREATE POLICY "Allow public read access" ON public.system_settings
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated full access" ON public.system_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert initial data
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
    ('line_channel_access_token', '', 'LINE Channel Access Token'),
    ('line_channel_secret', '', 'LINE Channel Secret'),
    ('line_auto_reply_template', 'รับแจ้งเหตุแล้ว กำลังประสานงานกู้ภัย...', 'LINE Auto-Reply Template'),
    ('maintenance_mode', 'false', 'Maintenance Mode (true/false)'),
    ('emergency_contact', '1669', 'Emergency Contact Number'),
    ('heatmap_history_days', '7', 'Heatmap History Days')
ON CONFLICT (setting_key) DO NOTHING;

-- 2. Create ai_settings table (if not exists)
CREATE TABLE IF NOT EXISTS public.ai_settings (
    id SERIAL PRIMARY KEY,
    "waterLevelHigh" INT DEFAULT 5,
    "waterLevelMedium" INT DEFAULT 3,
    "peopleCountMany" INT DEFAULT 5,
    "peopleCountFew" INT DEFAULT 2,
    bedridden INT DEFAULT 4,
    elderly INT DEFAULT 2,
    "severityFactor" INT DEFAULT 2,
    ai_provider VARCHAR(50) DEFAULT 'OpenAI',
    ai_api_key VARCHAR(255) DEFAULT '',
    ai_system_prompt TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.ai_settings
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated full access" ON public.ai_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert default row for ai_settings if empty
INSERT INTO public.ai_settings (id)
SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM public.ai_settings WHERE id = 1);
