import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AdminShell from '../components/AdminShell'
import { api } from '../lib/mockApi'
import AcademicYearsSection from './AcademicYears'
import GroupsCoursesSection from './GroupsCourses'
import SubCategoriesSection from './SubCategories'
import SubjectsSection from './Subjects'
import crestPrimary from '../assets/media/images.png'

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
const randomId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const buildSubjectForm = (category = '') => ({
  academicYearId: '',
  academicYearName: '',
  groupCode: '',
  courseCode: '',
  courseName: '',
  semester: '',
  category,
  categoryId: '',
  subjectName: '',
  extraSubjectNames: [],
  subjectSelections: [],
  feeCategory: '',
  feeAmount: '',
  subjectId: ''
})
const itemsToNames = (items = []) => (items || [])
  .map(item => (item?.name || '').trim())
  .filter(Boolean)
const subjectsToItems = (subjects = []) => {
  if (!Array.isArray(subjects)) return []
  return subjects
    .map(name => ({ id: randomId(), name }))
    .filter(item => item.name)
}
const buildCourseLookup = (courses = []) => {
  return courses.reduce((acc, course) => {
    if (!course) return acc
    const courseCode = course.courseCode || course.code || course.course_code || ''
    const courseName = course.courseName || course.name || course.course_name || courseCode
    const groupCode = course.groupCode || course.group_code || course.group_name || ''
    const entry = { courseCode, courseName, groupCode }
    if (courseName) acc[courseName] = entry
    if (courseCode) acc[courseCode] = entry
    return acc
  }, {})
}
const buildYearNameLookup = (years = []) => {
  return years.reduce((acc, year) => {
    if (year?.name && year?.id !== undefined) acc[year.name] = year.id
    return acc
  }, {})
}
const invertMap = (mapObj = {}) => {
  return Object.entries(mapObj).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc[value] = key
    }
    return acc
  }, {})
}
const normalizeSubjectRecord = (subject = {}, context = {}) => {
  const {
    courseLookup = {},
    categoryNameById = {},
    yearNameToId = {}
  } = context
  const semesterValue = subject.semester ?? subject.semester_number ?? subject.semesterNo ?? subject.semesterNumber
  const feeAmountValue = subject.amount ?? subject.feeAmount ?? subject.fee_amount
  const subjectCode = subject.subjectCode || subject.subject_code || subject.subjectName || subject.subject_name || ''
  const subjectName = subject.subjectName || subject.subject_name || subjectCode
  const courseKey = subject.courseName || subject.course_name || subject.courseCode || subject.course_code || ''
  const courseMeta = courseLookup[courseKey] || {}
  const academicYearName = subject.academicYearName || subject.academic_year_name || subject.academic_year || ''
  const academicYearId = subject.academicYearId || subject.academic_year_id || yearNameToId[academicYearName] || ''
  const categoryId = subject.category_id ?? subject.categoryId ?? ''
  const categoryName = subject.category || subject.category_name || categoryNameById[categoryId] || ''
  const supabaseId = subject.subject_id || subject.subjectId || subject.id || ''
  return {
    id: supabaseId || subject.id || randomId(),
    subjectId: supabaseId || '',
    academicYearId,
    academicYearName,
    groupCode: subject.groupCode || subject.group_code || courseMeta.groupCode || '',
    courseCode: subject.courseCode || subject.course_code || courseMeta.courseCode || courseKey,
    courseName: courseMeta.courseName || courseKey,
    semester: semesterValue === undefined || semesterValue === null || semesterValue === '' ? '' : Number(semesterValue),
    categoryId,
    category: categoryName,
    subjectCode,
    subjectName,
    feeCategory: subject.feeCategory || subject.fee_category || subject.fees_category || '',
    feeAmount: feeAmountValue === undefined || feeAmountValue === null || feeAmountValue === '' ? '' : Number(feeAmountValue)
  }
}
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
        id: cat?.id || randomId(),
        name: (cat?.name || '').toString(),
        fees: (cat?.fees || cat?.items || [])
          .map(fee => ({
            id: fee?.id || randomId(),
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
        id: item?.id || randomId(),
        name: feeName,
        fees: [{
          id: randomId(),
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
  const yearNameToId = useMemo(() => buildYearNameLookup(academicYears), [academicYears])
  const resolveYearName = (yearId) => {
    if (!yearId) return ''
    const match = academicYears.find(y => String(y.id) === String(yearId))
    return match?.name || ''
  }
  const addYear = async () => {
    if (!yearForm.name.trim()) return
    try {
      if (editingYearId) {
        const updated = await api.updateAcademicYear?.(editingYearId, { name: yearForm.name, active: yearForm.active })
        if (updated) {
          setAcademicYears(prev => prev.map(y => y.id === editingYearId ? updated : y))
        }
        setEditingYearId('')
      } else {
        const created = await api.addAcademicYear({ name: yearForm.name, active: yearForm.active })
        if (created) {
          setAcademicYears(prev => [...prev, created])
        }
      }
    } catch (error) {
      console.error('Failed to save academic year', error)
    }
    setYearForm({ name: '', active: true })
  }
  const editYear = (year) => {
    setYearForm({ name: year.name, active: year.active })
    setEditingYearId(year.id)
  }
  const deleteYear = async (id) => {
    setAcademicYears(prev => prev.filter(y => y.id !== id))
    try { await api.deleteAcademicYear?.(id) } catch (error) { console.error('Failed to delete academic year', error) }
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
    if (!groupForm.code || !groupForm.name) return
    const code = groupForm.code.toUpperCase()
    const payload = {
      code,
      name: groupForm.name,
      years: Number(groupForm.years) || 0,
      semesters: Number(groupForm.semesters) || 0
    }
    if (editingGroupId) {
      try {
        const updated = await api.updateGroup?.(editingGroupId, payload)
        if (updated) {
          setGroups(prev => prev.map(g => g.id === editingGroupId ? updated : g))
        }
      } catch (error) {
        console.error('Error updating group:', error)
      }
      setEditingGroupId('')
    } else {
      if (groups.some(g => g.code === code)) return
      try {
        const created = await api.addGroup(payload)
        if (created) setGroups(prev => [...prev, created])
      } catch (error) {
        console.error('Error adding group:', error)
      }
    }
    setGroupForm({ id: '', code: '', name: '', years: 0, semesters: 0 })
  }
  const editGroup = (g) => { setGroupForm(g); setEditingGroupId(g.id) }
  const deleteGroup = async (id) => {
    setGroups(prev => prev.filter(g => g.id !== id))
    try { await api.deleteGroup?.(id) } catch (error) { console.error('Error deleting group:', error) }
  }

  // Courses
  const [courses, setCourses] = useState([])
  const courseLookup = useMemo(() => buildCourseLookup(courses), [courses])
  const [courseForm, setCourseForm] = useState({ id: '', groupCode: '', courseCode: '', courseName: '', semesters: 6 })
  const [editingCourseId, setEditingCourseId] = useState('')

  // Semesters (auto-generated per course)
  const [semesters, setSemesters] = useState([]) // [{ id, courseCode, number }]
  useEffect(() => {
    const generated = courses.flatMap(course => {
      const code = course.courseCode || course.code
      const count = Number(course.semesters || 0)
      if (!code || !count) return []
      return Array.from({ length: count }, (_, i) => ({ id: `${code}-${i + 1}`, courseCode: code, number: i + 1 }))
    })
    setSemesters(generated)
  }, [courses])
  const saveCourse = async () => {
    const { groupCode, courseCode, courseName, semesters: semCount } = courseForm
    if (!groupCode || !courseCode || !courseName || !semCount) return
    const code = courseCode.toUpperCase()
    const payload = {
      code,
      name: courseName,
      group_code: groupCode,
      semesters: Number(semCount) || 0
    }
    if (editingCourseId) {
      try {
        const updated = await api.updateCourse?.(editingCourseId, payload)
        if (updated) {
          setCourses(prev => prev.map(c => c.id === editingCourseId ? updated : c))
        }
      } catch (error) {
        console.error('Error updating course:', error)
      }
      setEditingCourseId('')
    } else {
      if (courses.some(c => (c.courseCode || c.code) === code)) return
      try {
        const created = await api.addCourse(payload)
        if (created) setCourses(prev => [...prev, created])
      } catch (error) {
        console.error('Error adding course:', error)
      }
    }
    setCourseForm({ id: '', groupCode: '', courseCode: '', courseName: '', semesters: 6 })
  }
  const editCourse = (c) => { setCourseForm(c); setEditingCourseId(c.id) }
  const deleteCourse = async (id) => {
    const course = courses.find(c => c.id === id)
    setCourses(courses.filter(c => c.id !== id))
    if (course) {
      const code = course.courseCode || course.code
      setSemesters(semesters.filter(s => s.courseCode !== code))
    }
    try { await api.deleteCourse?.(id) } catch (error) { console.error('Error deleting course:', error) }
  }

  // Sub-categories and Languages
  const [categories, setCategories] = useState([])
  const [categoryIdMap, setCategoryIdMap] = useState({})
  const categoryNameById = useMemo(() => invertMap(categoryIdMap), [categoryIdMap])
  const [categoryName, setCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState('')
  const [catItems, setCatItems] = useState({})
  const [feeCategories, setFeeCategories] = useState([])
  const [feeCategoryName, setFeeCategoryName] = useState('')
  const [editingFeeCategoryId, setEditingFeeCategoryId] = useState('')
  const [feeDrafts, setFeeDrafts] = useState({})
  const persistFeeCategoryList = async (list) => {
    try {
      await api.setFeeTypes?.(list)
    } catch (error) {
      console.error('Failed to save fee categories', error)
    }
  }
  useEffect(() => {
    (async () => {
      try {
        const [yrs, grps, crs, ft, subcats, subs] = await Promise.all([
          api.listAcademicYears?.() || [],
          api.listGroups?.() || [],
          api.listCourses?.() || [],
          api.getFeeTypes?.() || [],
          api.listSubCategories?.() || [],
          api.listSubjects?.() || []
        ])
        if (yrs.length) setAcademicYears(yrs)
        if (grps.length) setGroups(grps)
        if (crs.length) setCourses(crs)
        if (ft) {
          const normalized = normalizeFeeCategories(ft)
          setFeeCategories(normalized)
        }
        const catNameByIdInit = {}
        if (subcats.length) {
          const names = []
          const itemsMap = {}
          const idMap = {}
          subcats.forEach(cat => {
            names.push(cat.name)
            idMap[cat.name] = cat.id
            itemsMap[cat.name] = subjectsToItems(cat.subjects)
            if (cat.id) catNameByIdInit[cat.id] = cat.name
          })
          setCategories(names)
          setCatItems(itemsMap)
          setCategoryIdMap(idMap)
        } else {
          setCategories([])
          setCatItems({})
          setCategoryIdMap({})
        }
        const initialSubjectContext = {
          courseLookup: buildCourseLookup(crs),
          categoryNameById: catNameByIdInit,
          yearNameToId: buildYearNameLookup(yrs)
        }
        if (subs?.length) {
          setSubjects(subs.map(rec => normalizeSubjectRecord(rec, initialSubjectContext)))
        } else {
          setSubjects([])
        }
      } catch (error) {
        console.error('Failed to load setup data', error)
      }
    })()
  }, [])
  const saveFeeCategory = async () => {
    const trimmed = feeCategoryName.trim()
    if (!trimmed) return
    const duplicate = feeCategories.some(cat => cat.name.trim().toLowerCase() === trimmed.toLowerCase() && cat.id !== editingFeeCategoryId)
    if (duplicate) return
    let next = []
    if (editingFeeCategoryId) {
      next = feeCategories.map(cat => cat.id === editingFeeCategoryId ? { ...cat, name: trimmed } : cat)
    } else {
      next = [...feeCategories, { id: randomId(), name: trimmed, fees: [] }]
    }
    setFeeCategories(next)
    await persistFeeCategoryList(next)
    setFeeCategoryName('')
    setEditingFeeCategoryId('')
  }
  const editFeeCategory = (cat) => {
    setFeeCategoryName(cat.name)
    setEditingFeeCategoryId(cat.id)
  }
  const deleteFeeCategory = async (id) => {
    const next = feeCategories.filter(cat => cat.id !== id)
    setFeeCategories(next)
    await persistFeeCategoryList(next)
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
    await persistFeeCategoryList(payload)
    setFeeCategories(payload)
  }
  const saveCategory = async () => {
    const trimmed = categoryName.trim()
    if (!trimmed) return
    const duplicate = categories.some(c => c.toLowerCase() === trimmed.toLowerCase() && c !== editingCategory)
    if (duplicate) return
    if (editingCategory) {
      setCategories(categories.map(c => c === editingCategory ? trimmed : c))
      setCatItems(prev => renameKey(prev, editingCategory, trimmed, []))
      setSubjects(prev => prev.map(s => s.category === editingCategory ? { ...s, category: trimmed } : s))
    if (subjectForm.category === editingCategory) {
      setSubjectForm(prev => ({ ...prev, category: trimmed }))
    }
      const catId = categoryIdMap[editingCategory]
      const currentItems = catItems[editingCategory] || []
      if (catId) {
        try {
          await api.updateSubCategory?.(catId, { name: trimmed, subjects: itemsToNames(currentItems) })
        } catch (error) {
          console.error('Failed to rename sub-category', error)
        }
        setCategoryIdMap(prev => {
          const next = { ...prev }
          delete next[editingCategory]
          return { ...next, [trimmed]: catId }
        })
      }
    } else {
      try {
        const created = await api.addSubCategory?.(trimmed)
        const label = created?.name || trimmed
        const id = created?.id
        setCategories(prev => [...prev, label])
        setCatItems(prev => ({ ...prev, [label]: subjectsToItems(created?.subjects || []) }))
        if (id) {
          setCategoryIdMap(prev => ({ ...prev, [label]: id }))
        }
      } catch (error) {
        console.error('Failed to add sub-category', error)
        return
      }
    }
    setCategoryName(''); setEditingCategory('')
  }
  const deleteCategory = async (name) => {
    const id = categoryIdMap[name]
    if (id) {
      try {
        await api.deleteSubCategory?.(id)
      } catch (error) {
        console.error('Failed to delete sub-category', error)
        return
      }
    }
    const remaining = categories.filter(c => c !== name)
    if (remaining.length === categories.length) return
    setCategories(remaining)
    setCatItems(prev => deleteKey(prev, name))
    setCategoryIdMap(prev => deleteKey(prev, name))
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
  const subjectContext = useMemo(() => ({
    courseLookup,
    categoryNameById,
    yearNameToId
  }), [courseLookup, categoryNameById, yearNameToId])
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

  const coursesForGroup = courses.filter(c => {
    const groupCode = c.groupCode || c.group_code
    if (!subjectForm.groupCode) return false
    return groupCode === subjectForm.groupCode
  })
  const semForCourse = semesters.filter(s => s.courseCode === subjectForm.courseCode)

  const saveSubject = () => {
    const {
      academicYearId,
      groupCode,
      courseCode,
      semester,
      category,
      subjectName,
      extraSubjectNames = [],
      subjectSelections = [],
      feeCategory,
      feeAmount
    } = subjectForm
    const selectedNames = Array.isArray(subjectSelections) ? subjectSelections : []
    const hasSelection = selectedNames.length > 0
    const manualNames = [subjectName, ...(Array.isArray(extraSubjectNames) ? extraSubjectNames : [])]
      .map(name => (name || '').trim())
      .filter(Boolean)
    if (!academicYearId || !groupCode || !courseCode || !semester || !category) return
    if (!hasSelection && manualNames.length === 0) return
    const names = hasSelection ? selectedNames : manualNames
    const academicYearName = resolveYearName(academicYearId)
    const categoryId = categoryIdMap[category] || ''
    const courseMeta = courses.find(c => c.courseCode === courseCode || c.code === courseCode)
    const courseName = courseMeta?.courseName || courseCode
    const entries = names.map((name, idx) => ({
      id: editingSubjectId && idx === 0 ? editingSubjectId : randomId(),
      subjectId: editingSubjectId && idx === 0 ? editingSubjectId : '',
      academicYearId,
      academicYearName,
      groupCode,
      courseCode,
      courseName,
      semester: Number(semester),
      category,
      categoryId,
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
      extraSubjectNames: [],
      subjectSelections: [],
      feeCategory: '',
      feeAmount: ''
    }))
  }
  const submitPendingSubjects = async () => {
    if (!pendingSubjects.length) return
    const payload = pendingSubjects.map(item => {
      const academicYearName = item.academicYearName || resolveYearName(item.academicYearId)
      const courseMeta = courseLookup[item.courseCode] || courseLookup[item.courseName] || {}
      const categoryId = item.categoryId || categoryIdMap[item.category] || null
      const subjectCodeValue = item.subjectCode || item.subjectName || ''
      const subjectNameValue = item.subjectName || subjectCodeValue
      const amountValue = item.feeAmount === '' || item.feeAmount === undefined || item.feeAmount === null
        ? null
        : Number(item.feeAmount)
      const courseCodeValue = courseMeta.courseCode || item.courseCode || item.courseName || null
      const row = {
        academic_year: academicYearName || null,
        course_name: courseCodeValue,
        semester_number: item.semester ? Number(item.semester) : null,
        category_id: categoryId,
        subject_code: subjectCodeValue,
        subject_name: subjectNameValue,
        fees_category: item.feeCategory || null,
        amount: amountValue
      }
      if (item.subjectId) {
        row.subject_id = item.subjectId
      }
      return row
    })
    try {
      const saved = await api.addSubjects?.(payload)
      const normalized = (Array.isArray(saved) && saved.length ? saved : payload).map(rec => normalizeSubjectRecord(rec, subjectContext))
      setSubjects(prev => {
        const incomingIds = new Set(normalized.map(item => item.id))
        const remaining = prev.filter(item => !incomingIds.has(item.id))
        return [...remaining, ...normalized]
      })
      setPendingSubjects([])
    } catch (error) {
      console.error('Failed to save subjects', error)
    }
  }
  const editPendingSubject = (rec) => {
    setPendingSubjects(prev => prev.filter(s => s.id !== rec.id))
    const options = catItems[rec.category] || []
    const isPreset = options.some(item => item.name === rec.subjectName)
    setSubjectForm({
      ...rec,
      semester: rec.semester === undefined || rec.semester === null ? '' : rec.semester.toString(),
      feeCategory: rec.feeCategory || '',
      feeAmount: rec.feeAmount?.toString() || '',
      subjectName: isPreset ? '' : rec.subjectName,
      extraSubjectNames: [],
      subjectSelections: isPreset ? [rec.subjectName] : []
    })
    setEditingSubjectId(rec.subjectId || rec.id)
  }
  const editSubject = async (rec) => {

    editPendingSubject(rec)
  }
  const deletePendingSubject = (id) => {
    setPendingSubjects(prev => prev.filter(s => s.id !== id))
    if (editingSubjectId === id) {
      setSubjectForm(buildSubjectForm(categories[0] || ''))
      setEditingSubjectId('')
    }
  }
  const deleteSubject = async (id) => {
    setSubjects(prev => prev.filter(s => s.id !== id))
    try { await api.deleteSubject?.(id) } catch (error) { console.error('Failed to delete subject', error) }
  }
  const cancelSubjectEdit = () => {
    setEditingSubjectId('')
    setSubjectForm(buildSubjectForm(categories[0] || ''))
  }

  const currentTabMeta = TAB_CONFIG.find(cfg => cfg.key === tab) || TAB_CONFIG[0]
  const heroStats = [
    { key: 'years', label: 'Academic Years', value: academicYears.length || 0, meta: 'records', route: '/admin/setup/years' },
    { key: 'groups', label: 'Groups & Courses', value: groups.length || 0, meta: 'active', route: '/admin/setup/groups' },
    { key: 'subcats', label: 'Sub-categories', value: categories.length || 0, meta: 'managed', route: '/admin/setup/subcats' },
    { key: 'subjects', label: 'Subjects', value: subjects.length || 0, meta: 'published', route: '/admin/setup/subjects' }
  ]

  return (
    <AdminShell>
      <div className="desktop-container">
        <h2 className="fw-bold mb-3">Admin Setup</h2>
        <section className="setup-hero mb-4">
          <div className="setup-hero-grid">
            <div className="setup-hero-copywrap">
              <div className="setup-hero-crest" aria-hidden="true">
                <img src={crestPrimary} alt="Vijayam crest" />
              </div>
              <h3 className="setup-hero-title mb-2">Vijayam Arts & Science College</h3>
              <p className="setup-hero-copy mb-3">{currentTabMeta.tagline}</p>
              <div className="setup-hero-chips d-flex flex-wrap gap-2">
                <span className="setup-hero-chip">Smart Examination Platform</span>
              </div>
              <p className="setup-hero-eyebrow text-uppercase mt-3">Administration · Setup Console</p>
            </div>
            <div className="setup-stat-grid">
              {heroStats.map((stat) => (
                <Link key={stat.key} to={stat.route} className="setup-stat-card">
                  <div className="setup-stat-label">{stat.label}</div>
                  <div className="setup-stat-value">{stat.value}</div>
                  <div className="setup-stat-meta">{stat.meta}</div>
                </Link>
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
