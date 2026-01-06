const StatusCard = ({ status, count, children }) => {
  const accentClass = status?.accent ? `border-l-4 ${status.accent}` : ''

  return (
    <article
      className={`border rounded-lg shadow-sm bg-white transition-shadow hover:shadow-md ${accentClass}`}
    >
      <div className="p-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              {status.title}
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                {count}
              </span>
            </h3>
            {status.description ? (
              <p className="text-sm text-gray-600">{status.description}</p>
            ) : null}
          </div>
          {status.badge ? (
            <span className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full whitespace-nowrap ${status.badgeClass}`}>
              {status.badge}
            </span>
          ) : null}
        </div>

        {children}
      </div>
    </article>
  )
}

export default StatusCard
