export const init = () => {
  const host = "jaeyong.me";
  if (host == window.location.host && window.location.protocol != "https:") {
    window.location.protocol = "https";
  }
}