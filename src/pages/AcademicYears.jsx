import { useState } from 'react';

const inferCategoryFromYearName = (yearName = '') => {
  if (!yearName) return 'UG';
  const sanitized = yearName.trim().replace(/[^0-9-]/g, '');
  const match = sanitized.match(/^(\d{4})-(\d{4})$/);
  if (!match) return 'UG';
  const start = Number(match[1]);
  const end = Number(match[2]);
  return end - start === 2 ? 'PG' : 'UG';
};

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
  const [error, setError] = useState('');

  const validateYearFormat = (yearStr, category) => {
    if (!yearStr) return false;
    
    // Check if the format is YYYY-YYYY
    const yearRegex = /^(\d{4})-(\d{4})$/;
    if (!yearRegex.test(yearStr)) return false;
    
    const [startYear, endYear] = yearStr.split('-').map(Number);
    const expectedDuration = category === 'UG' ? 3 : 2;
    
    return (endYear - startYear) === expectedDuration;
  };

  const handleYearChange = (e) => {
    const value = e.target.value;
    setYearForm(prev => ({ ...prev, name: value }));
    
    if (!value) {
      setError('');
      return;
    }
    
    if (!yearForm.category) {
      setError('Please select a category first');
      return;
    }
    
    if (!validateYearFormat(value, yearForm.category)) {
      const expectedYears = yearForm.category === 'UG' ? '3 years' : '2 years';
      setError(`Please enter a valid ${yearForm.category} duration (${expectedYears})`);
    } else {
      setError('');
    }
  };
  
  const getCategory = (year) => {
    const rawCategory =
      (year.category && String(year.category)) ||
      (year.year_category && String(year.year_category)) ||
      "";
    const normalized = rawCategory.trim();
    if (normalized) return normalized.toUpperCase();
    return inferCategoryFromYearName(year.name || year.academic_year);
  };

  // Group academic years by category (normalize to uppercase)
  const groupedYears = academicYears.reduce(
    (acc, year) => {
      const category = getCategory(year);
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(year);
      return acc;
    },
    { UG: [], PG: [] } // Ensure both buckets exist
  );
  const ugYears = groupedYears.UG || [];
  const pgYears = groupedYears.PG || [];

  const handleAddYear = async () => {
    if (!yearForm.category) {
      setError('Please select a category first');
      return;
    }
    
    if (!validateYearFormat(yearForm.name, yearForm.category)) {
      const expectedYears = yearForm.category === 'UG' ? '3 years' : '2 years';
      setError(`Please enter a valid ${yearForm.category} duration (${expectedYears})`);
      return;
    }
    
    setError('');
    await addYear();
  };

  const handleEditYear = (year) => {
    const category = getCategory(year);
    editYear(year);
    setYearForm({
      name: year.name || year.academic_year,
      category,
      active: year.active,
    });
    setError('');
  };

  const handleDeleteYear = async (id) => {
    if (window.confirm('Are you sure you want to delete this academic year?')) {
      await deleteYear(id);
    }
  };
  return (
    <section className="setup-section mb-4">
      <h5 className="section-title">Academic Years</h5>
      <div className="row g-2">
        <div className="col-md-2">
          <label className="form-label fw-bold mb-1">Category</label>
          <select
            className="form-select"
            value={yearForm.category || ''}
            onChange={(e) => {
              setYearForm({ ...yearForm, category: e.target.value, name: '' });
              setError('');
            }}
            required
          >
            <option value="">Select Category</option>
            <option value="UG">UG</option>
            <option value="PG">PG</option>
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label fw-bold mb-1">Academic Year</label>
          <input
            className={`form-control ${error && 'is-invalid'}`}
            placeholder={yearForm.category === 'UG' ? 'e.g., 2022-2025' : 'e.g., 2022-2024'}
            required
            value={yearForm.name}
            onChange={handleYearChange}
            disabled={!yearForm.category}
          />
          {error && <div className="invalid-feedback d-block">{error}</div>}
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
          <button className="btn btn-brand me-2" onClick={handleAddYear}>
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
      {(ugYears.length > 0 || pgYears.length > 0) && (
        <div className="row mt-4">
          {/* UG Years Column */}
          <div className="col-md-6">
            {ugYears.length > 0 && (
              <>
                <h6 className="fw-bold mb-3">UG Years</h6>
                <div className="setup-list">
                  {ugYears.map((y) => (
                  <div
                    className="setup-list-item"
                    key={y.id || y.academic_year || y.name}
                  >
                    <div>
                      <div className="setup-list-title">
                        {y.name || y.academic_year}
                        <span className="badge bg-secondary ms-2">{getCategory(y)}</span>
                      </div>
                      <div className="setup-list-meta">
                        {getCategory(y)} Academic Year
                      </div>
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
                        onClick={() => handleEditYear(y)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteYear(y.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                </div>
              </>
            )}
          </div>
          
          {/* PG Years Column */}
          <div className="col-md-6">
            {groupedYears['PG'] && (
              <>
                <h6 className="fw-bold mb-3">PG Years</h6>
                <div className="setup-list">
                  {pgYears.map((y) => (
                    <div
                      className="setup-list-item"
                      key={y.id || y.academic_year || y.name}
                    >
                      <div>
                        <div className="setup-list-title">
                          {y.name || y.academic_year}
                          <span className="badge bg-secondary ms-2">{getCategory(y)}</span>
                        </div>
                        <div className="setup-list-meta">
                          {getCategory(y)} Academic Year
                        </div>
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
                          onClick={() => handleEditYear(y)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteYear(y.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
