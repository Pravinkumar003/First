export default function AcademicYearsSection({
  yearForm,
  setYearForm,
  academicYears = [],
  editingYearId,
  addYear,
  editYear,
  deleteYear,
  onCancelEdit,
}) {
  return (
    <section className="setup-section mb-4">
      <h5 className="section-title">Academic Years</h5>
      <div className="row g-2">
        <div className="col-md-5">
          <label className="form-label fw-bold mb-1">Academic Year Name</label>
          <input
            className="form-control"
            placeholder="e.g., 2022-2025"
            required
            value={yearForm.name}
            onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
          />
        </div>
        <div className="col-md-3 d-flex align-items-center">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="activeYear"
              checked={yearForm.active}
              onChange={(e) =>
                setYearForm({ ...yearForm, active: e.target.checked })
              }
            />
            <label className="form-check-label ms-2" htmlFor="activeYear">
              Active
            </label>
          </div>
        </div>
        <div className="col-md-4 text-end">
          <button className="btn btn-brand me-2" onClick={addYear}>
            {editingYearId ? "Update Year" : "Add Year"}
          </button>
          {editingYearId && (
            <button
              className="btn btn-outline-secondary"
              onClick={onCancelEdit}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      {Array.isArray(academicYears) && academicYears.length > 0 && (
        <div className="setup-list mt-3">
          {academicYears.map((y) => (
            <div
              className="setup-list-item"
              key={y.id || y.academic_year || y.name}
            >
              <div>
                <div className="setup-list-title">
                  {y.name || y.academic_year}
                </div>
                <div className="setup-list-meta">Created</div>
              </div>
              <div className="d-flex gap-2 align-items-center">
                <span
                  className={`status-pill ${
                    y.active ? "status-pill--active" : "status-pill--inactive"
                  }`}
                >
                  {y.active ? "Active" : "Inactive"}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => editYear(y)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => deleteYear(y.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
