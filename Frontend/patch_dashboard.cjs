const fs = require('fs');

// 1. Patch App.tsx
let appContent = fs.readFileSync('src/app/App.tsx', 'utf8');
appContent = appContent.replace(
  `  const [activeNav, setActiveNav] = useState(stored?.role === "admin" ? "units" : "home");

  const handleLogin`,
  `  const [activeNav, setActiveNav] = useState(stored?.role === "admin" ? "units" : "home");
  const [navKey, setNavKey] = useState(0);

  const handleLogin`
);

appContent = appContent.replace(
  `  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setView("login");
    setRole("user");
  };

  if (view === "login") return <LoginPage onLogin={handleLogin}/>;`,
  `  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setView("login");
    setRole("user");
  };

  const handleNavClick = (id: string) => {
    setActiveNav(id);
    setNavKey(k => k + 1);
  };

  if (view === "login") return <LoginPage onLogin={handleLogin}/>;`
);

appContent = appContent.replace(
  `    if (role === "admin")   return <AdminDashboard user={user} activeNav={activeNav}/>;
    if (role === "manager") return <ManagerDashboard user={user} activeNav={activeNav}/>;
    return <UserDashboard user={user} activeNav={activeNav}/>;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar role={role} active={activeNav} setActive={setActiveNav} onLogout={handleLogout} user={user}/>`,
  `    if (role === "admin")   return <AdminDashboard user={user} activeNav={activeNav}/>;
    if (role === "manager") return <ManagerDashboard user={user} activeNav={activeNav}/>;
    return <UserDashboard user={user} activeNav={activeNav} navKey={navKey}/>;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar role={role} active={activeNav} setActive={handleNavClick} onLogout={handleLogout} user={user}/>`
);
fs.writeFileSync('src/app/App.tsx', appContent);


// 2. Patch UserDashboard.tsx
let udContent = fs.readFileSync('src/pages/Dashboards/UserDashboard.tsx', 'utf8');
udContent = udContent.replace(
  `export function UserDashboard({ user, activeNav }: { user: UserRecord, activeNav: string }) {
  const [totals, setTotals] = useState({ personal: 0, shared: 0, unit_inherited: 0 });

  useEffect(() => {
    fetchDocumentsApi(1, 1).then(res => setTotals(res.totals)).catch(() => {});
  }, []);`,
  `export function UserDashboard({ user, activeNav, navKey }: { user: UserRecord, activeNav: string, navKey?: number }) {
  const [totals, setTotals] = useState({ personal: 0, shared: 0, unit_inherited: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeNav === "home") {
      setLoading(true);
      fetchDocumentsApi(1, 20)
        .then(res => {
          setTotals({
            personal: res.totals.personal || 0,
            shared: res.totals.shared || 0,
            unit_inherited: res.totals.unit_inherited || 0
          });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [activeNav, navKey]);`
);

udContent = udContent.replace(
  `          {/* Mini KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label:"My Documents", value:totals.personal, icon:<FileText size={15}/>, color:"blue" as const },
              { label:"Shared With Me", value:totals.shared, icon:<Inbox size={15}/>, color:"green" as const },
              { label:"Inherited", value:totals.unit_inherited, icon:<Archive size={15}/>, color:"purple" as const },
              { label:"Bookmarked", value:0, icon:<Star size={15}/>, color:"orange" as const },
            ].map(k => (
              <div key={k.label} className={\`bg-white rounded-xl border border-slate-200 px-4 py-3.5 flex items-center gap-3 shadow-sm\`}>`,
  `          {/* Mini KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label:"My Documents", value:totals.personal, icon:<FileText size={15}/>, color:"blue" as const },
              { label:"Shared With Me", value:totals.shared, icon:<Inbox size={15}/>, color:"green" as const },
              { label:"Inherited Documents", value:totals.unit_inherited, icon:<Archive size={15}/>, color:"purple" as const },
            ].map(k => (
              <div key={k.label} className={\`bg-white rounded-xl border border-slate-200 px-4 py-3.5 flex items-center gap-3 shadow-sm \${loading ? 'opacity-50' : ''}\`}>`
);

udContent = udContent.replace(
  `                <div>
                  <p className="text-lg font-bold text-slate-900 leading-none" style={{ fontFamily:"var(--font-display)" }}>{k.value}</p>`,
  `                <div>
                  <p className="text-lg font-bold text-slate-900 leading-none" style={{ fontFamily:"var(--font-display)" }}>
                    {loading ? "..." : k.value}
                  </p>`
);

fs.writeFileSync('src/pages/Dashboards/UserDashboard.tsx', udContent);


// 3. Patch DocumentsTab.tsx
let dtContent = fs.readFileSync('src/pages/User/DocumentsTab.tsx', 'utf8');

dtContent = dtContent.replace(
  `        <SelectInput value={filterType} onChange={v => { setFilterType(v); setPage(1); }}>
          <option value="all">All Types</option>
          <option value="pdf">PDF</option>
          <option value="docx">Word</option>
          <option value="xlsx">Excel</option>
          <option value="pptx">PowerPoint</option>
        </SelectInput>
        <SelectInput value={sort} onChange={setSort}>
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
        </SelectInput>`,
  `        <div className="w-32">
          <SelectInput value={filterType} onChange={v => { setFilterType(v); setPage(1); }}>
            <option value="all">All Types</option>
            <option value="pdf">PDF</option>
            <option value="docx">Word</option>
            <option value="xlsx">Excel</option>
            <option value="pptx">PowerPoint</option>
          </SelectInput>
        </div>
        <div className="w-36">
          <SelectInput value={sort} onChange={setSort}>
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
          </SelectInput>
        </div>`
);

fs.writeFileSync('src/pages/User/DocumentsTab.tsx', dtContent);

console.log("Patched all 3 files!");
