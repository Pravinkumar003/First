import AdminShell from "../components/AdminShell";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import { trackPromise } from "../store/ui";
import { toast } from "react-toastify";
import { validateRequiredFields } from "../lib/validation";
import { api } from "../lib/mockApi";
 
export default function Students() {
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({
    academic_year: "",
    group_name: "",
    course_name: "",
  });
  const [years, setYears] = useState([]);
  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [statusModal, setStatusModal] = useState({
    show: false,
    student: null,
    selectedStatus: 'CONTINUE'
  });
  const [editForm, setEditForm] = useState({
    student_id: "",
    hall_ticket_no: "",
    academic_year: "",
    group_name: "",
    group_code: "",
    course_name: "",
    course_code: "",
    full_name: "",
    gender: "",
    date_of_birth: "",
    father_name: "",
    mother_name: "",
    nationality: "",
    state: "",
    aadhar_number: "",
    address: "",
    pincode: "",
    phone_number: "",
    email: "",
    religion: "",
    caste: "",
    sub_caste: "",
    photo_url: "",
    cert_url: "",
    status: "ACTIVE",
  });
 
  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch students with related data
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select(
            `
            *,
            group:groups!students_group_name_fkey(group_code, group_name),
            course:courses!students_course_name_fkey(course_code, course_name),
            year:academic_year!students_academic_year_fkey(academic_year)
          `
          )
          .order("full_name");
 
        if (studentsError) throw studentsError;
 
        // Fetch academic years
        const { data: yearsData, error: yearsError } = await supabase
          .from("academic_year")
          .select("id, academic_year, status")
          .order("academic_year", { ascending: false });
 
        if (yearsError) throw yearsError;
 
        // Fetch groups
        const { data: groupsData, error: groupsError } = await supabase
          .from("groups")
          .select("group_id, group_code, group_name")
          .order("group_name");
 
        if (groupsError) throw groupsError;
 
        // Fetch courses
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("course_id, course_code, course_name")
          .order("course_name");
 
        if (coursesError) throw coursesError;
 
        // Transform students data to include related fields
        const transformedStudents = studentsData.map((student) => ({
          ...student,
          group_name: student.group?.group_name || student.group_name,
          group_code: student.group?.group_code,
          course_name: student.course?.course_name || student.course_name,
          course_code: student.course?.course_code,
          academic_year: student.year?.academic_year || student.academic_year,
        }));
 
        setStudents(transformedStudents);
        const activeYears = (yearsData || []).filter((year) =>
          year.status === undefined ? true : Boolean(year.status)
        );
        setYears(activeYears);
        setGroups(groupsData || []);
        setCourses(coursesData || []);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    trackPromise(loadData());
  }, []);
 
  // Filter students based on selected filters
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesYear =
        !filters.academic_year ||
        student.academic_year === filters.academic_year;
      const matchesGroup =
        !filters.group_name || student.group_code === filters.group_name;
      const matchesCourse =
        !filters.course_name || student.course_code === filters.course_name;
 
      return matchesYear && matchesGroup && matchesCourse;
    });
  }, [students, filters]);
 
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };
 
  const handleEdit = (student) => {
    setEditingStudent(student);
    setEditForm({
      student_id: student.student_id || "",
      hall_ticket_no: student.hall_ticket_no || "",
      academic_year: student.academic_year || "",
      group_name:
        student.group?.group_name || student.group_name || student.group || "",
      group_code: student.group?.group_code || student.group_code || "",
      course_name:
        student.course?.course_name ||
        student.course_name ||
        student.course ||
        "",
      course_code: student.course?.course_code || student.course_code || "",
      full_name: student.full_name || "",
      gender: student.gender || "",
      date_of_birth: student.date_of_birth || "",
      father_name: student.father_name || "",
      mother_name: student.mother_name || "",
      nationality: student.nationality || "",
      state: student.state || "",
      aadhar_number: student.aadhar_number || "",
      address: student.address || "",
      pincode: student.pincode || "",
      phone_number: student.phone_number || "",
      email: student.email || "",
      religion: student.religion || "",
      caste: student.caste || "",
      sub_caste: student.sub_caste || "",
      photo_url: student.photo_url || "",
      cert_url: student.cert_url || "",
      status: student.status || "ACTIVE",
    });
  };
 
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => {
      if (name === "group_code") {
        const match = groups.find((g) => g.group_code === value);
        return {
          ...prev,
          group_code: value,
          group_name: match?.group_name || "",
        };
      }
      if (name === "course_code") {
        const match = courses.find((c) => c.course_code === value);
        return {
          ...prev,
          course_code: value,
          course_name: match?.course_name || "",
        };
      }
      return {
        ...prev,
        [name]: value,
      };
    });
  };
 
  const handleUpdateStudent = async () => {
    if (!editingStudent) return;
    const essentialFields = {
      "Student ID": editForm.student_id,
      "Full Name": editForm.full_name,
      "Academic Year": editForm.academic_year,
      Group: editForm.group_name,
      Course: editForm.course_name,
    };
    const valid = validateRequiredFields(essentialFields, {
      notify: ({ message }) => toast.warn(message),
    });
    if (!valid) return;
 
    try {
      setLoading(true);
      const payload = {
        student_id: editForm.student_id,
        hall_ticket_no: editForm.hall_ticket_no,
        academic_year: editForm.academic_year,
        group_name: editForm.group_code,
        course_name: editForm.course_code,
        full_name: editForm.full_name,
        gender: editForm.gender,
        date_of_birth: editForm.date_of_birth,
        father_name: editForm.father_name,
        mother_name: editForm.mother_name,
        nationality: editForm.nationality,
        state: editForm.state,
        aadhar_number: editForm.aadhar_number,
        address: editForm.address,
        pincode: editForm.pincode,
        phone_number: editForm.phone_number,
        email: editForm.email,
        religion: editForm.religion,
        caste: editForm.caste,
        sub_caste: editForm.sub_caste,
        photo_url: editForm.photo_url,
        cert_url: editForm.cert_url,
        status: editForm.status,
      };
      const { error } = await supabase
        .from("students")
        .update(payload)
        .eq("id", editingStudent.id);
 
      if (error) throw error;
 
      const groupDisplayName =
        groups.find((g) => g.group_code === editForm.group_code)?.group_name ||
        editForm.group_code;
      const courseDisplayName =
        courses.find((c) => c.course_code === editForm.course_code)
          ?.course_name || editForm.course_code;
      // Update the local state with display-friendly names
      setStudents((prev) =>
        prev.map((student) =>
          student.id === editingStudent.id
            ? {
                ...student,
                ...editForm,
                ...payload,
                group_name: groupDisplayName,
                course_name: courseDisplayName,
                group_code: editForm.group_code,
                course_code: editForm.course_code,
              }
            : student
        )
      );
 
      toast.success("Student updated successfully");
      setEditingStudent(null);
    } catch (error) {
      console.error("Error updating student:", error);
      toast.error("Failed to update student");
    } finally {
      setLoading(false);
    }
  };
 
  const handleCancelEdit = () => {
    setEditingStudent(null);
  };
 
  const handleDelete = async (studentId) => {
    if (window.confirm("Are you sure you want to delete this student?")) {
      try {
        await api.deleteStudent(studentId);
        setStudents(students.filter((s) => s.id !== studentId));
      } catch (error) {
        console.error("Error deleting student:", error);
      }
    }
  };
 
  // Open status modal with current student's status
  const openStatusModal = (student) => {
    setStatusModal({
      show: true,
      student,
      selectedStatus: student.status || 'CONTINUE'
    });
  };
 
  // Close status modal
  const closeStatusModal = () => {
    setStatusModal(prev => ({
      ...prev,
      show: false
    }));
  };
 
  // Update student status in database and local state
  const updateStudentStatus = async () => {
    if (!statusModal.student) return;
   
    try {
      const { error } = await supabase
        .from("students")
        .update({ status: statusModal.selectedStatus })
        .eq("id", statusModal.student.id);
 
      if (error) throw error;
 
      // Update local state
      setStudents(students.map(student =>
        student.id === statusModal.student.id
          ? { ...student, status: statusModal.selectedStatus }
          : student
      ));
 
      toast.success("Student status updated successfully");
      closeStatusModal();
    } catch (error) {
      console.error("Error updating student status:", error);
      toast.error("Failed to update student status");
    }
  };
 
  return (
    <AdminShell>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">Student Management</h2>
      </div>
 
      {/* Filters */}
      <div className="card card-soft p-3 mb-4">
        <h5 className="mb-3">Filter Students</h5>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Academic Year</label>
            <select
              className="form-select"
              value={filters.academic_year}
              onChange={(e) =>
                handleFilterChange("academic_year", e.target.value)
              }
            >
              <option value="">All Years</option>
              {years.map((year) => (
                <option key={year.id} value={year.academic_year}>
                  {year.academic_year}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Group</label>
            <select
              className="form-select"
              value={filters.group_name}
              onChange={(e) => handleFilterChange("group_name", e.target.value)}
            >
              <option value="">All Groups</option>
              {groups.map((group) => (
                <option key={group.group_id} value={group.group_code}>
                  {group.group_name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
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
                <option key={course.course_id} value={course.course_code}>
                  {course.course_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
 
      {/* Students Table */}
      <div className="card card-soft p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Hall Ticket No</th>
                <th>Group</th>
                <th>Course</th>
                <th>Academic Year</th>
                <th>Academic Status</th>
                <th>Edit Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>{student.student_id}</td>
                    <td>{student.full_name}</td>
                    <td>{student.hall_ticket_no || '-'}</td>
                    <td>{student.group?.group_name || student.group_name}</td>
                    <td>{student.course?.course_name || student.course_name}</td>
                    <td>{student.academic_year}</td>
                    <td>
                      <button
                        className={`btn btn-sm ${
                          student.status === 'DISCONTINUE'
                            ? 'btn-danger'
                            : student.status === 'HOLD'
                              ? 'btn-warning'
                              : 'btn-success'
                        }`}
                        onClick={() => openStatusModal(student)}
                        style={{ minWidth: '100px' }}
                      >
                        {student.status === 'DISCONTINUE'
                          ? 'Discontinued'
                          : student.status === 'HOLD'
                            ? 'On Hold'
                            : 'Active'}
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => handleEdit(student)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(student.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    No students found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
 
      {/* Edit Student Modal */}
      {editingStudent && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title">
                  Edit Student: {editingStudent.student_id} ·{" "}
                  {editingStudent.full_name}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCancelEdit}
                ></button>
              </div>
              <div
                className="modal-body"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                <div className="row">
                  <div className="col-md-6">
                    <h6>Student Information</h6>
                    <div className="mb-3">
                      <label className="form-label">Student ID</label>
                      <input
                        type="text"
                        className="form-control"
                        name="student_id"
                        value={editForm.student_id}
                        onChange={handleEditChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Hall Ticket No</label>
                      <input
                        type="text"
                        className="form-control"
                        name="hall_ticket_no"
                        value={editForm.hall_ticket_no}
                        onChange={handleEditChange}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Full Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="full_name"
                        value={editForm.full_name}
                        onChange={handleEditChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Date of Birth</label>
                      <input
                        type="date"
                        className="form-control"
                        name="date_of_birth"
                        value={editForm.date_of_birth}
                        onChange={handleEditChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Gender</label>
                      <select
                        className="form-select"
                        name="gender"
                        value={editForm.gender}
                        onChange={handleEditChange}
                        required
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <h6>Academic Information</h6>
                    <div className="mb-3">
                      <label className="form-label">Academic Year</label>
                      <select
                        className="form-select"
                        name="academic_year"
                        value={editForm.academic_year}
                        onChange={handleEditChange}
                        required
                      >
                        <option value="">Select Year</option>
                        {years.map((year) => (
                          <option key={year.id} value={year.academic_year}>
                            {year.academic_year}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Group</label>
                      <select
                        className="form-select"
                        name="group_code"
                        value={editForm.group_code}
                        onChange={handleEditChange}
                        required
                      >
                        <option value="">Select Group</option>
                        {groups.map((group) => (
                          <option key={group.group_id} value={group.group_code}>
                            {group.group_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Course</label>
                      <select
                        className="form-select"
                        name="course_code"
                        value={editForm.course_code}
                        onChange={handleEditChange}
                        required
                      >
                        <option value="">Select Course</option>
                        {courses.map((course) => (
                          <option
                            key={course.course_id}
                            value={course.course_code}
                          >
                            {course.course_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        name="status"
                        value={editForm.status}
                        onChange={handleEditChange}
                        required
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="GRADUATED">Graduated</option>
                        <option value="DROPPED">Dropped</option>
                      </select>
                    </div>
                  </div>
                </div>
 
                <div className="row mt-3">
                  <div className="col-md-6">
                    <h6>Parent Information</h6>
                    <div className="mb-3">
                      <label className="form-label">Father's Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="father_name"
                        value={editForm.father_name}
                        onChange={handleEditChange}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Mother's Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="mother_name"
                        value={editForm.mother_name}
                        onChange={handleEditChange}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <h6>Contact Information</h6>
                    <div className="mb-3">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        name="phone_number"
                        value={editForm.phone_number}
                        onChange={handleEditChange}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        value={editForm.email}
                        onChange={handleEditChange}
                      />
                    </div>
                  </div>
                </div>
 
                <div className="row mt-3">
                  <div className="col-12">
                    <h6>Address & Identity</h6>
                    <div className="mb-3">
                      <label className="form-label">Address</label>
                      <textarea
                        className="form-control"
                        name="address"
                        rows="2"
                        value={editForm.address}
                        onChange={handleEditChange}
                      ></textarea>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">State</label>
                          <input
                            type="text"
                            className="form-control"
                            name="state"
                            value={editForm.state}
                            onChange={handleEditChange}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Pincode</label>
                          <input
                            type="text"
                            className="form-control"
                            name="pincode"
                            value={editForm.pincode}
                            onChange={handleEditChange}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Aadhar Number</label>
                          <input
                            type="text"
                            className="form-control"
                            name="aadhar_number"
                            value={editForm.aadhar_number}
                            onChange={handleEditChange}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Nationality</label>
                          <input
                            type="text"
                            className="form-control"
                            name="nationality"
                            value={editForm.nationality}
                            onChange={handleEditChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
 
                <div className="row mt-3">
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">Religion</label>
                      <input
                        type="text"
                        className="form-control"
                        name="religion"
                        value={editForm.religion}
                        onChange={handleEditChange}
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">Caste</label>
                      <input
                        type="text"
                        className="form-control"
                        name="caste"
                        value={editForm.caste}
                        onChange={handleEditChange}
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">Sub Caste</label>
                      <input
                        type="text"
                        className="form-control"
                        name="sub_caste"
                        value={editForm.sub_caste}
                        onChange={handleEditChange}
                      />
                    </div>
                  </div>
                </div>
 
                <div className="row mt-3">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Photo URL</label>
                      <input
                        type="text"
                        className="form-control"
                        name="photo_url"
                        value={editForm.photo_url}
                        onChange={handleEditChange}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Certificate URL</label>
                      <input
                        type="text"
                        className="form-control"
                        name="cert_url"
                        value={editForm.cert_url}
                        onChange={handleEditChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancelEdit}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUpdateStudent}
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Student"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Status Change Modal */}
      {statusModal.show && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update Student Status</h5>
                <button type="button" className="btn-close" onClick={closeStatusModal}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Select Status</label>
                  <div className="d-flex flex-column gap-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="statusOption"
                        id="continueOption"
                        value="CONTINUE"
                        checked={statusModal.selectedStatus === 'CONTINUE'}
                        onChange={() => setStatusModal({...statusModal, selectedStatus: 'CONTINUE'})}
                      />
                      <label className="form-check-label" htmlFor="continueOption">
                        Continue (Active)
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="statusOption"
                        id="discontinueOption"
                        value="DISCONTINUE"
                        checked={statusModal.selectedStatus === 'DISCONTINUE'}
                        onChange={() => setStatusModal({...statusModal, selectedStatus: 'DISCONTINUE'})}
                      />
                      <label className="form-check-label" htmlFor="discontinueOption">
                        Discontinue
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="statusOption"
                        id="holdOption"
                        value="HOLD"
                        checked={statusModal.selectedStatus === 'HOLD'}
                        onChange={() => setStatusModal({...statusModal, selectedStatus: 'HOLD'})}
                      />
                      <label className="form-check-label" htmlFor="holdOption">
                        Hold
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeStatusModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={updateStudentStatus}
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
 
 