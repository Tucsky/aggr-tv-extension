chrome.runtime.sendMessage({}, function (response) {
  const scriptElement = document.createElement('script');
  scriptElement.src = chrome.runtime.getURL('aggr.js');
  document.head.appendChild(scriptElement);
});