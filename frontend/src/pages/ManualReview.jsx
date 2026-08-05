import React from 'react';
import ManualReviewQueueUI from '../components/ManualReviewQueueUI';

const ManualReview = ({ reviewQueue, updateReviewStatus, clearReviewQueue, setSelectedRawIncident }) => {
  return (
    <div className="fade-in">
      <ManualReviewQueueUI 
        queue={reviewQueue} 
        onUpdateStatus={updateReviewStatus}
        onClearAll={clearReviewQueue}
        onSelectItem={setSelectedRawIncident} 
      />
    </div>
  );
};

export default ManualReview;
