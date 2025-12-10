'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Upload,
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  Music,
  MessageSquareQuote,
  User,
  AlertCircle,
  Check,
} from 'lucide-react';
import { getCurrentUser } from '../../../utils/auth';
import { supabase } from '../../../utils/supabase';
import {
  UserPreferences,
  UserQuote,
  UserInterests,
  getUserPreferences,
  saveUserPreferences,
  QUOTE_MIN_COUNT,
  QUOTE_MAX_COUNT,
  QUOTE_MAX_LENGTH,
  HERO_IMAGE_MIN_COUNT,
  HERO_IMAGE_MAX_COUNT,
  validateQuotes,
  validateHeroImages,
} from '../../../utils/userPreferences';
import {
  compressProfilePhoto,
  compressHeroImage,
  formatFileSize,
  validateImageType,
  createImagePreview,
  blobToBase64,
} from '../../../utils/imageCompression';
import { Quote } from '../../../data/loadingQuotes';

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: 'ae' | 'admin';
  photo_url: string | null;
}

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserRecord | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'hero' | 'quotes' | 'walkon' | 'interests'>('profile');

  // Form state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [heroImagePreviews, setHeroImagePreviews] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<UserQuote[]>([]);
  const [walkonUrl, setWalkonUrl] = useState('');
  const [walkonLabel, setWalkonLabel] = useState('Get fired up');
  const [interests, setInterests] = useState<UserInterests>({
    sports_teams: [],
    music_artists: [],
    tv_shows: [],
  });

  // New quote form
  const [newQuoteContent, setNewQuoteContent] = useState('');
  const [newQuoteAttribution, setNewQuoteAttribution] = useState('');

  // Upload states
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);

  // Validation
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // File input refs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  // Team images from public folder (for selection)
  const [teamImages, setTeamImages] = useState<string[]>([]);

  // Check admin access and load data
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/');
      return;
    }
    if (currentUser.role !== 'admin') {
      router.push('/');
      return;
    }

    async function loadData() {
      setLoading(true);

      // Load user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, name, role, photo_url')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        console.error('Error loading user:', userError);
        router.push('/admin/users');
        return;
      }

      setUser(userData);

      // Load preferences
      const prefs = await getUserPreferences(userId);
      setPreferences(prefs);

      // Set form state from preferences
      if (prefs) {
        setPhotoUrl(prefs.photo_url);
        setPhotoPreview(prefs.photo_url);
        setHeroImages(prefs.hero_images || []);
        setHeroImagePreviews(prefs.hero_images || []);
        setQuotes(prefs.quotes || []);
        setWalkonUrl(prefs.walkon_song_url || '');
        setWalkonLabel(prefs.walkon_button_label || 'Get fired up');
        setInterests(prefs.interests || { sports_teams: [], music_artists: [], tv_shows: [] });
      } else {
        // Use user's photo from users table as default
        setPhotoUrl(userData.photo_url);
        setPhotoPreview(userData.photo_url);
      }

      // Load team images
      // These are hardcoded for now, could be made dynamic
      setTeamImages([
        '/team-images/Bernadette Coutis.png',
        '/team-images/Billy Seller.png',
        '/team-images/Kylie O\'Brien.2.png',
        '/team-images/Nikki Atzori.png',
      ]);

      setLoading(false);
    }

    loadData();
  }, [userId, router]);

  // Handle profile photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const typeValidation = validateImageType(file);
    if (!typeValidation.valid) {
      setErrors([typeValidation.error || 'Invalid file type']);
      return;
    }

    setUploadingPhoto(true);
    setErrors([]);

    try {
      // Create preview immediately
      const preview = await createImagePreview(file);
      setPhotoPreview(preview);

      // Compress image
      const result = await compressProfilePhoto(file);

      // Show compression info
      if (result.wasCompressed) {
        setCompressionInfo(
          `Compressed from ${formatFileSize(result.originalSize)} to ${formatFileSize(result.compressedSize)} (${result.width}x${result.height})`
        );
      }

      // Convert to base64 for storage
      const base64 = await blobToBase64(result.blob);
      const dataUrl = `data:image/jpeg;base64,${base64}`;
      setPhotoUrl(dataUrl);
      setPhotoPreview(dataUrl);

      setTimeout(() => setCompressionInfo(null), 3000);
    } catch (err) {
      console.error('Error uploading photo:', err);
      setErrors(['Failed to process image']);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle hero image upload
  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (heroImages.length + files.length > HERO_IMAGE_MAX_COUNT) {
      setErrors([`Maximum ${HERO_IMAGE_MAX_COUNT} hero images allowed`]);
      return;
    }

    setUploadingHero(true);
    setErrors([]);

    try {
      const newImages: string[] = [];
      const newPreviews: string[] = [];

      for (const file of Array.from(files)) {
        const typeValidation = validateImageType(file);
        if (!typeValidation.valid) {
          continue;
        }

        // Compress image
        const result = await compressHeroImage(file);
        const base64 = await blobToBase64(result.blob);
        const dataUrl = `data:image/jpeg;base64,${base64}`;

        newImages.push(dataUrl);
        newPreviews.push(dataUrl);
      }

      setHeroImages([...heroImages, ...newImages]);
      setHeroImagePreviews([...heroImagePreviews, ...newPreviews]);
    } catch (err) {
      console.error('Error uploading hero images:', err);
      setErrors(['Failed to process images']);
    } finally {
      setUploadingHero(false);
    }
  };

  // Remove hero image
  const removeHeroImage = (index: number) => {
    setHeroImages(heroImages.filter((_, i) => i !== index));
    setHeroImagePreviews(heroImagePreviews.filter((_, i) => i !== index));
  };

  // Add quote
  const addQuote = () => {
    if (!newQuoteContent.trim()) {
      setErrors(['Quote content is required']);
      return;
    }

    if (newQuoteContent.length > QUOTE_MAX_LENGTH) {
      setErrors([`Quote must be ${QUOTE_MAX_LENGTH} characters or less`]);
      return;
    }

    if (quotes.length >= QUOTE_MAX_COUNT) {
      setErrors([`Maximum ${QUOTE_MAX_COUNT} quotes allowed`]);
      return;
    }

    const newQuote: UserQuote = {
      content: newQuoteContent.trim(),
      attribution: newQuoteAttribution.trim() || undefined,
    };

    setQuotes([...quotes, newQuote]);
    setNewQuoteContent('');
    setNewQuoteAttribution('');
    setErrors([]);
  };

  // Remove quote
  const removeQuote = (index: number) => {
    setQuotes(quotes.filter((_, i) => i !== index));
  };

  // Update quote
  const updateQuote = (index: number, field: 'content' | 'attribution', value: string) => {
    const updated = [...quotes];
    if (field === 'attribution') {
      updated[index] = { ...updated[index], attribution: value || undefined };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setQuotes(updated);
  };

  // Select team image as profile photo
  const selectTeamImage = (url: string) => {
    setPhotoUrl(url);
    setPhotoPreview(url);
  };

  // Save preferences
  const handleSave = async () => {
    setErrors([]);
    setSuccessMessage(null);

    // Validate
    const quoteValidation = validateQuotes(quotes);
    const heroValidation = validateHeroImages(heroImages);

    const allErrors: string[] = [];

    // Only validate quotes if user has started adding them
    if (quotes.length > 0 && !quoteValidation.valid) {
      allErrors.push(...quoteValidation.errors);
    }

    // Only validate hero images if user has started adding them
    if (heroImages.length > 0 && !heroValidation.valid) {
      allErrors.push(...heroValidation.errors);
    }

    // Validate walk-on URL if provided
    if (walkonUrl && !walkonUrl.includes('youtube.com') && !walkonUrl.includes('youtu.be')) {
      allErrors.push('Walk-on song must be a YouTube URL');
    }

    if (allErrors.length > 0) {
      setErrors(allErrors);
      return;
    }

    setSaving(true);

    try {
      const result = await saveUserPreferences(userId, {
        photo_url: photoUrl,
        hero_images: heroImages,
        quotes,
        walkon_song_url: walkonUrl || null,
        walkon_button_label: walkonLabel || 'Get fired up',
        interests,
      });

      if (result.success) {
        setSuccessMessage('Preferences saved successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrors([result.error || 'Failed to save preferences']);
      }
    } catch (err) {
      console.error('Error saving preferences:', err);
      setErrors(['Failed to save preferences']);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1A1A2E] to-[#2D2D3A]">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-white/20" />
          <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-[#EE0B4F]" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1A1A2E] py-6">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/users"
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Users</span>
              </Link>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ASET-White.png" alt="ASET" className="h-10 w-auto" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
        {/* Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit User Personalisation</h1>
            <p className="text-gray-500">{user.name} ({user.email})</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#EE0B4F] hover:bg-[#c4093f] disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            <Save className="h-5 w-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Messages */}
        {errors.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                {errors.map((error, i) => (
                  <p key={i} className="text-sm text-red-600">{error}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <p className="text-sm text-green-600">{successMessage}</p>
            </div>
          </div>
        )}

        {compressionInfo && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-600">{compressionInfo}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'hero', label: 'Hero Images', icon: ImageIcon },
            { id: 'quotes', label: 'Quotes', icon: MessageSquareQuote },
            { id: 'walkon', label: 'Walk-on Song', icon: Music },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Profile Photo</h2>

              {/* Current photo */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoPreview}
                      alt={user.name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-[#EE0B4F] flex items-center justify-center text-white text-2xl font-bold">
                      {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                  )}
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Upload New Photo
                  </button>
                  <p className="text-xs text-gray-500">Max 200x200px, auto-compressed to &lt;100KB</p>
                </div>
              </div>

              {/* Team images selection */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Or select from team images:</h3>
                <div className="flex flex-wrap gap-3">
                  {teamImages.map((img) => (
                    <button
                      key={img}
                      onClick={() => selectTeamImage(img)}
                      className={`relative rounded-full overflow-hidden border-4 transition-all ${
                        photoUrl === img ? 'border-[#EE0B4F] scale-110' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="Team member" className="w-16 h-16 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Hero Images Tab */}
          {activeTab === 'hero' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Hero Images</h2>
                  <p className="text-sm text-gray-500">
                    {heroImages.length} of {HERO_IMAGE_MAX_COUNT} images (min {HERO_IMAGE_MIN_COUNT})
                  </p>
                </div>
                <div>
                  <input
                    ref={heroInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleHeroUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => heroInputRef.current?.click()}
                    disabled={uploadingHero || heroImages.length >= HERO_IMAGE_MAX_COUNT}
                    className="flex items-center gap-2 px-4 py-2 bg-[#EE0B4F] hover:bg-[#c4093f] disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Images
                  </button>
                </div>
              </div>

              {uploadingHero && (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#EE0B4F]" />
                </div>
              )}

              {heroImages.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hero images yet</p>
                  <p className="text-sm text-gray-400">Add at least {HERO_IMAGE_MIN_COUNT} images to enable the rotating hero</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {heroImagePreviews.map((img, index) => (
                    <div key={index} className="relative group aspect-video rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={`Hero ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeHeroImage(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        Week {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500">
                Images rotate weekly. Auto-resized to 800px width, compressed to &lt;500KB each.
              </p>
            </div>
          )}

          {/* Quotes Tab */}
          {activeTab === 'quotes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Loading Quotes</h2>
                  <p className="text-sm text-gray-500">
                    {quotes.length} of {QUOTE_MAX_COUNT} quotes (min {QUOTE_MIN_COUNT})
                  </p>
                </div>
              </div>

              {/* Add new quote */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Add New Quote</h3>
                <div>
                  <textarea
                    value={newQuoteContent}
                    onChange={(e) => setNewQuoteContent(e.target.value)}
                    placeholder="Enter quote content..."
                    rows={2}
                    maxLength={QUOTE_MAX_LENGTH}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F] text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {newQuoteContent.length}/{QUOTE_MAX_LENGTH} characters
                  </p>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newQuoteAttribution}
                    onChange={(e) => setNewQuoteAttribution(e.target.value)}
                    placeholder="Attribution (optional, e.g., 'Usain Bolt')"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F] text-sm"
                  />
                  <button
                    onClick={addQuote}
                    disabled={!newQuoteContent.trim() || quotes.length >= QUOTE_MAX_COUNT}
                    className="px-4 py-2 bg-[#EE0B4F] hover:bg-[#c4093f] disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Existing quotes */}
              {quotes.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                  <MessageSquareQuote className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No quotes yet</p>
                  <p className="text-sm text-gray-400">Add at least {QUOTE_MIN_COUNT} quotes for loading screens</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotes.map((quote, index) => (
                    <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-lg group">
                      <div className="flex-1 space-y-2">
                        <textarea
                          value={quote.content}
                          onChange={(e) => updateQuote(index, 'content', e.target.value)}
                          rows={2}
                          maxLength={QUOTE_MAX_LENGTH}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F] text-sm"
                        />
                        <input
                          type="text"
                          value={quote.attribution || ''}
                          onChange={(e) => updateQuote(index, 'attribution', e.target.value)}
                          placeholder="Attribution (optional)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F] text-sm"
                        />
                      </div>
                      <button
                        onClick={() => removeQuote(index)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Walk-on Song Tab */}
          {activeTab === 'walkon' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Walk-on Song</h2>
              <p className="text-sm text-gray-500">
                This song will play when the user clicks the &ldquo;Get fired up&rdquo; button
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    YouTube URL
                  </label>
                  <input
                    type="url"
                    value={walkonUrl}
                    onChange={(e) => setWalkonUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Button Label
                  </label>
                  <input
                    type="text"
                    value={walkonLabel}
                    onChange={(e) => setWalkonLabel(e.target.value)}
                    placeholder="Get fired up"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
                  />
                </div>

                {/* Preview */}
                {walkonUrl && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EE0B4F]/20 border border-[#EE0B4F]/30">
                      <span className="text-sm font-medium text-[#EE0B4F]">{walkonLabel || 'Get fired up'}</span>
                      <span className="text-base">🔥</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
