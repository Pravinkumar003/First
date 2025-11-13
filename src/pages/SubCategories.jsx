export default function SubCategoriesSection({
  categories,
  categoryName,
  setCategoryName,
  editingCategory,
  setEditingCategory,
  catItems,
  catCounts,
  tempCatInputs,
  viewCat,
  isEditingView,
  openViewCat,
  closeViewCat,
  handleSubjectAmountChange,
  handleTempSubjectChange,
  clearCategoryInputs,
  commitCategorySubjects,
  setCatItems,
  deleteCategory,
  saveCategory,
  feeCategories,
  feeCategoryName,
  setFeeCategoryName,
  editingFeeCategoryId,
  setEditingFeeCategoryId,
  saveFeeCategory,
  editFeeCategory,
  deleteFeeCategory,
  setIsEditingView
}) {
  return (
    <>
      <section className="setup-section mb-4">
        <h5 className="section-title">Sub-categories</h5>
        <div className="subcat-input-panel">
          <div className="flex-grow-1">
            <p className="text-uppercase text-muted small mb-1">{editingCategory ? 'Update existing sub-category' : 'Add a new sub-category'}</p>
            <div className="d-flex gap-2 flex-wrap">
              <input
                className="form-control flex-grow-1"
                placeholder="e.g., English"
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
            const generatedInputs = tempCatInputs[cat] || []
            const subjectCount = (catItems[cat] || []).length
            const existingSubjects = catItems[cat] || []
            const existingCount = existingSubjects.length
            const showSubjectInput = subjectCount === 0 || editingCategory === cat
            return (
              <div key={cat} className="subcat-panel">
                <div className="subcat-panel-header">
                  <div>
                    <div className="subcat-panel-title">{cat}</div>
                    <div className="subcat-panel-meta">{subjectCount} subject{subjectCount === 1 ? '' : 's'} configured</div>
                  </div>
                  <div className="subcat-panel-actions">
                    <button type="button" className="btn btn-sm btn-outline-brand" onClick={() => openViewCat(cat)}>View list</button>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => { setCategoryName(cat); setEditingCategory(cat) }}>Rename</button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deleteCategory(cat)}>Delete</button>
                  </div>
                </div>
                {showSubjectInput && (
                  <div className="row g-3 mt-2">
                    <div className="col-md-4">
                      <label className="form-label text-muted fw-600 mb-1">Generate subjects</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        placeholder="Count"
                        value={catCounts[cat] ?? ''}
                        onChange={e => handleSubjectAmountChange(cat, e.target.value)}
                      />
                    </div>
                    {subjectCount > 0 && (
                      <div className="col-md-8 d-flex align-items-center">
                        <span className="text-muted small">Edit the existing subjects inline.</span>
                      </div>
                    )}
                  </div>
                )}
                {showSubjectInput && subjectCount > 0 && (
                  <div className="row g-2 mt-3">
                    <div className="col-12 text-muted fw-600 small">Existing subjects</div>
                    {existingSubjects.map(item => (
                      <div key={item.id} className="col-md-3">
                        <input
                          className="form-control"
                          value={item.name}
                          onChange={e => setCatItems(prev => ({
                            ...prev,
                            [cat]: prev[cat].map(x => x.id === item.id ? { ...x, name: e.target.value } : x)
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {showSubjectInput && generatedInputs.length > 0 && (
                  <div className="row g-2 mt-3">
                    {generatedInputs.map((val, idx) => (
                      <div key={idx} className="col-md-3">
                        <input className="form-control" placeholder={`Subject ${existingCount + idx + 1}`} value={val} onChange={e => handleTempSubjectChange(cat, idx, e.target.value)} />
                      </div>
                    ))}
                    <div className="col-12 text-end">
                      <button type="button" className="btn btn-brand me-2" onClick={() => commitCategorySubjects(cat)}>Add Subjects</button>
                      <button type="button" className="btn btn-outline-secondary" onClick={() => clearCategoryInputs(cat)}>Clear</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {viewCat && (
          <div className="drawer-open">
            <div className="drawer-backdrop" onClick={closeViewCat}></div>
            <div className="drawer-panel" role="dialog" aria-modal="true">
              <div className="drawer-header align-items-start">
                <div>
                  <div className="drawer-eyebrow text-uppercase">Sub-category</div>
                  <div className="drawer-title">Subjects in {viewCat}</div>
                  <div className="drawer-meta">{(catItems[viewCat] || []).length} subject{(catItems[viewCat] || []).length === 1 ? '' : 's'} configured</div>
                </div>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeViewCat}><i className="bi bi-x"></i></button>
              </div>
              <div className="drawer-body">
                {(catItems[viewCat] || []).length > 0 && (
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="drawer-helper-text">Manage the subject list for {viewCat}</div>
                    <button type="button" className="btn btn-sm btn-brand btn-hover-lift" onClick={() => setIsEditingView(prev => !prev)}>
                      {isEditingView ? 'Done Editing' : 'Edit Subjects'}
                    </button>
                  </div>
                )}
                {(catItems[viewCat] || []).length === 0 ? (
                  <div className="text-muted">No subjects added yet.</div>
                ) : (
                  <div className="subject-tiles">
                    {catItems[viewCat].map((it, idx) => (
                      <div key={it.id} className="subject-tile">
                        <div className="subject-index">{(idx + 1).toString().padStart(2, '0')}</div>
                        {isEditingView ? (
                          <div className="d-flex gap-2 w-100">
                            <input
                              className="form-control"
                              value={it.name}
                              onChange={e => setCatItems(prev => ({
                                ...prev,
                                [viewCat]: prev[viewCat].map(x => x.id === it.id ? { ...x, name: e.target.value } : x)
                              }))}
                            />
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setCatItems(prev => ({
                              ...prev,
                              [viewCat]: prev[viewCat].filter(x => x.id !== it.id)
                            }))}>Delete</button>
                          </div>
                        ) : (
                          <div className="subject-name">{it.name}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="drawer-footer d-flex justify-content-end">
                <button type="button" className="btn btn-outline-secondary" onClick={closeViewCat}>Close</button>
              </div>
            </div>
          </div>
        )}
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
