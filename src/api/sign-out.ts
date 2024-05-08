export async function signOut() {
  await localStorage.removeItem('token')
}
