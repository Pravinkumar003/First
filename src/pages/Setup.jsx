import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
const TAB_CONFIG = [
  { key: 'years', label: 'Academic Years', tagline: 'Define academic timelines and activation status.' },
  { key: 'groups', label: 'Groups & Courses', tagline: 'Manage programme structures and duration.' },
  { key: 'subcats', label: 'Sub-categories', tagline: 'Organise subjects and fee classifications.' },
  { key: 'subjects', label: 'Subjects', tagline: 'Control curriculum details semester by semester.' }
]

const normalizeFeeCategories = (data) => {
  if (!Array.isArray(data)) return []
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
  return data
    .map(item => {
      const feeName = (item?.name || '').toString()
      if (!feeName.trim()) return null
      return {
        id: item?.id || uid(),
        name: feeName,
        fees: [{
          id: uid(),
          name: `${feeName} Fee`,
          amount: item?.amount === 0 || item?.amount ? String(item.amount) : ''
        }]
      }
    })
    .filter(Boolean)
}

export default function Setup() {
  // Route-driven tab from sidebar
  const { tab: tabParam } = useParams()
  const tab = (['years','groups','subcats','subjects'].includes(tabParam)) ? tabParam : 'years'

  // Academic Years (shared)
  const [yearForm, setYearForm] = useState({ name: '', active: true })
  const [academicYears, setAcademicYears] = useState([])
  const [editingYearId, setEditingYearId] = useState('')
  const addYear = async () => {
    if (!yearForm.name) return
    if (editingYearId) {
      setAcademicYears(prev => prev.map(y => y.id === editingYearId ? { ...y, name: yearForm.name, active: yearForm.active } : y))
      setEditingYearId('')
    } else {
      const rec = { id: uid(), name: yearForm.name, active: yearForm.active }
      setAcademicYears(prev => [...prev, rec])
      try { await api.addAcademicYear({ name: yearForm.name, active: yearForm.active }) } catch {}
    }
    setYearForm({ name: '', active: true })
  }
  const editYear = (year) => {
    setYearForm({ name: year.name, active: year.active })
    setEditingYearId(year.id)
  }
  const deleteYear = (id) => {
    setAcademicYears(prev => prev.filter(y => y.id !== id))
    if (editingYearId === id) {
      setYearForm({ name: '', active: true })
      setEditingYearId('')
    }
  }

  // Groups
  const [groups, setGroups] = useState([])
  const [groupForm, setGroupForm] = useState({ id: '', code: '', name: '', years: 0, semesters: 0 })
  const [editingGroupId, setEditingGroupId] = useState('')
  const saveGroup = async () => {
    if (!groupForm.code || !groupForm.name) return;
    const code = groupForm.code.toUpperCase();
    
    if (editingGroupId) {
      const updatedGroups = groups.map(g => 
        g.id === editingGroupId 
          ? { ...g, code, name: groupForm.name, years: Number(groupForm.years)||0, semesters: Number(groupForm.semesters)||0 } 
          : g
      );
      setGroups(updatedGroups);
      try { 
        await api.updateGroup?.(editingGroupId, { 
          code, 
          name: groupForm.name,
          years: Number(groupForm.years)||0,
          semesters: Number(groupForm.semesters)||0
        }); 
      } catch (error) {
        console.error('Error updating group:', error);
      }
    } else {
      if (groups.some(g => g.code === code)) return;
      const newGroup = { 
        id: uid(), 
        code, 
        name: groupForm.name, 
        years: Number(groupForm.years)||0, 
        semesters: Number(groupForm.semesters)||0 
      };
      setGroups(prev => [...prev, newGroup]);
      try { 
        await api.addGroup({ 
          code: newGroup.code, 
          name: newGroup.name,
          years: newGroup.years,
          semesters: newGroup.semesters
        }); 
      } catch (error) {
        console.error('Error adding group:', error);
      }
    }
    setGroupForm({ id: '', code: '', name: '', years: 0, semesters: 0 }); 
    setEditingGroupId('');
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
    const { groupCode, courseCode, courseName, semesters: semCount } = courseForm;
    if (!groupCode || !courseCode || !courseName || !semCount) return;
    const code = courseCode.toUpperCase();
    
    if (editingCourseId) {
      setCourses(courses.map(c => 
        c.id === editingCourseId 
          ? { ...c, groupCode, courseCode: code, courseName, semesters: Number(semCount) } 
          : c
      ));
      ensureSemesters(code, Number(semCount));
      try { 
        await api.updateCourse?.(editingCourseId, { 
          code, 
          name: courseName, 
          group_code: groupCode,
          duration_years: Math.ceil(Number(semCount)/2)
        }); 
      } catch (error) {
        console.error('Error updating course:', error);
      }
    } else {
      if (courses.some(c => c.courseCode === code)) return;
      const newCourse = { 
        id: uid(), 
        groupCode, 
        courseCode: code, 
        courseName, 
        semesters: Number(semCount) || 0 
      };
      setCourses(prev => [...prev, newCourse]);
      ensureSemesters(code, Number(semCount));
      try { 
        await api.addCourse({ 
          code: newCourse.courseCode, 
          name: newCourse.courseName, 
          group_code: groupCode,
          duration_years: Math.ceil(Number(semCount)/2) 
        }); 
      } catch (error) {
        console.error('Error adding course:', error);
      }
    }
    setCourseForm({ id: '', groupCode: '', courseCode: '', courseName: '', semesters: 6 }); 
    setEditingCourseId('');
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
  const addFeeLine = () => {}
  const updateFeeLine = () => {}
  const deleteFeeLine = () => {}
  const saveFeeCategories = async () => {
    const payload = feeCategories
      .map(cat => ({
        id: cat.id,
        name: cat.name.trim(),
        fees: []
      }))
      .filter(cat => cat.name)
    try { await api.setFeeTypes?.(payload) } catch {}
    setFeeCategories(payload)
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

  const neutralCardStyle = {
    borderRadius: '18px',
    border: '1px solid #e2e8f0',
    background: 'linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%)',
    boxShadow: '0 18px 35px rgba(15,23,42,0.08)'
  }
  const coolCardStyle = {
    borderRadius: '18px',
    border: '1px solid #e1e7ef',
    background: 'linear-gradient(180deg, #ffffff 0%, #f3f6fb 100%)',
    boxShadow: '0 16px 32px rgba(15,23,42,0.07)'
  }
  const accentBadgeStyle = {
    backgroundColor: '#ecf0ff',
    color: '#1d3ecf',
    fontWeight: 600,
    borderRadius: '999px',
    padding: '0.35rem 0.9rem'
  }
  const courseBadgeStyle = {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
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
  const currentTabMeta = TAB_CONFIG.find(cfg => cfg.key === tab) || TAB_CONFIG[0]
  const heroStats = [
    { label: 'Academic Years', value: academicYears.length || 0, meta: 'records' },
    { label: 'Groups', value: groups.length || 0, meta: 'active' },
    { label: 'Courses', value: courses.length || 0, meta: 'listed' },
    { label: 'Subjects', value: subjects.length || 0, meta: 'published' }
  ]

  return (
    <AdminShell>
      <div className="desktop-container">
        <h2 className="fw-bold mb-3">Admin Setup</h2>
        <section className="setup-hero mb-4">
          <div className="setup-hero-grid">
            <div className="setup-hero-copywrap">
              <p className="setup-hero-eyebrow text-uppercase mb-2">Administration · Setup Console</p>
              <h3 className="setup-hero-title mb-2">{currentTabMeta.label}</h3>
              <p className="setup-hero-copy mb-3">{currentTabMeta.tagline}</p>
              <div className="setup-hero-chips d-flex flex-wrap gap-2">
                <span className="setup-hero-chip">Smart Examination Platform</span>
                <span className="setup-hero-chip">Hall Ticket Management</span>
              </div>
            </div>
            <div className="setup-stat-grid">
              {heroStats.map(stat => (
                <div key={stat.label} className="setup-stat-card">
                  <div className="setup-stat-label">{stat.label}</div>
                  <div className="setup-stat-value">{stat.value}</div>
                  <div className="setup-stat-meta">{stat.meta}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

      <nav className="setup-tab-nav d-flex flex-wrap gap-2 mb-4">
        {TAB_CONFIG.map(cfg => (
          <Link
            key={cfg.key}
            to={`/admin/setup/${cfg.key}`}
            className={`setup-tab-pill ${tab === cfg.key ? 'active' : ''}`}
          >
            <div className="setup-pill-label">{cfg.label}</div>
            <div className="setup-pill-meta">{cfg.tagline}</div>
          </Link>
        ))}
      </nav>

      {tab==='years' && (
        <section className="setup-section mb-4">
          <h5 className="section-title">Academic Years</h5>
          <div className="row g-2">
            <div className="col-md-5"><input className="form-control" placeholder="e.g., 2022-2025" value={yearForm.name} onChange={e=>setYearForm({...yearForm, name:e.target.value})} /></div>
            <div className="col-md-3 d-flex align-items-center"><div className="form-check"><input className="form-check-input" type="checkbox" id="activeYear" checked={yearForm.active} onChange={e=>setYearForm({...yearForm, active:e.target.checked})} /><label className="form-check-label ms-2" htmlFor="activeYear">Active</label></div></div>
            <div className="col-md-4 text-end">
              <button className="btn btn-brand me-2" onClick={addYear}>{editingYearId ? 'Update Year' : 'Add Year'}</button>
              {editingYearId && <button className="btn btn-outline-secondary" onClick={()=>{setYearForm({ name:'', active:true }); setEditingYearId('')}}>Cancel</button>}
            </div>
          </div>
          {academicYears.length>0 && (
            <div className="setup-list mt-3">
              {academicYears.map(y=> (
                <div className="setup-list-item" key={y.id}>
                  <div>
                    <div className="setup-list-title">{y.name}</div>
                    <div className="setup-list-meta">Created</div>
                  </div>
                  <div className="d-flex gap-2 align-items-center">
                    <span className={`status-pill ${y.active ? 'status-pill--active' : 'status-pill--inactive'}`}>
                      {y.active ? 'Active' : 'Inactive'}
                    </span>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={()=>editYear(y)}>Edit</button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={()=>deleteYear(y.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab==='groups' && (
        <>
          {/* Groups */}
          <section className="setup-section mb-4">
            <h5 className="section-title">Groups</h5>
            <div className="row">
              <div className="col-12">
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label fw-bold mb-1">Group Name</label>
                    <input className="form-control" placeholder="Group Name" value={groupForm.name} onChange={e=>setGroupForm({...groupForm, name:e.target.value})} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold mb-1">Group Code</label>
                    <input className="form-control" placeholder="Group Code" value={groupForm.code} onChange={e=>setGroupForm({...groupForm, code:e.target.value.toUpperCase()})} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold mb-1">Duration (years)</label>
                    <input 
                      type="number" 
                      className="form-control no-spinner" 
                      placeholder="Years" 
                      value={groupForm.years} 
                      onChange={e=>setGroupForm({...groupForm, years:e.target.value})} 
                      style={{'-moz-appearance': 'textfield'}}
                      onWheel={(e) => e.target.blur()}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold mb-1">Number of semesters</label>
                    <input 
                      type="number" 
                      className="form-control no-spinner" 
                      placeholder="No. of Semesters" 
                      value={groupForm.semesters} 
                      onChange={e=>setGroupForm({...groupForm, semesters:e.target.value})} 
                      style={{'-moz-appearance': 'textfield'}}
                      onWheel={(e) => e.target.blur()}
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
                      onClick={()=>{
                        setGroupForm({ id:'', code:'', name:'', years:0, semesters:0}); 
                        setEditingGroupId('')
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
            {groups.length>0 && (
              <div className="mt-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-muted text-uppercase fw-semibold small" style={{ letterSpacing: '0.08em' }}>Showing {groups.length} group{groups.length===1?'':'s'}</span>
                </div>
                <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
                  {groups.map(g=> (
                    <div className="col" key={g.id}>
                      <div className="card border-0 h-100" style={neutralCardStyle}>
                        <div className="card-body d-flex flex-column">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <div className="text-uppercase text-muted small mb-1">Group Code</div>
                              <div className="fs-5 fw-bold">{g.code || '-'}</div>
                            </div>
                            <span style={accentBadgeStyle}>{g.years || 0} yrs</span>
                          </div>
                          <p className="mb-3 text-muted fw-semibold">{g.name}</p>
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
                            <button
                              type="button"
                              className="btn btn-sm flex-fill"
                              style={pillButtonStyle}
                              onClick={()=>editGroup(g)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm flex-fill"
                              style={{ ...pillButtonStyle, color: '#b91c1c', borderColor: '#fde2e1', backgroundColor: '#fff5f5' }}
                              onClick={()=>deleteGroup(g.id)}
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

          {/* Courses */}
          <section className="setup-section mb-4">
            <h5 className="section-title">Courses</h5>
            <div className="row">
              <div className="col-md-8">
                <div className="row g-2">
                  <div className="col-md-4">
                    <label className="form-label fw-bold mb-1">Select Group</label>
                    <select 
                      className="form-select" 
                      value={courseForm.groupCode} 
                      onChange={e=>setCourseForm({...courseForm, groupCode:e.target.value})}
                    >
                      <option value="">Select Group</option>
                      {groups.map(g=> (
                        <option key={g.id} value={g.code}>{g.code}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold mb-1">Course Name</label>
                    <input 
                      className="form-control" 
                      placeholder="Enter Course Name" 
                      value={courseForm.courseName} 
                      onChange={e=>setCourseForm({...courseForm, courseName:e.target.value})} 
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold mb-1">Course Code</label>
                    <input 
                      className="form-control" 
                      placeholder="Enter Course Code" 
                      value={courseForm.courseCode} 
                      onChange={e=>setCourseForm({...courseForm, courseCode:e.target.value.toUpperCase()})} 
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <button 
                    className="btn btn-brand me-2" 
                    onClick={saveCourse}
                  >
                    {editingCourseId ? 'Update Course' : 'Add Course'}
                  </button>
                  {editingCourseId && (
                    <button 
                      className="btn btn-outline-secondary" 
                      onClick={()=>{
                        setCourseForm({ id:'', groupCode:'', courseCode:'', courseName:'', semesters:6}); 
                        setEditingCourseId('')
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
            {courses.length>0 && (
              <div className="mt-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-muted text-uppercase fw-semibold small" style={{ letterSpacing: '0.08em' }}>Showing {courses.length} course{courses.length===1?'':'s'}</span>
                </div>
                <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
                  {courses.map(c=> (
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
                            <button
                              type="button"
                              className="btn btn-sm flex-fill"
                              style={pillButtonStyle}
                              onClick={()=>editCourse(c)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm flex-fill"
                              style={{ ...pillButtonStyle, color: '#b91c1c', borderColor: '#fde2e1', backgroundColor: '#fff5f5' }}
                              onClick={()=>deleteCourse(c.id)}
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

          {/* Fee categories on Sub-categories page */}
          
        </>
      )}

      {tab==='subcats' && (
        <>
          {/* Subject Sub-categories */}
          <section className="setup-section mb-4">
            <h5 className="section-title">Sub-categories</h5>
            <div className="subcat-input-panel">
              <div className="flex-grow-1">
                <p className="text-uppercase text-muted small mb-1">{editingCategory? 'Update existing sub-category' : 'Add a new sub-category'}</p>
                <div className="d-flex gap-2 flex-wrap">
                  <input className="form-control flex-grow-1" placeholder="e.g., English" value={categoryName} onChange={e=>setCategoryName(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); saveCategory() } }} />
                  <button type="button" className="btn btn-brand" onClick={saveCategory}>{editingCategory? 'Update':'Add'}</button>
                  {editingCategory && (
                    <button type="button" className="btn btn-outline-secondary" onClick={()=>{ setCategoryName(''); setEditingCategory('') }}>Cancel</button>
                  )}
                </div>
              </div>
              <div className="subcat-input-copy text-muted">
                <div className="fw-semibold text-dark">Organise subjects into sub-categories</div>
                <div className="small">Create descriptive buckets (e.g., Languages, Labs) to streamline subject assignment.</div>
              </div>
            </div>

            {categories.length===0 && <div className="alert alert-info mb-0">Add a sub-category to begin creating subjects.</div>}
            <div className="subcat-grid">
              {categories.map(cat => {
                const generatedInputs = tempCatInputs[cat] || []
                const subjectCount = (catItems[cat]||[]).length
                const existingSubjects = catItems[cat] || []
                const existingCount = existingSubjects.length
                const showSubjectInput = subjectCount===0 || editingCategory === cat
                return (
                  <div key={cat} className="subcat-panel">
                    <div className="subcat-panel-header">
                      <div>
                        <div className="subcat-panel-title">{cat}</div>
                        <div className="subcat-panel-meta">{subjectCount} subject{subjectCount===1?'':'s'} configured</div>
                      </div>
                      <div className="subcat-panel-actions">
                        <button type="button" className="btn btn-sm btn-outline-brand" onClick={()=>openViewCat(cat)}>View list</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={()=>{ setCategoryName(cat); setEditingCategory(cat) }}>Rename</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={()=>deleteCategory(cat)}>Delete</button>
                      </div>
                    </div>
                    {showSubjectInput && (
                      <div className="row g-3 mt-2">
                        <div className="col-md-4">
                          <label className="form-label text-muted fw-600 mb-1">Generate subjects</label>
                          <input type="number" min="0" className="form-control" placeholder="Count" value={catCounts[cat] ?? ''} onChange={e=>handleSubjectAmountChange(cat, e.target.value)} />
                        </div>
                        {subjectCount>0 && (
                          <div className="col-md-8 d-flex align-items-center">
                            <span className="text-muted small">Edit the existing subjects inline.</span>
                          </div>
                        )}
                      </div>
                    )}
                    {showSubjectInput && subjectCount>0 && (
                      <div className="row g-2 mt-3">
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
                      <div className="row g-2 mt-3">
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
            </div>

            {/* Drawer to view items */}
            {viewCat && (
              <div className="drawer-open">
                <div className="drawer-backdrop" onClick={closeViewCat}></div>
                <div className="drawer-panel" role="dialog" aria-modal="true">
                  <div className="drawer-header align-items-start">
                    <div>
                      <div className="drawer-eyebrow text-uppercase">Sub-category</div>
                      <div className="drawer-title">Subjects in {viewCat}</div>
                      <div className="drawer-meta">{(catItems[viewCat]||[]).length} subject{(catItems[viewCat]||[]).length === 1 ? '' : 's'} configured</div>
                    </div>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeViewCat}><i className="bi bi-x"></i></button>
                  </div>
                  <div className="drawer-body">
                    {(catItems[viewCat]||[]).length>0 && (
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="drawer-helper-text">Manage the subject list for {viewCat}</div>
                        <button type="button" className="btn btn-sm btn-brand btn-hover-lift" onClick={()=>setIsEditingView(prev=>!prev)}>
                          {isEditingView ? 'Done Editing' : 'Edit Subjects'}
                        </button>
                      </div>
                    )}
                    {(catItems[viewCat]||[]).length===0 ? (
                      <div className="text-muted">No subjects added yet.</div>
                    ) : (
                      <div className="subject-tiles">
                        {catItems[viewCat].map((it, idx) => (
                          <div key={it.id} className="subject-tile">
                            <div className="subject-index">{(idx+1).toString().padStart(2,'0')}</div>
                            {isEditingView ? (
                              <div className="d-flex gap-2 w-100">
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
                              <div className="subject-name">{it.name}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="drawer-footer d-flex justify-content-end">
                    <button type="button" className="btn btn-outline-secondary" onClick={closeViewCat}>Close</button>
                  </div>
                </div>
              </div>
            )}
          </section>
          <section className="setup-section mb-4">
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
            <div className="fee-grid">
              {feeCategories.map(cat => (
                <div key={cat.id} className="fee-panel">
                  <div className="d-flex justify-content-between flex-wrap gap-2 mb-3">
                    <div>
                      <div className="fee-panel-title">{cat.name}</div>
                      <div className="fee-panel-meta">Configured category</div>
                    </div>
                    <div className="d-flex gap-2">
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={()=>editFeeCategory(cat)}>Rename</button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={()=>deleteFeeCategory(cat.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {tab==='subjects' && (
        <>
          {/* Subjects */}
          <section className="setup-section mb-4">
            <h5 className="section-title">Subjects</h5>
            <div className="row g-2 justify-content-center">
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
      </div>
    </AdminShell>
  )
}
