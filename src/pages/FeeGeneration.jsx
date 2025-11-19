import AdminShell from "../components/AdminShell";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/mockApi";
import { validateRequiredFields } from "../lib/validation";

export default function FeeGeneration() {
  const [years, setYears] = useState([]);
  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [fees, setFees] = useState([]);
  const [editingFeeId, setEditingFeeId] = useState(null);
  const [form, setForm] = useState({
    year: "",
    group: "",
    courseCode: "",
    semester: "",
    type: "ADMISSION",
    amount: "",
  });
  const load = async () => {
    const [ys, gs, cs, fs] = await Promise.all([
      api.listAcademicYears?.() || [],
      api.listGroups?.() || [],
      api.listCourses() || [],
      api.listFees() || [],
    ]);
    setYears((ys || []).filter((y) => y?.active !== false));
    setGroups(gs);
    setCourses(cs);
    setFees(fs);
  };
  useEffect(() => {
    load();
  }, []);

  const semOptions = useMemo(() => {
    const c = courses.find(
      (x) => x.code === form.courseCode || x.courseCode === form.courseCode
    );
    const n = c?.semesters || 0;
    return Array.from({ length: n }, (_, i) => i + 1);
  }, [form.courseCode, courses]);

  const save = async () => {
    if (
      !validateRequiredFields(
        {
          "Academic Year": form.year,
          Group: form.group,
          Course: form.courseCode,
          Semester: form.semester,
          "Fee Type": form.type,
          Amount: form.amount,
        },
        { title: "Missing details" }
      )
    )
      return;
    const payload = {
      academic_year: form.year,
      group: form.group,
      course_code: form.courseCode,
      semester: Number(form.semester),
      payment_type: form.type,
      amount: Number(form.amount),
    };
    if (editingFeeId) {
      await api.updateFee(editingFeeId, payload);
    } else {
      await api.addFee(payload);
    }
    setForm({
      year: "",
      group: "",
      courseCode: "",
      semester: "",
      type: "ADMISSION",
      amount: "",
    });
    setEditingFeeId(null);
    load();
  };

  const handleEdit = (fee) => {
    // resolve academic year label from years list
    const resolvedYear = (() => {
      const yr = (years || []).find(
        (y) =>
          y.academic_year === fee.academic_year || y.name === fee.academic_year
      );
      return yr ? yr.name || yr.academic_year : fee.academic_year || "";
    })();

    const resolvedGroup = (() => {
      const g = (groups || []).find(
        (x) =>
          x.code === fee.group || x.code === fee.group || x.name === fee.group
      );
      return g ? g.code : fee.group || "";
    })();

    const resolvedCourse = (() => {
      const c = (courses || []).find(
        (x) =>
          (x.code || x.courseCode) === fee.course_code ||
          x.name === fee.course_code ||
          x.name === fee.course_name ||
          x.courseName === fee.course_name
      );
      return c ? c.code || c.courseCode : fee.course_code || "";
    })();

    setForm({
      year: resolvedYear,
      group: resolvedGroup,
      courseCode: resolvedCourse,
      semester:
        fee.semester === undefined || fee.semester === null
          ? ""
          : String(fee.semester),
      type: fee.payment_type || "ADMISSION",
      amount: fee.amount ?? "",
    });
    setEditingFeeId(fee.id || null);
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {}
  };

  const handleDelete = async (fee) => {
    if (!fee?.id) return;
    await api.deleteFee(fee.id);
    if (editingFeeId === fee.id) {
      setEditingFeeId(null);
      setForm({
        year: "",
        group: "",
        courseCode: "",
        semester: "",
        type: "ADMISSION",
        amount: "",
      });
    }
    load();
  };

  return (
    <AdminShell>
      <h2 className="fw-bold mb-3">Fee Generation</h2>
      <div className="card card-soft p-3 mb-3">
        <div className="row g-2">
          <div className="col-md-3">
            <select
              className="form-select"
              required
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            >
              <option value="">Academic Year</option>
              {years.map((y) => {
                const label = y.name || y.academic_year;
                return (
                  <option key={y.id} value={label}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="col-md-2">
            <select
              className="form-select"
              required
              value={form.group}
              onChange={(e) =>
                setForm({
                  ...form,
                  group: e.target.value,
                  courseCode: "",
                  semester: "",
                })
              }
            >
              <option value="">Group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.code}>
                  {g.code}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              required
              value={form.courseCode}
              onChange={(e) =>
                setForm({ ...form, courseCode: e.target.value, semester: "" })
              }
            >
              <option value="">Course</option>
              {courses
                .filter(
                  (c) =>
                    !form.group ||
                    c.group_code === form.group ||
                    c.groupCode === form.group
                )
                .map((c) => (
                  <option key={c.id} value={c.code || c.courseCode}>
                    {c.code || c.courseCode} - {c.name || c.courseName}
                  </option>
                ))}
            </select>
          </div>
          <div className="col-md-2">
            <select
              className="form-select"
              required
              value={form.semester}
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
            >
              <option value="">Semester</option>
              {semOptions.map((n) => (
                <option key={n} value={n}>
                  Sem {n}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <select
              className="form-select"
              required
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="ADMISSION">Admission</option>
              <option value="TUITION">Tuition</option>
              <option value="EXAM">Exam</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="col-md-2">
            <input
              type="number"
              className="form-control"
              required
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div className="col-md-2 text-end">
            <button className="btn btn-brand w-100" onClick={save}>
              {editingFeeId ? "Update Fee" : "Add Fee"}
            </button>
          </div>
        </div>
      </div>

      <div className="card card-soft p-0">
        <table className="table mb-0">
          <thead>
            <tr>
              <th>Year</th>
              <th>Group</th>
              <th>Course</th>
              <th>Sem</th>
              <th>Type</th>
              <th>Amount</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((f) => (
              <tr key={f.id}>
                <td>{f.academic_year}</td>
                <td>{f.group}</td>
                <td>{f.course_code}</td>
                <td>{f.semester}</td>
                <td>{f.payment_type}</td>
                <td>{f.amount}</td>
                <td className="text-end">
                  <div className="btn-group btn-group-sm" role="group">
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={() => handleEdit(f)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(f)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {fees.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center text-muted">
                  No fee definitions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
