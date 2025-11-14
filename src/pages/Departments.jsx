import AdminShell from "../components/AdminShell";
import { useEffect, useState } from "react";
import { api } from "../lib/mockApi";
 
export default function Departments() {
  const [years, setYears] = useState([]);
  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
 
  const [subjects, setSubjects] = useState([]);
  const [amounts, setAmounts] = useState({});
 
  const [subjectFees, setSubjectFees] = useState([]);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
 
  const [feeCats, setFeeCats] = useState([]);
  const [catAmounts, setCatAmounts] = useState({});
  const [categoryFees, setCategoryFees] = useState([]);
  const [editingCategoryFeeId, setEditingCategoryFeeId] = useState(null);
 
  const [form, setForm] = useState({
    year: "",
    group: "",
    courseCode: "",
    semester: "",
    feeCategoryId: "",
  });
 
  const [appliedFilter, setAppliedFilter] = useState(null);
 
  // ---------------- LOAD MASTER DATA ----------------
  useEffect(() => {
    const load = async () => {
      const [ys, gs, cs] = await Promise.all([
        api.listAcademicYears(),
        api.listGroups(),
        api.listCourses(),
      ]);
      setYears(ys || []);
      setGroups(gs || []);
      setCourses(cs || []);
    };
    load();
  }, []);
 
  // load fee categories from backend (same as SubCategoriesSection)
  useEffect(() => {
    const loadCats = async () => {
      const list = await api.listFeeCategories();
      setFeeCats(list || []);
    };
    loadCats();
  }, []);
 
  // load subjects for selected course + semester
  useEffect(() => {
    if (form.courseCode && form.semester) loadSubjects();
  }, [form.courseCode, form.semester]);
 
  const loadSubjects = async () => {
    const res = await api.listSubjects({
      courseCode: form.courseCode,
      semester: Number(form.semester),
    });
    setSubjects(res || []);
  };
 
  // ---------------- SUBJECT FEES ----------------
  const handleSubjectOK = (sub) => {
    const amt = amounts[sub.id];
    if (!amt) return alert("Enter amount");
 
    if (!form.year || !form.group || !form.courseCode || !form.semester)
      return alert("Select Academic Year, Group, Course & Semester");
 
    const subjectName =
      sub.name ||
      sub.subject_name ||
      sub.subjectName ||
      sub.title ||
      "Unknown Subject";
 
    const newRecord = {
      id: Date.now() + "_" + Math.random().toString(36),
      subjectId: sub.id,
      name: subjectName,
      amount: Number(amt),
      academic_year: form.year,
      group: form.group,
      course_code: form.courseCode,
      semester: form.semester,
    };
 
    setSubjectFees((prev) => [...prev, newRecord]);
    setAmounts({ ...amounts, [sub.id]: "" });
  };
 
  const submitAllSubjects = () => {
    if (subjectFees.length === 0) {
      alert("No subject fees added!");
      return;
    }
 
    setAppliedFilter({
      year: form.year,
      group: form.group,
      courseCode: form.courseCode,
      semester: form.semester,
    });
 
    alert("Subject Fees Submitted!");
  };
 
  const deleteSubjectFee = (id) => {
    if (!window.confirm("Delete this subject fee?")) return;
    setSubjectFees((prev) => prev.filter((x) => x.id !== id));
  };
 
  // ---------------- CATEGORY FEES (DROPDOWN) ----------------
  const handleCategoryOK = () => {
    const catId = form.feeCategoryId;
    if (!catId) return alert("Select a fee category");
 
    const amt = catAmounts[catId];
    if (!amt) return alert("Enter amount");
 
    if (!form.year || !form.group || !form.courseCode || !form.semester)
      return alert("Select Academic Year, Group, Course & Semester");
 
    const cat = feeCats.find((c) => String(c.id) === String(catId));
    if (!cat) return;
 
    const newRecord = {
      id: Date.now() + "_" + Math.random().toString(36),
      feeCategoryId: cat.id,
      name: cat.name,
      amount: Number(amt),
      academic_year: form.year,
      group: form.group,
      course_code: form.courseCode,
      semester: form.semester,
    };
 
    setCategoryFees((prev) => [...prev, newRecord]);
    setCatAmounts({ ...catAmounts, [catId]: "" });
    setForm({ ...form, feeCategoryId: "" });
  };
 
  const submitAllCategories = () => {
    if (categoryFees.length === 0) {
      alert("No fee category entries added!");
      return;
    }
 
    setAppliedFilter({
      year: form.year,
      group: form.group,
      courseCode: form.courseCode,
      semester: form.semester,
    });
 
    alert("Fee Categories Submitted!");
  };
 
  const deleteCategoryFee = (id) => {
    if (!window.confirm("Delete this category fee?")) return;
    setCategoryFees((prev) => prev.filter((x) => x.id !== id));
  };
 
  // ---------------- FILTER ----------------
  const filterRecords = (list) => {
    if (!appliedFilter) return list;
 
    return list.filter((item) => {
      if (appliedFilter.year && item.academic_year !== appliedFilter.year)
        return false;
      if (appliedFilter.group && item.group !== appliedFilter.group)
        return false;
      if (appliedFilter.courseCode && item.course_code !== appliedFilter.courseCode)
        return false;
      if (appliedFilter.semester && item.semester !== appliedFilter.semester)
        return false;
      return true;
    });
  };
 
  const filteredSubjectFees = filterRecords(subjectFees);
  const filteredCategoryFees = filterRecords(categoryFees);
 
  // ======================================================
  // ====================== UI ============================
  // ======================================================
 
  return (
    <AdminShell>
      <h2 className="fw-bold mb-4">Department Fees – Semester Wise</h2>
 
      {/* ---------------- MAIN FILTER PANEL ---------------- */}
      <div className="card card-soft p-3 mb-4">
        <div className="row g-3">
          {/* Academic Year */}
          <div className="col-md-3">
            <select
              className="form-select"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            >
              <option value="">Academic Year</option>
              {years.map((y) => (
                <option key={y.id} value={y.name}>
                  {y.name}
                </option>
              ))}
            </select>
          </div>
 
          {/* Group */}
          <div className="col-md-3">
            <select
              className="form-select"
              value={form.group}
              onChange={(e) =>
                setForm({ ...form, group: e.target.value, courseCode: "" })
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
 
          {/* Course */}
          <div className="col-md-3">
            <select
              className="form-select"
              value={form.courseCode}
              onChange={(e) =>
                setForm({ ...form, courseCode: e.target.value, semester: "" })
              }
            >
              <option value="">Course</option>
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
            <select
              className="form-select"
              value={form.semester}
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
            >
              <option value="">Semester</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  Sem {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
 
      {/* ---------------- SUBJECT FEES ENTRY ---------------- */}
      {subjects.length > 0 && (
        <div className="card card-soft p-4">
          <h5 className="fw-bold mb-4">Subject Fees – Sem {form.semester}</h5>
 
          {subjects.map((sub) => {
            const name =
              sub.name ||
              sub.subject_name ||
              sub.subjectName ||
              sub.title ||
              "Unknown Subject";
 
            return (
              <div
                key={sub.id}
                className="d-flex align-items-center mb-3 p-3"
                style={{
                  background: "#f9fafc",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div className="fw-semibold" style={{ width: "260px" }}>
                  {name}
                </div>
 
                <input
                  type="number"
                  className="form-control"
                  style={{ width: "260px" }}
                  placeholder="Enter Amount"
                  value={amounts[sub.id] || ""}
                  onChange={(e) =>
                    setAmounts({ ...amounts, [sub.id]: e.target.value })
                  }
                />
 
                <button
                  className="btn btn-primary ms-3"
                  onClick={() => handleSubjectOK(sub)}
                >
                  OK
                </button>
              </div>
            );
          })}
 
          <button
            className="btn btn-success mt-3"
            onClick={submitAllSubjects}
          >
            Submit All Subjects
          </button>
        </div>
      )}
 
      {/* ---------------- SUBJECT FEE TABLE ---------------- */}
      {filteredSubjectFees.length > 0 && (
        <div className="card card-soft p-4 mt-4">
          <h5 className="fw-bold mb-3">Subject Fee Records</h5>
 
          <table className="table table-borderless align-middle">
            <thead>
              <tr>
                <th>SUBJECT</th>
                <th>YEAR</th>
                <th>GROUP</th>
                <th>COURSE</th>
                <th>SEMESTER</th>
                <th>AMOUNT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjectFees.map((rec) => (
                <tr key={rec.id}>
                  <td>{rec.name}</td>
                  <td>{rec.academic_year}</td>
                  <td>{rec.group}</td>
                  <td>{rec.course_code}</td>
                  <td>{rec.semester}</td>
                  <td>
                    {editingSubjectId === rec.id ? (
                      <input
                        className="form-control"
                        value={rec.amount}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSubjectFees((prev) =>
                            prev.map((x) =>
                              x.id === rec.id ? { ...x, amount: value } : x
                            )
                          );
                        }}
                      />
                    ) : (
                      <>₹ {rec.amount}</>
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() =>
                          setEditingSubjectId(
                            editingSubjectId === rec.id ? null : rec.id
                          )
                        }
                      >
                        {editingSubjectId === rec.id ? "Save" : "Edit"}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteSubjectFee(rec.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
 
      {/* ---------------- FEE CATEGORY ENTRY (FROM BACKEND) ---------------- */}
     {/* ---------------- FEE CATEGORY ENTRY (FROM BACKEND PAGE) ---------------- */}
<div className="card card-soft p-4 mt-5">
  <h4 className="fw-bold mb-3">
    Fee Categories – Sem {form.semester || "-"}
  </h4>
 
  {/* If no categories found */}
  {feeCats.length === 0 ? (
    <div className="alert alert-info mb-0">
      No fee categories found. Please add them in
      <strong> Sub-categories → Fee Categories</strong>.
    </div>
  ) : (
    <>
      {/* Dropdown + Amount + OK */}
      <div className="row g-3 align-items-end mb-3">
 
        {/* Fee Category Dropdown */}
        <div className="col-md-4">
          <label className="form-label text-muted fw-600">
            Select Fee Category
          </label>
          <select
            className="form-select"
            value={form.feeCategoryId}
            onChange={(e) =>
              setForm({ ...form, feeCategoryId: e.target.value })
            }
          >
            <option value="">Choose Category</option>
            {feeCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
 
        {/* Amount Input */}
        <div className="col-md-4">
          <label className="form-label text-muted fw-600">
            Enter Amount
          </label>
          <input
            type="number"
            className="form-control"
            placeholder="Enter Amount"
            value={catAmounts[form.feeCategoryId] || ""}
            onChange={(e) =>
              setCatAmounts({
                ...catAmounts,
                [form.feeCategoryId]: e.target.value,
              })
            }
          />
        </div>
 
        {/* OK Button */}
        <div className="col-md-4">
          <button
            className="btn btn-primary w-100"
            onClick={handleCategoryOK}
          >
            OK
          </button>
        </div>
      </div>
 
      {/* Submit All */}
      <button
        className="btn btn-success mt-2"
        onClick={submitAllCategories}
      >
        Submit All Category Fees
      </button>
    </>
  )}
</div>
 
 
      {/* ---------------- CATEGORY FEE TABLE ---------------- */}
      {filteredCategoryFees.length > 0 && (
        <div className="card card-soft p-4 mt-4">
          <h4 className="fw-bold mb-3">Fee Category Records</h4>
 
          <table className="table table-borderless align-middle">
            <thead>
              <tr>
                <th>CATEGORY</th>
                <th>YEAR</th>
                <th>GROUP</th>
                <th>COURSE</th>
                <th>SEMESTER</th>
                <th>AMOUNT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategoryFees.map((rec) => (
                <tr key={rec.id}>
                  <td>{rec.name}</td>
                  <td>{rec.academic_year}</td>
                  <td>{rec.group}</td>
                  <td>{rec.course_code}</td>
                  <td>{rec.semester}</td>
                  <td>
                    {editingCategoryFeeId === rec.id ? (
                      <input
                        className="form-control"
                        value={rec.amount}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCategoryFees((prev) =>
                            prev.map((x) =>
                              x.id === rec.id ? { ...x, amount: value } : x
                            )
                          );
                        }}
                      />
                    ) : (
                      <>₹ {rec.amount}</>
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() =>
                          setEditingCategoryFeeId(
                            editingCategoryFeeId === rec.id ? null : rec.id
                          )
                        }
                      >
                        {editingCategoryFeeId === rec.id ? "Save" : "Edit"}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteCategoryFee(rec.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
 
 