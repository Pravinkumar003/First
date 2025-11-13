import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AdminShell from '../components/AdminShell'
import { api } from '../lib/mockApi'
import AcademicYearsSection from './AcademicYears'
import GroupsCoursesSection from './GroupsCourses'
import SubCategoriesSection from './SubCategories'
import SubjectsSection from './Subjects'

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
  subjectName: '',
  subjectSelections: [],
  feeCategory: '',
  feeAmount: ''
})
const TAB_CONFIG = [
  { key: 'years', label: 'Academic Years', tagline: 'Define academic timelines and activation status.' },
  { key: 'groups', label: 'Groups & Courses', tagline: 'Manage programme structures and duration.' },
  { key: 'subcats', label: 'Sub-categories', tagline: 'Organise subjects and fee classifications.' },
  { key: 'subjects', label: 'Subjects', tagline: 'Control curriculum details semester by semester.' }
]

const PLACEHOLDER_FEE_NAMES = new Set(['Academic','Exam','Library','Bus','Lab'])
const stripPlaceholders = (list) => {
  if (!list || !list.length) return list
  const looksLikePlaceholder = list.every(cat => PLACEHOLDER_FEE_NAMES.has(cat.name) && (cat.fees?.length || 0) <= 1)
  return looksLikePlaceholder ? [] : list
}
const normalizeFeeCategories = (data) => {
  if (!Array.isArray(data)) return []
  const hasNestedFees = data.some(item => Array.isArray(item?.fees) || Array.isArray(item?.items))
  if (hasNestedFees) {
    return stripPlaceholders(
      data
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
    )
  }
  return stripPlaceholders(
    data
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
  )
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
  const cancelYearEdit = () => {
    setYearForm({ name: '', active: true })
    setEditingYearId('')
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
  const [pendingSubjects, setPendingSubjects] = useState([])
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
    const { academicYearId, groupCode, courseCode, semester, category, subjectName, subjectSelections = [], feeCategory, feeAmount } = subjectForm
    const selectedNames = Array.isArray(subjectSelections) ? subjectSelections : []
    const hasSelection = selectedNames.length > 0
    const typedName = subjectName ? subjectName.trim() : ''
    if (!academicYearId || !groupCode || !courseCode || !semester || !category) return
    if (!hasSelection && !typedName) return
    const names = hasSelection ? selectedNames : [typedName]
    const entries = names.map((name, idx) => ({
      id: editingSubjectId && idx === 0 ? editingSubjectId : uid(),
      academicYearId,
      groupCode,
      courseCode,
      semester: Number(semester),
      category,
      subjectCode: name,
      subjectName: name,
      feeCategory,
      feeAmount: feeAmount ? Number(feeAmount) : ''
    }))
    if (editingSubjectId) {
      setPendingSubjects(prev => [...prev.filter(s => s.id !== editingSubjectId), ...entries])
      setEditingSubjectId('')
    } else {
      setPendingSubjects(prev => [...prev, ...entries])
    }
    setSubjectForm(prev => ({
      ...prev,
      subjectName: '',
      subjectSelections: [],
      feeCategory: '',
      feeAmount: ''
    }))
  }
  const submitPendingSubjects = () => {
    if (!pendingSubjects.length) return
    setSubjects(prev => [...prev, ...pendingSubjects])
    setPendingSubjects([])
  }
  const editPendingSubject = (rec) => {
    setPendingSubjects(prev => prev.filter(s => s.id !== rec.id))
    const options = catItems[rec.category] || []
    const isPreset = options.some(item => item.name === rec.subjectName)
    setSubjectForm({
      ...rec,
      semester: rec.semester.toString(),
      feeCategory: rec.feeCategory || '',
      feeAmount: rec.feeAmount?.toString() || '',
      subjectName: isPreset ? '' : rec.subjectName,
      subjectSelections: isPreset ? [rec.subjectName] : []
    })
    setEditingSubjectId(rec.id)
  }
  const editSubject = (rec) => {
    setSubjects(prev => prev.filter(s => s.id !== rec.id))
    editPendingSubject(rec)
  }
  const deletePendingSubject = (id) => {
    setPendingSubjects(prev => prev.filter(s => s.id !== id))
    if (editingSubjectId === id) {
      setSubjectForm(buildSubjectForm(categories[0] || ''))
      setEditingSubjectId('')
    }
  }
  const deleteSubject = (id) => setSubjects(subjects.filter(s => s.id !== id))
  const cancelSubjectEdit = () => {
    setEditingSubjectId('')
    setSubjectForm(buildSubjectForm(categories[0] || ''))
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

      {tab === 'years' && (
        <AcademicYearsSection
          yearForm={yearForm}
          setYearForm={setYearForm}
          academicYears={academicYears}
          editingYearId={editingYearId}
          addYear={addYear}
          editYear={editYear}
          deleteYear={deleteYear}
          onCancelEdit={cancelYearEdit}
        />
      )}

      {tab === 'groups' && (
        <GroupsCoursesSection
          groupForm={groupForm}
          setGroupForm={setGroupForm}
          editingGroupId={editingGroupId}
          setEditingGroupId={setEditingGroupId}
          groups={groups}
          saveGroup={saveGroup}
          editGroup={editGroup}
          deleteGroup={deleteGroup}
          courseForm={courseForm}
          setCourseForm={setCourseForm}
          editingCourseId={editingCourseId}
          setEditingCourseId={setEditingCourseId}
          courses={courses}
          saveCourse={saveCourse}
          editCourse={editCourse}
          deleteCourse={deleteCourse}
        />
      )}

      {tab === 'subcats' && (
        <SubCategoriesSection
          categories={categories}
          categoryName={categoryName}
          setCategoryName={setCategoryName}
          editingCategory={editingCategory}
          setEditingCategory={setEditingCategory}
          catItems={catItems}
          catCounts={catCounts}
          tempCatInputs={tempCatInputs}
          viewCat={viewCat}
          isEditingView={isEditingView}
          openViewCat={openViewCat}
          closeViewCat={closeViewCat}
          handleSubjectAmountChange={handleSubjectAmountChange}
          handleTempSubjectChange={handleTempSubjectChange}
          clearCategoryInputs={clearCategoryInputs}
          commitCategorySubjects={commitCategorySubjects}
          setCatItems={setCatItems}
          deleteCategory={deleteCategory}
          saveCategory={saveCategory}
          feeCategories={feeCategories}
          feeCategoryName={feeCategoryName}
          setFeeCategoryName={setFeeCategoryName}
          editingFeeCategoryId={editingFeeCategoryId}
          setEditingFeeCategoryId={setEditingFeeCategoryId}
          saveFeeCategory={saveFeeCategory}
          editFeeCategory={editFeeCategory}
          deleteFeeCategory={deleteFeeCategory}
          setIsEditingView={setIsEditingView}
        />
      )}

      {tab === 'subjects' && (
        <SubjectsSection
          subjectForm={subjectForm}
          setSubjectForm={setSubjectForm}
          academicYears={academicYears}
          groups={groups}
          coursesForGroup={coursesForGroup}
          semForCourse={semForCourse}
          feeCategories={feeCategories}
          categories={categories}
          catItems={catItems}
          pendingSubjects={pendingSubjects}
          subjects={subjects}
          editingSubjectId={editingSubjectId}
          saveSubject={saveSubject}
          submitPendingSubjects={submitPendingSubjects}
          editPendingSubject={editPendingSubject}
          deletePendingSubject={deletePendingSubject}
          editSubject={editSubject}
          deleteSubject={deleteSubject}
          onCancelSubjectEdit={cancelSubjectEdit}
        />
      )}
      </div>
    </AdminShell>
  )
}
