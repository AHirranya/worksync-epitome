function StatCard({ title, value, subtitle }) {
  return (
    <div className="stat-card">
      <p>{title}</p>
      <h2>{value}</h2>
      <span>{subtitle}</span>
    </div>
  );
}

export default StatCard;