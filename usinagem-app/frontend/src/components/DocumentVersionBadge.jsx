import { DOCUMENT_VERSION_LABEL } from '../config/documentVersion'

const DocumentVersionBadge = ({ className = '' }) => (
  <span
    className={`inline-flex items-center whitespace-nowrap rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ${className}`}
    title="Controle de versão do documento"
    aria-label={`Controle documental: ${DOCUMENT_VERSION_LABEL}`}
  >
    {DOCUMENT_VERSION_LABEL}
  </span>
)

export default DocumentVersionBadge
