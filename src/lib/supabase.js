import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ssjpacijslnqfdiegaio.supabase.co'
const SUPABASE_KEY = 'sb_publishable_vQGpJ32FrfGPJQctbcMJeg_CPncFPEn'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
