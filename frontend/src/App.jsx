import { useEffect, useState } from 'react';

export default function App() {
  const [message, setMessage] = useState('Connecting to Django…');

  useEffect(() => {
    const controller = new AbortController();

    async function loadMessage() {
      try {
        const response = await fetch('/api/hello/', { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setMessage(data.message);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setMessage('Could not reach Django. Start the backend and refresh this page.');
        }
      }
    }

    loadMessage();
    return () => controller.abort();
  }, []);

  return (
    <main>
      <h1>React + Django</h1>
      <p>React is running. Backend response:</p>
      <p role="status">{message}</p>
    </main>
  );
}
