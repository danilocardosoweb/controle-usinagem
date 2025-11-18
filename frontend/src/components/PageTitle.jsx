const PageTitle = ({ title, subtitle }) => {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-2">
        {title}
      </h1>
      {subtitle && (
        <p className="text-gray-500">
          {subtitle}
        </p>
      )}
    </div>
  )
}

export default PageTitle
