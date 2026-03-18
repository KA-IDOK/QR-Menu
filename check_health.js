async function checkHealth() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    const data = await response.json();
    console.log('Health check response:', data);
  } catch (error) {
    console.error('Health check failed:', error.message);
  }
}

checkHealth();
