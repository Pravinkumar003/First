import AdminShell from '../components/AdminShell'
import { useEffect, useState } from 'react'
import { api } from '../lib/mockApi'
import { validateRequiredFields } from '../lib/validation'

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState({ code: '', name: '', duration_years: 3 })
  const load = async () => setCourses(await api.listCourses())
  useEffect(() => { load() }, [])
  const save = async () => {
    if (!validateRequiredFields({
      'Course code': form.code,
      'Course name': form.name,
      'Duration (years)': form.duration_years
    })) return
    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim()
    }
    await api.addCourse(payload)
    setForm({ code: '', name: '', duration_years: 3 })
    load()
  }
  return (
    <AdminShell>
      <h2 className="fw-bold mb-3">Courses</h2>
      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card card-soft p-3">
            <label className="form-label fw-bold mb-1">Course Code</label>
            <input
              className="form-control mb-2"
              placeholder="e.g., BSC01"
              required
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value })}
            />
            <label className="form-label fw-bold mb-1">Course Name</label>
            <input
              className="form-control mb-2"
              placeholder="e.g., B.Sc Computer Science"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
            <label className="form-label fw-bold mb-1">Duration (years)</label>
            <select
              className="form-select mb-3"
              required
              value={form.duration_years}
              onChange={e => setForm({ ...form, duration_years: Number(e.target.value) })}
            >
              <option value="3">3 years</option>
              <option value="5">5 years</option>
            </select>
            <button className="btn btn-brand w-100" onClick={save}>Add Course</button>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="card card-soft p-0">
            <table className="table mb-0">
              <thead><tr><th>Code</th><th>Name</th><th>Duration</th></tr></thead>
              <tbody>
                {courses.map(c => (
                  <tr key={c.id}>
                    <td>{c.code}</td>
                    <td>{c.name}</td>
                    <td>{c.duration_years} years</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
