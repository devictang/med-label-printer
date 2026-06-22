/**
 * Proposals API client — communicates with oyx.app Control Panel.
 *
 * The med-label-printer frontend runs on Vercel (medlabels.oyx.app) and
 * sends proposals via POST to the oyx.app Express backend.
 *
 * Environment:
 *   VITE_OYX_APP_URL — oyx.app base URL, defaults to https://oyx.app
 */

const OYX_APP_URL = import.meta.env.VITE_OYX_APP_URL || 'https://oyx.app';

interface ProposalsApiResponse<T = unknown> {
  ok: boolean;
  error?: string;
  proposal?: T;
  proposals?: T[];
}

interface CreatedProposal {
  id: number;
  status: string;
  app_slug: string;
  proposal_type: string;
}

/**
 * Submit a batch of proposals to oyx.app for approval.
 * Each proposal is sent as an individual POST (atomic per item).
 */
export async function submitProposals(
  proposals: { proposalType: string; payload: Record<string, unknown> }[],
): Promise<{ ok: boolean; results: { localIndex: number; proposalId?: number; error?: string }[] }> {
  console.log('[submitProposals] Submitting', proposals.length, 'proposal(s) to', OYX_APP_URL);
  const results: { localIndex: number; proposalId?: number; error?: string }[] = [];

  for (let i = 0; i < proposals.length; i++) {
    const { proposalType, payload } = proposals[i];
    const body = JSON.stringify({
      app_slug: 'med-label-printer',
      proposal_type: proposalType,
      payload,
    });
    console.log(`[submitProposals] #${i} POST`, `${OYX_APP_URL}/api/proposals`);
    console.log(`[submitProposals] #${i} Request body:`, body);

    try {
      const res = await fetch(`${OYX_APP_URL}/api/proposals`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      console.log(`[submitProposals] #${i} Response status:`, res.status, res.statusText);

      // Always read the raw response text first for debugging
      const rawText = await res.text();
      console.log(`[submitProposals] #${i} Raw response (${rawText.length} chars):`, rawText.slice(0, 500));

      let data: ProposalsApiResponse<CreatedProposal>;
      try {
        data = JSON.parse(rawText);
      } catch {
        results.push({ localIndex: i, error: `HTTP ${res.status}: ${rawText.slice(0, 200) || '(empty body)'}` });
        continue;
      }

      if (!res.ok || !data.ok) {
        console.warn(`[submitProposals] #${i} API returned error:`, data.error || `HTTP ${res.status}`);
        results.push({ localIndex: i, error: data.error || `HTTP ${res.status}` });
      } else if (data.proposal) {
        console.log(`[submitProposals] #${i} Success, proposalId:`, data.proposal.id);
        results.push({ localIndex: i, proposalId: data.proposal.id });
      } else {
        console.warn(`[submitProposals] #${i} Unexpected response format (no proposal field):`, data);
        results.push({ localIndex: i, error: 'Unexpected response format' });
      }
    } catch (err) {
      console.error(`[submitProposals] #${i} Fetch/network error:`, err);
      results.push({ localIndex: i, error: err instanceof Error ? err.message : 'Network error' });
    }
  }

  console.log('[submitProposals] Results:', results);
  return { ok: results.every((r) => r.proposalId !== undefined), results };
}

/**
 * Fetch proposals for the med-label-printer app.
 */
export async function fetchProposals(status?: string): Promise<{
  ok: boolean;
  proposals?: { id: number; proposal_type: string; payload: string; status: string; submitter_email: string; submitter_name: string; reject_reason: string | null; created_at: string }[];
  error?: string;
}> {
  try {
    const params = new URLSearchParams({ app: 'med-label-printer' });
    if (status) params.set('status', status);

    const res = await fetch(`${OYX_APP_URL}/api/proposals?${params}`, {
      credentials: 'include',
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

/**
 * Check if user is logged in to oyx.app (needed before submitting proposals).
 * Returns the user info or null.
 */
export async function checkOyxAuth(): Promise<{
  authenticated: boolean;
  email?: string;
  name?: string;
}> {
  const url = `${OYX_APP_URL}/api/proposals?app=med-label-printer&limit=1`;
  console.log('[checkOyxAuth] GET', url);
  try {
    const res = await fetch(url, {
      credentials: 'include',
    });
    console.log('[checkOyxAuth] Response status:', res.status);
    const ok = res.ok;
    console.log('[checkOyxAuth] authenticated:', ok);
    if (ok) return { authenticated: true };
    return { authenticated: false };
  } catch (err) {
    console.error('[checkOyxAuth] Network error:', err);
    return { authenticated: false };
  }
}
