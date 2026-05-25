export interface User {
  namaLengkap: string;
  idOperator: string;
  email: string;
  role: "admin" | "operator" | "viewer";
  password?: string;
}

const DEFAULT_USERS: User[] = [
  {
    namaLengkap: "Administrator Utama",
    idOperator: "admin",
    email: "admin@greenhouse.com",
    role: "admin",
    password: "admin",
  },
  {
    namaLengkap: "Operator Greenhouse",
    idOperator: "operator",
    email: "operator@greenhouse.com",
    role: "operator",
    password: "operator",
  },
  {
    namaLengkap: "Tamu Viewer",
    idOperator: "viewer",
    email: "viewer@greenhouse.com",
    role: "viewer",
    password: "viewer",
  },
];

// Helper to seed default users into localStorage if empty
export function seedDefaultUsers(): User[] {
  const saved = localStorage.getItem("gh_users");
  if (!saved) {
    localStorage.setItem("gh_users", JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  try {
    return JSON.parse(saved);
  } catch (e) {
    localStorage.setItem("gh_users", JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
}

// Get the currently logged-in user with a safe fallback
export function getActiveUser(): User {
  seedDefaultUsers(); // ensure database exists
  const active = localStorage.getItem("gh_active_user");
  if (active) {
    try {
      return JSON.parse(active);
    } catch (e) {
      // ignore
    }
  }
  // Safe Fallback to admin so that no screen crashes if accessed directly without login
  return DEFAULT_USERS[0];
}

// Set active user session
export function setActiveUser(user: User): void {
  localStorage.setItem("gh_active_user", JSON.stringify(user));
}

// Register a new user
export function registerUser(newUser: User): { success: boolean; error?: string } {
  const users = seedDefaultUsers();
  
  const idTaken = users.some(
    (u) => u.idOperator.toLowerCase() === newUser.idOperator.toLowerCase()
  );
  const emailTaken = users.some(
    (u) => u.email.toLowerCase() === newUser.email.toLowerCase()
  );

  if (idTaken) {
    return { success: false, error: "ID Operator sudah terdaftar!" };
  }
  if (emailTaken) {
    return { success: false, error: "Alamat email sudah terdaftar!" };
  }

  const updatedUsers = [...users, newUser];
  localStorage.setItem("gh_users", JSON.stringify(updatedUsers));
  return { success: true };
}

// Authenticate user login
export function loginUser(identifier: string, passwordStr: string): { success: boolean; user?: User; error?: string } {
  const users = seedDefaultUsers();
  const idLower = identifier.toLowerCase().trim();
  const pwTrim = passwordStr.trim();

  const matched = users.find(
    (u) => (u.idOperator.toLowerCase() === idLower || u.email.toLowerCase() === idLower) && u.password === pwTrim
  );

  if (matched) {
    setActiveUser(matched);
    return { success: true, user: matched };
  }

  return { success: false, error: "Kredensial salah! ID/Email atau kata sandi tidak cocok." };
}

// Logout currently active user
export function logoutUser(): void {
  localStorage.removeItem("gh_active_user");
}
