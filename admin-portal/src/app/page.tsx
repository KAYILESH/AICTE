import { redirect } from 'next/navigation'

/**
 * Admin portal root: redirect to the login page.
 */
export default function AdminPortalRoot() {
  redirect('/login')
}
