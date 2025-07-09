import React, { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';

type Domain = {
  domain: string;
  issuer?: string;
  validTo?: string;
  daysRemaining?: number;
  status?: string;
  lastChecked?: string;
  error?: string;
  notes?: string;
};

export default function Home() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDomains = async () => {
    try {
      const res = await fetch('/api/domains');
      const data = await res.json();
      setDomains(data);
    } catch (error) {
      console.error('Error fetching domains:', error);
    }
  };

  const refreshSSL = async () => {
    setLoading(true);
    try {
      await fetch('/api/check-ssl');
      await fetchDomains();
    } catch (error) {
      console.error('Error refreshing SSL:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;
    
    try {
      await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain, notes: newNotes }),
      });
      setNewDomain('');
      setNewNotes('');
      await refreshSSL();
    } catch (error) {
      console.error('Error adding domain:', error);
    }
  };

  const handleRemove = async (domain: string) => {
    try {
      await fetch('/api/domains', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      await fetchDomains();
    } catch (error) {
      console.error('Error removing domain:', error);
    }
  };

  const handleClearAll = async () => {
    if (confirm(`Are you sure you want to remove all ${domains.length} domains? This action cannot be undone.`)) {
      try {
        await fetch('/api/domains', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clearAll: true }),
        });
        await fetchDomains();
      } catch (error) {
        console.error('Error clearing all domains:', error);
      }
    }
  };

  const handleExcelImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let importedCount = 0;
      for (const row of jsonData as any[]) {
        const domain = row.domain || row.Domain || row.DOMAIN;
        const notes = row.notes || row.Notes || row.NOTES || '';
        
        if (domain) {
          try {
            await fetch('/api/domains', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ domain, notes }),
            });
            importedCount++;
          } catch (error) {
            console.error('Error adding domain:', domain, error);
          }
        }
      }
      
      alert(`Successfully imported ${importedCount} domains!`);
      await refreshSSL();
    } catch (error) {
      console.error('Error importing Excel file:', error);
      alert('Error importing Excel file. Please check the format.');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const exportToExcel = () => {
    try {
      const exportData = domains.map((domain, index) => ({
        '#': index + 1,
        'Domain': domain.domain,
        'Expiry Date': domain.validTo ? new Date(domain.validTo).toLocaleDateString() : '-',
        'Days Left': domain.daysRemaining !== undefined ? `${domain.daysRemaining} days` : '-',
        'Status': domain.status || '-',
        'Issuer': domain.issuer || '-',
        'Notes': domain.notes || '-',
        'Last Checked': domain.lastChecked ? new Date(domain.lastChecked).toLocaleString() : '-'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'SSL Domains');
      
      const fileName = `ssl-domains-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      alert(`Exported ${domains.length} domains to ${fileName}`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel file.');
    }
  };

  const getDaysLeftStyle = (days: number | undefined) => {
    if (!days) return {};
    if (days <= 7) return { backgroundColor: '#ef4444', color: 'white' };
    if (days <= 30) return { backgroundColor: '#f59e0b', color: 'white' };
    return { backgroundColor: '#10b981', color: 'white' };
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1f2937' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#374151', borderBottom: '1px solid #4b5563' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                backgroundColor: '#2563eb', 
                borderRadius: '8px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                
              </div>
              <div>
                <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                  SSL Info Dashboard
                </h1>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#60a5fa', 
                  margin: 0,
                  fontWeight: '600',
                  textShadow: '0 0 10px rgba(96, 165, 250, 0.3)'
                }}>
                  💻 Developed by <span style={{ 
                    fontWeight: '700',
                    color: '#ffffff',
                    background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>KANISHK MANCHANDA</span>
                </p>
              </div>
            </div>
            <button
              onClick={refreshSSL}
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: loading ? '#6b7280' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span></span>
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '32px' }}>
          {/* Left Panel - Add Domain */}
          <div>
            <div style={{ 
              backgroundColor: '#374151', 
              borderRadius: '12px', 
              padding: '24px',
              border: '1px solid #4b5563'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'white', marginBottom: '24px' }}>
                Add New Domain
              </h2>
              
              <form onSubmit={handleAdd} style={{ marginBottom: '24px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#d1d5db', 
                    marginBottom: '8px' 
                  }}>
                    Domain Name
                  </label>
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="example.com"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#4b5563',
                      border: '1px solid #6b7280',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#d1d5db', 
                    marginBottom: '8px' 
                  }}>
                    Notes
                  </label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Notes"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#4b5563',
                      border: '1px solid #6b7280',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>
                
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Add Domain
                </button>
              </form>

              {/* Excel Operations */}
              <div style={{ paddingTop: '24px', borderTop: '1px solid #4b5563' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '500', color: 'white', marginBottom: '16px' }}>
                  Excel Operations
                </h3>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={handleExcelImport}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                     Import from Excel
                  </button>
                  
                  <button
                    onClick={exportToExcel}
                    disabled={domains.length === 0}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: domains.length === 0 ? '#6b7280' : '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: domains.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                     Export to Excel
                  </button>
                  
                  <button
                    onClick={handleClearAll}
                    disabled={domains.length === 0}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: domains.length === 0 ? '#6b7280' : '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: domains.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                     Clear All Domains
                  </button>
                </div>
                
                <div style={{ marginTop: '16px', fontSize: '12px', color: '#9ca3af' }}>
                  <p style={{ margin: '4px 0' }}>Excel format: Column "domain" required</p>
                  <p style={{ margin: '4px 0' }}>Optional: Column "notes" for descriptions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Domain List */}
          <div>
            <div style={{ 
              backgroundColor: '#374151', 
              borderRadius: '12px', 
              border: '1px solid #4b5563',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '24px 24px 16px 24px', borderBottom: '1px solid #4b5563' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'white', margin: 0 }}>
                  Domain Expiry Information
                </h2>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#4b5563' }}>
                    <tr>
                      <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#d1d5db', textTransform: 'uppercase' }}>#</th>
                      <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#d1d5db', textTransform: 'uppercase' }}>Domain</th>
                      <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#d1d5db', textTransform: 'uppercase' }}>Expiry Date</th>
                      <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#d1d5db', textTransform: 'uppercase' }}>Days Left</th>
                      <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#d1d5db', textTransform: 'uppercase' }}>Notes</th>
                      <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#d1d5db', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domains.map((domain, index) => (
                      <tr key={domain.domain} style={{ borderBottom: '1px solid #4b5563' }}>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#d1d5db' }}>
                          {index + 1}
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500', color: 'white' }}>
                          {domain.domain}
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#d1d5db' }}>
                          {domain.validTo ? new Date(domain.validTo).toLocaleDateString() : '-'}
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          {domain.daysRemaining !== undefined ? (
                            <span style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              fontWeight: '500',
                              borderRadius: '16px',
                              ...getDaysLeftStyle(domain.daysRemaining)
                            }}>
                              {domain.daysRemaining} day(s)
                            </span>
                          ) : (
                            <span style={{ color: '#6b7280' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#d1d5db', maxWidth: '200px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {domain.notes || '-'}
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => setEditingId(domain.domain)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                               Edit
                            </button>
                            <button
                              onClick={() => handleRemove(domain.domain)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                               Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {domains.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ color: '#9ca3af', fontSize: '18px', marginBottom: '8px' }}>
                      No domains added yet
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '14px' }}>
                      Add a domain or import from Excel to start monitoring
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        backgroundColor: '#1f2937', 
        borderTop: '2px solid #3b82f6',
        padding: '24px 0',
        marginTop: '32px'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              marginBottom: '16px',
              padding: '16px',
              backgroundColor: '#374151',
              borderRadius: '12px',
              border: '1px solid #4b5563',
              display: 'inline-block'
            }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                🚀 Developed by
              </div>
                             <div style={{ 
                 fontSize: '24px', 
                 fontWeight: '900',
                 background: 'linear-gradient(45deg, #3b82f6, #8b5cf6, #06b6d4)',
                 WebkitBackgroundClip: 'text',
                 WebkitTextFillColor: 'transparent',
                 backgroundClip: 'text',
                 textShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
                 marginBottom: '4px',
                 letterSpacing: '2px'
               }}>
                 KANISHK MANCHANDA
               </div>
            </div>
            
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>
              <p style={{ margin: '8px 0 4px 0', fontWeight: '600' }}>
                🔒 SSL Certificate Monitor v1.0
              </p>
              <p style={{ margin: '0', fontSize: '12px', fontWeight: '400' }}>
                © 2025 - Professional SSL Monitoring Solution
              </p>
              <div style={{ 
                marginTop: '12px',
                padding: '8px 16px',
                backgroundColor: '#374151',
                borderRadius: '20px',
                display: 'inline-block',
                fontSize: '11px',
                color: '#60a5fa',
                fontWeight: '600'
              }}>
                ⚡ Built with Next.js • React • TypeScript • TailwindCSS
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}