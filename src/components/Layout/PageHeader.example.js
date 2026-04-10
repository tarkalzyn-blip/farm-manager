// Usage Example — PageHeader in any page
//
// import PageHeader from '../Layout/PageHeader'
//
// <PageHeader
//   title="إدارة الأبقار"
//   subtitle="سجل كامل للقطيع"
//   icon="🐄"
//   sidebarToggle={handleMenuOpen}
//   showSearch
//   showNotifs
//   actions={
//     <button className="btn btn-primary btn-sm" onClick={openAddModal}>
//       + إضافة بقرة
//     </button>
//   }
//   filterBar={
//     <>
//       <select className="form-control" value={filter} onChange={e => setFilter(e.target.value)}>
//         <option value="">جميع الحالات</option>
//         <option value="انتاج">إنتاج</option>
//         <option value="حامل">حامل</option>
//       </select>
//       <input className="form-control" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
//     </>
//   }
// />
