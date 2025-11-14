import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/mockApi'
import { supabase } from '../../supabaseClient'
import AdminShell from '../components/AdminShell'
import crestPrimary from '../assets/media/images.png'

export default function AdminApplications() {
  const GENDERS = ['Male', 'Female', 'Other']
  const CASTES = ['General', 'OBC', 'SC', 'ST', 'Others']
  const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Others']
  const STATES = ['Tamil Nadu', 'Andhra Pradesh', 'Karnataka', 'Kerala', 'Telangana', 'Maharashtra', 'Other']

  const initialForm = {
    student_id: '',
    ht_no: '',
    academic_year: '',
    group: '',
    course_id: '',
    full_name: '',
    gender: '',
    dob: '',
    father_name: '',
    mother_name: '',
    nationality: '',
    state: '',
    aadhar_no: '',
    postal_code: '',
    address: '',
    mobile: '',
    email: '',
    religion: '',
    caste: '',
    sub_caste: ''
  }

  const [form, setForm] = useState(initialForm)
  const [photo, setPhoto] = useState(null)
  const [cert, setCert] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [courses, setCourses] = useState([])
  const [groups, setGroups] = useState([])
  const [years, setYears] = useState([])

  const handle = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [cs, gs, ys] = await Promise.all([
          api.listCourses(),
          api.listGroups?.() || [],
          api.listAcademicYears?.() || []
        ])
        setCourses(cs || [])
        setGroups(gs || [])
        setYears(ys || [])
      } catch (error) {
        console.error('Failed to load masters', error)
        setCourses([])
        setGroups([])
        setYears([])
      }
    }
    bootstrap()
  }, [])

  const resetAll = () => {
    setForm(initialForm)
    setPhoto(null)
    setCert(null)
    setMsg('')
  }

  const onNumericChange = (key, max) => (event) => {
    const sanitized = (event.target.value || '').replace(/\D/g, '').slice(0, max)
    handle(key, sanitized)
  }

  const isDigits = (value, len) => new RegExp(`^\\d{${len}}$`).test(value)

  const isValid = useMemo(() => {
    return !!(
      form.academic_year &&
      form.group &&
      form.course_id &&
      form.full_name &&
      form.gender &&
      form.dob &&
      form.mobile && isDigits(form.mobile, 10) &&
      form.postal_code && isDigits(form.postal_code, 6) &&
      (!form.aadhar_no || isDigits(form.aadhar_no, 12)) &&
      form.address
    )
  }, [form])

  const submit = async (event) => {
    event.preventDefault()
    setMsg('')
    if (!isValid) return

    setLoading(true)
    try {
      const selectedCourse = courses.find((course) => course.id == form.course_id)
      if (!selectedCourse) throw new Error('Select a valid course')

      const courseCode = selectedCourse.courseCode || selectedCourse.code
      if (!courseCode) throw new Error('Selected course is missing a course code reference')

      const payload = {
        student_id: form.student_id || `STU${Date.now().toString().slice(-6)}`,
        hall_ticket_no: form.ht_no || null,
        academic_year: form.academic_year,
        group_name: form.group,
        course_name: courseCode,
        Student_name: form.full_name,
        full_name: form.full_name,
        gender: form.gender,
        date_of_birth: form.dob,
        father_name: form.father_name || null,
        mother_name: form.mother_name || null,
        nationality: form.nationality || null,
        state: form.state || null,
        aadhar_number: form.aadhar_no || null,
        pincode: form.postal_code,
        address: form.address,
        phone_number: form.mobile,
        email: form.email || null,
        religion: form.religion || null,
        caste: form.caste || null,
        sub_caste: form.sub_caste || null,
        photo_url: photo ? URL.createObjectURL(photo) : null,
        cert_url: cert ? URL.createObjectURL(cert) : null,
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      }

      const { error } = await supabase.from('students').insert([payload])
      if (error) throw error

      setMsg('Application saved successfully.')
      resetAll()
    } catch (error) {
      console.error('Unable to submit application', error)
      setMsg(error.message || 'Unable to submit application right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminShell>
      <div className="desktop-container">
        <section className="setup-hero mb-4">
          <div className="setup-hero-copywrap">
            <div className="admin-applications__crest" aria-hidden="true">
              <img src={crestPrimary} alt="Vijayam crest" />
            </div>
            <h3 className="setup-hero-title mb-2">Vijayam Arts & Science College</h3>
            <p className="setup-hero-copy mb-3">Collect, verify, and onboard applicants with confidence.</p>
            <div className="setup-hero-chips d-flex flex-wrap gap-2">
              <span className="setup-hero-chip text-uppercase">SMART EXAMINATION PLATFORM</span>
            </div>
            <p className="setup-hero-eyebrow text-uppercase mt-3">APPLICATIONS&nbsp;&nbsp;ADMIN CONSOLE</p>
          </div>
        </section>

        <div className="row g-4 justify-content-center">
          <div className="col-xl-10 col-lg-11">
            <div className="card card-soft p-4 mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h4 className="mb-1">Student Application</h4>
                  <p className="text-muted mb-0">Programme selection, personal profile, and uploads.</p>
                </div>
                <button type="button" className="btn btn-outline-secondary" onClick={resetAll}>Reset Form</button>
              </div>

              <form onSubmit={submit}>
                <div className="application-section mb-4">
                  <h6 className="text-uppercase text-muted fw-bold small">Programme Selection</h6>
                  <div className="row g-3 mt-1">
                    <div className="col-md-4">
                      <label className="form-label">Academic Year</label>
                      <select className="form-select" value={form.academic_year} onChange={(e) => handle('academic_year', e.target.value)} required>
                        <option value="">Select</option>
                        {years.map((year) => (
                          <option key={year.id} value={year.academic_year}>{year.academic_year}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Group</label>
                      <select className="form-select" value={form.group} onChange={(e) => handle('group', e.target.value)} required>
                        <option value="">Select</option>
                        {groups.map((group) => (
                          <option key={group.group_id} value={group.group_code}>{group.group_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Course</label>
                      <select className="form-select" value={form.course_id} onChange={(e) => handle('course_id', e.target.value)} required>
                        <option value="">Select</option>
                        {courses.map((course) => (
                          <option key={course.id || course.course_id} value={course.id || course.course_id}>
                            {course.courseName || course.course_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="application-section mb-4">
                  <h6 className="text-uppercase text-muted fw-bold small">Identity & Guardians</h6>
                  <div className="row g-3 mt-1">
                    <div className="col-md-6">
                      <label className="form-label">Student ID</label>
                      <input className="form-control" value={form.student_id} onChange={(e) => handle('student_id', e.target.value)} placeholder="Auto-generated if blank" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Hall Ticket No</label>
                      <input className="form-control" value={form.ht_no} onChange={(e) => handle('ht_no', e.target.value)} placeholder="Optional" />
                    </div>
                    <div className="col-md-8">
                      <label className="form-label">Full Name</label>
                      <input className="form-control" value={form.full_name} onChange={(e) => handle('full_name', e.target.value)} required />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Gender</label>
                      <select className="form-select" value={form.gender} onChange={(e) => handle('gender', e.target.value)} required>
                        <option value="">Select</option>
                        {GENDERS.map((gender) => (
                          <option key={gender} value={gender}>{gender}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">DOB</label>
                      <input type="date" className="form-control" value={form.dob} onChange={(e) => handle('dob', e.target.value)} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Father's Name</label>
                      <input className="form-control" value={form.father_name} onChange={(e) => handle('father_name', e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Mother's Name</label>
                      <input className="form-control" value={form.mother_name} onChange={(e) => handle('mother_name', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="application-section mb-4">
                  <h6 className="text-uppercase text-muted fw-bold small">Contact & Address</h6>
                  <div className="row g-3 mt-1">
                    <div className="col-md-4">
                      <label className="form-label">Mobile</label>
                      <input className="form-control" inputMode="tel" value={form.mobile} onChange={onNumericChange('mobile', 10)} placeholder="10-digit" required />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Email</label>
                      <input type="email" className="form-control" value={form.email} onChange={(e) => handle('email', e.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Nationality</label>
                      <input className="form-control" value={form.nationality} onChange={(e) => handle('nationality', e.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">State</label>
                      <select className="form-select" value={form.state} onChange={(e) => handle('state', e.target.value)}>
                        <option value="">Select</option>
                        {STATES.map((state) => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Postal Code</label>
                      <input className="form-control" inputMode="numeric" value={form.postal_code} onChange={onNumericChange('postal_code', 6)} placeholder="6-digit PIN" required />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Aadhaar</label>
                      <input className="form-control" inputMode="numeric" value={form.aadhar_no} onChange={onNumericChange('aadhar_no', 12)} placeholder="12-digit" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Religion</label>
                      <select className="form-select" value={form.religion} onChange={(e) => handle('religion', e.target.value)}>
                        <option value="">Select</option>
                        {RELIGIONS.map((religion) => (
                          <option key={religion} value={religion}>{religion}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Caste</label>
                      <select className="form-select" value={form.caste} onChange={(e) => handle('caste', e.target.value)}>
                        <option value="">Select</option>
                        {CASTES.map((caste) => (
                          <option key={caste} value={caste}>{caste}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Sub Caste</label>
                      <input className="form-control" value={form.sub_caste} onChange={(e) => handle('sub_caste', e.target.value)} />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Permanent Address</label>
                      <textarea className="form-control" rows="2" value={form.address} onChange={(e) => handle('address', e.target.value)} required />
                    </div>
                  </div>
                </div>

                <div className="application-section mb-3">
                  <h6 className="text-uppercase text-muted fw-bold small">Uploads</h6>
                  <div className="row g-3 mt-1">
                    <div className="col-md-6">
                      <label className="form-label">Photograph</label>
                      <input type="file" accept="image/*" className="form-control" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Certificates (PDF/Image)</label>
                      <input type="file" accept="application/pdf,image/*" className="form-control" onChange={(e) => setCert(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <button type="button" className="btn btn-outline-secondary" onClick={resetAll}>Clear</button>
                  <button className="btn btn-brand" disabled={loading || !isValid}>{loading ? 'Submitting...' : 'Submit Application'}</button>
                </div>
              </form>

              {msg && <div className="alert alert-info mt-3 mb-0">{msg}</div>}
            </div>
          </div>

        </div>
      </div>
    </AdminShell>
  )
}
