import React, { useState, useEffect, useRef } from 'react';
import Tesseract from 'tesseract.js';

export default function OdometerUpdateModal({
  vehicle,
  onClose,
  onUpdateOdometer,
  onLogOilChange
}) {
  const [activeTab, setActiveTab] = useState('photo'); // 'photo' or 'manual'
  const [odometerValue, setOdometerValue] = useState(vehicle ? vehicle.currentOdometer : 0);
  const [logAsOilChange, setLogAsOilChange] = useState(true);
  const [oilCost, setOilCost] = useState('');
  const [oilNotes, setOilNotes] = useState('Ganti oli mesin (OCR/Manual input update)');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResultReady, setScanResultReady] = useState(false);
  
  const fileInputRef = useRef(null);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!vehicle) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setScanResultReady(false);
    startScanning(selectedFile);
  };

  const startScanning = (selectedFile) => {
    setScanning(true);
    setScanProgress(0);
    setScanStep('Menyiapkan OCR engine...');
    
    Tesseract.recognize(
      selectedFile,
      'eng',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            setScanProgress(Math.floor(m.progress * 100));
            setScanStep('Mengekstrak teks dengan OCR...');
          } else if (m.status === 'loading tesseract core') {
            setScanStep('Memuat engine OCR...');
          } else if (m.status === 'initializing tesseract') {
            setScanStep('Inisialisasi OCR...');
          }
        }
      }
    ).then(({ data: { text } }) => {
      setScanning(false);
      setScanResultReady(true);
      
      console.log('OCR Result text:', text);

      // Parse odometer from recognized text
      const numMatch = text.match(/\d+/g);
      let detectedOdo = 0;
      if (numMatch && numMatch.length > 0) {
        // Sort by length to find the most probable odometer reading (longest string of digits)
        const parsed = parseInt(numMatch.sort((a,b) => b.length - a.length)[0]);
        if (parsed > vehicle.currentOdometer) {
          detectedOdo = parsed;
        }
      }
      
      if (detectedOdo <= vehicle.currentOdometer) {
        // Fallback to current odometer if nothing valid was found
        detectedOdo = vehicle.currentOdometer;
        alert('OCR tidak dapat menemukan angka kilometer yang valid atau angka lebih kecil dari odometer saat ini. Silakan cek foto atau input manual.');
      }
      
      setOdometerValue(detectedOdo);
    }).catch(err => {
      console.error('OCR Error:', err);
      setScanning(false);
      alert('Terjadi kesalahan saat memproses gambar dengan OCR.');
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextOdo = parseInt(odometerValue);
    
    if (isNaN(nextOdo) || nextOdo < vehicle.currentOdometer) {
      alert(`Nilai odometer harus lebih besar atau sama dengan odometer saat ini (${vehicle.currentOdometer} km).`);
      return;
    }

    // Call parent to update the odometer
    onUpdateOdometer(vehicle.id, nextOdo);

    // Optionally log as oil change
    if (logAsOilChange) {
      onLogOilChange({
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        serviceType: 'Oil Change',
        date: new Date().toISOString().split('T')[0],
        odometer: nextOdo,
        cost: parseFloat(oilCost || 0),
        notes: oilNotes
      }, nextOdo); // Pass odo to reset lastServiceOdometer as well
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', margin: 0 }}>Pembaruan Odometer & Oli</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {vehicle.name} ({vehicle.brand} {vehicle.model})
            </span>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}
          >
            &times;
          </button>
        </div>

        {/* Info panel */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          marginBottom: '16px',
          fontSize: '13px',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <div>Odometer Sekarang: <strong>{vehicle.currentOdometer} km</strong></div>
          <div>Batas Interval Oli: <strong>{vehicle.oilInterval || 2000} km</strong></div>
        </div>

        {/* Tabs selector */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '16px'
        }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '10px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'photo' ? '2px solid var(--cyan)' : '2px solid transparent',
              color: activeTab === 'photo' ? 'var(--cyan)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: activeTab === 'photo' ? '600' : 'normal',
              fontSize: '13px'
            }}
            onClick={() => setActiveTab('photo')}
          >
            📸 Foto Odometer (OCR)
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '10px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'manual' ? '2px solid var(--cyan)' : '2px solid transparent',
              color: activeTab === 'manual' ? 'var(--cyan)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: activeTab === 'manual' ? '600' : 'normal',
              fontSize: '13px'
            }}
            onClick={() => setActiveTab('manual')}
          >
            ✏️ Input Manual
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* Tab 1: Upload Odometer Photo (Simulated OCR) */}
          {activeTab === 'photo' && (
            <div style={{ marginBottom: '16px' }}>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
              />
              
              {!previewUrl ? (
                <div 
                  onClick={() => fileInputRef.current.click()}
                  style={{
                    border: '2px dashed rgba(255, 255, 255, 0.15)',
                    borderRadius: 'var(--radius-md)',
                    padding: '36px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.01)',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--cyan)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                >
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>📷</div>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>Ambil / Upload Foto Kilometer</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mendukung format JPG, PNG, atau jepret langsung dari kamera HP</div>
                </div>
              ) : (
                <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#000' }}>
                  <img 
                    src={previewUrl} 
                    alt="Odometer Preview" 
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', display: 'block', opacity: scanning ? 0.6 : 1 }} 
                  />
                  
                  {/* Scanner overlay effect */}
                  {scanning && (
                    <>
                      <div className="scan-line" style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '3px',
                        background: 'linear-gradient(to right, transparent, var(--cyan), transparent)',
                        boxShadow: '0 0 10px var(--cyan)',
                        animation: 'scanEffect 1.5s ease-in-out infinite'
                      }} />
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'rgba(0,0,0,0.8)',
                        padding: '12px',
                        fontSize: '12px',
                        textAlign: 'center'
                      }}>
                        <div style={{ marginBottom: '6px', fontWeight: 'bold', color: 'var(--cyan)' }}>{scanStep}</div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${scanProgress}%`, height: '100%', background: 'var(--cyan)', transition: 'width 0.15s ease' }} />
                        </div>
                      </div>
                    </>
                  )}

                  {!scanning && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current.click()}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(0,0,0,0.6)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '4px',
                        color: '#fff',
                        padding: '4px 8px',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      Ganti Foto
                    </button>
                  )}
                </div>
              )}

              {scanResultReady && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--emerald)', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                    ✓ Hasil Deteksi OCR Sukses
                  </span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nilai Kilometer:</span>
                    <input 
                      type="number"
                      className="form-control"
                      style={{ width: '120px', padding: '6px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', color: 'var(--cyan)' }}
                      value={odometerValue}
                      onChange={(e) => setOdometerValue(e.target.value)}
                    />
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>km</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                    *Anda dapat menyesuaikan angka di atas jika pembacaan OCR kurang presisi.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Manual Input */}
          {activeTab === 'manual' && (
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Masukkan Kilometer Saat Ini (Odometer)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="number" 
                  className="form-control"
                  style={{ fontSize: '18px', fontWeight: 'bold' }}
                  placeholder="Contoh: 14250"
                  value={odometerValue}
                  onChange={(e) => setOdometerValue(e.target.value)}
                  required
                />
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>km</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Harus lebih besar dari {vehicle.currentOdometer} km.
              </span>
            </div>
          )}

          {/* Common Option: Log as Oil Change */}
          <div style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }} onClick={() => setLogAsOilChange(!logAsOilChange)}>
              <input 
                type="checkbox" 
                checked={logAsOilChange} 
                onChange={() => {}} // Controlled by parent div click
                style={{ width: '18px', height: '18px', accentColor: 'var(--cyan)', marginTop: '2px' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>Catat sebagai penggantian oli baru</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Jika dicentang, maka akan diingat sebagai oli baru</span>
              </div>
            </div>

            {logAsOilChange && (
              <div style={{ marginTop: '12px', paddingLeft: '26px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Biaya Ganti Oli (IDR) - Opsional</label>
                  <input 
                    type="number" 
                    className="form-control"
                    style={{ padding: '8px' }}
                    placeholder="Contoh: 65000"
                    value={oilCost}
                    onChange={(e) => setOilCost(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Catatan / Brand Oli</label>
                  <input 
                    type="text" 
                    className="form-control"
                    style={{ padding: '8px' }}
                    value={oilNotes}
                    onChange={(e) => setOilNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={activeTab === 'photo' && !scanResultReady && !scanning}
              style={{ opacity: (activeTab === 'photo' && !scanResultReady && !scanning) ? 0.6 : 1 }}
            >
              Simpan Data
            </button>
          </div>

        </form>
      </div>
      
      {/* Styles for simulated scan line animation */}
      <style>{`
        @keyframes scanEffect {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  );
}
