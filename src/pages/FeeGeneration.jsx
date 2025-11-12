import AdminShell from '../components/AdminShell'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/mockApi'

export default function FeeGeneration(){
  const [years,setYears]=useState([])
  const [groups,setGroups]=useState([])
  const [courses,setCourses]=useState([])
  const [semesters,setSemesters]=useState([])
  const [fees,setFees]=useState([])
  const [form,setForm]=useState({year:'',group:'',courseCode:'',semester:'',type:'ADMISSION',amount:''})
  const load=async()=>{
    const [ys,gs,cs,fs]=await Promise.all([
      api.listAcademicYears?.()||[], api.listGroups?.()||[], api.listCourses()||[], api.listFees()||[]
    ])
    setYears(ys); setGroups(gs); setCourses(cs); setFees(fs)
  }
  useEffect(()=>{ load() },[])

  const semOptions = useMemo(()=>{
    const c = courses.find(x=>x.code===form.courseCode || x.courseCode===form.courseCode)
    const n = c?.semesters || 0
    return Array.from({length:n},(_,i)=>i+1)
  },[form.courseCode,courses])

  const save=async()=>{
    if(!form.year||!form.group||!form.courseCode||!form.semester||!form.type||!form.amount) return
    await api.addFee({
      academic_year: form.year,
      group: form.group,
      course_code: form.courseCode,
      semester: Number(form.semester),
      payment_type: form.type,
      amount: Number(form.amount)
    })
    setForm({year:'',group:'',courseCode:'',semester:'',type:'ADMISSION',amount:''})
    load()
  }

  return (
    <AdminShell>
      <h2 className="fw-bold mb-3">Fee Generation</h2>
      <div className="card card-soft p-3 mb-3">
        <div className="row g-2">
          <div className="col-md-3">
            <select className="form-select" value={form.year} onChange={e=>setForm({...form,year:e.target.value})}>
              <option value="">Academic Year</option>
              {years.map(y=> (<option key={y.id} value={y.name}>{y.name}</option>))}
            </select>
          </div>
          <div className="col-md-2">
            <select className="form-select" value={form.group} onChange={e=>setForm({...form,group:e.target.value,courseCode:'',semester:''})}>
              <option value="">Group</option>
              {groups.map(g=> (<option key={g.id} value={g.code}>{g.code}</option>))}
            </select>
          </div>
          <div className="col-md-3">
            <select className="form-select" value={form.courseCode} onChange={e=>setForm({...form,courseCode:e.target.value,semester:''})}>
              <option value="">Course</option>
              {courses.filter(c=>!form.group||c.group_code===form.group||c.groupCode===form.group).map(c=> (
                <option key={c.id} value={c.code||c.courseCode}>{(c.code||c.courseCode)} - {c.name||c.courseName}</option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <select className="form-select" value={form.semester} onChange={e=>setForm({...form,semester:e.target.value})}>
              <option value="">Semester</option>
              {semOptions.map(n=> (<option key={n} value={n}>Sem {n}</option>))}
            </select>
          </div>
          <div className="col-md-2">
            <select className="form-select" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
              <option value="ADMISSION">Admission</option>
              <option value="TUITION">Tuition</option>
              <option value="EXAM">Exam</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="col-md-2"><input type="number" className="form-control" placeholder="Amount" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} /></div>
          <div className="col-md-2 text-end"><button className="btn btn-brand w-100" onClick={save}>Add Fee</button></div>
        </div>
      </div>

      <div className="card card-soft p-0">
        <table className="table mb-0">
          <thead><tr><th>Year</th><th>Group</th><th>Course</th><th>Sem</th><th>Type</th><th>Amount</th></tr></thead>
          <tbody>
            {fees.map(f=> (
              <tr key={f.id}><td>{f.academic_year}</td><td>{f.group}</td><td>{f.course_code}</td><td>{f.semester}</td><td>{f.payment_type}</td><td>{f.amount}</td></tr>
            ))}
            {fees.length===0 && (<tr><td colSpan="6" className="text-center text-muted">No fee definitions yet.</td></tr>)}
          </tbody>
        </table>
      </div>
    </AdminShell>
  )
}

