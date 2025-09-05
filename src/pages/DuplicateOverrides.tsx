import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from '../context/AuthContext';

const DuplicateOverridesPage = () => {
  const { user } = useAuth();
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [reason, setReason] = useState('');

  useEffect(() => {
    const fetchDuplicates = async () => {
      // This is a placeholder for fetching flagged duplicates.
      // In a real application, you would have a table of flagged duplicates.
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .limit(10); // Placeholder limit

      if (error) {
        console.error('Error fetching duplicates:', error);
      } else {
        setDuplicates(data);
      }
    };

    fetchDuplicates();
  }, []);

  const handleOverride = async (duplicate: any) => {
    if (!reason.trim()) {
      alert('Please provide a reason for the override.');
      return;
    }

    const { error } = await supabase.from('duplicate_overrides').insert({
      accession_number: duplicate.accession_number,
      cpt_code_id: duplicate.cpt_code_id,
      laboratory_id: duplicate.laboratory_id,
      overridden_by: user?.id,
      reason: reason,
    });

    if (error) {
      console.error('Error overriding duplicate:', error);
      alert('Failed to override duplicate.');
    } else {
      alert('Duplicate overridden successfully.');
      setDuplicates(duplicates.filter((d) => d.id !== duplicate.id));
      setReason('');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Duplicate Overrides</h1>
      <p className="mb-4">
        The following line items have been flagged as potential duplicates. Please review them and authorize an override if necessary.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Accession #</th>
              <th className="py-2 px-4 border-b">CPT Code</th>
              <th className="py-2 px-4 border-b">Laboratory</th>
              <th className="py-2 px-4 border-b">Reason for Override</th>
              <th className="py-2 px-4 border-b">Action</th>
            </tr>
          </thead>
          <tbody>
            {duplicates.map((duplicate) => (
              <tr key={duplicate.id}>
                <td className="py-2 px-4 border-b">{duplicate.accession_number}</td>
                <td className="py-2 px-4 border-b">{duplicate.cpt_code_id}</td>
                <td className="py-2 px-4 border-b">{duplicate.laboratory_id}</td>
                <td className="py-2 px-4 border-b">
                  <input
                    type="text"
                    className="border p-1 w-full"
                    onChange={(e) => setReason(e.target.value)}
                  />
                </td>
                <td className="py-2 px-4 border-b">
                  <button
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                    onClick={() => handleOverride(duplicate)}
                  >
                    Override
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DuplicateOverridesPage;
