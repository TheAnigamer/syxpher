(() => {
  const clock = document.getElementById('utc-clock');
  if (!clock) return;

  const updateClock = () => {
    const now = new Date();
    const time = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);

    clock.textContent = `${time} · UTC`;
  };

  updateClock();
  window.setInterval(updateClock, 1000);
})();

document.addEventListener('DOMContentLoaded', () => {
  const lock = document.getElementById('admin-lock');

  if (!lock) return;

  lock.addEventListener('click', async () => {
    const code = prompt('Enter your 6-digit Google Authenticator code:');

    if (!code) return;

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      });

      const result = await response.json();

      if (result.ok) {
        sessionStorage.setItem('adminAuthenticated', 'true');
        lock.textContent = '🔓';
        lock.title = 'Admin Mode Enabled';
        alert('Admin mode enabled.');
      } else {
        alert('Invalid Authenticator code.');
      }
    } catch (error) {
      console.error(error);
      alert('Could not connect to the authentication server.');
    }
  });
});
