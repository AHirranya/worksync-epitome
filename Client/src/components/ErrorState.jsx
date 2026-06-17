// Client/src/components/ErrorState.jsx

function ErrorState({
  title = "Something went wrong",
  message = "Unable to load this section. Please try again.",
  onRetry = null,
}) {
  return (
    <div className="ws-error-state">
      <div className="ws-state-icon ws-error-icon">!</div>
      <h3>{title}</h3>
      <p>{message}</p>

      {onRetry && (
        <button type="button" className="outline-small-btn" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}

export default ErrorState;