import { useState } from 'react';
import { MagnifyingGlassIcon, BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';

export default function Topbar() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search databases, collections, documents..."
            />
          </div>
        </div>

        {/* Right side - Connection info and actions */}
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-sm text-gray-600">Connected</span>
          </div>

          {/* Quick Stats */}
          <div className="hidden lg:flex items-center space-x-4 text-sm text-gray-600">
            <div>
              <span className="font-semibold">5</span> DBs
            </div>
            <div>
              <span className="font-semibold">23</span> Collections
            </div>
            <div>
              <span className="font-semibold">1.2M</span> Documents
            </div>
          </div>

          {/* Notifications */}
          <button className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100">
            <BellIcon className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Profile */}
          <button className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100">
            <UserCircleIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}