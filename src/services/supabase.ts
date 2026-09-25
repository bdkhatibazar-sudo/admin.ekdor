import { createClient } from '@supabase/supabase-js';
import { AppStateData, StoreSettings } from '../types';

export const SUPABASE_SQL_SCHEMA = `-- Ekdor POS Free Cloud Database Schema
-- Run this in your Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS store_data (
  id text PRIMARY KEY DEFAULT 'current_store',
  data jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE store_data ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for read/write with anon key
CREATE POLICY "Allow public read-write for store_data" 
ON store_data 
FOR ALL 
USING (true) 
WITH CHECK (true);
`;

function getClient(url?: string, key?: string) {
  if (!url || !key) return null;
  try {
    return createClient(url, key);
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(
  settings: StoreSettings
): Promise<{ success: boolean; message: string }> {
  const url = settings.supabaseUrl?.trim();
  const key = settings.supabaseAnonKey?.trim();

  if (!url || !key) {
    return {
      success: false,
      message: 'Supabase URL এবং Anon Key প্রদান করুন।',
    };
  }

  try {
    const supabase = getClient(url, key);
    if (!supabase) {
      return { success: false, message: 'Supabase ক্লায়েন্ট তৈরি করা যায়নি।' };
    }

    const { error } = await supabase.from('store_data').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      return {
        success: false,
        message: `Supabase ত্রুটি: ${error.message} (অনুগ্রহ করে টেবিল ও SQL স্ক্রিপ্ট তৈরি করেছেন কি না পরীক্ষা করুন)`,
      };
    }

    return {
      success: true,
      message: 'Supabase ক্লাউড ডাটাবেজ সফলভাবে সংযুক্ত হয়েছে!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Supabase সংযোগ ব্যর্থ হয়েছে।',
    };
  }
}

export async function syncToSupabase(
  state: AppStateData
): Promise<{ success: boolean; message: string }> {
  const url = state.settings?.supabaseUrl?.trim();
  const key = state.settings?.supabaseAnonKey?.trim();

  if (!url || !key) {
    return {
      success: false,
      message: 'সেটিংসে Supabase URL ও Anon Key পাওয়া যায়নি।',
    };
  }

  try {
    const supabase = getClient(url, key);
    if (!supabase) throw new Error('Supabase ক্লায়েন্ট তৈরি করা যায়নি');

    const payload = {
      id: 'current_store',
      data: state,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('store_data').upsert(payload);
    if (error) throw error;

    return {
      success: true,
      message: 'সব ডাটা সফলভাবে Supabase ক্লাউডে ব্যাকআপ ও সিঙ্ক হয়েছে!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Supabase এ সিঙ্ক ব্যর্থ হয়েছে।',
    };
  }
}

export async function fetchFromSupabase(
  settings: StoreSettings
): Promise<{ success: boolean; message: string; data?: Partial<AppStateData> }> {
  const url = settings.supabaseUrl?.trim();
  const key = settings.supabaseAnonKey?.trim();

  if (!url || !key) {
    return {
      success: false,
      message: 'Supabase URL এবং Anon Key পাওয়া যায়নি।',
    };
  }

  try {
    const supabase = getClient(url, key);
    if (!supabase) throw new Error('Supabase ক্লায়েন্ট পাওয়া যায়নি');

    const { data, error } = await supabase
      .from('store_data')
      .select('data')
      .eq('id', 'current_store')
      .single();

    if (error) throw error;

    if (!data || !data.data) {
      return {
        success: false,
        message: 'Supabase ক্লাউডে কোনো সংরক্ষিত ডাটা পাওয়া যায়নি।',
      };
    }

    return {
      success: true,
      message: 'Supabase ক্লাউড থেকে ডাটা সফলভাবে ডাউনলোড ও রিস্টোর হয়েছে!',
      data: data.data,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Supabase থেকে ডাটা ফেচ করতে ব্যর্থ হয়েছে।',
    };
  }
}
