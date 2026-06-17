// Client/src/components/EmptyState.jsx

function EmptyState({
  title = "No data found",
  message = "New records will appear here once they are available.",
}) {
  return (
    <div className="ws-empty-state">
      <div className="ws-state-icon">WS</div>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

export default EmptyState;