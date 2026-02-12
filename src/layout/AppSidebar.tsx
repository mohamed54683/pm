"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { ChevronDownIcon, HorizontaLDots } from "../icons/index";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const I = ({ d, ...p }: { d: string } & React.SVGProps<SVGSVGElement>) => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d={d} />
  </svg>
);

const DashboardIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

const ProjectsIcon = () => <I d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />;

const DocumentsIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const AssetsIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const navItems: NavItem[] = [
  { icon: <DashboardIcon />, name: "Dashboard", path: "/" },
  {
    icon: <ProjectsIcon />,
    name: "Projects",
    subItems: [
      { name: "All Projects", path: "/projects" },
      { name: "Tasks", path: "/tasks" },
      { name: "My Tasks", path: "/tasks/my-tasks" },
      { name: "Kanban Board", path: "/tasks/kanban" },
      { name: "Sprints", path: "/sprints" },
      { name: "Backlog", path: "/sprints/backlog" },
      { name: "Time Entries", path: "/time-tracking" },
      { name: "Timesheet", path: "/time-tracking/timesheet" },
      { name: "Budgets", path: "/budgets" },
      { name: "Expenses", path: "/budgets/expenses" },
      { name: "Risks", path: "/risks" },
      { name: "Issues", path: "/issues" },
      { name: "Change Requests", path: "/changes" },
      { name: "Templates", path: "/projects/templates" },
      { name: "Gantt Chart", path: "/projects/gantt" },
      { name: "Calendar", path: "/projects/calendar" },
    ],
  },
  { icon: <DocumentsIcon />, name: "Documents", path: "/documents" },
];

const othersItems: NavItem[] = [
  {
    icon: <AssetsIcon />,
    name: "Assets",
    subItems: [
      { name: "Dashboard", path: "/assets" },
      { name: "Asset Register", path: "/assets/register" },
      { name: "Categories", path: "/assets/categories" },
      { name: "Branches", path: "/assets/branches" },
      { name: "Transfers", path: "/assets/transfers" },
      { name: "Custody", path: "/assets/custody" },
      { name: "Clearances", path: "/assets/clearances" },
      { name: "Reports", path: "/assets/reports" },
    ],
  },
  {
    icon: <SettingsIcon />,
    name: "Settings",
    subItems: [
      { name: "General", path: "/settings" },
      { name: "Users & Roles", path: "/settings/users" },
      { name: "Departments", path: "/settings/departments" },
      { name: "Team", path: "/team" },
      { name: "Team Members", path: "/resources" },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const [openSubmenu, setOpenSubmenu] = useState<{ type: "main" | "others"; index: number } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isActive = useCallback((path: string) => path === pathname, [pathname]);
  const showFull = isExpanded || isHovered || isMobileOpen;

  useEffect(() => {
    let matched = false;
    (["main", "others"] as const).forEach((mt) => {
      (mt === "main" ? navItems : othersItems).forEach((nav, idx) => {
        if (nav.subItems?.some((si) => isActive(si.path))) {
          setOpenSubmenu({ type: mt, index: idx });
          matched = true;
        }
      });
    });
    if (!matched) setOpenSubmenu(null);
  }, [pathname, isActive]);

  useEffect(() => {
    if (openSubmenu) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prev) => ({ ...prev, [key]: subMenuRefs.current[key]?.scrollHeight || 0 }));
      }
    }
  }, [openSubmenu]);

  const handleToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((p) => (p?.type === menuType && p?.index === index ? null : { type: menuType, index }));
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-0.5">
      {items.map((nav, index) => {
        const isOpen = openSubmenu?.type === menuType && openSubmenu?.index === index;
        const hasActive = nav.subItems?.some((si) => isActive(si.path)) || false;
        return (
          <li key={nav.name}>
            {nav.subItems ? (
              <button
                onClick={() => handleToggle(index, menuType)}
                className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isOpen || hasActive
                    ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
                } ${!showFull ? "lg:justify-center" : ""}`}
              >
                <span className={`flex-shrink-0 transition-colors ${isOpen || hasActive ? "text-brand-500 dark:text-brand-400" : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"}`}>
                  {nav.icon}
                </span>
                {showFull && (
                  <>
                    <span className="flex-1 text-left">{nav.name}</span>
                    {hasActive && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-brand-500" />}
                    <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </>
                )}
              </button>
            ) : (
              nav.path && (
                <Link
                  href={nav.path}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive(nav.path)
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
                  } ${!showFull ? "lg:justify-center" : ""}`}
                >
                  {isActive(nav.path) && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-500" />}
                  <span className={`flex-shrink-0 transition-colors ${isActive(nav.path) ? "text-brand-500 dark:text-brand-400" : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"}`}>
                    {nav.icon}
                  </span>
                  {showFull && <span>{nav.name}</span>}
                </Link>
              )
            )}
            {nav.subItems && showFull && (
              <div
                ref={(el) => { subMenuRefs.current[`${menuType}-${index}`] = el; }}
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ height: isOpen ? `${subMenuHeight[`${menuType}-${index}`]}px` : "0px" }}
              >
                <ul className="mt-1 ml-4 space-y-0.5 border-l-2 border-gray-100 pl-4 dark:border-gray-800">
                  {nav.subItems.map((sub) => (
                    <li key={sub.name}>
                      <Link
                        href={sub.path}
                        className={`group flex items-center rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                          isActive(sub.path)
                            ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
                        }`}
                      >
                        {isActive(sub.path) && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-brand-500" />}
                        {sub.name}
                        {sub.new && <span className="ml-auto rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">NEW</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-3 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${showFull ? "w-[272px]" : "w-[80px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex h-16 items-center shrink-0 ${!showFull ? "justify-center" : ""}`}>
        <Link href="/" className="flex items-center">
          {showFull ? (
            <Image className="object-contain" src="/logo.png" alt="GHIDAS" width={140} height={36} />
          ) : (
            <Image src="/logo.png" alt="GHIDAS" width={32} height={32} className="object-contain" />
          )}
        </Link>
      </div>
      <div className="mx-1 border-b border-gray-100 dark:border-gray-800" />
      <div className="flex flex-1 flex-col overflow-y-auto no-scrollbar py-4">
        <nav className="flex flex-col gap-6">
          <div>
            <h2 className={`mb-2 flex items-center px-3 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 ${!showFull ? "justify-center" : ""}`}>
              {showFull ? "Menu" : <HorizontaLDots />}
            </h2>
            {renderMenuItems(navItems, "main")}
          </div>
          <div>
            <h2 className={`mb-2 flex items-center px-3 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 ${!showFull ? "justify-center" : ""}`}>
              {showFull ? "Management" : <HorizontaLDots />}
            </h2>
            {renderMenuItems(othersItems, "others")}
          </div>
        </nav>
      </div>
      {showFull && (
        <div className="shrink-0 border-t border-gray-100 px-1 py-3 dark:border-gray-800">
          <div className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-800/50">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">GHIDAS PM</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">Enterprise Project Management</p>
          </div>
        </div>
      )}
    </aside>
  );
};

export default AppSidebar;
