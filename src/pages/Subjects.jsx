export default function SubjectsSection({
  subjectForm,
  setSubjectForm,
  academicYears,
  groups,
  coursesForGroup,
  semForCourse,
  feeCategories,
  categories,
  catItems,
  pendingSubjects,
  subjects,
  editingSubjectId,
  saveSubject,
  submitPendingSubjects,
  editPendingSubject,
  deletePendingSubject,
  editSubject,
  deleteSubject,
  onCancelSubjectEdit
}) {
  const yearNameById = academicYears.reduce((acc, year) => {
    if (year?.id !== undefined) acc[year.id] = year.name
    return acc
  }, {})
  const selectedYearName = yearNameById[subjectForm.academicYearId] || ''
  const getDisplayYear = (subject) => subject.academicYearName || yearNameById[subject.academicYearId] || subject.academicYearId || '-'
  const getSemesterLabel = (subject) => {
    const raw = subject?.semester ?? subject?.semester_number ?? subject?.semesterNumber ?? ''
    if (raw === undefined || raw === null || raw === '') return '-'
    const numeric = Number(raw)
    return Number.isNaN(numeric) ? raw : numeric
  }
  const extraNames = subjectForm.extraSubjectNames || []
  const updateExtraName = (idx, value) => {
    setSubjectForm(prev => {
      const list = [...(prev.extraSubjectNames || [])]
      list[idx] = value
      return { ...prev, extraSubjectNames: list }
    })
  }
  const removeExtraName = (idx) => {
    setSubjectForm(prev => {
      const list = [...(prev.extraSubjectNames || [])]
      list.splice(idx, 1)
      return { ...prev, extraSubjectNames: list }
    })
  }
  const addExtraNameField = () => {
    setSubjectForm(prev => ({
      ...prev,
      extraSubjectNames: [...(prev.extraSubjectNames || []), '']
    }))
  }
  const extraInputFields = (
    <>
      {extraNames.map((value, idx) => (
        <div key={`extra-${idx}`} className="d-flex gap-2 mt-2">
          <input
            className="form-control"
            placeholder={`Subject ${idx + 2}`}
            value={value}
            onChange={e => updateExtraName(idx, e.target.value)}
          />
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => removeExtraName(idx)}
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-outline-primary mt-3" onClick={addExtraNameField}>
        Add another subject
      </button>
    </>
  )
  return (
    <section className="setup-section mb-4">
      <h5 className="section-title">Subjects</h5>
      <div className="row g-3">
        <div className="col-12 col-sm-6 col-xl-3">
          <label className="form-label fw-bold mb-1">Academic Year</label>
          <select
            className="form-select"
            value={subjectForm.academicYearId}
            onChange={e => {
              const value = e.target.value
              const selected = academicYears.find(y => String(y.id) === String(value))
              setSubjectForm({ ...subjectForm, academicYearId: value, academicYearName: selected?.name || '' })
            }}
          >
            <option value="">Select Year</option>
            {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <label className="form-label fw-bold mb-1">Group</label>
          <select className="form-select" value={subjectForm.groupCode} onChange={e => setSubjectForm({ ...subjectForm, groupCode: e.target.value, courseCode: '', semester: '' })}>
            <option value="">Select Group</option>
            {groups.map(g => <option key={g.id} value={g.code}>{g.name || g.code}</option>)}
          </select>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <label className="form-label fw-bold mb-1">Course</label>
          <select
            className="form-select"
            value={subjectForm.courseCode}
            onChange={e => {
              const value = e.target.value
              const selected = coursesForGroup.find(c => c.courseCode === value)
              setSubjectForm({
                ...subjectForm,
                courseCode: value,
                courseName: selected?.courseName || value,
                semester: ''
              })
            }}
          >
            <option value="">Select Course</option>
            {coursesForGroup.map(c => <option key={c.id} value={c.courseCode}>{c.courseCode} - {c.courseName}</option>)}
          </select>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <label className="form-label fw-bold mb-1">Semester</label>
          <select className="form-select" value={subjectForm.semester} onChange={e => setSubjectForm({ ...subjectForm, semester: e.target.value })}>
            <option value="">Select Semester</option>
            {semForCourse.map(s => (
              <option key={s.id} value={s.number}>Semester {s.number}</option>
            ))}
          </select>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <label className="form-label fw-bold mb-1">Sub-category</label>
          <select className="form-select" value={subjectForm.category} onChange={e => setSubjectForm({ ...subjectForm, category: e.target.value, subjectSelections: [], subjectName: '' })}>
            <option value="">Select Sub-category</option>
            {categories.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <label className="form-label fw-bold mb-1">Subject Name</label>
          {(catItems[subjectForm.category] || []).length ? (
            <div className="subject-checkbox-group">
              {catItems[subjectForm.category].map(item => {
                const id = `subject-${item.id}`
                return (
                  <div className="form-check" key={item.id}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={id}
                      checked={subjectForm.subjectSelections?.includes(item.name)}
                      onChange={() => setSubjectForm(prev => {
                        const selections = new Set(prev.subjectSelections || [])
                        if (selections.has(item.name)) selections.delete(item.name)
                        else selections.add(item.name)
                        return { ...prev, subjectSelections: Array.from(selections), subjectName: '' }
                      })}
                    />
                    <label className="form-check-label" htmlFor={id}>{item.name}</label>
                  </div>
                )
              })}
              <input className="form-control mt-2" placeholder="Or type custom subject" value={subjectForm.subjectName} onChange={e => setSubjectForm({ ...subjectForm, subjectName: e.target.value, subjectSelections: [] })} />
              {extraInputFields}
            </div>
          ) : (
            <>
              <input className="form-control" placeholder="Subject Name" value={subjectForm.subjectName} onChange={e => setSubjectForm({ ...subjectForm, subjectName: e.target.value })} />
              {extraInputFields}
            </>
          )}
        </div>
      </div>
      <div className="mt-2 text-end">
        <button type="button" className="btn btn-accent" onClick={saveSubject}>{editingSubjectId ? 'Update Entry' : 'Add Entry'}</button>
        {editingSubjectId && (
          <button type="button" className="btn btn-outline-secondary ms-2" onClick={onCancelSubjectEdit}>Cancel</button>
        )}
      </div>
      {pendingSubjects.length > 0 && (
        <div className="card card-soft p-3 mt-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="section-title mb-0">Pending Subjects ({pendingSubjects.length})</h6>
            <button type="button" className="btn btn-brand" onClick={submitPendingSubjects}>Submit All</button>
          </div>
          <div className="table-responsive">
            <table className="table mb-0">
              <thead><tr><th>Year</th><th>Group</th><th>Course</th><th>Sem</th><th>Category</th><th>Subject</th><th>Actions</th></tr></thead>
              <tbody>
                {pendingSubjects.map(item => (
                  <tr key={item.id}>
                    <td>{getDisplayYear(item)}</td>
                    <td>{item.groupCode}</td>
                    <td>{item.courseCode}</td>
                    <td>{getSemesterLabel(item)}</td>
                    <td>{item.category}</td>
                    <td>{item.subjectName}</td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline-primary me-2" onClick={() => editPendingSubject(item)}>Edit</button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deletePendingSubject(item.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {subjects.length > 0 && (
        <div className="table-responsive mt-3">
          <table className="table mb-0">
            <thead><tr><th>Year</th><th>Group</th><th>Course</th><th>Sem</th><th>Category</th><th>Subject Name</th><th>Actions</th></tr></thead>
            <tbody>
             {subjects.map(s => (
                <tr key={s.id}>
                  <td>{getDisplayYear(s)}</td>
                  <td>{s.groupCode}</td>
                  <td>{s.courseCode}</td>
                  <td>{getSemesterLabel(s)}</td>
                  <td>{s.category}</td>
                  <td>{s.subjectName}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => editSubject(s)}>Edit</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => deleteSubject(s.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {subjects.length > 0 && (
        <div className="card card-soft p-3 mt-3">
          <h6 className="section-title">By Category (Preview)</h6>
          <div className="row g-3">
            {categories.map(cat => {
              const items = subjects.filter(s =>
                (!subjectForm.academicYearId ||
                  s.academicYearId === subjectForm.academicYearId ||
                  (!!selectedYearName && s.academicYearName === selectedYearName)) &&
                (!subjectForm.groupCode || s.groupCode === subjectForm.groupCode) &&
                (!subjectForm.courseCode || s.courseCode === subjectForm.courseCode) &&
                (!subjectForm.semester || Number(s.semester) === Number(subjectForm.semester)) &&
                s.category === cat
              )
              if (items.length === 0) return null
              return (
                <div className="col-md-6" key={cat}>
                  <div className="card p-3 bg-ice">
                    <div className="fw-600 mb-2">{cat}</div>
                    <ul className="list-unstyled mb-0">
                      {items.map(it => (
                        <li key={it.id} className="d-flex justify-content-between align-items-center py-1">
                          <span>{it.subjectName}</span>
                          <span className="small text-muted">Sem {getSemesterLabel(it)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
