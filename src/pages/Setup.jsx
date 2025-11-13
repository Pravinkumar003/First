import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import AdminShell from '../components/AdminShell'
import { api } from '../lib/mockApi'

// Utility
const uid = () => Math.random().toString(36).slice(2)
const renameKey = (map, from, to, fallbackValue) => {
  if (from === to) return map
  const { [from]: value = fallbackValue, ...rest } = map
  return { ...rest, [to]: value ?? fallbackValue }
}
const deleteKey = (map, key) => {
  if (!Object.prototype.hasOwnProperty.call(map, key)) return map
  const { [key]: _omit, ...rest } = map
  return rest
}
const buildSubjectForm = (category = '') => ({
  academicYearId: '',
  groupCode: '',
  courseCode: '',
  semester: '',
  category,
  subjectCode: '',
  subjectName: '',
  remark: ''
})
const normalizeFeeCategories = (data) => {
  if (Array.isArray(data)) {
    const hasNestedFees = data.some(item => Array.isArray(item?.fees) || Array.isArray(item?.items))
    if (hasNestedFees) {
      return data
        .map(cat => ({
          id: cat?.id || uid(),
          name: (cat?.name || '').toString(),
          fees: (cat?.fees || cat?.items || [])
            .map(fee => ({
              id: fee?.id || uid(),
              name: (fee?.name || '').toString(),
              amount: fee?.amount === 0 || fee?.amount ? String(fee.amount) : ''
            }))
            .filter(fee => fee.name.trim())
        }))
        .filter(cat => cat.name.trim() || cat.fees.length)
    }
    const fallbackFees = data
      .map(item => ({
        id: item?.id || uid(),
        name: (item?.name || '').toString(),
        amount: item?.amount === 0 || item?.amount ? String(item.amount) : ''
      }))
      .filter(item => item.name.trim())
    if (!fallbackFees.length) return []
    return [{
      id: uid(),
      name: 'General',
      fees: fallbackFees
    }]
  }
  if (data && typeof data === 'object') {
    const entries = Object.entries(data)
      .map(([name, amount]) => ({
        id: uid(),
        name,
        amount: amount === 0 || amount ? String(amount) : ''
      }))
      .filter(item => item.name.trim())
    if (!entries.length) return []
    return [{
      id: uid(),
      name: 'General',
      fees: entries
    }]
  }
  return []
}

