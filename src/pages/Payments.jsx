import AdminShell from '../components/AdminShell'
import { useEffect, useState } from 'react'
import { api } from '../lib/mockApi'
export default function Payments(){
  const [students,setStudents]=useState([])
  const [form,setForm]=useState({student_id:'',amount:'',method:'CASH',reference:''})
  const [saving,setSaving]=useState(false)
  useEffect(()=>{(async()=>{setStudents(await api.listStudents())})()},[])
  const save=async()=>{ if(!form.student_id||!form.amount) return; setSaving(true); await api.addPayment({...form, amount:Number(form.amount)}); setForm({student_id:'',amount:'',method:'CASH',reference:''}); setSaving(false) }
  return (
    <AdminShell>
      <h2 className="fw-bold mb-3">Record Payment</h2>
      <div className="card card-soft p-3">
        <div className="row g-2">
          <div className="col-md-4">
            <select className="form-select" value={form.student_id} onChange={e=>setForm({...form,student_id:e.target.value})}>
              <option value="">Select Student</option>
              {students.map(s=> (<option key={s.student_id} value={s.student_id}>{s.student_id} — {s.full_name}</option>))}
            </select>
          </div>
          <div className="col-md-2"><input type="number" className="form-control" placeholder="Amount" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} /></div>
          <div className="col-md-3">
            <select className="form-select" value={form.method} onChange={e=>setForm({...form,method:e.target.value})}>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="NETBANKING">Net Banking</option>
            </select>
          </div>
          <div className="col-md-3"><input className="form-control" placeholder="Reference (optional)" value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})} /></div>
        </div>
        <div className="mt-3 d-flex justify-content-end">
          <button className="btn btn-brand" disabled={saving} onClick={save}>{saving?'Saving...':'Add Payment'}</button>
        </div>
      </div>
    </AdminShell>
  )
}

