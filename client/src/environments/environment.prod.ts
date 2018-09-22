export const environment = {
  production: true,
  apiUrl: '',
  wsUrl: `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}`,
};
