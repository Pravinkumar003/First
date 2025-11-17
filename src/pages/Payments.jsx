import AdminShell from '../components/AdminShell';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { api } from '../lib/mockApi';
import { validateRequiredFields } from '../lib/validation';
import { showToast } from '../store/ui';

export default function Payments() {
  // Master data states
  const [years, setYears] = useState([]);
  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [feeDefinitions, setFeeDefinitions] = useState([]);
  
  // Form state
  const [form, setForm] = useState({
    year: '',
    group: '',
    group_code: '',
    courseCode: '',
    semester: '',
    student_id: '',
    amount: '',
    method: 'CASH',
    reference: ''
  });
  
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [yearsData, groupsData, coursesData, studentsData, feesData] = await Promise.all([
        api.listAcademicYears?.(),
        api.listGroups?.(),
        api.listCourses?.(),
        api.listStudents?.(),
        api.listFees?.()
      ]);
      const normalizedYears = (yearsData || []).filter(year => year?.active !== false);
      const normalizedGroups = (groupsData || []).map(group => ({
        id: group.group_id ?? group.id,
        code: group.group_code,
        name: group.group_name
      }));
      const normalizedCourses = (coursesData || []).map(course => ({
        id: course.course_id ?? course.id,
        code: course.course_code || course.code,
        name: course.course_name || course.name,
        group_code: course.group_name || course.group_code || course.group_name,
        courseCode: course.course_code || course.code,
        courseName: course.course_name || course.name
      }));
      const normalizedStudents = (studentsData || []).map(student => ({
        ...student,
        academic_year: student.academic_year || '',
        group: student.group_name || '',
        group_code: student.group_code || student.group_name || '',
        course_code: student.course_name || '',
        semester: student.semester === undefined || student.semester === null ? '' : student.semester
      }));
      setYears(normalizedYears);
      setGroups(normalizedGroups);
      setCourses(normalizedCourses);
      setFeeDefinitions(feesData || []);
      setStudents(normalizedStudents);
    } catch (error) {
      console.error('Error loading payment masters:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const save = async () => {
    if (!validateRequiredFields({
      Student: form.student_id,
      Amount: form.amount
    }, { title: 'Missing payment details' })) return;
    const semesterNumber = form.semester ? Number(form.semester) : null;
    const selectedCourse = courses.find(c => (c.course_code || c.code) === form.courseCode);
    const courseName = selectedCourse?.course_name || selectedCourse?.courseName || '';
    const matchingFee = feeDefinitions.find(f =>
      f.academic_year === form.year &&
      f.group_name === form.group && f.group_name === (form.group || form.group_code) &&
      f.course_name === courseName &&
      Number(f.semester_number ?? f.semester) === semesterNumber
    );
    if (!matchingFee) {
      showToast('Define a fee structure first for this year/group/course/semester.', { type: 'warning', title: 'Missing fee definition' });
      return;
    }
    setSaving(true);
    try {
      const amountValue = Number(form.amount)
      const { error } = await supabase.from('student_payments').insert([{
        student_id: form.student_id,
        fee_id: matchingFee.id,
        amount_paid: amountValue,
        payment_date: new Date().toISOString(),
        payment_mode: form.method,
        remarks: form.reference || null
      }]);
      if (error) throw error;
      setForm({
        ...form,
        amount: '',
        reference: '',
        student_id: ''
      });
      showToast('Payment recorded successfully!', { type: 'success' });
      await loadData();
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
              <option key={y.id} value={y.academic_year || y.name}>
                {y.academic_year || y.name}
                </option>
              ))}
            </select>
          </div>

          {/* Group */}
          <div className="col-md-3">
            <label className="form-label fw-bold">Group</label>
            <select
              className="form-select"
              value={form.group_code}
              onChange={(e) => {
                const value = e.target.value
                const row = groups.find(g => String(g.code) === String(value) || String(g.group_code) === String(value))
                setForm(prev => ({
                  ...prev,
                  group: row?.name || row?.groupName || row?.group_name || value,
                  group_code: value,
                  courseCode: '',
                  semester: ''
                }))
              }}
              disabled={!form.year}
            >
              <option value="">Select Group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.code || g.group_code}>
                  {g.name || g.groupName || g.code || g.group_code}
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
                disabled={!form.group_code}
              >
              <option value="">Select Course</option>
                {courses
                  .filter((c) => !form.group_code || c.group_code === form.group_code || c.groupCode === form.group_code)
                  .map((c) => (
                    <option key={c.id} value={c.code || c.courseCode}>
                      {c.courseName || c.name}
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
                      if (!form.year && !form.group_code && !form.courseCode && !form.semester) return true;
                      return (
                        (!form.year || s.academic_year === form.year) &&
                        (!form.group_code || s.group_code === form.group_code) &&
                        (!form.courseCode || s.course_code === form.courseCode) &&
                        (!form.semester || String(s.semester) === String(form.semester))
                      );
                    })
                    .map(s => (
                      <option key={s.student_id} value={s.student_id}>
                        {s.student_id} - {s.full_name}
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

