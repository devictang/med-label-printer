/**
 * Local pending changes store.
 *
 * All CRUD operations (drugs, warning templates) save to localStorage first.
 * A "Submit for Approval" button sends pending changes as proposals to oyx.app.
 *
 * Data flow:
 *   User edits → localStorage (pending) → Submit → oyx.app POST /api/proposals
 *                                                          ↓ approve
 *                                                    Supabase write
 */

import type { Drug, WarningTemplate } from '../types';

const PENDING_KEY = 'med-label-printer:pending-changes';

/* ─── Types ─────────────────────────────────────────────────────── */

export type PendingProposalType =
  | 'drug_create'
  | 'drug_update'
  | 'drug_delete'
  | 'warning_create'
  | 'warning_update'
  | 'warning_delete';

export interface PendingChange {
  /** Client-generated unique ID for this pending change */
  localId: string;
  /** Type of change */
  proposalType: PendingProposalType;
  /** The data payload (Drug or WarningTemplate fields, or {id} for deletes) */
  payload: Record<string, unknown>;
  /** ISO timestamp when the change was created */
  createdAt: string;
  /** Submission status */
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  /** If submitted, the oyx.app proposal ID (populated after submit) */
  proposalId?: number;
  /** If rejected, the rejection reason */
  rejectReason?: string;
  /** Last checked timestamp (for polling status) */
  lastCheckedAt?: string;
}

/* ─── ID generation ─────────────────────────────────────────────── */

