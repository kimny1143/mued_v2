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
 * Always resolves to the same origin. Both `//` and `/\` are read as protocol-relative — browsers
 * treat the backslash as a slash here, so `/\evil.example` resolves to `https://evil.example` just
 * like `//evil.example` does. Leading runs of either character collapse to a single `/`, and
 * anything that somehow isn't rooted gets rooted.
 *
 * Fragments are not handled because they never arrive: the client keeps `#…` to itself and the
 * server never sees it, so there is nothing to preserve.
 */
export function buildSignInRedirectTarget(pathname: string, search = ''): string {
  const rootedPath = `/${pathname.replace(/^[/\\]+/, '')}`;
  const query = search && !search.startsWith('?') ? `?${search}` : search;
  return `${rootedPath}${query}`;
}
