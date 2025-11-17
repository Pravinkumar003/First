import AdminShell from "../components/AdminShell";
import { useEffect, useState } from "react";
import { api } from "../lib/mockApi";
import { supabase } from "../../supabaseClient";
import { validateRequiredFields } from "../lib/validation";
import { showToast } from "../store/ui";

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
  const [editingFeeId, setEditingFeeId] = useState(null);

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
        showToast('Failed to load fee categories.', { type: 'danger' });
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
    if (!validateRequiredFields({ Amount: amt }, { title: 'Enter amount' })) return;
    if (!validateRequiredFields({
      'Academic Year': form.year,
      Group: form.group,
      Course: form.courseCode,
      Semester: form.semester
    }, { title: 'Select academic details' })) return;

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
      showToast('No subject fees added!', { type: 'warning', title: 'Nothing to submit' });
      return;
    }

    setAppliedFilter({
      year: form.year,
      group: form.group,
      courseCode: form.courseCode,
      semester: form.semester,
    });

    showToast('Subject fees submitted!', { type: 'success' });
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

  const fetchCategoryFees = async () => {
    try {
      const { data, error } = await supabase
        .from('fee_structure')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const feesMap = new Map();

      data.forEach(item => {
        const key = `${item.academic_year}_${item.group}_${item.course}_${item.semester}`;
        if (!feesMap.has(key)) {
          feesMap.set(key, {
            id: item.id,
            feeCategories: [],
            amount: item.amount,
            academic_year: String(item.academic_year),
            group: item.group,
            course_code: item.course,
            semester: String(item.semester || ''),
            created_at: item.created_at
          });
        }
        if (item.fee_cat) {
          feesMap.get(key).feeCategories.push({
            id: item.id,
            name: item.fee_cat,
            amount: item.amount
          });
        }
      });

      const formattedData = Array.from(feesMap.values());
      setCategoryFees(formattedData);
    } catch (error) {
      console.error('Error fetching category fees:', error);
      showToast('Error loading category fees. Please try again.', { type: 'danger', title: 'Category fees' });
    }
  };

  const handleCategoryOK = async () => {
    if (selectedCategories.length === 0) {
      showToast('Select at least one fee category.', { type: 'warning', title: 'No categories selected' });
      return;
    }
    if (!validateRequiredFields({ Amount: categoryAmount }, { title: 'Enter amount' })) return;
    if (!validateRequiredFields({
      'Academic Year': form.year,
      Group: form.group,
      Course: form.courseCode,
      Semester: form.semester
    }, { title: 'Select academic details' })) return;

    try {
      const amountValue = parseFloat(categoryAmount);
      if (isNaN(amountValue)) {
        throw new Error('Please enter a valid amount');
      }

      // First, check if we already have fees for this semester
      const { data: existingFees, error: fetchError } = await supabase
        .from('fee_structure')
        .select('*')
        .eq('academic_year', String(form.year))
        .eq('group', form.group)
        .eq('course', form.courseCode)
        .eq('semester', form.semester);

      if (fetchError) throw fetchError;

      // Prepare the fee data
      const feeData = {};
      selectedCategories.forEach(catId => {
        const cat = feeCats.find(c => String(c.id) === String(catId));
        if (cat) {
          feeData[cat.name] = amountValue;
        }
      });

      if (existingFees && existingFees.length > 0) {
        // Update existing record
        const existingData = {};
        existingFees.forEach(item => {
          if (item.fee_cat) {
            existingData[item.fee_cat] = item.amount;
          }
        });

        // Merge existing data with new data
        const updatedData = { ...existingData, ...feeData };

        // First, delete existing records for this semester
        const { error: deleteError } = await supabase
          .from('fee_structure')
          .delete()
          .eq('academic_year', String(form.year))
          .eq('group', form.group)
          .eq('course', form.courseCode)
          .eq('semester', form.semester);

        if (deleteError) throw deleteError;

        // Then insert new records
        const insertData = Object.entries(updatedData).map(([feeCat, amount]) => ({
          academic_year: String(form.year),
          group: form.group,
          course: form.courseCode,
          semester: form.semester,
          fee_cat: feeCat,
          amount: amount,
          created_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from('fee_structure')
          .insert(insertData);

        if (insertError) throw insertError;
      } else {
        // Insert new records
        const insertData = Object.entries(feeData).map(([feeCat, amount]) => ({
          academic_year: String(form.year),
          group: form.group,
          course: form.courseCode,
          semester: form.semester,
          fee_cat: feeCat,
          amount: amount,
          created_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from('fee_structure')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      // Refresh the list
      await fetchCategoryFees();
      
      // Clear the form
      setSelectedCategories([]);
      setCategoryAmount("");
      
    } catch (error) {
      console.error('Error saving category fee:', {
        message: error.message,
        code: error.code,
        details: error.details,
        error: error
      });
      
      // More user-friendly error message
      let errorMessage = 'Error saving category fee';
      if (error.code === '42P01') {
        errorMessage = 'The Supplementary table does not exist in the database. Please create it first.';
      } else if (error.code === '42501') {
        errorMessage = 'Permission denied. Please check your database permissions.';
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      showToast(errorMessage, { type: 'danger', title: 'Category fees' });
    }
  };

  const submitAllCategories = async () => {
    if (categoryFees.length === 0) {
      showToast('No fee category entries added!', { type: 'warning', title: 'Nothing to submit' });
      return;
    }

    setAppliedFilter({
      year: form.year,
      group: form.group,
      courseCode: form.courseCode,
      semester: form.semester,
    });

    showToast('Fee categories submitted!', { type: 'success' });
  };

  const deleteCategoryFee = async (id) => {
    if (!window.confirm("Delete this category fee?")) return;
    
    try {
      const { error } = await supabase
        .from('fee_structure')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Refresh the list
      await fetchCategoryFees();
    } catch (error) {
      console.error('Error deleting category fee:', error);
      showToast('Error deleting category fee. Please try again.', { type: 'danger', title: 'Category fees' });
    }
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

  // Fetch Supplementary Fees from Supabase
  const fetchSupplementaryFees = async () => {
    try {
      const { data, error } = await supabase
        .from('Supplementary')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSupplementaryFees(data || []);
    } catch (error) {
      console.error('Error fetching supplementary fees:', error);
      showToast('Error loading supplementary fees. Please try again.', { type: 'danger', title: 'Supplementary fees' });
    }
  };

  // Handle Supplementary Fees Submission
  const handleSupplementarySubmit = async (e) => {
    e.preventDefault();
    
    if (!validateRequiredFields({
      'Paper 1 Fee': paper1,
      'Paper 2 Fee': paper2,
      '3+ Papers Fee': paper3Plus
    }, { title: 'Enter fee amounts' })) {
      return;
    }

    // Convert to numbers and validate
    const paper1Value = parseFloat(paper1);
    const paper2Value = parseFloat(paper2);
    const paper3Value = parseFloat(paper3Plus);

    if (isNaN(paper1Value) || isNaN(paper2Value) || isNaN(paper3Value)) {
      showToast('Please enter valid numbers for all fields.', { type: 'warning', title: 'Supplementary fees' });
      return;
    }

    const feeData = {
      'Paper-1': paper1Value,
      'Paper-2': paper2Value,
      'Paper-3': paper3Value,
      created_at: new Date().toISOString()
    };

    console.log('Submitting fee data:', {
      editingFeeId,
      feeData,
      table: 'Supplementary',
      supabaseConnected: !!supabase
    });

    try {
      if (editingFeeId) {
        // Update existing fee
        console.log('Updating existing fee with ID:', editingFeeId);
        const { data, error } = await supabase
          .from('Supplementary')
          .update(feeData)
          .eq('id', editingFeeId)
          .select();
        
        if (error) {
          console.error('Update error details:', error);
          throw error;
        }
        
        console.log('Update successful, updated data:', data);
        setSupplementaryFees(supplementaryFees.map(fee => 
          fee.id === editingFeeId ? { ...fee, ...feeData } : fee
        ));
        setEditingFeeId(null);
      } else {
        // Create new fee
        console.log('Creating new fee');
        const { data, error } = await supabase
          .from('Supplementary')
          .insert([feeData])
          .select();
        
        if (error) {
          console.error('Insert error details:', error);
          throw error;
        }
        
        console.log('Insert successful, new data:', data);
        if (data && data.length > 0) {
          setSupplementaryFees([data[0], ...supplementaryFees]);
        } else {
          console.log('No data returned from insert, refetching...');
          await fetchSupplementaryFees();
        }
      }
      
      // Clear form
      setPaper1('');
      setPaper2('');
      setPaper3Plus('');
    } catch (error) {
      console.error('Error in handleSupplementarySubmit:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        error: error
      });
      
      // More user-friendly error message
      let errorMessage = 'Error saving supplementary fee';
      if (error.code === '42P01') {
        errorMessage = 'The Supplementary table does not exist in the database. Please create it first.';
      } else if (error.code === '42501') {
        errorMessage = 'Permission denied. Please check your database permissions.';
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      showToast(errorMessage, { type: 'danger', title: 'Supplementary fees' });
    }
  };

  // Set up edit mode for a fee
  const handleEditFee = (fee) => {
    setPaper1(fee['Paper-1'].toString());
    setPaper2(fee['Paper-2'].toString());
    setPaper3Plus(fee['Paper-3'].toString());
    setEditingFeeId(fee.id);
  };

  // Cancel edit mode
  const cancelEdit = () => {
    setPaper1('');
    setPaper2('');
    setPaper3Plus('');
    setEditingFeeId(null);
  };

  // Delete Supplementary Fee
  const deleteSupplementaryFee = async (id) => {
    if (window.confirm('Are you sure you want to delete this fee entry?')) {
      try {
        const { error } = await supabase
          .from('Supplementary')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        setSupplementaryFees(supplementaryFees.filter(fee => fee.id !== id));
      } catch (error) {
      console.error('Error deleting supplementary fee:', error);
      showToast('Error deleting supplementary fee. Please try again.', { type: 'danger', title: 'Supplementary fees' });
      }
    }
  };

  // Helper function to check if a table exists
  const checkTableExists = async (tableName) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error && error.code === '42P01') {
        // Table doesn't exist
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking table existence:', error);
      return false;
    }
  };

  // Fetch supplementary fees on component mount
  useEffect(() => {
    const init = async () => {
      const tableExists = await checkTableExists('Supplementary');
      console.log('Supplementary table exists:', tableExists);
      if (tableExists) {
        await fetchSupplementaryFees();
      } else {
      showToast('The Supplementary table does not exist in your Supabase database. Please create it with columns id, Paper-1, Paper-2, Paper-3, created_at.', { type: 'warning', title: 'Supplementary fees' });
      }
      
      // Check and load category fees
      const feeTableExists = await checkTableExists('fee_structure');
      console.log('Fee structure table exists:', feeTableExists);
      if (feeTableExists) {
        await fetchCategoryFees();
      } else {
        console.log('Fee structure table does not exist. It will be created when you add your first fee.');
      }
    };
    init();
  }, []);

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
              onChange={(e) =>
                setForm({ ...form, courseCode: e.target.value, semester: "" })
              }
            >
              <option value="">Course</option>
              {courses
                .filter((c) => !form.group || c.group_code === form.group)
                .map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.name}
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
          {filteredCategoryFees.map((fees, index) => {
            const year = fees.academic_year;
            const group = fees.group;
            const course = fees.course_code;
            const semester = fees.semester;
            const categoryDisplays = fees.feeCategories || [];
            
            return (
              <div key={index} className="mb-4">
                <table className="table table-bordered align-middle">
                  <thead>
                    <tr>
                      <th>YEAR</th>
                      <th>GROUP</th>
                      <th>COURSE</th>
                      <th>SEMESTER</th>
                      <th>FEE CATEGORIES</th>
                      <th>FEE AMOUNT</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editingCategoryFeeId === fees.id ? (
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
                                    // Update the fee entry with new values
                                    const updatedFees = categoryFees.map(fee => {
                                      if (fee.academic_year === fees.academic_year && 
                                          fee.group === fees.group && 
                                          fee.course_code === fees.course_code && 
                                          fee.semester === fees.semester) {
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
                            <div className="mb-3">
                              <label className="form-label fw-bold">Common Amount (₹)</label>
                              <input
                                type="number"
                                className="form-control"
                                value={fees?.amount || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setCategoryFees(prev => 
                                    prev.map(fee => 
                                      fee.academic_year === fees.academic_year &&
                                      fee.group === fees.group &&
                                      fee.course_code === fees.course_code &&
                                      fee.semester === fees.semester
                                        ? { ...fee, amount: value }
                                        : fee
                                    )
                                  );
                                }}
                              />
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
                            {fees.feeCategories?.map((cat) => (
                              <div key={cat.id} className="d-flex align-items-center gap-3 mb-2">
                                <span className="w-25">{cat.name}</span>
                                <div className="w-25">₹{parseInt(cat.amount).toLocaleString('en-IN')}</div>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => deleteCategoryFee(cat.id)}
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
                        <td>{fees.academic_year}</td>
                        <td>{groups.find(g => g.code === fees.group)?.name || fees.group}</td>
                        <td>{courses.find(c => c.code === fees.course_code)?.name || fees.course_code}</td>
                        <td>{fees.semester}</td>
                        <td>{categoryDisplays.map(cat => cat.name).join(', ')}</td>
                        <td>₹{parseInt(fees.amount).toLocaleString('en-IN')}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => setEditingCategoryFeeId(fees.id)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => {
                                if (window.confirm('Delete all fee categories for this semester?')) {
                                  fees.feeCategories?.forEach(cat => deleteCategoryFee(cat.id));
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
              <label className="form-label">3 and above Papers Fee (₹)</label>
              <input
                type="number"
                value={paper3Plus}
                onChange={(e) => setPaper3Plus(e.target.value)}
                className="form-control"
                required
              />
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <div className="d-flex gap-2">
                <button
                  type="submit"
                  className="btn btn-primary flex-grow-1"
                >
                {editingFeeId ? 'Update Fee' : 'Add Supplementary Fee'}
              </button>
              </div>
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
                    <td>₹{fee['Paper-1']}</td>
                    <td>₹{fee['Paper-2']}</td>
                    <td>₹{fee['Paper-3']}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditFee(fee)}
                          className="btn btn-sm btn-primary"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteSupplementaryFee(fee.id)}
                          className="btn btn-sm btn-danger"
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
      </div>
    </AdminShell>
  );
}
