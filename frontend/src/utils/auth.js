export const isAdmin = (user) => {
  const role = String(user?.role || '').toLowerCase()
  return ['admin', 'administrador', 'administrator', 'superadmin'].includes(role)
}
