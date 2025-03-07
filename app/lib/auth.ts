export function logout() {
  localStorage.removeItem('authToken');
  window.location.href = '/login'; // Redirect to login page
} 