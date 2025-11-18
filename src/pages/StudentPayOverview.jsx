import AdminShell from "../components/AdminShell";
import { useLocation, useNavigate } from "react-router-dom";

export default function StudentPayOverview() {
  const location = useLocation();
  const navigate = useNavigate();
  const studentId = location.state?.studentId;

  return (
    <AdminShell>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Student Payment Overview</h2>
          {studentId && (
            <p className="text-muted mb-0">Quick view for {studentId}</p>
          )}
        </div>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate(-1)}
        >
          Back to payments
        </button>
      </div>
      <div className="card card-soft p-4">
        <p className="mb-0">
          Build the student payment overview here. Use the passed student ID to
          fetch payment history, outstanding amounts, or generate reports.
        </p>
      </div>
    </AdminShell>
  );
}
