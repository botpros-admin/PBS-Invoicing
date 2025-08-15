import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Menu,
  Search,
  Bell,
  User,
  ChevronDown,
  X,
  Building,
  FileText,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationDropdown from './NotificationDropdown';
import UserProfileModal from './modals/UserProfileModal';
import OrganizationHierarchy from './OrganizationHierarchy';
import { useNavigate, NavLink } from 'react-router-dom';
import debounce from 'lodash/debounce';
import { SearchResult } from '../types'; // Import from shared types
import { performGlobalSearch } from '../api/services/search.service'; // Import the search service

interface HeaderProps {
  toggleSidebar: () => void;
}

// SearchResult interface moved to src/types/index.ts

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced function to perform the search
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (term.trim().length < 3) {
        setSearchResults([]);
        setShowSearchResults(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      console.log(`Searching for: ${term}`);
      // Call the API service function
      const results = await performGlobalSearch(term);

      // Limit results (already handled by RPC function, but good practice client-side too)
      setSearchResults(results.slice(0, 10));
      setShowSearchResults(true);
      setIsSearching(false);
    }, 500),
    []
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Trigger debounced search only if length >= 3
    if (value.trim().length >= 3) {
        debouncedSearch(value);
    } else {
        // If length < 3, clear results immediately without debounce
        setSearchResults([]);
        setShowSearchResults(false);
        // Cancel any pending debounced calls
        debouncedSearch.cancel();
    }
  };

  // Handle search result click
  const handleResultClick = (result: SearchResult) => {
    setSearchTerm('');
    setShowSearchResults(false);

    // Navigate based on result type
    if (result.type === 'invoice') {
      navigate(`/dashboard/invoices/${result.id}`); // Updated path
    } else if (result.type === 'client' || result.type === 'clinic') {
      navigate(`/dashboard/settings`); // Updated path
    } else if (result.type === 'patient') {
       // TODO: Determine appropriate navigation for patient
       console.log("Navigate to patient related view for:", result.id);
    } else if (result.type === 'user') {
      navigate('/dashboard/settings'); // Updated path
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
    debouncedSearch.cancel(); // Cancel any pending search
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-6">
      {/* Left Side */}
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
        >
          <Menu size={24} />
        </button>

        <div className="ml-4 relative hidden md:block w-80" ref={searchRef}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search invoices, clients, patients..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-secondary focus:ring-1 focus:ring-secondary sm:text-sm" // Updated focus color
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
            >
              <X size={16} />
            </button>
          )}

          {/* Search Results Dropdown / Loading / No Results */}
          {showSearchResults && (
            <div className="absolute mt-1 w-full bg-white rounded-md shadow-lg max-h-96 overflow-y-auto z-10 border border-gray-200">
              {isSearching ? (
                <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
              ) : searchResults.length > 0 ? (
                <div className="py-1">
                  {searchResults.map((result, index) => (
                    <div
                      key={`${result.type}-${result.id}-${index}`}
                      onClick={() => handleResultClick(result)}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          {result.type === 'invoice' && <FileText size={16} className="text-indigo-600" />}
                          {result.type === 'client' && <Briefcase size={16} className="text-indigo-600" />}
                          {result.type === 'clinic' && <Building size={16} className="text-indigo-600" />}
                          {result.type === 'patient' && <User size={16} className="text-indigo-600" />}
                          {result.type === 'user' && <User size={16} className="text-green-600" />}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{result.title}</p>
                          <p className="text-xs text-gray-500">
                            {result.type.charAt(0).toUpperCase() + result.type.slice(1)}: {result.subtitle}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">
                  No results found for "{searchTerm}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center space-x-4">
        {/* Organization Switcher */}
        <OrganizationHierarchy mode="switcher" />
        
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none relative"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs font-medium flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <NotificationDropdown onClose={() => setShowNotifications(false)} />
          )}
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none"
          >
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <User size={20} className="text-gray-600" />
            </div>
            <div className="hidden md:block">
              <div className="font-medium">{user?.name}</div>
              <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
            </div>
            <ChevronDown size={16} />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  setShowProfileModal(true);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Your Profile
              </button>
              <NavLink
                to="/dashboard/user-settings"
                onClick={() => setShowUserMenu(false)}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Settings
              </NavLink>
              <button
                onClick={async () => {
                  try {
                    await logout();
                    navigate('/login');
                  } catch (error) {
                    console.error('Error logging out:', error);
                  } finally {
                    setShowUserMenu(false);
                  }
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />
    </header>
  );
};

export default Header;
