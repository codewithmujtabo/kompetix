'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { organizerCompetitionsApi } from '@/lib/api';

interface Competition {
  id: string;
  name: string;
  organizerName: string;
  category: string;
  gradeLevel: string;
  fee: number;
  quota: number;
  description: string;
  detailedDescription: string;
  regOpenDate: string;
  regCloseDate: string;
  competitionDate: string;
  registrationStatus: string;
  isInternational: boolean;
  websiteUrl: string;
  imageUrl: string;
  posterUrl: string;
  participantInstructions: string;
  requiredDocs: string[];
  registrationCount: number;
  createdAt: string;
}

function Spinner() { return <span className="spin" />; }

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatCurrency(amount: number) {
  return amount === 0 ? 'Free' : `Rp ${amount.toLocaleString('id-ID')}`;
}

const STATUS_BADGE: Record<string, string> = {
  'On Going': 'badge-green',
  'Coming Soon': 'badge-indigo',
  'Closed': 'badge-gray',
};

export default function CompetitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchCompetition = async () => {
      if (!id) return;
      
      try {
        console.log('Fetching competition with ID:', id);
        const data = await organizerCompetitionsApi.getOne(id);
        console.log('Data received:', data);
        setCompetition(data);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load competition');
      } finally {
        setLoading(false);
      }
    };

    fetchCompetition();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm(`⚠️ Are you sure you want to delete "${competition?.name}"?\n\nThis action cannot be undone!`)) {
      return;
    }
    
    setDeleting(true);
    try {
      await organizerCompetitionsApi.delete(id);
      router.push('/organizer-competitions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete competition');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '36px 40px', textAlign: 'center' }}>
        <Spinner />
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <div className="toast toast-err" style={{ marginBottom: 20 }}>
          ⚠ {error || 'Competition not found'}
        </div>
        <Link href="/organizer-competitions" className="btn btn-ghost">
          ← Back to Competitions
        </Link>
      </div>
    );
  }

  const statusClass = STATUS_BADGE[competition.registrationStatus] || 'badge-gray';

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1060 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div className="fu">
          <p className="label" style={{ marginBottom: 6 }}>My Competitions</p>
          <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 32, fontWeight: 400, marginBottom: 8 }}>
            {competition.name}
          </h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className={`badge ${statusClass}`}>
              {competition.registrationStatus}
            </span>
            <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
              Created {fmtDate(competition.createdAt)}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/organizer-competitions" className="btn btn-ghost">
            ← Back
          </Link>
          <Link 
            href={`/organizer-competitions/${id}/edit`} 
            className="btn btn-primary"
          >
            ✎ Edit
          </Link>
          <button 
            onClick={handleDelete} 
            className="btn btn-danger" 
            disabled={deleting}
            style={{ background: '#dc2626', border: 'none' }}
          >
            {deleting ? <Spinner /> : '🗑 Delete'}
          </button>
        </div>
      </div>

      {/* Two column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Competition Details */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 500 }}>Competition Details</h2>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <p className="label" style={{ marginBottom: 4 }}>Category</p>
              <p>{competition.category || '—'}</p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <p className="label" style={{ marginBottom: 4 }}>Grade Level</p>
              <p>{competition.gradeLevel || '—'}</p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <p className="label" style={{ marginBottom: 4 }}>Organizer</p>
              <p>{competition.organizerName}</p>
            </div>
            <div>
              <p className="label" style={{ marginBottom: 4 }}>International</p>
              <p>{competition.isInternational ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>

        {/* Pricing & Quota */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 500 }}>Pricing & Quota</h2>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <p className="label" style={{ marginBottom: 4 }}>Registration Fee</p>
              <p style={{ fontSize: 20, fontWeight: 500 }}>{formatCurrency(competition.fee)}</p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <p className="label" style={{ marginBottom: 4 }}>Quota</p>
              <p>{competition.quota ? `${competition.quota} participants` : 'Unlimited'}</p>
            </div>
            <div>
              <p className="label" style={{ marginBottom: 4 }}>Total Registrations</p>
              <p style={{ fontSize: 20, fontWeight: 500 }}>{competition.registrationCount || 0}</p>
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
              <p className="label" style={{ marginBottom: 4 }}>Registration Open</p>
              <p>{fmtDate(competition.regOpenDate)}</p>
            </div>
            <div>
              <p className="label" style={{ marginBottom: 4 }}>Registration Close</p>
              <p>{fmtDate(competition.regCloseDate)}</p>
            </div>
            <div>
              <p className="label" style={{ marginBottom: 4 }}>Competition Date</p>
              <p>{fmtDate(competition.competitionDate)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {(competition.description || competition.detailedDescription) && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 500 }}>Description</h2>
          </div>
          <div style={{ padding: 24 }}>
            {competition.description && (
              <div style={{ marginBottom: 16 }}>
                <p className="label" style={{ marginBottom: 4 }}>Short Description</p>
                <p style={{ whiteSpace: 'pre-wrap' }}>{competition.description}</p>
              </div>
            )}
            {competition.detailedDescription && (
              <div>
                <p className="label" style={{ marginBottom: 4 }}>Detailed Description</p>
                <div style={{ whiteSpace: 'pre-wrap' }}>{competition.detailedDescription}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Required Documents */}
      {competition.requiredDocs && competition.requiredDocs.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 500 }}>Required Documents</h2>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {competition.requiredDocs.map((doc, idx) => (
                <span key={idx} className="badge badge-indigo">{doc}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Media Links */}
      {(competition.imageUrl || competition.posterUrl || competition.websiteUrl) && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 500 }}>Media & Links</h2>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {competition.imageUrl && (
                <a href={competition.imageUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>
                  🖼️ Thumbnail Image
                </a>
              )}
              {competition.posterUrl && (
                <a href={competition.posterUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>
                  📸 Poster
                </a>
              )}
              {competition.websiteUrl && (
                <a href={competition.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>
                  🔗 Official Website
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Participant Instructions */}
      {competition.participantInstructions && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 500 }}>Participant Instructions</h2>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{competition.participantInstructions}</div>
          </div>
        </div>
      )}
    </div>
  );
}