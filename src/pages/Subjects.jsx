import { useMemo, useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export default function SubjectsSection({
  subjectForm,
  setSubjectForm,
  academicYears,
  groups,
  coursesForGroup,
  semForCourse,
  // Sub-categories props
  categories: subCategories,
  setCategories,
  catItems,
  setCatItems,
  categoryName,
  setCategoryName,
  editingCategory,
  setEditingCategory,
  deleteCategory,
  saveCategory,
  // Subjects props
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
  const [programmeCategory, setProgrammeCategory] = useState('')

  const yearNameById = academicYears.reduce((acc, year) => {
    if (year?.id !== undefined) acc[year.id] = year.name
    return acc
  }, {})
  const selectedYearName = yearNameById[subjectForm.academicYearId] || ''
  const getDisplayYear = (subject) => subject.academicYearName || yearNameById[subject.academicYearId] || subject.academicYearId || '-'
  const yearOptions = (() => {
    const activeList = academicYears.filter(year => year?.active !== false)
    if (!subjectForm.academicYearId) return activeList
    const hasSelected = activeList.some(year => String(year.id) === String(subjectForm.academicYearId))
    if (hasSelected) return activeList
    const selectedYear = academicYears.find(year => String(year.id) === String(subjectForm.academicYearId))
    return selectedYear ? [...activeList, selectedYear] : activeList
  })()
  const selectedYear = academicYears.find(
    (year) => String(year.id) === String(subjectForm.academicYearId)
  )
  useEffect(() => {
    if (selectedYear?.category) {
      setProgrammeCategory(selectedYear.category.toUpperCase())
    }
  }, [selectedYear])

  const filteredYearOptions = yearOptions.filter(
    (year) =>
      !year.category || year.category.toUpperCase() === programmeCategory
  )
  if (
    selectedYear &&
    !filteredYearOptions.some((year) => String(year.id) === String(selectedYear.id))
  ) {
    filteredYearOptions.push(selectedYear)
  }

  const filteredGroupOptions = groups.filter((group) => {
    const categoryValue = (group.category || group.Category || "").toUpperCase()
    const matchesCategory =
      !programmeCategory || !categoryValue || categoryValue === programmeCategory
    const matchesSelection =
      subjectForm.groupCode &&
      [group.groupCode, group.code, group.group_code]
        .map((v) => String(v || ""))
        .includes(String(subjectForm.groupCode))
    return matchesCategory || matchesSelection
  })
  const getSemesterLabel = (subject) => {
    const raw = subject?.semester ?? subject?.semester_number ?? subject?.semesterNumber ?? ''
    if (raw === undefined || raw === null || raw === '') return '-'
    const numeric = Number(raw)
    return Number.isNaN(numeric) ? raw : numeric
  }
  const extraNames = subjectForm.extraSubjectNames || []
  const groupNameByCode = useMemo(() => groups.reduce((acc, group) => {
    const code = group.groupCode || group.code || group.group_code || ''
    if (!code) return acc
    acc[code] = group.name || group.group_name || group.groupName || code
    return acc
  }, {}), [groups])
  const displayGroupName = (code) => groupNameByCode[code] || code || '-'
  const buildComboRows = (items = []) => {
    const comboMap = new Map()
    items.forEach(item => {
      const comboKey = [
        item.academicYearId || item.academicYearName || '',
        item.groupCode || '',
        item.courseCode || '',
        item.semester === undefined || item.semester === null ? '' : item.semester
      ].join('::')
      const base = comboMap.get(comboKey) || {
        comboKey,
        academicYear: getDisplayYear(item),
        groupCode: item.groupCode,
        courseCode: item.courseCode,
        courseName: item.courseName,
        semester: getSemesterLabel(item),
        categories: []
      }
      const categoryName = item.category || 'Uncategorised'
      let catEntry = base.categories.find(cat => cat.name === categoryName)
      if (!catEntry) {
        catEntry = {
          name: categoryName,
          subjects: [],
          source: item
        }
        base.categories.push(catEntry)
      }
      const itemSubjects = item.subjectNames?.length ? item.subjectNames : [item.subjectName].filter(Boolean)
      catEntry.subjects.push(...itemSubjects)
      comboMap.set(comboKey, base)
    })
    return Array.from(comboMap.values())
  }
  const pendingCombos = buildComboRows(pendingSubjects)
  const savedCombos = buildComboRows(subjects)
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
    <>
      {/* Sub-categories Section */}
      <section className="setup-section mb-4">
        <h5 className="section-title">Sub-categories</h5>
        <div className="subcat-input-panel">
          <div className="flex-grow-1">
            <label className="form-label fw-bold mb-1">
              Sub-category Name <span className="text-danger">*</span>
            </label>
            <p className="text-uppercase text-muted small mb-1">{editingCategory ? 'Update existing sub-category' : 'Add a new sub-category'}</p>
            <div className="d-flex gap-2 flex-wrap">
              <input
                className="form-control flex-grow-1"
                placeholder="e.g., English"
                required
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    saveCategory()
                  }
                }}
              />
              <button type="button" className="btn btn-brand" onClick={saveCategory}>
                {editingCategory ? 'Update' : 'Add'}
              </button>
              {editingCategory && (
                <button type="button" className="btn btn-outline-secondary" onClick={() => { setCategoryName(''); setEditingCategory('') }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
          <div className="subcat-input-copy text-muted">
            <div className="fw-semibold text-dark">Organise subjects into sub-categories</div>
            <div className="small">Create descriptive buckets (e.g., Languages, Labs) to streamline subject assignment.</div>
          </div>
        </div>

        {subCategories.length === 0 && <div className="alert alert-info mb-0">Add a sub-category to begin creating subjects.</div>}
        <div className="subcat-grid">
          {subCategories.map(cat => {
            const subjectCount = (catItems[cat] || []).length
            return (
              <div key={cat} className="subcat-panel">
                <div className="subcat-panel-header">
                  <div>
                    <div className="subcat-panel-title">{cat}</div>
                   
                  </div>
                  <div className="subcat-panel-actions">
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => { setCategoryName(cat); setEditingCategory(cat) }}>Rename</button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deleteCategory(cat)}>Delete</button>
                  </div>
                </div>
                <div className="mt-3 text-muted small">
                  Subjects for this category can be added directly from the Subjects tab.
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Subjects Section */}
      <section className="setup-section mb-4">
      <h5 className="section-title">Subjects</h5>
      <div className="row g-3">
        <div className="col-12 col-sm-6 col-xl-3">
          <label className="form-label fw-bold mb-1">Category <span className="text-danger">*</span></label>
          <select
            className="form-select"
            value={programmeCategory}
            onChange={(e) => {
              const value = e.target.value
              setProgrammeCategory(value)
              setSubjectForm({
                ...subjectForm,
                programmeCategory: value,
                academicYearId: "",
                academicYearName: "",
                groupCode: "",
                courseCode: "",
                semester: ""
              })
            }}
          >
            <option value="">Select category</option>
            <option value="UG">UG</option>
            <option value="PG">PG</option>
          </select>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
              <label className="form-label fw-bold mb-1">Academic Year <span className="text-danger">*</span></label>
          <select
            className="form-select"
            required
            value={subjectForm.academicYearId}
            disabled={!programmeCategory}
            onChange={e => {
              const value = e.target.value
              const selected = academicYears.find(y => String(y.id) === String(value))
              setSubjectForm({ ...subjectForm, academicYearId: value, academicYearName: selected?.name || '' })
            }}
          >
                <option value="">Select Year</option>
            {filteredYearOptions.map(y => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <label className="form-label fw-bold mb-1">Group <span className="text-danger">*</span></label>
          <select
            className="form-select"
            required
            value={subjectForm.groupCode}
            disabled={!programmeCategory}
            onChange={e => setSubjectForm({ ...subjectForm, groupCode: e.target.value, courseCode: '', semester: '' })}
          >
            <option value="">Select Group</option>
            {filteredGroupOptions.map(g => <option key={g.id} value={g.code}>{g.name || g.code}</option>)}
          </select>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <label className="form-label fw-bold mb-1">Course <span className="text-danger">*</span></label>
          <select
            className="form-select"
            required
            disabled={!subjectForm.groupCode}
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
            {coursesForGroup.map(c => (
              <option key={c.id} value={c.courseCode}>
                {c.courseName || c.name || c.courseCode}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <label className="form-label fw-bold mb-1">Semester <span className="text-danger">*</span></label>
          <select
            className="form-select"
            required
            disabled={!subjectForm.courseCode}
            value={subjectForm.semester}
            onChange={e => setSubjectForm({ ...subjectForm, semester: e.target.value })}
          >
            <option value="">Select Semester</option>
            {semForCourse.map(s => (
              <option key={s.id} value={s.number}>Semester {s.number}</option>
            ))}
          </select>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <label className="form-label fw-bold mb-1">Sub-category <span className="text-danger">*</span></label>
          <select className="form-select" required value={subjectForm.category} onChange={e => setSubjectForm({ ...subjectForm, category: e.target.value, subjectSelections: [], subjectName: '' })}>
            <option value="">Select Sub-category</option>
            {subCategories.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <label className="form-label fw-bold mb-1">Subject Title <span className="text-danger">*</span></label>
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
              <input className="form-control" placeholder="Subject title" value={subjectForm.subjectName} onChange={e => setSubjectForm({ ...subjectForm, subjectName: e.target.value })} />
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
      {pendingCombos.length > 0 && (
        <div className="card card-soft p-3 mt-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="section-title mb-0">Pending Subjects ({pendingCombos.length})</h6>
            <button type="button" className="btn btn-brand" onClick={submitPendingSubjects}>Submit All</button>
          </div>
          <div className="table-responsive">
            <table className="table mb-0">
              <thead><tr><th>Year</th><th>Group</th><th>Course</th><th>Sem</th><th>Details</th></tr></thead>
              <tbody>
                {pendingCombos.map(combo => (
                  <tr key={combo.comboKey}>
                    <td>{combo.academicYear}</td>
                    <td>{displayGroupName(combo.groupCode)}</td>
                    <td>{combo.courseName || combo.courseCode || '-'}</td>
                    <td>{combo.semester}</td>
                    <td>
                      {combo.categories.map(cat => {
                        const subjectText = cat.subjects.filter(Boolean).join(', ') || '-'
                        return (
                          <div key={`${combo.comboKey}-${cat.name}`} className="mb-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="fw-semibold">{cat.name}</span>
                              <div className="d-flex gap-2">
                                <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => editPendingSubject(cat.source)}>Edit</button>
                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deletePendingSubject(cat.source)}>Remove</button>
                              </div>
                            </div>
                            <div className="small text-muted">{subjectText}</div>
                          </div>
                        )
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {savedCombos.length > 0 && (
        <div className="table-responsive mt-3">
          <table className="table mb-0">
            <thead><tr><th>Year</th><th>Group</th><th>Course</th><th>Sem</th><th>Details</th></tr></thead>
            <tbody>
              {savedCombos.map(combo => (
                <tr key={combo.comboKey}>
                  <td>{combo.academicYear}</td>
                  <td>{displayGroupName(combo.groupCode)}</td>
                  <td>{combo.courseName || combo.courseCode || '-'}</td>
                  <td>{combo.semester}</td>
                    <td>
                      {combo.categories.map(cat => {
                        const subjectText = cat.subjects.filter(Boolean).join(', ') || '-'
                        return (
                          <div key={`${combo.comboKey}-${cat.name}`} className="mb-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="fw-semibold">{cat.name}</span>
                              <div className="d-flex gap-2">
                                <button className="btn btn-sm btn-outline-primary" onClick={() => editSubject(cat.source)}>Edit</button>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => deleteSubject(cat.source)}>Delete</button>
                              </div>
                            </div>
                            <div className="small text-muted">{subjectText}</div>
                          </div>
                        )
                      })}
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </section>
    </>
  )
}
