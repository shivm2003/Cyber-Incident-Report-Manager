import React from 'react';
import TechnologyInventoryUI from '../components/TechnologyInventoryUI';

const TechInventory = ({ companyProfile, handleSaveProfile, isSavingProfile }) => {
  return (
    <div className="fade-in">
      <TechnologyInventoryUI 
        profile={companyProfile} 
        onUpdate={handleSaveProfile} 
        isSaving={isSavingProfile} 
      />
    </div>
  );
};

export default TechInventory;
