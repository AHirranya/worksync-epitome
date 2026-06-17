// Client/src/components/LoadingState.jsx

function LoadingState({
  title = "Loading data",
  message = "Please wait while we fetch the latest information.",
  type = "default",
}) {
  if (type === "table") {
    return (
      <div className="ws-table-loading">
        {[1, 2, 3, 4].map((item) => (
          <div className="ws-skeleton-row" key={item}>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="ws-loading-state">
      <div className="ws-loader"></div>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

export default LoadingState;