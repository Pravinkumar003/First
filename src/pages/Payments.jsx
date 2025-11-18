import AdminShell from "../components/AdminShell";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import { api } from "../lib/mockApi";
import { validateRequiredFields } from "../lib/validation";
import { showToast } from "../store/ui";

export default function Payments() {
  // Master data
  const [years, setYears] = useState([]);
  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [feeDefinitions, setFeeDefinitions] = useState([]);

  // Form
  const [form, setForm] = useState({
    year: "",
    group: "",
    group_code: "",
    courseCode: "",
    semester: "",
    student_id: "",
    amount: "",
    method: "CASH",
    reference: "",
  });
  const [displayCount, setDisplayCount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [saving, setSaving] = useState(false);

  const [activePaymentStudent, setActivePaymentStudent] = useState(null);
  const [subjectSelection, setSubjectSelection] = useState({});
  const [quickPaymentAmount, setQuickPaymentAmount] = useState("");

  const hasActiveFilters = Boolean(
    form.year || form.group_code || form.courseCode || form.semester
  );

  const firstDefined = (...values) =>
    values.find(
      (value) => value !== undefined && value !== null && value !== ""
    );

  const getMatchedGroup = (student) =>
    groups.find(
      (g) =>
        g.code === student.group_code ||
        g.code === student.group ||
        g.code === student.group_name ||
        g.name === student.group ||
        g.name === student.group_name
    );

  const getMatchedCourse = (student) =>
    courses.find(
      (c) =>
        c.courseCode === student.course_code ||
        c.courseCode === student.course_name ||
        c.courseCode === student.courseCode ||
        c.courseName === student.course_name ||
        c.courseName === student.courseCode
    );

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesYear = !form.year || s.academic_year === form.year;
      const matchesGroup =
        !form.group_code ||
        [s.group_code, s.group, s.group_name].includes(form.group_code);
      const matchesCourse =
        !form.courseCode ||
        [s.course_code, s.course_name, s.course_id].includes(form.courseCode);
      const matchesSemester =
        !form.semester ||
        !s.semester ||
        String(s.semester) === String(form.semester);
      return matchesYear && matchesGroup && matchesCourse && matchesSemester;
    });
  }, [students, form.year, form.group_code, form.courseCode, form.semester]);

  const subjectsForActiveStudent = useMemo(() => {
    if (!activePaymentStudent) return [];
    const { course_code, course_name, courseCode, course, semester } =
      activePaymentStudent;
    const courseValues = new Set(
      [course_code, course_name, courseCode, course].filter(Boolean)
    );
    const semesterValue =
      semester === "" || semester === undefined || semester === null
        ? null
        : Number(semester);

    return subjects.filter((subject) => {
      const matchesCourse =
        courseValues.size === 0 ||
        courseValues.has(subject.courseCode) ||
        courseValues.has(subject.courseName);
      const subjectSemester =
        subject.semester === "" ||
        subject.semester === undefined ||
        subject.semester === null
          ? null
          : Number(subject.semester);
      const matchesSemester =
        semesterValue === null ||
        subjectSemester === null ||
        semesterValue === subjectSemester;
      return matchesCourse && matchesSemester;
    });
  }, [
    subjects,
    activePaymentStudent?.student_id,
    activePaymentStudent?.course_code,
    activePaymentStudent?.course_name,
    activePaymentStudent?.courseCode,
    activePaymentStudent?.course,
    activePaymentStudent?.semester,
  ]);

  const selectedSubjectCount = Object.values(subjectSelection || {}).filter(
    Boolean
  ).length;
  const hasSelectedSubjects = selectedSubjectCount > 0;

  useEffect(() => {
    setSubjectSelection({});
    setQuickPaymentAmount("");
  }, [activePaymentStudent?.student_id]);

  const loadData = useCallback(async () => {
    try {
      const [
        yearsData,
        groupsData,
        coursesData,
        studentsData,
        feesData,
        subjectsData,
      ] = await Promise.all([
        api.listAcademicYears?.(),
        api.listGroups?.(),
        api.listCourses?.(),
        api.listStudents?.(),
        api.listFees?.(),
        api.listSubjects?.(),
      ]);

      const normalizedYears = (yearsData || []).filter(
        (y) => y?.active !== false
      );

      const normalizedGroups = (groupsData || []).map((g) => ({
        id: g.group_id ?? g.id,
        code: g.group_code ?? g.code,
        name: g.group_name ?? g.name,
      }));

      const normalizedCourses = (coursesData || []).map((c) => ({
        id: c.course_id ?? c.id,
        courseCode: c.course_code || c.code,
        courseName: c.course_name || c.name,
        group_code: c.group_code || c.group_name || c.groupCode,
        group_name: c.group_name || c.groupCode,
      }));

      const normalizedStudents = (studentsData || []).map((s) => ({
        ...s,
        academic_year: s.academic_year || "",
        group_name: s.group_name || s.group || s.group_code || "",
        group: s.group_name || s.group || s.group_code || "",
        group_code: s.group_code || s.group || s.group_name || "",
        course_name: s.course_name || s.course_id || s.courseCode || "",
        course_code: s.course_code || s.course_name || s.course_id || "",
        semester: s.semester ?? s.semester_number ?? "",
      }));

      setYears(normalizedYears);
      setGroups(normalizedGroups);
      setCourses(normalizedCourses);
      setStudents(normalizedStudents);
      setSubjects(subjectsData || []);
      setFeeDefinitions(feesData || []);
    } catch (e) {
      console.error("Error loading payment masters:", e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const save = async (override = {}) => {
    const payload = { ...form };
    Object.entries(override).forEach(([key, value]) => {
      if (value !== undefined) {
        payload[key] = value;
      }
    });

    if (
      !validateRequiredFields(
        { Student: payload.student_id, Amount: payload.amount },
        { title: "Missing payment details" }
      )
    )
      return false;

    const selectedCourse = courses.find(
      (c) => c.courseCode === payload.courseCode
    );
    const courseName = selectedCourse?.courseName || payload.courseName || "";

    const semesterNumber = payload.semester ? Number(payload.semester) : null;
    const groupKey = payload.group_code || payload.group;
    const courseKey = payload.courseCode || courseName;

    const matchingFee = feeDefinitions.find((f) => {
      if (f.academic_year !== payload.year) return false;
      if (semesterNumber !== Number(f.semester_number ?? f.semester))
        return false;
      if (groupKey) {
        const availableGroupValues = [f.group, f.group_code, f.group_name];
        if (!availableGroupValues.some((val) => val && val === groupKey))
          return false;
      }
      if (courseKey) {
        const availableCourseValues = [
          f.course_name,
          f.course_code,
          courseName,
        ];
        if (!availableCourseValues.some((val) => val && val === courseKey))
          return false;
      }
      return true;
    });

    if (!matchingFee) {
      showToast(
        "Define fee structure first for this year/group/course/semester.",
        {
          type: "warning",
          title: "Missing fee definition",
        }
      );
      return false;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("student_payments").insert([
        {
          student_id: payload.student_id,
          fee_id: matchingFee.id,
          amount_paid: Number(payload.amount),
          payment_date: new Date().toISOString(),
          payment_mode: payload.method,
          remarks: payload.reference || null,
        },
      ]);

      if (error) throw error;

      setForm({
        ...form,
        student_id: "",
        amount: "",
        reference: "",
      });

      showToast("Payment recorded successfully!", { type: "success" });
      await loadData();
      return true;
    } catch (e) {
      console.error("Error saving payment:", e);
      showToast("Failed to record payment. Try again.", { type: "danger" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handlePayNowClick = (student) => {
    setActivePaymentStudent((prev) =>
      prev?.student_id === student.student_id ? null : student
    );
  };

  const toggleSubjectSelection = (subjectId) => {
    setSubjectSelection((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));
  };

  const handleQuickPayment = async () => {
    if (!activePaymentStudent) return;
    if (!hasSelectedSubjects) {
      showToast("Select at least one subject before paying.", {
        type: "warning",
      });
      return;
    }
    if (!quickPaymentAmount || Number(quickPaymentAmount) <= 0) {
      showToast("Enter a valid payment amount.", { type: "warning" });
      return;
    }

    const selectedSubjectNames = subjectsForActiveStudent
      .filter((subject) => subjectSelection[subject.id])
      .map((subject) => subject.subjectName)
      .filter(Boolean);

    const matchedGroup = getMatchedGroup(activePaymentStudent);
    const matchedCourse = getMatchedCourse(activePaymentStudent);
    const resolvedYear = firstDefined(
      form.year,
      activePaymentStudent.academic_year,
      activePaymentStudent.year
    );
    const resolvedGroupCode = firstDefined(
      form.group_code,
      activePaymentStudent.group_code,
      matchedGroup?.code
    );
    const resolvedGroupName = firstDefined(
      form.group,
      activePaymentStudent.group_name,
      activePaymentStudent.group,
      matchedGroup?.name
    );
    const resolvedCourseCode = firstDefined(
      form.courseCode,
      activePaymentStudent.course_code,
      activePaymentStudent.courseCode,
      matchedCourse?.courseCode
    );
    const resolvedCourseName = firstDefined(
      activePaymentStudent.course_name,
      activePaymentStudent.courseName,
      matchedCourse?.courseName
    );
    const resolvedSemester = firstDefined(
      form.semester,
      activePaymentStudent.semester
    );

    const override = {
      student_id: activePaymentStudent.student_id,
      amount: quickPaymentAmount,
      ...(resolvedYear ? { year: resolvedYear } : {}),
      ...(resolvedGroupCode ? { group_code: resolvedGroupCode } : {}),
      ...(resolvedGroupName ? { group: resolvedGroupName } : {}),
      ...(resolvedCourseCode ? { courseCode: resolvedCourseCode } : {}),
      ...(resolvedCourseName ? { courseName: resolvedCourseName } : {}),
      ...(resolvedSemester !== undefined
        ? { semester: String(resolvedSemester) }
        : {}),
      ...(selectedSubjectNames.length
        ? { reference: `Subjects: ${selectedSubjectNames.join(", ")}` }
        : {}),
    };

    const success = await save(override);

    if (success) {
      setActivePaymentStudent(null);
      setSubjectSelection({});
      setQuickPaymentAmount("");
    }
  };

  const matchedStudentCount = hasActiveFilters ? filteredStudents.length : 0;

  const filteredBySearch = searchTerm
    ? filteredStudents.filter((student) => {
        const key = `${student.student_id} ${
          student.full_name || student.name || ""
        }`.toLowerCase();
        return key.includes(searchTerm.toLowerCase());
      })
    : filteredStudents;

  const limitedStudents = displayCount
    ? filteredBySearch.slice(
        0,
        Math.min(Number(displayCount), filteredBySearch.length)
      )
    : filteredBySearch;

  const handleDisplayCountChange = (value) => {
    if (value === "") {
      setDisplayCount("");
      return;
    }
    const numeric = Number(value);
    if (Number.isNaN(numeric) || numeric <= 0) {
      setDisplayCount("");
      return;
    }
    setDisplayCount(String(Math.floor(numeric)));
  };

  const getInitials = (name) => {
    if (!name) return "S";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
              onChange={(e) =>
                setForm({
                  ...form,
                  year: e.target.value,
                  group: "",
                  group_code: "",
                  courseCode: "",
                  semester: "",
                  student_id: "",
                })
              }
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
              value={form.group_code}
              onChange={(e) => {
                const value = e.target.value;
                const row = groups.find(
                  (g) => g.code === value || g.group_code === value
                );

                setForm((prev) => ({
                  ...prev,
                  group: row?.name || "",
                  group_code: row?.code || value,
                  courseCode: "",
                  semester: "",
                  student_id: "",
                }));
              }}
            >
              <option value="">Select Group</option>
              {groups.map((g) => (
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
              onChange={(e) =>
                setForm({ ...form, courseCode: e.target.value, semester: "" })
              }
            >
              <option value="">Select Course</option>

              {courses
                .filter((c) => {
                  if (!form.group_code) return true;
                  return (
                    c.group_code === form.group_code ||
                    c.group_name === form.group_code ||
                    c.groupCode === form.group_code
                  );
                })
                .map((c) => (
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
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
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
        <div className="mt-4">
          {hasActiveFilters && (
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-2">
              <div className="d-flex align-items-center gap-2">
                <span className="fw-semibold">Matched students</span>
                <span className="text-muted small">Show</span>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  min="1"
                  placeholder={matchedStudentCount || "0"}
                  value={displayCount}
                  style={{ width: "90px" }}
                  onChange={(event) =>
                    handleDisplayCountChange(event.target.value)
                  }
                  aria-label="Rows to show"
                />
                <span className="text-muted small">entries</span>
              </div>
              <div className="d-flex align-items-center gap-2 ms-auto">
                <span className="text-muted small">Search</span>
                <input
                  type="search"
                  className="form-control form-control-sm"
                  placeholder="Student ID / Name"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  style={{ width: "200px" }}
                  aria-label="Search students"
                />
              </div>
            </div>
          )}
          {!hasActiveFilters ? (
            <div className="text-muted small">
              Select Academic Year, Group, Course, or Semester to see matching
              students.
            </div>
          ) : limitedStudents.length === 0 ? (
            <div className="text-muted small">
              No students match the selected filters yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Photo</th>
                    <th scope="col">Academic year</th>
                    <th scope="col">Student ID</th>
                    <th scope="col">Hall ticket</th>
                    <th scope="col">Name</th>
                    <th scope="col">Group</th>
                    <th scope="col">Course</th>
                    <th scope="col" className="text-end">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {limitedStudents.map((s) => {
                    const studentName =
                      s.full_name || s.name || "Unnamed student";
                    const academicYear = s.academic_year || "Year not set";
                    const matchedGroup = getMatchedGroup(s);
                    const matchedCourse = getMatchedCourse(s);
                    const groupLabel =
                      matchedGroup?.name ||
                      s.group_name ||
                      s.group ||
                      s.group_code ||
                      "Group unknown";
                    const courseLabel =
                      matchedCourse?.courseName ||
                      s.course_name ||
                      s.course_code ||
                      s.course_id ||
                      "Course unknown";
                    const departmentLabel =
                      matchedGroup?.name ||
                      s.department ||
                      s.department_name ||
                      s.group_name ||
                      s.group ||
                      "Department unknown";
                    const semesterLabel = s.semester
                      ? `Sem ${s.semester}`
                      : "Semester n/a";
                    const hallTicketNumber =
                      s.hall_ticket_number ||
                      s.hall_ticket ||
                      s.hallTicketNo ||
                      s.hall_ticket_no ||
                      "N/A";
                    const photoUrl = s.photo_url || s.photo || s.avatar;
                    const initials = getInitials(studentName);

                    const isActive =
                      activePaymentStudent?.student_id === s.student_id;

                    return (
                      <Fragment key={`${s.student_id}-row`}>
                        <tr className={isActive ? "table-primary" : undefined}>
                          <td>
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={studentName}
                                className="rounded-circle"
                                style={{
                                  width: 40,
                                  height: 40,
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <div
                                className="bg-secondary text-white rounded-circle d-inline-flex align-items-center justify-content-center"
                                style={{ width: 40, height: 40, fontSize: 12 }}
                              >
                                {initials}
                              </div>
                            )}
                          </td>
                          <td>{academicYear}</td>
                          <td className="fw-semibold">{s.student_id}</td>
                          <td>{hallTicketNumber}</td>
                          <td>{studentName}</td>
                          <td>{groupLabel}</td>
                          <td>{courseLabel}</td>
                          <td className="text-end">
                            <button
                              className={`btn btn-sm ${
                                isActive
                                  ? "btn-outline-secondary"
                                  : "btn-outline-primary"
                              }`}
                              onClick={() => handlePayNowClick(s)}
                            >
                              Apply
                            </button>
                          </td>
                        </tr>
                        {isActive && (
                          <tr>
                            <td colSpan="7">
                              <div className="bg-white border rounded-3 p-3 shadow-sm">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                  <div>
                                    <div className="fw-semibold">Subjects</div>
                                    <div className="text-muted small">
                                      {selectedSubjectCount} selected
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-muted small">
                                      Select subjects to pay
                                    </span>
                                  </div>
                                </div>
                                {subjectsForActiveStudent.length === 0 ? (
                                  <div className="alert alert-light py-2 mb-3">
                                    No subjects configured for this course or
                                    semester yet.
                                  </div>
                                ) : (
                                  <div className="row g-3">
                                    {subjectsForActiveStudent.map((subject) => (
                                      <div
                                        key={`subject-${subject.id}`}
                                        className="col-md-6"
                                      >
                                        <label className="form-check w-100">
                                          <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={
                                              !!subjectSelection[subject.id]
                                            }
                                            onChange={() =>
                                              toggleSubjectSelection(subject.id)
                                            }
                                          />
                                          <span className="form-check-label ms-2">
                                            <strong>
                                              {subject.subjectName ||
                                                subject.subjectCode}
                                            </strong>
                                            <span className="text-muted small ms-2">
                                              ({subject.subjectCode})
                                            </span>
                                          </span>
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="row g-2 align-items-end mt-3">
                                  <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                      Amount (INR)
                                    </label>
                                    <input
                                      type="number"
                                      className="form-control"
                                      min="0"
                                      value={quickPaymentAmount}
                                      onChange={(e) =>
                                        setQuickPaymentAmount(e.target.value)
                                      }
                                      placeholder="Enter amount"
                                    />
                                  </div>
                                  <div className="col-md-6">
                                    <button
                                      type="button"
                                      className="btn btn-brand w-100"
                                      disabled={
                                        !hasSelectedSubjects ||
                                        !quickPaymentAmount ||
                                        saving
                                      }
                                      onClick={handleQuickPayment}
                                    >
                                      {saving
                                        ? "Processing..."
                                        : "Pay selected subjects"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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
              onChange={(e) => setForm({ ...form, student_id: e.target.value })}
            >
              <option value="">Select Student</option>

              {filteredStudents.map((s) => (
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
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="Amount"
            />
          </div>

          {/* Method */}
          <div className="col-md-3">
            <label className="form-label fw-bold">Payment Method</label>
            <select
              className="form-select"
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
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
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
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
