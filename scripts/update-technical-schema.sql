-- Update technical analysis tables to handle longer field values

-- Update technical_analysis table
ALTER TABLE technical_analysis 
  ALTER COLUMN time_frame TYPE VARCHAR(30),
  ALTER COLUMN gauge_moving_average_rating TYPE VARCHAR(30),
  ALTER COLUMN gauge_oscillator_rating TYPE VARCHAR(30),
  ALTER COLUMN gauge_summary_rating TYPE VARCHAR(30);

-- Update technical_moving_averages table
ALTER TABLE technical_moving_averages 
  ALTER COLUMN time_frame TYPE VARCHAR(30),
  ALTER COLUMN name TYPE VARCHAR(100),
  ALTER COLUMN rating TYPE VARCHAR(30);

-- Update technical_oscillators table
ALTER TABLE technical_oscillators 
  ALTER COLUMN time_frame TYPE VARCHAR(30),
  ALTER COLUMN name TYPE VARCHAR(100),
  ALTER COLUMN rating TYPE VARCHAR(30);

-- Add comments for documentation
COMMENT ON TABLE technical_analysis IS 'Technical analysis summary data from VietCap API';
COMMENT ON TABLE technical_moving_averages IS 'Moving averages indicators (SMA, EMA, VWMA, Ichimoku)';
COMMENT ON TABLE technical_oscillators IS 'Oscillator indicators (RSI, MACD, Stochastic, etc.)';

-- Show updated schema
\d technical_analysis;
\d technical_moving_averages;
\d technical_oscillators;
