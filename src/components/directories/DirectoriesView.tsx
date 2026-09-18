import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  Building2,
  Network,
  UserCheck,
  Tag,
  Compass,
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertTriangle,
  Mail,
  User,
  Info,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Briefcase,
} from 'lucide-react';
import {
  Organization,
  Department,
  Employee,
  DocumentType,
  Direction,
} from '../../types';
import { OrganizationModal } from './OrganizationModal';
import { DepartmentModal } from './DepartmentModal';
import { EmployeeModal } from './EmployeeModal';
import { DocTypeModal } from './DocTypeModal';
import { DirectionModal } from './DirectionModal';

interface DirectoriesViewProps {
  organizations: Organization[];
  departments: Department[];
  employees: Employee[];
  documentTypes: DocumentType[];
  directions: Direction[];
  onSaveOrg: (org: Omit<Organization, 'id'> & { id?: number }) => Promise<void>;
  onDeleteOrg: (id: number) => Promise<void>;
  onSaveDept: (dept: Omit<Department, 'id'> & { id?: number }) => Promise<void>;
  onDeleteDept: (id: number) => Promise<void>;
  onSaveEmp: (emp: Omit<Employee, 'id'> & { id?: number }) => Promise<void>;
  onDeleteEmp: (id: number) => Promise<void>;
  onSaveDocType: (type: Omit<DocumentType, 'id'> & { id?: number }) => Promise<void>;
  onDeleteDocType: (id: number) => Promise<void>;
  onSaveDir: (dir: Omit<Direction, 'id'> & { id?: number }) => Promise<void>;
  onDeleteDir: (id: number) => Promise<void>;
}

type DirectoryTab = 'orgs' | 'depts' | 'emps' | 'docTypes' | 'directions';

