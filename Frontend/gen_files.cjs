const fs = require('fs');
const path = require('path');

const sections = JSON.parse(fs.readFileSync('sections.json', 'utf-8'));

function mkdir(p) {
  fs.mkdirSync(path.join('src', p), { recursive: true });
}

mkdir('types');
mkdir('data');
mkdir('services');
mkdir('utils');
mkdir('components/DesignSystem');
mkdir('pages/User');
mkdir('pages/Admin');
mkdir('pages/Dashboards');

function write(p, content, imports = '') {
  fs.writeFileSync(path.join('src', p), imports + '\n' + content + '\n');
  console.log(`Wrote ${p}`);
}

// 1. Types
let typesContent = sections['Types'];
typesContent = typesContent.replace(/^type /gm, 'export type ').replace(/^interface /gm, 'export interface ');
write('types/index.ts', typesContent);

// 2. Data
let seedData = sections['Seed Data (Admin UI only)'];
seedData = seedData.replace(/^const /gm, 'export const ');
write('data/seedData.ts', seedData, 'import { UserRecord } from "../types";\n');

// 3. Auth API
let authApi = sections['Auth API'];
authApi = authApi.replace(/^(const|function|async function) /gm, 'export $1 ');
write('services/authApi.ts', authApi, 'import { Role, UserRecord } from "../types";\n');

// 4. Document API
let docApi = sections['Document API'];
docApi = docApi.replace(/^(const|function|async function|interface|type) /gm, (match, p1) => {
  return p1.startsWith('export') ? p1 + ' ' : 'export ' + p1 + ' ';
});
docApi = docApi.replace(/export export/g, 'export');
let docApiImports = `import { Role, DocSection, Doc, FileType, ApiDoc, UnitStorageStats, UserResponse, UnitStatResponse, UnitDetailResponse, ApiUserResponse, UnitQuotaResponse, TotalQuotaSystemResponse, AnalyticsOverviewResponse, CompanyDocumentStatsResponse, DocListResponse } from "../types";
import { API_BASE } from "./authApi";
import { fmtSize } from "../utils";
`;
// remove type duplicates that were already in Types section
docApi = docApi.replace(/export interface ApiDoc[\s\S]*?\n\}\n/g, '');
docApi = docApi.replace(/export interface DocListResponse[\s\S]*?\n\}\n/g, '');
docApi = docApi.replace(/export interface UnitStorageStats[\s\S]*?\n\}\n/g, '');
docApi = docApi.replace(/export interface UserResponse[\s\S]*?\n\}\n/g, '');
docApi = docApi.replace(/export interface UnitStatResponse[\s\S]*?\n\}\n/g, '');
docApi = docApi.replace(/export interface UnitDetailMember[\s\S]*?\n\}\n/g, '');
docApi = docApi.replace(/export interface UnitDetailResponse[\s\S]*?\n\}\n/g, '');
docApi = docApi.replace(/export interface ApiUserResponse[\s\S]*?\n\}\n/g, '');
docApi = docApi.replace(/export interface UnitQuotaResponse[\s\S]*?\n\}\n/g, '');
docApi = docApi.replace(/export interface TotalQuotaSystemResponse[\s\S]*?\n\}\n/g, '');
docApi = docApi.replace(/export interface AnalyticsOverviewResponse[\s\S]*?\n\}\n/g, '');
docApi = docApi.replace(/export interface UnitDocumentStat[\s\S]*?\n\}\n/g, '');
docApi = docApi.replace(/export interface CompanyDocumentStatsResponse[\s\S]*?\n\}\n/g, '');
write('services/documentApi.ts', docApi, docApiImports);

// 5. Utilities
let utilsContent = sections['Utilities'];
utilsContent = utilsContent.replace(/^(const|function) /gm, 'export $1 ');
let utilsImports = `import React from "react";
`;
write('utils/index.ts', utilsContent, utilsImports);

// 6. Design System Components
let designSystem = sections['Design System Components'];
designSystem = designSystem.replace(/^(const|function) /gm, 'export $1 ');
let dsImports = `import React from "react";
`;
write('components/DesignSystem/index.tsx', designSystem, dsImports);

