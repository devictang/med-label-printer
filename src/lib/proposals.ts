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
  const results: { localIndex: number; proposalId?: number; error?: string }[] = [];

  for (let i = 0; i < proposals.length; i++) {
    const { proposalType, payload } = proposals[i];
    try {
      const res = await fetch(`${OYX_APP_URL}/api/proposals`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_slug: 'med-label-printer',
          proposal_type: proposalType,
          payload,
        }),
      });

      let data: ProposalsApiResponse<CreatedProposal>;
      try {
        data = await res.json();
      } catch {
        // Response body not JSON — read as text for debugging
        const text = await res.text().catch(() => '(empty body)');
        results.push({ localIndex: i, error: `HTTP ${res.status}: ${text.slice(0, 200)}` });
        continue;
      }

      if (!res.ok || !data.ok) {
        results.push({ localIndex: i, error: data.error || `HTTP ${res.status}` });
      } else if (data.proposal) {
        results.push({ localIndex: i, proposalId: data.proposal.id });
      } else {
        results.push({ localIndex: i, error: 'Unexpected response format' });
      }
    } catch (err) {
      results.push({ localIndex: i, error: err instanceof Error ? err.message : 'Network error' });
    }
  }

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
  try {
    const res = await fetch(`${OYX_APP_URL}/api/proposals?app=med-label-printer&limit=1`, {
      credentials: 'include',
    });
    if (res.ok) return { authenticated: true };
    return { authenticated: false };
  } catch {
    return { authenticated: false };
  }
}
