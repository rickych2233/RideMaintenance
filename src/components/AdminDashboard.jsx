import React, { useState, useEffect } from 'react';

export default function AdminDashboard({ API_URL, token }) {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [usersRes, vehiclesRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/admin/vehicles`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (vehiclesRes.ok) setVehicles(await vehiclesRes.json());
    } catch (err) {
      console.error('Error fetching admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const handleDeleteUser = async (id) => {
    if (!window.confirm('WARNING: This will delete the user and all their vehicles, logs, and data. Proceed?')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete user.');
    }
  };

  const handleChangeRole = async (id, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) return;
    
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}/role`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (res.ok) {
        setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update role.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update role.');
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm('Delete this vehicle?')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/vehicles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setVehicles(vehicles.filter(v => v.id !== id));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete vehicle.');
    }
  };

  const handleTestCron = async () => {
    try {
      const res = await fetch(`${API_URL}/api/test-cron`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      alert(data.message || data.error);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading Admin Panel...</div>;

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: 'var(--cyan)' }}>🛡️ Admin Panel</h2>
        <button onClick={handleTestCron} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px' }}>
          ⏱️ Test Background Cron
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button 
          onClick={() => setActiveTab('users')} 
          className={activeTab === 'users' ? 'btn btn-primary' : 'btn btn-secondary'}
        >
          Manage Users ({users.length})
        </button>
        <button 
          onClick={() => setActiveTab('vehicles')} 
          className={activeTab === 'vehicles' ? 'btn btn-primary' : 'btn btn-secondary'}
        >
          Manage Vehicles ({vehicles.length})
        </button>
      </div>

      {activeTab === 'users' && (
        <div>
          <h3>All Users</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)', textAlign: 'left' }}>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>ID</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>Name</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>Email</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>Role</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>Joined</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>{u.id}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>{u.name}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>{u.email}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ 
                        background: u.role === 'admin' ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.1)', 
                        color: u.role === 'admin' ? 'var(--cyan)' : 'var(--text-color)', 
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        fontSize: '11px' 
                      }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={() => handleChangeRole(u.id, u.role)} 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 8px', fontSize: '11px', color: u.role === 'admin' ? 'var(--amber)' : 'var(--cyan)' }}
                        disabled={u.email === 'rickychristian2309@gmail.com'}
                      >
                        Make {u.role === 'admin' ? 'User' : 'Admin'}
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(u.id)} 
                        className="btn btn-danger" 
                        style={{ padding: '4px 8px', fontSize: '11px' }} 
                        disabled={u.email === 'rickychristian2309@gmail.com'}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'vehicles' && (
        <div>
          <h3>All Vehicles</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)', textAlign: 'left' }}>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>ID</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>Owner</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>Vehicle Name</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>Plate</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>Odo</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id}>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>{v.id}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>
                      {v.ownerName} <br/><span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{v.ownerEmail}</span>
                    </td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>{v.name} ({v.brand} {v.model})</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>{v.licensePlate || '-'}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>{v.currentOdometer}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>
                      <button onClick={() => handleDeleteVehicle(v.id)} className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '11px' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
