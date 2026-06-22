const fs = require('fs');

const file = 'src/pages/Admin/UsersPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update initial state
content = content.replace(
  `const [form, setForm] = useState({ name:"", email:"", role:"user" as Role, unit:"", quota:"10" });`,
  `const [form, setForm] = useState({ name:"", username:"", password:"", role:"USER", unit:"", quota:"10" });`
);

// 2. Update handleCreateUser
content = content.replace(
  `  const handleCreateUser = async () => {
    if (!form.name || !form.email || !form.unit) {
      showToast("Please fill all required fields", "error");
      return;
    }
    const selectedUnit = units.find(u => u.name === form.unit);
    if (!selectedUnit) {
      showToast("Selected unit not found", "error");
      return;
    }
    
    setFormLoading(true);
    try {
      await createUserApi({
        username: form.email,
        password: "DefaultPassword123!", 
        full_name: form.name,
        role: form.role,
        unit_id: selectedUnit.unit_id,
        quota_bytes: Number(form.quota) * 1024 * 1024 * 1024 || 10737418240,
      });
      showToast("Account created successfully");
      setModal(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to create user", "error");
    } finally {
      setFormLoading(false);
    }
  };`,
  `  const handleCreateUser = async () => {
    if (!form.name || !form.username || !form.password || !form.unit) {
      showToast("Please fill all required fields", "error");
      return;
    }
    const selectedUnit = units.find(u => u.name === form.unit);
    if (!selectedUnit) {
      showToast("Selected unit not found", "error");
      return;
    }
    
    setFormLoading(true);
    try {
      await createUserApi({
        username: form.username,
        password: form.password, 
        full_name: form.name,
        role: form.role as any,
        unit_id: selectedUnit.unit_id,
        quota_bytes: Number(form.quota) * 1024 * 1024 * 1024 || 10737418240,
      });
      showToast("Account created successfully");
      setModal(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to create user", "error");
    } finally {
      setFormLoading(false);
    }
  };`
);

// 3. Update 'Add User' button onClick
content = content.replace(
  `        <Btn icon={<UserPlus size={13}/>} onClick={() => { setForm({ name:"", email:"", role:"user", unit:"", quota:"10" }); setModal({ type:"add-user" }); }} className="ml-auto">
          Add User
        </Btn>`,
  `        <Btn icon={<UserPlus size={13}/>} onClick={() => { setForm({ name:"", username:"", password:"", role:"USER", unit:"", quota:"10" }); setModal({ type:"add-user" }); }} className="ml-auto">
          Add User
        </Btn>`
);

// 4. Update the Modal Form fields
const originalFormFields = `            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Full Name">
                  <TextInput value={form.name} onChange={v => setForm(p => ({ ...p, name:v }))} placeholder="Jane Smith" icon={<Users size={14}/>} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Email Address">
                  <TextInput value={form.email} onChange={v => setForm(p => ({ ...p, email:v }))} placeholder="jane@acme.com" type="email" />
                </Field>
              </div>
              <Field label="Role">
                <SelectInput value={form.role} onChange={v => setForm(p => ({ ...p, role: v as Role }))}>
                  <option value="user">User</option>
                  <option value="manager">Unit Manager</option>
                  <option value="admin">Admin</option>
                </SelectInput>
              </Field>
              <Field label="Department">
                <SelectInput value={form.unit} onChange={v => setForm(p => ({ ...p, unit:v }))}>
                  <option value="">Select…</option>
                  {units.map(u => <option key={u.unit_id} value={u.name}>{u.name}</option>)}
                </SelectInput>
              </Field>
              <div className="col-span-2">
                <Field label="Storage Quota (GB)">
                  <TextInput value={form.quota} onChange={v => setForm(p => ({ ...p, quota:v }))} placeholder="10" />
                </Field>
              </div>
            </div>`;

const newFormFields = `            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Username">
                  <TextInput value={form.username} onChange={v => setForm(p => ({ ...p, username:v }))} placeholder="janesmith" icon={<Users size={14}/>} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Password">
                  <TextInput value={form.password} onChange={v => setForm(p => ({ ...p, password:v }))} placeholder="Enter secure password" type="password" />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Full Name">
                  <TextInput value={form.name} onChange={v => setForm(p => ({ ...p, name:v }))} placeholder="Jane Smith" />
                </Field>
              </div>
              <Field label="Role">
                <SelectInput value={form.role} onChange={v => setForm(p => ({ ...p, role: v }))}>
                  <option value="USER">User</option>
                  <option value="UNIT_MANAGER">Unit Manager</option>
                  <option value="ADMIN">Admin</option>
                </SelectInput>
              </Field>
              <Field label="Department">
                <SelectInput value={form.unit} onChange={v => setForm(p => ({ ...p, unit:v }))}>
                  <option value="">Select…</option>
                  {units.map(u => <option key={u.unit_id} value={u.name}>{u.name}</option>)}
                </SelectInput>
              </Field>
              <div className="col-span-2">
                <Field label="Storage Quota (GB)">
                  <TextInput value={form.quota} onChange={v => setForm(p => ({ ...p, quota:v }))} placeholder="10" />
                </Field>
              </div>
            </div>`;

content = content.replace(originalFormFields, newFormFields);

fs.writeFileSync(file, content);
console.log('UsersPanel.tsx successfully patched.');
