async function test() {
  try {
    const res1 = await fetch("http://localhost:8000/api/auth/login", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({username: "alex.chen", password: "password"})
    });
    if (!res1.ok) {
        console.log("Login failed");
        return;
    }
    const { access_token } = await res1.json();

    const res2 = await fetch("http://localhost:8000/api/documents/?page=1&page_size=10", {
      headers: { "Authorization": `Bearer ${access_token}` }
    });
    const data = await res2.json();
    console.log("Personal:", JSON.stringify(data.items.personal[0], null, 2));
    console.log("Shared:", JSON.stringify(data.items.shared[0], null, 2));
    console.log("Inherited:", JSON.stringify(data.items.unit_inherited[0], null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
