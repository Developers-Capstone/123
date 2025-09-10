// Admin Panel JavaScript for Tourist Safety System

let currentDocumentId = null;
let currentSOSId = null;

// API helper function for admin panel with session management
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(endpoint, config);
        const data = await response.json();
        
        // Handle authentication errors
        if (response.status === 401) {
            console.log('Admin session expired, redirecting to login');
            clearAdminSession();
            showAdminLogin();
            const error = new Error('Session expired. Please login again.');
            error.status = 401;
            throw error;
        }
        
        if (!response.ok) {
            const error = new Error(data.message || 'Request failed');
            error.status = response.status;
            error.response = data;
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('API call error:', error);
        if (error.response) {
            error.message = error.response.message || error.message;
        }
        throw error;
    }
}

// Session management functions
function clearAdminSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminLoginTime');
}

function isAdminAuthenticated() {
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin');
    
    if (!token || isAdmin !== 'true') {
        return false;
    }
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        // Check if token is expired or not admin type
        if (payload.exp < currentTime || payload.type !== 'admin') {
            clearAdminSession();
            return false;
        }
        
        return true;
    } catch (e) {
        console.error('Error validating token:', e);
        clearAdminSession();
        return false;
    }
}

function adminLogout() {
    clearAdminSession();
    showAlert('Logged out successfully', 'success');
    showAdminLogin();
}

