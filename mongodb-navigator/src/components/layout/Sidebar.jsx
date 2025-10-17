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
  { name: 'Aggregations', href: '/aggregations', icon: FunnelIcon },
  { name: 'Schema Upload', href: '/schema-upload', icon: DocumentArrowUpIcon },
  { name: 'Stats & Monitoring', href: '/stats', icon: ChartBarIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export default function Sidebar({ overview }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-gray-900 shadow-lg transition-all duration-300 flex-shrink-0`}>
      <div className="flex h-full flex-col">
        {/* Logo/Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-800">
          {!isCollapsed && (
            <>
              <h1 className="text-xl font-bold text-white">globe</h1>
              <img src="src/assets/earth.png" alt="🌏" className="h-8 w-8" />
            </>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800"
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
                `group flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
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
        <div className="border-t border-gray-800 p-4">
          {!isCollapsed && (
            <div className="text-xs text-gray-400">
              <p>Connected to:</p>
              <p
                className="text-gray-300 truncate"
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