export const DirectoriesView: React.FC<DirectoriesViewProps> = ({
  organizations,
  departments,
  employees,
  documentTypes,
  directions,
  onSaveOrg,
  onDeleteOrg,
  onSaveDept,
  onDeleteDept,
  onSaveEmp,
  onDeleteEmp,
  onSaveDocType,
  onDeleteDocType,
  onSaveDir,
  onDeleteDir,
}) => {
  const [activeTab, setActiveTab] = useState<DirectoryTab>('orgs');
  const [searchQuery, setSearchQuery] = useState('');

  // Состояния модалок
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [deptInitialOrgId, setDeptInitialOrgId] = useState<number | undefined>(undefined);

  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  const [docTypeModalOpen, setDocTypeModalOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);

  const [dirModalOpen, setDirModalOpen] = useState(false);
  const [selectedDir, setSelectedDir] = useState<Direction | null>(null);

  // Состояние модалки подтверждения удаления
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {},
  });

  const [deleting, setDeleting] = useState(false);

  // Сортировка колонок для каждого справочника
  const [orgSort, setOrgSort] = useState<{ field: string; asc: boolean }>({ field: 'name', asc: true });
  const [deptSort, setDeptSort] = useState<{ field: string; asc: boolean }>({ field: 'name', asc: true });
  const [empSort, setEmpSort] = useState<{ field: string; asc: boolean }>({ field: 'fullName', asc: true });
  const [docTypeSort, setDocTypeSort] = useState<{ field: string; asc: boolean }>({ field: 'name', asc: true });
  const [dirSort, setDirSort] = useState<{ field: string; asc: boolean }>({ field: 'name', asc: true });

  // Изменение ширины колонок (Column Resizing) с сохранением в localStorage
  const defaultOrgWidths: Record<string, number> = { id: 70, name: 300, director: 220, email: 220, actions: 100 };
  const defaultDeptWidths: Record<string, number> = { id: 70, name: 320, shortName: 180, org: 240, actions: 100 };
  const defaultEmpWidths: Record<string, number> = { id: 70, fullName: 240, position: 200, dept: 180, org: 220, actions: 100 };
  const defaultDocTypeWidths: Record<string, number> = { id: 80, name: 450, actions: 100 };
  const defaultDirWidths: Record<string, number> = { id: 80, name: 450, actions: 100 };

  const [orgWidths, setOrgWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('sed_dir_org_widths');
      return saved ? JSON.parse(saved) : defaultOrgWidths;
    } catch {
      return defaultOrgWidths;
    }
  });

  const [deptWidths, setDeptWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('sed_dir_dept_widths');
      return saved ? JSON.parse(saved) : defaultDeptWidths;
    } catch {
      return defaultDeptWidths;
    }
  });

  const [empWidths, setEmpWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('sed_dir_emp_widths');
      return saved ? JSON.parse(saved) : defaultEmpWidths;
    } catch {
      return defaultEmpWidths;
    }
  });

  const [docTypeWidths, setDocTypeWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('sed_dir_doctype_widths');
      return saved ? JSON.parse(saved) : defaultDocTypeWidths;
    } catch {
      return defaultDocTypeWidths;
    }
  });

  const [dirWidths, setDirWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('sed_dir_direction_widths');
      return saved ? JSON.parse(saved) : defaultDirWidths;
    } catch {
      return defaultDirWidths;
    }
  });

  const latestWidthsRef = useRef<{
    orgs: Record<string, number>;
    depts: Record<string, number>;
    emps: Record<string, number>;
    docTypes: Record<string, number>;
    directions: Record<string, number>;
  }>({
    orgs: orgWidths,
    depts: deptWidths,
    emps: empWidths,
    docTypes: docTypeWidths,
    directions: dirWidths,
  });

  latestWidthsRef.current = {
    orgs: orgWidths,
    depts: deptWidths,
    emps: empWidths,
    docTypes: docTypeWidths,
    directions: dirWidths,
  };

  const resizingCol = useRef<{ tab: string; colKey: string; startX: number; startWidth: number } | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingCol.current) return;
    const { tab, colKey, startX, startWidth } = resizingCol.current;
    const delta = e.clientX - startX;
    const newWidth = Math.max(60, startWidth + delta);

    if (tab === 'orgs') {
      setOrgWidths((prev) => {
        const next = { ...prev, [colKey]: newWidth };
        latestWidthsRef.current.orgs = next;
        return next;
      });
    } else if (tab === 'depts') {
      setDeptWidths((prev) => {
        const next = { ...prev, [colKey]: newWidth };
        latestWidthsRef.current.depts = next;
        return next;
      });
    } else if (tab === 'emps') {
      setEmpWidths((prev) => {
        const next = { ...prev, [colKey]: newWidth };
        latestWidthsRef.current.emps = next;
        return next;
      });
    } else if (tab === 'docTypes') {
      setDocTypeWidths((prev) => {
        const next = { ...prev, [colKey]: newWidth };
        latestWidthsRef.current.docTypes = next;
        return next;
      });
    } else if (tab === 'directions') {
      setDirWidths((prev) => {
        const next = { ...prev, [colKey]: newWidth };
        latestWidthsRef.current.directions = next;
        return next;
      });
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    const currentResizing = resizingCol.current;
    resizingCol.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    if (currentResizing) {
      try {
        if (currentResizing.tab === 'orgs') {
          localStorage.setItem('sed_dir_org_widths', JSON.stringify(latestWidthsRef.current.orgs));
        } else if (currentResizing.tab === 'depts') {
          localStorage.setItem('sed_dir_dept_widths', JSON.stringify(latestWidthsRef.current.depts));
        } else if (currentResizing.tab === 'emps') {
          localStorage.setItem('sed_dir_emp_widths', JSON.stringify(latestWidthsRef.current.emps));
        } else if (currentResizing.tab === 'docTypes') {
          localStorage.setItem('sed_dir_doctype_widths', JSON.stringify(latestWidthsRef.current.docTypes));
        } else if (currentResizing.tab === 'directions') {
          localStorage.setItem('sed_dir_direction_widths', JSON.stringify(latestWidthsRef.current.directions));
        }
      } catch {}
    }
  }, [handleMouseMove]);

  const startResizing = (tab: string, colKey: string, currentWidth: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingCol.current = { tab, colKey, startX: e.clientX, startWidth: currentWidth };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSortToggle = (
    currentConfig: { field: string; asc: boolean },
    setConfig: React.Dispatch<React.SetStateAction<{ field: string; asc: boolean }>>,
    field: string
  ) => {
    if (currentConfig.field === field) {
      setConfig({ field, asc: !currentConfig.asc });
    } else {
      setConfig({ field, asc: true });
    }
  };

  function sortList<T>(items: T[], field: string, asc: boolean): T[] {
    return [...items].sort((a: any, b: any) => {
      const valA = a[field] ?? '';
      const valB = b[field] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return asc ? valA - valB : valB - valA;
      }
      const cmp = String(valA).localeCompare(String(valB), 'ru', { numeric: true, sensitivity: 'base' });
      return asc ? cmp : -cmp;
    });
  }

  const renderSortIcon = (currentField: string, activeField: string, asc: boolean) => {
    if (currentField !== activeField) {
      return <ArrowUpDown className="w-3 h-3 text-gray-500 opacity-60 group-hover:opacity-100 shrink-0 ml-1" />;
    }
    return asc ? (
      <ArrowUp className="w-3 h-3 text-blue-400 shrink-0 ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-400 shrink-0 ml-1" />
    );
  };

  // Фильтрованные и сортированные списки с мемоизацией (пересчитываются только при изменении данных или поискового запроса)
  const q = searchQuery.toLowerCase().trim();

  const sortedOrgs = useMemo(() => {
    const filtered = organizations.filter(
      (o) =>
        !q ||
        o.name.toLowerCase().includes(q) ||
        (o.director && o.director.toLowerCase().includes(q)) ||
        (o.email && o.email.toLowerCase().includes(q)) ||
        String(o.id).includes(q)
    );
    return sortList(filtered, orgSort.field, orgSort.asc);
  }, [organizations, q, orgSort.field, orgSort.asc]);

  const sortedDepts = useMemo(() => {
    const filtered = departments.filter(
      (d) =>
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.shortName.toLowerCase().includes(q) ||
        (d.organizationName && d.organizationName.toLowerCase().includes(q)) ||
        String(d.id).includes(q)
    );
    return sortList(filtered, deptSort.field, deptSort.asc);
  }, [departments, q, deptSort.field, deptSort.asc]);

  const sortedEmps = useMemo(() => {
    const filtered = employees.filter(
      (e) =>
        !q ||
        e.fullName.toLowerCase().includes(q) ||
        (e.position && e.position.toLowerCase().includes(q)) ||
        e.departmentShortName.toLowerCase().includes(q) ||
        (e.organizationName && e.organizationName.toLowerCase().includes(q)) ||
        String(e.id).includes(q)
    );
    return sortList(filtered, empSort.field, empSort.asc);
  }, [employees, q, empSort.field, empSort.asc]);

  const sortedDocTypes = useMemo(() => {
    const filtered = documentTypes.filter(
      (t) => !q || t.name.toLowerCase().includes(q) || String(t.id).includes(q)
    );
    return sortList(filtered, docTypeSort.field, docTypeSort.asc);
  }, [documentTypes, q, docTypeSort.field, docTypeSort.asc]);

  const sortedDirs = useMemo(() => {
    const filtered = directions.filter(
      (d) => !q || d.name.toLowerCase().includes(q) || String(d.id).includes(q)
    );
    return sortList(filtered, dirSort.field, dirSort.asc);
  }, [directions, q, dirSort.field, dirSort.asc]);

  // Подтверждение удаления
  const confirmDelete = (title: string, description: string, onConfirm: () => Promise<void>) => {
    setDeleteDialog({
      isOpen: true,
      title,
      description,
      onConfirm,
    });
  };

  const handleExecuteDelete = async () => {
    setDeleting(true);
    try {
      await deleteDialog.onConfirm();
      setDeleteDialog((prev) => ({ ...prev, isOpen: false }));
    } catch (e: any) {
      alert(e.message || 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Шапка справочников и выбор вкладок */}
      <div className="bg-[#171A21] rounded-2xl p-4 sm:p-5 border border-[#2D3139] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#E0E0E0] flex items-center gap-2">
              <span>Справочники системы</span>
            </h2>
            <p className="text-xs text-gray-400">
              Управление нормативно-справочной информацией документооборота
            </p>
          </div>

          {/* Строка поиска */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по справочнику..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Табы справочников */}
        <div className="flex flex-wrap gap-2 border-t border-[#2D3139] pt-3">
          
          <button
            onClick={() => setActiveTab('orgs')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'orgs'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                : 'bg-[#0F1115] text-gray-300 hover:bg-[#1F222B] border border-[#2D3139]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Организации</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'orgs' ? 'bg-blue-700 text-white' : 'bg-[#1F222B] text-gray-400'
            }`}>
              {organizations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('depts')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'depts'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                : 'bg-[#0F1115] text-gray-300 hover:bg-[#1F222B] border border-[#2D3139]'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Структурные подразделения</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'depts' ? 'bg-blue-700 text-white' : 'bg-[#1F222B] text-gray-400'
            }`}>
              {departments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('emps')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'emps'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                : 'bg-[#0F1115] text-gray-300 hover:bg-[#1F222B] border border-[#2D3139]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Сотрудники</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'emps' ? 'bg-blue-700 text-white' : 'bg-[#1F222B] text-gray-400'
            }`}>
              {employees.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('docTypes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'docTypes'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                : 'bg-[#0F1115] text-gray-300 hover:bg-[#1F222B] border border-[#2D3139]'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Типы документов</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'docTypes' ? 'bg-blue-700 text-white' : 'bg-[#1F222B] text-gray-400'
            }`}>
              {documentTypes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('directions')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'directions'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                : 'bg-[#0F1115] text-gray-300 hover:bg-[#1F222B] border border-[#2D3139]'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Направления</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'directions' ? 'bg-blue-700 text-white' : 'bg-[#1F222B] text-gray-400'
            }`}>
              {directions.length}
            </span>
          </button>

        </div>
      </div>

      {/* 1. Справочник: Организации */}
      {activeTab === 'orgs' && (
        <div className="bg-[#171A21] rounded-2xl border border-[#2D3139] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#2D3139] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold text-[#E0E0E0]">
                Справочник «Организации» ({sortedOrgs.length})
              </h3>
            </div>
            <button
              id="btn-add-organization"
              onClick={() => {
                setSelectedOrg(null);
                setOrgModalOpen(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить организацию</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs select-none table-fixed">
              <colgroup>
                <col style={{ width: `${orgWidths.id}px` }} />
                <col style={{ width: `${orgWidths.name}px` }} />
                <col style={{ width: `${orgWidths.director}px` }} />
                <col style={{ width: `${orgWidths.email}px` }} />
                <col style={{ width: `${orgWidths.actions}px` }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#2D3139] bg-[#0F1115]/60 text-gray-400 font-semibold uppercase tracking-wider">
                  <th
                    style={{ width: `${orgWidths.id}px`, minWidth: 50 }}
                    className="py-3 px-4 relative group overflow-hidden border-r border-[#2D3139]"
                  >
                    <div
                      onClick={() => handleSortToggle(orgSort, setOrgSort, 'id')}
                      className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                    >
                      <span className="truncate block" title="ID">ID</span>
                      {renderSortIcon('id', orgSort.field, orgSort.asc)}
                    </div>
                    <div
                      onMouseDown={(e) => startResizing('orgs', 'id', orgWidths.id, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: `${orgWidths.name}px`, minWidth: 100 }}
                    className="py-3 px-4 relative group overflow-hidden border-r border-[#2D3139]"
                  >
                    <div
                      onClick={() => handleSortToggle(orgSort, setOrgSort, 'name')}
                      className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                    >
                      <span className="truncate block" title="Организация">Организация *</span>
                      {renderSortIcon('name', orgSort.field, orgSort.asc)}
                    </div>
                    <div
                      onMouseDown={(e) => startResizing('orgs', 'name', orgWidths.name, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: `${orgWidths.director}px`, minWidth: 100 }}
                    className="py-3 px-4 relative group overflow-hidden border-r border-[#2D3139]"
                  >
                    <div
                      onClick={() => handleSortToggle(orgSort, setOrgSort, 'director')}
                      className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                    >
                      <span className="truncate block" title="Руководитель">Руководитель</span>
                      {renderSortIcon('director', orgSort.field, orgSort.asc)}
                    </div>
                    <div
                      onMouseDown={(e) => startResizing('orgs', 'director', orgWidths.director, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: `${orgWidths.email}px`, minWidth: 100 }}
                    className="py-3 px-4 relative group overflow-hidden border-r border-[#2D3139]"
                  >
                    <div
                      onClick={() => handleSortToggle(orgSort, setOrgSort, 'email')}
                      className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                    >
                      <span className="truncate block" title="e-mail">e-mail</span>
                      {renderSortIcon('email', orgSort.field, orgSort.asc)}
                    </div>
                    <div
                      onMouseDown={(e) => startResizing('orgs', 'email', orgWidths.email, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: `${orgWidths.actions}px`, minWidth: 70 }}
                    className="py-3 px-4 text-right overflow-hidden"
                  >
                    <span className="truncate block" title="Действия">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D3139] text-[#E0E0E0] font-medium">
                {sortedOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-[#1F222B]/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-500 break-words overflow-hidden border-r border-[#2D3139]">{org.id}</td>
                    <td className="py-3 px-4 font-semibold text-[#E0E0E0] break-words whitespace-normal leading-relaxed overflow-hidden border-r border-[#2D3139]">{org.name}</td>
                    <td className="py-3 px-4 text-gray-300 break-words whitespace-normal leading-relaxed overflow-hidden border-r border-[#2D3139]">
                      {org.director ? (
                        <span className="flex items-center gap-1.5 break-words">
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="break-words">{org.director}</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-300 font-mono break-all whitespace-normal overflow-hidden border-r border-[#2D3139]">
                      {org.email ? (
                        <span className="flex items-center gap-1.5 break-all">
                          <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <a href={`mailto:${org.email}`} className="text-blue-400 hover:underline break-all">
                            {org.email}
                          </a>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right overflow-hidden">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedOrg(org);
                            setOrgModalOpen(true);
                          }}
                          title="Редактировать запись"
                          className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-[#1F222B] rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            confirmDelete(
                              'Удаление организации',
                              `Вы действительно хотите удалить организацию «${org.name}»? Действие нельзя отменить.`,
                              () => onDeleteOrg(org.id)
                            )
                          }
                          title="Удалить запись"
                          className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedOrgs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      Организации не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Справочник: Структурное подразделение */}
      {activeTab === 'depts' && (
        <div className="bg-[#171A21] rounded-2xl border border-[#2D3139] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#2D3139] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold text-[#E0E0E0]">
                Справочник «Структурное подразделение» ({sortedDepts.length})
              </h3>
            </div>
            <button
              id="btn-add-department"
              onClick={() => {
                setSelectedDept(null);
                setDeptModalOpen(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить подразделение</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs select-none table-fixed">
              <colgroup>
                <col style={{ width: `${deptWidths.id}px` }} />
                <col style={{ width: `${deptWidths.name}px` }} />
                <col style={{ width: `${deptWidths.shortName}px` }} />
                <col style={{ width: `${deptWidths.org}px` }} />
                <col style={{ width: `${deptWidths.actions}px` }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#2D3139] bg-[#0F1115]/60 text-gray-400 font-semibold uppercase tracking-wider">
                  <th
                    style={{ width: `${deptWidths.id}px`, minWidth: 50 }}
                    className="py-3 px-4 relative group overflow-hidden border-r border-[#2D3139]"
                  >
                    <div
                      onClick={() => handleSortToggle(deptSort, setDeptSort, 'id')}
                      className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                    >
                      <span className="truncate block" title="ID">ID</span>
                      {renderSortIcon('id', deptSort.field, deptSort.asc)}
                    </div>
                    <div
                      onMouseDown={(e) => startResizing('depts', 'id', deptWidths.id, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: `${deptWidths.name}px`, minWidth: 120 }}
                    className="py-3 px-4 relative group overflow-hidden border-r border-[#2D3139]"
                  >
                    <div
                      onClick={() => handleSortToggle(deptSort, setDeptSort, 'name')}
                      className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                    >
                      <span className="truncate block" title="Структурное подразделение">Структурное подразделение *</span>
                      {renderSortIcon('name', deptSort.field, deptSort.asc)}
                    </div>
                    <div
                      onMouseDown={(e) => startResizing('depts', 'name', deptWidths.name, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: `${deptWidths.shortName}px`, minWidth: 100 }}
                    className="py-3 px-4 relative group overflow-hidden border-r border-[#2D3139]"
                  >
                    <div
                      onClick={() => handleSortToggle(deptSort, setDeptSort, 'shortName')}
                      className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                    >
                      <span className="truncate block" title="Сокращенное название СП">Сокращенное название СП *</span>
                      {renderSortIcon('shortName', deptSort.field, deptSort.asc)}
                    </div>
                    <div
                      onMouseDown={(e) => startResizing('depts', 'shortName', deptWidths.shortName, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: `${deptWidths.org}px`, minWidth: 100 }}
                    className="py-3 px-4 relative group overflow-hidden border-r border-[#2D3139]"
                  >
                    <div
                      onClick={() => handleSortToggle(deptSort, setDeptSort, 'organizationName')}
                      className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                    >
                      <span className="truncate block" title="Организация">Организация *</span>
                      {renderSortIcon('organizationName', deptSort.field, deptSort.asc)}
                    </div>
                    <div
                      onMouseDown={(e) => startResizing('depts', 'org', deptWidths.org, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: `${deptWidths.actions}px`, minWidth: 70 }}
                    className="py-3 px-4 text-right overflow-hidden"
                  >
                    <span className="truncate block" title="Действия">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D3139] text-[#E0E0E0] font-medium">
                {sortedDepts.map((dept) => (
                  <tr key={dept.id} className="hover:bg-[#1F222B]/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-500 break-words overflow-hidden border-r border-[#2D3139]">{dept.id}</td>
                    <td className="py-3 px-4 font-semibold text-[#E0E0E0] break-words whitespace-normal leading-relaxed overflow-hidden border-r border-[#2D3139]">{dept.name}</td>
                    <td className="py-3 px-4 break-words whitespace-normal overflow-hidden border-r border-[#2D3139]">
                      <span className="px-2 py-0.5 rounded bg-blue-600/10 text-blue-400 font-mono font-bold border border-blue-500/20 inline-block break-words">
                        {dept.shortName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300 break-words whitespace-normal leading-relaxed overflow-hidden border-r border-[#2D3139]">
                      {dept.organizationName || '—'}
                    </td>
                    <td className="py-3 px-4 text-right overflow-hidden">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedDept(dept);
                            setDeptModalOpen(true);
                          }}
                          title="Редактировать запись"
                          className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-[#1F222B] rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            confirmDelete(
                              'Удаление подразделения',
                              `Вы действительно хотите удалить подразделение «${dept.name}» (${dept.shortName})?`,
                              () => onDeleteDept(dept.id)
                            )
                          }
                          title="Удалить запись"
                          className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedDepts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      Подразделения не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Справочник: Сотрудники */}
      {activeTab === 'emps' && (
        <div className="bg-[#171A21] rounded-2xl border border-[#2D3139] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#2D3139] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold text-[#E0E0E0]">
                Справочник «Сотрудники» ({sortedEmps.length})
              </h3>
            </div>
            <button
              id="btn-add-employee"
              onClick={() => {
                setSelectedEmp(null);
                setEmpModalOpen(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить сотрудника</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs select-none table-fixed">
              <colgroup>
                <col style={{ width: `${empWidths.id}px` }} />
                <col style={{ width: `${empWidths.fullName}px` }} />
                <col style={{ width: `${empWidths.position}px` }} />
                <col style={{ width: `${empWidths.dept}px` }} />
                <col style={{ width: `${empWidths.org}px` }} />
                <col style={{ width: `${empWidths.actions}px` }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#2D3139] bg-[#0F1115]/60 text-gray-400 font-semibold uppercase tracking-wider">
                  <th
                    style={{ width: `${empWidths.id}px`, minWidth: 50 }}
                    className="py-3 px-4 relative group overflow-hidden border-r border-[#2D3139]"
                  >
                    <div
                      onClick={() => handleSortToggle(empSort, setEmpSort, 'id')}
                      className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                    >
                      <span className="truncate block" title="ID">ID</span>
                      {renderSortIcon('id', empSort.field, empSort.asc)}
                    </div>
                    <div
                      onMouseDown={(e) => startResizing('emps', 'id', empWidths.id, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: `${empWidths.fullName}px`, minWidth: 120 }}
                    className="py-3 px-4 relative group overflow-hidden border-r border-[#2D3139]"
                  >
                    <div
                      onClick={() => handleSortToggle(empSort, setEmpSort, 'fullName')}
                      className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                    >
                      <span className="truncate block" title="Сотрудник (ФИО)">Сотрудник (ФИО) *</span>
                      {renderSortIcon('fullName', empSort.field, empSort.asc)}
                    </div>
                    <div
                      onMouseDown={(e) => startResizing('emps', 'fullName', empWidths.fullName, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: `${empWidths.position}px`, minWidth: 100 }}
                    className="py-3 px-4 relative group overflow-hidden border-r border-[#2D3139]"
                  >
                    <div
                      onClick={() => handleSortToggle(empSort, setEmpSort, 'position')}
                      className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                    >
                      <span className="truncate block" title="Должность">Должность</span>
                      {renderSortIcon('position', empSort.field, empSort.asc)}
                    </div>
                    <div
                      onMouseDown={(e) => startResizing('emps', 'position', empWidths.position, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: `${empWidths.dept}px`, minWidth: 100 }}
                    className="py-3 px-4 relative group overflow-hidden border-r border-[#2D3139]"
                  >
                    <div
                      onClick={() => handleSortToggle(empSort, setEmpSort, 'departmentShortName')}
                      className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                    >
                      <span className="truncate block" title="СП">СП *</span>
                      {renderSortIcon('departmentShortName', empSort.field, empSort.asc)}
                    </div>
                    <div
                      onMouseDown={(e) => startResizing('emps', 'dept', empWidths.dept, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: `${empWidths.org}px`, minWidth: 100 }}
                    className="py-3 px-4 relative group overflow-hidden border-r border-[#2D3139]"
                  >
                    <div
                      onClick={() => handleSortToggle(empSort, setEmpSort, 'organizationName')}
                      className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                    >
                      <span className="truncate block" title="Организация">Организация *</span>
                      {renderSortIcon('organizationName', empSort.field, empSort.asc)}
                    </div>
                    <div
                      onMouseDown={(e) => startResizing('emps', 'org', empWidths.org, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: `${empWidths.actions}px`, minWidth: 70 }}
                    className="py-3 px-4 text-right overflow-hidden"
                  >
                    <span className="truncate block" title="Действия">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D3139] text-[#E0E0E0] font-medium">
                {sortedEmps.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[#1F222B]/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-500 break-words overflow-hidden border-r border-[#2D3139]">{emp.id}</td>
                    <td className="py-3 px-4 font-semibold text-[#E0E0E0] break-words whitespace-normal leading-relaxed overflow-hidden border-r border-[#2D3139]">{emp.fullName}</td>
                    <td className="py-3 px-4 text-gray-300 break-words whitespace-normal leading-relaxed overflow-hidden border-r border-[#2D3139]">
                      {emp.position ? (
                        <span className="inline-flex items-center gap-1.5 break-words">
                          <Briefcase className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="break-words">{emp.position}</span>
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 break-words whitespace-normal overflow-hidden border-r border-[#2D3139]">
                      <span className="px-2 py-0.5 rounded bg-[#0F1115] text-[#E0E0E0] font-mono font-medium border border-[#2D3139] inline-block break-words">
                        {emp.departmentShortName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300 break-words whitespace-normal leading-relaxed overflow-hidden border-r border-[#2D3139]">
                      {emp.organizationName || '—'}
                    </td>
                    <td className="py-3 px-4 text-right overflow-hidden">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedEmp(emp);
                            setEmpModalOpen(true);
                          }}
                          title="Редактировать запись"
                          className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-[#1F222B] rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            confirmDelete(
                              'Удаление сотрудника',
                              `Вы действительно хотите удалить сотрудника «${emp.fullName}»?`,
                              () => onDeleteEmp(emp.id)
                            )
                          }
                          title="Удалить запись"
                          className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedEmps.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      Сотрудники не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Справочник: Тип документа */}
      {activeTab === 'docTypes' && (
        <div className="bg-[#171A21] rounded-2xl border border-[#2D3139] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#2D3139] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold text-[#E0E0E0]">
                Справочник «Тип документа» ({sortedDocTypes.length})
              </h3>
            </div>
            <button
              id="btn-add-doc-type"
              onClick={() => {
                setSelectedDocType(null);
                setDocTypeModalOpen(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить тип</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs select-none table-fixed">
              <colgroup>
                <col style={{ width: `${docTypeWidths.id}px` }} />
                <col style={{ width: `${docTypeWidths.name}px` }} />
                <col style={{ width: `${docTypeWidths.actions}px` }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#2D3139] bg-[#0F1115]/60 text-gray-400 font-semibold uppercase tracking-wider">
                  <th
                    style={{ width: `${docTypeWidths.id}px`, minWidth: 50 }}
                    className="py-3 px-4 relative group overflow-hidden border-r border-[#2D3139]"
                  >
                    <div
                      onClick={() => handleSortToggle(docTypeSort, setDocTypeSort, 'id')}
                      className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                    >
                      <span className="truncate block" title="ID">ID</span>
                      {renderSortIcon('id', docTypeSort.field, docTypeSort.asc)}
                    </div>
                    <div
                      onMouseDown={(e) => startResizing('docTypes', 'id', docTypeWidths.id, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: `${docTypeWidths.name}px`, minWidth: 150 }}
                    className="py-3 px-4 relative group overflow-hidden border-r border-[#2D3139]"
                  >
                    <div
                      onClick={() => handleSortToggle(docTypeSort, setDocTypeSort, 'name')}
                      className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                    >
                      <span className="truncate block" title="Тип документа">Тип документа *</span>
                      {renderSortIcon('name', docTypeSort.field, docTypeSort.asc)}
                    </div>
                    <div
                      onMouseDown={(e) => startResizing('docTypes', 'name', docTypeWidths.name, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: `${docTypeWidths.actions}px`, minWidth: 70 }}
                    className="py-3 px-4 text-right overflow-hidden"
                  >
                    <span className="truncate block" title="Действия">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D3139] text-[#E0E0E0] font-medium">
                {sortedDocTypes.map((type) => (
                  <tr key={type.id} className="hover:bg-[#1F222B]/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-500 break-words overflow-hidden border-r border-[#2D3139]">{type.id}</td>
                    <td className="py-3 px-4 font-semibold text-[#E0E0E0] break-words whitespace-normal leading-relaxed overflow-hidden border-r border-[#2D3139]">{type.name}</td>
                    <td className="py-3 px-4 text-right overflow-hidden">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedDocType(type);
                            setDocTypeModalOpen(true);
                          }}
                          title="Редактировать запись"
                          className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-[#1F222B] rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            confirmDelete(
                              'Удаление типа документа',
                              `Вы действительно хотите удалить тип «${type.name}»?`,
                              () => onDeleteDocType(type.id)
                            )
                          }
                          title="Удалить запись"
                          className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedDocTypes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-500">
                      Типы документов не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Справочник: Направление */}
      {activeTab === 'directions' && (
        <div className="bg-[#171A21] rounded-2xl border border-[#2D3139] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#2D3139] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold text-[#E0E0E0]">
                Справочник «Направление» ({sortedDirs.length})
              </h3>
            </div>
            <button
              id="btn-add-direction"
              onClick={() => {
                setSelectedDir(null);
                setDirModalOpen(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить направление</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs select-none table-fixed">
              <colgroup>
                <col style={{ width: `${dirWidths.id}px` }} />
                <col style={{ width: `${dirWidths.name}px` }} />
                <col style={{ width: `${dirWidths.actions}px` }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#2D3139] bg-[#0F1115]/60 text-gray-400 font-semibold uppercase tracking-wider">
                  <th
                    style={{ width: `${dirWidths.id}px`, minWidth: 50 }}
                    className="py-3 px-4 relative group overflow-hidden border-r border-[#2D3139]"
                  >
                    <div
                      onClick={() => handleSortToggle(dirSort, setDirSort, 'id')}
                      className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                    >
                      <span className="truncate block" title="ID">ID</span>
                      {renderSortIcon('id', dirSort.field, dirSort.asc)}
                    </div>
                    <div
                      onMouseDown={(e) => startResizing('directions', 'id', dirWidths.id, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: `${dirWidths.name}px`, minWidth: 150 }}
                    className="py-3 px-4 relative group overflow-hidden border-r border-[#2D3139]"
                  >
                    <div
                      onClick={() => handleSortToggle(dirSort, setDirSort, 'name')}
                      className="flex items-center justify-between cursor-pointer min-w-0 pr-1.5"
                    >
                      <span className="truncate block" title="Направление">Направление *</span>
                      {renderSortIcon('name', dirSort.field, dirSort.asc)}
                    </div>
                    <div
                      onMouseDown={(e) => startResizing('directions', 'name', dirWidths.name, e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 z-10"
                    />
                  </th>

                  <th
                    style={{ width: `${dirWidths.actions}px`, minWidth: 70 }}
                    className="py-3 px-4 text-right overflow-hidden"
                  >
                    <span className="truncate block" title="Действия">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D3139] text-[#E0E0E0] font-medium">
                {sortedDirs.map((dir) => (
                  <tr key={dir.id} className="hover:bg-[#1F222B]/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-500 break-words overflow-hidden border-r border-[#2D3139]">{dir.id}</td>
                    <td className="py-3 px-4 font-semibold text-[#E0E0E0] break-words whitespace-normal leading-relaxed overflow-hidden border-r border-[#2D3139]">{dir.name}</td>
                    <td className="py-3 px-4 text-right overflow-hidden">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedDir(dir);
                            setDirModalOpen(true);
                          }}
                          title="Редактировать запись"
                          className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-[#1F222B] rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            confirmDelete(
                              'Удаление направления',
                              `Вы действительно хотите удалить направление «${dir.name}»?`,
                              () => onDeleteDir(dir.id)
                            )
                          }
                          title="Удалить запись"
                          className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedDirs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-500">
                      Направления не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Модалки создания/редактирования */}
      <OrganizationModal
        isOpen={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
        onSave={onSaveOrg}
        initialData={selectedOrg}
        existingOrganizations={organizations}
      />

      <DepartmentModal
        isOpen={deptModalOpen}
        onClose={() => {
          setDeptModalOpen(false);
          setSelectedDept(null);
          setDeptInitialOrgId(undefined);
        }}
        onSave={async (deptData) => {
          await onSaveDept(deptData);
          setDeptInitialOrgId(undefined);
        }}
        organizations={organizations}
        onOpenNewOrgModal={() => {
          setSelectedOrg(null);
          setOrgModalOpen(true);
        }}
        initialData={selectedDept}
        defaultOrganizationId={deptInitialOrgId}
        existingDepartments={departments}
      />

      <EmployeeModal
        isOpen={empModalOpen}
        onClose={() => setEmpModalOpen(false)}
        onSave={onSaveEmp}
        departments={departments}
        organizations={organizations}
        onOpenNewOrgModal={() => {
          setSelectedOrg(null);
          setOrgModalOpen(true);
        }}
        onOpenNewDepartmentModal={(orgId) => {
          setSelectedDept(null);
          setDeptInitialOrgId(orgId);
          setDeptModalOpen(true);
        }}
        initialData={selectedEmp}
      />

      <DocTypeModal
        isOpen={docTypeModalOpen}
        onClose={() => setDocTypeModalOpen(false)}
        onSave={onSaveDocType}
        initialData={selectedDocType}
        existingTypes={documentTypes}
      />

      <DirectionModal
        isOpen={dirModalOpen}
        onClose={() => setDirModalOpen(false)}
        onSave={onSaveDir}
        initialData={selectedDir}
        existingDirections={directions}
      />

      {/* Диалог подтверждения удаления */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#171A21] rounded-2xl shadow-2xl border border-[#2D3139] w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 text-rose-400 flex items-center justify-center border border-rose-900">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#E0E0E0]">
                  {deleteDialog.title}
                </h4>
                <p className="text-xs text-gray-400">
                  Подтверждение удаления
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              {deleteDialog.description}
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-gray-400 hover:text-white text-xs font-semibold rounded-xl hover:bg-[#1F222B] transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-rose-500/20 transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
