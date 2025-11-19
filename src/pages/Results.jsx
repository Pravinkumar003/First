import AdminShell from '../components/AdminShell'
import { useEffect, useState } from 'react'
import { api } from '../lib/mockApi'
export default function Results(){
  const [students,setStudents]=useState([])
  const [exams,setExams]=useState([])
  const [form,setForm]=useState({student_id:'',exam_id:'',total:'',grade:''})
  const [saving,setSaving]=useState(false)
  useEffect(()=>{(async()=>{setStudents(await api.listStudents()); setExams(await api.listExams())})()},[])
  const save=async()=>{ if(!form.student_id||!form.exam_id||!form.total||!form.grade) return; setSaving(true); await api.addResult({ student_id:form.student_id, exam_id:form.exam_id, total:Number(form.total), grade:form.grade }); setForm({student_id:'',exam_id:'',total:'',grade:''}); setSaving(false) }
  return (
    <AdminShell>
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '70vh' }}>
        <h2 className="fw-bold mb-3">Results Management</h2>
        <p className="h4 text-muted">This page should be updated</p>
      </div>
      {/* Original functionality preserved but commented out
      <h2 className="fw-bold mb-3">Publish Results</h2>
      <div className="card card-soft p-3">
        <div className="row g-2">
          <div className="col-md-4">
            <select className="form-select" value={form.student_id} onChange={e=>setForm({...form,student_id:e.target.value})}>
              <option value="">Select Student</option>
              {students.map(s=> (<option key={s.student_id} value={s.student_id}>{s.student_id} — {s.full_name}</option>))}
            </select>
          </div>
          <div className="col-md-4">
            <select className="form-select" value={form.exam_id} onChange={e=>setForm({...form,exam_id:e.target.value})}>
              <option value="">Select Exam</option>
              {exams.map(x=> (<option key={x.id} value={x.id}>{x.title} ({x.date})</option>))}
            </select>
          </div>
          <div className="col-md-2"><input type="number" className="form-control" placeholder="Total" value={form.total} onChange={e=>setForm({...form,total:e.target.value})} /></div>
          <div className="col-md-2"><input className="form-control" placeholder="Grade (e.g., A)" value={form.grade} onChange={e=>setForm({...form,grade:e.target.value})} /></div>
        </div>
        <div className="mt-3 d-flex justify-content-end">
          <button className="btn btn-brand" disabled={saving} onClick={save}>{saving?'Saving...':'Add Result'}</button>
        </div>
      </div>
      */}
    </AdminShell>
  )
}
 
 
 