export default function Setup() {
  // Route-driven tab from sidebar
  const { tab: tabParam } = useParams()
  const tab = (['years','groups','subcats','subjects'].includes(tabParam)) ? tabParam : 'years'

  // Academic Years (shared)
  const [yearForm, setYearForm] = useState({ name: '', active: true })
  const [academicYears, setAcademicYears] = useState([])
  const addYear = async () => {
    if (!yearForm.name) return
    const rec = { id: uid(), name: yearForm.name, active: yearForm.active }
    setAcademicYears(prev => [...prev, rec])
    try { await api.addAcademicYear({ name: yearForm.name, active: yearForm.active }) } catch {}
    setYearForm({ name: '', active: true })
  }

  // Groups
  const [groups, setGroups] = useState([])
  const [groupForm, setGroupForm] = useState({ id: '', code: '', name: '', years: 0, semesters: 0 })
  const [editingGroupId, setEditingGroupId] = useState('')
  const saveGroup = async () => {
    if (!groupForm.code || !groupForm.name) return
    if (!editingGroupId && groups.some(g => g.code === groupForm.code)) return
    if (editingGroupId) {
      setGroups(groups.map(g => g.id === editingGroupId ? { ...g, code: groupForm.code, name: groupForm.name, years: Number(groupForm.years)||0, semesters: Number(groupForm.semesters)||0 } : g))
    } else {
      const rec = { id: uid(), code: groupForm.code.toUpperCase(), name: groupForm.name, years: Number(groupForm.years)||0, semesters: Number(groupForm.semesters)||0 }
      setGroups([...groups, rec])
      try { await api.addGroup({ code: rec.code, name: rec.name }) } catch {}
    }
    setGroupForm({ id: '', code: '', name: '', years: 0, semesters: 0 }); setEditingGroupId('')
  }
  const editGroup = (g) => { setGroupForm(g); setEditingGroupId(g.id) }
  const deleteGroup = (id) => { setGroups(groups.filter(g => g.id !== id)) }

  // Courses
  const [courses, setCourses] = useState([])
  const [courseForm, setCourseForm] = useState({ id: '', groupCode: '', courseCode: '', courseName: '', semesters: 6 })
  const [editingCourseId, setEditingCourseId] = useState('')

  // Semesters (auto-generated per course)
  const [semesters, setSemesters] = useState([]) // [{ id, courseCode, number }]
  const ensureSemesters = (courseCode, count) => {
    const rows = Array.from({ length: Number(count) }, (_, i) => ({ id: uid(), courseCode, number: i + 1 }))
    setSemesters(prev => [...prev.filter(s => s.courseCode !== courseCode), ...rows])
  }
  const saveCourse = async () => {
    const { groupCode, courseCode, courseName, semesters: semCount } = courseForm
    if (!groupCode || !courseCode || !courseName || !semCount) return
    const code = courseCode.toUpperCase()
    if (editingCourseId) {
      setCourses(courses.map(c => c.id === editingCourseId ? { ...c, groupCode, courseCode: code, courseName, semesters: Number(semCount) } : c))
      ensureSemesters(code, Number(semCount))
    } else {
      if (courses.some(c => c.courseCode === code)) return
      const newCourse = { id: uid(), groupCode, courseCode: code, courseName, semesters: Number(semCount) }
      setCourses([...courses, newCourse])
      ensureSemesters(newCourse.courseCode, newCourse.semesters)
      try { await api.addCourse({ code: newCourse.courseCode, name: newCourse.courseName, duration_years: Math.ceil(Number(semCount)/2), group_code: groupCode }) } catch {}
    }
    setCourseForm({ id: '', groupCode: '', courseCode: '', courseName: '', semesters: 6 }); setEditingCourseId('')
  }
  const editCourse = (c) => { setCourseForm(c); setEditingCourseId(c.id) }
  const deleteCourse = (id) => {
    const course = courses.find(c => c.id === id)
    setCourses(courses.filter(c => c.id !== id))
    if (course) setSemesters(semesters.filter(s => s.courseCode !== course.courseCode))
  }

  // Sub-categories and Languages
  const [categories, setCategories] = useState([])
  const [categoryName, setCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState('')
  const [catItems, setCatItems] = useState({})
  const [catCounts, setCatCounts] = useState({})
  const [tempCatInputs, setTempCatInputs] = useState({})
  const [viewCat, setViewCat] = useState('')
  const [isEditingView, setIsEditingView] = useState(false)
  const openViewCat = (cat) => {
    setViewCat(cat)
    setIsEditingView(false)
  }
  const closeViewCat = () => {
    setViewCat('')
    setIsEditingView(false)
  }
  const handleSubjectAmountChange = (cat, rawValue) => {
    setCatCounts(prev => ({ ...prev, [cat]: rawValue }))
    const count = Math.max(0, Number(rawValue) || 0)
    setTempCatInputs(prev => {
      const tempExisting = prev[cat] || []
      const next = Array.from({ length: count }, (_, idx) => tempExisting[idx] ?? '')
      return { ...prev, [cat]: next }
    })
  }
  const handleTempSubjectChange = (cat, idx, value) => {
    setTempCatInputs(prev => {
      const arr = [...(prev[cat] || [])]
      arr[idx] = value
      return { ...prev, [cat]: arr }
    })
  }
  const clearCategoryInputs = (cat) => {
    setTempCatInputs(prev => ({ ...prev, [cat]: [] }))
    setCatCounts(prev => ({ ...prev, [cat]: '' }))
  }
  const commitCategorySubjects = (cat) => {
    const names = (tempCatInputs[cat] || []).map(n => n.trim()).filter(Boolean)
    if (!names.length) return
    const newItems = names.map(name => ({ id: uid(), name }))
    setCatItems(prev => ({ ...prev, [cat]: [...(prev[cat] || []), ...newItems] }))
    clearCategoryInputs(cat)
  }
  const [feeCategories, setFeeCategories] = useState([])
  const [feeCategoryName, setFeeCategoryName] = useState('')
  const [editingFeeCategoryId, setEditingFeeCategoryId] = useState('')
  const [feeDrafts, setFeeDrafts] = useState({})
  useEffect(()=>{ (async()=>{ try {
    const ft = await api.getFeeTypes?.()
    if (ft) {
      const normalized = normalizeFeeCategories(ft)
      setFeeCategories(normalized)
    }
  } catch {} })() }, [])
  const saveFeeCategory = () => {
    const trimmed = feeCategoryName.trim()
    if (!trimmed) return
    const duplicate = feeCategories.some(cat => cat.name.trim().toLowerCase() === trimmed.toLowerCase() && cat.id !== editingFeeCategoryId)
    if (duplicate) return
    if (editingFeeCategoryId) {
      setFeeCategories(prev => prev.map(cat => cat.id === editingFeeCategoryId ? { ...cat, name: trimmed } : cat))
    } else {
      setFeeCategories(prev => [...prev, { id: uid(), name: trimmed, fees: [] }])
    }
    setFeeCategoryName('')
    setEditingFeeCategoryId('')
  }
  const editFeeCategory = (cat) => {
    setFeeCategoryName(cat.name)
    setEditingFeeCategoryId(cat.id)
  }
  const deleteFeeCategory = (id) => {
    setFeeCategories(prev => prev.filter(cat => cat.id !== id))
    setFeeDrafts(prev => deleteKey(prev, id))
    if (editingFeeCategoryId === id) {
      setFeeCategoryName('')
      setEditingFeeCategoryId('')
    }
  }
  const updateFeeDraft = (catId, field, value) => {
    setFeeDrafts(prev => ({ ...prev, [catId]: { ...prev[catId], [field]: value } }))
  }
  const addFeeLine = (catId) => {
    const draft = feeDrafts[catId] || { name: '', amount: '' }
    const trimmed = (draft.name || '').trim()
    if (!trimmed) return
    setFeeCategories(prev => prev.map(cat => {
      if (cat.id !== catId) return cat
      return {
        ...cat,
        fees: [...cat.fees, { id: uid(), name: trimmed, amount: draft.amount || '' }]
      }
    }))
    setFeeDrafts(prev => ({ ...prev, [catId]: { name: '', amount: '' } }))
  }
  const updateFeeLine = (catId, feeId, field, value) => {
    setFeeCategories(prev => prev.map(cat => {
      if (cat.id !== catId) return cat
      return {
        ...cat,
        fees: cat.fees.map(fee => fee.id === feeId ? { ...fee, [field]: value } : fee)
      }
    }))
  }
  const deleteFeeLine = (catId, feeId) => {
    setFeeCategories(prev => prev.map(cat => {
      if (cat.id !== catId) return cat
      return {
        ...cat,
        fees: cat.fees.filter(fee => fee.id !== feeId)
      }
    }))
  }
  const saveFeeCategories = async () => {
    const payload = feeCategories
      .map(cat => ({
        id: cat.id,
        name: cat.name.trim(),
        fees: cat.fees
          .map(fee => ({
            id: fee.id,
            name: fee.name.trim(),
            amount: Number(fee.amount || 0)
          }))
          .filter(fee => fee.name)
      }))
      .filter(cat => cat.name && cat.fees.length)
    try { await api.setFeeTypes?.(payload) } catch {}
    setFeeCategories(payload.map(cat => ({
      ...cat,
      fees: cat.fees.map(fee => ({ ...fee, amount: String(fee.amount) }))
    })))
  }
  const saveCategory = () => {
    const trimmed = categoryName.trim()
    if (!trimmed) return
    const duplicate = categories.some(c => c.toLowerCase() === trimmed.toLowerCase() && c !== editingCategory)
    if (duplicate) return
    if (editingCategory) {
      setCategories(categories.map(c => c === editingCategory ? trimmed : c))
      setCatItems(prev => renameKey(prev, editingCategory, trimmed, []))
      setCatCounts(prev => renameKey(prev, editingCategory, trimmed, ''))
      setTempCatInputs(prev => renameKey(prev, editingCategory, trimmed, []))
      setSubjects(prev => prev.map(s => s.category === editingCategory ? { ...s, category: trimmed } : s))
    if (viewCat === editingCategory) setViewCat(trimmed)
      if (subjectForm.category === editingCategory) {
        setSubjectForm(prev => ({ ...prev, category: trimmed }))
      }
    } else {
      setCategories([...categories, trimmed])
      setCatItems(prev => ({ ...prev, [trimmed]: [] }))
      setCatCounts(prev => ({ ...prev, [trimmed]: '' }))
      setTempCatInputs(prev => ({ ...prev, [trimmed]: [] }))
    }
    setCategoryName(''); setEditingCategory('')
  }
  const deleteCategory = (name) => {
    const remaining = categories.filter(c => c !== name)
    if (remaining.length === categories.length) return
    setCategories(remaining)
    setCatItems(prev => deleteKey(prev, name))
    setCatCounts(prev => deleteKey(prev, name))
    setTempCatInputs(prev => deleteKey(prev, name))
    setSubjects(prev => {
      const fallback = remaining[0] || ''
      return prev.reduce((acc, item) => {
        if (item.category !== name) {
          acc.push(item)
          return acc
        }
        if (fallback) acc.push({ ...item, category: fallback })
        return acc
      }, [])
    })
    if (subjectForm.category === name) {
      setSubjectForm(prev => ({ ...prev, category: remaining[0] || '' }))
    }
    if (viewCat === name) closeViewCat()
    if (editingCategory === name) {
      setCategoryName('')
      setEditingCategory('')
    }
  }

  // Languages (special under Language category)
  const [languages, setLanguages] = useState([]) // [{id, name}]
  const [langCount, setLangCount] = useState(0)
  const [langInputs, setLangInputs] = useState([])
  const prepareLangInputs = (n) => {
    const count = Math.max(0, Number(n)||0)
    setLangCount(count)
    setLangInputs(Array.from({ length: count }, (_, i) => langInputs[i] || ''))
  }
  const saveLanguages = () => {
    const newOnes = langInputs.filter(Boolean).map(name => ({ id: uid(), name }))
    if (newOnes.length) setLanguages([...languages, ...newOnes])
    setLangCount(0); setLangInputs([])
  }
  const editLanguage = (id, name) => setLanguages(languages.map(l => l.id === id ? { ...l, name } : l))
  const deleteLanguage = (id) => setLanguages(languages.filter(l => l.id !== id))

  // Subjects
  const [subjects, setSubjects] = useState([])
  const [subjectForm, setSubjectForm] = useState(() => buildSubjectForm(''))

  useEffect(() => {
    setSubjectForm(prev => {
      if (!categories.length) {
        return prev.category ? { ...prev, category: '' } : prev
      }
      if (categories.includes(prev.category)) return prev
      return { ...prev, category: categories[0] }
    })
  }, [categories])
  const [editingSubjectId, setEditingSubjectId] = useState('')

  const coursesForGroup = courses.filter(c => c.groupCode === subjectForm.groupCode)
  const semForCourse = (() => {
    const c = courses.find(x => x.courseCode === subjectForm.courseCode)
    if (c && semesters.filter(s => s.courseCode === c.courseCode).length === 0) {
      ensureSemesters(c.courseCode, c.semesters)
    }
    return semesters.filter(s => s.courseCode === subjectForm.courseCode)
  })()

  const saveSubject = () => {
    const { academicYearId, groupCode, courseCode, semester, category, subjectCode, subjectName, remark } = subjectForm
    if (!academicYearId || !groupCode || !courseCode || !semester || !category || !subjectCode || !subjectName) return
    if (editingSubjectId) {
      setSubjects(subjects.map(s => s.id === editingSubjectId ? { ...s, academicYearId, groupCode, courseCode, semester: Number(semester), category, subjectCode, subjectName, remark } : s))
    } else {
      setSubjects([...subjects, { id: uid(), academicYearId, groupCode, courseCode, semester: Number(semester), category, subjectCode, subjectName, remark }])
    }
    setSubjectForm(buildSubjectForm(categories[0] || ''))
    setEditingSubjectId('')
  }
  const editSubject = (rec) => { setSubjectForm({ ...rec, semester: rec.semester.toString() }); setEditingSubjectId(rec.id) }
  const deleteSubject = (id) => setSubjects(subjects.filter(s => s.id !== id))

  return (
    <AdminShell>
      <h2 className="fw-bold mb-3">Admin Setup</h2>

      {tab==='years' && (
        <section className="card card-soft p-3 mb-3">
          <h5 className="section-title">Academic Years</h5>
          <div className="row g-2">
            <div className="col-md-5"><input className="form-control" placeholder="e.g., 2022-2025" value={yearForm.name} onChange={e=>setYearForm({...yearForm, name:e.target.value})} /></div>
            <div className="col-md-3 d-flex align-items-center"><div className="form-check"><input className="form-check-input" type="checkbox" id="activeYear" checked={yearForm.active} onChange={e=>setYearForm({...yearForm, active:e.target.checked})} /><label className="form-check-label ms-2" htmlFor="activeYear">Active</label></div></div>
            <div className="col-md-4 text-end"><button className="btn btn-brand" onClick={addYear}>Add Year</button></div>
          </div>
          {academicYears.length>0 && (
            <div className="table-responsive mt-3"><table className="table mb-0"><thead><tr><th>Year</th><th>Status</th></tr></thead><tbody>{academicYears.map(y=> (<tr key={y.id}><td>{y.name}</td><td><span className="badge bg-success-subtle text-success">{y.active?'Active':'Inactive'}</span></td></tr>))}</tbody></table></div>
          )}
        </section>
      )}

      {tab==='groups' && (
        <>
          {/* Groups */}
          <section className="card card-soft p-3 mb-3">
            <h5 className="section-title">Groups</h5>
            <div className="row g-2">
              <div className="col-md-3"><input className="form-control" placeholder="Group Code" value={groupForm.code} onChange={e=>setGroupForm({...groupForm, code:e.target.value.toUpperCase()})} /></div>
              <div className="col-md-3"><input className="form-control" placeholder="Group Name" value={groupForm.name} onChange={e=>setGroupForm({...groupForm, name:e.target.value})} /></div>
              <div className="col-md-2"><input type="number" className="form-control" placeholder="Years" value={groupForm.years} onChange={e=>setGroupForm({...groupForm, years:e.target.value})} /></div>
              <div className="col-md-2"><input type="number" className="form-control" placeholder="No. of Semesters" value={groupForm.semesters} onChange={e=>setGroupForm({...groupForm, semesters:e.target.value})} /></div>
              <div className="col-md-2 text-end">
                <button className="btn btn-brand" onClick={saveGroup}>{editingGroupId? 'Update Group':'Add Group'}</button>
                {editingGroupId && <button className="btn btn-outline-secondary ms-2" onClick={()=>{setGroupForm({ id:'', code:'', name:'', years:0, semesters:0}); setEditingGroupId('')}}>Cancel</button>}
              </div>
            </div>
            {groups.length>0 && (
              <div className="table-responsive mt-3"><table className="table mb-0"><thead><tr><th>Code</th><th>Name</th><th>Years</th><th>Semesters</th><th>Actions</th></tr></thead><tbody>{groups.map(g=> (
                <tr key={g.id}><td>{g.code}</td><td>{g.name}</td><td>{g.years||'-'}</td><td>{g.semesters||'-'}</td><td>
                  <button className="btn btn-sm btn-outline-primary me-2" onClick={()=>editGroup(g)}>Edit</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={()=>deleteGroup(g.id)}>Delete</button>
                </td></tr>
              ))}</tbody></table></div>
            )}
          </section>

          {/* Courses */}
          <section className="card card-soft p-3 mb-3">
            <h5 className="section-title">Courses</h5>
            <div className="row g-2">
              <div className="col-md-3"><select className="form-select" value={courseForm.groupCode} onChange={e=>setCourseForm({...courseForm, groupCode:e.target.value})}><option value="">Group</option>{groups.map(g=> <option key={g.id} value={g.code}>{g.code}</option>)}</select></div>
              <div className="col-md-3"><input className="form-control" placeholder="Course Code" value={courseForm.courseCode} onChange={e=>setCourseForm({...courseForm, courseCode:e.target.value.toUpperCase()})} /></div>
              <div className="col-md-4"><input className="form-control" placeholder="Course Name" value={courseForm.courseName} onChange={e=>setCourseForm({...courseForm, courseName:e.target.value})} /></div>
              <div className="col-md-2"><input type="number" className="form-control" placeholder="No. of Semesters" min="1" value={courseForm.semesters} onChange={e=>setCourseForm({...courseForm, semesters:e.target.value})} /></div>
            </div>
            <div className="mt-2 text-end">
              <button className="btn btn-accent" onClick={saveCourse}>{editingCourseId? 'Update Course':'Add Course'}</button>
              {editingCourseId && <button className="btn btn-outline-secondary ms-2" onClick={()=>{setCourseForm({ id:'', groupCode:'', courseCode:'', courseName:'', semesters:6}); setEditingCourseId('')}}>Cancel</button>}
            </div>
            {courses.length>0 && (
              <div className="table-responsive mt-3"><table className="table mb-0"><thead><tr><th>Group</th><th>Code</th><th>Name</th><th>Semesters</th><th>Actions</th></tr></thead><tbody>{courses.map(c=> (
                <tr key={c.id}><td>{c.groupCode}</td><td>{c.courseCode}</td><td>{c.courseName}</td><td>{c.semesters}</td><td>
                  <button className="btn btn-sm btn-outline-primary me-2" onClick={()=>editCourse(c)}>Edit</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={()=>deleteCourse(c.id)}>Delete</button>
                </td></tr>
              ))}</tbody></table></div>
            )}
          </section>

          {/* Fee categories on Sub-categories page */}
          
        </>
      )}

      {tab==='subcats' && (
        <>
          {/* Subject Sub-categories (Count -> Inputs -> OK) */}
          <section className="card card-soft p-3 mb-3">
            <h5 className="section-title">Sub-categories</h5>
            <div className="row g-2 align-items-end mb-3">
              <div className="col-md-4">
                <label className="form-label text-muted fw-600">{editingCategory? 'Edit Sub-category':'Add a Sub-category'}</label>
                <input className="form-control" placeholder="e.g., English" value={categoryName} onChange={e=>setCategoryName(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); saveCategory() } }} />
              </div>
              <div className="col-md-2">
                <button type="button" className="btn btn-brand w-100" onClick={saveCategory}>{editingCategory? 'Update':'Add'}</button>
              </div>
              {editingCategory && (
                <div className="col-md-2">
                  <button type="button" className="btn btn-outline-secondary w-100" onClick={()=>{ setCategoryName(''); setEditingCategory('') }}>Cancel</button>
                </div>
              )}
            </div>

            {categories.length===0 && <div className="alert alert-info mb-0">Add a sub-category to begin creating subjects.</div>}
            {categories.map(cat => {
              const generatedInputs = tempCatInputs[cat] || []
              const subjectCount = (catItems[cat]||[]).length
              const existingSubjects = catItems[cat] || []
              const existingCount = existingSubjects.length
              const showSubjectInput = subjectCount===0 || editingCategory === cat
              return (
                <div key={cat} className="subcat-card mb-3 p-3 border rounded bg-white">
                  <div className="row g-2 align-items-end">
                    <div className="col-md-4">
                      <div className="fw-600">{cat}</div>
                      <div className="text-muted">{subjectCount} subject{subjectCount===1?'':'s'} configured</div>
                    </div>
                    {showSubjectInput && (
                      <div className="col-md-3">
                        <label className="form-label text-muted fw-600 mb-1">How many subjects to add?</label>
                        <input type="number" min="0" className="form-control" placeholder="e.g., 2" value={catCounts[cat] ?? ''} onChange={e=>handleSubjectAmountChange(cat, e.target.value)} />
                      </div>
                    )}
                  </div>
                  {showSubjectInput && subjectCount>0 && (
                    <div className="row g-2 mt-2">
                      <div className="col-12 text-muted fw-600 small">Existing subjects</div>
                      {existingSubjects.map(item => (
                        <div key={item.id} className="col-md-3">
                          <input
                            className="form-control"
                            value={item.name}
                            onChange={e=>setCatItems(prev=>({
                              ...prev,
                              [cat]: prev[cat].map(x=> x.id===item.id ? { ...x, name: e.target.value } : x)
                            }))}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {showSubjectInput && generatedInputs.length>0 && (
                    <div className="row g-2 mt-2">
                      {generatedInputs.map((val,idx)=> (
                        <div key={idx} className="col-md-3"><input className="form-control" placeholder={`Subject ${existingCount + idx + 1}`} value={val} onChange={e=>handleTempSubjectChange(cat, idx, e.target.value)} /></div>
                      ))}
                      <div className="col-12 text-end">
                        <button type="button" className="btn btn-brand me-2" onClick={()=>commitCategorySubjects(cat)}>Add Subjects</button>
                        <button type="button" className="btn btn-outline-secondary" onClick={()=>clearCategoryInputs(cat)}>Clear</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Summary table */}
            <div className="table-responsive mt-3">
              <table className="table mb-0">
                <thead><tr><th>Sub-category</th><th>Subjects</th><th className="text-end">Actions</th></tr></thead>
                <tbody>
                  {categories.length===0 ? (
                    <tr><td colSpan="3" className="text-center text-muted">No sub-categories yet.</td></tr>
                  ) : (
                    categories.map(cat => (
                      <tr key={cat}>
                        <td>{cat}</td>
                        <td>{(catItems[cat]||[]).length}</td>
                        <td className="text-end">
                          <button type="button" className="btn btn-outline-brand btn-sm me-2 btn-hover-lift" onClick={()=>openViewCat(cat)}>View</button>
                          <button type="button" className="btn btn-outline-primary btn-sm me-2 btn-hover-lift" onClick={()=>{ setCategoryName(cat); setEditingCategory(cat) }}>Edit</button>
                          <button type="button" className="btn btn-outline-danger btn-sm btn-hover-lift" onClick={()=>deleteCategory(cat)}>Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Drawer to view items */}
            {viewCat && (
              <div className="drawer-open">
                <div className="drawer-backdrop" onClick={closeViewCat}></div>
                <div className="drawer-panel" role="dialog" aria-modal="true">
                  <div className="drawer-header">
                    <div className="fw-600">Subjects in {viewCat}</div>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeViewCat}><i className="bi bi-x"></i></button>
                  </div>
                  <div className="drawer-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <div className="fw-600">{(catItems[viewCat]||[]).length} subject{(catItems[viewCat]||[]).length === 1 ? '' : 's'}</div>
                        <div className="text-muted small">Manage the subject list for {viewCat}</div>
                      </div>
                      {(catItems[viewCat]||[]).length>0 && (
                        <button type="button" className="btn btn-sm btn-brand btn-hover-lift" onClick={()=>setIsEditingView(prev=>!prev)}>
                          {isEditingView ? 'Done Editing' : 'Edit Subjects'}
                        </button>
                      )}
                    </div>
                    {(catItems[viewCat]||[]).length===0 ? (
                      <div className="text-muted">No subjects added yet.</div>
                    ) : (
                      <ul className="list-unstyled">
                        {catItems[viewCat].map((it, idx) => (
                          <li key={it.id} className="py-1">
                            {isEditingView ? (
                              <div className="d-flex align-items-center gap-2">
                                <input className="form-control" value={it.name} onChange={e=>setCatItems(prev=>({
                                  ...prev,
                                  [viewCat]: prev[viewCat].map(x=> x.id===it.id ? { ...x, name: e.target.value } : x)
                                }))} />
                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={()=>setCatItems(prev=>({
                                  ...prev,
                                  [viewCat]: prev[viewCat].filter(x=> x.id!==it.id)
                                }))}>Delete</button>
                              </div>
                            ) : (
                              <div className="drawer-list-row d-flex justify-content-between align-items-center border rounded px-3 py-2 bg-light">
                                <span className="fw-500">{it.name}</span>
                                <span className="text-muted small">{idx+1}</span>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="drawer-footer d-flex justify-content-end">
                    <button type="button" className="btn btn-outline-secondary" onClick={closeViewCat}>Close</button>
                  </div>
                </div>
              </div>
            )}
          </section>
          <section className="card card-soft p-3 mb-3">
            <h5 className="section-title">Fee Categories</h5>
            <div className="row g-2 align-items-end mb-3">
              <div className="col-md-5 col-lg-4">
                <label className="form-label text-muted fw-600">{editingFeeCategoryId ? 'Edit fee category' : 'Add a fee category'}</label>
                <input
                  className="form-control"
                  placeholder="e.g., Tuition"
                  value={feeCategoryName}
                  onChange={e=>setFeeCategoryName(e.target.value)}
                  onKeyDown={e=>{ if (e.key==='Enter'){ e.preventDefault(); saveFeeCategory() } }}
                />
              </div>
              <div className="col-md-3 col-lg-2">
                <button type="button" className="btn btn-brand w-100 mt-md-4" onClick={saveFeeCategory}>
                  {editingFeeCategoryId ? 'Update Category' : 'Add Category'}
                </button>
              </div>
              {editingFeeCategoryId && (
                <div className="col-md-3 col-lg-2">
                  <button type="button" className="btn btn-outline-secondary w-100 mt-md-4" onClick={()=>{ setFeeCategoryName(''); setEditingFeeCategoryId('') }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
            {feeCategories.length === 0 && (
              <div className="alert alert-info mb-0">No fee categories yet. Add one above to start adding fee sub-categories.</div>
            )}
            <div className="d-flex flex-column gap-3">
              {feeCategories.map(cat => {
                const draft = feeDrafts[cat.id] || { name: '', amount: '' }
                return (
                  <div key={cat.id} className="border rounded p-3">
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                      <div>
                        <div className="fw-600">{cat.name}</div>
                        <div className="text-muted small">{cat.fees.length ? `${cat.fees.length} ${cat.fees.length === 1 ? 'sub-category' : 'sub-categories'}` : 'No sub-categories yet'}</div>
                      </div>
                      <div className="d-flex gap-2">
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={()=>editFeeCategory(cat)}>Rename</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={()=>deleteFeeCategory(cat.id)}>Delete</button>
                      </div>
                    </div>
                    {cat.fees.length > 0 && (
                      <div className="d-flex flex-column gap-2 mb-3">
                        {cat.fees.map(fee => (
                          <div key={fee.id} className="row g-2 align-items-end">
                            <div className="col-md-5 col-lg-4">
                              <label className="form-label text-muted fw-600 mb-1">Fee name</label>
                              <input className="form-control" value={fee.name} onChange={e=>updateFeeLine(cat.id, fee.id, 'name', e.target.value)} />
                            </div>
                            <div className="col-md-3 col-lg-2">
                              <label className="form-label text-muted fw-600 mb-1">Amount</label>
                              <input type="number" className="form-control" value={fee.amount} onChange={e=>updateFeeLine(cat.id, fee.id, 'amount', e.target.value)} />
                            </div>
                            <div className="col-md-3 col-lg-2">
                              <button type="button" className="btn btn-outline-danger mt-md-4 w-100" onClick={()=>deleteFeeLine(cat.id, fee.id)}>Remove</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="row g-2 align-items-end border-top pt-3 mt-2">
                      <div className="col-md-5 col-lg-4">
                        <label className="form-label text-muted fw-600">Fee name</label>
                        <input className="form-control" placeholder="Sub-category name" value={draft.name || ''} onChange={e=>updateFeeDraft(cat.id, 'name', e.target.value)} />
                      </div>
                      <div className="col-md-3 col-lg-2">
                        <label className="form-label text-muted fw-600">Amount</label>
                        <input type="number" className="form-control" placeholder="0" value={draft.amount || ''} onChange={e=>updateFeeDraft(cat.id, 'amount', e.target.value)} />
                      </div>
                      <div className="col-md-3 col-lg-2">
                        <button type="button" className="btn btn-outline-brand w-100 mt-md-4" onClick={()=>addFeeLine(cat.id)}>Add Sub-category</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="text-end mt-3">
              <button type="button" className="btn btn-brand" disabled={!feeCategories.some(cat=>cat.fees.length)} onClick={saveFeeCategories}>Save All</button>
            </div>
          </section>
        </>
      )}

      {tab==='subjects' && (
        <>
          {/* Subjects */}
          <section className="card card-soft p-3 mb-3">
            <h5 className="section-title">Subjects</h5>
            <div className="row g-2">
              <div className="col-md-3"><select className="form-select" value={subjectForm.academicYearId} onChange={e=>setSubjectForm({...subjectForm, academicYearId:e.target.value})}><option value="">Academic Year</option>{academicYears.map(y=> <option key={y.id} value={y.id}>{y.name}</option>)}</select></div>
              <div className="col-md-3"><select className="form-select" value={subjectForm.groupCode} onChange={e=>setSubjectForm({...subjectForm, groupCode:e.target.value, courseCode:'', semester:''})}><option value="">Group</option>{groups.map(g=> <option key={g.id} value={g.code}>{g.code}</option>)}</select></div>
              <div className="col-md-3"><select className="form-select" value={subjectForm.courseCode} onChange={e=>setSubjectForm({...subjectForm, courseCode:e.target.value, semester:''})}><option value="">Course</option>{coursesForGroup.map(c=> <option key={c.id} value={c.courseCode}>{c.courseCode} - {c.courseName}</option>)}</select></div>
              <div className="col-md-3">
                <div className="d-flex flex-wrap gap-2">
                  {semForCourse.map(s => (
                    <button type="button" key={s.id} className={`btn ${subjectForm.semester==s.number? 'btn-brand':'btn-outline-brand'}`} onClick={()=>setSubjectForm({...subjectForm, semester:s.number})}>Semester {s.number}</button>
                  ))}
                </div>
              </div>
              <div className="col-md-3"><select className="form-select" value={subjectForm.category} onChange={e=>setSubjectForm({...subjectForm, category:e.target.value})}>{categories.map(o=> <option key={o} value={o}>{o}</option>)}</select></div>
              <div className="col-md-3"><input className="form-control" placeholder="Subject Code" value={subjectForm.subjectCode} onChange={e=>setSubjectForm({...subjectForm, subjectCode:e.target.value})} /></div>
              <div className="col-md-4"><input className="form-control" placeholder="Subject Name" value={subjectForm.subjectName} onChange={e=>setSubjectForm({...subjectForm, subjectName:e.target.value})} /></div>
              <div className="col-md-2"><input className="form-control" placeholder="Short Message (remark)" value={subjectForm.remark} onChange={e=>setSubjectForm({...subjectForm, remark:e.target.value})} /></div>
            </div>
            <div className="mt-2 text-end"><button className="btn btn-accent" onClick={saveSubject}>{editingSubjectId? 'Update Subject':'Add Subject'}</button>{editingSubjectId && <button className="btn btn-outline-secondary ms-2" onClick={()=>{setEditingSubjectId(''); setSubjectForm(buildSubjectForm(categories[0] || ''))}}>Cancel</button>}</div>
            {subjects.length>0 && (
              <div className="table-responsive mt-3">
                <table className="table mb-0">
                  <thead><tr><th>Year</th><th>Group</th><th>Course</th><th>Sem</th><th>Category</th><th>Subject Code</th><th>Subject Name</th><th>Remark</th><th>Actions</th></tr></thead>
                  <tbody>
                    {subjects.map(s=> (
                      <tr key={s.id}>
                        <td>{academicYears.find(y=>y.id===s.academicYearId)?.name}</td>
                        <td>{s.groupCode}</td>
                        <td>{s.courseCode}</td>
                        <td>{s.semester}</td>
                        <td>{s.category}</td>
                        <td>{s.subjectCode}</td>
                        <td>{s.subjectName}</td>
                        <td>{s.remark}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary me-2" onClick={()=>editSubject(s)}>Edit</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={()=>deleteSubject(s.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Grouped preview by Category (filters applied) */}
            {subjects.length>0 && (
              <div className="card card-soft p-3 mt-3">
                <h6 className="section-title">By Category (Preview)</h6>
                <div className="row g-3">
                  {categories.map(cat => {
                    const items = subjects.filter(s =>
                      (!subjectForm.academicYearId || s.academicYearId === subjectForm.academicYearId) &&
                      (!subjectForm.groupCode || s.groupCode === subjectForm.groupCode) &&
                      (!subjectForm.courseCode || s.courseCode === subjectForm.courseCode) &&
                      (!subjectForm.semester || s.semester === Number(subjectForm.semester)) &&
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
                                <span>{it.subjectCode} — {it.subjectName}</span>
                                <span className="small text-muted">Sem {it.semester}</span>
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
        </>
      )}
    </AdminShell>
  )
}
