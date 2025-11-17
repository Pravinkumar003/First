import AdminShell from '../components/AdminShell';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { api } from '../lib/mockApi';
import { validateRequiredFields } from '../lib/validation';
import { showToast } from '../store/ui';

export default function Payments() {
  // Master data
  const [years, setYears] = useState([]);
  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [feeDefinitions, setFeeDefinitions] = useState([]);

  // Form
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

      const normalizedYears = (yearsData || []).filter(y => y?.active !== false);

      const normalizedGroups = (groupsData || []).map(g => ({
        id: g.group_id ?? g.id,
        code: g.group_code ?? g.code,
        name: g.group_name ?? g.name
      }));

      const normalizedCourses = (coursesData || []).map(c => ({
        id: c.course_id ?? c.id,
        courseCode: c.course_code || c.code,
        courseName: c.course_name || c.name,
        group_code: c.group_code || c.group_name || c.groupCode,
        group_name: c.group_name || c.groupCode
      }));

      const normalizedStudents = (studentsData || []).map(s => ({
        ...s,
        academic_year: s.academic_year || '',
        group_name: s.group_name || s.group || s.group_code || '',
        group: s.group_name || s.group || s.group_code || '',
        group_code: s.group_code || s.group || s.group_name || '',
        course_name: s.course_name || s.course_id || s.courseCode || '',
        course_code: s.course_code || s.course_name || s.course_id || '',
        semester: s.semester ?? s.semester_number ?? ''
      }));

      setYears(normalizedYears);
      setGroups(normalizedGroups);
      setCourses(normalizedCourses);
      setStudents(normalizedStudents);
      setFeeDefinitions(feesData || []);
    } catch (e) {
      console.error("Error loading payment masters:", e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const save = async () => {
    if (!validateRequiredFields(
      { Student: form.student_id, Amount: form.amount },
      { title: "Missing payment details" }
    )) return;

    const selectedCourse = courses.find(c => c.courseCode === form.courseCode);
    const courseName = selectedCourse?.courseName || "";

    const semesterNumber = form.semester ? Number(form.semester) : null;
    const groupKey = form.group_code || form.group;
    const courseKey = form.courseCode || courseName;

    const matchingFee = feeDefinitions.find(f => {
      if (f.academic_year !== form.year) return false;
      if (semesterNumber !== Number(f.semester_number ?? f.semester)) return false;
      if (groupKey) {
        const availableGroupValues = [f.group, f.group_code, f.group_name];
        if (!availableGroupValues.some(val => val && val === groupKey)) return false;
      }
      if (courseKey) {
        const availableCourseValues = [f.course_name, f.course_code, courseName];
        if (!availableCourseValues.some(val => val && val === courseKey)) return false;
      }
      return true;
    });

    if (!matchingFee) {
      showToast("Define fee structure first for this year/group/course/semester.", {
        type: "warning",
        title: "Missing fee definition",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("student_payments").insert([
        {
          student_id: form.student_id,
          fee_id: matchingFee.id,
          amount_paid: Number(form.amount),
          payment_date: new Date().toISOString(),
          payment_mode: form.method,
          remarks: form.reference || null
        }
      ]);

      if (error) throw error;

      setForm({
        ...form,
        student_id: "",
        amount: "",
        reference: ""
      });

      showToast("Payment recorded successfully!", { type: "success" });
      await loadData();
    } catch (e) {
      console.error("Error saving payment:", e);
      showToast("Failed to record payment. Try again.", { type: "danger" });
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
              onChange={e =>
                setForm({
                  ...form,
                  year: e.target.value,
                  group: "",
                  group_code: "",
                  courseCode: "",
                  semester: "",
                  student_id: ""
                })
              }
            >
              <option value="">Select Year</option>
              {years.map(y => (
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
              value={form.group_code}
              onChange={e => {
                const value = e.target.value;
                const row = groups.find(g => g.code === value || g.group_code === value);

                setForm(prev => ({
                  ...prev,
                  group: row?.name || "",
                  group_code: row?.code || value,
                  courseCode: "",
                  semester: "",
                  student_id: ""
                }));
              }}
            >
              <option value="">Select Group</option>
              {groups.map(g => (
                <option key={g.id} value={g.code}>
                  {g.name}
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
              disabled={!form.group_code}
              onChange={e => setForm({ ...form, courseCode: e.target.value, semester: "" })}
            >
              <option value="">Select Course</option>

              {courses
                .filter(c => {
                  if (!form.group_code) return true;
                  return (
                    c.group_code === form.group_code ||
                    c.group_name === form.group_code ||
                    c.groupCode === form.group_code
                  );
                })
                .map(c => (
                  <option key={c.id} value={c.courseCode}>
                    {c.courseName}
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
              disabled={!form.courseCode}
              onChange={e => setForm({ ...form, semester: e.target.value })}
            >
              <option value="">Select Semester</option>
              {[1, 2, 3, 4, 5, 6].map(n => (
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

          {/* Student */}
          <div className="col-md-4">
            <label className="form-label fw-bold">Student</label>
            <select
              className="form-select"
              value={form.student_id}
              onChange={e => setForm({ ...form, student_id: e.target.value })}
            >
              <option value="">Select Student</option>

              {students
                .filter(s => {
                  const matchesYear = !form.year || s.academic_year === form.year;
                  const matchesGroup = !form.group_code || [s.group_code, s.group, s.group_name].includes(form.group_code);
                  const matchesCourse = !form.courseCode || [s.course_code, s.course_name, s.course_id].includes(form.courseCode);
                  const matchesSemester = !form.semester || !s.semester || String(s.semester) === String(form.semester);
                  return matchesYear && matchesGroup && matchesCourse && matchesSemester;
                })
                .map(s => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.student_id} - {s.full_name}
                  </option>
                ))}
            </select>
          </div>

          {/* Amount */}
          <div className="col-md-2">
            <label className="form-label fw-bold">Amount (INR)</label>
            <input
              type="number"
              className="form-control"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              placeholder="Amount"
            />
          </div>

          {/* Method */}
          <div className="col-md-3">
            <label className="form-label fw-bold">Payment Method</label>
            <select
              className="form-select"
              value={form.method}
              onChange={e => setForm({ ...form, method: e.target.value })}
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="NETBANKING">Net Banking</option>
            </select>
          </div>

          {/* Reference */}
          <div className="col-md-3">
            <label className="form-label fw-bold">Reference</label>
            <input
              className="form-control"
              value={form.reference}
              onChange={e => setForm({ ...form, reference: e.target.value })}
              placeholder="Reference (optional)"
            />
          </div>
        </div>

        <div className="mt-3 d-flex justify-content-end">
          <button className="btn btn-brand" disabled={saving} onClick={save}>
            {saving ? "Saving..." : "Add Payment"}
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
