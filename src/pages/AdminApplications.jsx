import { useEffect, useState } from 'react'
import { api } from '../lib/mockApi'
import { supabase } from '../../supabaseClient'
import AdminShell from '../components/AdminShell'
import crestPrimary from '../assets/media/images.png'
import { validateRequiredFields } from '../lib/validation'
import { showToast } from '../store/ui'

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
    group_code: '',
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

  const [form, setForm] = useState({ ...initialForm, course_name: '' })
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
        setYears((ys || []).filter(year => year?.active !== false))
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

  const submit = async (event) => {
    event.preventDefault()
    setMsg('')
    const requiredFields = {
      'Academic Year': form.academic_year,
      'Group': form.group,
      'Course': form.course_id,
      'Full Name': form.full_name,
      'Gender': form.gender,
      'Date of Birth': form.dob,
      'Mobile Number': form.mobile,
      'Postal Code': form.postal_code,
      'Address': form.address
    }
    if (!validateRequiredFields(requiredFields, { title: 'Incomplete application' })) return
    if (!isDigits(form.mobile, 10)) {
      showToast('Enter a valid 10-digit mobile number.', { type: 'warning', title: 'Invalid mobile' })
      return
    }
    if (!isDigits(form.postal_code, 6)) {
      showToast('Postal code must be 6 digits.', { type: 'warning', title: 'Invalid postal code' })
      return
    }
    if (form.aadhar_no && !isDigits(form.aadhar_no, 12)) {
      showToast('Aadhar number must contain 12 digits.', { type: 'warning', title: 'Invalid Aadhar' })
      return
    }

    setLoading(true)
    try {
      const selectedCourse = courses.find((course) => String(course.id || course.course_id) === String(form.course_id))
      if (!selectedCourse) throw new Error('Select a valid course')

      const courseCode = selectedCourse.courseCode || selectedCourse.code
      if (!courseCode) throw new Error('Selected course is missing a course code reference')
      const courseLabel = form.course_name || selectedCourse.courseName || selectedCourse.course_name || ''

      const payload = {
        student_id: form.student_id || `STU${Date.now().toString().slice(-6)}`,
        hall_ticket_no: form.ht_no || null,
        academic_year: form.academic_year,
          group_name: form.group_code || form.group,
          course_name: courseCode,
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
      <div className="desktop-container" style={{ overflowX: 'hidden' }}>
        <section className="setup-hero mb-4 text-center">
          <div className="setup-hero-copywrap mx-auto text-center" style={{ maxWidth: '640px' }}>
            <div className="admin-applications__crest mx-auto" aria-hidden="true">
              <img src={crestPrimary} alt="Vijayam crest" />
            </div>
            <h3 className="setup-hero-title mb-2">Vijayam Arts & Science College</h3>
            <p className="setup-hero-copy mb-3">Collect, verify, and onboard applicants with confidence.</p>
            <div className="setup-hero-chips d-flex flex-wrap gap-2 justify-content-center">
              <span className="setup-hero-chip text-uppercase">SMART EXAMINATION PLATFORM</span>
              <span className="setup-hero-chip text-uppercase">ADMISSIONS CONTROL</span>
              <span className="setup-hero-chip text-uppercase">APPLICATIONS ADMIN CONSOLE</span>
            </div>
          </div>
        </section>

        <div className="row g-4 justify-content-center mx-0">
          <div className="col-12 col-lg-11 col-xl-10">
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
                          <option key={year.id} value={year.academic_year || year.name}>
                            {year.academic_year || year.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Group</label>
                      <select
                        className="form-select"
                        value={form.group_code || form.group}
                        onChange={(e) => {
                          const value = e.target.value
                          const selected = groups.find(group => group.code === value || group.group_code === value)
                          handle('group', selected?.name || selected?.group_name || selected?.code || value)
                          setForm(prev => ({ ...prev, group_code: value }))
                        }}
                        required
                      >
                        <option value="">Select</option>
                        {groups.map((group) => (
                          <option key={group.id || group.group_id} value={group.code || group.group_code}>
                            {group.name || group.group_name || 'Group'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Course</label>
                      <select
                        className="form-select"
                        value={form.course_id}
                        onChange={(e) => {
                          const selected = courses.find(course => String(course.id || course.course_id) === String(e.target.value))
                          setForm(prev => ({
                            ...prev,
                            course_id: e.target.value,
                            course_name: selected?.courseName || selected?.course_name || selected?.name || ''
                          }))
                        }}
                        required
                      >
                        <option value="">Select</option>
                        {courses
                          .filter(course => !form.group_code || String(course.group_code) === String(form.group_code))
                          .map((course) => (
                            <option key={course.id || course.course_id} value={course.id || course.course_id}>
                              {course.name || course.courseName || course.course_name}
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
                      <label className="form-label">Signature</label>
                      <input type="file" accept="application/pdf,image/*" className="form-control" onChange={(e) => setCert(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <button type="button" className="btn btn-outline-secondary" onClick={resetAll}>Clear</button>
                  <button className="btn btn-brand" disabled={loading}>{loading ? 'Submitting...' : 'Submit Application'}</button>
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