// 7. Modal
let modalContent = sections['Modal / Dialog'];
modalContent = modalContent.replace(/^(const|function) /gm, 'export $1 ');
let modalImports = `import React, { useEffect } from "react";
import { X, AlertTriangle, Info, CheckCircle, AlertCircle } from "lucide-react";
import { Btn } from "./DesignSystem";
`;
write('components/Modal.tsx', modalContent, modalImports);

// 8. Sidebar
let sidebar = sections['Sidebar'];
sidebar = sidebar.replace(/^(const|function) /gm, 'export $1 ');
let sidebarImports = `import React from "react";
import { Home, FileText, Upload, LayoutDashboard, Building2, Users, BarChart2, Layers, LogOut } from "lucide-react";
import { Role, UserRecord } from "../types";
import { Avatar } from "../utils";
`;
write('components/Sidebar.tsx', sidebar, sidebarImports);

// 9. Header
let header = sections['Header'];
header = header.replace(/^(const|function) /gm, 'export $1 ');
let headerImports = `import React, { useState } from "react";
import { Search, Bell } from "lucide-react";
`;
write('components/Header.tsx', header, headerImports);

// 10. Document Row
let docRow = sections['Document Row'];
docRow = docRow.replace(/^(const|function) /gm, 'export $1 ');
let docRowImports = `import React from "react";
import { Share2, Globe, Lock, Star, Download, Trash2 } from "lucide-react";
import { Doc, Role } from "../types";
import { FileChip, StatusPill } from "../utils";
`;
write('components/DocumentRow.tsx', docRow, docRowImports);

// 11. Documents Tab
let docTab = sections['Documents Tab'];
docTab = docTab.replace(/^(const|function) /gm, 'export $1 ');
let docTabImports = `import React, { useState, useEffect } from "react";
import { Search, RefreshCw, SlidersHorizontal, FolderOpen, Users, Building2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Role, Doc, DocSection, Modal } from "../../types";
import { fetchDocumentsApi, fetchBookmarksApi, removeBookmarkApi, markBookmarkApi, shareDocumentApi, apiDocToDoc } from "../../services/documentApi";
import { TextInput, SelectInput, Btn } from "../../components/DesignSystem";
import { ModalShell, Confirm, ToastBar } from "../../components/Modal";
import { DocRow } from "../../components/DocumentRow";
`;
write('pages/User/DocumentsTab.tsx', docTab, docTabImports);

// 12. Upload Tab
let uploadTab = sections['Upload Tab'];
uploadTab = uploadTab.replace(/^(const|function) /gm, 'export $1 ');
let uploadTabImports = `import React, { useState, useRef } from "react";
import { Upload, File as FileIcon, FolderOpen, CheckCircle, AlertCircle, Clock, X, Info } from "lucide-react";
import { Role, QueueFile } from "../../types";
import { uploadDocumentApi, uploadFolderApi } from "../../services/documentApi";
import { FileChip, fmtSize } from "../../utils";
import { Btn } from "../../components/DesignSystem";
import { ToastBar } from "../../components/Modal";
`;
write('pages/User/UploadTab.tsx', uploadTab, uploadTabImports);

// 13. Analytics Panel
let analyticsPanel = sections['Admin — Analytics Panel'];
analyticsPanel = analyticsPanel.replace(/^(const|function) /gm, 'export $1 ');
let analyticsImports = `import React, { useState, useEffect } from "react";
import { AlertCircle, RefreshCw, Building2, Users, FileText, HardDrive } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { fetchAnalyticsOverviewApi, fetchDocumentStatsApi, fetchUnitsQuotaApi } from "../../services/documentApi";
import { fmtSize } from "../../utils";
import { Btn } from "../../components/DesignSystem";
`;
write('pages/Admin/AnalyticsPanel.tsx', analyticsPanel, analyticsImports);

