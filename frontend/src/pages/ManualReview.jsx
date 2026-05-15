import React from 'react';
import ManualReviewQueueUI from '../components/ManualReviewQueueUI';

const ManualReview = ({ reviewQueue, updateReviewStatus, setSelectedRawIncident }) => {
  return (
    <div className="fade-in">
      <ManualReviewQueueUI 
        queue={reviewQueue} 
        onUpdateStatus={updateReviewStatus} 
        onSelectItem={setSelectedRawIncident} 
      />
    </div>
  );
};

export default ManualReview;
