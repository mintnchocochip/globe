import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchOverview = async () => {
      try {
        const response = await fetch('http://127.0.0.1:6969/dashboard');
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const json = await response.json();
        if (isMounted) {
          setOverview(json);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load dashboard overview', err);
        }
      }
    };

    fetchOverview();
    const interval = setInterval(fetchOverview, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar overview={overview} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar overview={overview} />
        
        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}