const fs = require('fs');
const sections = JSON.parse(fs.readFileSync('sections.json', 'utf-8'));
let appRoot = sections['App Root'];
appRoot = appRoot.replace(/^(const|function) /gm, 'export $1 ');

let appImports = `import React, { useState } from "react";
import { Role, UserRecord } from "../types";
import { getStoredAuth, buildUserFromAuth } from "../services/authApi";
import { defaultUser } from "../data/seedData";
import { Sidebar } from "../components/Sidebar";
import { LoginPage } from "../pages/LoginPage";
import { AdminDashboard } from "../pages/Dashboards/AdminDashboard";
import { ManagerDashboard } from "../pages/Dashboards/UnitManagerDashboard";
import { UserDashboard } from "../pages/Dashboards/UserDashboard";
`;

fs.writeFileSync('src/app/App.tsx', appImports + '\n' + appRoot + '\n');
console.log('App.tsx rewritten successfully.');
