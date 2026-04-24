import { redirect } from 'next/navigation';

// Intermediate bounce page: mued.jp/dial-return → dial.mued.jp/
// Used as same-origin redirect_url after Clerk sign-in on mued.jp,
// because Clerk (Hobby plan) does not accept cross-origin redirect_url.
// Remove this page when upgrading to Clerk Pro + satellite domain.
export default function DialReturnPage() {
  redirect('https://dial.mued.jp/');
}
