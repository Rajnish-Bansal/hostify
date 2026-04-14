import React, { useState, useEffect } from 'react';
import Navbar from '../../components/organisms/Navbar/Navbar';
import { useAuth } from '../../context/AuthContext';
import { useHost } from '../../context/HostContext';
import { ShieldCheck, Check, Star, User, Phone, Mail, Briefcase, Camera, ExternalLink, LayoutDashboard } from 'lucide-react';
import { fetchUserProfile, updateUserProfile, uploadImage } from '../../services/api';
import './Profile.css';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { listings } = useHost();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Local state for editing form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    avatar: '',
    governmentId: '',
    isPhoneVerified: false,
    isIdVerified: false
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await fetchUserProfile();
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        bio: data.bio || '',
        avatar: data.avatar || '',
        governmentId: data.governmentId || '',
        isPhoneVerified: data.isPhoneVerified || false,
        isIdVerified: data.isIdVerified || false
      });
      // Sync with AuthContext in case it's stale
      updateUser(data);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleIdUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const imageUrl = await uploadImage(file);
      setFormData(prev => ({ ...prev, governmentId: imageUrl, isIdVerified: true })); // Immediately verified for demo
      const updatedUser = await updateUserProfile({ governmentId: imageUrl, isIdVerified: true });
      updateUser(updatedUser);
    } catch (err) {
      alert('Failed to upload ID. Please try again.');
    }
  };

  const handleVerifyPhone = async () => {
    // Simulated mobile verification
    try {
      const updatedUser = await updateUserProfile({ isPhoneVerified: true });
      setFormData(prev => ({ ...prev, isPhoneVerified: true }));
      updateUser(updatedUser);
    } catch (err) {
      console.error('Failed to verify phone:', err);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const imageUrl = await uploadImage(file);
      setFormData(prev => ({ ...prev, avatar: imageUrl }));
      // Save immediately to prevent loss
      await updateUserProfile({ avatar: imageUrl });
      updateUser({ avatar: imageUrl });
    } catch (err) {
      alert('Failed to upload image. Please try again.');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = await updateUserProfile(formData);
      updateUser(data);
      setIsEditing(false);
    } catch (err) {
      alert('Failed to save profile: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || loading) {
    return (
      <>
        <Navbar />
        <div className="profile-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <div className="loading-shimmer-profile">
             {loading ? 'Curating your profile...' : 'Please log in to view your profile.'}
          </div>
        </div>
      </>
    );
  }

  const isFullyVerified = formData.isPhoneVerified && formData.isIdVerified;

  return (
    <>
      <Navbar />
      <div className="profile-container">
        {/* Verification Nudge Banner */}
        {!isFullyVerified && (
          <div className="verification-nudge-banner">
             <div className="nudge-icon"><ShieldCheck size={28} /></div>
             <div className="nudge-text">
                <h4>Increase your approval rate by 3x</h4>
                <p>Hosts prefer verified guests. Complete your profile by verifying your identity and phone number.</p>
             </div>
             <button className="btn-nudge-action" onClick={() => setIsEditing(true)}>Get Verified Now</button>
          </div>
        )}

        <div className="profile-grid">
          
          {/* Left Column: ID Card & Identity */}
          <div className="profile-left">
            <div className="profile-card premium-card">
              <div className="profile-avatar-wrapper">
                <div 
                  className="profile-avatar-large"
                  style={{ 
                    backgroundImage: formData.avatar ? `url(${formData.avatar})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: '#717171'
                  }}
                >
                  {!formData.avatar && (formData.name?.charAt(0) || user.name?.charAt(0))}
                </div>
                <label className="avatar-floating-btn">
                  <Camera size={16} />
                  <input type="file" onChange={handleAvatarChange} hidden accept="image/*" />
                </label>
              </div>
              
              <h1 className="profile-name">{user.name}</h1>
              
               <div className="profile-badge-row">
                  {user.role === 'Host' && (
                     <div className="superhost-badge-premium">
                       <Star size={14} fill="#ea0b2a" color="#ea0b2a" /> Verified Host
                     </div>
                  )}
                  <div className="rating-badge-mini">
                    <Star size={14} fill="#222" /> 4.8 Rating
                  </div>
               </div>

              {!isEditing && (
                 <button className="edit-profile-btn-premium" onClick={() => setIsEditing(true)}>Edit Profile</button>
              )}

              <div className="verification-section-premium">
                <h3 className="verification-heading-mini">{user.name?.split(' ')[0]}'s Trust Badges</h3>
                <div className={`v-item-minimal ${formData.isIdVerified ? 'verified' : 'pending'}`}>
                  <ShieldCheck size={18} /> {formData.isIdVerified ? 'Identity Verified' : 'Identity Not Verified'}
                </div>
                <div className={`v-item-minimal ${formData.isPhoneVerified ? 'verified' : 'pending'}`}>
                  <Phone size={18} /> {formData.isPhoneVerified ? 'Phone Verified' : 'Phone Not Verified'}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Content & Hosting */}
          <div className="profile-main-content">
            {isEditing ? (
              <div className="edit-form-premium">
                <h2 className="edit-heading">Edit Profile Info</h2>
                
                <div className="form-grid-premium">
                  <div className="form-group-premium">
                    <label>Public Name</label>
                    <input 
                      type="text" 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="How others see you"
                    />
                  </div>

                  <div className="form-group-premium">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      value={formData.email} 
                      disabled
                      title="Email cannot be changed currently"
                      className="disabled-input"
                    />
                  </div>



                  <div className="form-group-premium">
                    <div className="label-with-badge">
                      <label>Phone Number</label>
                      <span className={`status-badge ${formData.isPhoneVerified ? 'badge-verified' : 'badge-pending'}`}>
                        {formData.isPhoneVerified ? 'Verified' : 'Not Verified'}
                      </span>
                    </div>
                    <div className="phone-input-wrapper">
                      <input 
                        type="tel" 
                        value={formData.phone} 
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="+91 98765 43210"
                      />
                      {!formData.isPhoneVerified && formData.phone && (
                        <button className="btn-verify-mini" onClick={handleVerifyPhone}>Verify Now</button>
                      )}
                    </div>
                    {!formData.isPhoneVerified && (
                      <span className="input-hint-text">Required for booking approvals and host trust.</span>
                    )}
                  </div>
                </div>

                <div className="profile-divider-thick"></div>

                <div className="id-verification-section">
                   <h3 className="section-title-alt">Government ID Verification</h3>
                   <p className="id-desc">Upload a picture of your Aadhar card, PAN card, or Passport to verify your identity. This builds trust with hosts and speeds up approval.</p>
                   
                   <div className="id-upload-box">
                      {formData.governmentId ? (
                         <div className="id-preview-box">
                            <div className="id-thumbnail">
                               <img src={formData.governmentId} alt="Government ID" />
                            </div>
                            <div className="id-status-msg">
                               <span className="verified-text">✓ ID Uploaded & Verified</span>
                               <label className="btn-reupload">
                                  Change
                                  <input type="file" onChange={handleIdUpload} hidden accept="image/*" />
                               </label>
                            </div>
                         </div>
                      ) : (
                         <label className="id-upload-placeholder">
                            <div className="id-upload-icon"><ShieldCheck size={32} /></div>
                            <div className="id-upload-text">
                               <strong>Click to upload your ID</strong>
                               <span>Supports JPG, PNG (Max 5MB)</span>
                            </div>
                            <input type="file" onChange={handleIdUpload} hidden accept="image/*" />
                         </label>
                      )}
                   </div>
                </div>
                
                <div className="form-actions-premium">
                   <button className="btn-save-primary" onClick={handleSave} disabled={isSaving}>
                     {isSaving ? 'Saving...' : 'Save Changes'}
                   </button>
                   <button className="btn-cancel-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="profile-view-content">
                <div className="about-section">
                  <h2>{user.name?.split(' ')[0]}'s Profile</h2>
                  
                  <div className="meta-info-row">
                    {formData.phone && (
                      <div className="meta-item">
                        <Phone size={18} /> 
                        {formData.phone}
                        {formData.isPhoneVerified && <Check size={14} color="#008a05" style={{ marginLeft: '4px' }} />}
                      </div>
                    )}
                    <div className="meta-item"><Briefcase size={18} /> Hosting since {new Date(user.createdAt || Date.now()).getFullYear()}</div>
                  </div>
                </div>

                {!formData.isIdVerified && (
                  <div className="verification-nudge-inline">
                    <div className="inline-nudge-content">
                      <ShieldCheck size={20} color="#ea0b2a" />
                      <span><strong>Get Verified:</strong> Upload your ID to increase booking chance by 3x!</span>
                    </div>
                    <button className="btn-nudge-link" onClick={() => setIsEditing(true)}>Verify Now</button>
                  </div>
                )}

                <div className="profile-divider-thick"></div>

                {/* Hosting Section for Hosts */}
                {user.role === 'Host' && (
                  <div className="hosting-summary-section">
                    <div className="section-header-alt">
                      <h3>{user.name?.split(' ')[0]}'s Hosting</h3>
                      <button className="btn-dashboard-link" onClick={() => window.location.href='/become-a-host/dashboard'}>
                        <LayoutDashboard size={14} /> Host Dashboard
                      </button>
                    </div>
                    
                    <div className="hosting-stats-grid">
                      <div className="stat-card-mini">
                        <strong>{listings.length}</strong>
                        <span>Listings</span>
                      </div>
                      <div className="stat-card-mini">
                        <strong>4.8</strong>
                        <span>Rating</span>
                      </div>
                      <div className="stat-card-mini">
                        <strong>100%</strong>
                        <span>Response Rate</span>
                      </div>
                    </div>

                    <div className="listings-preview-row">
                      {listings.slice(0, 3).map(listing => (
                        <div key={listing._id} className="listing-mini-card">
                          <img src={listing.images?.[0] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688'} alt={listing.title} />
                          <div className="mini-card-info">
                            <h4>{listing.title}</h4>
                            <span>{listing.type}</span>
                          </div>
                        </div>
                      ))}
                      {listings.length > 3 && (
                        <div className="listings-more-card" onClick={() => window.location.href='/become-a-host/dashboard?tab=listings'}>
                          <span>+{listings.length - 3} more</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {user.role !== 'Host' && (
                  <div className="become-host-promo">
                    <div className="promo-content">
                      <h3>Showcase your space</h3>
                      <p>Start hosting and share your place with the world.</p>
                      <button onClick={() => window.location.href='/become-a-host'}>Setup your listing</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
