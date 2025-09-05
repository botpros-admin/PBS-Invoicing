import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Building, Check } from 'lucide-react';
import { supabase } from '../api/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

interface Laboratory {
  laboratory_id: string;
  laboratory_name: string;
  laboratory_code: string;
  is_current: boolean;
}

interface OrganizationHierarchyProps {
  mode?: 'switcher' | 'management';
  onSelect?: (node: any) => void;
}

const OrganizationHierarchy: React.FC<OrganizationHierarchyProps> = ({ 
  mode = 'switcher',
  onSelect 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [currentLab, setCurrentLab] = useState<Laboratory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, session } = useAuth();

  // Fetch user's accessible laboratories
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserLaboratories();
    }
  }, [session]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUserLaboratories = async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_user_laboratories', {
        p_user_id: session.user.id
      });

      if (error) {
        console.error('Error fetching laboratories:', error);
        toast.error('Failed to load organizations');
        return;
      }

      setLaboratories(data || []);
      
      // Set current laboratory
      const current = data?.find((lab: Laboratory) => lab.is_current);
      if (current) {
        setCurrentLab(current);
      } else if (data && data.length > 0) {
        // If no current lab set, select the first one
        await switchLaboratory(data[0]);
      }
    } catch (error) {
      console.error('Error fetching laboratories:', error);
      toast.error('Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  };

  const switchLaboratory = async (laboratory: Laboratory) => {
    if (!session?.user?.id || laboratory.laboratory_id === currentLab?.laboratory_id) {
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('switch_laboratory_context', {
        p_user_id: session.user.id,
        p_laboratory_id: laboratory.laboratory_id
      });

      if (error) throw error;

      setCurrentLab(laboratory);
      setIsOpen(false);
      
      // Update the laboratories list to reflect the new current
      setLaboratories(labs => 
        labs.map(lab => ({
          ...lab,
          is_current: lab.laboratory_id === laboratory.laboratory_id
        }))
      );

      toast.success(`Switched to ${laboratory.laboratory_name}`);
      
      // Reload the page to refresh all data with new context
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('Error switching laboratory:', error);
      toast.error('Failed to switch organization');
    } finally {
      setIsLoading(false);
    }
  };

  // Management mode not implemented for now
  if (mode === 'management') {
    return (
      <div className="p-4 text-gray-500">
        Organization management view coming soon...
      </div>
    );
  }

  // Don't render if user doesn't have access to multiple labs
  if (laboratories.length <= 1) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Building className="h-4 w-4" />
        <span className="max-w-[200px] truncate">
          {currentLab ? currentLab.laboratory_name : 'Select Organization'}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
          <div className="px-3 py-2 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase">Switch Organization</p>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {laboratories.map((lab) => (
              <button
                key={lab.laboratory_id}
                onClick={() => switchLaboratory(lab)}
                disabled={isLoading || lab.is_current}
                className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50 disabled:cursor-default ${
                  lab.is_current ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {lab.laboratory_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Code: {lab.laboratory_code}
                    </p>
                  </div>
                </div>
                {lab.is_current && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>
          
          {laboratories.length === 0 && (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-gray-500">No organizations available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrganizationHierarchy;
