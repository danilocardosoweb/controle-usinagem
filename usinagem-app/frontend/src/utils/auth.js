export const isAdmin = (user) => {
  const role = String(user?.role || '').toLowerCase()
  return ['admin', 'administrador', 'administrator', 'superadmin'].includes(role)
}

export const isVisualizador = (user) => {
  const nivel = String(user?.nivel_acesso || user?.role || '').toLowerCase()
  return nivel === 'visualizador'
}

export const canEdit = (user) => {
  return !isVisualizador(user)
}