let counter = Date.now();
function generateLocalId(): string {
  return `local_${++counter}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ─── Read / Write ──────────────────────────────────────────────── */

function loadAll(): PendingChange[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(changes: PendingChange[]): void {
  localStorage.setItem(PENDING_KEY, JSON.stringify(changes));
}

/* ─── API ───────────────────────────────────────────────────────── */

/** Add a new pending change (returns the localId) */
export function addPendingChange(
  proposalType: PendingProposalType,
  payload: Record<string, unknown>,
): string {
  const changes = loadAll();
  const localId = generateLocalId();
  changes.push({
    localId,
    proposalType,
    payload,
    createdAt: new Date().toISOString(),
    status: 'draft',
  });
  saveAll(changes);
  return localId;
}

/** Remove a pending change by localId */
export function removePendingChange(localId: string): void {
  const changes = loadAll().filter((c) => c.localId !== localId);
  saveAll(changes);
}

/** Remove all pending changes */
export function clearAllPending(): void {
  localStorage.removeItem(PENDING_KEY);
}

/** Get all pending changes */
export function getPendingChanges(): PendingChange[] {
  return loadAll();
}

/** Get only draft (not yet submitted) changes */
export function getDraftChanges(): PendingChange[] {
  return loadAll().filter((c) => c.status === 'draft');
}

/** Get submitted changes */
export function getSubmittedChanges(): PendingChange[] {
  return loadAll().filter((c) => c.status === 'submitted');
}

/** Update a pending change's status (e.g., after submission or approval check) */
export function updateChangeStatus(
  localId: string,
  updates: Partial<Pick<PendingChange, 'status' | 'proposalId' | 'rejectReason' | 'lastCheckedAt'>>,
): void {
  const changes = loadAll();
  const idx = changes.findIndex((c) => c.localId === localId);
  if (idx !== -1) {
    Object.assign(changes[idx], updates);
    saveAll(changes);
  }
}

/** Mark a batch of drafted changes as submitted (after successful API call) */
export function markAsSubmitted(
  localIds: string[],
  proposalIds: number[],
): void {
  const changes = loadAll();
  for (let i = 0; i < localIds.length; i++) {
    const idx = changes.findIndex((c) => c.localId === localIds[i]);
    if (idx !== -1) {
      changes[idx].status = 'submitted';
      changes[idx].proposalId = proposalIds[i];
      changes[idx].lastCheckedAt = new Date().toISOString();
    }
  }
  saveAll(changes);
}

/* ─── Merge logic ──────────────────────────────────────────────── */

export interface MergedDrug extends Drug {
  /** localId if this is a pending change */
  _localId?: string;
  /** Status of pending change */
  _pendingStatus?: 'draft' | 'submitted' | 'approved' | 'rejected';
  /** Flag: this is a locally-created drug (not yet in Supabase) */
  _isLocalOnly?: boolean;
}

/**
 * Merge base drugs from Supabase with local pending changes.
 * Returns the effective drug list to display.
 */
export function mergeDrugs(baseDrugs: Drug[]): MergedDrug[] {
  const changes = loadAll();
  const drugMap = new Map<number, Drug>();

  // Index base drugs by id
  for (const d of baseDrugs) {
    if (d.id) drugMap.set(d.id, { ...d });
  }

  // Track which base IDs are deleted
  const deletedIds = new Set<number>();
  // Local-only additions
  const localAdditions: MergedDrug[] = [];

  for (const change of changes) {
    switch (change.proposalType) {
      case 'drug_create': {
        // Only show if not yet approved (approved ones are in Supabase already)
        if (change.status !== 'approved') {
          localAdditions.push({
            ...(change.payload as unknown as Drug),
            id: undefined, // no server ID yet
            _localId: change.localId,
            _pendingStatus: change.status,
            _isLocalOnly: true,
          });
        }
        break;
      }
      case 'drug_update': {
        const payload = change.payload as Partial<Drug>;
        if (payload.id !== undefined && drugMap.has(payload.id)) {
          // Merge local changes on top of base data
          const existing = drugMap.get(payload.id)!;
          Object.assign(existing, payload);
          (existing as MergedDrug)._localId = change.localId;
          (existing as MergedDrug)._pendingStatus = change.status;
        } else if (payload.id !== undefined) {
          // Update for a drug that exists locally (local create then update)
          const existingLocal = localAdditions.find(
            (la) => la._isLocalOnly && la._localId === `local_${payload.id}`,
          );
          if (existingLocal) {
            Object.assign(existingLocal, payload);
            existingLocal._pendingStatus = change.status;
          }
        }
        break;
      }
      case 'drug_delete': {
        const { id } = change.payload;
        if (id !== undefined) {
          deletedIds.add(id as number);
        }
        break;
      }
    }
  }

  // Build final list: base drugs minus deleted, plus local additions
  const result: MergedDrug[] = [];
  for (const [, drug] of drugMap) {
    if (!deletedIds.has(drug.id!)) {
      result.push(drug as MergedDrug);
    }
  }
  result.push(...localAdditions);
  return result;
}

/** Similar merge for warning templates */
export interface MergedWarningTemplate extends WarningTemplate {
  _localId?: string;
  _pendingStatus?: 'draft' | 'submitted' | 'approved' | 'rejected';
  _isLocalOnly?: boolean;
}

export function mergeWarningTemplates(baseTemplates: WarningTemplate[]): MergedWarningTemplate[] {
  const changes = loadAll();
  const tplMap = new Map<number, WarningTemplate>();

  for (const t of baseTemplates) {
    if (t.id) tplMap.set(t.id, { ...t });
  }

  const deletedIds = new Set<number>();
  const localAdditions: MergedWarningTemplate[] = [];

  for (const change of changes) {
    switch (change.proposalType) {
      case 'warning_create': {
        if (change.status !== 'approved') {
          localAdditions.push({
            ...(change.payload as unknown as WarningTemplate),
            id: undefined,
            _localId: change.localId,
            _pendingStatus: change.status,
            _isLocalOnly: true,
          });
        }
        break;
      }
      case 'warning_update': {
        const payload = change.payload as Partial<WarningTemplate>;
        if (payload.id !== undefined && tplMap.has(payload.id)) {
          const existing = tplMap.get(payload.id)!;
          Object.assign(existing, payload);
          (existing as MergedWarningTemplate)._localId = change.localId;
          (existing as MergedWarningTemplate)._pendingStatus = change.status;
        }
        break;
      }
      case 'warning_delete': {
        const { id } = change.payload;
        if (id !== undefined) {
          deletedIds.add(id as number);
        }
        break;
      }
    }
  }

  const result: MergedWarningTemplate[] = [];
  for (const [, tpl] of tplMap) {
    if (!deletedIds.has(tpl.id!)) {
      result.push(tpl as MergedWarningTemplate);
    }
  }
  result.push(...localAdditions);
  return result;
}

/** Update an existing pending change's payload (for re-editing a draft before submit) */
export function updatePendingChangePayload(
  localId: string,
  payload: Record<string, unknown>,
): void {
  const changes = loadAll();
  const idx = changes.findIndex((c) => c.localId === localId);
  if (idx !== -1) {
    changes[idx].payload = payload;
    changes[idx].createdAt = new Date().toISOString();
    saveAll(changes);
  }
}

/** Clear all pending changes that are not yet approved (discards unapproved drafts/submissions) */
export function clearNonApprovedChanges(): void {
  const changes = loadAll().filter((c) => c.status === 'approved');
  saveAll(changes);
}

/**
 * Poll oyx.app API to sync the status of submitted proposals.
 * Updates localStorage when a submitted proposal is approved or rejected by admin,
 * so the merge logic stops applying stale payload data on top of the corrected Supabase records.
 */
export async function syncProposalStatus(): Promise<void> {
  const changes = loadAll();
  const submitted = changes.filter((c) => c.status === 'submitted' && c.proposalId);
  if (submitted.length === 0) return;

  const { fetchProposals } = await import('./proposals');
  const data = await fetchProposals();
  if (!data.ok || !data.proposals) return;

  const serverMap = new Map(data.proposals.map((p) => [p.id, p]));

  let updated = false;
  for (const change of submitted) {
    if (!change.proposalId) continue;
    const server = serverMap.get(change.proposalId);
    if (!server) continue;

    if (server.status === 'approved' && change.status !== 'approved') {
      change.status = 'approved';
      change.lastCheckedAt = new Date().toISOString();
      updated = true;
    } else if (server.status === 'rejected' && change.status !== 'rejected') {
      change.status = 'rejected';
      change.rejectReason = server.reject_reason || undefined;
      change.lastCheckedAt = new Date().toISOString();
      updated = true;
    }
  }

  if (updated) saveAll(changes);
}

/** Count of draft (unsubmitted) changes */
export function countDraftChanges(): number {
  return loadAll().filter((c) => c.status === 'draft').length;
}

/** Count of submitted-pending changes */
export function countSubmittedChanges(): number {
  return loadAll().filter((c) => c.status === 'submitted').length;
}
