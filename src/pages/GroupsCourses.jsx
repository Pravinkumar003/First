export default function GroupsCoursesSection({
  groupForm,
  setGroupForm,
  editingGroupId,
  setEditingGroupId,
  groups,
  saveGroup,
  editGroup,
  deleteGroup,
  courseForm,
  setCourseForm,
  editingCourseId,
  setEditingCourseId,
  courses,
  saveCourse,
  editCourse,
  deleteCourse
}) {
  const neutralCardStyle = {
    borderRadius: '18px',
    border: '1px solid #e2e8f0',
    background: 'linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%)',
    boxShadow: '0 18px 35px rgba(15,23,42,0.08)'
  }
  const accentBadgeStyle = {
    backgroundColor: '#ecf0ff',
    color: '#1d3ecf',
    fontWeight: 600,
    borderRadius: '999px',
    padding: '0.35rem 0.9rem'
  }
  const pillButtonStyle = {
    borderRadius: '999px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    fontWeight: 600,
    color: '#0f172a'
  }
  const coolCardStyle = {
    borderRadius: '18px',
    border: '1px solid #e1e7ef',
    background: 'linear-gradient(180deg, #ffffff 0%, #f3f6fb 100%)',
    boxShadow: '0 16px 32px rgba(15,23,42,0.07)'
  }
  const courseBadgeStyle = {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    fontWeight: 600,
    borderRadius: '999px',
    padding: '0.35rem 0.9rem'
  }

  return (
    <>
      <section className="setup-section mb-4">
        <h5 className="section-title">Groups</h5>
        <div className="row">
          <div className="col-12">
            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label fw-bold mb-1">Group Code</label>
                <input className="form-control" placeholder="Group Code" required value={groupForm.code} onChange={e => setGroupForm({ ...groupForm, code: e.target.value.toUpperCase() })} />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-bold mb-1">Group Name</label>
                <input className="form-control" placeholder="Group Name" required value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} />
              </div>
              <div className="col-md-4 col-lg-3">
                <label className="form-label fw-bold mb-1">Duration (years)</label>
                <input
                  type="number"
                  className="form-control no-spinner"
                  placeholder="Years"
                  value={groupForm.years}
                  onChange={e => setGroupForm({ ...groupForm, years: e.target.value })}
                  style={{ '-moz-appearance': 'textfield' }}
                  onWheel={e => e.target.blur()}
                />
              </div>
              <div className="col-md-4 col-lg-3">
                <label className="form-label fw-bold mb-1">Number of semesters</label>
                <input
                  type="number"
                  className="form-control no-spinner"
                  placeholder="No. of Semesters"
                  value={groupForm.semesters}
                  onChange={e => setGroupForm({ ...groupForm, semesters: e.target.value })}
                  style={{ '-moz-appearance': 'textfield' }}
                  onWheel={e => e.target.blur()}
                />
              </div>
            </div>
            <div className="mt-3">
              <button className="btn btn-brand me-2" onClick={saveGroup}>
                {editingGroupId ? 'Update Group' : 'Add Group'}
              </button>
              {editingGroupId && (
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setGroupForm({ id: '', code: '', name: '', years: 0, semesters: 0 })
                    setEditingGroupId('')
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
        {groups.length > 0 && (
          <div className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="text-muted text-uppercase fw-semibold small" style={{ letterSpacing: '0.08em' }}>Showing {groups.length} group{groups.length === 1 ? '' : 's'}</span>
            </div>
            <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
              {groups.map(g => (
                <div className="col" key={g.id}>
                  <div className="card border-0 h-100" style={neutralCardStyle}>
                    <div className="card-body d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <div className="text-uppercase text-muted small mb-1">Group Name</div>
                          <div className="fs-5 fw-bold">{g.name || '-'}</div>
                          <div className="text-muted small">{g.code || '-'}</div>
                        </div>
                        <span style={accentBadgeStyle}>{g.years || 0} yrs</span>
                      </div>
                      <div className="d-flex flex-wrap gap-4 mb-4 text-muted">
                        <div>
                          <div className="text-uppercase small">Duration</div>
                          <div className="fw-semibold text-dark">{g.years || '-'} Years</div>
                        </div>
                        <div>
                          <div className="text-uppercase small">Semesters</div>
                          <div className="fw-semibold text-dark">{g.semesters || '-'}</div>
                        </div>
                      </div>
                      <div className="mt-auto d-flex gap-2">
                        <button type="button" className="btn btn-sm flex-fill" style={pillButtonStyle} onClick={() => editGroup(g)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm flex-fill"
                          style={{ ...pillButtonStyle, color: '#b91c1c', borderColor: '#fde2e1', backgroundColor: '#fff5f5' }}
                          onClick={() => deleteGroup(g.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="setup-section mb-4">
        <h5 className="section-title">Courses</h5>
        <div className="row">
          <div className="col-md-8">
            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label fw-bold mb-1">Select Group</label>
                <select
                  className="form-select"
                  required
                  value={courseForm.groupCode}
                  onChange={e => setCourseForm({ ...courseForm, groupCode: e.target.value })}
                >
                  <option value="">Select Group</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.code}>{g.name || g.code}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-bold mb-1">Course Code</label>
                <input
                  className="form-control"
                  placeholder="Enter Course Code"
                  required
                  value={courseForm.courseCode}
                  onChange={e => setCourseForm({ ...courseForm, courseCode: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-bold mb-1">Course Name</label>
                <input
                  className="form-control"
                  placeholder="Enter Course Name"
                  required
                  value={courseForm.courseName}
                  onChange={e => setCourseForm({ ...courseForm, courseName: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-3">
              <button className="btn btn-brand me-2" onClick={saveCourse}>
                {editingCourseId ? 'Update Course' : 'Add Course'}
              </button>
              {editingCourseId && (
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setCourseForm({ id: '', groupCode: '', courseCode: '', courseName: '', semesters: 6 })
                    setEditingCourseId('')
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
        {courses.length > 0 && (
          <div className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="text-muted text-uppercase fw-semibold small" style={{ letterSpacing: '0.08em' }}>Showing {courses.length} course{courses.length === 1 ? '' : 's'}</span>
            </div>
            <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
              {courses.map(c => (
                <div className="col" key={c.id}>
                  <div className="card border-0 h-100" style={coolCardStyle}>
                    <div className="card-body d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <div className="text-uppercase text-muted small mb-1">Course Name</div>
                          <div className="fs-5 fw-bold">{c.courseName}</div>
                        </div>
                        <span style={courseBadgeStyle}>{c.semesters} sems</span>
                      </div>
                      <div className="mb-2">
                        <div className="text-muted text-uppercase small mb-1">Course Code</div>
                        <div className="fw-semibold text-dark">{c.courseCode}</div>
                      </div>
                      <p className="text-muted text-uppercase small mb-1">Group</p>
                      <p className="fw-semibold text-dark mb-4">{c.groupCode}</p>
                      <div className="mt-auto d-flex gap-2">
                        <button type="button" className="btn btn-sm flex-fill" style={pillButtonStyle} onClick={() => editCourse(c)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm flex-fill"
                          style={{ ...pillButtonStyle, color: '#b91c1c', borderColor: '#fde2e1', backgroundColor: '#fff5f5' }}
                          onClick={() => deleteCourse(c.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  )
}
