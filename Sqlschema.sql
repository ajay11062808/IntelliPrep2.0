-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table for user data
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  -- Theme preference: 'system' | 'light' | 'dark'
  theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('system','light','dark')),
  -- Premium subscription flag
  is_premium BOOLEAN DEFAULT FALSE,
  -- Whether the user indicated they have a device-stored Gemini API key
  has_gemini_key BOOLEAN DEFAULT FALSE,
  -- Simple daily AI usage tracking
  ai_usage_count INTEGER DEFAULT 0,
  ai_usage_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notes table with interview transcript support
CREATE TABLE notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  markdown_content TEXT,
  category TEXT DEFAULT 'general',
  is_calculation BOOLEAN DEFAULT FALSE,
  is_interview_transcript BOOLEAN DEFAULT FALSE,
  is_voice_transcription BOOLEAN DEFAULT FALSE,
  calculation_data JSONB,
  interview_data JSONB,
  voice_data JSONB,
  tags TEXT[] DEFAULT '{}',
  color_theme TEXT DEFAULT '#6366F1',
  ai_summary TEXT,
  ai_expanded TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create calculations table for calculator history
CREATE TABLE calculations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  expression TEXT NOT NULL,
  result NUMERIC NOT NULL,
  calculation_type TEXT DEFAULT 'basic', -- 'basic', 'interest', 'compound'
  metadata JSONB,
  saved_to_note UUID REFERENCES notes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mock_interviews table for AI mock interviews
CREATE TABLE mock_interviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  questions JSONB NOT NULL,
  responses JSONB,
  transcript TEXT,
  score INTEGER,
  feedback TEXT,
  duration INTEGER, -- in seconds
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_interviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for notes
CREATE POLICY "Users can view own notes" ON notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON notes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for calculations
CREATE POLICY "Users can view own calculations" ON calculations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calculations" ON calculations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calculations" ON calculations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calculations" ON calculations
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for mock_interviews
CREATE POLICY "Users can view own mock interviews" ON mock_interviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mock interviews" ON mock_interviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mock interviews" ON mock_interviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mock interviews" ON mock_interviews
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX idx_notes_category ON notes(category);
CREATE INDEX idx_notes_is_calculation ON notes(is_calculation);
CREATE INDEX idx_notes_is_interview_transcript ON notes(is_interview_transcript);
CREATE INDEX idx_calculations_user_id ON calculations(user_id);
CREATE INDEX idx_calculations_created_at ON calculations(created_at DESC);
CREATE INDEX idx_mock_interviews_user_id ON mock_interviews(user_id);
CREATE INDEX idx_mock_interviews_status ON mock_interviews(status);

-- Function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ====================================
-- Database Schema Updates for Enhanced Calculator
-- ====================================

-- 1. Update the calculations table to support new calculation types
-- The existing table structure already supports this via the calculation_type column
-- and metadata JSONB column, but let's add some helpful comments and indexes

-- Add comments to clarify the calculation_type values
COMMENT ON COLUMN calculations.calculation_type IS 'Types: basic, simple, compound, local_interest, bmi';

-- Add indexes for better performance on calculation types
CREATE INDEX IF NOT EXISTS idx_calculations_type ON calculations(calculation_type);
CREATE INDEX IF NOT EXISTS idx_calculations_user_type ON calculations(user_id, calculation_type);

-- 2. Create a view for better calculation history queries
CREATE OR REPLACE VIEW calculation_history_view AS
SELECT 
  c.*,
  CASE 
    WHEN c.calculation_type = 'basic' THEN 'Basic Calculation'
    WHEN c.calculation_type = 'simple' THEN 'Simple Interest'
    WHEN c.calculation_type = 'compound' THEN 'Compound Interest'
    WHEN c.calculation_type = 'local_interest' THEN 'Local Interest'
    WHEN c.calculation_type = 'bmi' THEN 'BMI & Health Analysis'
    ELSE 'Unknown'
  END as type_display_name,
  CASE 
    WHEN c.calculation_type = 'local_interest' THEN 
      COALESCE(c.metadata->>'totalAmount', c.result::text)
    WHEN c.calculation_type = 'bmi' THEN 
      c.result::text || ' (' || COALESCE(c.metadata->>'category', 'Unknown') || ')'
    ELSE c.result::text
  END as formatted_result
FROM calculations c;

