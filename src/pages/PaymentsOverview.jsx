import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { supabase } from "../../supabaseClient";

export default function PaymentsOverview() {
  const [filters, setFilters] = useState({
    category: "",
    academic_year: "",
    group_name: "",
    course_name: "",
    semester: "",
  });
  const [students, setStudents] = useState([]);
  const [years, setYears] = useState([]);
  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const baseCategoryOptions = ["UG", "PG"];

  useEffect(() => {
    let isMounted = true;
    const loadFilters = async () => {
      try {
        setLoadingFilters(true);
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select(
            "id, academic_year, Category, category, semester, semester_number, semesterNo, semesterNumber"
          );

        if (studentsError) throw studentsError;

        const { data: groupsData, error: groupsError } = await supabase
          .from("groups")
          .select("group_id, group_code, group_name");
        if (groupsError) throw groupsError;

        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("course_id, course_code, course_name");
        if (coursesError) throw coursesError;

        const { data: yearsData, error: yearsError } = await supabase
          .from("academic_year")
          .select("id, academic_year, status, category")
          .order("academic_year", { ascending: false });
        if (yearsError) throw yearsError;

        const activeYears =
          (yearsData || []).filter(
            (year) =>
              year.status === undefined ? true : Boolean(year.status)
          );

        if (!isMounted) return;
        setStudents(studentsData || []);
        setGroups(groupsData || []);
        setCourses(coursesData || []);
        setYears(activeYears);
      } catch (error) {
        console.error("Error loading payment filters:", error);
      } finally {
        if (isMounted) {
          setLoadingFilters(false);
        }
      }
    };
    loadFilters();
    return () => {
      isMounted = false;
    };
  }, []);

  const normalizeCategoryValue = (value) =>
    value ? value.toString().trim().toUpperCase() : "";

  const categoryOptions = useMemo(() => {
    const options = [...baseCategoryOptions];
    const seen = new Set(options.map((val) => normalizeCategoryValue(val)));
    const addOption = (value) => {
      const normalized = normalizeCategoryValue(value);
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        options.push(normalized);
      }
    };

    students.forEach((student) => {
      addOption(student.Category || student.category);
    });

    groups.forEach((group) => {
      addOption(group.category || group.Category);
    });

    years.forEach((year) => {
      addOption(year.category);
      addOption(year.year_category);
      addOption(year.yearCategory);
    });

    return options;
  }, [students, groups, years]);

  const academicYearOptions = useMemo(() => {
    const values = new Set();
    years.forEach((year) => {
      if (year.academic_year) {
        values.add(year.academic_year);
      }
    });
    students.forEach((student) => {
      if (student.academic_year) {
        values.add(student.academic_year);
      }
    });
    return Array.from(values).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [years, students]);

  const semesterOptions = useMemo(() => {
    const values = new Set();
    students.forEach((student) => {
      const rawSemester =
        student.semester ??
        student.semester_number ??
        student.semesterNo ??
        student.semesterNumber;
      if (rawSemester === undefined || rawSemester === null || rawSemester === "")
        return;
      values.add(String(rawSemester));
    });
    if (values.size === 0) {
      [1, 2, 3, 4, 5, 6].forEach((sem) => values.add(String(sem)));
    }
    return Array.from(values).sort((a, b) => {
      const numA = Number(a);
      const numB = Number(b);
      if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [students]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <AdminShell>
      <div className="card card-soft p-3 mb-4">
        <h5 className="mb-3">Filter Students</h5>
        <div className="row g-3">
          <div className="col-6 col-sm-4 col-md-3 col-lg-2">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
            >
              <option value="">All Categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-sm-4 col-md-3 col-lg-2">
            <label className="form-label">Academic Year</label>
            <select
              className="form-select"
              value={filters.academic_year}
              onChange={(e) =>
                handleFilterChange("academic_year", e.target.value)
              }
            >
              <option value="">All Years</option>
              {academicYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-sm-4 col-md-3 col-lg-2">
            <label className="form-label">Group</label>
            <select
              className="form-select"
              value={filters.group_name}
              onChange={(e) => handleFilterChange("group_name", e.target.value)}
            >
              <option value="">All Groups</option>
              {groups.map((group) => (
                <option
                  key={group.group_id}
                  value={group.group_code || group.group_name}
                >
                  {group.group_name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-sm-4 col-md-3 col-lg-2">
            <label className="form-label">Course</label>
            <select
              className="form-select"
              value={filters.course_name}
              onChange={(e) =>
                handleFilterChange("course_name", e.target.value)
              }
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option
                  key={course.course_id}
                  value={course.course_code || course.course_name}
                >
                  {course.course_name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-sm-4 col-md-3 col-lg-2">
            <label className="form-label">Semester</label>
            <select
              className="form-select"
              value={filters.semester}
              onChange={(e) => handleFilterChange("semester", e.target.value)}
            >
              <option value="">All Semesters</option>
              {semesterOptions.map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
          </div>
        </div>
        {loadingFilters && (
          <p className="text-muted small mt-2 mb-0">
            Loading filter data…
          </p>
        )}
      </div>

      <div className="d-flex flex-column align-items-center justify-content-center h-100">
        <div className="text-center">
          <h2 className="fw-bold mb-3">Payments Overview</h2>
          <p className="text-muted mb-0">Coming soon.</p>
        </div>
      </div>
    </AdminShell>
  );
}