// Alert function for admin panel
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        console.log(`Alert: ${message}`);
        return;
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <span>${message}</span>
        <button class="close-btn">&times;</button>
    `;
    
    // Add event listener for close button (CSP compliant)
    const closeBtn = alertDiv.querySelector('.close-btn');
    closeBtn.addEventListener('click', function() {
        this.parentElement.remove();
    });
    
    alertContainer.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

// Modal management functions
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

// Emergency modal close function - can be called from console
window.forceCloseModal = function() {
    const modal = document.getElementById('sosModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
        console.log('Modal force closed');
    }
};

// Auto-check authentication on page visibility change
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && window.location.pathname === '/admin') {
        if (!isAdminAuthenticated()) {
            showAlert('Session expired. Please login again.', 'warning');
            showAdminLogin();
        }
    }
});

// Periodic session validation (every 5 minutes)
setInterval(() => {
    if (window.location.pathname === '/admin' && !document.hidden) {
        if (!isAdminAuthenticated()) {
            showAlert('Session expired. Please login again.', 'warning');
            showAdminLogin();
        }
    }
}, 5 * 60 * 1000);

// Check admin authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname === '/admin') {
        initializeAdmin();
        
        // Add event listeners for admin buttons
        const adminLogoutBtn = document.getElementById('admin-logout-btn');
        if (adminLogoutBtn) adminLogoutBtn.addEventListener('click', adminLogout);
        
        // Tab navigation
        const tabBtns = document.querySelectorAll('.tab-btn[data-tab]');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const tab = this.getAttribute('data-tab');
                showTab(tab);
            });
        });
        
        // Modal close buttons
        const closeDocumentModal = document.getElementById('close-document-modal');
        if (closeDocumentModal) closeDocumentModal.addEventListener('click', () => closeModal('documentModal'));
        
        const closeSOSModal = document.getElementById('close-sos-modal');
        if (closeSOSModal) closeSOSModal.addEventListener('click', () => closeModal('sosModal'));
        
        // Document verification buttons
        const approveBtn = document.querySelector('[data-action="approved"]');
        if (approveBtn) approveBtn.addEventListener('click', () => verifyDocument('approved'));
        
        const rejectBtn = document.querySelector('[data-action="rejected"]');
        if (rejectBtn) rejectBtn.addEventListener('click', () => verifyDocument('rejected'));
        
        // SOS update button
        const updateSOSBtn = document.getElementById('update-sos-btn');
        if (updateSOSBtn) updateSOSBtn.addEventListener('click', updateSOSAlert);
        
        // Dynamic button handlers for table actions and modal close
        document.addEventListener('click', function(e) {
            console.log('Click detected:', e.target.id, e.target.className);
            
            // Handle modal close buttons
            if (e.target.id === 'close-sos-modal' || e.target.classList.contains('close-btn')) {
                console.log('Closing SOS modal');
                closeModal('sosModal');
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            if (e.target.id === 'close-document-modal') {
                console.log('Closing document modal');
                closeModal('documentModal');
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            // Handle modal background clicks
            if (e.target.classList.contains('modal')) {
                console.log('Closing modal via background click');
                closeModal(e.target.id);
                return;
            }
            
            const target = e.target.closest('[data-doc-id], [data-sos-id]');
            if (!target) return;
            
            const docId = target.getAttribute('data-doc-id');
            const sosId = target.getAttribute('data-sos-id');
            const action = target.getAttribute('data-action');
            
            if (docId && action === 'view') {
                viewDocument(docId);
            } else if (docId && action === 'verify') {
                openDocumentModal(docId);
            } else if (sosId && action === 'update') {
                openSOSModal(sosId);
            }
        });
    }
});

// Initialize admin panel with persistent session
function initializeAdmin() {
    // Use the centralized authentication check
    if (isAdminAuthenticated()) {
        // Valid admin session, show dashboard
        showAdminDashboard();
        
        // Display admin info
        const adminData = localStorage.getItem('admin');
        if (adminData) {
            try {
                const admin = JSON.parse(adminData);
                const adminDetails = document.getElementById('admin-details');
                if (adminDetails) {
                    adminDetails.innerHTML = `
                        <span><i class="fas fa-user-shield"></i> ${admin.username}</span>
                        <span class="admin-role">${admin.role || 'Administrator'}</span>
                    `;
                }
            } catch (e) {
                console.error('Error parsing admin data:', e);
            }
        }
        return;
    }
    
    // Not logged in or invalid session, show login form
    showAdminLogin();
}

function showAdminLogin() {
    const loginSection = document.getElementById('admin-login-section');
    const dashboardSection = document.getElementById('admin-dashboard');
    
    if (loginSection) {
        loginSection.classList.remove('hidden');
    }
    if (dashboardSection) {
        dashboardSection.classList.add('hidden');
    }
}

function showAdminDashboard() {
    const loginSection = document.getElementById('admin-login-section');
    const dashboardSection = document.getElementById('admin-dashboard');
    
    if (loginSection) {
        loginSection.classList.add('hidden');
    }
    if (dashboardSection) {
        dashboardSection.classList.remove('hidden');
    }
    
    // Load dashboard data with error handling
    loadDashboardStats().catch(err => console.error('Failed to load stats:', err));
    loadDocuments().catch(err => console.error('Failed to load documents:', err));
}

// Admin login
document.addEventListener('DOMContentLoaded', function() {
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', handleAdminLogin);
    }
});

async function handleAdminLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    if (!data.username || !data.password) {
        showAlert('Username and password are required', 'danger');
        return;
    }

    try {
        const response = await apiCall('/api/auth/admin/login', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (response.success) {
            // Store admin session data
            localStorage.setItem('token', response.token);
            localStorage.setItem('admin', JSON.stringify(response.admin));
            localStorage.setItem('isAdmin', 'true');
            
            // Store login timestamp for session tracking
            localStorage.setItem('adminLoginTime', Date.now().toString());
            
            showAlert('Admin login successful!', 'success');
            
            // Small delay to ensure DOM is ready before showing dashboard
            setTimeout(() => {
                showAdminDashboard();
                
                // Display admin info
                const adminDetails = document.getElementById('admin-details');
                if (adminDetails) {
                    adminDetails.innerHTML = `
                        <div style="font-size: 0.9rem; color: #666;">
                            Logged in as: <strong>${response.admin.username}</strong> (${response.admin.role || 'Administrator'})
                        </div>
                    `;
                }
            }, 500);
        }
    } catch (error) {
        showAlert(error.message || 'Admin login failed', 'danger');
    }
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await apiCall('/api/admin/dashboard/stats');
        if (response.success) {
            const stats = response.stats;
            const totalUsersEl = document.getElementById('total-users');
            if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers;
            const verifiedUsersEl = document.getElementById('verified-users');
            if (verifiedUsersEl) verifiedUsersEl.textContent = stats.verifiedUsers;
            
            const pendingDocsEl = document.getElementById('pending-documents');
            if (pendingDocsEl) pendingDocsEl.textContent = stats.pendingDocuments;
            
            const activeSOSEl = document.getElementById('active-sos');
            if (activeSOSEl) activeSOSEl.textContent = stats.activeSOS;
        }
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
    }
}

// Tab management
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Load data for the selected tab
    if (tabName === 'documents') {
        loadDocuments();
    } else if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'sos') {
        loadSOSAlerts();
    }
}

// Document management
async function loadDocuments() {
    try {
        const response = await apiCall('/api/admin/documents');
        if (response.success) {
            displayDocuments(response.documents);
        }
    } catch (error) {
        console.error('Failed to load documents:', error);
        showAlert('Failed to load documents', 'danger');
    }
}

function displayDocuments(documents) {
    const tbody = document.getElementById('documents-table-body');
    
    if (documents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No documents found</td></tr>';
        return;
    }

    tbody.innerHTML = documents.map(doc => `
        <tr>
            <td>
                <strong>${doc.userId.name}</strong><br>
                <small>${doc.userId.email}</small>
            </td>
            <td>${doc.documentType.replace('_', ' ').toUpperCase()}</td>
            <td>${doc.documentNumber}</td>
            <td>
                <span class="status-badge ${getStatusClass(doc.verificationStatus)}">
                    ${doc.verificationStatus.toUpperCase()}
                </span>
            </td>
            <td>${formatDate(doc.createdAt)}</td>
            <td>
                <button class="btn btn-sm btn-primary" data-doc-id="${doc._id}" data-action="view">
                    <i class="fas fa-eye"></i> View
                </button>
                ${doc.verificationStatus === 'pending' ? `
                    <button class="btn btn-sm btn-primary" data-doc-id="${doc._id}" data-action="verify">
                        <i class="fas fa-check"></i> Verify
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

function getStatusClass(status) {
    switch (status) {
        case 'approved': return 'status-verified';
        case 'rejected': return 'status-danger';
        default: return 'status-pending';
    }
}

async function viewDocument(documentId) {
    window.open(`/api/admin/documents/view/${documentId}`, '_blank');
}

async function openDocumentModal(documentId) {
    currentDocumentId = documentId;
    
    try {
        const response = await apiCall(`/api/admin/documents`);
        const document = response.documents.find(doc => doc._id === documentId);
        
        if (document) {
            document.getElementById('document-details').innerHTML = `
                <div class="mb-20">
                    <h5>Document Details</h5>
                    <p><strong>User:</strong> ${document.userId.name} (${document.userId.email})</p>
                    <p><strong>Type:</strong> ${document.documentType.replace('_', ' ').toUpperCase()}</p>
                    <p><strong>Number:</strong> ${document.documentNumber}</p>
                    <p><strong>Uploaded:</strong> ${formatDate(document.createdAt)}</p>
                </div>
                ${document.extractedText ? `
                    <div class="mb-20">
                        <h5>Document Text</h5>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; max-height: 200px; overflow-y: auto;">
                            ${document.extractedText}
                        </div>
                    </div>
                ` : ''}
            `;
            
            document.getElementById('document-image').src = `/api/admin/documents/view/${documentId}`;
            showModal('documentModal');
        }
    } catch (error) {
        showAlert('Failed to load document details', 'danger');
    }
}

function closeDocumentModal() {
    hideModal('documentModal');
    currentDocumentId = null;
}

async function verifyDocument(status) {
    if (!currentDocumentId) return;
    
    const notes = document.getElementById('admin-notes').value;
    
    try {
        const response = await apiCall(`/api/admin/documents/${currentDocumentId}/verify`, {
            method: 'POST',
            body: JSON.stringify({ status, notes })
        });

        if (response.success) {
            showAlert(`Document ${status} successfully!`, 'success');
            closeDocumentModal();
            loadDocuments();
            loadDashboardStats();
        }
    } catch (error) {
        showAlert(error.message || `Failed to ${status} document`, 'danger');
    }
}

// User management
async function loadUsers() {
    try {
        const response = await apiCall('/api/admin/users');
        if (response.success) {
            displayUsers(response.users);
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        showAlert('Failed to load users', 'danger');
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('users-table-body');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td><strong>${user.name}</strong></td>
            <td>${user.email}</td>
            <td>${user.phone}</td>
            <td>${user.userType.toUpperCase()}</td>
            <td>
                <span class="status-badge ${user.phoneVerified ? 'status-verified' : 'status-pending'}">
                    ${user.phoneVerified ? 'Yes' : 'No'}
                </span>
            </td>
            <td>
                <span class="status-badge ${user.documentVerified ? 'status-verified' : 'status-pending'}">
                    ${user.documentVerified ? 'Yes' : 'No'}
                </span>
            </td>
            <td>${formatDate(user.createdAt)}</td>
        </tr>
    `).join('');
}

