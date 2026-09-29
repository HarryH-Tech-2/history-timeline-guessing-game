// Reads the code from /c/ABC234 or /g/ABC234 and fills the page. No network:
// web visitors aren't signed in, and the rules only allow signed-in reads.
(function () {
  var parts = location.pathname.split('/').filter(Boolean);
  var code = (parts[1] || '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
  document.getElementById('code').textContent = code || '——————';
  var store = document.getElementById('play');
  store.href = 'https://play.google.com/store/apps/details?id=com.harryhh.historydateguesser';
})();
