import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import AdminShell from '../components/AdminShell'
import { api } from '../lib/mockApi'

// Utility
const uid = () => Math.random().toString(36).slice(2)

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
        await api.updateGroup(editingGroupId, { 
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
        await api.updateCourse(editingCourseId, { 
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
  const [categories, setCategories] = useState(['Language', 'Skill', 'Core', 'Allied', 'MAD'])
  const [categoryName, setCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState('')
  const [catItems, setCatItems] = useState({ Language: [], Skill: [], Core: [], Allied: [], MAD: [] })
  const [catCounts, setCatCounts] = useState({})
  const [tempCatInputs, setTempCatInputs] = useState({})
  const [viewCat, setViewCat] = useState('')
  const [feeTypes, setFeeTypes] = useState({ Academic:0, Exam:0, Library:0, Bus:0, Lab:0 })
  useEffect(()=>{ (async()=>{ try { const ft = await api.getFeeTypes?.(); if(ft) setFeeTypes(ft) } catch {} })() }, [])
  const saveCategory = () => {
    if (!categoryName) return
    if (editingCategory) {
      setCategories(categories.map(c => c === editingCategory ? categoryName : c))
    } else if (!categories.includes(categoryName)) {
      setCategories([...categories, categoryName])
    }
    setCategoryName(''); setEditingCategory('')
  }
  const deleteCategory = (name) => setCategories(categories.filter(c => c !== name))

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
  const [subjectForm, setSubjectForm] = useState({
    academicYearId: '',
    groupCode: '',
    courseCode: '',
    semester: '',
    category: 'Language',
    subjectCode: '',
    subjectName: '',
    remark: ''
  })
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
    setSubjectForm({ academicYearId: '', groupCode: '', courseCode: '', semester: '', category: 'Language', subjectCode: '', subjectName: '', remark: '' })
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
            <div className="row">
              <div className="col-md-8">
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label fw-bold mb-1">Group Code</label>
                    <input className="form-control" placeholder="Group Code" value={groupForm.code} onChange={e=>setGroupForm({...groupForm, code:e.target.value.toUpperCase()})} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold mb-1">Group Name</label>
                    <input className="form-control" placeholder="Group Name" value={groupForm.name} onChange={e=>setGroupForm({...groupForm, name:e.target.value})} />
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
              <div className="col-md-4">
                <div className="card h-100">
                  <div className="card-body">
                    <h6 className="card-title fw-bold">Available Groups</h6>
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>S.No</th>
                            <th>Group Name</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groups.length > 0 ? (
                            groups.map((group, index) => (
                              <tr key={group.id}>
                                <td>{index + 1}</td>
                                <td>{group.name} ({group.code})</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="2" className="text-center text-muted">No groups available</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
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
                    <label className="form-label fw-bold mb-1">Course Code</label>
                    <input 
                      className="form-control" 
                      placeholder="Enter Course Code" 
                      value={courseForm.courseCode} 
                      onChange={e=>setCourseForm({...courseForm, courseCode:e.target.value.toUpperCase()})} 
                    />
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
            {categories.map(cat => (
              <div key={cat} className="mb-3 p-2 border rounded bg-white">
                <div className="row g-2 align-items-end">
                  <div className="col-md-3"><div className="fw-600">{cat}</div></div>
                  <div className="col-md-3"><input type="number" min="0" className="form-control" placeholder="# items" value={catCounts[cat]||''} onChange={e=>{ const n=e.target.value; setCatCounts(prev=>({ ...prev, [cat]: n })); }} /></div>
                  <div className="col-md-2"><button className="btn btn-outline-brand w-100" onClick={()=>{ const n=Math.max(0, Number(catCounts[cat]||0)); setTempCatInputs(prev=>({ ...prev, [cat]: Array.from({length:n},(_,i)=> (tempCatInputs[cat]?.[i]||'')) })); }}>Generate</button></div>
                </div>
                {(tempCatInputs[cat]||[]).length>0 && (
                  <div className="row g-2 mt-2">
                    {(tempCatInputs[cat]||[]).map((val,idx)=> (
                      <div key={idx} className="col-md-3"><input className="form-control" placeholder={`${cat} #${idx+1}`} value={val} onChange={e=>{ const arr=[...(tempCatInputs[cat]||[])]; arr[idx]=e.target.value; setTempCatInputs(prev=>({ ...prev, [cat]: arr })); }} /></div>
                    ))}
                    <div className="col-md-2 d-flex align-items-end"><button className="btn btn-brand" onClick={()=>{
                      const items=(tempCatInputs[cat]||[]).filter(Boolean).map(name=>({ id: uid(), name }))
                      setCatItems(prev=>({ ...prev, [cat]: items }))
                      setTempCatInputs(prev=>({ ...prev, [cat]: [] }))
                    }}>OK</button></div>
                    
                  </div>
                  
                )}
                
              </div>
            ))}

            {/* Summary table */}
            <div className="table-responsive mt-3">
              <table className="table mb-0">
                <thead><tr><th>Category</th><th>Count</th><th>View</th></tr></thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat}>
                      <td>{cat}</td>
                      <td>{(catItems[cat]||[]).length}</td>
                      <td><button className="btn btn-outline-brand btn-sm" onClick={()=>setViewCat(cat)}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Drawer to view items */}
            {viewCat && (
              <div className="drawer-open">
                <div className="drawer-backdrop" onClick={()=>setViewCat('')}></div>
                <div className="drawer-panel" role="dialog" aria-modal="true">
                  <div className="drawer-header">
                    <div className="fw-600">{viewCat} Items</div>
                    <button className="btn btn-sm btn-outline-secondary" onClick={()=>setViewCat('')}><i className="bi bi-x"></i></button>
                  </div>
                  <div className="drawer-body">
                    {(catItems[viewCat]||[]).length===0 ? (
                      <div className="text-muted">No items.</div>
                    ) : (
                      <ul className="list-unstyled">
                        {catItems[viewCat].map(it => (
                          <li key={it.id} className="py-1">
                            <div className="d-flex align-items-center gap-2">
                              <input className="form-control" value={it.name} onChange={e=>setCatItems(prev=>({
                                ...prev,
                                [viewCat]: prev[viewCat].map(x=> x.id===it.id ? { ...x, name: e.target.value } : x)
                              }))} />
                              <button className="btn btn-sm btn-outline-primary" onClick={()=>{/* updated in-place */}}>Update</button>
                              <button className="btn btn-sm btn-outline-danger" onClick={()=>setCatItems(prev=>({
                                ...prev,
                                [viewCat]: prev[viewCat].filter(x=> x.id!==it.id)
                              }))}>Delete</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="drawer-footer d-flex justify-content-end">
                    <button className="btn btn-outline-secondary" onClick={()=>setViewCat('')}>Close</button>
                  </div>
                </div>
              </div>
            )}
          </section>
          <section className="card card-soft p-3 mb-3">
            <h5 className="section-title">Fee Categories</h5>
            <div className="row g-2 align-items-end">
              {Object.entries(feeTypes).map(([k,v])=> (
                <div className="col-md-4" key={k}>
                  <label className="form-label">{k} Fee</label>
                  <div className="d-flex gap-2">
                    <input type="number" className="form-control" value={v} onChange={e=>setFeeTypes({...feeTypes, [k]: Number(e.target.value||0)})} />
                    {!( ['Academic','Exam','Library','Bus','Lab'].includes(k) ) && (
                      <button className="btn btn-outline-danger" onClick={()=>{ const n={...feeTypes}; delete n[k]; setFeeTypes(n) }}>Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="row g-2 align-items-end mt-2">
              <div className="col-md-4"><input id="newFeeName" className="form-control" placeholder="New fee name (e.g., Sports)" /></div>
              <div className="col-md-3"><input id="newFeeAmt" type="number" className="form-control" placeholder="Amount" /></div>
              <div className="col-md-3"><button className="btn btn-outline-brand" onClick={()=>{ const name=document.getElementById('newFeeName').value.trim(); const amt=Number(document.getElementById('newFeeAmt').value||0); if(!name) return; setFeeTypes(prev=> ({...prev, [name]: amt})); document.getElementById('newFeeName').value=''; document.getElementById('newFeeAmt').value='' }}>Add Fee</button></div>
              <div className="col-md-2 text-end"><button className="btn btn-brand" onClick={()=>api.setFeeTypes?.(feeTypes)}>Save All</button></div>
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
            <div className="mt-2 text-end"><button className="btn btn-accent" onClick={saveSubject}>{editingSubjectId? 'Update Subject':'Add Subject'}</button>{editingSubjectId && <button className="btn btn-outline-secondary ms-2" onClick={()=>{setEditingSubjectId(''); setSubjectForm({ academicYearId:'', groupCode:'', courseCode:'', semester:'', category:'Language', subjectCode:'', subjectName:'', remark:'' })}}>Cancel</button>}</div>
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
