import AdminShell from '../components/AdminShell';
import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { validateRequiredFields } from '../lib/validation';
import { showToast } from '../store/ui';

export default function Payments() {
  // Master data states
  const [years, setYears] = useState([]);
  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  
  // Form state
  const [form, setForm] = useState({
    year: '',
    group: '',
    courseCode: '',
    semester: '',
    student_id: '',
    amount: '',
    method: 'CASH',
    reference: ''
  });
  
  const [saving, setSaving] = useState(false);

  // Load master data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch academic years
        const { data: yearsData, error: yearsError } = await supabase
          .from('academic_year')
          .select('*')
          .order('academic_year', { ascending: false });

        // Fetch groups
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('*')
          .order('code');

        // Fetch courses with group data
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .order('name');

        // Fetch students with related data
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select(`
            *,
            course:course_code (code, name),
            group:group_code (code)
          `);

        if (yearsError) throw yearsError;
        if (groupsError) throw groupsError;
        if (coursesError) throw coursesError;
        if (studentsError) throw studentsError;

        // Transform data to match expected format
        const formattedStudents = (studentsData || []).map(student => ({
          ...student,
          course_code: student.course?.code || student.course_code || '',
          group: student.group?.code || student.group || '',
          academic_year: student.academic_year || '',
          semester: student.semester || ''
        }));

        const activeYears = (yearsData || []).filter((year) =>
          year.status === undefined ? true : Boolean(year.status)
        );
        setYears(activeYears);
        setGroups(groupsData || []);
        setCourses(coursesData || []);
        setStudents(formattedStudents);
      } catch (error) {
        console.error('Error loading data from Supabase:', error);
      }
    };

    loadData();
  }, []);

  const save = async () => {
    if (!validateRequiredFields({
      Student: form.student_id,
      Amount: form.amount
    }, { title: 'Missing payment details' })) return;
    setSaving(true);
    
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([
          {
            student_id: form.student_id,
            amount: Number(form.amount),
            payment_method: form.method,
            reference: form.reference || null,
            academic_year: form.year,
            semester: form.semester,
            payment_date: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      // Reset form
      setForm({
        ...form,
        amount: '',
        reference: '',
        student_id: ''
      });
      
      // Show success message or update UI as needed
      showToast('Payment recorded successfully!', { type: 'success' });
    } catch (error) {
      console.error('Error saving payment:', error);
      showToast('Failed to record payment. Please try again.', { type: 'danger' });
    } finally {
      setSaving(false);
    }
  };
  return (
    <AdminShell>
      <h2 className="fw-bold mb-3">Record Payment</h2>
      
      {/* Filter Section */}
      <div className="card card-soft p-3 mb-4">
        <h4 className="fw-bold mb-3">Filter Students</h4>
        <div className="row g-3">
          {/* Academic Year */}
          <div className="col-md-3">
            <label className="form-label fw-bold">Academic Year</label>
            <select
              className="form-select"
              value={form.year}
              onChange={(e) => setForm({
                ...form, 
                year: e.target.value, 
                group: '', 
                courseCode: '', 
                semester: ''
              })}
            >
              <option value="">Select Year</option>
              {years.map((y) => (
                <option key={y.id} value={y.academic_year}>
                  {y.academic_year}
                </option>
              ))}
            </select>
          </div>

          {/* Group */}
          <div className="col-md-3">
            <label className="form-label fw-bold">Group</label>
            <select
              className="form-select"
              value={form.group}
              onChange={(e) =>
                setForm({ 
                  ...form, 
                  group: e.target.value, 
                  courseCode: '', 
                  semester: '' 
                })
              }
              disabled={!form.year}
            >
              <option value="">Select Group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.code}>
                  {g.code}
                </option>
              ))}
            </select>
          </div>

          {/* Course */}
          <div className="col-md-3">
            <label className="form-label fw-bold">Course</label>
            <select
              className="form-select"
              value={form.courseCode}
              onChange={(e) =>
                setForm({ 
                  ...form, 
                  courseCode: e.target.value, 
                  semester: '' 
                })
              }
              disabled={!form.group}
            >
              <option value="">Select Course</option>
              {courses
                .filter((c) => !form.group || c.group_code === form.group)
                .map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Semester */}
          <div className="col-md-3">
            <label className="form-label fw-bold">Semester</label>
            <select
              className="form-select"
              value={form.semester}
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
              disabled={!form.courseCode}
            >
              <option value="">Select Semester</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  Sem {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div className="card card-soft p-3">
        <div className="row g-2">
          <div className="col-md-4">
            <label className="form-label fw-bold">Student</label>
            <select 
              className="form-select" 
              required
              value={form.student_id} 
              onChange={e => setForm({...form, student_id: e.target.value})}
            >
              <option value="">Select Student</option>
              {students
                .filter(s => {
                  if (!form.year && !form.group && !form.courseCode && !form.semester) return true;
                  return (
                    (!form.year || s.academic_year === form.year) &&
                    (!form.group || s.group === form.group) &&
                    (!form.courseCode || s.course_code === form.courseCode) &&
                    (!form.semester || s.semester === form.semester)
                  );
                })
                .map(s => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.student_id} — {s.full_name}
                  </option>
                ))}
            </select>
          </div>
          
          <div className="col-md-2">
            <label className="form-label fw-bold">Amount (INR)</label>
            <input 
              type="number" 
              className="form-control" 
              required
              placeholder="Amount" 
              value={form.amount} 
              onChange={e => setForm({...form, amount: e.target.value})} 
            />
          </div>
          
          <div className="col-md-3">
            <label className="form-label fw-bold">Payment Method</label>
            <select 
              className="form-select" 
              value={form.method} 
              onChange={e => setForm({...form, method: e.target.value})}
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="NETBANKING">Net Banking</option>
            </select>
          </div>
          
          <div className="col-md-3">
            <label className="form-label fw-bold">Reference</label>
            <input 
              className="form-control" 
              placeholder="Reference (optional)" 
              value={form.reference} 
              onChange={e => setForm({...form, reference: e.target.value})} 
            />
          </div>
        </div>
        
        <div className="mt-3 d-flex justify-content-end">
          <button 
            className="btn btn-brand" 
            disabled={saving} 
            onClick={save}
          >
            {saving ? 'Saving...' : 'Add Payment'}
          </button>
        </div>
      </div>
    </AdminShell>
  )
}