// SOS Alert management
async function loadSOSAlerts() {
    try {
        const response = await apiCall('/api/admin/sos-alerts');
        if (response.success) {
            displaySOSAlerts(response.alerts);
        }
    } catch (error) {
        console.error('Failed to load SOS alerts:', error);
        showAlert('Failed to load SOS alerts', 'danger');
    }
}

function displaySOSAlerts(alerts) {
    const tbody = document.getElementById('sos-table-body');
    
    if (alerts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No SOS alerts found</td></tr>';
        return;
    }

    tbody.innerHTML = alerts.map(alert => `
        <tr>
            <td>
                <strong>${alert.userId.name}</strong><br>
                <small>${alert.userId.phone}</small>
            </td>
            <td>${alert.alertType.toUpperCase()}</td>
            <td>
                <a href="https://maps.google.com/maps?q=${alert.location.latitude},${alert.location.longitude}" target="_blank">
                    📍 View Location
                </a><br>
                <small>${alert.location.address || 'Address not available'}</small>
            </td>
            <td>
                <span class="status-badge ${getSOSStatusClass(alert.status)}">
                    ${alert.status.toUpperCase()}
                </span>
            </td>
            <td>${formatDate(alert.createdAt)}</td>
            <td>
                <button class="btn btn-sm btn-primary" data-sos-id="${alert._id}" data-action="update">
                    <i class="fas fa-edit"></i> Update
                </button>
            </td>
        </tr>
    `).join('');
}