-- 3. Add RLS policy for the view
CREATE POLICY "Users can view own calculation history" ON calculation_history_view
  FOR SELECT USING (auth.uid() = user_id);

-- 4. Update the notes table to better support calculation notes
-- Add index for calculation notes
CREATE INDEX IF NOT EXISTS idx_notes_is_calculation ON notes(user_id, is_calculation) WHERE is_calculation = true;

-- Add a helper function to format calculation data in notes
CREATE OR REPLACE FUNCTION format_calculation_note(calc_data JSONB, calc_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  CASE calc_type
    WHEN 'local_interest' THEN
      RETURN format('Local Interest Calculation
Amount: %s
Monthly Rate: %s%%
Period: %s
Interest Earned: %s
Total Amount: %s',
        calc_data->>'amount',
        calc_data->>'interestRate',
        calc_data->>'timePeriod',
        calc_data->>'interestAmount',
        calc_data->>'totalAmount'
      );
    WHEN 'bmi' THEN
      RETURN format('BMI & Health Analysis
Weight: %s kg
Height: %s cm
Age: %s years
Gender: %s
BMI: %s (%s)
BMR: %s cal/day
TDEE: %s cal/day
Ideal Weight Range: %s',
        calc_data->>'weight',
        calc_data->>'height',
        calc_data->>'age',
        calc_data->>'gender',
        calc_data->>'bmi',
        calc_data->>'category',
        calc_data->>'bmr',
        calc_data->>'tdee',
        calc_data->>'idealWeightRange'
      );
    ELSE
      RETURN calc_data::text;
  END CASE;
END;
$$;

-- 5. Create a function to get calculation statistics
CREATE OR REPLACE FUNCTION get_user_calculation_stats(user_uuid UUID)
RETURNS TABLE (
  total_calculations BIGINT,
  basic_calculations BIGINT,
  interest_calculations BIGINT,
  local_interest_calculations BIGINT,
  bmi_calculations BIGINT,
  most_used_type TEXT,
  last_calculation_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH calc_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE calculation_type = 'basic') as basic,
      COUNT(*) FILTER (WHERE calculation_type IN ('simple', 'compound')) as interest,
      COUNT(*) FILTER (WHERE calculation_type = 'local_interest') as local_interest,
      COUNT(*) FILTER (WHERE calculation_type = 'bmi') as bmi,
      MAX(created_at) as last_calc,
      MODE() WITHIN GROUP (ORDER BY calculation_type) as most_used
    FROM calculations 
    WHERE user_id = user_uuid
  )
  SELECT 
    total,
    basic,
    interest,
    local_interest,
    bmi,
    most_used,
    last_calc
  FROM calc_stats;
END;
$$;

-- 6. Add some sample metadata structure documentation as comments
COMMENT ON COLUMN calculations.metadata IS 'JSON structure varies by type:
- basic: {"expression": "...", "result": number}
- simple/compound: {"principal": number, "rate": number, "time": number, "compoundFrequency": number}
- local_interest: {"amount": number, "interestRate": number, "fromDate": "ISO date", "toDate": "ISO date", "timePeriod": "formatted string", "interestAmount": number, "totalAmount": number}
- bmi: {"weight": number, "height": number, "age": number, "gender": "male|female", "activityLevel": "...", "bmi": number, "category": "...", "bmr": number, "tdee": number, "idealWeightRange": "..."}';

-- 7. Create trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to relevant tables (if not already exists)
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calculations_created_at_desc ON calculations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at_desc ON notes(updated_at DESC);

-- 9. Create a materialized view for calculation analytics (optional, for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS calculation_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as calculation_date,
  calculation_type,
  COUNT(*) as daily_count,
  AVG(result) as avg_result,
  MIN(result) as min_result,
  MAX(result) as max_result
FROM calculations
GROUP BY DATE_TRUNC('day', created_at), calculation_type;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_calculation_analytics_date_type 
ON calculation_analytics(calculation_date, calculation_type);

-- Refresh the materialized view (should be done periodically)
REFRESH MATERIALIZED VIEW calculation_analytics;

-- 10. Grant necessary permissions (adjust as needed based on your security model)
-- These might already be covered by your existing RLS policies
-- GRANT SELECT ON calculation_history_view TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_user_calculation_stats(UUID) TO authenticated;
-- GRANT EXECUTE ON FUNCTION format_calculation_note(JSONB, TEXT) TO authenticated;