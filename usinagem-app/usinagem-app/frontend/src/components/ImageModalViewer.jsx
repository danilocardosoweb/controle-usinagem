import React, { useState } from 'react'
import { FaTimes, FaDownload, FaExternalLinkAlt } from 'react-icons/fa'

const ImageModalViewer = ({ isOpen, imageUrl, imageName, onClose }) => {
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen || !imageUrl) return null

  const handleDownload = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = imageName || 'imagem'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erro ao baixar imagem:', error)
      alert('Erro ao baixar imagem')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenInNewTab = () => {
    window.open(imageUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="relative bg-white rounded-lg shadow-2xl max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between bg-white border-b p-4 z-10">
          <h3 className="text-lg font-semibold text-gray-800 truncate">{imageName || 'Visualizar Imagem'}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
            title="Fechar"
          >
            <FaTimes className="h-6 w-6" />
          </button>
        </div>

        {/* Imagem */}
        <div className="flex items-center justify-center p-4 bg-gray-50">
          <img
            src={imageUrl}
            alt={imageName || 'Imagem'}
            className="max-w-full max-h-[60vh] object-contain rounded"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          />
        </div>

        {/* Footer com ações */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 bg-white border-t p-4">
          <button
            onClick={handleOpenInNewTab}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm font-medium"
            title="Abrir em nova aba"
          >
            <FaExternalLinkAlt className="h-4 w-4" />
            Abrir em nova aba
          </button>
          <button
            onClick={handleDownload}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition text-sm font-medium"
            title="Baixar imagem"
          >
            <FaDownload className="h-4 w-4" />
            {isLoading ? 'Baixando...' : 'Baixar'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition text-sm font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImageModalViewer
