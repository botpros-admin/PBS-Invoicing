import React from 'react';
import { DuplicateReviewQueue } from '../../components/import/DuplicateReviewQueue';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DuplicateReviewPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/billing')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Billing Hub
          </button>
        </div>

        <DuplicateReviewQueue />

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How Duplicate Prevention Works</h3>
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">1. Real-Time Detection</h4>
              <p>As you enter accession numbers and CPT codes, the system checks for duplicates in real-time, showing warnings immediately.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">2. Database Constraint</h4>
              <p>A unique constraint on (organization_id, accession_number, cpt_code) prevents duplicate entries at the database level.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">3. Review Queue</h4>
              <p>Potential duplicates from bulk imports are queued for review instead of being rejected outright.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">4. Override Mechanism</h4>
              <p>Authorized users can approve duplicates with a business justification, creating an audit trail.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">5. Audit Trail</h4>
              <p>All override decisions are logged with user, timestamp, and reason for compliance and review.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuplicateReviewPage;