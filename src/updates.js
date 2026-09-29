// Re-read the registration: another open tab may already have activated its worker.
export async function requestUpdate(container, { reload, changed, timeout = 20000 }) {
  const registration = await container?.getRegistration();
  if (!registration) throw new Error('unavailable');
  if (registration.waiting?.state === 'installed') {
    registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
    return 'activating';
  }
  if (changed()) { reload(); return 'reloading'; }
  await registration.update();
  const worker = registration.installing;
  if (worker && !['installed', 'redundant', 'activated'].includes(worker.state)) {
    await new Promise((resolve, reject) => {
      const finish = () => {
        if (!['installed', 'redundant', 'activated'].includes(worker.state)) return;
        clearTimeout(timer); worker.removeEventListener('statechange', finish); resolve();
      };
      const timer = setTimeout(() => { worker.removeEventListener('statechange', finish); reject(new Error('timeout')); }, timeout);
      worker.addEventListener('statechange', finish); finish();
    });
  }
  if (registration.waiting?.state === 'installed') {
    registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
    return 'activating';
  }
  if (worker?.state === 'redundant') throw new Error('install-failed');
  if (changed()) { reload(); return 'reloading'; }
  return 'current';
}
