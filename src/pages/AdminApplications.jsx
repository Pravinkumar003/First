import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/mockApi'
import { supabase } from '../../supabaseClient'
import AdminShell from '../components/AdminShell'

export default function PublicApply() {
  // dropdown option masters (can be moved to Setup later)
  const GENDERS = ['Male','Female','Other']
  const CASTES = ['General','OBC','SC','ST','Others']
  const RELIGIONS = ['Hindu','Muslim','Christian','Sikh','Buddhist','Jain','Others']
  const STATES = ['Tamil Nadu','Andhra Pradesh','Karnataka','Kerala','Telangana','Maharashtra','Other']

  const [form, setForm] = useState({
    student_id:'', ht_no:'', academic_year:'',
    group:'', course_id:'',
    full_name:'', gender:'', dob:'', father_name:'', mother_name:'',
    nationality:'', state:'', aadhar_no:'', postal_code:'', address:'',
    mobile:'', email:'', religion:'', caste:'', sub_caste:''
  })
  const [photo, setPhoto] = useState(null)
  const [cert, setCert] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [courses, setCourses] = useState([])
  const [groups, setGroups] = useState([])
  const [years, setYears] = useState([])
  const handle = (k,v)=> setForm(p=>({...p,[k]:v}))

  useEffect(()=>{ (async()=>{
    try {
      const [cs, gs, ys] = await Promise.all([
        api.listCourses(),
        api.listGroups?.() || [],
        api.listAcademicYears?.() || []
      ])
      console.log('Loaded courses:', cs); // Debug log
      setCourses(cs||[]); 
      setGroups(gs||[]); 
      setYears(ys||[])
    } catch { setCourses([]); setGroups([]); setYears([]) }
  })() }, [])

  const resetAll = () => {
    setForm({ student_id:'', ht_no:'', academic_year:'', group:'', course_id:'', full_name:'', gender:'', dob:'', father_name:'', mother_name:'', nationality:'', state:'', aadhar_no:'', postal_code:'', address:'', mobile:'', email:'', religion:'', caste:'', sub_caste:'' })
    setPhoto(null); setCert(null)
  }

  const isDigits = (val, len) => new RegExp(`^\\d{${len}}$`).test(val)
  const isValid = useMemo(()=>{
    return !!(
      form.academic_year &&
      form.full_name && form.gender && form.dob &&
      form.mobile && isDigits(form.mobile,10) &&
      form.postal_code && isDigits(form.postal_code,6) &&
      (!form.aadhar_no || isDigits(form.aadhar_no,12)) &&
      form.address &&
      form.group && form.course_id
    )
  },[form])

  const onNumericChange = (key, max) => (e) => {
    const v = (e.target.value || '').replace(/\D/g, '').slice(0, max)
    handle(key, v)
  }

  const submit = async (e) => {
    e.preventDefault(); 
    setMsg(''); 
    setLoading(true);
    
    try {
      console.log('Form course_id:', form.course_id); // Debug log
      console.log('Available courses:', courses); // Debug log
      
      // Check if course is selected and get course details
      const selectedCourse = courses.find(c => c.id == form.course_id); // Use loose equality
      console.log('Selected course:', selectedCourse); // Debug log
      
      if (!selectedCourse) {
        console.error('No course found with id:', form.course_id);
        throw new Error('Please select a valid course');
      }
      
      // Use courseCode or fall back to code if available
      const courseCode = selectedCourse.courseCode || selectedCourse.code;
      console.log('Using course code:', courseCode); // Debug log
      
      if (!courseCode) {
        console.error('Course is missing course code:', selectedCourse);
        throw new Error('Selected course is missing a course code');
      }

      // Prepare student data for Supabase
      const studentData = {
        student_id: form.student_id || `STU${Date.now().toString().slice(-6)}`,
        hall_ticket_no: form.ht_no || null,
        academic_year: form.academic_year,
        group_name: form.group,
        course_name: courseCode, // Use the determined course code
        Student_name: form.full_name, // New column for student name
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
      };

      // Save to Supabase
      const { data, error } = await supabase
        .from('students')
        .insert([studentData])
        .select();

      if (error) throw error;

      setMsg('Student information saved successfully!');
      resetAll();
    } catch (err) { 
      console.error('Error saving student:', err);
      setMsg(err.message || 'Error saving student information'); 
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <AdminShell>
      <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card card-soft p-4">
            <div className="d-flex align-items-center gap-2 mb-2">
              <img src="/logo-placeholder.png" className="brand-logo" alt="logo" />
              <div><h3 className="fw-bold mb-0">Vijayam College of Arts & Science</h3><div className="text-muted">Chennai</div></div>
            </div>
            <h5 className="mt-3">Apply for Admission / Exam</h5>
            <form onSubmit={submit}>
              <div className="row g-3">
                <div className="col-12"><h6 className="fw-bold mb-1">Student & Admission</h6><hr className="hr-soft" /></div>
                <div className="col-md-3"><label className="form-label">Student ID</label><input className="form-control" value={form.student_id} onChange={e=>handle('student_id',e.target.value)} placeholder="Auto/Optional" /></div>
                <div className="col-md-3"><label className="form-label">Hall Ticket No</label><input className="form-control" value={form.ht_no} onChange={e=>handle('ht_no',e.target.value)} /></div>
                <div className="col-md-3"><label className="form-label">Academic Year</label><select className="form-select" value={form.academic_year} onChange={e=>handle('academic_year',e.target.value)} required><option value="">Select</option>{years.map(y=> (<option key={y.id} value={y.name}>{y.name}{y.active? ' (Active)':''}</option>))}</select></div>

                <div className="col-12"><h6 className="fw-bold mb-1">Group & Course</h6><hr className="hr-soft" /></div>
                <div className="col-md-4"><label className="form-label">Group Code</label><select className="form-select" value={form.group} onChange={e=>handle('group',e.target.value)} required><option value="">Select Group</option>{groups.map(g=> (<option key={g.id} value={g.code}>{g.code} — {g.name}</option>))}</select></div>
                <div className="col-md-12">
                  <label className="form-label">Course</label>
                  <select 
                    className="form-select" 
                    value={form.course_id} 
                    onChange={e => handle('course_id', e.target.value)} 
                    required
                  >
                    <option value="">Select Course</option>
                    {courses
                      .filter(c => !form.group || !c.groupCode || c.groupCode === form.group)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.courseCode ? `${c.courseCode} - ${c.courseName || c.name || ''}` : (c.name || '')}
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div className="col-12"><h6 className="fw-bold mb-1">Personal Details</h6><hr className="hr-soft" /></div>
                <div className="col-md-6"><label className="form-label">Full Name</label><input className="form-control" value={form.full_name} onChange={e=>handle('full_name',e.target.value)} required /></div>
                <div className="col-md-3"><label className="form-label">Gender</label><select className="form-select" value={form.gender} onChange={e=>handle('gender',e.target.value)} required><option value="">Select</option>{GENDERS.map(g=> <option key={g} value={g}>{g}</option>)}</select></div>
                <div className="col-md-3"><label className="form-label">DOB</label><input type="date" className="form-control" value={form.dob} onChange={e=>handle('dob',e.target.value)} required /></div>
                <div className="col-md-6"><label className="form-label">Father's Name</label><input className="form-control" value={form.father_name} onChange={e=>handle('father_name',e.target.value)} /></div>
                <div className="col-md-6"><label className="form-label">Mother's Name</label><input className="form-control" value={form.mother_name} onChange={e=>handle('mother_name',e.target.value)} /></div>

                <div className="col-12"><h6 className="fw-bold mb-1">Contact & Address</h6><hr className="hr-soft" /></div>
                <div className="col-md-3"><label className="form-label">Mobile</label><input className="form-control" inputMode="tel" maxLength="10" pattern="[0-9]{10}" title="Please enter a valid 10-digit mobile number" value={form.mobile} onChange={onNumericChange('mobile',10)} required /></div>
                <div className="col-md-3"><label className="form-label">Email</label><input type="email" className="form-control" value={form.email} onChange={e=>handle('email',e.target.value)} /></div>
                <div className="col-md-3"><label className="form-label">Nationality</label><input className="form-control" value={form.nationality} onChange={e=>handle('nationality',e.target.value)} /></div>
                <div className="col-md-3"><label className="form-label">State</label><select className="form-select" value={form.state} onChange={e=>handle('state',e.target.value)}><option value="">Select</option>{STATES.map(s=> <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="col-md-4"><label className="form-label">Aadhar No</label><input className="form-control" inputMode="numeric" maxLength="12" pattern="[0-9]{12}" title="Please enter a valid 12-digit Aadhaar number" placeholder="12 digits" value={form.aadhar_no} onChange={onNumericChange('aadhar_no',12)} /></div>
                <div className="col-md-4"><label className="form-label">Postal Code (PIN)</label><input className="form-control" inputMode="numeric" maxLength="6" pattern="[0-9]{6}" title="Please enter a valid 6-digit PIN code" placeholder="6 digits" value={form.postal_code} onChange={onNumericChange('postal_code',6)} required /></div>
                <div className="col-md-4"><label className="form-label">Religion</label><select className="form-select" value={form.religion} onChange={e=>handle('religion',e.target.value)}><option value="">Select</option>{RELIGIONS.map(r=> <option key={r} value={r}>{r}</option>)}</select></div>
                <div className="col-md-4"><label className="form-label">Caste</label><select className="form-select" value={form.caste} onChange={e=>handle('caste',e.target.value)}><option value="">Select</option>{CASTES.map(c=> <option key={c} value={c}>{c}</option>)}</select></div>
                <div className="col-md-4"><label className="form-label">Sub Caste</label><input className="form-control" value={form.sub_caste} onChange={e=>handle('sub_caste',e.target.value)} /></div>
                <div className="col-12"><label className="form-label">Address</label><textarea className="form-control" rows="2" value={form.address} onChange={e=>handle('address',e.target.value)} required></textarea></div>
                <div className="col-md-4"><label className="form-label">Postal code</label><input className="form-control" inputMode="numeric" maxLength="6" pattern="[0-9]{6}" title="Please enter a valid 6-digit PIN code" placeholder="6 digits" value={form.postal_code} onChange={onNumericChange('postal_code',6)} required /></div>

                <div className="col-12"><h6 className="fw-bold mb-1">Uploads</h6><hr className="hr-soft" /></div>
                <div className="col-md-6"><label className="form-label">Upload Photo</label><input type="file" accept="image/*" className="form-control" onChange={e=>setPhoto(e.target.files?.[0]||null)} /></div>

                <div className="col-12 d-flex justify-content-end gap-2 mt-2">
                  <button type="button" className="btn btn-outline-secondary" onClick={resetAll}>Clear</button>
                  <button className="btn btn-brand" disabled={loading || !isValid}>{loading?'Submitting...':'Submit'}</button>
                </div>
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
