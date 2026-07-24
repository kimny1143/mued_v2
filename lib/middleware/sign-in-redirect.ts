/**
 * Where to send someone back to after they sign in.
 *
 * Split out of `middleware.ts` so the two things that are easy to get wrong here can be tested
 * directly: keeping the query string, and refusing to hand back anything that isn't same-origin.
 */

/**
 * Builds the `redirect_url` value for the sign-in bounce.
 *
 * Keeps the query string. Dropping it silently loses whatever the link carried — campaign
 * parameters from our own emails were landing in GA4 as "direct" because `/dashboard/plugins?utm_…`
 * bounced through the sign-in redirect and came back bare, so the portal button in every welcome
 * email went untracked for exactly the recipients who weren't signed in yet.
 *
 * Always returns a same-origin relative path. A value starting with `//` reads as a
 * protocol-relative URL (`//evil.example` → a different origin), so leading slashes are collapsed
 * to one; anything that somehow isn't rooted gets rooted.
 */
export function buildSignInRedirectTarget(pathname: string, search = ''): string {
  const rootedPath = `/${pathname.replace(/^\/+/, '')}`;
  const query = search && !search.startsWith('?') ? `?${search}` : search;
  return `${rootedPath}${query}`;
}
