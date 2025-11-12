import { useEffect, useState } from 'react'
import { api } from '../lib/mockApi'

export default function PublicResults() {
  const [students, setStudents] = useState([])
  const [exams, setExams] = useState([])
  const [results, setResults] = useState([])
  const [studentId, setStudentId] = useState('')
  const [examId, setExamId] = useState('')
  const [found, setFound] = useState(null)

  useEffect(()=>{ (async()=>{
    setStudents(await api.listStudents());
    setExams(await api.listExams());
    setResults(await api.listResults());
  })() }, [])

  const search = () => {
    const r = results.find(r => r.student_id === studentId && r.exam_id === examId)
    setFound(r || null)
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card card-soft p-4">
            <h4 className="mb-3">Exam Results</h4>
            <div className="row g-2 align-items-end">
              <div className="col-md-4">
                <label className="form-label">Student</label>
                <select className="form-select" value={studentId} onChange={e=>setStudentId(e.target.value)}>
                  <option value="">Select Student</option>
                  {students.map(s=> (<option key={s.student_id} value={s.student_id}>{s.student_id} - {s.full_name}</option>))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Exam</label>
                <select className="form-select" value={examId} onChange={e=>setExamId(e.target.value)}>
                  <option value="">Select Exam</option>
                  {exams.map(x=> (<option key={x.id} value={x.id}>{x.title} ({x.date})</option>))}
                </select>
              </div>
              <div className="col-md-4 text-end">
                <button className="btn btn-brand" onClick={search}>View Result</button>
              </div>
            </div>
            {found && (
              <div className="mt-4">
                <div className="card p-3 bg-ice">
                  <div><strong>Total:</strong> {found.total}</div>
                  <div><strong>Grade:</strong> {found.grade}</div>
                </div>
              </div>
            )}
            {found===null && studentId && examId && (
              <div className="alert alert-warning mt-3">No result found for the selected student and exam.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

