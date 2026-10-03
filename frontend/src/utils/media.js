export const requestCallMedia = (mediaDevices, constraints, timeoutMs = 20000) => new Promise((resolve, reject) => {
  if (!mediaDevices?.getUserMedia) { reject(new Error('Camera/microphone require a supported browser on HTTPS.')); return; }
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    const error = new Error('Camera/microphone request timed out. Allow access in your browser and retry.');
    error.name = 'TimeoutError'; reject(error);
  }, timeoutMs);
  mediaDevices.getUserMedia(constraints).then((stream) => {
    clearTimeout(timer);
    if (expired) stream.getTracks().forEach((track) => track.stop());
    else resolve(stream);
  }, (error) => { clearTimeout(timer); reject(error); });
});
