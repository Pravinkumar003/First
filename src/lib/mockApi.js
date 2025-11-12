const LS = (k, v) => v===undefined ? JSON.parse(localStorage.getItem(k)||'null') : localStorage.setItem(k, JSON.stringify(v))
function init() {
  if (!LS('courses')) LS('courses', [])
  if (!LS('groups')) LS('groups', [])
  if (!LS('academic_years')) LS('academic_years', [])
  if (!LS('batches')) LS('batches', [])
  if (!LS('applications')) LS('applications', [])
  if (!LS('students')) LS('students', [])
  if (!LS('exams')) LS('exams', [])
  if (!LS('payments')) LS('payments', [])
  if (!LS('hall_tickets')) LS('hall_tickets', [])
  if (!LS('results')) LS('results', [])
  if (!LS('fee_definitions')) LS('fee_definitions', [])
  if (!LS('fee_types')) LS('fee_types', null)
  if (!LS('admin_users')) LS('admin_users', [
    { email:'admin@vijayam.edu', role:'ADMIN' },
    { email:'principal@vijayam.edu', role:'PRINCIPAL' }
  ])
}
init()
const id = () => Math.random().toString(36).slice(2,10)
export const api = {
  submitApplication: async (app) => { const list = LS('applications')||[]; list.unshift({ id:id(), created_at:new Date().toISOString(), status:'PENDING', ...app }); LS('applications', list); return {ok:true} },
  login: async (email) => { const users=LS('admin_users')||[]; const u=users.find(x=>x.email===email); if(!u) throw new Error('Access denied'); return u },
  listApplications: async () => LS('applications')||[],
  approveApplication: async (appId, student) => { const apps=LS('applications')||[]; const i=apps.findIndex(a=>a.id===appId); if(i>=0){apps[i].status='APPROVED'; LS('applications', apps)}; const st=LS('students')||[]; st.unshift({ id:id(), created_at:new Date().toISOString(), status:'ACTIVE', ...student }); LS('students', st) },
  deleteApplication: async (appId) => { const apps=LS('applications')||[]; LS('applications', apps.filter(a=>a.id!==appId)) },
  // Years / Groups / Courses
  listAcademicYears: async () => LS('academic_years')||[],
  addAcademicYear: async (y) => { const ys=LS('academic_years')||[]; ys.push({ id:id(), created_at:new Date().toISOString(), active:true, ...y }); LS('academic_years', ys) },
  listGroups: async () => LS('groups')||[],
  addGroup: async (g) => { const gs=LS('groups')||[]; gs.push({ id:id(), created_at:new Date().toISOString(), ...g }); LS('groups', gs) },
  listCourses: async () => LS('courses')||[],
  addCourse: async (c) => { const cs=LS('courses')||[]; cs.push({ id:id(), created_at:new Date().toISOString(), ...c }); LS('courses', cs) },
  listBatches: async () => LS('batches')||[],
  addBatch: async (b) => { const bs=LS('batches')||[]; bs.push({ id:id(), created_at:new Date().toISOString(), ...b }); LS('batches', bs) },
  listStudents: async () => LS('students')||[],
  listExams: async () => LS('exams')||[],
  addExam: async (e) => { const es=LS('exams')||[]; es.push({ id:id(), created_at:new Date().toISOString(), ...e }); LS('exams', es) },
  addPayment: async (p) => { const ps=LS('payments')||[]; ps.push({ id:id(), created_at:new Date().toISOString(), ...p }); LS('payments', ps) },
  upsertHallTicket: async (ht) => { const list=LS('hall_tickets')||[]; const ex=list.find(x=>x.student_id===ht.student_id && x.exam_id===ht.exam_id); if(ex){ex.token=ht.token}else{list.push({ id:id(), created_at:new Date().toISOString(), ...ht })}; LS('hall_tickets', list) },
  addResult: async (r) => { const rs=LS('results')||[]; rs.push({ id:id(), created_at:new Date().toISOString(), ...r }); LS('results', rs) },
  listResults: async () => LS('results')||[],
  // Fees
  listFees: async () => LS('fee_definitions')||[],
  addFee: async (f) => { const fs=LS('fee_definitions')||[]; fs.push({ id:id(), created_at:new Date().toISOString(), ...f }); LS('fee_definitions', fs) },
  getFeeTypes: async () => LS('fee_types')||{ Academic:0, Exam:0, Library:0, Bus:0, Lab:0 },
  setFeeTypes: async (m) => LS('fee_types', m),
}
