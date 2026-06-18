import { createClient } from '@supabase/supabase-js';
import type { Drug, WarningTemplate } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Fetch all drugs, optionally filtered by generic name */
export async function fetchDrugs(genericName?: string): Promise<Drug[]> {
  let query = supabase.from('drugs').select('*').order('generic_name', { ascending: true });
  if (genericName) {
    query = query.ilike('generic_name', `%${genericName}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/** Get a single drug by ID */
export async function getDrug(id: number): Promise<Drug | null> {
  const { data, error } = await supabase.from('drugs').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

/** Create a new drug record */
export async function createDrug(drug: Omit<Drug, 'id' | 'created_at'>): Promise<Drug> {
  const { data, error } = await supabase.from('drugs').insert([drug]).select().single();
  if (error) throw error;
  return data;
}

/** Update an existing drug record */
export async function updateDrug(id: number, drug: Partial<Omit<Drug, 'id' | 'created_at'>>): Promise<Drug> {
  const { data, error } = await supabase.from('drugs').update(drug).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

/** Delete a drug record */
export async function deleteDrug(id: number): Promise<void> {
  const { error } = await supabase.from('drugs').delete().eq('id', id);
  if (error) throw error;
}

/** Fetch default values for a generic drug name */
export async function fetchDefaultsByGeneric(genericName: string): Promise<Drug | null> {
  const { data, error } = await supabase
    .from('drugs')
    .select('*')
    .ilike('generic_name', genericName)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Check if Supabase is configured */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}

/* ─── Warning Template CRUD ─────────────────────────── */

export async function fetchWarningTemplates(): Promise<WarningTemplate[]> {
  const { data, error } = await supabase
    .from('warning_templates')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createWarningTemplate(
  template: Pick<WarningTemplate, 'text'>,
): Promise<WarningTemplate> {
  const { data, error } = await supabase
    .from('warning_templates')
    .insert([template])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWarningTemplate(
  id: number,
  template: Pick<WarningTemplate, 'text'>,
): Promise<WarningTemplate> {
  const { data, error } = await supabase
    .from('warning_templates')
    .update(template)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWarningTemplate(id: number): Promise<void> {
  const { error } = await supabase
    .from('warning_templates')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
