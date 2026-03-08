import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PatientProfile } from '../types/api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getSessionId } from '../utils/sessionManager';
import '../styles/PatientProfile.css';

const initialProfile: PatientProfile = {
  name: '',
  age: '',
  sex: '',
  location: '',
  conditions: [],
  medications: [],
};

// API endpoint for updating patient profile
const UPDATE_PROFILE_ENDPOINT = 'https://rk1zsye504.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher/update-profile';

function PatientProfile() {
  const { t } = useTranslation();
  const [profile, setProfile] = useLocalStorage<PatientProfile>('patientProfile', initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<PatientProfile>(profile);
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleEdit = () => {
    setEditedProfile(profile);
    setIsEditing(true);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Get persistent sessionId
      const sessionId = getSessionId();

      // Send profile to backend
      const response = await fetch(UPDATE_PROFILE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          profileData: editedProfile,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Profile saved to backend:', data);

      // Update local state
      setProfile(editedProfile);
      setIsEditing(false);
      setSaveSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      setSaveError('Failed to save profile to server. Changes saved locally only.');
      
      // Still save locally even if backend fails
      setProfile(editedProfile);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const addCondition = () => {
    if (newCondition.trim()) {
      setEditedProfile({
        ...editedProfile,
        conditions: [...editedProfile.conditions, newCondition.trim()],
      });
      setNewCondition('');
    }
  };

  const removeCondition = (index: number) => {
    setEditedProfile({
      ...editedProfile,
      conditions: editedProfile.conditions.filter((_, i) => i !== index),
    });
  };

  const addMedication = () => {
    if (newMedication.trim()) {
      setEditedProfile({
        ...editedProfile,
        medications: [...editedProfile.medications, newMedication.trim()],
      });
      setNewMedication('');
    }
  };

  const removeMedication = (index: number) => {
    setEditedProfile({
      ...editedProfile,
      medications: editedProfile.medications.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="patient-profile">
      <div className="patient-profile__header">
        <h2 className="patient-profile__title">{t('profile.title')}</h2>
        {!isEditing && (
          <button className="patient-profile__edit-btn" onClick={handleEdit}>
            {t('profile.edit')}
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <div className="patient-profile__success-message">
          ✓ {t('profile.success_message')}
        </div>
      )}
      {saveError && (
        <div className="patient-profile__error-message">
          ⚠ {t('profile.error_message')}
        </div>
      )}

      <div className="patient-profile__content">
        {/* Demographics Section */}
        <section className="patient-profile__section">
          <h3 className="patient-profile__section-title">{t('profile.demographics')}</h3>
          <div className="patient-profile__form">
            <div className="patient-profile__field">
              <label className="patient-profile__label">{t('profile.name')}</label>
              {isEditing ? (
                <input
                  type="text"
                  className="patient-profile__input"
                  value={editedProfile.name}
                  onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                  placeholder={t('profile.enter_name')}
                />
              ) : (
                <p className="patient-profile__value">{profile.name || t('profile.not_provided')}</p>
              )}
            </div>

            <div className="patient-profile__field">
              <label className="patient-profile__label">{t('profile.age')}</label>
              {isEditing ? (
                <input
                  type="text"
                  className="patient-profile__input"
                  value={editedProfile.age}
                  onChange={(e) => setEditedProfile({ ...editedProfile, age: e.target.value })}
                  placeholder={t('profile.enter_age')}
                />
              ) : (
                <p className="patient-profile__value">{profile.age || t('profile.not_provided')}</p>
              )}
            </div>

            <div className="patient-profile__field">
              <label className="patient-profile__label">{t('profile.sex')}</label>
              {isEditing ? (
                <select
                  className="patient-profile__input"
                  value={editedProfile.sex}
                  onChange={(e) => setEditedProfile({ ...editedProfile, sex: e.target.value })}
                >
                  <option value="">{t('profile.select')}</option>
                  <option value="Male">{t('profile.male')}</option>
                  <option value="Female">{t('profile.female')}</option>
                  <option value="Other">{t('profile.other')}</option>
                </select>
              ) : (
                <p className="patient-profile__value">{profile.sex || t('profile.not_provided')}</p>
              )}
            </div>

            <div className="patient-profile__field">
              <label className="patient-profile__label">{t('profile.location')}</label>
              {isEditing ? (
                <input
                  type="text"
                  className="patient-profile__input"
                  value={editedProfile.location}
                  onChange={(e) => setEditedProfile({ ...editedProfile, location: e.target.value })}
                  placeholder={t('profile.enter_location')}
                />
              ) : (
                <p className="patient-profile__value">{profile.location || t('profile.not_provided')}</p>
              )}
            </div>
          </div>
        </section>

        {/* Conditions Section */}
        <section className="patient-profile__section">
          <h3 className="patient-profile__section-title">{t('profile.medical_conditions')}</h3>
          <div className="patient-profile__tags">
            {(isEditing ? editedProfile.conditions : profile.conditions).map((condition, index) => (
              <div key={index} className="patient-profile__tag">
                {condition}
                {isEditing && (
                  <button
                    className="patient-profile__tag-remove"
                    onClick={() => removeCondition(index)}
                    aria-label="Remove condition"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {(isEditing ? editedProfile.conditions : profile.conditions).length === 0 && (
              <p className="patient-profile__empty">{t('profile.no_conditions')}</p>
            )}
          </div>
          {isEditing && (
            <div className="patient-profile__add-field">
              <input
                type="text"
                className="patient-profile__input"
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCondition()}
                placeholder={t('profile.add_condition')}
              />
              <button className="patient-profile__add-btn" onClick={addCondition}>
                {t('profile.add')}
              </button>
            </div>
          )}
        </section>

        {/* Medications Section */}
        <section className="patient-profile__section">
          <h3 className="patient-profile__section-title">{t('profile.current_medications')}</h3>
          <div className="patient-profile__tags">
            {(isEditing ? editedProfile.medications : profile.medications).map((medication, index) => (
              <div key={index} className="patient-profile__tag">
                {medication}
                {isEditing && (
                  <button
                    className="patient-profile__tag-remove"
                    onClick={() => removeMedication(index)}
                    aria-label="Remove medication"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {(isEditing ? editedProfile.medications : profile.medications).length === 0 && (
              <p className="patient-profile__empty">{t('profile.no_medications')}</p>
            )}
          </div>
          {isEditing && (
            <div className="patient-profile__add-field">
              <input
                type="text"
                className="patient-profile__input"
                value={newMedication}
                onChange={(e) => setNewMedication(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addMedication()}
                placeholder={t('profile.add_medication')}
              />
              <button className="patient-profile__add-btn" onClick={addMedication}>
                {t('profile.add')}
              </button>
            </div>
          )}
        </section>

        {/* Action Buttons */}
        {isEditing && (
          <div className="patient-profile__actions">
            <button 
              className="patient-profile__cancel-btn" 
              onClick={handleCancel}
              disabled={isSaving}
            >
              {t('profile.cancel')}
            </button>
            <button 
              className="patient-profile__save-btn" 
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? t('profile.saving') : t('profile.save_changes')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientProfile as React.FC;
