export default function SubCategoriesSection({
  categories,
  categoryName,
  setCategoryName,
  editingCategory,
  setEditingCategory,
  catItems,
  deleteCategory,
  saveCategory,
  feeCategories,
  feeCategoryName,
  setFeeCategoryName,
  editingFeeCategoryId,
  setEditingFeeCategoryId,
  saveFeeCategory,
  editFeeCategory,
  deleteFeeCategory
}) {
  return (
    <>
      <section className="setup-section mb-4">
        <h5 className="section-title">Sub-categories</h5>
        <div className="subcat-input-panel">
          <div className="flex-grow-1">
            <label className="form-label fw-bold mb-1">
              Sub-category Name <span className="text-danger">*</span>
            </label>
            <p className="text-uppercase text-muted small mb-1">{editingCategory ? 'Update existing sub-category' : 'Add a new sub-category'}</p>
            <div className="d-flex gap-2 flex-wrap">
              <input
                className="form-control flex-grow-1"
                placeholder="e.g., English"
                required
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    saveCategory()
                  }
                }}
              />
              <button type="button" className="btn btn-brand" onClick={saveCategory}>
                {editingCategory ? 'Update' : 'Add'}
              </button>
              {editingCategory && (
                <button type="button" className="btn btn-outline-secondary" onClick={() => { setCategoryName(''); setEditingCategory('') }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
          <div className="subcat-input-copy text-muted">
            <div className="fw-semibold text-dark">Organise subjects into sub-categories</div>
            <div className="small">Create descriptive buckets (e.g., Languages, Labs) to streamline subject assignment.</div>
          </div>
        </div>

        {categories.length === 0 && <div className="alert alert-info mb-0">Add a sub-category to begin creating subjects.</div>}
        <div className="subcat-grid">
          {categories.map(cat => {
            const subjectCount = (catItems[cat] || []).length
            return (
              <div key={cat} className="subcat-panel">
                <div className="subcat-panel-header">
                  <div>
                    <div className="subcat-panel-title">{cat}</div>
                    <div className="subcat-panel-meta">{subjectCount} subject{subjectCount === 1 ? '' : 's'} configured</div>
                  </div>
                  <div className="subcat-panel-actions">
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => { setCategoryName(cat); setEditingCategory(cat) }}>Rename</button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deleteCategory(cat)}>Delete</button>
                  </div>
                </div>
                <div className="mt-3 text-muted small">
                  Subjects for this category can be added directly from the Subjects tab.
                </div>
              </div>
            )
          })}
        </div>
      </section>
      <section className="setup-section mb-4">
        <h5 className="section-title">Fee Categories</h5>
        <div className="row g-2 align-items-end mb-3">
          <div className="col-md-5 col-lg-4">
            <label className="form-label text-muted fw-600">{editingFeeCategoryId ? 'Edit fee category' : 'Add a fee category'}</label>
            <input
              className="form-control"
              placeholder="e.g., Tuition"
              value={feeCategoryName}
              onChange={e => setFeeCategoryName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  saveFeeCategory()
                }
              }}
            />
          </div>
          <div className="col-md-3 col-lg-2">
            <button type="button" className="btn btn-brand w-100 mt-md-4" onClick={saveFeeCategory}>
              {editingFeeCategoryId ? 'Update Category' : 'Add Category'}
            </button>
          </div>
          {editingFeeCategoryId && (
            <div className="col-md-3 col-lg-2">
              <button type="button" className="btn btn-outline-secondary w-100 mt-md-4" onClick={() => { setFeeCategoryName(''); setEditingFeeCategoryId('') }}>
                Cancel
              </button>
            </div>
          )}
        </div>
        <div className="fee-grid">
          {feeCategories.map(cat => (
            <div key={cat.id} className="fee-panel">
              <div className="d-flex justify-content-between flex-wrap gap-2 mb-3">
                <div>
                  <div className="fee-panel-title">{cat.name}</div>
                  <div className="fee-panel-meta">{cat.fees?.length ? `${cat.fees.length} entry${cat.fees.length === 1 ? '' : 'ies'}` : 'Category available'}</div>
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => editFeeCategory(cat)}>Rename</button>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deleteFeeCategory(cat.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