function getSOSStatusClass(status) {
    switch (status) {
        case 'resolved': return 'status-verified';
        case 'false_alarm': return 'status-warning';
        default: return 'status-danger';
    }
}

async function openSOSModal(alertId) {
    currentSOSId = alertId;
    
    try {
        const response = await apiCall('/api/admin/sos-alerts');
        const alert = response.alerts.find(a => a._id === alertId);
        
        if (alert) {
            document.getElementById('sos-details').innerHTML = `
                <div class="mb-20">
                    <h5>SOS Alert Details</h5>
                    <p><strong>User:</strong> ${alert.userId.name} (${alert.userId.phone})</p>
                    <p><strong>Type:</strong> ${alert.alertType.toUpperCase()}</p>
                    <p><strong>Location:</strong> <a href="https://maps.google.com/maps?q=${alert.location.latitude},${alert.location.longitude}" target="_blank">View on Map</a></p>
                    <p><strong>Created:</strong> ${formatDate(alert.createdAt)}</p>
                    <p><strong>Contacts Notified:</strong> ${alert.contactsNotified.length}</p>
                    <p><strong>Police Notified:</strong> ${alert.policeNotified ? 'Yes' : 'No'}</p>
                </div>
            `;
            
            document.getElementById('sos-status').value = alert.status;
            document.getElementById('sos-notes').value = alert.notes || '';
            
            showModal('sosModal');
        }
    } catch (error) {
        showAlert('Failed to load SOS alert details', 'danger');
    }
}

function closeSOSModal() {
    hideModal('sosModal');
    currentSOSId = null;
}

async function updateSOSAlert() {
    if (!currentSOSId) return;
    
    const status = document.getElementById('sos-status').value;
    const notes = document.getElementById('sos-notes').value;
    
    try {
        const response = await apiCall(`/api/admin/sos-alerts/${currentSOSId}/update`, {
            method: 'POST',
            body: JSON.stringify({ status, notes })
        });

        if (response.success) {
            showAlert('SOS alert updated successfully!', 'success');
            closeSOSModal();
            loadSOSAlerts();
            loadDashboardStats();
        }
    } catch (error) {
        showAlert(error.message || 'Failed to update SOS alert', 'danger');
    }
}

// Filter functions
function filterDocuments() {
    const status = document.getElementById('document-status-filter').value;
    loadDocuments(); // In a real app, you'd pass the filter parameter
}

function filterUsers() {
    const userType = document.getElementById('user-type-filter').value;
    const verified = document.getElementById('user-verified-filter').value;
    loadUsers(); // In a real app, you'd pass the filter parameters
}

function filterSOSAlerts() {
    const status = document.getElementById('sos-status-filter').value;
    loadSOSAlerts(); // In a real app, you'd pass the filter parameter
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname === '/admin') {
        initializeAdmin();
    }
});

// Add CSS for status badges
const adminStyles = `
.status-danger {
    background: #f8d7da;
    color: #721c24;
}

.status-warning {
    background: #fff3cd;
    color: #856404;
}
`;

const adminStyleSheet = document.createElement('style');
adminStyleSheet.textContent = adminStyles;
document.head.appendChild(adminStyleSheet);
