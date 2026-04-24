const WorkflowHeader = ({ statuses, color = 'blue', emptyMessages = {}, highlightFirst = true, totals = {} }) => (
  <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      {statuses.map((status, index) => (
        <div key={status.key} className="flex items-center gap-2">
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
              highlightFirst && index === 0
                ? color === 'purple'
                  ? 'bg-purple-600 text-white'
                  : 'bg-blue-600 text-white'
                : color === 'purple'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-700">{status.title}</p>
            {totals && totals[status.key] != null ? (
              <p className="text-xs text-gray-500">pcs: {Number(totals[status.key]).toLocaleString('pt-BR')}</p>
            ) : null}
            {emptyMessages[status.key] ? (
              <p className="text-xs text-gray-500 max-w-[16rem]">{emptyMessages[status.key]}</p>
            ) : null}
          </div>
          {index < statuses.length - 1 && (
            <div
              className={`hidden md:block h-px w-10 ${
                color === 'purple'
                  ? 'bg-gradient-to-r from-purple-200 via-purple-400 to-purple-200'
                  : 'bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  </div>
)

export default WorkflowHeader
