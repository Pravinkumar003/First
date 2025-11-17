import AdminShell from "../components/AdminShell";
import { useEffect, useState } from "react";
import { api } from "../lib/mockApi";
import { supabase } from "../../supabaseClient";

export default function Departments() {
  const [years, setYears] = useState([]);
  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);

 
  const [subjects, setSubjects] = useState([]);
  const [amounts, setAmounts] = useState({});

  const [subjectFees, setSubjectFees] = useState([]);
  const [editingSubjectId, setEditingSubjectId] = useState(null);

  const [feeCats, setFeeCats] = useState([]);
  const [categoryFees, setCategoryFees] = useState([]);
  const [editingCategoryFeeId, setEditingCategoryFeeId] = useState(null);

  const [form, setForm] = useState({
    year: "",
    group: "",
    courseCode: "",
    semester: "",
  });

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categoryAmount, setCategoryAmount] = useState("");

  const [appliedFilter, setAppliedFilter] = useState(null);

  // Supplementary Fees State
  const [supplementaryFees, setSupplementaryFees] = useState([]);
  const [paper1, setPaper1] = useState('');
  const [paper2, setPaper2] = useState('');
  const [paper3Plus, setPaper3Plus] = useState('');

  // ---------------- LOAD MASTER DATA ----------------
  useEffect(() => {
    const load = async () => {
      const [ys, gs, cs] = await Promise.all([
        api.listAcademicYears(),
        api.listGroups(),
        api.listCourses(),
      ]);
      setYears((ys || []).filter((y) => y?.active !== false));
      setGroups(gs || []);
      setCourses(cs || []);
    };
    load();
  }, []);

  // load fee categories from Supabase
  useEffect(() => {
    const loadCats = async () => {
      try {
        const { data, error } = await supabase
          .from('fee_categories')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        setFeeCats(data || []);
      } catch (error) {
        console.error('Error loading fee categories:', error);
        alert('Failed to load fee categories');
      }
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

  // ---------------- CATEGORY FEES (CHECKBOX) ----------------
  const toggleCategory = (catId) => {
    setSelectedCategories((prev) =>
      prev.includes(catId)
        ? prev.filter((id) => id !== catId)
        : [...prev, catId]
    );
  };

  const handleCategoryOK = () => {
    if (selectedCategories.length === 0) return alert("Select at least one fee category");
    if (!categoryAmount) return alert("Enter amount");
    if (!form.year || !form.group || !form.courseCode || !form.semester)
      return alert("Select Academic Year, Group, Course & Semester");

    const newRecords = selectedCategories.map((catId) => {
      const cat = feeCats.find((c) => String(c.id) === String(catId));
      if (!cat) return null;

      return {
        id: Date.now() + "_" + Math.random().toString(36),
        feeCategoryId: cat.id,
        name: cat.name,
        amount: Number(categoryAmount),
        academic_year: form.year,
        group: form.group,
        course_code: form.courseCode,
        semester: form.semester,
      };
    }).filter(Boolean);

    setCategoryFees((prev) => [...prev, ...newRecords]);
    setSelectedCategories([]);
    setCategoryAmount("");
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

  // Handle Supplementary Fees Submission
  const handleSupplementarySubmit = (e) => {
    e.preventDefault();
    
    if (!paper1 || !paper2 || !paper3Plus) {
      alert('Please fill in all fee amounts');
      return;
    }

    const newFee = {
      id: Date.now(),
      paper1: Number(paper1),
      paper2: Number(paper2),
      paper3Plus: Number(paper3Plus),
      academic_year: form.year || 'Not specified',
      group: form.group || 'Not specified',
      course_code: form.courseCode || 'Not specified',
      semester: form.semester || 'Not specified',
      createdAt: new Date().toISOString()
    };

    setSupplementaryFees([...supplementaryFees, newFee]);
    
    // Clear form
    setPaper1('');
    setPaper2('');
    setPaper3Plus('');
  };

  // Delete Supplementary Fee
  const deleteSupplementaryFee = (id) => {
    if (window.confirm('Are you sure you want to delete this fee entry?')) {
      setSupplementaryFees(supplementaryFees.filter(fee => fee.id !== id));
    }
  };

  // ======================================================
  // ====================== UI ============================
  // ======================================================

  return (
    <AdminShell>
      <h2 className="fw-bold mb-4">Fees Semester wise</h2>

      {/* ---------------- MAIN FILTER PANEL ---------------- */}
      <div className="card card-soft p-3 mb-4">
        <div className="row g-3">
          {/* Academic Year */}
          <div className="col-md-3">
            <label className="form-label fw-bold">Academic Year</label>
            <select
              className="form-select"
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

          {/* Group */}
          <div className="col-md-3">
            <label className="form-label fw-bold">Group</label>
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
            <label className="form-label fw-bold">Course</label>
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
          <div className="col-md-2">
            <label className="form-label fw-bold">Semester</label>
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

          {/* Fee Categories Checkbox Group - Single Column */}
          <div className="col-md-3">
            <div className="card p-2">
              <label className="form-label fw-bold mb-2">Fee Categories</label>
              <div className="d-flex flex-column gap-2">
                {feeCats.map((cat) => (
                  <div key={cat.id} className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`cat-${cat.id}`}
                      checked={selectedCategories.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                    />
                    <label className="form-check-label" htmlFor={`cat-${cat.id}`}>
                      {cat.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Amount Input with Submit Button */}
          <div className="col-md-3 d-flex flex-column">
            <div className="input-group mb-2">
              <span className="input-group-text">₹</span>
              <input
                type="number"
                className="form-control"
                placeholder="Amount"
                value={categoryAmount}
                onChange={(e) => setCategoryAmount(e.target.value)}
              />
            </div>
            <div className="mt-auto">
              <button 
                className="btn btn-primary w-100"
                onClick={handleCategoryOK}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- CATEGORY FEE TABLE ---------------- */}
      {filteredCategoryFees.length > 0 && (
        <div className="card card-soft p-4 mb-4">
          <h4 className="fw-bold mb-3">Fee Category Records</h4>
          {Object.entries(
            filteredCategoryFees.reduce((acc, rec) => {
              const key = `${rec.academic_year}-${rec.group}-${rec.course_code}-${rec.semester}`;
              if (!acc[key]) {
                acc[key] = [];
              }
              acc[key].push(rec);
              return acc;
            }, {})
          ).map(([key, fees]) => {
            const [year, group, course, semester] = key.split('-');
            // Group fees by amount and combine category names with the same amount
            const feeGroups = fees.reduce((groups, fee) => {
              const amount = fee.amount;
              if (!groups[amount]) {
                groups[amount] = [];
              }
              groups[amount].push(fee.name);
              return groups;
            }, {});
            
            // Create display strings for each amount group
            const categoryGroups = Object.entries(feeGroups).map(([amount, names]) => {
              return `${names.join(' & ')}: ₹${parseInt(amount).toLocaleString('en-IN')}`;
            });
            
            const categories = categoryGroups.join(' | ');
            const displayAmount = fees.length > 0 ? `₹${fees.reduce((sum, fee) => sum + parseInt(fee.amount), 0).toLocaleString('en-IN')}` : '';
            
            return (
              <div key={key} className="mb-4">
                <table className="table table-bordered align-middle">
                  <thead>
                    <tr>
                      <th>YEAR</th>
                      <th>GROUP</th>
                      <th>COURSE</th>
                      <th>SEMESTER</th>
                      <th>FEES CATEGORIES</th>
                      <th>FEE AMOUNT</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editingCategoryFeeId === fees[0].id ? (
                      // Edit mode
                      <tr>
                        <td colSpan="7" className="p-0">
                          <div className="p-3 bg-light">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h6 className="mb-0">Edit Fee Categories</h6>
                              <div className="d-flex gap-2">
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => {
                                    // Update all fees with the new values
                                    const updatedFees = categoryFees.map(fee => {
                                      if (fee.academic_year === fees[0].academic_year && 
                                          fee.group === fees[0].group && 
                                          fee.course_code === fees[0].course_code && 
                                          fee.semester === fees[0].semester) {
                                        return {
                                          ...fee,
                                          academic_year: form.year,
                                          group: form.group,
                                          course_code: form.courseCode,
                                          semester: form.semester
                                        };
                                      }
                                      return fee;
                                    });
                                    setCategoryFees(updatedFees);
                                    setEditingCategoryFeeId(null);
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => setEditingCategoryFeeId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                            <div className="row g-3 mb-3">
                              <div className="col-md-3">
                                <label className="form-label">Academic Year</label>
                                <select
                                  className="form-select form-select-sm"
                                  value={form.year}
                                  onChange={(e) => setForm({...form, year: e.target.value})}
                                >
                                  <option value="">Select Year</option>
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
                              <div className="col-md-3">
                                <label className="form-label">Group</label>
                                <select
                                  className="form-select form-select-sm"
                                  value={form.group}
                                  onChange={(e) => setForm({...form, group: e.target.value, courseCode: ''})}
                                >
                                  <option value="">Select Group</option>
                                  {groups.map((g) => (
                                    <option key={g.id} value={g.code}>
                                      {g.code}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-md-3">
                                <label className="form-label">Course</label>
                                <select
                                  className="form-select form-select-sm"
                                  value={form.courseCode}
                                  onChange={(e) => setForm({...form, courseCode: e.target.value, semester: ''})}
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
                              <div className="col-md-3">
                                <label className="form-label">Semester</label>
                                <select
                                  className="form-select form-select-sm"
                                  value={form.semester}
                                  onChange={(e) => setForm({...form, semester: e.target.value})}
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
                            {fees.map((rec) => (
                              <div key={rec.id} className="d-flex align-items-center gap-3 mb-2">
                                <span className="w-25">{rec.name}:</span>
                                <input
                                  type="number"
                                  className="form-control form-control-sm w-25"
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
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => deleteCategoryFee(rec.id)}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      // View mode
                      <tr>
                        <td>{fees[0].academic_year}</td>
                        <td>{fees[0].group}</td>
                        <td>{fees[0].course_code}</td>
                        <td>{fees[0].semester}</td>
                        <td>{categories}</td>
                        <td>{displayAmount}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => setEditingCategoryFeeId(fees[0].id)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => {
                                if (window.confirm('Delete all fee categories for this semester?')) {
                                  fees.forEach(fee => deleteCategoryFee(fee.id));
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* Supplementary Fees Section */}
      <div className="card card-soft p-3 mb-4">
        <h4 className="fw-bold mb-3">Supplementary Fees</h4>
        
        <form onSubmit={handleSupplementarySubmit} className="mb-4">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">1 Paper Fee (₹)</label>
              <input
                type="number"
                value={paper1}
                onChange={(e) => setPaper1(e.target.value)}
                className="form-control"
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">2 Papers Fee (₹)</label>
              <input
                type="number"
                value={paper2}
                onChange={(e) => setPaper2(e.target.value)}
                className="form-control"
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">3+ Papers Fee (₹)</label>
              <input
                type="number"
                value={paper3Plus}
                onChange={(e) => setPaper3Plus(e.target.value)}
                className="form-control"
                required
              />
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <button
                type="submit"
                className="btn btn-primary w-100"
              >
                Add Supplementary Fee
              </button>
            </div>
          </div>
        </form>

        {supplementaryFees.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table table-bordered align-middle">
              <thead>
                <tr>
                  <th>1 PAPER (₹)</th>
                  <th>2 PAPERS (₹)</th>
                  <th>3+ PAPERS (₹)</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {supplementaryFees.map((fee) => (
                  <tr key={fee.id}>
                    <td>₹{fee.paper1}</td>
                    <td>₹{fee.paper2}</td>
                    <td>₹{fee.paper3Plus}</td>
                    <td>
                      <button
                        onClick={() => deleteSupplementaryFee(fee.id)}
                        className="btn btn-sm btn-danger"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
