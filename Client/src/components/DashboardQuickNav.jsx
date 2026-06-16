// Client/src/components/DashboardQuickNav.jsx

function DashboardQuickNav({ links }) {
  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <section className="dashboard-quick-nav">
      {links.map((link) => (
        <button
          type="button"
          key={link.id}
          onClick={() => scrollToSection(link.id)}
        >
          {link.label}
        </button>
      ))}
    </section>
  );
}

export default DashboardQuickNav;