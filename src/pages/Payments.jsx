import AdminShell from "../components/AdminShell";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { api } from "../lib/mockApi";
import { validateRequiredFields } from "../lib/validation";
import { showToast } from "../store/ui";

const normalizeCategoryValue = (value) =>
  value === undefined || value === null ? "" : String(value).trim().toUpperCase();

export default function Payments() {
  // Master data
  const [years, setYears] = useState([]);
  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Form
  const [form, setForm] = useState({
    category: "",
    year: "",
    group: "",
    group_code: "",
    courseCode: "",
    semester: "",
    student_id: "",
  });
  const [displayCount, setDisplayCount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [activePaymentStudent, setActivePaymentStudent] = useState(null);

  const [modalStudent, setModalStudent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCourseCode, setModalCourseCode] = useState("");
  const [modalSemester, setModalSemester] = useState("");
  const [selectedSupplementarySemester, setSelectedSupplementarySemester] = useState("");
  const [selectedSubjectNames, setSelectedSubjectNames] = useState(() => new Set());
  const [subjectAmounts, setSubjectAmounts] = useState({});

  const hasActiveFilters = Boolean(
    form.category ||
      form.year ||
      form.group_code ||
      form.courseCode ||
      form.semester
  );

  const firstDefined = (...values) =>
    values.find(
      (value) => value !== undefined && value !== null && value !== ""
    );
  const normalizeSearchValue = (value) =>
    (value || "").toString().trim().toLowerCase();
  const categoryOptions = useMemo(() => {
    const categories = new Set();
    years.forEach((year) => {
      if (year.category) categories.add(year.category);
    });
    groups.forEach((group) => {
      if (group.category) categories.add(group.category);
    });
    const order = { UG: 0, PG: 1 };
    return Array.from(categories).sort((a, b) => {
      const keyA = order[a] ?? 99;
      const keyB = order[b] ?? 99;
      if (keyA !== keyB) return keyA - keyB;
      return a.localeCompare(b);
    });
  }, [years, groups]);

  const availableYears = useMemo(() => {
    if (!form.category) return years;
    const normalizedCategory = normalizeCategoryValue(form.category);
    return years.filter(
      (year) => normalizeCategoryValue(year.category) === normalizedCategory
    );
  }, [years, form.category]);

  const availableGroups = useMemo(() => {
    if (!form.category) return groups;
    const normalizedCategory = normalizeCategoryValue(form.category);
    return groups.filter(
      (group) => normalizeCategoryValue(group.category) === normalizedCategory
    );
  }, [groups, form.category]);

  const visibleGroupOptions = useMemo(() => {
    if (form.category && availableGroups.length > 0) {
      return availableGroups;
    }
    return groups;
  }, [form.category, availableGroups, groups]);

  const filteredCoursesForGroup = useMemo(() => {
    if (!form.group_code && !form.group) return courses;
    const targets = new Set(
      [form.group_code, form.group].map(normalizeSearchValue).filter(Boolean)
    );
    return courses.filter((course) => {
      return ["group_code", "group_name", "groupCode"].some((key) => {
        const value = course[key];
        if (!value) return false;
        return targets.has(normalizeSearchValue(value));
      });
    });
  }, [courses, form.group_code, form.group]);

  const subjectsForModal = useMemo(() => {
    if (!modalCourseCode || modalSemester === "") return [];
    const normalizedCourse = normalizeSearchValue(modalCourseCode);
    const semesterValue =
      modalSemester === "" || modalSemester === undefined || modalSemester === null
        ? ""
        : String(modalSemester);
    return subjects.filter((subject) => {
      const courseMatch =
        normalizeSearchValue(subject.courseCode) === normalizedCourse ||
        normalizeSearchValue(subject.courseName) === normalizedCourse;
      const semesterMatch =
        subject.semester === "" ? semesterValue === "" : String(subject.semester) === semesterValue;
      return courseMatch && semesterMatch;
    });
  }, [subjects, modalCourseCode, modalSemester]);
  const availableSupplementarySemesters = useMemo(() => {
    const numeric = Number(modalSemester);
    if (!Number.isFinite(numeric) || numeric <= 1 || numeric % 2 === 0) {
      return [];
    }
    const options = [];
    for (let sem = numeric - 2; sem >= 1; sem -= 2) {
      options.push(sem);
    }
    return options;
  }, [modalSemester]);

  useEffect(() => {
    if (availableSupplementarySemesters.length) {
      setSelectedSupplementarySemester(
        String(availableSupplementarySemesters[0])
      );
    } else {
      setSelectedSupplementarySemester("");
    }
  }, [availableSupplementarySemesters]);

  const resolveModalSubjectNames = (subject) => {
    const fromList = subject.subjectNames?.filter(Boolean) || [];
    if (fromList.length) return fromList;
    return [subject.subjectName, subject.subjectCode].filter(Boolean);
  };
  const modalSubjectEntries = useMemo(() => {
    return subjectsForModal.flatMap((subject) => {
      const names = resolveModalSubjectNames(subject);
      return names.map((name, index) => ({
        key: `${subject.id}-${name}-${index}`,
        name,
      }));
    });
  }, [subjectsForModal]);
  const uniqueModalSubjectNames = useMemo(
    () => Array.from(new Set(modalSubjectEntries.map((entry) => entry.name))),
    [modalSubjectEntries]
  );
  useEffect(() => {
    setSelectedSubjectNames(new Set(uniqueModalSubjectNames));
  }, [uniqueModalSubjectNames]);
  const selectedSubjectCount = selectedSubjectNames.size;
  const totalModalSubjectCount = uniqueModalSubjectNames.length;
  const allModalSubjectsSelected =
    totalModalSubjectCount > 0 &&
    selectedSubjectCount === totalModalSubjectCount;
  const toggleSubjectSelection = (name) => {
    setSelectedSubjectNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };
  const toggleSelectAllSubjects = () => {
    if (allModalSubjectsSelected) {
      setSelectedSubjectNames(new Set());
      return;
    }
    setSelectedSubjectNames(new Set(uniqueModalSubjectNames));
  };
  const handlePaySubjects = () => {
    if (!selectedSubjectNames.size) {
      showToast("Select at least one subject before continuing.", {
        type: "warning",
      });
      return;
    }
    const names = Array.from(selectedSubjectNames).join(", ");
    showToast(`Payment requested for ${names}.`, { type: "info" });
  };

  const updateSubjectAmount = (key, value) => {
    setSubjectAmounts((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

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

  const matchesCategoryForStudent = (student) => {
    if (!form.category) return true;
    const targetCategory = normalizeCategoryValue(form.category);
    if (!targetCategory) return true;
    return normalizeCategoryValue(student.category) === targetCategory;
  };

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
      const matchesCategory = matchesCategoryForStudent(s);
      return (
        matchesYear &&
        matchesGroup &&
        matchesCourse &&
        matchesSemester &&
        matchesCategory
      );
    });
  }, [
    students,
    form.year,
    form.group_code,
    form.courseCode,
    form.semester,
    form.category,
  ]);

  const navigate = useNavigate();
  const location = useLocation();

  const loadData = useCallback(async () => {
    try {
      const [
        yearsData,
        groupsData,
        coursesData,
        studentsData,
        subjectsData,
      ] = await Promise.all([
        api.listAcademicYears?.(),
        api.listGroups?.(),
        api.listCourses?.(),
        api.listStudents?.(),
        api.listSubjects?.(),
      ]);

    const normalizedYears = (yearsData || [])
        .filter((y) => y?.active !== false)
        .map((year) => {
          const rawCategory = year.category ?? year.Category;
          return {
            ...year,
            category: normalizeCategoryValue(rawCategory),
          };
        });

    const normalizedGroups = (groupsData || []).map((g) => {
        const rawCategory = g.category ?? g.Category;
        return {
          id: g.group_id ?? g.id,
          code: g.group_code ?? g.code,
          group_code: g.group_code ?? g.code,
          name: g.group_name ?? g.name,
          category: normalizeCategoryValue(rawCategory),
        };
      });

      const normalizedCourses = (coursesData || []).map((c) => ({
        id: c.course_id ?? c.id,
        courseCode: c.course_code || c.code,
        courseName: c.course_name || c.name,
        group_code: c.group_code || c.group_name || c.groupCode,
        group_name: c.group_name || c.groupCode,
      }));

      const yearCategoryMap = new Map(
        normalizedYears.map((year) => [year.academic_year, year.category])
      );

      const groupCategoryMap = new Map();
      normalizedGroups.forEach((group) => {
        if (!group.category) return;
        const keys = [group.code, group.name].filter(Boolean);
        keys.forEach((key) => groupCategoryMap.set(key, group.category));
      });

      const normalizedStudents = (studentsData || []).map((s) => {
        const academicYear = s.academic_year || "";
        const groupCategory =
          groupCategoryMap.get(s.group_code) ??
          groupCategoryMap.get(s.group) ??
          groupCategoryMap.get(s.group_name);
        const studentCategory =
          groupCategory || yearCategoryMap.get(academicYear) || "";
        return {
          ...s,
          academic_year: academicYear,
          group_name: s.group_name || s.group || s.group_code || "",
          group: s.group_name || s.group || s.group_code || "",
          group_code: s.group_code || s.group || s.group_name || "",
          course_name: s.course_name || s.course_id || s.courseCode || "",
          course_code: s.course_code || s.course_name || s.course_id || "",
          semester: s.semester ?? s.semester_number ?? "",
          category: studentCategory,
        };
      });

      setYears(normalizedYears);
      setGroups(normalizedGroups);
      setCourses(normalizedCourses);
      setStudents(normalizedStudents);
      setSubjects(subjectsData || []);
    } catch (e) {
      console.error("Error loading payment masters:", e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Restore filters and selected student when navigated back with state
  useEffect(() => {
    const navState = location?.state;
    if (!navState) return;
    const { studentId, selectedFilters } = navState;

    if (selectedFilters) {
      setForm((prev) => ({ ...prev, ...selectedFilters }));
    }

    if (studentId && students && students.length) {
      const found = students.find((s) => s.student_id === studentId);
      if (found) {
        setActivePaymentStudent(found);
      }
    }

    // clear the navigation state so this runs only once
    try {
      navigate(location.pathname, { replace: true });
    } catch (e) {
      // ignore navigation replace failures
    }
  }, [location, students, navigate]);

  const save = async (override = {}) => {
    // Payment form has been removed as per requirements
    return false;
  };

  const openStudentModal = (student) => {
    setActivePaymentStudent(student);
    setModalStudent(student);
    const semesterValue = form.semester || student.semester || "";
    const courseValue =
      form.courseCode || student.courseCode || student.course_code || "";
    setModalSemester(semesterValue);
    setModalCourseCode(courseValue);
    setModalOpen(true);
    setSubjectAmounts({});
  };

  const closeStudentModal = () => {
    setModalOpen(false);
    setModalStudent(null);
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
          {/* Category */}
    <div className="col-md-3">
            <label className="form-label fw-bold">Category</label>
            <select
              className="form-select"
              value={form.category}
              onChange={(e) => {
                const selectedCategory = normalizeCategoryValue(e.target.value);
                setForm({
                  ...form,
                  category: selectedCategory,
                  year: "",
                  group: "",
                  group_code: "",
                  courseCode: "",
                  semester: "",
                  student_id: "",
                });
              }}
            >
              <option value="">Select Category</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div className="col-md-2">
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
              {availableYears.map((y) => (
                <option key={y.id} value={y.academic_year}>
                  {y.academic_year}
                </option>
              ))}
            </select>
          </div>

          {/* Group */}
          <div className="col-md-2">
            <label className="form-label fw-bold">Group</label>
            <select
              className="form-select"
              value={form.group_code}
              onChange={(e) => {
                const value = e.target.value;
                const groupOptions = visibleGroupOptions;
                const row =
                  groupOptions.find(
                    (g) => g.code === value || g.group_code === value
                  ) ??
                  groups.find((g) => g.code === value || g.group_code === value);

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
              {availableGroups.length > 0
                ? availableGroups.map((g) => (
                    <option key={g.id} value={g.code}>
                      {g.name}
                    </option>
                  ))
                : groups.map((g) => (
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
                setForm({
                  ...form,
                  courseCode: e.target.value,
                  semester: "",
                  student_id: "",
                })
              }
            >
              <option value="">Select Course</option>

              {filteredCoursesForGroup.map((c) => (
                <option key={c.id} value={c.courseCode}>
                  {c.courseName}
                </option>
              ))}
            </select>
          </div>

          {/* Semester */}
          <div className="col-md-2">
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
              Select Category, Academic Year, Group, Course, or Semester to see
              matching students.
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
                    const groupLabel =
                      matchedGroup?.name ||
                      s.group_name ||
                      s.group ||
                      s.group_code ||
                      "Group unknown";
                    const matchedCourse = getMatchedCourse(s);
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
                      onClick={() => openStudentModal(s)}
                    >
                      Apply for Exam
                    </button>
                  </td>
                </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {modalOpen && modalStudent && (
        <>
          <div className="modal-backdrop show"></div>
          <div
            className="modal show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Student Payment Overview</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={closeStudentModal}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="card card-soft p-4">
                    <div className="row align-items-center">
                      <div className="col-md-4 d-flex align-items-center gap-3">
                        {(modalStudent.photo_url || modalStudent.photo) ? (
                          <img
                            src={modalStudent.photo_url || modalStudent.photo}
                            alt={modalStudent.full_name || modalStudent.name || "Student"}
                            className="rounded-circle"
                            style={{ width: 96, height: 96, objectFit: "cover" }}
                          />
                        ) : (
                          <div
                            className="bg-secondary text-white rounded-circle d-inline-flex align-items-center justify-content-center"
                            style={{ width: 96, height: 96, fontSize: 20 }}
                          >
                            {(modalStudent.full_name || modalStudent.name || "S").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h5 className="mb-1">
                            {modalStudent.full_name || modalStudent.name || "Unnamed Student"}
                          </h5>
                          <div className="text-muted">
                            ID: {modalStudent.student_id || "N/A"}
                          </div>
                          <div className="text-muted">Vijayam College Arts & Science</div>
                        </div>
                      </div>
                      <div className="col-md-7 d-flex flex-column justify-content-center align-items-end text-end">
                        <h5 className="fw-bold">About this student</h5>
                        <div className="d-flex flex-column gap-2 mt-3">
                          <div className="fs-5">
                            {getMatchedGroup(modalStudent)?.name || modalStudent.group_name || modalStudent.group || modalStudent.group_code || "Group unknown"}
                          </div>
                          <div className="fs-5">
                            {getMatchedCourse(modalStudent)?.courseName || modalStudent.course_name || modalStudent.course_code || modalStudent.course_id || "Course unknown"}
                          </div>
                          <div className="fs-5">
                            {modalStudent.academic_year || "Academic year not set"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                    <div className="mt-4">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <h6 className="fw-semibold mb-0">
                          Subjects for{" "}
                          {modalSemester ? `Sem ${modalSemester}` : "the selected semester"}
                        </h6>
                        <div className="w-50 d-flex justify-content-end">
                          <label className="form-label mb-0 me-2 fw-semibold">
                            Supplementary
                          </label>
                          <select
                            className="form-select form-select-sm w-auto"
                            value={selectedSupplementarySemester}
                            onChange={(event) =>
                              setSelectedSupplementarySemester(event.target.value)
                            }
                            disabled={!availableSupplementarySemesters.length}
                          >
                            {availableSupplementarySemesters.length ? (
                              <>
                                <option value="" disabled hidden>
                                  Select previous odd semester
                                </option>
                                {availableSupplementarySemesters.map((sem) => (
                                  <option key={sem} value={String(sem)}>
                                    Sem {sem}
                                  </option>
                                ))}
                              </>
                            ) : (
                              <option value="">
                                Supplementary unavailable for this semester
                              </option>
                            )}
                          </select>
                        </div>
                      </div>
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div className="small text-muted">
                          {selectedSubjectCount} of {totalModalSubjectCount} subjects selected
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={toggleSelectAllSubjects}
                          disabled={!totalModalSubjectCount}
                        >
                          {allModalSubjectsSelected ? "Clear selection" : "Select all"}
                        </button>
                      </div>
                    {modalSubjectEntries.length === 0 ? (
                      <div className="alert alert-warning mb-0">
                        No subjects configured for this course/semester.
                      </div>
                    ) : (
                      <ul className="list-group list-group-flush">
                        {modalSubjectEntries.map((entry) => (
                          <li
                            key={entry.key}
                            className="list-group-item"
                          >
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                              <div className="form-check mb-0">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`subject-checkbox-${entry.key}`}
                                  checked={selectedSubjectNames.has(entry.name)}
                                  onChange={() => toggleSubjectSelection(entry.name)}
                                />
                                <label
                                  className="form-check-label"
                                  htmlFor={`subject-checkbox-${entry.key}`}
                                >
                                  {entry.name}
                                </label>
                              </div>
                              <div className="input-group input-group-sm w-auto">
                                <span className="input-group-text">Amount</span>
                                <input
                                  type="number"
                                  className="form-control"
                                  min="0"
                                  step="1"
                                  value={subjectAmounts[entry.key] ?? ""}
                                  placeholder="Enter amount"
                                  onChange={(event) =>
                                    updateSubjectAmount(
                                      entry.key,
                                      event.target.value
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handlePaySubjects}
                  >
                    Pay
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeStudentModal}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
