async function triggerSync() {
  try {
    console.log('Triggering sync...');
    const response = await fetch('http://localhost:3000/api/admin/sync', {
      method: 'POST'
    });
    const data = await response.json();
    console.log('Sync response:', data);
  } catch (error) {
    console.error('Sync trigger failed:', error.message);
  }
}

triggerSync();
