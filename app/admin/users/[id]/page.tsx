'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, X, Save, Music, Image, MessageSquareQuote, Heart, Upload, Loader2 } from 'lucide-react';
import { useRef } from 'react';
import { getCurrentUser } from '../../../utils/auth';
import { supabase } from '../../../utils/supabase';
import {
  getUserPreferences,
  saveUserPreferences,
  UserPreferences,
  UserQuote,
  UserInterests,
  QUOTE_MIN_COUNT,
  QUOTE_MAX_COUNT,
  QUOTE_MAX_LENGTH,
  HERO_IMAGE_MIN_COUNT,
  HERO_IMAGE_MAX_COUNT,
} from '../../../utils/userPreferences';

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: 'ae' | 'admin';
}

export default function UserPersonalisationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserRecord | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [photoUrl, setPhotoUrl] = useState('');
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [newHeroImage, setNewHeroImage] = useState('');
  const [quotes, setQuotes] = useState<UserQuote[]>([]);
  const [newQuoteContent, setNewQuoteContent] = useState('');
  const [newQuoteAttribution, setNewQuoteAttribution] = useState('');
  const [walkonSongUrl, setWalkonSongUrl] = useState('');
  const [walkonButtonLabel, setWalkonButtonLabel] = useState('Get fired up');
  const [sportsTeams, setSportsTeams] = useState<string[]>([]);
  const [musicArtists, setMusicArtists] = useState<string[]>([]);
  const [tvShows, setTvShows] = useState<string[]>([]);
  const [newSportsTeam, setNewSportsTeam] = useState('');
  const [newMusicArtist, setNewMusicArtist] = useState('');
  const [newTvShow, setNewTvShow] = useState('');

  // Edit quote modal state
  const [editingQuoteIndex, setEditingQuoteIndex] = useState<number | null>(null);
  const [editQuoteContent, setEditQuoteContent] = useState('');
  const [editQuoteAttribution, setEditQuoteAttribution] = useState('');

  // File upload state
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

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

      // Load user details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, name, role')
        .eq('id', resolvedParams.id)
        .single();

      if (userError || !userData) {
        console.error('Error loading user:', userError);
        router.push('/admin/users');
        return;
      }

      setUser(userData);

      // Load user preferences
      const prefs = await getUserPreferences(resolvedParams.id);
      setPreferences(prefs);

      // Initialize form state from preferences
      if (prefs) {
        setPhotoUrl(prefs.photo_url || '');
        setHeroImages(prefs.hero_images || []);
        setQuotes(prefs.quotes || []);
        setWalkonSongUrl(prefs.walkon_song_url || '');
        setWalkonButtonLabel(prefs.walkon_button_label || 'Get fired up');
        if (prefs.interests) {
          setSportsTeams(prefs.interests.sports_teams || []);
          setMusicArtists(prefs.interests.music_artists || []);
          setTvShows(prefs.interests.tv_shows || []);
        }
      }

      setLoading(false);
    }

    loadData();
  }, [resolvedParams.id, router]);

  // File upload handlers - upload directly to Supabase storage
  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    setUploadingProfile(true);
    setError('');

    try {
      // Generate unique filename
      const extension = file.name.split('.').pop() || 'png';
      const timestamp = Date.now();
      const filename = `${user.id}/profile/${timestamp}.${extension}`;

      // Upload directly to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('user-images')
        .upload(filename, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase storage error:', uploadError);
        setError('Failed to upload file: ' + uploadError.message);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-images')
        .getPublicUrl(filename);

      setPhotoUrl(urlData.publicUrl);
      setSuccess('Profile photo uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to upload image');
      console.error('Upload error:', err);
    } finally {
      setUploadingProfile(false);
      if (profileInputRef.current) {
        profileInputRef.current.value = '';
      }
    }
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (heroImages.length >= HERO_IMAGE_MAX_COUNT) {
      setError(`Maximum ${HERO_IMAGE_MAX_COUNT} hero images allowed`);
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    setUploadingHero(true);
    setError('');

    try {
      // Generate unique filename
      const extension = file.name.split('.').pop() || 'png';
      const timestamp = Date.now();
      const filename = `${user.id}/hero/${timestamp}.${extension}`;

      // Upload directly to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('user-images')
        .upload(filename, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase storage error:', uploadError);
        setError('Failed to upload file: ' + uploadError.message);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-images')
        .getPublicUrl(filename);

      setHeroImages([...heroImages, urlData.publicUrl]);
      setSuccess('Hero image uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to upload image');
      console.error('Upload error:', err);
    } finally {
      setUploadingHero(false);
      if (heroInputRef.current) {
        heroInputRef.current.value = '';
      }
    }
  };

  const handleAddHeroImage = () => {
    if (!newHeroImage.trim()) return;
    if (heroImages.length >= HERO_IMAGE_MAX_COUNT) {
      setError(`Maximum ${HERO_IMAGE_MAX_COUNT} hero images allowed`);
      return;
    }
    setHeroImages([...heroImages, newHeroImage.trim()]);
    setNewHeroImage('');
    setError('');
  };

  const handleRemoveHeroImage = (index: number) => {
    setHeroImages(heroImages.filter((_, i) => i !== index));
  };

  const handleAddQuote = () => {
    if (!newQuoteContent.trim()) return;
    if (newQuoteContent.length > QUOTE_MAX_LENGTH) {
      setError(`Quote exceeds ${QUOTE_MAX_LENGTH} character limit`);
      return;
    }
    if (quotes.length >= QUOTE_MAX_COUNT) {
      setError(`Maximum ${QUOTE_MAX_COUNT} quotes allowed`);
      return;
    }
    const newQuote: UserQuote = {
      content: newQuoteContent.trim(),
      ...(newQuoteAttribution.trim() && { attribution: newQuoteAttribution.trim() }),
    };
    setQuotes([...quotes, newQuote]);
    setNewQuoteContent('');
    setNewQuoteAttribution('');
    setError('');
  };

  const handleRemoveQuote = (index: number) => {
    setQuotes(quotes.filter((_, i) => i !== index));
  };

  const handleEditQuote = (index: number) => {
    setEditingQuoteIndex(index);
    setEditQuoteContent(quotes[index].content);
    setEditQuoteAttribution(quotes[index].attribution || '');
  };

  const handleSaveEditQuote = () => {
    if (editingQuoteIndex === null) return;
    if (!editQuoteContent.trim()) return;
    if (editQuoteContent.length > QUOTE_MAX_LENGTH) {
      setError(`Quote exceeds ${QUOTE_MAX_LENGTH} character limit`);
      return;
    }
    const updatedQuotes = [...quotes];
    updatedQuotes[editingQuoteIndex] = {
      content: editQuoteContent.trim(),
      ...(editQuoteAttribution.trim() && { attribution: editQuoteAttribution.trim() }),
    };
    setQuotes(updatedQuotes);
    setEditingQuoteIndex(null);
    setEditQuoteContent('');
    setEditQuoteAttribution('');
    setError('');
  };

  const handleAddInterest = (type: 'sports' | 'music' | 'tv') => {
    if (type === 'sports' && newSportsTeam.trim()) {
      setSportsTeams([...sportsTeams, newSportsTeam.trim()]);
      setNewSportsTeam('');
    } else if (type === 'music' && newMusicArtist.trim()) {
      setMusicArtists([...musicArtists, newMusicArtist.trim()]);
      setNewMusicArtist('');
    } else if (type === 'tv' && newTvShow.trim()) {
      setTvShows([...tvShows, newTvShow.trim()]);
      setNewTvShow('');
    }
  };

  const handleRemoveInterest = (type: 'sports' | 'music' | 'tv', index: number) => {
    if (type === 'sports') {
      setSportsTeams(sportsTeams.filter((_, i) => i !== index));
    } else if (type === 'music') {
      setMusicArtists(musicArtists.filter((_, i) => i !== index));
    } else if (type === 'tv') {
      setTvShows(tvShows.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setError('');
    setSuccess('');
    setSaving(true);

    // DEBUG: Log what we're about to save
    console.log('DEBUG handleSave - heroImages:', heroImages);
    console.log('DEBUG handleSave - quotes:', quotes);
    console.log('DEBUG handleSave - photoUrl:', photoUrl);

    // Validation - only enforce minimums if user has started adding items
    // Allow saving even with fewer than minimum if user is just getting started
    if (heroImages.length > 0 && heroImages.length < HERO_IMAGE_MIN_COUNT) {
      console.log('DEBUG - Hero images validation failed:', heroImages.length, '<', HERO_IMAGE_MIN_COUNT);
      setError(`Minimum ${HERO_IMAGE_MIN_COUNT} hero images required if any are set`);
      setSaving(false);
      return;
    }

    if (quotes.length > 0 && quotes.length < QUOTE_MIN_COUNT) {
      console.log('DEBUG - Quotes validation failed:', quotes.length, '<', QUOTE_MIN_COUNT);
      setError(`Minimum ${QUOTE_MIN_COUNT} quotes required if any are set`);
      setSaving(false);
      return;
    }

    const interests: UserInterests = {};
    if (sportsTeams.length > 0) interests.sports_teams = sportsTeams;
    if (musicArtists.length > 0) interests.music_artists = musicArtists;
    if (tvShows.length > 0) interests.tv_shows = tvShows;

    const prefsToSave = {
      photo_url: photoUrl || null,
      hero_images: heroImages,
      quotes: quotes,
      walkon_song_url: walkonSongUrl || null,
      walkon_button_label: walkonButtonLabel || 'Get fired up',
      interests: Object.keys(interests).length > 0 ? interests : null,
    };
    console.log('DEBUG handleSave - prefsToSave:', prefsToSave);

    const result = await saveUserPreferences(user.id, prefsToSave);
    console.log('DEBUG handleSave - save result:', result);

    if (result.success) {
      setSuccess('Preferences saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error || 'Failed to save preferences');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1A1A2E] to-[#2D2D3A]">
        <div className="text-center">
          <div className="mb-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-white/20" />
              <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-[#EE0B4F]" />
            </div>
          </div>
          <p className="text-white/60 text-sm">Loading user preferences...</p>
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
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Personalisation</h1>
          <p className="mt-2 text-gray-600">
            Configure preferences for <strong>{user.name}</strong> ({user.email})
          </p>
        </div>

        {/* Success/Error messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-8">
          {/* Profile Photo Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-[#EE0B4F]/10 rounded-lg flex items-center justify-center">
                <Image className="h-5 w-5 text-[#EE0B4F]" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Profile Photo</h2>
            </div>
            <div className="flex items-start gap-4">
              {photoUrl && (
                <div className="flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl}
                    alt="Preview"
                    className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                  />
                </div>
              )}
              <div className="flex-1 space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Photo
                  </label>
                  <input
                    ref={profileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleProfileUpload}
                    className="hidden"
                    id="profile-upload"
                  />
                  <label
                    htmlFor="profile-upload"
                    className={`inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#EE0B4F] hover:bg-[#EE0B4F]/5 transition-colors ${uploadingProfile ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {uploadingProfile ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin text-[#EE0B4F]" />
                        <span className="text-sm text-gray-600">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-gray-500" />
                        <span className="text-sm text-gray-600">Choose file to upload</span>
                      </>
                    )}
                  </label>
                  <p className="mt-1 text-xs text-gray-500">Recommended: 200x200px, max 100KB. JPEG, PNG, GIF, or WebP.</p>
                </div>

                {/* URL Input */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Or enter URL manually
                  </label>
                  <input
                    type="text"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="/team-images/user-photo.png"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Use a path like /team-images/name.png or a full URL
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Hero Images Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-[#EE0B4F]/10 rounded-lg flex items-center justify-center">
                <Image className="h-5 w-5 text-[#EE0B4F]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Hero Images</h2>
                <p className="text-sm text-gray-500">
                  {HERO_IMAGE_MIN_COUNT}-{HERO_IMAGE_MAX_COUNT} images, rotated weekly
                </p>
              </div>
            </div>

            {/* Current images */}
            {heroImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                {heroImages.map((url, index) => (
                  <div key={index} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Hero ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={() => handleRemoveHeroImage(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload new image */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Image
              </label>
              <input
                ref={heroInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleHeroUpload}
                className="hidden"
                id="hero-upload"
                disabled={heroImages.length >= HERO_IMAGE_MAX_COUNT}
              />
              <label
                htmlFor="hero-upload"
                className={`inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#EE0B4F] hover:bg-[#EE0B4F]/5 transition-colors ${uploadingHero || heroImages.length >= HERO_IMAGE_MAX_COUNT ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploadingHero ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-[#EE0B4F]" />
                    <span className="text-sm text-gray-600">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-600">Choose file to upload</span>
                  </>
                )}
              </label>
              <p className="mt-1 text-xs text-gray-500">Recommended: 800x450px (16:9 ratio), max 500KB. JPEG, PNG, GIF, or WebP.</p>
            </div>

            {/* Or add by URL */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or add by URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newHeroImage}
                  onChange={(e) => setNewHeroImage(e.target.value)}
                  placeholder="/user-images/user/hero/image.png"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddHeroImage()}
                />
                <button
                  onClick={handleAddHeroImage}
                  disabled={heroImages.length >= HERO_IMAGE_MAX_COUNT}
                  className="px-4 py-2 bg-[#EE0B4F] hover:bg-[#c4093f] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Currently {heroImages.length} of {HERO_IMAGE_MAX_COUNT} images
            </p>
          </section>

          {/* Quotes Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-[#EE0B4F]/10 rounded-lg flex items-center justify-center">
                <MessageSquareQuote className="h-5 w-5 text-[#EE0B4F]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Motivational Quotes</h2>
                <p className="text-sm text-gray-500">
                  {QUOTE_MIN_COUNT}-{QUOTE_MAX_COUNT} quotes, max {QUOTE_MAX_LENGTH} chars each
                </p>
              </div>
            </div>

            {/* Current quotes */}
            {quotes.length > 0 && (
              <div className="space-y-3 mb-4">
                {quotes.map((quote, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg group"
                  >
                    <div className="flex-1">
                      <p className="text-gray-800 italic">&ldquo;{quote.content}&rdquo;</p>
                      {quote.attribution && (
                        <p className="text-sm text-gray-500 mt-1">— {quote.attribution}</p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditQuote(index)}
                        className="p-1 text-gray-500 hover:text-[#EE0B4F]"
                      >
                        <MessageSquareQuote className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveQuote(index)}
                        className="p-1 text-gray-500 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new quote */}
            <div className="space-y-2">
              <textarea
                value={newQuoteContent}
                onChange={(e) => setNewQuoteContent(e.target.value)}
                placeholder="Enter a motivational quote..."
                rows={2}
                maxLength={QUOTE_MAX_LENGTH}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newQuoteAttribution}
                  onChange={(e) => setNewQuoteAttribution(e.target.value)}
                  placeholder="Attribution (optional)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
                />
                <button
                  onClick={handleAddQuote}
                  disabled={!newQuoteContent.trim() || quotes.length >= QUOTE_MAX_COUNT}
                  className="px-4 py-2 bg-[#EE0B4F] hover:bg-[#c4093f] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Currently {quotes.length} of {QUOTE_MAX_COUNT} quotes
            </p>
          </section>

          {/* Walk-on Song Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-[#EE0B4F]/10 rounded-lg flex items-center justify-center">
                <Music className="h-5 w-5 text-[#EE0B4F]" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Walk-on Song</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Song URL (YouTube, Spotify, etc.)
                </label>
                <input
                  type="url"
                  value={walkonSongUrl}
                  onChange={(e) => setWalkonSongUrl(e.target.value)}
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
                  value={walkonButtonLabel}
                  onChange={(e) => setWalkonButtonLabel(e.target.value)}
                  placeholder="Get fired up"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Text shown on the button in the header
                </p>
              </div>
            </div>
          </section>

          {/* Interests Section */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-[#EE0B4F]/10 rounded-lg flex items-center justify-center">
                <Heart className="h-5 w-5 text-[#EE0B4F]" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Interests</h2>
            </div>

            {/* Sports Teams */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sports Teams
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {sportsTeams.map((team, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {team}
                    <button
                      onClick={() => handleRemoveInterest('sports', index)}
                      className="hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSportsTeam}
                  onChange={(e) => setNewSportsTeam(e.target.value)}
                  placeholder="Add a sports team..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddInterest('sports')}
                />
                <button
                  onClick={() => handleAddInterest('sports')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Music Artists */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Music Artists
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {musicArtists.map((artist, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    {artist}
                    <button
                      onClick={() => handleRemoveInterest('music', index)}
                      className="hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMusicArtist}
                  onChange={(e) => setNewMusicArtist(e.target.value)}
                  placeholder="Add a music artist..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddInterest('music')}
                />
                <button
                  onClick={() => handleAddInterest('music')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* TV Shows */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                TV Shows
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tvShows.map((show, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {show}
                    <button
                      onClick={() => handleRemoveInterest('tv', index)}
                      className="hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTvShow}
                  onChange={(e) => setNewTvShow(e.target.value)}
                  placeholder="Add a TV show..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddInterest('tv')}
                />
                <button
                  onClick={() => handleAddInterest('tv')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Link
              href="/admin/users"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-[#EE0B4F] hover:bg-[#c4093f] text-white font-semibold rounded-lg disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </main>

      {/* Edit Quote Modal */}
      {editingQuoteIndex !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Quote</h2>
              <button
                onClick={() => setEditingQuoteIndex(null)}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quote Content
                </label>
                <textarea
                  value={editQuoteContent}
                  onChange={(e) => setEditQuoteContent(e.target.value)}
                  rows={3}
                  maxLength={QUOTE_MAX_LENGTH}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attribution (optional)
                </label>
                <input
                  type="text"
                  value={editQuoteAttribution}
                  onChange={(e) => setEditQuoteAttribution(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingQuoteIndex(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditQuote}
                  className="flex-1 px-4 py-2 bg-[#EE0B4F] hover:bg-[#c4093f] text-white rounded-lg"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
