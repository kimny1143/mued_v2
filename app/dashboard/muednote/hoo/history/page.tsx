import { redirect } from 'next/navigation';

/**
 * Redirect to main Hoo History page.
 * The history view is now the default at /dashboard/muednote/hoo
 */
export default function HooHistoryRedirect() {
  redirect('/dashboard/muednote/hoo');
}
