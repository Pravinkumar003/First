Exams.jsx
import AdminShell from '../components/AdminShell'
import { useEffect, useState } from 'react'
import { api } from '../lib/mockApi'
export default function Exams() {
  const [list, setList] = useState([])
  const [form, setForm] = useState({ title:'', date:'', time:'', venue:'', course_id:'' })
  const load = async () => setList(await api.listExams())
  useEffect(()=>{ load() }, [])
  const save = async () => { if(!form.title||!form.date||!form.time||!form.venue) return; await api.addExam(form); setForm({ title:'', date:'', time:'', venue:'', course_id:'' }); load() }
  return (
    <AdminShell>
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '70vh' }}>
        <h2 className="fw-bold mb-3">Exam Scheduling</h2>
        <p className="h4 text-muted">This page should be updated</p>
      </div>
      {/* Keeping the original code but commented out for future reference
      <h2 className="fw-bold mb-3">Exam Scheduling</h2>
      <div className="row g-3">
        <div className="col-lg-4"><div className="card card-soft p-3"><input className="form-control mb-2" placeholder="Title (e.g., EX1 Semester 1)" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} /><div className="row g-2"><div className="col"><input type="date" className="form-control" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></div><div className="col"><input type="time" className="form-control" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} /></div></div><input className="form-control my-2" placeholder="Venue" value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})} /><input className="form-control mb-2" placeholder="Course Id" value={form.course_id} onChange={e=>setForm({...form,course_id:e.target.value})} /><button className="btn btn-brand w-100" onClick={save}>Create Schedule</button></div></div>
        <div className="col-lg-8"><div className="card card-soft p-0"><table className="table mb-0"><thead><tr><th>Title</th><th>Date</th><th>Time</th><th>Venue</th></tr></thead><tbody>{list.map(ex=> (<tr key={ex.id}><td>{ex.title}</td><td>{ex.date}</td><td>{ex.time}</td><td>{ex.venue}</td></tr>))}</tbody></table></div></div>
      </div>
      */}
    </AdminShell>
  )
}