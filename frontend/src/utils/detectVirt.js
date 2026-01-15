export function detectVirtualCamera(label) {
  if (!label) return false;
  const blacklist = ["obs", "virtual", "manycam", "snap"];
  return blacklist.some(k => label.toLowerCase().includes(k));
}