// 14. Units Panel
let unitsPanel = sections['Admin — Units Panel'];
unitsPanel = unitsPanel.replace(/^(const|function) /gm, 'export $1 ');
let unitsImports = `import React, { useState, useEffect } from "react";
import { RefreshCw, Plus, Building2, Users, FileText, AlertCircle, Edit3, Trash2 } from "lucide-react";
import { UnitStatResponse, UnitDetailResponse, fetchUnitsStatsApi, fetchUnitDetailApi, createUnitApi, updateUnitApi, deleteUnitApi } from "../../services/documentApi";
import { Modal, Unit } from "../../types";
import { fmtSize, Avatar, StatusPill, StorageBar } from "../../utils";
import { Btn, Field, TextInput } from "../../components/DesignSystem";
import { ModalShell, Confirm, ToastBar } from "../../components/Modal";
`;
write('pages/Admin/UnitsPanel.tsx', unitsPanel, unitsImports);

// 15. Users Panel
let usersPanel = sections['Admin — Users Panel'];
usersPanel = usersPanel.replace(/^(const|function) /gm, 'export $1 ');
let usersImports = `import React, { useState, useEffect } from "react";
import { Search, UserPlus, Users, AlertTriangle } from "lucide-react";
import { UserRecord, Role, Modal } from "../../types";
import { UnitStatResponse, fetchUsersApi, fetchUnitsStatsApi, createUserApi } from "../../services/documentApi";
import { Avatar, RolePill, StatusPill, StorageBar } from "../../utils";
import { Btn, Field, TextInput, SelectInput } from "../../components/DesignSystem";
import { ModalShell, Confirm, ToastBar } from "../../components/Modal";
`;
write('pages/Admin/UsersPanel.tsx', usersPanel, usersImports);

// 16. Role Dashboards
let roleDashboards = sections['Role Dashboards'];
let dashboardsContent = roleDashboards.split(/^function /m);

let userDb = 'export function ' + dashboardsContent[1];
let userDbImports = `import React, { useState, useEffect } from "react";
import { FileText, Inbox, Archive, Star } from "lucide-react";
import { UserRecord } from "../../types";
import { fetchDocumentsApi } from "../../services/documentApi";
import { Header } from "../../components/Header";
import { DocumentsTab } from "../User/DocumentsTab";
import { UploadTab } from "../User/UploadTab";
`;
write('pages/Dashboards/UserDashboard.tsx', userDb, userDbImports);

let mgrDb = 'export function ' + dashboardsContent[2];
let mgrDbImports = `import React, { useState, useEffect } from "react";
import { FileText, Users, HardDrive, Layers, Archive } from "lucide-react";
import { UserRecord } from "../../types";
import { UnitStorageStats, UserResponse, fetchManagerStatsApi, fetchManagerUsersApi } from "../../services/documentApi";
import { fmtSize } from "../../utils";
import { Header } from "../../components/Header";
import { DocumentsTab } from "../User/DocumentsTab";
import { UploadTab } from "../User/UploadTab";
`;
write('pages/Dashboards/UnitManagerDashboard.tsx', mgrDb, mgrDbImports);

let adminDb = 'export function ' + dashboardsContent[3];
let adminDbImports = `import React from "react";
import { UserRecord } from "../../types";
import { Header } from "../../components/Header";
import { AnalyticsPanel } from "../Admin/AnalyticsPanel";
import { UnitsPanel } from "../Admin/UnitsPanel";
import { UsersPanel } from "../Admin/UsersPanel";
`;
write('pages/Dashboards/AdminDashboard.tsx', adminDb, adminDbImports);

// 17. Login Page
let loginPage = sections['Login Page'];
loginPage = loginPage.replace(/^(const|function) /gm, 'export $1 ');
let loginImports = `import React, { useState } from "react";
import { EyeOff, Eye, AlertCircle, ChevronLeft, CheckCircle, X, Layers, Users } from "lucide-react";
import { Role } from "../../types";
import { loginApi, decodeJwtPayload, ROLE_MAP } from "../../services/authApi";
import { Field, TextInput } from "../../components/DesignSystem";
`;
write('pages/LoginPage.tsx', loginPage, loginImports);

console.log('Done!');
