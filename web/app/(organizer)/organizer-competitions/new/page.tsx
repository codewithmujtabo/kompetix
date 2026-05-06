'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { organizerCompetitionsApi } from '@/lib/api';

const CATEGORIES = ['Science', 'Math', 'Art', 'Sports', 'Technology', 'Literature', 'Music'];
const GRADE_LEVELS = ['SD', 'SMP', 'SMA', 'Umum'];

function Spinner() { return <span className="spin" />; }

export default function NewCompetitionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    category: '',
    gradeLevel: '',
    organizerName: '',
    websiteUrl: '',
    registrationStatus: 'Coming Soon',
    posterUrl: '',
    isInternational: false,
    detailedDescription: '',
    description: '',
    fee: 0,
    quota: 100,
    regOpenDate: '',
    regCloseDate: '',
    competitionDate: '',
    requiredDocs: [] as string[],
    imageUrl: '',
    participantInstructions: '',
  });

  const [newDoc, setNewDoc] = useState('');

  const addDocument = () => {
    if (newDoc.trim() && !form.requiredDocs.includes(newDoc.trim())) {
      setForm({ ...form, requiredDocs: [...form.requiredDocs, newDoc.trim()] });
      setNewDoc('');
    }
  };

  const removeDocument = (doc: string) => {
    setForm({ ...form, requiredDocs: form.requiredDocs.filter(d => d !== doc) });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!form.name || !form.category) {
      setError('Competition name and category are required');
      setLoading(false);
      return;
    }

    // Подготавливаем данные в формате, который ожидает бэкенд
    const payload = {
      name: form.name,
      category: form.category,
      gradeLevel: form.gradeLevel || null,
      organizerName: form.organizerName || null,
      websiteUrl: form.websiteUrl || null,
      registrationStatus: form.registrationStatus,
      posterUrl: form.posterUrl || null,
      isInternational: form.isInternational,
      detailedDescription: form.detailedDescription || null,
      description: form.description || null,
      fee: Number(form.fee),
      quota: Number(form.quota),
      regOpenDate: form.regOpenDate || null,
      regCloseDate: form.regCloseDate || null,
      competitionDate: form.competitionDate || null,
      requiredDocs: form.requiredDocs,
      imageUrl: form.imageUrl || null,
      participantInstructions: form.participantInstructions || null,
      rounds: [],
    };

    console.log('📤 Sending payload:', payload);

    try {
      const result = await organizerCompetitionsApi.create(payload);
      console.log('✅ Success:', result);
      router.push('/organizer-competitions');
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create competition');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1060 }}>
      {/* Header - same style as list page */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div className="fu">
          <p className="label" style={{ marginBottom: 6 }}>My Competitions</p>
          <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 32, fontWeight: 400 }}>Create Competition</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>Fill in the details below</p>
        </div>
        <Link 
          href="/organizer-competitions"
          className="btn btn-ghost"
          style={{ marginBottom: 28 }}
        >
          ← Back
        </Link>
      </div>

      {error && (
        <div className="toast toast-err" style={{ marginBottom: 20 }}>
          ⚠ {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 500 }}>Basic Information</h2>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label className="label">Competition Name *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g., National Science Olympiad"
                />
              </div>
              <div>
                <label className="label">Category *</label>
                <select
                  className="input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="label">Organizer Name</label>
                <input
                  className="input"
                  value={form.organizerName}
                  onChange={(e) => setForm({ ...form, organizerName: e.target.value })}
                  placeholder="Will use your profile name if empty"
                />
              </div>
              <div>
                <label className="label">Grade Level</label>
                <select
                  className="input"
                  value={form.gradeLevel}
                  onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
                >
                  <option value="">Select grade level</option>
                  {GRADE_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Registration & Pricing */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 500 }}>Registration & Pricing</h2>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label className="label">Registration Fee (IDR)</label>
                <input
                  className="input"
                  type="number"
                  value={form.fee}
                  onChange={(e) => setForm({ ...form, fee: parseInt(e.target.value) || 0 })}
                  placeholder="0 for free"
                />
              </div>
              <div>
                <label className="label">Quota</label>
                <input
                  className="input"
                  type="number"
                  value={form.quota}
                  onChange={(e) => setForm({ ...form, quota: parseInt(e.target.value) || 100 })}
                  placeholder="Maximum participants"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="label">Registration Status</label>
                <select
                  className="input"
                  value={form.registrationStatus}
                  onChange={(e) => setForm({ ...form, registrationStatus: e.target.value })}
                >
                  <option value="Coming Soon">Coming Soon</option>
                  <option value="On Going">On Going</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="label">International Competition</label>
                <select
                  className="input"
                  value={form.isInternational ? 'yes' : 'no'}
                  onChange={(e) => setForm({ ...form, isInternational: e.target.value === 'yes' })}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Important Dates */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 500 }}>Important Dates</h2>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label className="label">Registration Open Date</label>
                <input
                  className="input"
                  type="date"
                  value={form.regOpenDate}
                  onChange={(e) => setForm({ ...form, regOpenDate: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Registration Close Date</label>
                <input
                  className="input"
                  type="date"
                  value={form.regCloseDate}
                  onChange={(e) => setForm({ ...form, regCloseDate: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Competition Date</label>
                <input
                  className="input"
                  type="date"
                  value={form.competitionDate}
                  onChange={(e) => setForm({ ...form, competitionDate: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Required Documents */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 500 }}>Required Documents</h2>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                className="input"
                value={newDoc}
                onChange={(e) => setNewDoc(e.target.value)}
                placeholder="e.g., Student ID, Recommendation Letter"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDocument())}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn-secondary" onClick={addDocument}>
                + Add
              </button>
            </div>
            {form.requiredDocs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {form.requiredDocs.map((doc) => (
                  <span
                    key={doc}
                    className="badge badge-indigo"
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    onClick={() => removeDocument(doc)}
                  >
                    {doc} <span style={{ fontSize: 14 }}>×</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Media */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 500 }}>Media</h2>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label className="label">Image URL (Thumbnail)</label>
                <input
                  className="input"
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://example.com/thumbnail.jpg"
                />
              </div>
              <div>
                <label className="label">Poster URL</label>
                <input
                  className="input"
                  type="url"
                  value={form.posterUrl}
                  onChange={(e) => setForm({ ...form, posterUrl: e.target.value })}
                  placeholder="https://example.com/poster.jpg"
                />
              </div>
            </div>
            <div>
              <label className="label">Website URL</label>
              <input
                className="input"
                type="url"
                value={form.websiteUrl}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          </div>
        </div>

        {/* Descriptions */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 500 }}>Descriptions</h2>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Short Description</label>
              <textarea
                className="input"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of the competition..."
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Detailed Description</label>
              <textarea
                className="input"
                rows={6}
                value={form.detailedDescription}
                onChange={(e) => setForm({ ...form, detailedDescription: e.target.value })}
                placeholder="Full description, rules, requirements, prizes, etc..."
              />
            </div>
            <div>
              <label className="label">Participant Instructions</label>
              <textarea
                className="input"
                rows={3}
                value={form.participantInstructions}
                onChange={(e) => setForm({ ...form, participantInstructions: e.target.value })}
                placeholder="Special instructions for participants..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
          <Link 
            href="/organizer-competitions"
            className="btn btn-ghost"
          >
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Spinner /> : '→'} Create Competition
          </button>
        </div>
      </form>
    </div>
  );
}