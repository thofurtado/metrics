export async function signOut() {
  localStorage.removeItem('token')
  window.dispatchEvent(new Event('auth-change'))
}
