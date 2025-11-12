import AdminShell from '../components/AdminShell'
import { useEffect, useState } from 'react'
import { api } from '../lib/mockApi'
function makeStudentId(prefix='SID') { const year=new Date().getFullYear(); const rand=Math.floor(Math.random()*1e6).toString().padStart(6,'0'); return `${prefix}-${year}-${rand}` }
function makePermanentHT(year) { const seq=Math.floor(Math.random()*99999).toString().padStart(5,'0'); return `HT-${year}-${seq}` }
export default function Students() {
  const [apps, setApps] = useState([])
  const load = async () => setApps(await api.listApplications())
  useEffect(()=>{ load() }, [])
  const approve = async (a) => {
    const year = new Date().getFullYear()
    const student = { student_id: makeStudentId(), hall_ticket_no: makePermanentHT(year), full_name: a.full_name, dob: a.dob, gender: a.gender, mobile: a.mobile, email: a.email, address: a.address, course_id: a.course_id, photo_url: a.photo_url, cert_url: a.cert_url }
    await api.approveApplication(a.id, student); load()
  }
  return (
    <AdminShell>
      <h2 className="fw-bold mb-3">Student Applications</h2>
      <div className="card card-soft p-0"><table className="table mb-0"><thead><tr><th>Name</th><th>Course</th><th>Status</th><th>Action</th></tr></thead><tbody>{apps.map(a=> (<tr key={a.id}><td>{a.full_name}</td><td>{a.course_id}</td><td><span className="badge bg-light text-dark">{a.status}</span></td><td>{a.status==='PENDING'?<button className="btn btn-brand btn-sm" onClick={()=>approve(a)}>Approve</button>:'Approved'}</td></tr>))}</tbody></table></div>
    </AdminShell>
  )
}
