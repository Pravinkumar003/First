import AdminShell from '../components/AdminShell'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { trackPromise } from '../store/ui'

export default function Students() {
  const [students, setStudents] = useState([])
  const [filters, setFilters] = useState({
    academic_year: '',
    group_name: '',
    course_name: ''
  })
  const [years, setYears] = useState([])
  const [groups, setGroups] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Fetch students with related data
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select(`
            *,
            group:groups!students_group_name_fkey(group_code, group_name),
            course:courses!students_course_name_fkey(course_code, course_name),
            year:academic_year!students_academic_year_fkey(academic_year)
          `)
          .order('full_name')

        if (studentsError) throw studentsError

        // Fetch academic years
        const { data: yearsData, error: yearsError } = await supabase
          .from('academic_year')
          .select('id, academic_year')
          .order('academic_year', { ascending: false })

        if (yearsError) throw yearsError

        // Fetch groups
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('group_id, group_code, group_name')
          .order('group_name')

        if (groupsError) throw groupsError

        // Fetch courses
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('course_id, course_code, course_name')
          .order('course_name')

        if (coursesError) throw coursesError

        // Transform students data to include related fields
        const transformedStudents = studentsData.map(student => ({
          ...student,
          group_name: student.group?.group_name || student.group_name,
          group_code: student.group?.group_code,
          course_name: student.course?.course_name || student.course_name,
          course_code: student.course?.course_code,
          academic_year: student.year?.academic_year || student.academic_year
        }))

        setStudents(transformedStudents)
        setYears(yearsData || [])
        setGroups(groupsData || [])
        setCourses(coursesData || [])
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    trackPromise(loadData())
  }, [])

  // Filter students based on selected filters
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesYear = !filters.academic_year || student.academic_year === filters.academic_year
      const matchesGroup = !filters.group_name || student.group_code === filters.group_name
      const matchesCourse = !filters.course_name || student.course_code === filters.course_name
      
      return matchesYear && matchesGroup && matchesCourse
    })
  }, [students, filters])

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleEdit = (student) => {
    // Implement edit functionality
    console.log('Edit student:', student)
  }

  const handleDelete = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await api.deleteStudent(studentId)
        setStudents(students.filter(s => s.id !== studentId))
      } catch (error) {
        console.error('Error deleting student:', error)
      }
    }
  }

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
              onChange={(e) => handleFilterChange('academic_year', e.target.value)}
            >
              <option value="">All Years</option>
              {years.map(year => (
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
              onChange={(e) => handleFilterChange('group_name', e.target.value)}
            >
              <option value="">All Groups</option>
              {groups.map(group => (
                <option key={group.group_id} value={group.group_code}>
                  {group.group_name} ({group.group_code})
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Course</label>
            <select 
              className="form-select" 
              value={filters.course_name}
              onChange={(e) => handleFilterChange('course_name', e.target.value)}
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course.course_id} value={course.course_code}>
                  {course.course_name} ({course.course_code})
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
                <th>Course</th>
                <th>Group</th>
                <th>Academic Year</th>
                <th>Actions</th>
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
                filteredStudents.map(student => (
                  <tr key={student.id}>
                    <td>{student.student_id}</td>
                    <td>{student.full_name}</td>
                    <td>{student.course?.course_name || student.course_name} ({student.course_code})</td>
                    <td>{student.group?.group_name || student.group_name} ({student.group_code})</td>
                    <td>{student.academic_year}</td>
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
    </AdminShell>
  )
}
