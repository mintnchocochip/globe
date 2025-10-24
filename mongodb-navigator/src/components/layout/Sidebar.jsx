import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  CircleStackIcon,
  RectangleGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowUpIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Databases', href: '/databases', icon: CircleStackIcon },
  { name: 'Collections', href: '/collections', icon: RectangleGroupIcon },
  { name: 'Query Builder', href: '/query-builder', icon: MagnifyingGlassIcon },
  { name: 'Schema Upload', href: '/schema-upload', icon: DocumentArrowUpIcon },
  { name: 'Stats & Monitoring', href: '/stats', icon: ChartBarIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export default function Sidebar({ overview }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`${isCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 border-r border-gray-200 bg-white text-slate-900 shadow-lg transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100`}
    >
      <div className="flex h-full flex-col">
        {/* Logo/Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-slate-800">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">globe</h1>
              <img src="src/assets/earth.png" alt="🌏" className="h-6 w-6" />
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-gray-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `group flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                    : 'text-slate-600 hover:bg-gray-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`
              }
            >
              <item.icon
                className="mr-3 h-6 w-6 flex-shrink-0"
                aria-hidden="true"
              />
              {!isCollapsed && item.name}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 dark:border-slate-800">
          {!isCollapsed && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <p>Connected to:</p>
              <p
                className="truncate text-slate-700 dark:text-slate-200"
                title={overview?.connectedTo || 'Connection information unavailable'}
              >
                {overview?.connectedTo ?? '—'}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}