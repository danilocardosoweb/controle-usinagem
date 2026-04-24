import { FaTrash } from 'react-icons/fa'

const DeletePedidoButton = ({ isAdmin, orderId, onDelete, disabled, className }) => {
  if (!isAdmin) return null
  return (
    <button
      type="button"
      onClick={() => onDelete(orderId)}
      className={className}
      disabled={disabled}
      title={disabled ? 'Removendo...' : 'Remover do processo (Admin)'}
      aria-label="Remover do processo (Admin)"
    >
      <FaTrash />
    </button>
  )
}

export default DeletePedidoButton
